import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import BOM from "../../../models/BOM";
import InventoryGroup from "../../../models/Inventory";
import { checkPermission, ACTIONS } from "../../../../lib/auth";

export async function POST(req) {
    try {
        const authInv = await checkPermission('inventory', ACTIONS.VIEW);
        const authOrder = await checkPermission('order', ACTIONS.VIEW);
        const authProcess = await checkPermission('process', ACTIONS.VIEW);

        if (!authInv.authorized && !authOrder.authorized && !authProcess.authorized) {
            return NextResponse.json({ error: "Forbidden: Missing Permissions" }, { status: 403 });
        }

        await dbConnect();
        const { finishedItemCode, quantity } = await req.json();

        if (!finishedItemCode || !quantity) {
            return NextResponse.json({ error: "finishedItemCode and quantity are required" }, { status: 400 });
        }

        const bom = await BOM.findOne({ finishedItemCode, isActive: true });

        if (!bom) {
            return NextResponse.json({
                finishedItemCode,
                orderQuantity: quantity,
                explodedBOM: []
            }, { status: 200 });
        }

        // Calculate (Explode) the BOM and fetch actual Material Names safely
        const explodedComponents = await Promise.all(bom.components.map(async (comp) => {
            let group = null;

            // 1. Try to find the exact parent Inventory Group (Safest approach)
            if (comp.inventoryGroupId) {
                group = await InventoryGroup.findById(comp.inventoryGroupId);
            }

            // 2. Fallback if the above fails: search the entire DB for the sub-item ID
            if (!group) {
                group = await InventoryGroup.findOne({ 'subItems._id': comp.inventorySubItemId });
            }

            // 3. Extract the item name and code safely
            let subItem = null;
            if (group && group.subItems) {
                subItem = group.subItems.find(i => i._id.toString() === comp.inventorySubItemId.toString());
            }

            return {
                inventorySubItemId: comp.inventorySubItemId,
                // If it can't find the item, it will now explicitly warn you
                materialName: subItem ? subItem.name : "⚠ Material Deleted / Not Found",
                materialCode: subItem ? subItem.itemCode : "-",
                inventoryGroupId: comp.inventoryGroupId,
                requiredQuantity: comp.quantity * quantity,
                unit: comp.unit,
                remarks: comp.remarks
            };
        }));

        return NextResponse.json({
            finishedItemCode,
            orderQuantity: quantity,
            explodedBOM: explodedComponents
        }, { status: 200 });

    } catch (error) {
        console.error("POST BOM calculate error:", error);
        return NextResponse.json({ error: "Failed to calculate BOM" }, { status: 500 });
    }
}