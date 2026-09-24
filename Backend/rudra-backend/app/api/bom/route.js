import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import BOM from "../../models/BOM";
import { checkPermission, ACTIONS } from "../../../lib/auth";

export async function GET(req) {
    try {
        // Checking for 'inventory' permission as BOM is closely tied to it
        const auth = await checkPermission('inventory', ACTIONS.VIEW);
        if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

        await dbConnect();
        // Fetch all BOMs, optionally populate if needed
        const boms = await BOM.find({}).sort({ createdAt: -1 });
        return NextResponse.json(boms, { status: 200 });
    } catch (error) {
        console.error("GET BOMs error:", error);
        return NextResponse.json({ error: "Failed to fetch BOMs" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const auth = await checkPermission('inventory', ACTIONS.ADD);
        if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

        await dbConnect();
        const body = await req.json();

        // Check if a BOM for this finished item code already exists
        const existingBom = await BOM.findOne({ finishedItemCode: body.finishedItemCode });
        if (existingBom) {
            return NextResponse.json({ error: "A BOM for this finished item code already exists." }, { status: 400 });
        }

        const newBom = await BOM.create(body);
        return NextResponse.json(newBom, { status: 201 });
    } catch (error) {
        console.error("POST BOM error:", error);
        return NextResponse.json({ error: "Failed to create BOM" }, { status: 500 });
    }
}
