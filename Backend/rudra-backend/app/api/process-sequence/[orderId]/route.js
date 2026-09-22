import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import ProcessSequence from "../../../models/ProcessSequence";
import { checkPermission, ACTIONS } from "../../../../lib/auth";

// GET: Fetch the process sequence for a specific order
export async function GET(req, { params }) {
    try {
        const auth = await checkPermission('process', ACTIONS.VIEW);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const { orderId } = await params;

        const sequence = await ProcessSequence.findOne({ orderId });

        if (!sequence) {
            // Return empty steps array if no sequence created yet — not a 404 error
            return NextResponse.json({ orderId, steps: [], status: 'New' }, { status: 200 });
        }

        return NextResponse.json(sequence, { status: 200 });
    } catch (error) {
        console.error("Fetch process sequence error:", error);
        return NextResponse.json({ error: "Failed to fetch process sequence" }, { status: 500 });
    }
}

// POST: Create or update the process sequence for an order (with per-step RBAC)
export async function POST(req, { params }) {
    try {
        const auth = await checkPermission('process', ACTIONS.VIEW);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { orderId } = await params;
        const body = await req.json();

        // Handle both { steps: [...] } and raw array formats for compatibility
        const incomingSteps = body.steps || body;

        if (!Array.isArray(incomingSteps)) {
            return NextResponse.json(
                { error: "Invalid request body: 'steps' must be an array" },
                { status: 400 }
            );
        }

        await dbConnect();
        const userRole = auth.user.role;
        const userPermissions = auth.user.permissions?.process || [];

        // 1. Fetch the EXISTING sequence to compare against
        const existingSequence = await ProcessSequence.findOne({ orderId });

        if (userRole !== 'super_admin') {
            if (existingSequence) {
                const existingStepIds = existingSequence.steps.map(s => s.stepId);
                const incomingStepIds = incomingSteps.map(s => s.stepId);

                // SECURITY: Only super_admin can add or remove process steps (structural changes)
                const addedSteps = incomingStepIds.filter(id => !existingStepIds.includes(id));
                const removedSteps = existingStepIds.filter(id => !incomingStepIds.includes(id));

                if (addedSteps.length > 0 || removedSteps.length > 0) {
                    return NextResponse.json({
                        error: "Forbidden: Only Super Admin can add or remove process steps"
                    }, { status: 403 });
                }

                // SECURITY: Only super_admin can reorder process steps
                const existingOrder = existingStepIds.join(',');
                const incomingOrder = incomingStepIds.join(',');
                if (existingOrder !== incomingOrder) {
                    return NextResponse.json({
                        error: "Forbidden: Only Super Admin can reorder process steps"
                    }, { status: 403 });
                }

                // SECURITY: Ensure the user only modified steps they have permission for
                for (const newStep of incomingSteps) {
                    const oldStep = existingSequence.steps.find(s => s.stepId === newStep.stepId);

                    // If the step existed and the data changed, check permission for this processName
                    if (oldStep && JSON.stringify(oldStep.fields) !== JSON.stringify(newStep.fields)) {
                        // Exact case-insensitive match since permissions now use actual step names
                        const stepLower = newStep.processName.toLowerCase();
                        const hasStepPermission = userPermissions.some(perm => {
                            const permLower = perm.toLowerCase();
                            return stepLower === permLower;
                        });

                        if (!hasStepPermission) {
                            return NextResponse.json({
                                error: `Forbidden: You do not have permission to modify "${newStep.processName}"`
                            }, { status: 403 });
                        }
                    }
                }
            }
            // If no existing sequence and user is not admin, they need 'add' permission
            else if (!userPermissions.includes('add')) {
                return NextResponse.json({
                    error: "Forbidden: You do not have permission to create process sequences"
                }, { status: 403 });
            }
        }

        // 3. Save the sequence safely (upsert: creates if doesn't exist)
        const updatedSequence = await ProcessSequence.findOneAndUpdate(
            { orderId },
            { orderId, steps: incomingSteps, status: 'In Progress' },
            { new: true, upsert: true }
        );

        return NextResponse.json(updatedSequence, { status: 200 });

    } catch (error) {
        console.error("Save process sequence error:", error);
        return NextResponse.json({ error: "Failed to save process sequence" }, { status: 500 });
    }
}