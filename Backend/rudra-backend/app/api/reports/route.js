import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import Order from "../../models/Order";
import ProcessSequence from "../../models/ProcessSequence";
import InventoryGroup from "../../models/Inventory";
import { checkPermission, requireAuth, ACTIONS } from "../../../lib/auth";

export async function GET(req) {
    try {
        // Allow access if user has reports.view, process.view, order.view, or is authenticated
        let auth = await checkPermission("reports", ACTIONS.VIEW);
        if (!auth.authorized) auth = await checkPermission("process", ACTIONS.VIEW);
        if (!auth.authorized) auth = await checkPermission("order", ACTIONS.VIEW);
        if (!auth.authorized) auth = await requireAuth();

        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type") || "daily"; // 'daily' | 'monthly' | 'all'
        const dateParam = searchParams.get("date") || "";

        // Fetch all Orders, ProcessSequences, and InventoryGroups in parallel
        const [orders, sequences, inventoryGroups] = await Promise.all([
            Order.find({}).sort({ createdAt: -1 }).lean(),
            ProcessSequence.find({}).sort({ updatedAt: -1 }).lean(),
            InventoryGroup.find({}).sort({ createdAt: -1 }).lean()
        ]);

        // Map Orders by _id for instant lookup
        const orderMap = new Map();
        orders.forEach((o) => orderMap.set(o._id.toString(), o));

        // Helper to check if a record matches the selected Daily or Monthly filter
        const matchesTimeframe = (seq, linkedOrder) => {
            if (type === "all" || !dateParam) return true;

            const seqDate = seq?.updatedAt || seq?.createdAt;
            const ordDate = linkedOrder?.date || linkedOrder?.createdAt;

            const toIsoDate = (d) => {
                if (!d) return "";
                try {
                    return new Date(d).toISOString().split("T")[0];
                } catch {
                    return String(d);
                }
            };

            const seqIso = toIsoDate(seqDate);
            const ordIso = toIsoDate(ordDate);

            if (type === "daily") {
                return seqIso === dateParam || ordIso === dateParam;
            }
            if (type === "monthly") {
                return seqIso.startsWith(dateParam) || ordIso.startsWith(dateParam);
            }
            return true;
        };

        let totalInputPcs = 0;
        let totalOutputPcs = 0;
        let totalExtraPcs = 0;
        let totalRejectionPcs = 0;
        let totalBoxes = 0;
        let totalRawKg = 0;
        let totalProcessCost = 0;

        const logs = [];
        const stageMap = new Map();

        // Map sequences by orderId
        const seqByOrderId = new Map();
        sequences.forEach((s) => seqByOrderId.set(String(s.orderId), s));

        // Combine Orders & ProcessSequences so every active manufacturing order is reported
        orders.forEach((order) => {
            const orderIdStr = order._id.toString();
            const seq = seqByOrderId.get(orderIdStr);

            if (!matchesTimeframe(seq, order)) return;

            const steps = seq?.steps || [];
            const orderSetQty = (order.items || []).reduce(
                (acc, item) => acc + Number(item.qty || 0),
                0
            );
            const rudraCodes = (order.items || [])
                .map((i) => i.rudraCode)
                .filter(Boolean)
                .join(", ");

            let orderInput = 0;
            let orderOutput = 0;
            let orderExtra = 0;
            let orderRejection = 0;
            let orderBoxes = 0;
            let orderKg = 0;
            let orderCost = 0;

            steps.forEach((step, idx) => {
                const f = step.fields || {};
                const stepInput = Number(f.inputQty || 0);
                const stepRej = Number(f.rejection || 0);
                const stepExt = Number(f.extra || 0);
                const stepOut =
                    f.output !== undefined
                        ? Number(f.output || 0)
                        : Math.max(0, stepInput - stepRej - stepExt);
                const stepKg = Number(f.kg || 0);
                const stepCost =
                    Number(f.totalCost || 0) || stepInput * Number(f.rate || 0);
                const stepBoxes = Number(f.totalBoxes || 0);

                if (idx === 0 && stepInput > 0) {
                    orderInput = stepInput;
                } else if (orderInput === 0 && stepInput > 0) {
                    orderInput = stepInput;
                }

                if (stepOut > 0 || idx === steps.length - 1) {
                    orderOutput = stepOut;
                }

                orderExtra += stepExt;
                orderRejection += stepRej;
                orderKg += stepKg;
                orderCost += stepCost;

                if (step.activeFields?.includes("totalBoxes") || stepBoxes > 0) {
                    orderBoxes = stepBoxes;
                }

                // Aggregate Stage-Wise Metrics
                const stageName = (step.processName || "General Process").trim();
                if (!stageMap.has(stageName)) {
                    stageMap.set(stageName, {
                        stageName,
                        ordersCount: 0,
                        inputPcs: 0,
                        outputPcs: 0,
                        extraPcs: 0,
                        rejectionPcs: 0,
                        rawKg: 0,
                        totalCost: 0
                    });
                }
                const st = stageMap.get(stageName);
                st.ordersCount += 1;
                st.inputPcs += stepInput;
                st.outputPcs += stepOut;
                st.extraPcs += stepExt;
                st.rejectionPcs += stepRej;
                st.rawKg = Number((st.rawKg + stepKg).toFixed(2));
                st.totalCost = Number((st.totalCost + stepCost).toFixed(2));
            });

            // If no process steps entered yet, fallback to order set qty as planned input
            if (steps.length === 0) {
                orderInput = orderSetQty;
            }

            totalInputPcs += orderInput;
            totalOutputPcs += orderOutput;
            totalExtraPcs += orderExtra;
            totalRejectionPcs += orderRejection;
            totalBoxes += orderBoxes;
            totalRawKg = Number((totalRawKg + orderKg).toFixed(2));
            totalProcessCost = Number((totalProcessCost + orderCost).toFixed(2));

            const latestStep =
                steps.length > 0 ? steps[steps.length - 1].processName : "Not Started";

            const isCompleted =
                order.status === "Approved" &&
                steps.length > 0 &&
                (orderBoxes > 0 || orderOutput > 0);

            logs.push({
                id: seq?._id?.toString() || orderIdStr,
                orderId: orderIdStr,
                batchNo: order.piNo || "N/A",
                partyCode: order.partyCode || "-",
                customerName: order.name || "-",
                brandName: order.brandName || "-",
                rudraCode: rudraCodes || "-",
                orderSets: orderSetQty,
                stepsCount: steps.length,
                stage: latestStep,
                inputQty: orderInput,
                outputQty: orderOutput,
                extraQty: orderExtra,
                rejectionQty: orderRejection,
                rawKg: Number(orderKg.toFixed(2)),
                boxes: Number(orderBoxes.toFixed(2)),
                totalCost: Number(orderCost.toFixed(2)),
                status: isCompleted
                    ? "Completed"
                    : steps.length > 0
                        ? "In Progress"
                        : order.status || "Pending",
                date:
                    seq?.updatedAt ||
                    order.date ||
                    order.createdAt ||
                    new Date().toISOString()
            });
        });

        // Calculate Inventory Summary for the Inventory Report Tab
        const inventoryReport = [];
        let totalInventoryValue = 0;

        inventoryGroups.forEach((grp) => {
            (grp.subItems || []).forEach((item) => {
                const stock = Number(item.stock || 0);
                const cost = Number(item.unitCost || 0);
                const totalValue = Number((stock * cost).toFixed(2));
                totalInventoryValue += totalValue;

                inventoryReport.push({
                    id: item._id?.toString() || item.itemCode,
                    itemCode: item.itemCode,
                    name: item.name,
                    groupName: grp.groupName,
                    category: item.category || "Raw Material",
                    stock,
                    uom: item.uom || "Pcs",
                    unitCost: cost,
                    totalValue
                });
            });
        });

        const scrapRate =
            totalInputPcs > 0
                ? Number(((totalRejectionPcs / totalInputPcs) * 100).toFixed(1))
                : 0;

        return NextResponse.json(
            {
                summary: {
                    production: `${totalInputPcs} Pcs`,
                    goodOutput: `${totalOutputPcs} Pcs`,
                    extraInventory: `${totalExtraPcs} Pcs`,
                    assembly: `${Number(totalBoxes.toFixed(2))} Boxes`,
                    waste: `${totalRejectionPcs} Pcs`,
                    scrapRate: `${scrapRate}%`,
                    rawKg: `${totalRawKg} Kg`,
                    totalCost: totalProcessCost,
                    inventoryValuation: totalInventoryValue
                },
                logs,
                stageBreakdown: Array.from(stageMap.values()),
                inventoryReport
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("GET Reports error:", error);
        return NextResponse.json(
            { error: "Failed to generate production reports" },
            { status: 500 }
        );
    }
}