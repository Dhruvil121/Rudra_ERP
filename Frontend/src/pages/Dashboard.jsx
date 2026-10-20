import { useState } from 'react';
import {
    Users, ShoppingCart, Package, Activity, Loader2, ArrowRight,
    LayoutDashboard, FileJson, AlertTriangle, IndianRupee, RefreshCw, Search
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboardData';
import { useOrders } from '../hooks/useOrderData';
import { useCustomerList } from '../hooks/useCustomerData';
import { useInventory } from '../hooks/useInventoryData';
import { useBOMs } from '../hooks/useBOMMasterData';

export default function DashboardModule({ onNavigate }) {
    const [activeTab, setActiveTab] = useState('orders');
    const [searchTerm, setSearchTerm] = useState('');

    const { data, isLoading, isError, refetch, isFetching } = useDashboard();
    const { data: liveOrders } = useOrders();
    const { data: liveCustomers } = useCustomerList();
    const { data: liveInventory } = useInventory();
    const { data: liveBOMs } = useBOMs();

    if (isLoading) {
        return (
            <div className="w-full">
                <div className="flex justify-center p-12 max-w-7xl mx-auto">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="w-full">
                <div className="max-w-7xl mx-auto p-6 text-red-500 bg-red-50 rounded-xl border border-red-200">
                    Failed to load dashboard metrics.
                </div>
            </div>
        );
    }

    const apiMetrics = data?.metrics || {};

    const totalCustomers = liveCustomers?.length ?? apiMetrics.customers ?? 0;
    const totalOrders = liveOrders?.length ?? apiMetrics.totalOrders ?? 0;
    const pendingOrders = liveOrders
        ? liveOrders.filter(o => o.status === 'Pending').length
        : (apiMetrics.pendingOrders ?? 0);
    const activeProcesses = apiMetrics.activeProcesses ?? 0;
    const totalBOMs = liveBOMs?.length ?? apiMetrics.bomCount ?? 0;
    const inventoryGroupsCount = liveInventory?.length ?? apiMetrics.inventoryGroups ?? 0;

    let liveValuation = apiMetrics.totalInventoryValuation ?? 0;
    let lowStockList = data?.lowStockItems || [];

    if (liveInventory && liveInventory.length > 0) {
        liveValuation = 0;
        const computedLow = [];
        liveInventory.forEach(group => {
            (group.subItems || []).forEach(sub => {
                const stock = Number(sub.stock || 0);
                const cost = Number(sub.unitCost || 0);
                liveValuation += stock * cost;
                if (stock <= 10) {
                    computedLow.push({
                        _id: sub._id || sub.itemCode,
                        itemCode: sub.itemCode,
                        name: sub.name,
                        category: sub.category,
                        stock,
                        uom: sub.uom,
                        groupName: group.groupName
                    });
                }
            });
        });
        lowStockList = computedLow;
    }

    const recentOrders = ((liveOrders ? liveOrders.slice(0, 8) : data?.recentOrders) || []).filter(
        o =>
            !searchTerm ||
            o.piNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.partyCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredLowStock = lowStockList.filter(
        item =>
            !searchTerm ||
            item.itemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="w-full">
            <div className="space-y-4 max-w-7xl mx-auto">
                {/* Top Header — Matches BOM Layout */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                            <LayoutDashboard className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Overview & Factory Metrics</h1>
                            <p className="text-sm text-slate-500">
                                Live Orders, BOM Recipes, Active Manufacturing & Inventory Valuation
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                        Refresh Metrics
                    </button>
                </div>

                {/* KPI Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <KpiCard
                        title="Total Customers"
                        value={totalCustomers}
                        subtitle="Registered Clients"
                        icon={<Users className="w-5 h-5 text-blue-600" />}
                        bgColor="bg-blue-50"
                        onClick={() => onNavigate && onNavigate('customer')}
                    />
                    <KpiCard
                        title="Pending Orders (PI)"
                        value={pendingOrders}
                        subtitle={`${totalOrders} Total Orders`}
                        icon={<ShoppingCart className="w-5 h-5 text-orange-600" />}
                        bgColor="bg-orange-50"
                        onClick={() => onNavigate && onNavigate('order')}
                    />
                    <KpiCard
                        title="Active Manufacturing"
                        value={activeProcesses}
                        subtitle="In Process Flow"
                        icon={<Activity className="w-5 h-5 text-green-600" />}
                        bgColor="bg-green-50"
                        onClick={() => onNavigate && onNavigate('process')}
                    />
                    <KpiCard
                        title="Inventory Valuation"
                        value={`₹${liveValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                        subtitle={`${inventoryGroupsCount} Inventory Groups`}
                        icon={<IndianRupee className="w-5 h-5 text-indigo-600" />}
                        bgColor="bg-indigo-50"
                        onClick={() => onNavigate && onNavigate('inventory')}
                    />
                    <KpiCard
                        title="Master BOM Recipes"
                        value={totalBOMs}
                        subtitle="Active Product Recipes"
                        icon={<FileJson className="w-5 h-5 text-purple-600" />}
                        bgColor="bg-purple-50"
                        onClick={() => onNavigate && onNavigate('bom')}
                    />
                    <KpiCard
                        title="Low Stock Alerts"
                        value={lowStockList.length}
                        subtitle="Items ≤ 10 Stock"
                        icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
                        bgColor="bg-red-50"
                        onClick={() => setActiveTab('stock')}
                    />
                </div>

                {/* Full-Width White Search & Tabs Bar — Matches BOM Layout */}
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-4">
                    <div className="relative w-80">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder={
                                activeTab === 'orders'
                                    ? 'Search PI No, Party Code, or Customer...'
                                    : 'Search Low Stock SKU or Material Name...'
                            }
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                            <button
                                onClick={() => setActiveTab('orders')}
                                className={`px-4 py-1.5 rounded-md font-semibold text-xs transition-all ${activeTab === 'orders'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Recent Orders ({recentOrders.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('stock')}
                                className={`px-4 py-1.5 rounded-md font-semibold text-xs transition-all ${activeTab === 'stock'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Low Stock Alerts ({filteredLowStock.length})
                            </button>
                        </div>

                        {onNavigate && (
                            <button
                                onClick={() => onNavigate(activeTab === 'orders' ? 'order' : 'inventory')}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 px-3 py-2"
                            >
                                View All <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Full-Width Table — Matches BOM Layout */}
                {activeTab === 'orders' ? (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="p-4">PI No.</th>
                                    <th className="p-4">Party Code</th>
                                    <th className="p-4">Customer Name</th>
                                    <th className="p-4">Rudra Code(s)</th>
                                    <th className="p-4 text-center">Total Qty</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentOrders.map((order) => {
                                    const totalQty = (order.items || []).reduce(
                                        (sum, item) => sum + Number(item.qty || 0),
                                        0
                                    );
                                    const codes = (order.items || [])
                                        .map(i => i.rudraCode)
                                        .filter(Boolean)
                                        .join(', ');

                                    return (
                                        <tr key={order._id} className="hover:bg-slate-50">
                                            <td className="p-4 font-bold text-indigo-600">{order.piNo || 'N/A'}</td>
                                            <td className="p-4 text-xs font-bold text-slate-600">{order.partyCode || '-'}</td>
                                            <td className="p-4 text-sm font-semibold text-slate-800">{order.name}</td>
                                            <td className="p-4 text-sm font-bold text-blue-600">{codes || '-'}</td>
                                            <td className="p-4 text-center">
                                                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">
                                                    {totalQty} Sets
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-slate-600">
                                                {order.date
                                                    ? new Date(order.date).toLocaleDateString('en-IN', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })
                                                    : '-'}
                                            </td>
                                            <td className="p-4">
                                                <span
                                                    className={`px-2 py-1 text-xs font-bold rounded-full uppercase ${order.status === 'Approved'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-orange-100 text-orange-700'
                                                        }`}
                                                >
                                                    {order.status || 'Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {recentOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-slate-400">
                                            No recent orders found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="p-4">SKU / Code</th>
                                    <th className="p-4">Material Name</th>
                                    <th className="p-4">Inventory Group</th>
                                    <th className="p-4 text-center">Category</th>
                                    <th className="p-4 text-right">Available Stock</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredLowStock.map((item) => (
                                    <tr key={item._id} className="hover:bg-slate-50">
                                        <td className="p-4 font-bold text-indigo-600">{item.itemCode}</td>
                                        <td className="p-4 text-sm font-semibold text-slate-800">{item.name}</td>
                                        <td className="p-4 text-sm text-slate-600">{item.groupName}</td>
                                        <td className="p-4 text-center">
                                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                                                {item.stock} {item.uom}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {filteredLowStock.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-400">
                                            All inventory items are well stocked (above 10 units).
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

const KpiCard = ({ title, value, subtitle, icon, bgColor, onClick }) => (
    <div
        onClick={onClick}
        className={`bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all ${onClick ? 'cursor-pointer hover:border-indigo-300 hover:shadow-md' : ''
            }`}
    >
        <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center shrink-0`}>
            {icon}
        </div>
        <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{title}</h3>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-800 truncate">{value}</span>
                {subtitle && <span className="text-xs text-slate-500 font-medium truncate">{subtitle}</span>}
            </div>
        </div>
    </div>
);  