import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import Customer from "../../models/Customer";
import { checkPermission, ACTIONS } from "../../../lib/auth";

export async function GET(req) {
    try {
        let auth = await checkPermission('customer', ACTIONS.VIEW);
        if (!auth.authorized) {
            auth = await checkPermission('order', ACTIONS.VIEW);
        }
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
        let auth = await checkPermission('customer', ACTIONS.ADD);
        if (!auth.authorized) {
            // Allow quick-creating a customer while creating an Order
            auth = await checkPermission('order', ACTIONS.ADD);
        }
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const body = await req.json();

        // Auto-generate Party Code if not provided
        if (!body.partyCode || !body.partyCode.trim()) {
            const count = await Customer.countDocuments();
            body.partyCode = `PC-${(count + 1).toString().padStart(3, '0')}`;
        } else {
            body.partyCode = body.partyCode.trim().toUpperCase();
        }

        if (!body.group) body.group = 'sundry_debtors';

        const existing = await Customer.findOne({
            partyCode: { $regex: new RegExp(`^${body.partyCode}$`, 'i') }
        });
        if (existing) {
            return NextResponse.json({ error: `Party Code "${body.partyCode}" already exists.` }, { status: 400 });
        }

        const newCustomer = await Customer.create(body);
        return NextResponse.json(newCustomer, { status: 201 });
    } catch (error) {
        console.error("Create customer error:", error);
        return NextResponse.json({ error: error.message || "Failed to create customer" }, { status: 500 });
    }
}