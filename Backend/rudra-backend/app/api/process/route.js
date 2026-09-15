import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import ProcessBatch from "../../models/ProcessBatch";
import { checkPermission, ACTIONS } from "../../../lib/auth";

// GET: List all process batches
export async function GET(req) {
    try {
        const auth = await checkPermission('process', ACTIONS.VIEW);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const batches = await ProcessBatch.find({}).sort({ createdAt: -1 });

        return NextResponse.json(batches, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch process batches" }, { status: 500 });
    }
}

// POST: Create a new process batch
export async function POST(req) {
    try {
        const auth = await checkPermission('process', ACTIONS.ADD);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const body = await req.json();

        const newBatch = await ProcessBatch.create(body);
        return NextResponse.json(newBatch, { status: 201 });
    } catch (error) {
        console.error("Create process batch error:", error);
        return NextResponse.json({ error: "Failed to create process batch" }, { status: 500 });
    }
}