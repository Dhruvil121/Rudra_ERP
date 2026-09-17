import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import InventoryGroup from "../../models/Inventory"
import { checkPermission, ACTIONS } from "../../../lib/auth";

export async function GET(req) {
    try {
        const auth = await checkPermission('inventory', ACTIONS.VIEW);
        if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

        await dbConnect();
        const inventory = await InventoryGroup.find({}).sort({ createdAt: -1 });
        return NextResponse.json(inventory, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const auth = await checkPermission('inventory', ACTIONS.ADD);
        if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

        await dbConnect();
        const body = await req.json();

        // Auto-generate Group ID if missing or empty
        if (!body.groupId) {
            const count = await InventoryGroup.countDocuments();
            body.groupId = `G-${(count + 1).toString().padStart(3, '0')}`;
        }

        // Remove empty _id to prevent MongoDB CastError
        if (!body._id) delete body._id;

        // Clean up subItems
        if (body.subItems && Array.isArray(body.subItems)) {
            body.subItems = body.subItems.map(item => {
                const cleanItem = { ...item };
                if (!cleanItem._id) delete cleanItem._id;
                delete cleanItem.id; // Remove frontend-only UUIDs
                return cleanItem;
            });
        }

        const newGroup = await InventoryGroup.create(body);
        return NextResponse.json(newGroup, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create inventory group" }, { status: 500 });
    }
}