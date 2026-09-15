import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import ProcessBatch from "../../../models/ProcessBatch";
import { checkPermission, ACTIONS } from "../../../../lib/auth";

// PATCH: Update specific stages or approve workflow
export async function PATCH(req, { params }) {
    try {
        await dbConnect();
        const body = await req.json();
        const { id } = await params;

        // 1. Explicit Workflow Approval Logic
        if (body.action === 'approve_turning') {
            const auth = await checkPermission('process', ACTIONS.APPROVE);
            if (!auth.authorized) {
                return NextResponse.json({ error: auth.error }, { status: auth.status });
            }

            const updatedBatch = await ProcessBatch.findByIdAndUpdate(
                id,
                { status: 'approved_turning' },
                { new: true }
            );

            if (!updatedBatch) {
                return NextResponse.json({ error: "Batch not found" }, { status: 404 });
            }

            return NextResponse.json(updatedBatch, { status: 200 });
        }

        // 2. Granular Stage Update Logic (e.g., Updating Turning Weights)
        if (body.stage === 'turning') {
            const auth = await checkPermission('process', ACTIONS.PROCESS_TURNING);
            if (!auth.authorized) {
                return NextResponse.json({ error: auth.error }, { status: auth.status });
            }

            const updatedBatch = await ProcessBatch.findByIdAndUpdate(
                id,
                {
                    turningWeightBefore: body.turningWeightBefore,
                    turningWeightAfter: body.turningWeightAfter,
                },
                { new: true }
            );

            if (!updatedBatch) {
                return NextResponse.json({ error: "Batch not found" }, { status: 404 });
            }

            return NextResponse.json(updatedBatch, { status: 200 });
        }

        return NextResponse.json({ error: "Invalid action or stage" }, { status: 400 });
    } catch (error) {
        console.error("Process PATCH error:", error);
        return NextResponse.json({ error: "Failed to update process batch" }, { status: 500 });
    }
}
