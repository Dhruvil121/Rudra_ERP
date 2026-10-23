import { useState, useMemo } from 'react';
import {
    Layers, Search, Plus, ArrowLeft, Check, X, Package,
    Factory, Archive, Loader2, ArrowRight, CheckCircle2, ClipboardList
} from 'lucide-react';
import { useAuth, ACTIONS } from '../context/AuthContext';
import { useAssemblies, useConfirmAssembly } from '../hooks/useAssemblingData';
import { useOrders } from '../hooks/useOrderData';
import { useBOMs } from '../hooks/useBOMMasterData';
import { useInventory } from '../hooks/useInventoryData';
import { useFeedback } from '../context/FeedbackContext';

export default function AssemblingModule() {
    const [view, setView] = useState('list'); // 'list' | 'form'
    const [preselectedOrder, setPreselectedOrder] = useState(null);

    const { data: assemblies = [], isLoading: asmLoading } = useAssemblies();
    const { data: orders = [], isLoading: ordLoading } = useOrders();
    const { data: boms = [] } = useBOMs();
    const { data: inventory = [] } = useInventory();
    const confirmMutation = useConfirmAssembly();

    const handleOpenForm = (order = null) => {
        setPreselectedOrder(order);
        setView('form');
    };

    if (asmLoading || ordLoading) {
        return (
            <div className="w-full">
                <div className="flex justify-center p-12 max-w-7xl mx-auto">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {view === 'list' ? (
                <AssemblingList
                    assemblies={assemblies}
                    orders={orders}
                    onOpenForm={handleOpenForm}
                />
            ) : (
                <AssemblingForm
                    initialOrder={preselectedOrder}
                    orders={orders}
                    boms={boms}
                    inventory={inventory}
                    onBack={() => {
                        setPreselectedOrder(null);
                        setView('list');
                    }}
                    onSubmit={confirmMutation.mutateAsync}
                    isSubmitting={confirmMutation.isPending}
                />
            )}
        </div>
    );
}

// ==========================================
// 1. LIST VIEW (Matches Full-Width BOM Layout)
// ==========================================
function AssemblingList({ assemblies, orders, onOpenForm }) {
    const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'history'
    const [searchTerm, setSearchTerm] = useState('');
    const { hasPermission } = useAuth();

    const canAdd =
        hasPermission('assembling', ACTIONS.ADD) ||
        hasPermission('assembling', ACTIONS.EDIT) ||
        hasPermission('process', ACTIONS.ADD);

    const filteredOrders = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return orders.filter(
            o =>
                !term ||
                o.piNo?.toLowerCase().includes(term) ||
                o.name?.toLowerCase().includes(term) ||
                o.partyCode?.toLowerCase().includes(term) ||
                o.items?.some(i => i.rudraCode?.toLowerCase().includes(term))
        );
    }, [orders, searchTerm]);

    const filteredHistory = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return assemblies.filter(
            a =>
                !term ||
                a.batchNo?.toLowerCase().includes(term) ||
                a.finishedItemCode?.toLowerCase().includes(term) ||
                a.piNo?.toLowerCase().includes(term) ||
                a.customerName?.toLowerCase().includes(term)
        );
    }, [assemblies, searchTerm]);

    const totalSetsAssembled = assemblies.reduce((sum, a) => sum + Number(a.assembledSets || 0), 0);
    const totalBoxesPacked = assemblies.reduce((sum, a) => sum + Number(a.totalBoxes || 0), 0);
    const buffingWipCount = assemblies.filter(a => a.stockSource === 'buffing').length;

    return (
        <div className="space-y-4 max-w-7xl mx-auto pb-16">
            {/* Top Header — Matches BOM Layout */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                        <Layers className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Final Assembling & Packaging</h1>
                        <p className="text-sm text-slate-500">
                            Assemble finished hardware sets from Buffing WIP or Master Inventory & sync BOM stock
                        </p>
                    </div>
                </div>

                {canAdd && (
                    <button
                        onClick={() => onOpenForm(null)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
                    >
                        <Plus className="w-4 h-4" /> New Assembly Batch
                    </button>
                )}
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                            Total Assembled Sets
                        </h3>
                        <span className="text-2xl font-bold text-slate-800">
                            {totalSetsAssembled} <span className="text-xs font-medium text-slate-400">Sets</span>
                        </span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Archive className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                            Total Packed Boxes
                        </h3>
                        <span className="text-2xl font-bold text-slate-800">
                            {Number(totalBoxesPacked.toFixed(2))}{' '}
                            <span className="text-xs font-medium text-slate-400">Boxes</span>
                        </span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Factory className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                            Assembly Batches Completed
                        </h3>
                        <span className="text-2xl font-bold text-slate-800">
                            {assemblies.length}{' '}
                            <span className="text-xs font-medium text-slate-400">
                                ({buffingWipCount} via Buffing WIP)
                            </span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Full-Width White Search & Tabs Bar — Matches BOM Layout */}
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-4">
                <div className="relative w-80">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search Rudra Code, PI No, Customer..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                </div>

                <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md font-semibold text-xs transition-all ${activeTab === 'orders'
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <ClipboardList className="w-3.5 h-3.5" />
                        Orders Ready for Assembly ({filteredOrders.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md font-semibold text-xs transition-all ${activeTab === 'history'
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Assembly Log History ({filteredHistory.length})
                    </button>
                </div>
            </div>

            {/* Full-Width Table — Matches BOM Layout */}
            {activeTab === 'orders' ? (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="p-4">Order ID (PI No.)</th>
                                <th className="p-4">Customer & Party Code</th>
                                <th className="p-4">Product (Rudra Code)</th>
                                <th className="p-4 text-center">Order Quantity</th>
                                <th className="p-4">Box Type</th>
                                <th className="p-4">Inventory Sync</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredOrders.map((order) => {
                                const totalQty = (order.items || []).reduce(
                                    (acc, item) => acc + Number(item.qty || 0),
                                    0
                                );
                                const codes = (order.items || [])
                                    .map(i => i.rudraCode)
                                    .filter(Boolean)
                                    .join(', ');

                                return (
                                    <tr key={order._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-bold text-indigo-600">{order.piNo}</td>
                                        <td className="p-4">
                                            <div className="text-sm font-semibold text-slate-800">{order.name}</div>
                                            {order.partyCode && (
                                                <div className="text-xs font-bold text-slate-400">{order.partyCode}</div>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm font-bold text-blue-600">{codes || '-'}</td>
                                        <td className="p-4 text-center">
                                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">
                                                {totalQty} Sets
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-slate-600">{order.box || '-'}</td>
                                        <td className="p-4">
                                            {order.inventorySynced ? (
                                                <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase">
                                                    Assembled & Synced
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full uppercase">
                                                    Pending Assembly
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            {canAdd && (
                                                <button
                                                    onClick={() => onOpenForm(order)}
                                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                                                >
                                                    Start Assembly
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredOrders.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-400">
                                        No orders found.
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
                                <th className="p-4">Batch No.</th>
                                <th className="p-4">Order / PI No.</th>
                                <th className="p-4">Rudra Code</th>
                                <th className="p-4 text-center">Assembled Sets</th>
                                <th className="p-4 text-center">Packed Boxes</th>
                                <th className="p-4">Stock Source Used</th>
                                <th className="p-4">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredHistory.map((asm) => (
                                <tr key={asm._id} className="hover:bg-slate-50">
                                    <td className="p-4 font-bold text-indigo-600">{asm.batchNo}</td>
                                    <td className="p-4">
                                        <div className="text-sm font-semibold text-slate-800">{asm.piNo}</div>
                                        <div className="text-xs text-slate-400">{asm.customerName}</div>
                                    </td>
                                    <td className="p-4 text-sm font-bold text-blue-600">{asm.finishedItemCode}</td>
                                    <td className="p-4 text-center">
                                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                                            {asm.assembledSets} Sets
                                        </span>
                                    </td>
                                    <td className="p-4 text-center font-bold text-slate-700">
                                        {asm.totalBoxes} Boxes
                                    </td>
                                    <td className="p-4">
                                        <span
                                            className={`px-2.5 py-1 text-xs font-bold rounded-full ${asm.stockSource === 'buffing'
                                                    ? 'bg-blue-50 text-blue-700'
                                                    : 'bg-purple-50 text-purple-700'
                                                }`}
                                        >
                                            {asm.stockSource === 'buffing'
                                                ? 'Old Stock via Buffing (WIP)'
                                                : 'Master Inventory Stock'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-slate-500">
                                        {asm.createdAt
                                            ? new Date(asm.createdAt).toLocaleDateString('en-IN', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })
                                            : '-'}
                                    </td>
                                </tr>
                            ))}
                            {filteredHistory.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-400">
                                        No assembly batches recorded yet. Click "New Assembly Batch" or "Start Assembly" on an order.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ==========================================
// 2. ASSEMBLY EXECUTION FORM (Synced with Split-BOM & Inventory)
// ==========================================
function AssemblingForm({ initialOrder, orders, boms, inventory, onBack, onSubmit, isSubmitting }) {
    const { showToast } = useFeedback();

    const initialCode = initialOrder?.items?.[0]?.rudraCode || '';
    const initialQty = initialOrder
        ? (initialOrder.items || []).reduce((acc, i) => acc + Number(i.qty || 0), 0)
        : 10;

    const [formData, setFormData] = useState({
        orderId: initialOrder?._id || '',
        piNo: initialOrder?.piNo || '',
        customerName: initialOrder?.name || '',
        partyCode: initialOrder?.partyCode || '',
        finishedItemCode: initialCode.toUpperCase(),
        assembledSets: initialQty,
        piecesPerBox: 10,
        stockSource: 'buffing', // 'buffing' | 'inventory'
        remarks: ''
    });

    // Flatten inventory subItems for live stock lookup
    const allSubItems = useMemo(() => {
        return inventory.flatMap(g =>
            (g.subItems || []).map(sub => ({
                ...sub,
                groupId: g._id,
                groupName: g.groupName
            }))
        );
    }, [inventory]);

    // Find matching BOM recipe for the selected Rudra Code
    const matchedBOM = useMemo(() => {
        if (!formData.finishedItemCode) return null;
        return boms.find(
            b => b.finishedItemCode?.toUpperCase() === formData.finishedItemCode.trim().toUpperCase()
        );
    }, [boms, formData.finishedItemCode]);

    // Calculate required In-House Factory Parts & After-Market Materials for this Assembly Quantity
    const explodedRequirements = useMemo(() => {
        const sets = Number(formData.assembledSets) || 0;
        if (!matchedBOM || sets <= 0) {
            return { inHouse: [], afterMarket: [] };
        }

        const inHouse = (matchedBOM.inHouseParts || []).map(part => {
            const sub = allSubItems.find(
                i =>
                    (part.inventorySubItemId && i._id === part.inventorySubItemId) ||
                    (part.partCode && i.itemCode?.toUpperCase() === part.partCode.toUpperCase()) ||
                    i.name?.toLowerCase() === part.fieldName?.toLowerCase()
            );
            return {
                fieldName: part.fieldName,
                partCode: sub?.itemCode || part.partCode || '-',
                inventorySubItemId: sub?._id || part.inventorySubItemId || '',
                qtyPerSet: Number(part.qtyInPieces || 1),
                requiredPieces: Number(part.qtyInPieces || 1) * sets,
                availableStock: sub ? Number(sub.stock || 0) : 0
            };
        });

        const afterMarket = (matchedBOM.components || []).map(comp => {
            const sub = allSubItems.find(i => i._id === comp.inventorySubItemId);
            const reqQty = Number(comp.quantity || 1) * sets;
            const avail = sub ? Number(sub.stock || 0) : 0;
            return {
                inventorySubItemId: comp.inventorySubItemId,
                materialName: sub?.name || comp.fieldName || 'Material',
                materialCode: sub?.itemCode || '-',
                consumedQty: reqQty,
                availableStock: avail,
                shortfall: Math.max(0, reqQty - avail),
                unit: comp.unit || 'Pcs'
            };
        });

        return { inHouse, afterMarket };
    }, [matchedBOM, formData.assembledSets, allSubItems]);

    const totalBoxes =
        Number(formData.piecesPerBox) > 0
            ? Number((Number(formData.assembledSets || 0) / Number(formData.piecesPerBox)).toFixed(2))
            : 0;

    const handleOrderSelect = (orderId) => {
        const ord = orders.find(o => o._id === orderId);
        if (!ord) {
            setFormData(p => ({ ...p, orderId: '', piNo: '', customerName: '', partyCode: '' }));
            return;
        }
        const firstCode = ord.items?.[0]?.rudraCode || '';
        const sets = (ord.items || []).reduce((acc, i) => acc + Number(i.qty || 0), 0);
        setFormData(p => ({
            ...p,
            orderId: ord._id,
            piNo: ord.piNo,
            customerName: ord.name,
            partyCode: ord.partyCode || '',
            finishedItemCode: firstCode.toUpperCase(),
            assembledSets: sets || p.assembledSets
        }));
    };

    const handleConfirm = async (e) => {
        e.preventDefault();
        if (!formData.finishedItemCode.trim()) {
            showToast('Please select or enter a Final Product Code (Rudra Code)', 'warning');
            return;
        }
        if (!formData.assembledSets || Number(formData.assembledSets) <= 0) {
            showToast('Please enter a valid Assembly Quantity', 'warning');
            return;
        }

        try {
            await onSubmit({
                ...formData,
                productName: matchedBOM?.productName || formData.finishedItemCode,
                totalBoxes,
                inHouseConsumed: explodedRequirements.inHouse,
                afterMarketConsumed: explodedRequirements.afterMarket
            });
            showToast(
                `Assembly confirmed! Added ${formData.assembledSets} Sets (${totalBoxes} Boxes) of ${formData.finishedItemCode} and synced Inventory.`,
                'success'
            );
            onBack();
        } catch (err) {
            showToast(err.message || 'Failed to confirm assembly', 'error');
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16">
            {/* Top Bar — Matches BOM Form Layout */}
            <div className="flex justify-between items-center bg-white px-6 py-4 rounded-xl border border-slate-200 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-2 text-sm">
                    <button onClick={onBack} className="text-slate-400 hover:text-slate-600">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-slate-400">Assembling</span>
                    <span className="text-slate-300">›</span>
                    <span className="font-bold text-slate-800 text-base">
                        {formData.piNo ? `Assemble Order: ${formData.piNo}` : 'New Assembly & Packaging Batch'}
                    </span>
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50"
                    >
                        <X className="w-4 h-4" /> Cancel
                    </button>
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleConfirm}
                        className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-sm disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Confirm Assembly & Sync Stock
                    </button>
                </div>
            </div>

            {/* Header Configuration Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            Link to Order (PI No.) — Optional
                        </label>
                        <select
                            value={formData.orderId}
                            onChange={(e) => handleOrderSelect(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white font-semibold text-slate-800 focus:border-indigo-500 outline-none"
                        >
                            <option value="">-- Assemble Directly for Master Stock --</option>
                            {orders.map(o => (
                                <option key={o._id} value={o._id}>
                                    {o.piNo} — {o.name} ({o.items?.map(i => i.rudraCode).join(', ')})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            Final Product Code (Rudra Code) *
                        </label>
                        <input
                            list="assembly-rudra-codes"
                            type="text"
                            value={formData.finishedItemCode}
                            onChange={(e) =>
                                setFormData(p => ({ ...p, finishedItemCode: e.target.value.toUpperCase() }))
                            }
                            placeholder="e.g. R-900"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-bold uppercase text-indigo-700 focus:border-indigo-500 outline-none"
                        />
                        <datalist id="assembly-rudra-codes">
                            {boms.map(b => (
                                <option key={b._id} value={b.finishedItemCode}>
                                    {b.productName || b.finishedItemCode}
                                </option>
                            ))}
                        </datalist>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            Assembly Quantity (Sets) *
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={formData.assembledSets}
                            onChange={(e) => setFormData(p => ({ ...p, assembledSets: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-bold text-slate-800 focus:border-indigo-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            Sets Per Box (Total: {totalBoxes} Box)
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={formData.piecesPerBox}
                            onChange={(e) => setFormData(p => ({ ...p, piecesPerBox: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-semibold text-slate-700 focus:border-indigo-500 outline-none"
                        />
                    </div>
                </div>

                {/* Component Stock Source Radio Selector */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                        Select In-House Component Stock Source
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label
                            className={`flex items-center gap-3 p-3.5 bg-white border-2 rounded-xl cursor-pointer transition-all ${formData.stockSource === 'buffing'
                                    ? 'border-blue-500 bg-blue-50/30 shadow-sm'
                                    : 'border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <input
                                type="radio"
                                name="stockSource"
                                value="buffing"
                                checked={formData.stockSource === 'buffing'}
                                onChange={(e) => setFormData(p => ({ ...p, stockSource: e.target.value }))}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                                <span className="font-bold text-sm text-slate-800 block">
                                    Old Stock As Through Buffing (Process WIP)
                                </span>
                                <span className="text-xs text-slate-500">
                                    Uses semi-finished parts coming directly from the Process Flow (Turning / Buffing / Plating)
                                </span>
                            </div>
                        </label>

                        <label
                            className={`flex items-center gap-3 p-3.5 bg-white border-2 rounded-xl cursor-pointer transition-all ${formData.stockSource === 'inventory'
                                    ? 'border-indigo-500 bg-indigo-50/30 shadow-sm'
                                    : 'border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <input
                                type="radio"
                                name="stockSource"
                                value="inventory"
                                checked={formData.stockSource === 'inventory'}
                                onChange={(e) => setFormData(p => ({ ...p, stockSource: e.target.value }))}
                                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                                <span className="font-bold text-sm text-slate-800 block">
                                    Old Stock As Inventory (Semi-Finished / Finished Goods)
                                </span>
                                <span className="text-xs text-slate-500">
                                    Deducts both In-House Sub-Parts and After-Market items directly from Master Inventory
                                </span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Split-BOM Consumption Preview (Left: In-House Parts | Right: After-Market Items) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* 1. Left Panel: In-House Factory Parts */}
                <div className="bg-white rounded-xl border-2 border-blue-200 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-blue-100 bg-blue-50/70 flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-blue-600 text-white rounded-lg">
                                <Factory className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                                    1. In-House Factory Parts Consumed
                                </h2>
                                <p className="text-xs text-blue-700 font-medium flex items-center gap-1">
                                    Source:{' '}
                                    {formData.stockSource === 'buffing'
                                        ? 'Buffing / Process WIP'
                                        : 'Master Inventory Stock'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4">
                        {explodedRequirements.inHouse.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6">
                                Select a valid Rudra Code with a BOM Recipe to preview required factory parts.
                            </p>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                                        <th className="pb-2">Factory Part (Field Name)</th>
                                        <th className="pb-2 text-center">Per Set</th>
                                        <th className="pb-2 text-right">Total Consumed</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {explodedRequirements.inHouse.map((part, i) => (
                                        <tr key={i}>
                                            <td className="py-3">
                                                <div className="text-sm font-bold text-slate-800">{part.fieldName}</div>
                                                {part.partCode !== '-' && (
                                                    <div className="text-xs text-blue-600 font-semibold">
                                                        Code: {part.partCode}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 text-center text-xs font-semibold text-slate-500">
                                                {part.qtyPerSet} Pcs
                                            </td>
                                            <td className="py-3 text-right">
                                                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">
                                                    {part.requiredPieces} Pcs
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* 2. Right Panel: After-Market Requirements */}
                <div className="bg-white rounded-xl border-2 border-emerald-200 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-emerald-100 bg-emerald-50/70 flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-emerald-600 text-white rounded-lg">
                                <Package className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                                    2. After-Market Items Deducted
                                </h2>
                                <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                                    Auto-deducts from Master Inventory <ArrowRight className="w-3 h-3" /> Stock
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4">
                        {explodedRequirements.afterMarket.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6">
                                Select a valid Rudra Code with a BOM Recipe to preview after-market requirements.
                            </p>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                                        <th className="pb-2">Material Name</th>
                                        <th className="pb-2 text-right">To Deduct</th>
                                        <th className="pb-2 text-right">In Stock</th>
                                        <th className="pb-2 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {explodedRequirements.afterMarket.map((mat, i) => (
                                        <tr key={i}>
                                            <td className="py-3">
                                                <div className="text-sm font-bold text-slate-800">{mat.materialName}</div>
                                                <div className="text-xs text-slate-400">{mat.materialCode}</div>
                                            </td>
                                            <td className="py-3 text-right text-sm font-bold text-emerald-700">
                                                {mat.consumedQty} {mat.unit}
                                            </td>
                                            <td className="py-3 text-right text-sm font-semibold text-slate-600">
                                                {mat.availableStock} {mat.unit}
                                            </td>
                                            <td className="py-3 text-right">
                                                {mat.shortfall > 0 ? (
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                                                        Short: {mat.shortfall}
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
                                                        Ready
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}