import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import InventoryGroup from "../../models/Inventory";
import { checkPermission, ACTIONS } from "../../../lib/auth";

// GET: List all inventory groups with sub-items
export async function GET(req) {
    try {
        const auth = await checkPermission('inventory', ACTIONS.VIEW);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const groups = await InventoryGroup.find({}).sort({ createdAt: -1 });

        // Map to frontend-expected format with groupId
        const result = groups.map(g => ({
            groupId: g._id.toString(),
            groupName: g.groupName,
            details: g.details,
            stockGv: g.stockGv,
            subItems: g.subItems.map(item => ({
                id: item._id.toString(),
                name: item.name,
                details: item.details,
                stock: item.stock,
            })),
        }));

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
    }
}

// POST: Create a new inventory group
export async function POST(req) {
    try {
        const auth = await checkPermission('inventory', ACTIONS.ADD);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const body = await req.json();

        const newGroup = await InventoryGroup.create(body);
        return NextResponse.json(newGroup, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create inventory group" }, { status: 500 });
    }
}
