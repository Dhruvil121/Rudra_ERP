import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import Customer from "../../models/Customer";
import { checkPermission, ACTIONS } from "../../../lib/auth";

export async function GET(req) {
    try {
        const auth = await checkPermission('customer', ACTIONS.VIEW);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const customers = await Customer.find({}).sort({ createdAt: -1 });

        return NextResponse.json(customers, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const auth = await checkPermission('customer', ACTIONS.ADD);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const body = await req.json();

        const newCustomer = await Customer.create(body);
        return NextResponse.json(newCustomer, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
    }
}