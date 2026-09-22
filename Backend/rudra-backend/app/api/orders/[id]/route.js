import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import Order from "../../../models/Order";
import { checkPermission, ACTIONS } from "../../../../lib/auth";

// GET: Fetch a single order by ID
export async function GET(req, { params }) {
    try {
        // Allow access with either order.view or process.view
        let auth = await checkPermission('order', ACTIONS.VIEW);
        if (!auth.authorized) {
            auth = await checkPermission('process', ACTIONS.VIEW);
        }
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const { id } = await params;
        const order = await Order.findById(id);

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        return NextResponse.json(order, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
    }
}

// PUT: Update an order
export async function PUT(req, { params }) {
    try {
        const auth = await checkPermission('order', ACTIONS.EDIT);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const { id } = await params;
        const body = await req.json();

        const updatedOrder = await Order.findByIdAndUpdate(id, body, { new: true });

        if (!updatedOrder) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        return NextResponse.json(updatedOrder, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }
}

// DELETE: Remove an order
export async function DELETE(req, { params }) {
    try {
        const auth = await checkPermission('order', ACTIONS.DELETE);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const { id } = await params;

        const deletedOrder = await Order.findByIdAndDelete(id);

        if (!deletedOrder) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Order deleted successfully" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
    }
}
