import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import Customer from "../../../models/Customer";
import { checkPermission, ACTIONS } from "../../../../lib/auth";

// GET: Fetch a single customer by ID
export async function GET(req, { params }) {
    try {
        const auth = await checkPermission('customer', ACTIONS.VIEW);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const { id } = await params;
        const customer = await Customer.findById(id);

        if (!customer) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        return NextResponse.json(customer, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
    }
}

// PUT: Update a customer
export async function PUT(req, { params }) {
    try {
        const auth = await checkPermission('customer', ACTIONS.EDIT);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const { id } = await params;
        const body = await req.json();

        const updatedCustomer = await Customer.findByIdAndUpdate(id, body, { new: true });

        if (!updatedCustomer) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        return NextResponse.json(updatedCustomer, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
    }
}

// DELETE: Remove a customer
export async function DELETE(req, { params }) {
    try {
        const auth = await checkPermission('customer', ACTIONS.DELETE);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const { id } = await params;

        const deletedCustomer = await Customer.findByIdAndDelete(id);

        if (!deletedCustomer) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Customer deleted successfully" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
    }
}
