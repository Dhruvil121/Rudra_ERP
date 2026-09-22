import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import Customer from "../../models/Customer";
import Order from "../../models/Order";
import ProcessSequence from "../../models/ProcessSequence";
import InventoryGroup from "../../models/Inventory";
import { requireAuth } from "../../../lib/auth";

export async function GET(req) {
    try {
        // Dashboard is accessible to any authenticated user — it's the universal landing page
        const auth = await requireAuth();
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();

        // Execute all count queries in parallel for maximum performance
        const [customerCount, orderCount, pendingOrders, inventoryGroups, activeProcesses] = await Promise.all([
            Customer.countDocuments(),
            Order.countDocuments(),
            Order.countDocuments({ status: 'Pending' }),
            InventoryGroup.countDocuments(),
            ProcessSequence.countDocuments({ status: 'In Progress' })
        ]);

        // Fetch only the 5 most recent orders for the activity feed
        const recentOrders = await Order.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .select('piNo name date status');

        return NextResponse.json({
            metrics: {
                customers: customerCount,
                totalOrders: orderCount,
                pendingOrders,
                inventoryGroups,
                activeProcesses
            },
            recentOrders
        }, { status: 200 });

    } catch (error) {
        console.error("Dashboard error:", error);
        return NextResponse.json({ error: "Failed to load dashboard metrics" }, { status: 500 });
    }
}