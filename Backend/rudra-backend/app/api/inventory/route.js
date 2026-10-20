import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import InventoryGroup from "../../models/Inventory";
import Order from "../../models/Order";
import { checkPermission, ACTIONS } from "../../../lib/auth";

export async function GET(req) {
    try {
        let auth = await checkPermission('inventory', ACTIONS.VIEW);
        if (!auth.authorized) auth = await checkPermission('order', ACTIONS.VIEW);
        if (!auth.authorized) auth = await checkPermission('process', ACTIONS.VIEW);
        if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

        await dbConnect();
        const inventory = await InventoryGroup.find({}).sort({ createdAt: -1 });
        return NextResponse.json(inventory, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const auth = await checkPermission('inventory', ACTIONS.ADD);
        if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

        await dbConnect();
        const body = await req.json();

        if (!body.groupId) {
            const count = await InventoryGroup.countDocuments();
            body.groupId = `G-${(count + 1).toString().padStart(3, '0')}`;
        }

        if (!body._id) delete body._id;

        if (body.subItems && Array.isArray(body.subItems)) {
            body.subItems = body.subItems.map(item => {
                const cleanItem = { ...item };
                if (!cleanItem._id) delete cleanItem._id;
                delete cleanItem.id;
                return cleanItem;
            });
        }

        const newGroup = await InventoryGroup.create(body);
        return NextResponse.json(newGroup, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create inventory group" }, { status: 500 });
    }
}

// PATCH: Handles Quick-Create SubItem (+ button), Order BOM Stock Deduction, and Process Extra Stock Addition
export async function PATCH(req) {
    try {
        await dbConnect();
        const body = await req.json();
        const { action } = body;

        // 1. QUICK-ADD ITEM FROM BOM OR ORDER DROPDOWN (+)
        if (action === 'quick_add_item') {
            let auth = await checkPermission('inventory', ACTIONS.ADD);
            if (!auth.authorized) auth = await checkPermission('order', ACTIONS.ADD);
            if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

            const { groupId, newGroupName, item } = body;
            if (!item?.name || !item?.itemCode) {
                return NextResponse.json({ error: "Item Code and Name are required" }, { status: 400 });
            }

            let targetGroup = null;
            if (groupId && groupId !== 'NEW_GROUP') {
                targetGroup = await InventoryGroup.findById(groupId);
            }

            // If no group exists or user chose to create a new group on the fly
            if (!targetGroup) {
                const count = await InventoryGroup.countDocuments();
                const generatedGroupId = `G-${(count + 1).toString().padStart(3, '0')}`;
                targetGroup = await InventoryGroup.create({
                    groupId: generatedGroupId,
                    groupName: newGroupName?.trim() || (item.category === 'After-Market' ? 'After-Market Parts' : 'Master Components'),
                    details: 'Auto-created via Quick Add',
                    subItems: []
                });
            }

            targetGroup.subItems.push({
                itemCode: item.itemCode.trim().toUpperCase(),
                name: item.name.trim(),
                category: item.category || 'After-Market',
                uom: item.uom || 'Pcs',
                unitCost: Number(item.unitCost) || 0,
                stock: Number(item.stock) || 0,
                details: item.details || ''
            });

            await targetGroup.save();
            const createdSubItem = targetGroup.subItems[targetGroup.subItems.length - 1];

            return NextResponse.json({
                group: targetGroup,
                subItem: createdSubItem
            }, { status: 200 });
        }

        // 2. DEDUCT AFTER-MARKET BOM MATERIALS WHEN ORDER IS SYNCED
        if (action === 'deduct_order_bom') {
            const auth = await checkPermission('order', ACTIONS.EDIT);
            if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

            const { orderId, deductions } = body; // deductions: [{ inventoryGroupId, inventorySubItemId, quantity }]
            const order = await Order.findById(orderId);
            if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
            if (order.inventorySynced) {
                return NextResponse.json({ error: "Inventory already synced for this order" }, { status: 400 });
            }

            for (const d of (deductions || [])) {
                if (!d.inventorySubItemId || !d.quantity) continue;
                await InventoryGroup.updateOne(
                    { "subItems._id": d.inventorySubItemId },
                    { $inc: { "subItems.$.stock": -Math.abs(Number(d.quantity)) } }
                );
            }

            order.inventorySynced = true;
            await order.save();

            return NextResponse.json({ message: "Inventory stock deducted successfully", order }, { status: 200 });
        }

        // 3. ADD EXTRA PIECES FROM PROCESS MODULE TO INVENTORY
        if (action === 'sync_process_extra') {
            const auth = await checkPermission('process', ACTIONS.VIEW);
            if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

            const { itemCode, itemName, extraQty } = body;
            if (!itemCode || !extraQty || Number(extraQty) <= 0) {
                return NextResponse.json({ error: "Valid Item Code and Extra Quantity required" }, { status: 400 });
            }

            const codeUpper = itemCode.trim().toUpperCase();
            let group = await InventoryGroup.findOne({ "subItems.itemCode": codeUpper });

            if (group) {
                await InventoryGroup.updateOne(
                    { "subItems.itemCode": codeUpper },
                    { $inc: { "subItems.$.stock": Number(extraQty) } }
                );
            } else {
                // Create in a "Process Extra / Semi-Finished" group if SKU doesn't exist yet
                let defaultGroup = await InventoryGroup.findOne({ groupName: "Finished & Process Extra" });
                if (!defaultGroup) {
                    const count = await InventoryGroup.countDocuments();
                    defaultGroup = await InventoryGroup.create({
                        groupId: `G-${(count + 1).toString().padStart(3, '0')}`,
                        groupName: "Finished & Process Extra",
                        details: "Auto-synced from Process Module",
                        subItems: []
                    });
                }
                defaultGroup.subItems.push({
                    itemCode: codeUpper,
                    name: itemName || codeUpper,
                    category: "Semi-Finished",
                    uom: "Pcs",
                    stock: Number(extraQty),
                    unitCost: 0
                });
                await defaultGroup.save();
            }

            return NextResponse.json({ message: `Added ${extraQty} Pcs of ${codeUpper} to Inventory` }, { status: 200 });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Inventory PATCH error:", error);
        return NextResponse.json({ error: error.message || "Inventory sync failed" }, { status: 500 });
    }
}