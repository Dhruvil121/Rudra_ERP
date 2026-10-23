import { useState, useMemo } from 'react';
import {
    Search, Plus, Edit2, Trash2, ArrowLeft, Check, X, Printer,
    CheckCircle, Package, Loader2, Factory, Building2, AlertTriangle, Copy, Zap
} from 'lucide-react';
import { PermissionGuard } from '../components/auth/PermissionGuard';
import { ACTIONS } from '../context/AuthContext';
import { useOrders, useSaveOrder } from '../hooks/useOrderData';
import { useCalculateOrderBOM } from '../hooks/useBOMData';
import { useBOMs } from '../hooks/useBOMMasterData';
import { useInventory, useQuickAddInventoryItem } from '../hooks/useInventoryData';
import { useCustomerList, useCreateCustomer } from '../hooks/useCustomerData';
import { useFeedback } from '../context/FeedbackContext';

export default function OrderModule() {
    const [view, setView] = useState('list');
    const [selectedOrder, setSelectedOrder] = useState(null);

    const { data: orders = [], isLoading } = useOrders();
    const saveMutation = useSaveOrder();

    const handleNavigate = (newView, order = null) => {
        setSelectedOrder(order);
        setView(newView);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="w-full">
            {view === 'list' && <OrderList orders={orders} onNavigate={handleNavigate} />}
            {view === 'detail' && (
                <OrderDetail
                    order={selectedOrder}
                    onNavigate={handleNavigate}
                    onApprove={saveMutation.mutateAsync}
                    isApproving={saveMutation.isPending}
                />
            )}
            {view === 'form' && (
                <OrderForm
                    order={selectedOrder}
                    orders={orders}
                    onNavigate={handleNavigate}
                    onSave={saveMutation.mutateAsync}
                />
            )}
        </div>
    );
}

const formatDisplayDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return dateString;
    }
};

const PRIORITY_STYLES = {
    urgent: { row: 'border-l-4 border-red-500 bg-red-50/30', badge: 'bg-red-100 text-red-700', label: 'URGENT' },
    mixed: { row: 'border-l-4 border-amber-400 bg-amber-50/20', badge: 'bg-amber-100 text-amber-700', label: 'MIXED (URGENT SPLIT)' },
    normal: { row: '', badge: '', label: '' },
};

const STATUS_STYLES = {
    Pending: 'bg-yellow-100 text-yellow-700',
    Approved: 'bg-green-100 text-green-700',
    Dispatched: 'bg-blue-100 text-blue-700',
};

// ==========================================
// 1. LIST VIEW (With Urgent Stack Counter & Color Hierarchy)
// ==========================================
function OrderList({ orders, onNavigate }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [priorityFilter, setPriorityFilter] = useState('All Priority');

    // Calculate Urgent Stack vs Normal Pieces across active orders
    const urgentStats = useMemo(() => {
        let urgentOrdersCount = 0;
        let urgentPcs = 0;
        let normalPcs = 0;

        (orders || []).forEach(o => {
            if (o.status === 'Dispatched') return;
            if (o.orderPriority === 'urgent' || o.orderPriority === 'mixed') {
                urgentOrdersCount++;
            }
            (o.items || []).forEach(i => {
                const q = Number(i.qty || 0);
                if (i.priority === 'urgent') urgentPcs += q;
                else normalPcs += q;
            });
        });

        return { urgentOrdersCount, urgentPcs, normalPcs };
    }, [orders]);

    const filteredOrders = orders
        ?.filter(order => {
            const term = searchTerm.toLowerCase();
            const matchesSearch =
                !searchTerm ||
                order.piNo?.toLowerCase().includes(term) ||
                order.name?.toLowerCase().includes(term) ||
                order.partyCode?.toLowerCase().includes(term) ||
                order.items?.some(i => i.rudraCode?.toLowerCase().includes(term));
            const matchesStatus = statusFilter === 'All Status' || order.status === statusFilter;
            const matchesPriority =
                priorityFilter === 'All Priority' ||
                (priorityFilter === 'Urgent Stack'
                    ? order.orderPriority === 'urgent' || order.orderPriority === 'mixed'
                    : order.orderPriority === priorityFilter.toLowerCase());
            return matchesSearch && matchesStatus && matchesPriority;
        })
        ?.sort((a, b) => {
            const priorityOrder = { urgent: 0, mixed: 1, normal: 2 };
            return (priorityOrder[a.orderPriority] ?? 2) - (priorityOrder[b.orderPriority] ?? 2);
        });

    return (
        <div className="space-y-4 max-w-7xl mx-auto pb-12">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Orders (PI)</h1>
                    <p className="text-sm text-slate-500">
                        Proforma Invoices & Urgent Dispatch Stack <span className="text-slate-400 ml-1">{orders.length} total</span>
                    </p>
                </div>
                <PermissionGuard module="order" action={ACTIONS.ADD}>
                    <button
                        onClick={() => onNavigate('form')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> New Order (PI)
                    </button>
                </PermissionGuard>
            </div>

            {/* Urgent Stack Banner (Problem 1: Shows Urgent Required Pcs vs Normal Pcs) */}
            {urgentStats.urgentPcs > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-600 text-white rounded-lg animate-pulse">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-red-800 uppercase tracking-wider">
                                🔴 Urgent Priority Stack ("Pehla Maal" Requirements)
                            </h3>
                            <p className="text-xs text-red-700 font-medium">
                                <strong>{urgentStats.urgentPcs} Pieces</strong> required urgently across{' '}
                                <strong>{urgentStats.urgentOrdersCount} active order(s)</strong> • Remaining Normal Queue:{' '}
                                <strong>{urgentStats.normalPcs} Pieces</strong>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() =>
                            setPriorityFilter(
                                priorityFilter === 'Urgent Stack' ? 'All Priority' : 'Urgent Stack'
                            )
                        }
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${priorityFilter === 'Urgent Stack'
                                ? 'bg-red-700 text-white'
                                : 'bg-white text-red-700 border border-red-300 hover:bg-red-100'
                            }`}
                    >
                        {priorityFilter === 'Urgent Stack' ? 'Show All Orders' : 'Filter Urgent Stack Only'}
                    </button>
                </div>
            )}

            <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    <div className="relative w-72">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search PI No, Party Code, Rudra Code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <select
                        className="py-1.5 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option>All Status</option>
                        <option>Pending</option>
                        <option>Approved</option>
                        <option>Dispatched</option>
                    </select>
                    <select
                        className="py-1.5 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                    >
                        <option>All Priority</option>
                        <option>Urgent Stack</option>
                        <option>Urgent</option>
                        <option>Mixed</option>
                        <option>Normal</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="p-4 w-8"></th>
                            <th className="p-4">PI No.</th>
                            <th className="p-4">Party Code</th>
                            <th className="p-4">Customer Name</th>
                            <th className="p-4">Products & Sizes</th>
                            <th className="p-4 text-center">Urgent / Normal Breakdown</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredOrders?.map((order) => {
                            const pStyle = PRIORITY_STYLES[order.orderPriority] || PRIORITY_STYLES.normal;
                            const urgentQty = (order.items || [])
                                .filter(i => i.priority === 'urgent')
                                .reduce((a, i) => a + Number(i.qty || 0), 0);
                            const normalQty = (order.items || [])
                                .filter(i => i.priority !== 'urgent')
                                .reduce((a, i) => a + Number(i.qty || 0), 0);

                            return (
                                <tr
                                    key={order._id}
                                    onClick={() => onNavigate('detail', order)}
                                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${pStyle.row}`}
                                >
                                    <td className="p-4 text-center">
                                        {order.orderPriority === 'urgent' && <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />}
                                        {order.orderPriority === 'mixed' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                                    </td>
                                    <td className="p-4 font-bold text-blue-600">{order.piNo || 'N/A'}</td>
                                    <td className="p-4 text-xs font-bold text-indigo-600">{order.partyCode || '-'}</td>
                                    <td className="p-4 text-sm font-semibold text-slate-800">{order.name}</td>
                                    <td className="p-4 text-xs font-semibold text-slate-600">
                                        {(order.items || [])
                                            .map(i => `${i.rudraCode}${i.size ? ` (${i.size})` : ''}`)
                                            .filter(Boolean)
                                            .join(', ') || '-'}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                            {urgentQty > 0 && (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                                                    🔴 {urgentQty} Urgent
                                                </span>
                                            )}
                                            {normalQty > 0 && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                                                    {normalQty} Normal
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">{formatDisplayDate(order.date)}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${STATUS_STYLES[order.status] || 'bg-yellow-100 text-yellow-700'}`}>
                                                {order.status}
                                            </span>
                                            {pStyle.label && (
                                                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide ${pStyle.badge}`}>
                                                    {pStyle.label}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredOrders?.length === 0 && (
                            <tr>
                                <td colSpan={8} className="p-12 text-center text-slate-400">
                                    No orders match your filter criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ==========================================
// 2. DETAIL VIEW (With Urgent Split Banner & Split BOM Breakdown)
// ==========================================
function OrderDetail({ order, onNavigate, onApprove, isApproving }) {
    const { showConfirm, showToast } = useFeedback();
    const [showBOM, setShowBOM] = useState(true);
    const { data: bomData, isLoading: isBomLoading } = useCalculateOrderBOM(order);

    if (!order) return null;

    const handleApprove = async () => {
        const isConfirmed = await showConfirm({
            title: 'Approve Order',
            message: 'Are you sure you want to approve this order?',
            type: 'info',
            confirmText: 'Approve'
        });

        if (isConfirmed) {
            try {
                await onApprove({ ...order, status: 'Approved' });
                showToast('Order Approved Successfully', 'success');
                onNavigate('list');
            } catch {
                showToast('Failed to approve order', 'error');
            }
        }
    };

    const inHouseParts = bomData?.inHouseParts || [];
    const afterMarketItems = bomData?.afterMarketItems || [];

    return (
        <div className="space-y-4 max-w-6xl mx-auto pb-12">
            <div className="flex justify-between items-center bg-white px-4 py-3 rounded-t-md border-b border-slate-200">
                <div className="flex items-center gap-2 text-sm">
                    <button onClick={() => onNavigate('list')} className="text-slate-400 hover:text-slate-600">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="text-slate-400 cursor-pointer" onClick={() => onNavigate('list')}>Orders</span>
                    <span className="text-slate-300">›</span>
                    <span className="font-semibold text-slate-800">{order.piNo}</span>
                </div>

                <div className="flex items-center gap-2">
                    <PermissionGuard module="order" action={ACTIONS.PRINT}>
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-sm hover:bg-slate-200"
                        >
                            <Printer className="w-3.5 h-3.5" /> Print
                        </button>
                    </PermissionGuard>

                    <button
                        onClick={() => setShowBOM(!showBOM)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${showBOM ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                            }`}
                    >
                        <Package className="w-3.5 h-3.5" /> {showBOM ? 'Hide Split BOM' : 'View Split BOM'}
                    </button>

                    <PermissionGuard module="order" action={ACTIONS.APPROVE}>
                        {order.status === 'Pending' && (
                            <button
                                onClick={handleApprove}
                                disabled={isApproving}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-sm hover:bg-green-200 disabled:opacity-50"
                            >
                                {isApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                {isApproving ? 'Approving...' : 'Approve'}
                            </button>
                        )}
                    </PermissionGuard>

                    <PermissionGuard module="order" action={ACTIONS.EDIT}>
                        <button
                            onClick={() => onNavigate('form', order)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white text-sm font-medium rounded-sm hover:bg-slate-700"
                        >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                    </PermissionGuard>
                </div>
            </div>

            {order.orderPriority && order.orderPriority !== 'normal' && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${order.orderPriority === 'urgent'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}>
                    <AlertTriangle className={`w-5 h-5 shrink-0 ${order.orderPriority === 'urgent' ? 'text-red-500 animate-pulse' : 'text-amber-500'
                        }`} />
                    <div>
                        <span className={`text-sm font-bold ${order.orderPriority === 'urgent' ? 'text-red-700' : 'text-amber-700'
                            }`}>
                            {order.orderPriority === 'urgent' ? '🔴 URGENT ORDER' : '⚡ PRIORITY SPLIT ORDER (PEHLA MAAL)'}
                        </span>
                        <span className="text-xs text-slate-600 ml-2 font-medium">
                            Urgent Required: {order.items?.filter(i => i.priority === 'urgent').reduce((a, i) => a + Number(i.qty || 0), 0)} Pcs
                            ({order.items?.filter(i => i.priority === 'urgent').length} batch)
                            {order.orderPriority === 'mixed' &&
                                ` • Normal Remaining: ${order.items?.filter(i => i.priority !== 'urgent').reduce((a, i) => a + Number(i.qty || 0), 0)} Pcs`}
                        </span>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-sm border border-slate-200">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Order Information</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                    <InfoRow label="Customer Name" value={order.name} />
                    <InfoRow label="Party Code" value={order.partyCode} />
                    <InfoRow label="Order Date" value={formatDisplayDate(order.date)} />
                    <InfoRow label="Brand Name" value={order.brandName} />
                    <InfoRow label="Box Details" value={order.box} />
                    <InfoRow label="City" value={order.city} />
                </div>
            </div>

            <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Line Items (Urgent & Multi-Size Batches)</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-slate-200 text-xs font-semibold text-slate-500">
                                <th className="p-3 w-12 text-center">#</th>
                                <th className="p-3 w-24">Priority</th>
                                <th className="p-3">Rudra Code</th>
                                <th className="p-3">Party Item Code</th>
                                <th className="p-3">Finishing</th>
                                <th className="p-3">Color</th>
                                <th className="p-3">HSN/SAC</th>
                                <th className="p-3">Size Variant</th>
                                <th className="p-3 text-right">Set (Qty)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {order.items?.map((item, index) => (
                                <tr key={item._id || item.id || index} className={`hover:bg-slate-50 ${item.priority === 'urgent' ? 'bg-red-50/40 border-l-4 border-red-500' : ''}`}>
                                    <td className="p-3 text-center text-slate-400 text-sm">{index + 1}</td>
                                    <td className="p-3">
                                        {item.priority === 'urgent' ? (
                                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full uppercase">🔴 Urgent</span>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-semibold rounded-full uppercase">Normal</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-sm font-bold text-indigo-600">{item.rudraCode}</td>
                                    <td className="p-3 text-sm font-semibold text-slate-700">{item.partyCode || '-'}</td>
                                    <td className="p-3 text-sm text-slate-600">{item.finishing}</td>
                                    <td className="p-3 text-sm text-slate-600">{item.color}</td>
                                    <td className="p-3 text-sm text-slate-600">{item.hsnSac}</td>
                                    <td className="p-3 text-sm font-bold text-blue-700">{item.size || '-'}</td>
                                    <td className="p-3 text-sm font-bold text-slate-800 text-right">{item.qty}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showBOM && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white rounded-sm border border-blue-200 overflow-hidden shadow-sm">
                        <div className="px-4 py-3 border-b border-blue-100 bg-blue-50 flex items-center gap-2">
                            <Factory className="w-4 h-4 text-blue-600" />
                            <h2 className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                                1. In-House Factory Parts (Process Module)
                            </h2>
                        </div>
                        <div className="p-4">
                            {isBomLoading ? (
                                <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
                            ) : inHouseParts.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b text-xs font-semibold text-slate-500">
                                            <th className="p-2.5">Field Name (Part)</th>
                                            <th className="p-2.5">Stage</th>
                                            <th className="p-2.5 text-right">Pieces Req.</th>
                                            <th className="p-2.5 text-right">Est. KG</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {inHouseParts.map((part, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2.5 text-sm font-bold text-slate-800">{part.fieldName}</td>
                                                <td className="p-2.5 text-xs text-slate-500">{part.processName}</td>
                                                <td className="p-2.5 text-sm font-bold text-blue-600 text-right">{part.requiredPieces} Pcs</td>
                                                <td className="p-2.5 text-xs font-semibold text-slate-600 text-right">
                                                    {part.totalWeightKg > 0 ? `${part.totalWeightKg} Kg` : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-xs text-slate-400 text-center py-4">No In-House parts configured for this Rudra Code.</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-sm border border-emerald-200 overflow-hidden shadow-sm">
                        <div className="px-4 py-3 border-b border-emerald-100 bg-emerald-50 flex items-center gap-2">
                            <Package className="w-4 h-4 text-emerald-600" />
                            <h2 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                                2. After-Market Requirements (Inventory Module)
                            </h2>
                        </div>
                        <div className="p-4">
                            {isBomLoading ? (
                                <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
                            ) : afterMarketItems.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b text-xs font-semibold text-slate-500">
                                            <th className="p-2.5">Material</th>
                                            <th className="p-2.5 text-right">Req. Qty</th>
                                            <th className="p-2.5 text-right">In Stock</th>
                                            <th className="p-2.5 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {afterMarketItems.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2.5">
                                                    <div className="text-sm font-bold text-slate-800">{item.materialName}</div>
                                                    <div className="text-[11px] text-slate-400">{item.materialCode}</div>
                                                </td>
                                                <td className="p-2.5 text-sm font-bold text-indigo-600 text-right">
                                                    {item.requiredQuantity} {item.unit}
                                                </td>
                                                <td className="p-2.5 text-sm font-semibold text-slate-600 text-right">
                                                    {item.availableStock} {item.unit}
                                                </td>
                                                <td className="p-2.5 text-right">
                                                    {item.shortfall > 0 ? (
                                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                                                            Short: {item.shortfall} {item.unit}
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
                                                            In Stock
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-xs text-slate-400 text-center py-4">No After-Market BOM items found.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const InfoRow = ({ label, value }) => (
    <div className="flex py-2 border-b border-slate-50 last:border-0">
        <div className="w-1/3 text-sm font-medium text-slate-400">{label}</div>
        <div className="w-2/3 text-sm font-semibold text-slate-800">{value || '-'}</div>
    </div>
);

// ==========================================
// 3. FORM VIEW (With 1-Click Urgent Split & + Size Variant Duplicator)
// ==========================================
const INITIAL_ITEM = { id: '', rudraCode: '', partyCode: '', finishing: '', color: '', hsnSac: '', size: '', qty: '', priority: 'normal' };
const generateRowId = () => Math.random().toString(36).substring(2, 10);

function OrderForm({ order, orders = [], onNavigate, onSave }) {
    const isEditing = !!order;
    const { data: customers = [] } = useCustomerList();
    const createCustomerMutation = useCreateCustomer();
    const { data: boms = [] } = useBOMs();
    const { data: inventory = [] } = useInventory();
    const quickAddInventoryMutation = useQuickAddInventoryItem();
    const { showToast } = useFeedback();

    const getSafeInputDate = (dateString) => {
        if (!dateString) return new Date().toISOString().split('T')[0];
        try {
            return new Date(dateString).toISOString().split('T')[0];
        } catch {
            return new Date().toISOString().split('T')[0];
        }
    };

    const [formData, setFormData] = useState(
        order
            ? { ...order, date: getSafeInputDate(order.date) }
            : {
                _id: '',
                piNo: '',
                name: '',
                partyCode: '',
                date: new Date().toISOString().split('T')[0],
                brandName: '',
                box: '',
                city: '',
                remarks: '',
                orderPriority: 'normal',
                items: [{ ...INITIAL_ITEM, id: generateRowId() }]
            }
    );

    // Urgent Split Modal State (e.g., Split 150 pcs into 20 Urgent + 130 Normal)
    const [splitModal, setSplitModal] = useState({
        open: false,
        rowId: null,
        totalQty: 0,
        urgentQty: ''
    });

    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        partyCode: '',
        firmName: '',
        brandName: '',
        defaultBox: '',
        mobileNo: '',
        city: '',
        group: 'sundry_debtors'
    });

    const [productModal, setProductModal] = useState({
        open: false,
        rowId: null,
        rudraCode: '',
        name: '',
        size: '',
        finishing: ''
    });

    const productSuggestions = useMemo(() => {
        const map = new Map();
        boms.forEach(b => {
            map.set(b.finishedItemCode.toUpperCase(), {
                code: b.finishedItemCode.toUpperCase(),
                name: b.productName || 'BOM Recipe',
                size: b.defaultSize || '',
                finishing: b.defaultFinishing || '',
                hsnSac: b.hsnSac || ''
            });
        });
        inventory.forEach(g => {
            (g.subItems || []).forEach(sub => {
                if (sub.itemCode && !map.has(sub.itemCode.toUpperCase())) {
                    map.set(sub.itemCode.toUpperCase(), {
                        code: sub.itemCode.toUpperCase(),
                        name: sub.name,
                        size: sub.details || '',
                        finishing: '',
                        hsnSac: ''
                    });
                }
            });
        });
        return Array.from(map.values());
    }, [boms, inventory]);

    const handleSelectCustomer = (value, byField = 'partyCode') => {
        const match = customers.find(c =>
            byField === 'partyCode'
                ? c.partyCode?.toLowerCase() === value.toLowerCase()
                : c.firmName?.toLowerCase() === value.toLowerCase()
        );

        if (match) {
            setFormData(prev => ({
                ...prev,
                partyCode: match.partyCode || prev.partyCode,
                name: match.firmName || prev.name,
                brandName: match.brandName || prev.brandName,
                box: match.defaultBox || prev.box,
                city: match.city || prev.city
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [byField === 'partyCode' ? 'partyCode' : 'name']: value
            }));
        }
    };

    const handleItemChange = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map(item => {
                if ((item._id || item.id) !== id) return item;
                const updated = { ...item, [field]: value };

                if (field === 'rudraCode') {
                    const cleanCode = value.toUpperCase();
                    updated.rudraCode = cleanCode;
                    const spec = productSuggestions.find(p => p.code === cleanCode);
                    if (spec) {
                        if (!updated.size && spec.size) updated.size = spec.size;
                        if (!updated.finishing && spec.finishing) updated.finishing = spec.finishing;
                        if (!updated.hsnSac && spec.hsnSac) updated.hsnSac = spec.hsnSac;
                    }
                    if (formData.name || formData.partyCode) {
                        const pastOrder = orders.find(
                            o =>
                                (o.partyCode && o.partyCode === formData.partyCode) ||
                                o.name?.toLowerCase() === formData.name?.toLowerCase()
                        );
                        const pastItem = pastOrder?.items?.find(i => i.rudraCode?.toUpperCase() === cleanCode);
                        if (pastItem?.partyCode && !updated.partyCode) {
                            updated.partyCode = pastItem.partyCode;
                        }
                    }
                }
                return updated;
            })
        }));
    };

    // Problem 2: Duplicate Row to Add Another Size Variant (e.g., 4mm, 6mm, 8mm)
    const handleAddSizeVariant = (sourceItem) => {
        const sourceId = sourceItem._id || sourceItem.id;
        const newVariantRow = {
            ...sourceItem,
            _id: undefined,
            id: generateRowId(),
            size: '',
            qty: ''
        };
        setFormData(prev => {
            const idx = prev.items.findIndex(i => (i._id || i.id) === sourceId);
            const nextItems = [...prev.items];
            nextItems.splice(idx + 1, 0, newVariantRow);
            return { ...prev, items: nextItems };
        });
        showToast(`Added new size row for ${sourceItem.rudraCode || 'item'}. Enter the new Size & Qty.`, 'info');
    };

    // Problem 1: Confirm Urgent Split (e.g., 150 pcs -> 20 Urgent + 130 Normal)
    const handleConfirmUrgentSplit = () => {
        const total = Number(splitModal.totalQty || 0);
        const urgent = Number(splitModal.urgentQty || 0);

        if (urgent <= 0 || urgent >= total) {
            showToast(`Enter an urgent quantity between 1 and ${total - 1}`, 'warning');
            return;
        }

        const normalRemaining = total - urgent;

        setFormData(prev => {
            const idx = prev.items.findIndex(i => (i._id || i.id) === splitModal.rowId);
            if (idx === -1) return prev;

            const targetItem = prev.items[idx];
            const urgentRow = {
                ...targetItem,
                qty: String(urgent),
                priority: 'urgent'
            };
            const normalRow = {
                ...targetItem,
                _id: undefined,
                id: generateRowId(),
                qty: String(normalRemaining),
                priority: 'normal'
            };

            const nextItems = [...prev.items];
            nextItems.splice(idx, 1, urgentRow, normalRow);

            return {
                ...prev,
                orderPriority: 'mixed',
                items: nextItems
            };
        });

        showToast(`Split into ${urgent} Pcs (🔴 Urgent) + ${normalRemaining} Pcs (Normal)!`, 'success');
        setSplitModal({ open: false, rowId: null, totalQty: 0, urgentQty: '' });
    };

    const handleCreateQuickCustomer = async () => {
        if (!newCustomer.firmName.trim() || !newCustomer.mobileNo.trim()) {
            showToast('Firm Name and Mobile No are required', 'warning');
            return;
        }
        try {
            const created = await createCustomerMutation.mutateAsync({
                ...newCustomer,
                partyCode: newCustomer.partyCode.trim().toUpperCase() || `PC-${Math.floor(100 + Math.random() * 900)}`
            });
            const cust = created.data || created;
            setFormData(prev => ({
                ...prev,
                partyCode: cust.partyCode,
                name: cust.firmName,
                brandName: cust.brandName || '',
                box: cust.defaultBox || '',
                city: cust.city || ''
            }));
            showToast(`Customer "${cust.firmName}" (${cust.partyCode}) created!`, 'success');
            setShowCustomerModal(false);
        } catch (e) {
            showToast(e.message || 'Failed to create customer', 'error');
        }
    };

    const handleCreateQuickProduct = async () => {
        if (!productModal.rudraCode.trim() || !productModal.name.trim()) {
            showToast('Rudra Code and Product Name are required', 'warning');
            return;
        }
        try {
            await quickAddInventoryMutation.mutateAsync({
                groupId: inventory[0]?._id || 'NEW_GROUP',
                newGroupName: 'Finished Goods',
                item: {
                    itemCode: productModal.rudraCode.trim().toUpperCase(),
                    name: productModal.name.trim(),
                    category: 'Finished Good',
                    details: productModal.size,
                    uom: 'Set',
                    unitCost: 0,
                    stock: 0
                }
            });
            if (productModal.rowId) {
                handleItemChange(productModal.rowId, 'rudraCode', productModal.rudraCode.trim().toUpperCase());
                if (productModal.size) handleItemChange(productModal.rowId, 'size', productModal.size);
                if (productModal.finishing) handleItemChange(productModal.rowId, 'finishing', productModal.finishing);
            }
            showToast(`Registered Rudra Code "${productModal.rudraCode.toUpperCase()}"!`, 'success');
            setProductModal(p => ({ ...p, open: false }));
        } catch (e) {
            showToast(e.message || 'Failed to register product', 'error');
        }
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            showToast('Customer Name is required', 'warning');
            return;
        }
        try {
            await onSave(formData);
            showToast('Order saved successfully!', 'success');
            onNavigate('list');
        } catch (e) {
            showToast(e.message || 'Failed to save order', 'error');
        }
    };

    return (
        <div className="space-y-4 max-w-7xl mx-auto pb-12">
            <div className="flex justify-between items-center bg-white px-4 py-3 rounded-t-md border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-2 text-sm">
                    <button onClick={() => onNavigate(isEditing ? 'detail' : 'list', order)} className="text-slate-400 hover:text-slate-600">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="text-slate-400">Orders</span>
                    <span className="text-slate-300">›</span>
                    <span className="font-semibold text-slate-800">{isEditing ? order.piNo : 'New Order (PI)'}</span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onNavigate(isEditing ? 'detail' : 'list', order)}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-sm hover:bg-slate-50"
                    >
                        <X className="w-4 h-4" /> Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-sm hover:bg-blue-700 shadow-sm"
                    >
                        <Check className="w-4 h-4" /> {isEditing ? 'Save Changes' : 'Create Order'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-sm border border-slate-200">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Order & Party Code Header
                    </h2>
                    <button
                        type="button"
                        onClick={() => {
                            setNewCustomer({
                                partyCode: formData.partyCode || `PC-${Math.floor(100 + Math.random() * 900)}`,
                                firmName: formData.name || '',
                                brandName: formData.brandName || '',
                                defaultBox: formData.box || '',
                                mobileNo: '',
                                city: formData.city || '',
                                group: 'sundry_debtors'
                            });
                            setShowCustomerModal(true);
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-2.5 py-1 rounded"
                    >
                        <Plus className="w-3.5 h-3.5" /> New Party / Customer Code
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                        <label className="text-sm font-medium text-slate-500 block mb-1.5">Party Code (Client Code)</label>
                        <div className="flex gap-1.5">
                            <input
                                list="party-code-list"
                                type="text"
                                value={formData.partyCode || ''}
                                onChange={(e) => handleSelectCustomer(e.target.value.toUpperCase(), 'partyCode')}
                                placeholder="Select or type e.g. PC-101"
                                className="w-full px-3 py-1.5 text-sm font-bold text-indigo-700 border border-slate-200 rounded-sm focus:outline-none focus:border-blue-500 uppercase"
                            />
                            <datalist id="party-code-list">
                                {customers.map(c => (
                                    <option key={c._id} value={c.partyCode || c.firmName}>
                                        {c.firmName} ({c.city || '-'})
                                    </option>
                                ))}
                            </datalist>
                            <button
                                type="button"
                                onClick={() => setShowCustomerModal(true)}
                                title="Create New Customer Code"
                                className="px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-sm hover:bg-blue-100"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-500 block mb-1.5">Customer / Firm Name *</label>
                        <input
                            list="customer-name-list"
                            type="text"
                            value={formData.name || ''}
                            onChange={(e) => handleSelectCustomer(e.target.value, 'firmName')}
                            placeholder="Search or enter Customer Name"
                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-sm focus:outline-none focus:border-blue-500 font-semibold"
                        />
                        <datalist id="customer-name-list">
                            {customers.map(c => (
                                <option key={c._id} value={c.firmName}>
                                    {c.partyCode ? `[${c.partyCode}] ` : ''}{c.brandName || ''}
                                </option>
                            ))}
                        </datalist>
                    </div>

                    <FormInput label="Order Code (PI No.)" name="piNo" value={formData.piNo} onChange={(e) => setFormData(p => ({ ...p, piNo: e.target.value }))} placeholder="Auto-generated if blank" />
                    <FormInput label="Date" name="date" type="date" value={formData.date} onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))} />
                    <FormInput label="Brand Name" name="brandName" value={formData.brandName} onChange={(e) => setFormData(p => ({ ...p, brandName: e.target.value }))} />
                    <FormInput label="Box" name="box" value={formData.box} onChange={(e) => setFormData(p => ({ ...p, box: e.target.value }))} />
                    <FormInput label="City" name="city" value={formData.city} onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))} />
                    <div>
                        <label className="text-sm font-medium text-slate-500 block mb-1.5">Order Priority</label>
                        <select
                            value={formData.orderPriority || 'normal'}
                            onChange={(e) => {
                                const newPriority = e.target.value;
                                setFormData(p => ({
                                    ...p,
                                    orderPriority: newPriority,
                                    items: newPriority !== 'mixed' ? p.items.map(item => ({ ...item, priority: newPriority })) : p.items
                                }));
                            }}
                            className={`w-full px-3 py-1.5 text-sm font-bold border rounded-sm focus:outline-none ${(formData.orderPriority || 'normal') === 'urgent'
                                    ? 'border-red-300 bg-red-50 text-red-700'
                                    : 'border-slate-200 text-slate-700'
                                }`}
                        >
                            <option value="normal">Normal</option>
                            <option value="urgent">🔴 Urgent (All Items)</option>
                            <option value="mixed">⚡ Mixed (Split Urgent + Normal)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Line Items Table with "⚡ Split Urgent" and "+ Size" Variant Buttons */}
            <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-2">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Line Items (Use "⚡ Split" for Urgent Partial Qty & "+ Size" for Multi-Size Variants)
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-slate-200 text-xs font-semibold text-slate-500">
                                <th className="p-3 w-8 text-center">#</th>
                                <th className="p-3 w-24 text-center">Priority</th>
                                <th className="p-3 w-44">Rudra Code (Factory)</th>
                                <th className="p-3">Party Item Code</th>
                                <th className="p-3">Finishing</th>
                                <th className="p-3">Color</th>
                                <th className="p-3 w-24">HSN/SAC</th>
                                <th className="p-3 w-28">Size</th>
                                <th className="p-3 w-28">Set (Qty)</th>
                                <th className="p-3 w-40 text-center">Quick Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {formData.items.map((item, index) => {
                                const rowId = item._id || item.id;
                                return (
                                    <tr key={rowId} className={`hover:bg-slate-50 ${item.priority === 'urgent' ? 'bg-red-50/40 border-l-4 border-red-500' : ''}`}>
                                        <td className="p-2 text-center text-slate-400 text-sm font-medium">{index + 1}</td>
                                        <td className="p-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleItemChange(rowId, 'priority', item.priority === 'urgent' ? 'normal' : 'urgent')}
                                                className={`px-2 py-1 text-[10px] font-bold rounded-sm uppercase transition-all ${item.priority === 'urgent'
                                                        ? 'bg-red-100 text-red-700 ring-1 ring-red-300 animate-pulse'
                                                        : 'bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-600'
                                                    }`}
                                            >
                                                {item.priority === 'urgent' ? '🔴 Urgent' : 'Normal'}
                                            </button>
                                        </td>
                                        <td className="p-2">
                                            <div className="flex gap-1">
                                                <input
                                                    list="rudra-code-list"
                                                    type="text"
                                                    value={item.rudraCode}
                                                    onChange={(e) => handleItemChange(rowId, 'rudraCode', e.target.value)}
                                                    placeholder="e.g. R-001"
                                                    className="w-full px-2 py-1.5 text-sm font-bold text-indigo-700 bg-white border border-slate-200 rounded-sm focus:outline-none uppercase"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setProductModal({
                                                            open: true,
                                                            rowId,
                                                            rudraCode: item.rudraCode || '',
                                                            name: '',
                                                            size: item.size || '',
                                                            finishing: item.finishing || ''
                                                        })
                                                    }
                                                    title="Add New Rudra Code to Inventory"
                                                    className="px-2 py-1.5 bg-indigo-50 text-indigo-600 rounded-sm hover:bg-indigo-100 shrink-0"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                        {['partyCode', 'finishing', 'color', 'hsnSac', 'size', 'qty'].map(col => (
                                            <td key={col} className="p-2">
                                                <input
                                                    type={col === 'qty' ? 'number' : 'text'}
                                                    placeholder={col === 'size' ? 'e.g. 4mm / 6"' : ''}
                                                    value={item[col] || ''}
                                                    onChange={(e) => handleItemChange(rowId, col, e.target.value)}
                                                    className={`w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded-sm focus:outline-none ${col === 'size' ? 'font-bold text-blue-700' : col === 'qty' ? 'font-bold text-slate-800' : ''
                                                        }`}
                                                />
                                            </td>
                                        ))}
                                        <td className="p-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {/* 1-Click Urgent Split Button (Problem 1) */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const q = Number(item.qty || 0);
                                                        if (q <= 1) {
                                                            showToast('Enter a quantity greater than 1 first (e.g. 150) to split urgent pieces.', 'warning');
                                                            return;
                                                        }
                                                        setSplitModal({
                                                            open: true,
                                                            rowId,
                                                            totalQty: q,
                                                            urgentQty: ''
                                                        });
                                                    }}
                                                    title="Split Urgent Quantity (e.g. 20 Urgent + 130 Normal)"
                                                    className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 text-[10px] font-bold rounded flex items-center gap-0.5"
                                                >
                                                    <Zap className="w-3 h-3" /> Split
                                                </button>

                                                {/* 1-Click Add Size Variant Button (Problem 2) */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddSizeVariant(item)}
                                                    title="Add another size for this Rudra Code"
                                                    className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-bold rounded flex items-center gap-0.5"
                                                >
                                                    <Copy className="w-3 h-3" /> +Size
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (formData.items.length === 1) return;
                                                        setFormData(p => ({
                                                            ...p,
                                                            items: p.items.filter(i => (i._id || i.id) !== rowId)
                                                        }));
                                                    }}
                                                    disabled={formData.items.length === 1}
                                                    className="p-1 text-slate-400 hover:text-red-500 rounded disabled:opacity-40"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <datalist id="rudra-code-list">
                        {productSuggestions.map(p => (
                            <option key={p.code} value={p.code}>
                                {p.name} {p.size ? `(${p.size})` : ''}
                            </option>
                        ))}
                    </datalist>
                </div>
                <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                    <button
                        type="button"
                        onClick={() =>
                            setFormData(p => ({
                                ...p,
                                items: [...p.items, { ...INITIAL_ITEM, id: generateRowId() }]
                            }))
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-sm"
                    >
                        <Plus className="w-4 h-4" /> Add New Item Row
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-sm border border-slate-200 p-6">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Remarks / Notes</label>
                <textarea
                    name="remarks"
                    value={formData.remarks || ''}
                    onChange={(e) => setFormData(p => ({ ...p, remarks: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-sm focus:outline-none resize-none"
                />
            </div>

            {/* Urgent Split Modal ("Pehla Maal" — e.g., 150 pcs -> 20 Urgent + 130 Normal) */}
            {splitModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 bg-red-600 text-white flex justify-between items-center">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <Zap className="w-4 h-4" /> Split Urgent Quantity ("Pehla Maal")
                            </h3>
                            <button onClick={() => setSplitModal({ open: false, rowId: null, totalQty: 0, urgentQty: '' })}>
                                <X className="w-5 h-5 text-red-200 hover:text-white" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-600">
                                Total Row Quantity: <strong className="text-slate-900">{splitModal.totalQty} Pcs</strong>.
                                How many pieces does the client need in <strong>Urgent</strong> dispatch?
                            </p>
                            <div>
                                <label className="text-xs font-bold text-red-600 uppercase block mb-1.5">
                                    Urgent Required Quantity *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max={splitModal.totalQty - 1}
                                    value={splitModal.urgentQty}
                                    onChange={(e) => setSplitModal(p => ({ ...p, urgentQty: e.target.value }))}
                                    placeholder={`e.g. 20 (Remaining ${splitModal.totalQty - Number(splitModal.urgentQty || 0)} will be Normal)`}
                                    className="w-full px-3 py-2 text-sm font-bold border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                    autoFocus
                                />
                            </div>
                            {Number(splitModal.urgentQty) > 0 && Number(splitModal.urgentQty) < splitModal.totalQty && (
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between text-xs font-bold">
                                    <span className="text-red-600">🔴 Urgent Batch: {splitModal.urgentQty} Pcs</span>
                                    <span className="text-slate-700">Normal Batch: {splitModal.totalQty - Number(splitModal.urgentQty)} Pcs</span>
                                </div>
                            )}
                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSplitModal({ open: false, rowId: null, totalQty: 0, urgentQty: '' })}
                                    className="px-4 py-2 border rounded-lg text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmUrgentSplit}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold"
                                >
                                    Split into Urgent & Normal
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick-Add Customer Modal */}
            {showCustomerModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <Building2 className="w-4 h-4" /> Quick Create Party Code
                            </h3>
                            <button onClick={() => setShowCustomerModal(false)}>
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-3">
                            <FormInput
                                label="Unique Party Code *"
                                value={newCustomer.partyCode}
                                onChange={(e) => setNewCustomer(p => ({ ...p, partyCode: e.target.value.toUpperCase() }))}
                                placeholder="e.g. PC-105"
                            />
                            <FormInput
                                label="Firm / Customer Name *"
                                value={newCustomer.firmName}
                                onChange={(e) => setNewCustomer(p => ({ ...p, firmName: e.target.value }))}
                            />
                            <FormInput
                                label="Mobile No. *"
                                value={newCustomer.mobileNo}
                                onChange={(e) => setNewCustomer(p => ({ ...p, mobileNo: e.target.value }))}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <FormInput
                                    label="Brand Name"
                                    value={newCustomer.brandName}
                                    onChange={(e) => setNewCustomer(p => ({ ...p, brandName: e.target.value }))}
                                />
                                <FormInput
                                    label="Default Box"
                                    value={newCustomer.defaultBox}
                                    onChange={(e) => setNewCustomer(p => ({ ...p, defaultBox: e.target.value }))}
                                />
                            </div>
                            <FormInput
                                label="City"
                                value={newCustomer.city}
                                onChange={(e) => setNewCustomer(p => ({ ...p, city: e.target.value }))}
                            />
                            <div className="pt-3 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCustomerModal(false)}
                                    className="px-4 py-2 border rounded text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateQuickCustomer}
                                    className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold"
                                >
                                    Save & Select
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick-Add Rudra Code Modal */}
            {productModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 bg-indigo-900 text-white flex justify-between items-center">
                            <h3 className="font-bold text-base">Quick Add Rudra Code</h3>
                            <button onClick={() => setProductModal(p => ({ ...p, open: false }))}>
                                <X className="w-5 h-5 text-indigo-300" />
                            </button>
                        </div>
                        <div className="p-6 space-y-3">
                            <FormInput
                                label="Rudra Code *"
                                value={productModal.rudraCode}
                                onChange={(e) => setProductModal(p => ({ ...p, rudraCode: e.target.value.toUpperCase() }))}
                                placeholder="e.g. R-205"
                            />
                            <FormInput
                                label="Product Description / Name *"
                                value={productModal.name}
                                onChange={(e) => setProductModal(p => ({ ...p, name: e.target.value }))}
                                placeholder="e.g. Brass Mortise Handle"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <FormInput
                                    label="Default Size"
                                    value={productModal.size}
                                    onChange={(e) => setProductModal(p => ({ ...p, size: e.target.value }))}
                                />
                                <FormInput
                                    label="Default Finishing"
                                    value={productModal.finishing}
                                    onChange={(e) => setProductModal(p => ({ ...p, finishing: e.target.value }))}
                                />
                            </div>
                            <div className="pt-3 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setProductModal(p => ({ ...p, open: false }))}
                                    className="px-4 py-2 border rounded text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateQuickProduct}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-bold"
                                >
                                    Register Code
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const FormInput = ({ label, name, type = 'text', value, onChange, placeholder }) => (
    <div>
        <label className="text-sm font-medium text-slate-500 block mb-1.5">{label}</label>
        <input
            type={type}
            name={name}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-sm focus:outline-none focus:border-slate-400"
        />
    </div>
);