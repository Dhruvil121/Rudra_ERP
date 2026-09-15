import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import Order from "../../models/Order";
import { checkPermission, ACTIONS } from "../../../lib/auth";

// GET: List all orders
export async function GET(req) {
    try {
        const auth = await checkPermission('order', ACTIONS.VIEW);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();

        // Support searching by code via query params
        const { searchParams } = new URL(req.url);
        const code = searchParams.get('code');

        if (code) {
            const order = await Order.findOne({ code: code.trim().toUpperCase() });
            if (!order) {
                return NextResponse.json({ error: "No Order/PI found with this code" }, { status: 404 });
            }
            return NextResponse.json(order, { status: 200 });
        }

        const orders = await Order.find({}).sort({ createdAt: -1 });
        return NextResponse.json(orders, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }
}

// POST: Create a new order
export async function POST(req) {
    try {
        const auth = await checkPermission('order', ACTIONS.ADD);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const body = await req.json();

        const newOrder = await Order.create(body);
        return NextResponse.json(newOrder, { status: 201 });
    } catch (error) {
        console.error("Create order error:", error);
        return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }
}
