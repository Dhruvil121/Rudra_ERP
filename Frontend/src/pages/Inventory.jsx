import { useState, useMemo } from 'react';
import {
    Search, Plus, Edit2, Trash2, ArrowLeft, Package,
    Loader2, IndianRupee, Factory, ShoppingBag, RotateCcw, Layers
} from 'lucide-react';
import { PermissionGuard } from '../components/auth/PermissionGuard';
import { ACTIONS } from '../context/AuthContext';
import { useInventory, useSaveInventory, useDeleteInventory } from '../hooks/useInventoryData';
import { useFeedback } from '../context/FeedbackContext';

const generateId = () => Math.random().toString(36).substring(2, 10);

const PROCESS_CATEGORIES = ['Raw Material', 'Semi-Finished', 'Component', 'Consumable', 'Rejected'];
const AFTERMARKET_CATEGORIES = ['After-Market', 'Finished Good'];

const CATEGORY_BADGE_STYLES = {
    'Raw Material': 'bg-orange-100 text-orange-700',
    'Semi-Finished': 'bg-blue-100 text-blue-700',
    'After-Market': 'bg-emerald-100 text-emerald-700',
    'Finished Good': 'bg-green-100 text-green-700',
    'Consumable': 'bg-purple-100 text-purple-700',
    'Component': 'bg-slate-100 text-slate-700',
    'Rejected': 'bg-red-100 text-red-700 ring-1 ring-red-300'
};

const isItemInTab = (item, tab) => {
    if (tab === 'all') return true;
    if (tab === 'rejected') return item.category === 'Rejected';
    const inferredType =
        item.inventoryType ||
        (AFTERMARKET_CATEGORIES.includes(item.category) ? 'aftermarket' : 'process');
    return inferredType === tab;
};

export default function InventoryModule() {
    const [view, setView] = useState('list');
    const [selectedGroup, setSelectedGroup] = useState(null);

    const { data: inventoryGroups = [], isLoading } = useInventory();
    const saveMutation = useSaveInventory();
    const deleteMutation = useDeleteInventory();
    const { showConfirm, showToast } = useFeedback();

    const handleNavigate = (newView, group = null) => {
        setSelectedGroup(group);
        setView(newView);
    };

    const handleSaveGroup = async (formData) => {
        try {
            const saved = await saveMutation.mutateAsync(formData);
            showToast(
                formData._id ? 'Inventory group updated successfully' : 'New inventory group created',
                'success'
            );
            setSelectedGroup(saved);
            setView('list');
        } catch (err) {
            showToast(err.message || 'Failed to save inventory group', 'error');
        }
    };

    const handleDelete = async (id, groupName) => {
        const isConfirmed = await showConfirm({
            title: 'Delete Inventory Group',
            message: `Are you sure you want to delete "${groupName}" and all its items?`,
            type: 'danger',
            confirmText: 'Delete'
        });

        if (isConfirmed) {
            try {
                await deleteMutation.mutateAsync(id);
                showToast('Inventory group deleted successfully', 'success');
                handleNavigate('list');
            } catch {
                showToast('Failed to delete inventory group', 'error');
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto">
            {view === 'list' && (
                <InventoryList
                    groups={inventoryGroups}
                    onNavigate={handleNavigate}
                />
            )}
            {view === 'detail' && (
                <InventoryDetail
                    group={
                        inventoryGroups.find(g => g._id === selectedGroup?._id) || selectedGroup
                    }
                    onNavigate={handleNavigate}
                    onDelete={handleDelete}
                />
            )}
            {view === 'form' && (
                <InventoryForm
                    group={selectedGroup}
                    onNavigate={handleNavigate}
                    onSave={handleSaveGroup}
                    isSaving={saveMutation.isPending}
                />
            )}
        </div>
    );
}

// ==========================================
// 1. LIST VIEW (With Process vs After-Market & Rejected Pool Tabs)
// ==========================================
function InventoryList({ groups, onNavigate }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [inventoryTab, setInventoryTab] = useState('process'); // 'process' | 'aftermarket' | 'rejected' | 'all'

    // Compute tab counts & totals
    const tabStats = useMemo(() => {
        let processItems = 0,
            aftermarketItems = 0,
            rejectedItems = 0,
            reservedTotal = 0;

        groups.forEach(g => {
            (g.subItems || []).forEach(sub => {
                if (isItemInTab(sub, 'process')) processItems++;
                if (isItemInTab(sub, 'aftermarket')) aftermarketItems++;
                if (sub.category === 'Rejected') {
                    rejectedItems++;
                    reservedTotal += Number(sub.reservedInProcess || 0);
                }
            });
        });

        return { processItems, aftermarketItems, rejectedItems, reservedTotal };
    }, [groups]);

    // Filter groups so only groups containing items for the active tab (plus empty groups on 'all') appear
    const filteredGroups = useMemo(() => {
        const term = searchTerm.toLowerCase();

        return groups
            .map(g => {
                const tabSubItems = (g.subItems || []).filter(sub => isItemInTab(sub, inventoryTab));
                return {
                    ...g,
                    displaySubItems: tabSubItems
                };
            })
            .filter(g => {
                if (inventoryTab !== 'all' && g.displaySubItems.length === 0) return false;

                if (!term) return true;
                const matchesGroup =
                    g.groupName?.toLowerCase().includes(term) ||
                    g.groupId?.toLowerCase().includes(term);
                const matchesSubItem = g.displaySubItems.some(
                    sub =>
                        sub.itemCode?.toLowerCase().includes(term) ||
                        sub.name?.toLowerCase().includes(term) ||
                        sub.category?.toLowerCase().includes(term)
                );
                return matchesGroup || matchesSubItem;
            });
    }, [groups, inventoryTab, searchTerm]);

    // Flat list of Rejected / Rework items for the Rejected Pool tab
    const rejectedPoolItems = useMemo(() => {
        const list = [];
        groups.forEach(g => {
            (g.subItems || []).forEach(sub => {
                if (sub.category === 'Rejected') {
                    list.push({
                        ...sub,
                        groupName: g.groupName,
                        groupObj: g
                    });
                }
            });
        });
        return list;
    }, [groups]);

    return (
        <div className="space-y-6 pb-16">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                        <Package className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Master Inventory</h1>
                        <p className="text-sm text-slate-500">
                            Godown 1: Process Materials & Rejected Rework • Godown 2: After-Market & Finished Goods
                        </p>
                    </div>
                </div>
                <PermissionGuard module="inventory" action={ACTIONS.ADD}>
                    <button
                        onClick={() => onNavigate('form')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
                    >
                        <Plus className="w-4 h-4" /> New Group
                    </button>
                </PermissionGuard>
            </div>

            {/* Inventory Type Tabs (Problem 4: Process vs After-Market + Problem 3: Rejected Pool) */}
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-4">
                <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl">
                    <button
                        onClick={() => setInventoryTab('process')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${inventoryTab === 'process'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-800'
                            }`}
                    >
                        <Factory className="w-4 h-4" />
                        1. Process Inventory ({tabStats.processItems})
                    </button>

                    <button
                        onClick={() => setInventoryTab('aftermarket')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${inventoryTab === 'aftermarket'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-800'
                            }`}
                    >
                        <ShoppingBag className="w-4 h-4" />
                        2. After-Market Inventory ({tabStats.aftermarketItems})
                    </button>

                    <button
                        onClick={() => setInventoryTab('rejected')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${inventoryTab === 'rejected'
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-800'
                            }`}
                    >
                        <RotateCcw className="w-4 h-4" />
                        Rejected / Rework Pool ({tabStats.rejectedItems})
                        {tabStats.reservedTotal > 0 && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px]">
                                {tabStats.reservedTotal} Reserved
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setInventoryTab('all')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${inventoryTab === 'all'
                                ? 'bg-slate-800 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-800'
                            }`}
                    >
                        <Layers className="w-4 h-4" />
                        All Groups ({groups.length})
                    </button>
                </div>

                <div className="relative w-80">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search Group, SKU Code, or Item Name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Category Legend Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                <div>
                    {inventoryTab === 'process' && (
                        <span>
                            <strong>🏭 Process Inventory (Factory Store):</strong> Raw Materials, In-House Semi-Finished Parts, Components, Consumables & Rejected Rework Stock used inside manufacturing.
                        </span>
                    )}
                    {inventoryTab === 'aftermarket' && (
                        <span>
                            <strong>🛒 After-Market Inventory (Market Store):</strong> Bought-out hardware items (screws, springs, packing boxes) & Finished Goods ready for dispatch.
                        </span>
                    )}
                    {inventoryTab === 'rejected' && (
                        <span>
                            <strong>🔄 Rejected / Rework Stock:</strong> Pieces reserved in an active Process stay in stock as <em>"Reserved (In Process)"</em> and are permanently deducted only when the order is <strong>Dispatched</strong>.
                        </span>
                    )}
                    {inventoryTab === 'all' && (
                        <span>Showing all Master Inventory groups across Process and After-Market stores.</span>
                    )}
                </div>
            </div>

            {/* Dedicated Table View when on Rejected / Rework Pool Tab */}
            {inventoryTab === 'rejected' && (
                <div className="bg-white rounded-xl border border-amber-200 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 bg-amber-50/70 border-b border-amber-100 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-amber-900 uppercase tracking-wider">
                            Rejected & Rework Stock Register (Provisional Soft-Hold Tracking)
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                    <th className="p-4">SKU / Item Code</th>
                                    <th className="p-4">Item Name</th>
                                    <th className="p-4">Group</th>
                                    <th className="p-4 text-right">Total Physical Stock</th>
                                    <th className="p-4 text-right">Used in Process (Soft-Hold)</th>
                                    <th className="p-4 text-right">Net Available to Use</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rejectedPoolItems.map(item => {
                                    const total = Number(item.stock || 0);
                                    const reserved = Number(item.reservedInProcess || 0);
                                    const available = Math.max(0, total - reserved);
                                    return (
                                        <tr key={item._id || item.itemCode} className="hover:bg-slate-50">
                                            <td className="p-4 font-bold text-red-600">{item.itemCode}</td>
                                            <td className="p-4 text-sm font-semibold text-slate-800">{item.name}</td>
                                            <td className="p-4 text-sm text-slate-500">{item.groupName}</td>
                                            <td className="p-4 text-right text-sm font-bold text-slate-800">
                                                {total} {item.uom}
                                            </td>
                                            <td className="p-4 text-right">
                                                {reserved > 0 ? (
                                                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                                                        🟡 {reserved} {item.uom} (In Process)
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">0 {item.uom}</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${available > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {available} {item.uom} Available
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => onNavigate('detail', item.groupObj)}
                                                    className="text-xs font-bold text-indigo-600 hover:underline"
                                                >
                                                    Open Group →
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {rejectedPoolItems.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-slate-400">
                                            No rejected items currently in inventory. Add an item with Category "Rejected / Rework" to track reusable scrap/rework stock.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Group Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredGroups.map(group => {
                    const itemsToCount = group.displaySubItems || group.subItems || [];
                    const groupValue =
                        itemsToCount.reduce(
                            (total, item) => total + Number(item.stock || 0) * Number(item.unitCost || 0),
                            0
                        ) || 0;
                    const reservedInGroup = itemsToCount.reduce(
                        (sum, item) => sum + Number(item.reservedInProcess || 0),
                        0
                    );

                    return (
                        <div
                            key={group._id}
                            onClick={() => onNavigate('detail', group)}
                            className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <Package className="w-5 h-5" />
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {reservedInGroup > 0 && (
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                                            🟡 {reservedInGroup} In Process
                                        </span>
                                    )}
                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded uppercase tracking-wider">
                                        {group.groupId}
                                    </span>
                                </div>
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg mb-1 truncate">
                                {group.groupName}
                            </h3>
                            <p className="text-sm text-slate-500 mb-4">
                                {itemsToCount.length} Item(s) in this view
                            </p>
                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                                    Valuation
                                </span>
                                <span className="text-sm font-bold text-indigo-600 flex items-center">
                                    <IndianRupee className="w-3 h-3 mr-0.5" />
                                    {groupValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    );
                })}
                {filteredGroups.length === 0 && (
                    <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                        No inventory groups match this tab or search filter.
                    </div>
                )}
            </div>
        </div>
    );
}

// ==========================================
// 2. DETAIL VIEW (Shows Physical Stock, Reserved In Process & Net Available)
// ==========================================
function InventoryDetail({ group, onNavigate, onDelete }) {
    if (!group) return null;

    const groupValue =
        group.subItems?.reduce(
            (total, item) => total + Number(item.stock || 0) * Number(item.unitCost || 0),
            0
        ) || 0;

    return (
        <div className="space-y-6 pb-16">
            <div className="flex justify-between items-center bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 text-sm">
                    <button
                        onClick={() => onNavigate('list')}
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span
                        className="text-slate-400 cursor-pointer hover:text-slate-600"
                        onClick={() => onNavigate('list')}
                    >
                        Master Inventory
                    </span>
                    <span className="text-slate-300">›</span>
                    <span className="font-bold text-slate-800 text-lg">{group.groupName}</span>
                </div>
                <div className="flex items-center gap-3">
                    <PermissionGuard module="inventory" action={ACTIONS.EDIT}>
                        <button
                            onClick={() => onNavigate('form', group)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
                        >
                            <Edit2 className="w-4 h-4" /> Edit Group & Items
                        </button>
                    </PermissionGuard>
                    <PermissionGuard module="inventory" action={ACTIONS.DELETE}>
                        <button
                            onClick={() => onDelete(group._id, group.groupName)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" /> Delete
                        </button>
                    </PermissionGuard>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6 self-start">
                    <div className="w-16 h-16 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                        <Package className="w-8 h-8" />
                    </div>
                    <InfoRow label="Group Name" value={group.groupName} />
                    <InfoRow label="Group ID Code" value={group.groupId} />
                    <InfoRow
                        label="Total Valuation"
                        value={`₹ ${groupValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
                        isHighlight
                    />
                    <InfoRow label="Description" value={group.details} />
                </div>

                <div className="col-span-1 lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                            Inventory Items ({group.subItems?.length || 0})
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <th className="p-4">SKU / Code</th>
                                    <th className="p-4">Item Details</th>
                                    <th className="p-4 text-center">Store / Category</th>
                                    <th className="p-4 text-right">Unit Cost</th>
                                    <th className="p-4 text-right">Physical Stock</th>
                                    <th className="p-4 text-right">Net Available</th>
                                    <th className="p-4 text-right">Total Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {group.subItems?.map((item) => {
                                    const stock = Number(item.stock || 0);
                                    const reserved = Number(item.reservedInProcess || 0);
                                    const netAvailable = Math.max(0, stock - reserved);
                                    const value = stock * Number(item.unitCost || 0);
                                    const badgeStyle =
                                        CATEGORY_BADGE_STYLES[item.category] ||
                                        'bg-slate-100 text-slate-700';
                                    const storeType =
                                        item.inventoryType ||
                                        (AFTERMARKET_CATEGORIES.includes(item.category) ? 'aftermarket' : 'process');

                                    return (
                                        <tr key={item._id || item.itemCode} className="hover:bg-slate-50">
                                            <td className="p-4 font-bold text-indigo-600 text-sm">
                                                {item.itemCode || '-'}
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm font-bold text-slate-800">
                                                    {item.name}
                                                </div>
                                                {item.details && (
                                                    <div className="text-xs text-slate-500">
                                                        {item.details}
                                                    </div>
                                                )}
                                                {reserved > 0 && (
                                                    <span className="mt-1 inline-block px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                                                        🟡 {reserved} {item.uom} Used in Active Process (Pending Dispatch)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span
                                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}
                                                >
                                                    {item.category || 'Raw Material'}
                                                </span>
                                                <span className="block text-[10px] text-slate-400 font-semibold uppercase mt-1">
                                                    {storeType === 'aftermarket' ? '🛒 After-Market' : '🏭 Process Store'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm font-semibold text-slate-600 text-right">
                                                ₹{Number(item.unitCost || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td className="p-4 text-sm font-bold text-slate-800 text-right">
                                                {stock}{' '}
                                                <span className="text-xs text-slate-400 font-medium">
                                                    {item.uom}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm font-bold text-emerald-700 text-right">
                                                {netAvailable}{' '}
                                                <span className="text-xs text-slate-400 font-medium">
                                                    {item.uom}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm font-bold text-indigo-600 text-right">
                                                ₹{value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

const InfoRow = ({ label, value, isHighlight }) => (
    <div className="flex flex-col gap-1.5 pb-4 border-b border-slate-50 last:border-0 last:pb-0">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <span
            className={`text-sm ${isHighlight ? 'font-bold text-indigo-600 text-xl' : 'font-semibold text-slate-800'
                }`}
        >
            {value || '-'}
        </span>
    </div>
);

// ==========================================
// 3. FORM VIEW (Supports Process vs After-Market & Rejected Category)
// ==========================================
const INITIAL_SUB_ITEM = {
    itemCode: '',
    name: '',
    category: 'Raw Material',
    inventoryType: 'process',
    details: '',
    stock: 0,
    reservedInProcess: 0,
    uom: 'Pcs',
    unitCost: 0
};

function InventoryForm({ group, onNavigate, onSave, isSaving }) {
    const isEditing = !!group;
    const { showToast } = useFeedback();

    const [formData, setFormData] = useState(() => {
        if (group) {
            return {
                ...group,
                subItems:
                    group.subItems?.length > 0
                        ? group.subItems
                        : [{ ...INITIAL_SUB_ITEM, id: generateId() }]
            };
        }
        return {
            _id: '',
            groupId: '',
            groupName: '',
            details: '',
            subItems: [{ ...INITIAL_SUB_ITEM, id: generateId() }]
        };
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubItemChange = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            subItems: prev.subItems.map(item => {
                if (item._id !== id && item.id !== id) return item;
                const updated = {
                    ...item,
                    [field]: field === 'itemCode' ? value.toUpperCase() : value
                };
                // Auto-sync inventoryType when category changes
                if (field === 'category') {
                    updated.inventoryType = AFTERMARKET_CATEGORIES.includes(value)
                        ? 'aftermarket'
                        : 'process';
                }
                return updated;
            })
        }));
    };

    const handleSubmit = () => {
        if (!formData.groupName?.trim()) {
            showToast('Group Name is required', 'warning');
            return;
        }

        const validSubItems = formData.subItems.filter(
            item => item.itemCode?.trim() && item.name?.trim()
        );

        if (validSubItems.length === 0) {
            showToast('Please enter at least one item with an Item Code and Name', 'warning');
            return;
        }

        onSave({
            ...formData,
            subItems: validSubItems
        });
    };

    return (
        <div className="space-y-6 pb-24">
            <div className="flex justify-between items-center bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm sticky top-4 z-10">
                <div className="flex items-center gap-3 text-sm">
                    <button
                        onClick={() => onNavigate(isEditing ? 'detail' : 'list', group)}
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-slate-400">Inventory</span>
                    <span className="text-slate-300">›</span>
                    <span className="font-bold text-slate-800 text-lg">
                        {isEditing ? group.groupName : 'New Master Group'}
                    </span>
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => onNavigate(isEditing ? 'detail' : 'list', group)}
                        className="px-6 py-2 bg-white border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={isSaving}
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Group
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormInput
                    label="Group Name (e.g., Brass Sub-Parts, Fasteners, Rejected Rework)"
                    name="groupName"
                    value={formData.groupName}
                    onChange={handleInputChange}
                    required
                />
                <FormInput
                    label="Group Code ID"
                    name="groupId"
                    value={formData.groupId}
                    onChange={handleInputChange}
                    placeholder="Auto-generated if blank"
                />
                <div className="md:col-span-2">
                    <label className="text-sm font-bold text-slate-600 block mb-2">Description</label>
                    <input
                        type="text"
                        name="details"
                        value={formData.details || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                        Item Master Data
                    </h2>
                    <button
                        type="button"
                        onClick={() =>
                            setFormData(p => ({
                                ...p,
                                subItems: [...p.subItems, { ...INITIAL_SUB_ITEM, id: generateId() }]
                            }))
                        }
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Add Item
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <th className="p-4 w-36">Item Code (SKU)</th>
                                <th className="p-4 w-60">Item Name & Specs</th>
                                <th className="p-4 w-48">Category</th>
                                <th className="p-4 w-40">Inventory Store</th>
                                <th className="p-4 w-28">UOM</th>
                                <th className="p-4 w-28">Unit Cost (₹)</th>
                                <th className="p-4 w-28">Stock</th>
                                <th className="p-4 w-12 text-center">Act</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {formData.subItems.map((item) => {
                                const rowId = item._id || item.id;
                                const invType =
                                    item.inventoryType ||
                                    (AFTERMARKET_CATEGORIES.includes(item.category) ? 'aftermarket' : 'process');

                                return (
                                    <tr key={rowId} className="hover:bg-slate-50">
                                        <td className="p-2">
                                            <input
                                                type="text"
                                                value={item.itemCode || ''}
                                                onChange={(e) =>
                                                    handleSubItemChange(rowId, 'itemCode', e.target.value)
                                                }
                                                placeholder="e.g. R-001"
                                                className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 uppercase font-bold text-indigo-700"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="text"
                                                value={item.name || ''}
                                                onChange={(e) =>
                                                    handleSubItemChange(rowId, 'name', e.target.value)
                                                }
                                                placeholder="e.g. Round Dabi / Grub Screw"
                                                className="w-full px-3 py-2 text-sm border rounded-t-lg outline-none focus:ring-1 focus:ring-indigo-500 font-semibold mb-1"
                                            />
                                            <input
                                                type="text"
                                                value={item.details || ''}
                                                onChange={(e) =>
                                                    handleSubItemChange(rowId, 'details', e.target.value)
                                                }
                                                placeholder="Specs/Dimensions"
                                                className="w-full px-3 py-1.5 text-xs bg-slate-50 border rounded-b-lg outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <select
                                                value={item.category || 'Raw Material'}
                                                onChange={(e) =>
                                                    handleSubItemChange(rowId, 'category', e.target.value)
                                                }
                                                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-white font-medium"
                                            >
                                                <optgroup label="Process Inventory (Factory)">
                                                    <option value="Raw Material">Raw Material</option>
                                                    <option value="Semi-Finished">Semi-Finished (In-House)</option>
                                                    <option value="Component">Component</option>
                                                    <option value="Consumable">Consumable</option>
                                                    <option value="Rejected">Rejected / Rework Stock</option>
                                                </optgroup>
                                                <optgroup label="After-Market Inventory">
                                                    <option value="After-Market">After-Market (Bought-Out)</option>
                                                    <option value="Finished Good">Finished Good</option>
                                                </optgroup>
                                            </select>
                                        </td>
                                        <td className="p-2">
                                            <select
                                                value={invType}
                                                onChange={(e) =>
                                                    handleSubItemChange(rowId, 'inventoryType', e.target.value)
                                                }
                                                className={`w-full px-3 py-2.5 text-xs border rounded-lg outline-none font-bold uppercase ${invType === 'aftermarket'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                                    }`}
                                            >
                                                <option value="process">🏭 Process Store</option>
                                                <option value="aftermarket">🛒 After-Market</option>
                                            </select>
                                        </td>
                                        <td className="p-2">
                                            <select
                                                value={item.uom || 'Pcs'}
                                                onChange={(e) =>
                                                    handleSubItemChange(rowId, 'uom', e.target.value)
                                                }
                                                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-white font-medium"
                                            >
                                                <option value="Pcs">Pcs</option>
                                                <option value="Kg">Kg</option>
                                                <option value="Set">Set</option>
                                                <option value="Box">Box</option>
                                                <option value="Mtrs">Mtrs</option>
                                                <option value="Ltrs">Ltrs</option>
                                            </select>
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={item.unitCost}
                                                onChange={(e) =>
                                                    handleSubItemChange(rowId, 'unitCost', Number(e.target.value))
                                                }
                                                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-slate-700"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                value={item.stock}
                                                onChange={(e) =>
                                                    handleSubItemChange(rowId, 'stock', Number(e.target.value))
                                                }
                                                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-slate-700"
                                            />
                                        </td>
                                        <td className="p-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFormData(p => ({
                                                        ...p,
                                                        subItems: p.subItems.filter(
                                                            i => i._id !== rowId && i.id !== rowId
                                                        )
                                                    }))
                                                }
                                                disabled={formData.subItems.length === 1}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const FormInput = ({ label, name, type = 'text', value, onChange, placeholder, required }) => (
    <div>
        <label className="text-sm font-bold text-slate-600 block mb-2">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            name={name}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
        />
    </div>
);