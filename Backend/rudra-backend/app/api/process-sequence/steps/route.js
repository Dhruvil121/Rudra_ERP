import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import ProcessSequence from "../../../models/ProcessSequence";
import { requireSuperAdmin } from "../../../../lib/auth";

/**
 * GET /api/process-sequence/steps
 * Returns all unique process step names across ALL orders.
 * This is used by the Settings → Process Access tab so the admin
 * can assign permissions for the actual step names that exist,
 * not a hardcoded list.
 */
export async function GET(req) {
    try {
        const auth = await requireSuperAdmin();
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();

        // Aggregate all unique processName values from all process sequences
        const result = await ProcessSequence.aggregate([
            { $unwind: "$steps" },
            { $group: { _id: "$steps.processName" } },
            { $sort: { _id: 1 } }
        ]);

        const stepNames = result.map(r => r._id);

        return NextResponse.json({ steps: stepNames }, { status: 200 });
    } catch (error) {
        console.error("Fetch process step names error:", error);
        return NextResponse.json({ error: "Failed to fetch process step names" }, { status: 500 });
    }
}
