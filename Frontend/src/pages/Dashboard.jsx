import { Users, ShoppingCart, Package, Activity, Loader2, ArrowRight } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboardData';

export default function DashboardModule({ onNavigate }) {
    const { data, isLoading, isError } = useDashboard();

    if (isLoading) {
        return <div className="flex justify-center p-24"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    }

    if (isError) {
        return <div className="p-6 text-red-500 bg-red-50 rounded-xl">Failed to load dashboard metrics.</div>;
    }

    const { metrics, recentOrders } = data;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="pb-4 border-b border-slate-200">
                <h1 className="text-2xl font-bold text-slate-800">Overview</h1>
                <p className="text-sm text-slate-500">System metrics and recent activity</p>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard
                    title="Total Customers"
                    value={metrics.customers}
                    icon={<Users className="w-6 h-6 text-blue-600" />}
                    bgColor="bg-blue-50"
                />
                <KpiCard
                    title="Pending Orders"
                    value={metrics.pendingOrders}
                    subtitle={`${metrics.totalOrders} Total Orders`}
                    icon={<ShoppingCart className="w-6 h-6 text-orange-600" />}
                    bgColor="bg-orange-50"
                />
                <KpiCard
                    title="Active Manufacturing"
                    value={metrics.activeProcesses}
                    icon={<Activity className="w-6 h-6 text-green-600" />}
                    bgColor="bg-green-50"
                />
                <KpiCard
                    title="Inventory Groups"
                    value={metrics.inventoryGroups}
                    icon={<Package className="w-6 h-6 text-indigo-600" />}
                    bgColor="bg-indigo-50"
                />
            </div>

            {/* Recent Activity Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="font-bold text-slate-700">Recent Orders (PI)</h2>
                    <button
                        onClick={() => onNavigate && onNavigate('order')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                        View All <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <th className="p-4">PI No.</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Customer</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {recentOrders.map((order) => (
                                <tr key={order._id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-semibold text-blue-600 text-sm">{order.piNo || 'N/A'}</td>
                                    <td className="p-4 text-sm text-slate-600">
                                        {order.date ? new Date(order.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                    </td>
                                    <td className="p-4 text-sm font-medium text-slate-800">{order.name}</td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-sm uppercase tracking-wide">
                                            {order.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {recentOrders.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-sm text-slate-400">No recent orders found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const KpiCard = ({ title, value, subtitle, icon, bgColor }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className={`w-14 h-14 rounded-full ${bgColor} flex items-center justify-center shrink-0`}>
            {icon}
        </div>
        <div>
            <h3 className="text-sm font-medium text-slate-500 mb-1">{title}</h3>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-800">{value}</span>
                {subtitle && <span className="text-xs text-slate-400 font-medium">{subtitle}</span>}
            </div>
        </div>
    </div>
);