import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import Customer from "../../models/Customer";
import Order from "../../models/Order";
import ProcessSequence from "../../models/ProcessSequence";
import InventoryGroup from "../../models/Inventory";
import BOM from "../../models/BOM";
import { requireAuth } from "../../../lib/auth";

export async function GET() {
    try {
        const auth = await requireAuth();
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();

        const [
            customerCount,
            orderCount,
            pendingOrders,
            approvedOrders,
            activeProcesses,
            bomCount,
            inventoryGroups,
            recentOrders,
            recentProcesses
        ] = await Promise.all([
            Customer.countDocuments(),
            Order.countDocuments(),
            Order.countDocuments({ status: "Pending" }),
            Order.countDocuments({ status: "Approved" }),
            ProcessSequence.countDocuments({ status: "In Progress" }),
            BOM.countDocuments({ isActive: true }),
            InventoryGroup.find({}).select("groupId groupName subItems"),
            Order.find({})
                .sort({ createdAt: -1 })
                .limit(6)
                .select("piNo partyCode name brandName city date status items createdAt"),
            ProcessSequence.find({})
                .sort({ updatedAt: -1 })
                .limit(5)
                .select("orderId steps status updatedAt")
        ]);

        // Calculate live Inventory Valuation (₹), Total SKUs, and Low Stock Alerts
        let totalInventoryValuation = 0;
        let totalInventorySkus = 0;
        const lowStockItems = [];

        inventoryGroups.forEach((group) => {
            (group.subItems || []).forEach((item) => {
                totalInventorySkus += 1;
                const stock = Number(item.stock || 0);
                const cost = Number(item.unitCost || 0);
                totalInventoryValuation += stock * cost;

                if (stock <= 10) {
                    lowStockItems.push({
                        _id: item._id,
                        itemCode: item.itemCode,
                        name: item.name,
                        category: item.category,
                        stock,
                        uom: item.uom,
                        groupName: group.groupName
                    });
                }
            });
        });

        return NextResponse.json(
            {
                metrics: {
                    customers: customerCount,
                    totalOrders: orderCount,
                    pendingOrders,
                    approvedOrders,
                    activeProcesses,
                    bomCount,
                    inventoryGroups: inventoryGroups.length,
                    totalInventorySkus,
                    totalInventoryValuation,
                    lowStockCount: lowStockItems.length
                },
                recentOrders,
                lowStockItems: lowStockItems.slice(0, 6),
                recentProcesses
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Dashboard error:", error);
        return NextResponse.json(
            { error: "Failed to load dashboard metrics" },
            { status: 500 }
        );
    }
}