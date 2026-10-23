import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import BOM from "../../../models/BOM";
import { checkPermission, ACTIONS } from "../../../../lib/auth";

export async function GET(req, { params }) {
    try {
        let auth = await checkPermission("BOM", ACTIONS.VIEW);
        if (!auth.authorized) auth = await checkPermission("bom", ACTIONS.VIEW);
        if (!auth.authorized) auth = await checkPermission("inventory", ACTIONS.VIEW);

        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

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
        let auth = await checkPermission("BOM", ACTIONS.EDIT);
        if (!auth.authorized) auth = await checkPermission("bom", ACTIONS.EDIT);
        if (!auth.authorized) auth = await checkPermission("BOM", ACTIONS.ADD);
        if (!auth.authorized) auth = await checkPermission("bom", ACTIONS.ADD);
        if (!auth.authorized) auth = await checkPermission("inventory", ACTIONS.EDIT);

        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const { id } = await params;
        const body = await req.json();

        if (Array.isArray(body.inHouseParts)) {
            body.inHouseParts = body.inHouseParts.map((part) => {
                const p = { ...part };
                delete p.id;
                if (!p._id) delete p._id;
                if (!p.inventoryGroupId) delete p.inventoryGroupId;
                if (!p.inventorySubItemId) delete p.inventorySubItemId;
                return p;
            });
        }

        if (Array.isArray(body.components)) {
            body.components = body.components
                .filter((comp) => comp.inventorySubItemId && comp.inventoryGroupId)
                .map((comp) => {
                    const c = { ...comp };
                    delete c.id;
                    if (!c._id) delete c._id;
                    return c;
                });
        }

        const updatedBom = await BOM.findByIdAndUpdate(id, body, { new: true });

        if (!updatedBom) {
            return NextResponse.json({ error: "BOM not found" }, { status: 404 });
        }
        return NextResponse.json(updatedBom, { status: 200 });
    } catch (error) {
        console.error("PUT BOM error:", error);
        return NextResponse.json({ error: error.message || "Failed to update BOM" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        let auth = await checkPermission("BOM", ACTIONS.DELETE);
        if (!auth.authorized) auth = await checkPermission("bom", ACTIONS.DELETE);
        if (!auth.authorized) auth = await checkPermission("inventory", ACTIONS.DELETE);

        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

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