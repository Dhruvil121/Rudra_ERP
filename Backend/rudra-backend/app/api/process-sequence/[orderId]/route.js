import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import ProcessSequence from "../../../models/ProcessSequence";
import Order from "../../../models/Order";
import InventoryGroup from "../../../models/Inventory";
import { checkPermission, ACTIONS } from "../../../../lib/auth";

const MODULE_LEVEL_ACTIONS = [
    "view",
    "add",
    "edit",
    "delete",
    "print",
    "export",
    "approve"
];

// Safely extract process permissions whether Mongoose returns a Map or a Plain Object
function getUserProcessPermissions(user) {
    if (!user || !user.permissions) return [];
    let rawPerms = [];

    if (user.permissions instanceof Map || typeof user.permissions.get === "function") {
        rawPerms = user.permissions.get("process") || [];
    } else {
        rawPerms = user.permissions.process || [];
    }

    return Array.isArray(rawPerms)
        ? rawPerms.map((p) => String(p).trim().toLowerCase())
        : [];
}

// GET: Fetch process sequence(s) for a specific order
// Supports ?itemId=xxx for fetching a specific size variant's sequence
export async function GET(req, { params }) {
    try {
        let auth = await checkPermission("process", ACTIONS.VIEW);
        if (!auth.authorized) auth = await checkPermission("order", ACTIONS.VIEW);
        if (!auth.authorized) auth = await checkPermission("reports", ACTIONS.VIEW);

        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const { orderId } = await params;

        const url = new URL(req.url);
        const itemId = url.searchParams.get("itemId");
        const mode = url.searchParams.get("mode"); // 'all' to get all sequences for the order

        // If mode=all, return all sequences for this order (multi-size support)
        if (mode === "all") {
            const sequences = await ProcessSequence.find({ orderId }).sort({ priority: -1, createdAt: 1 });
            return NextResponse.json({ orderId, sequences }, { status: 200 });
        }

        // If itemId is specified, fetch sequence for that specific order item (size variant)
        if (itemId) {
            const sequence = await ProcessSequence.findOne({ orderId, orderItemId: itemId });
            if (!sequence) {
                return NextResponse.json(
                    { orderId, orderItemId: itemId, steps: [], status: "New", rejectedUsage: [] },
                    { status: 200 }
                );
            }
            return NextResponse.json(sequence, { status: 200 });
        }

        // Default: backward-compatible — fetch the first/only sequence for this order
        const sequence = await ProcessSequence.findOne({ orderId });

        if (!sequence) {
            // Return empty steps array if no sequence created yet — not a 404 error
            return NextResponse.json(
                { orderId, steps: [], status: "New", rejectedUsage: [] },
                { status: 200 }
            );
        }

        return NextResponse.json(sequence, { status: 200 });
    } catch (error) {
        console.error("Fetch process sequence error:", error);
        return NextResponse.json(
            { error: "Failed to fetch process sequence" },
            { status: 500 }
        );
    }
}

// POST: Create or update the process sequence for an order (with per-step RBAC)
// Supports multi-size: if body includes orderItemId, upserts that specific variant's sequence
export async function POST(req, { params }) {
    try {
        let auth = await checkPermission("process", ACTIONS.VIEW);
        if (!auth.authorized) auth = await checkPermission("process", ACTIONS.ADD);
        if (!auth.authorized) auth = await checkPermission("process", ACTIONS.EDIT);

        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { orderId } = await params;
        const body = await req.json();

        // Support { steps: [...] }, { sequence: [...] }, or raw array [...]
        const incomingSteps = body.steps || body.sequence || (Array.isArray(body) ? body : null);
        const orderItemId = body.orderItemId || null;
        const sizeVariant = body.sizeVariant || null;
        const priority = body.priority || 'normal';
        const rejectedUsage = body.rejectedUsage || undefined; // Only update if explicitly provided

        // Handle dispatch action
        if (body.action === 'dispatch') {
            return await handleDispatch(orderId, orderItemId, body);
        }

        if (!incomingSteps || !Array.isArray(incomingSteps)) {
            return NextResponse.json(
                { error: "Invalid request body: 'steps' must be an array" },
                { status: 400 }
            );
        }

        await dbConnect();

        const userRole = auth.user?.role;
        const isSuperAdmin = userRole === "super_admin";
        const userPermissions = getUserProcessPermissions(auth.user);

        // Separate module-level actions ('view', 'add', 'edit') from specific step names ('turning', 'round dabi - turning')
        const assignedStepNames = userPermissions.filter(
            (p) => !MODULE_LEVEL_ACTIONS.includes(p)
        );
        const hasModuleAddOrEdit =
            userPermissions.includes("add") || userPermissions.includes("edit");

        // Can the user add, remove, rename, or reorder steps?
        const canConfigureSequence = isSuperAdmin || hasModuleAddOrEdit;

        // Helper to check if the user is allowed to edit a specific step's fields
        const canEditStepFields = (stepName) => {
            if (isSuperAdmin) return true;
            const stepLower = String(stepName || "").trim().toLowerCase();
            const stepParts = stepLower.split(" - ").map((s) => s.trim());

            // 1. If specific steps are assigned in Settings -> Process Access, check against them
            if (assignedStepNames.length > 0) {
                return assignedStepNames.some(
                    (perm) => stepLower === perm || stepParts.includes(perm)
                );
            }

            // 2. If no specific step restrictions were set, allow if user has 'add' or 'edit' on Process module
            return hasModuleAddOrEdit;
        };

        // Build the query filter — supports multi-size via orderItemId
        const queryFilter = orderItemId
            ? { orderId, orderItemId }
            : { orderId, orderItemId: { $in: [null, undefined, ''] } };

        // 1. Fetch the EXISTING sequence to compare against
        const existingSequence = await ProcessSequence.findOne(queryFilter);

        if (!isSuperAdmin) {
            if (existingSequence && existingSequence.steps?.length > 0) {
                const existingStepIds = existingSequence.steps.map((s) => s.stepId);
                const incomingStepIds = incomingSteps.map((s) => s.stepId);

                const addedSteps = incomingStepIds.filter(
                    (id) => !existingStepIds.includes(id)
                );
                const removedSteps = existingStepIds.filter(
                    (id) => !incomingStepIds.includes(id)
                );
                const existingOrder = existingStepIds.join(",");
                const incomingOrder = incomingStepIds.join(",");

                // Structural changes (add, remove, reorder) require super_admin or process 'add'/'edit'
                if (
                    (addedSteps.length > 0 ||
                        removedSteps.length > 0 ||
                        existingOrder !== incomingOrder) &&
                    !canConfigureSequence
                ) {
                    return NextResponse.json(
                        {
                            error: "Forbidden: You need Process 'Add' permission to add, remove, or reorder process steps"
                        },
                        { status: 403 }
                    );
                }

                // Check field value edits on existing steps
                for (const newStep of incomingSteps) {
                    const oldStep = existingSequence.steps.find(
                        (s) => s.stepId === newStep.stepId
                    );

                    if (
                        oldStep &&
                        JSON.stringify(oldStep.fields || {}) !==
                        JSON.stringify(newStep.fields || {})
                    ) {
                        if (!canEditStepFields(newStep.processName)) {
                            return NextResponse.json(
                                {
                                    error: `Forbidden: You do not have permission to modify "${newStep.processName}"`
                                },
                                { status: 403 }
                            );
                        }
                    }
                }
            } else if (!canConfigureSequence && assignedStepNames.length === 0) {
                return NextResponse.json(
                    {
                        error: "Forbidden: You do not have permission to create process sequences"
                    },
                    { status: 403 }
                );
            }
        }

        // Sanitize steps before saving
        const sanitizedSteps = incomingSteps.map((step) => ({
            stepId: step.stepId || Math.random().toString(36).substring(2, 10),
            processName: String(step.processName || "Process Step").trim(),
            processType: step.processType || "custom",
            partyName: step.partyName || "",
            activeFields: Array.isArray(step.activeFields) ? step.activeFields : [],
            fields: step.fields || {}
        }));

        // Build the update object
        const updateData = {
            orderId,
            steps: sanitizedSteps,
            status: sanitizedSteps.length > 0 ? "In Progress" : "New"
        };

        // Include optional fields only if provided
        if (orderItemId) updateData.orderItemId = orderItemId;
        if (sizeVariant) updateData.sizeVariant = sizeVariant;
        if (priority) updateData.priority = priority;
        if (rejectedUsage !== undefined) updateData.rejectedUsage = rejectedUsage;

        // Save the sequence safely (upsert: creates if doesn't exist)
        const updatedSequence = await ProcessSequence.findOneAndUpdate(
            queryFilter,
            updateData,
            { new: true, upsert: true }
        );
        // Auto-grant any newly created step names to the manager who created them
        if (!isSuperAdmin && auth.user?.id && sanitizedSteps.length > 0) {
            const User = (await import("../../../models/User")).default;
            const stepNamesToGrant = sanitizedSteps.map((s) => s.processName).filter(Boolean);
            await User.findByIdAndUpdate(auth.user.id, {
                $addToSet: {
                    "permissions.process": { $each: stepNamesToGrant },
                },
            });
        }
        return NextResponse.json(updatedSequence, { status: 200 });
    } catch (error) {
        console.error("Save process sequence error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to save process sequence" },
            { status: 500 }
        );
    }
}

// Handle dispatch confirmation — marks order as Dispatched and confirms rejected piece deductions
async function handleDispatch(orderId, orderItemId, body) {
    try {
        let auth = await checkPermission("process", ACTIONS.EDIT);
        if (!auth.authorized) auth = await checkPermission("order", ACTIONS.EDIT);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();

        // Find all sequences for this order
        const sequences = await ProcessSequence.find({ orderId });

        if (sequences.length === 0) {
            return NextResponse.json({ error: "No process sequences found" }, { status: 404 });
        }

        // Collect all rejected usages across all sequences for this order
        const allRejectedUsages = [];
        for (const seq of sequences) {
            if (seq.rejectedUsage && seq.rejectedUsage.length > 0) {
                for (const usage of seq.rejectedUsage) {
                    if (!usage.confirmed && usage.quantity > 0) {
                        allRejectedUsages.push(usage);
                    }
                }
            }
        }

        // Permanently deduct rejected pieces from inventory
        for (const usage of allRejectedUsages) {
            if (usage.inventorySubItemId && usage.quantity > 0) {
                await InventoryGroup.updateOne(
                    { "subItems._id": usage.inventorySubItemId },
                    {
                        $inc: {
                            "subItems.$.stock": -Math.abs(usage.quantity),
                            "subItems.$.reservedInProcess": -Math.abs(usage.quantity)
                        }
                    }
                );
            }
        }

        // Mark all sequences as Dispatched and confirm rejected usages
        await ProcessSequence.updateMany(
            { orderId },
            {
                $set: {
                    status: "Dispatched",
                    dispatchedAt: new Date(),
                    "rejectedUsage.$[].confirmed": true
                }
            }
        );

        // Update the order status to Dispatched
        await Order.findByIdAndUpdate(orderId, { status: "Dispatched" });

        return NextResponse.json(
            { message: "Order dispatched. Rejected pieces confirmed and deducted from inventory." },
            { status: 200 }
        );
    } catch (error) {
        console.error("Dispatch error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to dispatch order" },
            { status: 500 }
        );
    }
}