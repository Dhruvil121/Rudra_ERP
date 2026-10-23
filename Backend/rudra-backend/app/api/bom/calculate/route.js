import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import BOM from "../../../models/BOM";
import InventoryGroup from "../../../models/Inventory";
import { checkPermission, ACTIONS } from "../../../../lib/auth";

export async function POST(req) {
    try {
        const authBom = await checkPermission('bom', ACTIONS.VIEW);
        const authInv = await checkPermission('inventory', ACTIONS.VIEW);
        const authOrder = await checkPermission('order', ACTIONS.VIEW);
        const authProcess = await checkPermission('process', ACTIONS.VIEW);

        if (!authBom.authorized && !authInv.authorized && !authOrder.authorized && !authProcess.authorized) {
            return NextResponse.json({ error: "Forbidden: Missing Permissions" }, { status: 403 });
        }

        await dbConnect();
        const { finishedItemCode, quantity } = await req.json();

        if (!finishedItemCode || !quantity) {
            return NextResponse.json({ error: "finishedItemCode and quantity are required" }, { status: 400 });
        }

        const bom = await BOM.findOne({
            finishedItemCode: { $regex: new RegExp(`^${finishedItemCode.trim()}$`, 'i') },
            isActive: true
        });

        if (!bom) {
            return NextResponse.json({
                finishedItemCode,
                orderQuantity: quantity,
                explodedInHouse: [],
                explodedBOM: []
            }, { status: 200 });
        }

        // 1. Explode Left Side: In-House Factory Parts (For Process Module & Semi-Finished Inventory)
        const explodedInHouse = await Promise.all((bom.inHouseParts || []).map(async (part) => {
            let subItem = null;
            if (part.inventorySubItemId) {
                const grp = await InventoryGroup.findOne({ 'subItems._id': part.inventorySubItemId });
                subItem = grp?.subItems?.find(i => i._id.toString() === part.inventorySubItemId.toString());
            }
            const requiredPieces = (Number(part.qtyInPieces) || 1) * Number(quantity);
            const totalWeightKg = Number(((requiredPieces * (Number(part.weightPerPcGrams) || 0)) / 1000).toFixed(3));

            return {
                fieldName: part.fieldName,
                partCode: subItem?.itemCode || part.partCode || '-',
                processName: part.processName || 'Factory Process',
                qtyPerUnit: part.qtyInPieces,
                requiredPieces,
                totalWeightKg,
                availableStock: subItem ? Number(subItem.stock || 0) : 0
            };
        }));

        // 2. Explode Right Side: After-Market Requirements (For Inventory Module)
        const explodedComponents = await Promise.all((bom.components || []).map(async (comp) => {
            let group = comp.inventoryGroupId ? await InventoryGroup.findById(comp.inventoryGroupId) : null;
            if (!group && comp.inventorySubItemId) {
                group = await InventoryGroup.findOne({ 'subItems._id': comp.inventorySubItemId });
            }

            const subItem = group?.subItems?.find(
                i => i._id.toString() === comp.inventorySubItemId?.toString()
            );

            const requiredQuantity = Number(comp.quantity) * Number(quantity);
            const availableStock = subItem ? Number(subItem.stock || 0) : 0;

            return {
                inventorySubItemId: comp.inventorySubItemId,
                materialName: subItem ? subItem.name : (comp.fieldName || "⚠ Material Not Found"),
                materialCode: subItem ? subItem.itemCode : "-",
                inventoryGroupId: comp.inventoryGroupId,
                requiredQuantity,
                availableStock,
                shortfall: Math.max(0, requiredQuantity - availableStock),
                unit: comp.unit,
                remarks: comp.remarks
            };
        }));

        return NextResponse.json({
            finishedItemCode,
            orderQuantity: quantity,
            explodedInHouse,
            explodedBOM: explodedComponents
        }, { status: 200 });
    } catch (error) {
        console.error("POST BOM calculate error:", error);
        return NextResponse.json({ error: "Failed to calculate BOM" }, { status: 500 });
    }
}