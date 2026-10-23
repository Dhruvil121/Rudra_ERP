import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import InventoryGroup from "../../models/Inventory";
import Order from "../../models/Order";
import { checkPermission, ACTIONS } from "../../../lib/auth";

// Collision-safe Group ID generator (finds highest existing G-XXX number)
async function generateNextGroupId() {
    const groups = await InventoryGroup.find({}, { groupId: 1 }).lean();
    let maxNum = groups.length;
    groups.forEach((g) => {
        const match = String(g.groupId || "").match(/(\d+)/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    });
    return `G-${(maxNum + 1).toString().padStart(3, "0")}`;
}

export async function GET() {
    try {
        let auth = await checkPermission("inventory", ACTIONS.VIEW);
        if (!auth.authorized) auth = await checkPermission("bom", ACTIONS.VIEW);
        if (!auth.authorized) auth = await checkPermission("order", ACTIONS.VIEW);
        if (!auth.authorized) auth = await checkPermission("process", ACTIONS.VIEW);
        if (!auth.authorized) auth = await checkPermission("reports", ACTIONS.VIEW);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const inventory = await InventoryGroup.find({}).sort({ createdAt: -1 });
        return NextResponse.json(inventory, { status: 200 });
    } catch (error) {
        console.error("GET Inventory error:", error);
        return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        let auth = await checkPermission("inventory", ACTIONS.ADD);
        if (!auth.authorized) auth = await checkPermission("bom", ACTIONS.ADD);
        if (!auth.authorized) auth = await checkPermission("bom", ACTIONS.EDIT);
        if (!auth.authorized) auth = await checkPermission("order", ACTIONS.ADD);
        if (!auth.authorized) auth = await checkPermission("process", ACTIONS.ADD);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const body = await req.json();

        if (!body.groupId || !body.groupId.trim()) {
            body.groupId = await generateNextGroupId();
        }

        if (!body._id) delete body._id;

        if (body.subItems && Array.isArray(body.subItems)) {
            body.subItems = body.subItems.map((item) => {
                const cleanItem = { ...item };
                if (!cleanItem._id) delete cleanItem._id;
                delete cleanItem.id;
                return cleanItem;
            });
        }

        const newGroup = await InventoryGroup.create(body);
        return NextResponse.json(newGroup, { status: 201 });
    } catch (error) {
        console.error("POST Inventory error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create inventory group" },
            { status: 500 }
        );
    }
}

// PATCH: Handles Quick-Create SubItem (+ button), Order BOM Stock Deduction, Process Extra Stock Addition,
// and NEW: Rejected Pieces Reserve/Confirm/Release
export async function PATCH(req) {
    try {
        await dbConnect();
        const body = await req.json();
        const { action } = body;

        // 1. QUICK-ADD ITEM FROM BOM OR ORDER DROPDOWN (+)
        if (action === "quick_add_item") {
            let auth = await checkPermission("inventory", ACTIONS.ADD);
            if (!auth.authorized) auth = await checkPermission("inventory", ACTIONS.EDIT);
            if (!auth.authorized) auth = await checkPermission("bom", ACTIONS.ADD);
            if (!auth.authorized) auth = await checkPermission("bom", ACTIONS.EDIT);
            if (!auth.authorized) auth = await checkPermission("order", ACTIONS.ADD);
            if (!auth.authorized) auth = await checkPermission("order", ACTIONS.EDIT);
            if (!auth.authorized) auth = await checkPermission("process", ACTIONS.ADD);
            if (!auth.authorized) {
                return NextResponse.json({ error: auth.error }, { status: auth.status });
            }

            const { groupId, newGroupName, item } = body;
            if (!item?.name?.trim() || !item?.itemCode?.trim()) {
                return NextResponse.json(
                    { error: "Item Code and Name are required" },
                    { status: 400 }
                );
            }

            const cleanCode = item.itemCode.trim().toUpperCase();

            // Check if an item with this exact SKU already exists in any group
            const existingGroupWithSku = await InventoryGroup.findOne({
                "subItems.itemCode": cleanCode
            });
            if (existingGroupWithSku) {
                const existingSub = existingGroupWithSku.subItems.find(
                    (s) => s.itemCode.toUpperCase() === cleanCode
                );
                return NextResponse.json(
                    {
                        group: existingGroupWithSku,
                        subItem: existingSub,
                        alreadyExisted: true
                    },
                    { status: 200 }
                );
            }

            let targetGroup = null;
            if (groupId && groupId !== "NEW_GROUP") {
                targetGroup = await InventoryGroup.findById(groupId);
            }

            // If no group exists or user chose to create a new group on the fly
            if (!targetGroup) {
                const generatedGroupId = await generateNextGroupId();
                targetGroup = await InventoryGroup.create({
                    groupId: generatedGroupId,
                    groupName:
                        newGroupName?.trim() ||
                        (item.category === "After-Market"
                            ? "After-Market Parts"
                            : "Master Components"),
                    details: "Auto-created via Quick Add",
                    subItems: []
                });
            }

            targetGroup.subItems.push({
                itemCode: cleanCode,
                name: item.name.trim(),
                category: item.category || "After-Market",
                inventoryType: item.inventoryType || (
                    ['After-Market', 'Finished Good'].includes(item.category) ? 'aftermarket' : 'process'
                ),
                uom: item.uom || "Pcs",
                unitCost: Number(item.unitCost) || 0,
                stock: Number(item.stock) || 0,
                details: item.details || ""
            });

            await targetGroup.save();
            const createdSubItem = targetGroup.subItems[targetGroup.subItems.length - 1];

            return NextResponse.json(
                {
                    group: targetGroup,
                    subItem: createdSubItem
                },
                { status: 200 }
            );
        }

        // 2. DEDUCT AFTER-MARKET BOM MATERIALS WHEN ORDER IS APPROVED / SYNCED
        if (action === "deduct_order_bom") {
            let auth = await checkPermission("order", ACTIONS.EDIT);
            if (!auth.authorized) auth = await checkPermission("order", ACTIONS.APPROVE);
            if (!auth.authorized) auth = await checkPermission("inventory", ACTIONS.EDIT);
            if (!auth.authorized) {
                return NextResponse.json({ error: auth.error }, { status: auth.status });
            }

            const { orderId, deductions } = body;
            const order = await Order.findById(orderId);
            if (!order) {
                return NextResponse.json({ error: "Order not found" }, { status: 404 });
            }
            if (order.inventorySynced) {
                return NextResponse.json(
                    { error: "Inventory already synced for this order" },
                    { status: 400 }
                );
            }

            for (const d of deductions || []) {
                const qtyToDeduct = Number(d.quantity ?? d.requiredQuantity ?? 0);
                if (!d.inventorySubItemId || qtyToDeduct <= 0) continue;

                await InventoryGroup.updateOne(
                    { "subItems._id": d.inventorySubItemId },
                    { $inc: { "subItems.$.stock": -Math.abs(qtyToDeduct) } }
                );
            }

            const updatedOrder = await Order.findByIdAndUpdate(
                orderId,
                {
                    $set: {
                        inventorySynced: true,
                        inventorySyncedAt: new Date()
                    }
                },
                { new: true }
            );

            return NextResponse.json(
                {
                    message: "Inventory stock deducted successfully",
                    order: updatedOrder
                },
                { status: 200 }
            );
        }

        // 3. ADD EXTRA PIECES FROM PROCESS MODULE TO INVENTORY
        if (action === "sync_process_extra") {
            let auth = await checkPermission("process", ACTIONS.ADD);
            if (!auth.authorized) auth = await checkPermission("process", ACTIONS.EDIT);
            if (!auth.authorized) auth = await checkPermission("inventory", ACTIONS.EDIT);
            if (!auth.authorized) auth = await checkPermission("process", ACTIONS.VIEW);
            if (!auth.authorized) {
                return NextResponse.json({ error: auth.error }, { status: auth.status });
            }

            const { itemCode, itemName, extraQty } = body;
            if (!itemCode || !extraQty || Number(extraQty) <= 0) {
                return NextResponse.json(
                    { error: "Valid Item Code and Extra Quantity required" },
                    { status: 400 }
                );
            }

            const codeUpper = itemCode.trim().toUpperCase();
            const group = await InventoryGroup.findOne({ "subItems.itemCode": codeUpper });

            if (group) {
                await InventoryGroup.updateOne(
                    { "subItems.itemCode": codeUpper },
                    { $inc: { "subItems.$.stock": Number(extraQty) } }
                );
            } else {
                let defaultGroup = await InventoryGroup.findOne({
                    groupName: "Finished & Process Extra"
                });
                if (!defaultGroup) {
                    const generatedGroupId = await generateNextGroupId();
                    defaultGroup = await InventoryGroup.create({
                        groupId: generatedGroupId,
                        groupName: "Finished & Process Extra",
                        details: "Auto-synced from Process Module",
                        subItems: []
                    });
                }
                defaultGroup.subItems.push({
                    itemCode: codeUpper,
                    name: itemName || codeUpper,
                    category: "Semi-Finished",
                    inventoryType: "process",
                    uom: "Pcs",
                    stock: Number(extraQty),
                    unitCost: 0
                });
                await defaultGroup.save();
            }

            return NextResponse.json(
                { message: `Added ${extraQty} Pcs of ${codeUpper} to Inventory` },
                { status: 200 }
            );
        }

        // 4. RESERVE REJECTED PIECES FOR A PROCESS (Soft-hold — does NOT reduce stock)
        // Used when an operator pulls rejected pieces from inventory into an active order's process
        if (action === "reserve_rejected") {
            let auth = await checkPermission("process", ACTIONS.ADD);
            if (!auth.authorized) auth = await checkPermission("process", ACTIONS.EDIT);
            if (!auth.authorized) auth = await checkPermission("inventory", ACTIONS.EDIT);
            if (!auth.authorized) {
                return NextResponse.json({ error: auth.error }, { status: auth.status });
            }

            const { inventorySubItemId, quantity } = body;
            const reserveQty = Number(quantity);

            if (!inventorySubItemId || reserveQty <= 0) {
                return NextResponse.json(
                    { error: "Valid Inventory Sub Item ID and Quantity required" },
                    { status: 400 }
                );
            }

            // Find the inventory item and check available stock
            const group = await InventoryGroup.findOne({ "subItems._id": inventorySubItemId });
            if (!group) {
                return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
            }

            const subItem = group.subItems.id(inventorySubItemId);
            const availableStock = (subItem.stock || 0) - (subItem.reservedInProcess || 0);

            if (reserveQty > availableStock) {
                return NextResponse.json(
                    { error: `Only ${availableStock} pieces available (${subItem.stock} in stock - ${subItem.reservedInProcess || 0} already reserved)` },
                    { status: 400 }
                );
            }

            // Soft-reserve: increment reservedInProcess (stock stays the same)
            await InventoryGroup.updateOne(
                { "subItems._id": inventorySubItemId },
                { $inc: { "subItems.$.reservedInProcess": reserveQty } }
            );

            return NextResponse.json(
                { message: `Reserved ${reserveQty} rejected pieces (soft-hold until dispatch)` },
                { status: 200 }
            );
        }

        // 5. CONFIRM DISPATCH — Permanently deduct reserved rejected pieces from stock
        // Called when order is marked as Dispatched
        if (action === "confirm_dispatch") {
            let auth = await checkPermission("process", ACTIONS.ADD);
            if (!auth.authorized) auth = await checkPermission("process", ACTIONS.EDIT);
            if (!auth.authorized) auth = await checkPermission("order", ACTIONS.EDIT);
            if (!auth.authorized) {
                return NextResponse.json({ error: auth.error }, { status: auth.status });
            }

            const { rejectedUsages } = body; // Array of { inventorySubItemId, quantity }

            if (!rejectedUsages || !Array.isArray(rejectedUsages)) {
                return NextResponse.json(
                    { error: "rejectedUsages array is required" },
                    { status: 400 }
                );
            }

            for (const usage of rejectedUsages) {
                const qty = Number(usage.quantity);
                if (!usage.inventorySubItemId || qty <= 0) continue;

                // Permanently deduct from stock AND clear the reservation
                await InventoryGroup.updateOne(
                    { "subItems._id": usage.inventorySubItemId },
                    {
                        $inc: {
                            "subItems.$.stock": -Math.abs(qty),
                            "subItems.$.reservedInProcess": -Math.abs(qty)
                        }
                    }
                );
            }

            return NextResponse.json(
                { message: "Dispatch confirmed. Rejected pieces permanently deducted from inventory." },
                { status: 200 }
            );
        }

        // 6. RELEASE REJECTED PIECES — If order is cancelled, release soft-held pieces
        if (action === "release_rejected") {
            let auth = await checkPermission("process", ACTIONS.EDIT);
            if (!auth.authorized) auth = await checkPermission("order", ACTIONS.EDIT);
            if (!auth.authorized) {
                return NextResponse.json({ error: auth.error }, { status: auth.status });
            }

            const { rejectedUsages } = body;

            if (!rejectedUsages || !Array.isArray(rejectedUsages)) {
                return NextResponse.json(
                    { error: "rejectedUsages array is required" },
                    { status: 400 }
                );
            }

            for (const usage of rejectedUsages) {
                const qty = Number(usage.quantity);
                if (!usage.inventorySubItemId || qty <= 0) continue;

                // Release the reservation (stock stays the same, just decrement reservedInProcess)
                await InventoryGroup.updateOne(
                    { "subItems._id": usage.inventorySubItemId },
                    { $inc: { "subItems.$.reservedInProcess": -Math.abs(qty) } }
                );
            }

            return NextResponse.json(
                { message: "Reserved rejected pieces released back to available stock." },
                { status: 200 }
            );
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Inventory PATCH error:", error);
        return NextResponse.json(
            { error: error.message || "Inventory sync failed" },
            { status: 500 }
        );
    }
}