import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import BOM from "../../../models/BOM";
import { checkPermission, ACTIONS } from "../../../../lib/auth";

export async function POST(req) {
    try {
        // Exploding a BOM is usually done during order/process viewing
        // Allowing 'inventory.view', 'order.view' or 'process.view'
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
            // Return 200 instead of 404 to avoid console errors when an item simply doesn't have a BOM defined yet.
            return NextResponse.json({ 
                finishedItemCode, 
                orderQuantity: quantity, 
                explodedBOM: [] 
            }, { status: 200 });
        }

        // Calculate (Explode) the BOM
        const explodedComponents = bom.components.map(comp => ({
            inventorySubItemId: comp.inventorySubItemId,
            inventoryGroupId: comp.inventoryGroupId,
            requiredQuantity: comp.quantity * quantity,
            unit: comp.unit,
            remarks: comp.remarks
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
