import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import ProcessSequence from "../../models/ProcessSequence";
import Order from "../../models/Order";
import { requireAuth } from "../../../lib/auth";

export async function GET(req) {
    try {
        const auth = await requireAuth();
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || 'daily';
        const dateString = searchParams.get('date');

        let startDate, endDate;

        if (type === 'daily' && dateString) {
            startDate = new Date(dateString);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(dateString);
            endDate.setHours(23, 59, 59, 999);
        } else if (type === 'monthly' && dateString) {
            // dateString is like YYYY-MM
            const [year, month] = dateString.split('-');
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0, 23, 59, 59, 999);
        } else {
             // Fallback to today
             startDate = new Date();
             startDate.setHours(0, 0, 0, 0);
             endDate = new Date();
             endDate.setHours(23, 59, 59, 999);
        }

        // Fetch processes that were updated within the time window
        const processes = await ProcessSequence.find({
            updatedAt: { $gte: startDate, $lte: endDate }
        });

        let totalProcessed = 0;
        let totalAssembly = 0;
        let totalWaste = 0;
        const logs = [];

        for (const seq of processes) {
            const order = await Order.findOne({ _id: seq.orderId }).select('piNo');
            
            let seqInputQty = 0;
            let seqOutputQty = 0;
            let lastStage = "Started";

            seq.steps.forEach(step => {
                const f = step.fields || {};
                
                // Aggregate totals
                totalProcessed += Number(f.inputQty || 0);
                totalWaste += Number(f.rejection || 0);
                totalAssembly += Number(f.totalBoxes || 0);

                // Find the latest valid input/output for the log entry
                if (f.inputQty) seqInputQty = f.inputQty;
                if (f.output || f.totalBoxes) seqOutputQty = f.output || f.totalBoxes;
                lastStage = step.processName;
            });

            logs.push({
                id: seq._id.toString(),
                batchNo: order ? order.piNo : seq.orderId,
                stage: lastStage,
                inputQty: `${seqInputQty} Pcs`,
                outputQty: `${seqOutputQty} Pcs`,
                status: seq.status,
                updatedAt: seq.updatedAt
            });
        }

        return NextResponse.json({
            summary: {
                production: `${totalProcessed} Pcs`,
                assembly: `${totalAssembly} Boxes`,
                waste: `${totalWaste} Pcs`
            },
            logs
        }, { status: 200 });

    } catch (error) {
        console.error("Reports API error:", error);
        return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
    }
}
