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
                explodedBOM: [],
                explodedPackaging: []
            }, { status: 200 });
        }

        // Helper to find inventory item either by ObjectId or name match
        const findInventorySubItem = async (subItemId, fieldName) => {
            if (subItemId) {
                const grp = await InventoryGroup.findOne({ 'subItems._id': subItemId });
                const found = grp?.subItems?.find(i => i._id.toString() === subItemId.toString());
                if (found) return { subItem: found, group: grp };
            }
            if (fieldName && fieldName.trim()) {
                const cleanName = fieldName.trim();
                const grp = await InventoryGroup.findOne({
                    $or: [
                        { 'subItems.name': { $regex: new RegExp(`^${cleanName}$`, 'i') } },
                        { 'subItems.itemCode': { $regex: new RegExp(`^${cleanName}$`, 'i') } }
                    ]
                });
                const found = grp?.subItems?.find(i =>
                    i.name.toLowerCase() === cleanName.toLowerCase() ||
                    i.itemCode.toLowerCase() === cleanName.toLowerCase()
                );
                if (found) return { subItem: found, group: grp };
            }
            return { subItem: null, group: null };
        };

        // 1. Explode Left Side: In-House Factory Parts (For Process Module & Semi-Finished Inventory)
        const explodedInHouse = await Promise.all((bom.inHouseParts || []).map(async (part) => {
            const { subItem } = await findInventorySubItem(part.inventorySubItemId, part.fieldName);
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

        // 2. Explode Center: After-Market Requirements (Bolt & Fitting Kit)
        const explodedComponents = await Promise.all((bom.components || []).map(async (comp) => {
            const { subItem, group } = await findInventorySubItem(comp.inventorySubItemId, comp.fieldName);
            const requiredQuantity = Number(comp.quantity || 1) * Number(quantity);
            const availableStock = subItem ? Number(subItem.stock || 0) : 0;
            const rate = Number(comp.rate || subItem?.unitCost || 0);

            return {
                inventorySubItemId: subItem?._id || comp.inventorySubItemId,
                materialName: subItem ? subItem.name : (comp.fieldName || "Fitting Item"),
                materialCode: subItem ? subItem.itemCode : "-",
                inventoryGroupId: group?._id || comp.inventoryGroupId,
                rate,
                totalCost: Number((requiredQuantity * rate).toFixed(2)),
                requiredQuantity,
                availableStock,
                shortfall: Math.max(0, requiredQuantity - availableStock),
                isLowStock: availableStock < requiredQuantity,
                unit: comp.unit || subItem?.uom || 'Pcs',
                remarks: comp.remarks
            };
        }));

        // 3. Explode Right Side: Packaging Requirements (Paking - Bags, Print Box, Cartun, Bhida Pati)
        const explodedPackaging = await Promise.all((bom.packaging || []).map(async (pack) => {
            const { subItem, group } = await findInventorySubItem(pack.inventorySubItemId, pack.fieldName);
            const requiredQuantity = Number(pack.quantity || 1) * Number(quantity);
            const availableStock = subItem ? Number(subItem.stock || 0) : 0;
            const rate = Number(pack.rate || subItem?.unitCost || 0);

            return {
                inventorySubItemId: subItem?._id || pack.inventorySubItemId,
                materialName: subItem ? subItem.name : (pack.fieldName || "Packaging Item"),
                materialCode: subItem ? subItem.itemCode : "-",
                inventoryGroupId: group?._id || pack.inventoryGroupId,
                rate,
                totalCost: Number((requiredQuantity * rate).toFixed(2)),
                requiredQuantity,
                availableStock,
                shortfall: Math.max(0, requiredQuantity - availableStock),
                isLowStock: availableStock < requiredQuantity,
                unit: pack.unit || subItem?.uom || 'Pcs',
                remarks: pack.remarks
            };
        }));

        const hasShortfall = [...explodedComponents, ...explodedPackaging].some(i => i.shortfall > 0);

        return NextResponse.json({
            finishedItemCode,
            orderQuantity: quantity,
            hasShortfall,
            explodedInHouse,
            explodedBOM: explodedComponents,
            explodedPackaging
        }, { status: 200 });
    } catch (error) {
        console.error("POST BOM calculate error:", error);
        return NextResponse.json({ error: "Failed to calculate BOM" }, { status: 500 });
    }
}
