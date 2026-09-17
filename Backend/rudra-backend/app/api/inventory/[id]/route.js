import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import InventoryGroup from "../../../../models/Inventory";
import { checkPermission, ACTIONS } from "../../../../lib/auth";

export async function PUT(req, { params }) {
    try {
        const auth = await checkPermission('inventory', ACTIONS.EDIT);
        if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

        await dbConnect();
        const { id } = params;
        const body = await req.json();

        // Updates the group and completely replaces the subItems array with the new one from the frontend
        const updatedGroup = await InventoryGroup.findByIdAndUpdate(id, body, { new: true });

        if (!updatedGroup) {
            return NextResponse.json({ error: "Inventory group not found" }, { status: 404 });
        }

        return NextResponse.json(updatedGroup, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update inventory" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const auth = await checkPermission('inventory', ACTIONS.DELETE);
        if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

        await dbConnect();
        const { id } = params;

        const deletedGroup = await InventoryGroup.findByIdAndDelete(id);

        if (!deletedGroup) {
            return NextResponse.json({ error: "Inventory group not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Inventory group deleted" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete inventory group" }, { status: 500 });
    }
}