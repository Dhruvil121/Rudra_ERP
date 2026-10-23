import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import Assembly from "../../models/Assembly";
import InventoryGroup from "../../models/Inventory";
import Order from "../../models/Order";
import ProcessSequence from "../../models/ProcessSequence";
import { checkPermission, ACTIONS } from "../../../lib/auth";

export async function GET() {
    try {
        let auth = await checkPermission("assembling", ACTIONS.VIEW);
        if (!auth.authorized) auth = await checkPermission("process", ACTIONS.VIEW);
        if (!auth.authorized) auth = await checkPermission("inventory", ACTIONS.VIEW);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const records = await Assembly.find({}).sort({ createdAt: -1 });
        return NextResponse.json(records, { status: 200 });
    } catch (error) {
        console.error("GET Assembling error:", error);
        return NextResponse.json({ error: "Failed to fetch assembly logs" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        let auth = await checkPermission("assembling", ACTIONS.ADD);
        if (!auth.authorized) auth = await checkPermission("assembling", ACTIONS.EDIT);
        if (!auth.authorized) auth = await checkPermission("process", ACTIONS.ADD);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const body = await req.json();

        const {
            orderId,
            piNo,
            customerName,
            partyCode,
            finishedItemCode,
            productName,
            assembledSets,
            piecesPerBox = 1,
            stockSource = "buffing",
            inHouseConsumed = [],
            afterMarketConsumed = [],
            remarks = ""
        } = body;

        if (!finishedItemCode || !assembledSets || Number(assembledSets) <= 0) {
            return NextResponse.json(
                { error: "Finished Product Code (Rudra Code) and valid Assembly Quantity are required" },
                { status: 400 }
            );
        }

        const setsNum = Number(assembledSets);
        const ppbNum = Math.max(1, Number(piecesPerBox) || 1);
        const totalBoxes = Number((setsNum / ppbNum).toFixed(2));
        const cleanCode = finishedItemCode.trim().toUpperCase();

        // 1. Deduct After-Market Components from Master Inventory
        for (const mat of afterMarketConsumed) {
            const qty = Number(mat.consumedQty || mat.requiredQuantity || 0);
            if (mat.inventorySubItemId && qty > 0) {
                await InventoryGroup.updateOne(
                    { "subItems._id": mat.inventorySubItemId },
                    { $inc: { "subItems.$.stock": -Math.abs(qty) } }
                );
            }
        }

        // 2. If Stock Source is 'inventory', also deduct In-House Semi-Finished parts from Inventory
        if (stockSource === "inventory") {
            for (const part of inHouseConsumed) {
                const qty = Number(part.requiredPieces || 0);
                if (qty <= 0) continue;

                if (part.inventorySubItemId) {
                    await InventoryGroup.updateOne(
                        { "subItems._id": part.inventorySubItemId },
                        { $inc: { "subItems.$.stock": -Math.abs(qty) } }
                    );
                } else if (part.partCode && part.partCode !== "-") {
                    await InventoryGroup.updateOne(
                        { "subItems.itemCode": part.partCode.trim().toUpperCase() },
                        { $inc: { "subItems.$.stock": -Math.abs(qty) } }
                    );
                }
            }
        }

        // 3. Increment (or create) Finished Good Stock in Master Inventory
        const fgGroup = await InventoryGroup.findOne({ "subItems.itemCode": cleanCode });
        if (fgGroup) {
            await InventoryGroup.updateOne(
                { "subItems.itemCode": cleanCode },
                { $inc: { "subItems.$.stock": setsNum } }
            );
        } else {
            let targetFgGroup = await InventoryGroup.findOne({ groupName: "Finished Goods" });
            if (!targetFgGroup) {
                const count = await InventoryGroup.countDocuments();
                targetFgGroup = await InventoryGroup.create({
                    groupId: `G-${(count + 101).toString()}`,
                    groupName: "Finished Goods",
                    details: "Assembled Finished Products",
                    subItems: []
                });
            }
            targetFgGroup.subItems.push({
                itemCode: cleanCode,
                name: productName || cleanCode,
                category: "Finished Good",
                uom: "Set",
                stock: setsNum,
                unitCost: 0
            });
            await targetFgGroup.save();
        }

        // 4. Sync with ProcessSequence & Order if an Order was selected
        if (orderId) {
            const existingSeq = await ProcessSequence.findOne({ orderId });
            const assemblyStep = {
                stepId: Math.random().toString(36).substring(2, 10),
                processName: `Final Assembly (${stockSource === "buffing" ? "Buffing WIP" : "Inventory Stock"})`,
                processType: "custom",
                activeFields: ["inputQty", "piecesPerBox", "totalBoxes", "output"],
                fields: {
                    inputQty: setsNum,
                    piecesPerBox: ppbNum,
                    totalBoxes,
                    output: setsNum
                }
            };

            if (existingSeq) {
                existingSeq.steps.push(assemblyStep);
                await existingSeq.save();
            } else {
                await ProcessSequence.create({
                    orderId,
                    steps: [assemblyStep],
                    status: "In Progress"
                });
            }

            await Order.findByIdAndUpdate(orderId, {
                $set: { inventorySynced: true, inventorySyncedAt: new Date() }
            });
        }

        // 5. Create Assembly Log Record
        const count = await Assembly.countDocuments();
        const batchNo = `ASM-${1000 + count + 1}`;

        const newAssembly = await Assembly.create({
            batchNo,
            orderId: orderId || "",
            piNo: piNo || "Stock Assembly",
            customerName: customerName || "In-House Inventory",
            partyCode: partyCode || "-",
            finishedItemCode: cleanCode,
            productName: productName || cleanCode,
            assembledSets: setsNum,
            piecesPerBox: ppbNum,
            totalBoxes,
            stockSource,
            inHouseConsumed,
            afterMarketConsumed,
            remarks,
            status: "Completed"
        });

        return NextResponse.json(newAssembly, { status: 201 });
    } catch (error) {
        console.error("POST Assembling error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to confirm assembly" },
            { status: 500 }
        );
    }
}