import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import BOM from "../../models/BOM";
import { checkPermission, ACTIONS } from "../../../lib/auth";

const sanitizeBomPayload = (body) => {
    const clean = { ...body };
    if (!clean._id) delete clean._id;

    if (Array.isArray(clean.inHouseParts)) {
        clean.inHouseParts = clean.inHouseParts.map((part) => {
            const p = { ...part };
            delete p.id;
            if (!p._id) delete p._id;
            if (!p.inventoryGroupId) delete p.inventoryGroupId;
            if (!p.inventorySubItemId) delete p.inventorySubItemId;
            return p;
        });
    }

    if (Array.isArray(clean.components)) {
        clean.components = clean.components
            .filter((comp) => comp.inventorySubItemId && comp.inventoryGroupId)
            .map((comp) => {
                const c = { ...comp };
                delete c.id;
                if (!c._id) delete c._id;
                return c;
            });
    }

    return clean;
};

export async function GET() {
    try {
        const authInv = await checkPermission("inventory", ACTIONS.VIEW);
        const authOrder = await checkPermission("order", ACTIONS.VIEW);
        const authProcess = await checkPermission("process", ACTIONS.VIEW);

        if (!authInv.authorized && !authOrder.authorized && !authProcess.authorized) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await dbConnect();
        const boms = await BOM.find({}).sort({ createdAt: -1 });
        return NextResponse.json(boms, { status: 200 });
    } catch (error) {
        console.error("GET BOMs error:", error);
        return NextResponse.json({ error: "Failed to fetch BOMs" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const auth = await checkPermission("inventory", ACTIONS.ADD);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const rawBody = await req.json();
        const body = sanitizeBomPayload(rawBody);

        const existingBom = await BOM.findOne({
            finishedItemCode: { $regex: new RegExp(`^${body.finishedItemCode.trim()}$`, "i") }
        });

        if (existingBom) {
            return NextResponse.json(
                { error: "A BOM for this Rudra Code already exists." },
                { status: 400 }
            );
        }

        const newBom = await BOM.create(body);
        return NextResponse.json(newBom, { status: 201 });
    } catch (error) {
        console.error("POST BOM error:", error);
        return NextResponse.json({ error: error.message || "Failed to create BOM" }, { status: 500 });
    }
}