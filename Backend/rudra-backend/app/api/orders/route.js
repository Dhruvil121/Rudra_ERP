import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import Order from "../../models/Order"
import { checkPermission, ACTIONS } from "../../../lib/auth"

export async function GET(req) {
    try {
        const auth = await checkPermission('order', ACTIONS.VIEW);
        if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

        await dbConnect();
        const orders = await Order.find({}).sort({ createdAt: -1 });
        return NextResponse.json(orders, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const auth = await checkPermission('order', ACTIONS.ADD);
        if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

        await dbConnect();
        const body = await req.json();

        // Auto-generate PI Number if not provided
        if (!body.piNo) {
            const count = await Order.countDocuments();
            body.piNo = `PI-${1000 + count + 1}`;
        }

        const newOrder = await Order.create(body);
        return NextResponse.json(newOrder, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }
}