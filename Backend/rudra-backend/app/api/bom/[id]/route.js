import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import BOM from "../../../models/BOM";
import { checkPermission, ACTIONS } from "../../../../lib/auth";

export async function GET(req, { params }) {
    try {
        const auth = await checkPermission('inventory', ACTIONS.VIEW);
        if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

        await dbConnect();
        const { id } = await params;
        const bom = await BOM.findById(id);
        
        if (!bom) {
            return NextResponse.json({ error: "BOM not found" }, { status: 404 });
        }
        return NextResponse.json(bom, { status: 200 });
    } catch (error) {
        console.error("GET BOM by ID error:", error);
        return NextResponse.json({ error: "Failed to fetch BOM" }, { status: 500 });
    }
}

export async function PUT(req, { params }) {
    try {
        const auth = await checkPermission('inventory', ACTIONS.EDIT);
        if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

        await dbConnect();
        const { id } = await params;
        const body = await req.json();

        const updatedBom = await BOM.findByIdAndUpdate(id, body, { new: true });
        
        if (!updatedBom) {
            return NextResponse.json({ error: "BOM not found" }, { status: 404 });
        }
        return NextResponse.json(updatedBom, { status: 200 });
    } catch (error) {
        console.error("PUT BOM error:", error);
        return NextResponse.json({ error: "Failed to update BOM" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const auth = await checkPermission('inventory', ACTIONS.DELETE);
        if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

        await dbConnect();
        const { id } = await params;
        
        const deletedBom = await BOM.findByIdAndDelete(id);
        if (!deletedBom) {
            return NextResponse.json({ error: "BOM not found" }, { status: 404 });
        }
        return NextResponse.json({ message: "BOM deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("DELETE BOM error:", error);
        return NextResponse.json({ error: "Failed to delete BOM" }, { status: 500 });
    }
}
