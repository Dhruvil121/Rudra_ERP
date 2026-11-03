import { useState, useMemo } from 'react';
import {
    Search, Plus, Edit2, Trash2, ArrowLeft, Package,
    Loader2, IndianRupee, Factory, ShoppingBag, RotateCcw, Layers,
    Scale, Calculator, ArrowRight, Check, X, Sparkles, RefreshCw, FileSpreadsheet, AlertTriangle, Boxes
} from 'lucide-react';
import { PermissionGuard } from '../components/auth/PermissionGuard';
import { ACTIONS } from '../context/AuthContext';
import { useInventory, useSaveInventory, useDeleteInventory, useQuickAddInventoryItem } from '../hooks/useInventoryData';
import { useFeedback } from '../context/FeedbackContext';
import { useBOMs } from '../hooks/useBOMMasterData';

const generateId = () => Math.random().toString(36).substring(2, 10);

const PROCESS_CATEGORIES = ['Raw Material', 'Semi-Finished', 'Component', 'Consumable', 'Rejected'];
const AFTERMARKET_CATEGORIES = ['After-Market', 'Packaging', 'Finished Good'];

const CATEGORY_BADGE_STYLES = {
    'Raw Material': 'bg-orange-100 text-orange-700',
    'Semi-Finished': 'bg-blue-100 text-blue-700',
    'After-Market': 'bg-emerald-100 text-emerald-700',
    'Packaging': 'bg-amber-100 text-amber-800 border border-amber-200',
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
    const [calcModalData, setCalcModalData] = useState(null); // { item, group, onRowApply }

    const { data: inventoryGroups = [], isLoading } = useInventory();
    const { data: boms = [] } = useBOMs();
    const saveMutation = useSaveInventory();
    const deleteMutation = useDeleteInventory();
    const { showConfirm, showToast } = useFeedback();

    const handleNavigate = (newView, group = null) => {
        setSelectedGroup(group);
        setView(newView);
    };

    const handleOpenCalc = (item = null, group = null, onRowApply = null) => {
        setCalcModalData({ item, group, onRowApply });
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
                    onOpenCalc={handleOpenCalc}
                />
            )}
            {view === 'detail' && (
                <InventoryDetail
                    group={
                        inventoryGroups.find(g => g._id === selectedGroup?._id) || selectedGroup
                    }
                    onNavigate={handleNavigate}
                    onDelete={handleDelete}
                    onOpenCalc={handleOpenCalc}
                />
            )}
            {view === 'form' && (
                <InventoryForm
                    group={selectedGroup}
                    onNavigate={handleNavigate}
                    onSave={handleSaveGroup}
                    isSaving={saveMutation.isPending}
                    onOpenCalc={handleOpenCalc}
                />
            )}

            {/* Global Weight ⇄ Pieces Conversion Tool */}
            {calcModalData && (
                <InventoryWeightCalculatorModal
                    isOpen={!!calcModalData}
                    onClose={() => setCalcModalData(null)}
                    initialItem={calcModalData.item}
                    initialGroup={calcModalData.group}
                    onRowApply={calcModalData.onRowApply}
                    groups={inventoryGroups}
                    boms={boms}
                    onSaveItemWeight={async (groupId, itemId, { stock, weightPer1000, totalWeightKg }) => {
                        const grp = inventoryGroups.find(g => g._id === groupId);
                        if (!grp) return;
                        const updatedSubItems = (grp.subItems || []).map(sub => {
                            if ((sub._id || sub.id) === itemId || sub.itemCode === itemId) {
                                return {
                                    ...sub,
                                    stock: Number(stock),
                                    weightPer1000: Number(weightPer1000),
                                    totalWeightKg: Number(totalWeightKg)
                                };
                            }
                            return sub;
                        });
                        await saveMutation.mutateAsync({ ...grp, subItems: updatedSubItems });
                        showToast(`Updated stock to ${stock} Pcs (${totalWeightKg} KG)!`, 'success');
                        setCalcModalData(null);
                    }}
                    showToast={showToast}
                />
            )}
        </div>
    );
}

// ==========================================
// 1. LIST VIEW (With Process vs After-Market & Rejected Pool Tabs)
// ==========================================
function InventoryList({ groups, onNavigate, onOpenCalc }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [inventoryTab, setInventoryTab] = useState('all'); // 'all' | 'aftermarket' | 'packaging' | 'process' | 'rejected'
    const [viewMode, setViewMode] = useState('excel'); // 'excel' (Image 2 & 4 style) or 'groups'
    const [excelFilter, setExcelFilter] = useState('all'); // 'all' | 'fitting' | 'packaging' | 'raw' | 'low_stock'
    const quickAddMutation = useQuickAddInventoryItem();
    const saveGroupMutation = useSaveInventory();
    const { showConfirm, showToast } = useFeedback();

    // Edit Flat Item modal state
    const [editingFlatItem, setEditingFlatItem] = useState(null);

    const handleStartEditFlatItem = (item) => {
        setEditingFlatItem({
            groupId: item.groupId,
            itemId: item._id || item.id,
            itemCode: item.itemCode,
            name: item.name,
            category: item.category,
            stock: item.stock || 0,
            unitCost: item.unitCost || 0,
            weightPer1000: item.weightPer1000 || 0,
            totalWeightKg: item.totalWeightKg || 0,
            uom: item.uom || 'Pcs'
        });
    };

    const handleSaveFlatItemEdit = async (e) => {
        e?.preventDefault();
        if (!editingFlatItem) return;
        try {
            const grp = groups.find(g => g._id === editingFlatItem.groupId);
            if (!grp) {
                showToast('Group not found', 'error');
                return;
            }
            const updatedSubItems = (grp.subItems || []).map(sub => {
                if ((sub._id || sub.id) === editingFlatItem.itemId || sub.itemCode === editingFlatItem.itemCode) {
                    const isRaw = editingFlatItem.category === 'Raw Material';
                    const stock = Number(editingFlatItem.stock) || 0;
                    const wt1k = isRaw ? Number(editingFlatItem.weightPer1000) || 0 : 0;
                    const totKg = isRaw && wt1k > 0 ? Number(((stock * wt1k) / 1000).toFixed(2)) : 0;
                    return {
                        ...sub,
                        name: editingFlatItem.name.trim(),
                        category: editingFlatItem.category,
                        stock,
                        unitCost: Number(editingFlatItem.unitCost) || 0,
                        weightPer1000: wt1k,
                        totalWeightKg: totKg,
                        uom: editingFlatItem.uom || 'Pcs'
                    };
                }
                return sub;
            });

            await saveGroupMutation.mutateAsync({ ...grp, subItems: updatedSubItems });
            showToast(`Updated "${editingFlatItem.name}" successfully!`, 'success');
            setEditingFlatItem(null);
        } catch (err) {
            showToast(err.message || 'Failed to update item', 'error');
        }
    };

    const handleDeleteFlatItem = async (item) => {
        const ok = await showConfirm({
            title: 'Delete Item',
            message: `Are you sure you want to delete "${item.name}" (${item.category}) from inventory?`,
            type: 'danger',
            confirmText: 'Delete'
        });
        if (!ok) return;

        try {
            const grp = groups.find(g => g._id === item.groupId);
            if (!grp) {
                showToast('Parent group not found', 'error');
                return;
            }
            const updatedSubItems = (grp.subItems || []).filter(
                sub => (sub._id || sub.id) !== (item._id || item.id) && sub.itemCode !== item.itemCode
            );
            await saveGroupMutation.mutateAsync({ ...grp, subItems: updatedSubItems });
            showToast(`Deleted "${item.name}" from inventory`, 'success');
        } catch (err) {
            showToast(err.message || 'Failed to delete item', 'error');
        }
    };

    // Fast inline add row state (No group name required!)
    const [inlineItem, setInlineItem] = useState({
        name: '',
        category: 'After-Market',
        stock: 0,
        unitCost: 0,
        weightPer1000: 0,
        uom: 'Pcs'
    });

    const handleFastInlineAdd = async () => {
        if (!inlineItem.name.trim()) {
            showToast('Please enter an Item Name / Particulars', 'warning');
            return;
        }
        const prefix = inlineItem.category === 'Packaging' ? 'PKG-' : inlineItem.category === 'After-Market' ? 'AM-' : 'RM-';
        const itemCode = `${prefix}${Math.floor(100 + Math.random() * 900)}`;

        try {
            await quickAddMutation.mutateAsync({
                groupId: 'COMMON_STORE',
                item: {
                    itemCode,
                    name: inlineItem.name.trim(),
                    category: inlineItem.category,
                    stock: Number(inlineItem.stock) || 0,
                    unitCost: Number(inlineItem.unitCost) || 0,
                    weightPer1000: Number(inlineItem.weightPer1000) || 0,
                    totalWeightKg: inlineItem.weightPer1000 > 0 && inlineItem.stock > 0
                        ? Number(((Number(inlineItem.stock) * Number(inlineItem.weightPer1000)) / 1000).toFixed(2))
                        : 0,
                    uom: inlineItem.uom || 'Pcs'
                }
            });
            showToast(`Added "${inlineItem.name}" to Inventory without group name!`, 'success');
            setInlineItem({
                name: '',
                category: inlineItem.category,
                stock: 0,
                unitCost: 0,
                weightPer1000: 0,
                uom: 'Pcs'
            });
        } catch (err) {
            showToast(err.message || 'Failed to add item', 'error');
        }
    };

    // Flatten all items across all groups for high-density Excel Sheet View
    const allFlatItems = useMemo(() => {
        const list = [];
        groups.forEach(g => {
            (g.subItems || []).forEach(sub => {
                list.push({
                    ...sub,
                    groupName: g.groupName,
                    groupId: g._id,
                    groupObj: g
                });
            });
        });
        return list;
    }, [groups]);

    // Filtered flat items for Excel Sheet view
    const filteredFlatItems = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return allFlatItems.filter(item => {
            const matchesSearch = !term ||
                item.name?.toLowerCase().includes(term) ||
                item.itemCode?.toLowerCase().includes(term) ||
                item.category?.toLowerCase().includes(term);
            if (!matchesSearch) return false;

            if (excelFilter === 'fitting') return item.category === 'After-Market';
            if (excelFilter === 'packaging') return item.category === 'Packaging';
            if (excelFilter === 'raw') return item.category === 'Raw Material' || item.category === 'Semi-Finished' || item.category === 'Component';
            if (excelFilter === 'low_stock') return Number(item.stock || 0) <= 50;
            return true;
        });
    }, [allFlatItems, searchTerm, excelFilter]);

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
                <div className="flex items-center gap-2.5">
                    {/* View Switch: Excel Sheet vs Grouped Cards */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setViewMode('excel')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                viewMode === 'excel'
                                    ? 'bg-white text-indigo-700 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel Sheet View
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('groups')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                viewMode === 'groups'
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5" /> Grouped Cards
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => onOpenCalc && onOpenCalc(null, null)}
                        className="flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-bold rounded-lg shadow-sm transition-colors"
                        title="Open Weight to Pieces Conversion Calculator"
                    >
                        <Scale className="w-4 h-4" /> ⚖️ Weight ⇄ Pieces Calculator
                    </button>

                    <PermissionGuard module="inventory" action={ACTIONS.ADD}>
                        <button
                            onClick={() => onNavigate('form')}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
                        >
                            <Plus className="w-4 h-4" /> New Group
                        </button>
                    </PermissionGuard>
                </div>
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

            {/* EXCEL SHEET VIEW (IMAGE 2 & 4 FORMAT) */}
            {viewMode === 'excel' && (
                <div className="space-y-4">
                    {/* Fast Inline Add Item (No Group Required!) */}
                    <div className="bg-gradient-to-r from-indigo-50/80 via-blue-50/60 to-slate-50 p-4 rounded-xl border border-indigo-200 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                Direct Item Quick-Add
                            </span>
                            <span className="text-[11px] text-indigo-700 font-semibold">
                                Automatically assigns to Common Inventory Store
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-6 lg:grid-cols-12 gap-2 items-center">
                            <div className={`sm:col-span-3 ${inlineItem.category === 'Raw Material' ? 'lg:col-span-4' : 'lg:col-span-5'}`}>
                                <input
                                    type="text"
                                    value={inlineItem.name}
                                    onChange={(e) => setInlineItem(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Particulars (e.g. PVC RING, CLOTH BAG, SPRING)..."
                                    className="w-full px-3 py-2 text-xs font-semibold border border-indigo-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                                />
                            </div>
                            <div className="sm:col-span-3 lg:col-span-2">
                                <select
                                    value={inlineItem.category}
                                    onChange={(e) => setInlineItem(p => ({ ...p, category: e.target.value }))}
                                    className="w-full px-2.5 py-2 text-xs font-bold border border-indigo-200 rounded-lg bg-white outline-none text-slate-700"
                                >
                                    <option value="After-Market">Bolt & Fitting (AM)</option>
                                    <option value="Packaging">Packaging (Paking)</option>
                                    <option value="Raw Material">Raw Material</option>
                                    <option value="Semi-Finished">Semi-Finished</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2 lg:col-span-2">
                                <input
                                    type="number"
                                    min="0"
                                    value={inlineItem.stock || ''}
                                    onChange={(e) => setInlineItem(p => ({ ...p, stock: e.target.value }))}
                                    placeholder="Stock (Pcs)"
                                    className="w-full px-2.5 py-2 text-xs font-bold text-center border border-indigo-200 rounded-lg bg-white outline-none"
                                />
                            </div>
                            <div className={`sm:col-span-2 ${inlineItem.category === 'Raw Material' ? 'lg:col-span-1' : 'lg:col-span-1'}`}>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={inlineItem.unitCost || ''}
                                    onChange={(e) => setInlineItem(p => ({ ...p, unitCost: e.target.value }))}
                                    placeholder="Rate (₹)"
                                    className="w-full px-2 py-2 text-xs font-semibold text-right border border-indigo-200 rounded-lg bg-white outline-none"
                                />
                            </div>
                            {inlineItem.category === 'Raw Material' && (
                                <div className="sm:col-span-2 lg:col-span-1">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={inlineItem.weightPer1000 || ''}
                                        onChange={(e) => setInlineItem(p => ({ ...p, weightPer1000: e.target.value }))}
                                        placeholder="1k Wt (kg)"
                                        className="w-full px-2 py-2 text-xs text-center border border-amber-300 rounded-lg bg-amber-50/50 outline-none font-bold text-amber-900"
                                    />
                                </div>
                            )}
                            <div className={`sm:col-span-6 ${inlineItem.category === 'Raw Material' ? 'lg:col-span-2' : 'lg:col-span-2'}`}>
                                <button
                                    type="button"
                                    disabled={quickAddMutation.isPending}
                                    onClick={handleFastInlineAdd}
                                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg shadow-sm transition-all"
                                >
                                    {quickAddMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                    + Add Item
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Excel Table Filter Tabs */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                onClick={() => setExcelFilter('all')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    excelFilter === 'all'
                                        ? 'bg-slate-800 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                All Items ({allFlatItems.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setExcelFilter('fitting')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    excelFilter === 'fitting'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                }`}
                            >
                                Bolt & Fitting Kit ({allFlatItems.filter(i => i.category === 'After-Market').length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setExcelFilter('packaging')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    excelFilter === 'packaging'
                                        ? 'bg-amber-600 text-white shadow-xs'
                                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                                }`}
                            >
                                Packaging - Paking ({allFlatItems.filter(i => i.category === 'Packaging').length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setExcelFilter('raw')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    excelFilter === 'raw'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                                }`}
                            >
                                Raw Materials & Factory ({allFlatItems.filter(i => ['Raw Material', 'Semi-Finished', 'Component'].includes(i.category)).length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setExcelFilter('low_stock')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    excelFilter === 'low_stock'
                                        ? 'bg-red-600 text-white shadow-xs'
                                        : 'bg-red-50 text-red-800 hover:bg-red-100'
                                }`}
                            >
                                ⚠️ Low / Out of Stock ({allFlatItems.filter(i => Number(i.stock || 0) <= 50).length})
                            </button>
                        </div>

                        <div className="text-xs text-slate-500 font-semibold">
                            Showing <strong className="text-slate-800 font-bold">{filteredFlatItems.length}</strong> items
                        </div>
                    </div>

                    {/* Spreadsheet Table (Matches Image 2 & 4) */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 border-b border-slate-300 text-xs font-black text-slate-700 uppercase tracking-wider">
                                    <th className="p-3 w-12 text-center">NO.</th>
                                    <th className="p-3 min-w-[200px]">Particulars (Item Name)</th>
                                    <th className="p-3 w-36">Category</th>
                                    <th className="p-3 w-28 text-center">QTY / Stock</th>
                                    <th className="p-3 w-28 text-right">Rate (₹)</th>
                                    <th className="p-3 w-32 text-right">Total (₹)</th>
                                    <th className="p-3 w-28 text-center">Weight (KG)</th>
                                    <th className="p-3 w-24 text-center">Status</th>
                                    <th className="p-3 w-20 text-center">Act</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {filteredFlatItems.map((item, idx) => {
                                    const stock = Number(item.stock || 0);
                                    const rate = Number(item.unitCost || 0);
                                    const total = Number((stock * rate).toFixed(2));
                                    const isOutOfStock = stock <= 0;
                                    const isLow = stock > 0 && stock <= 50;

                                    return (
                                        <tr key={item._id || idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-3 text-center text-xs font-bold text-slate-400">
                                                {idx + 1}
                                            </td>
                                            <td className="p-3">
                                                <div className="text-sm font-bold text-slate-900">{item.name}</div>
                                                <div className="text-[11px] text-slate-400 font-mono">{item.itemCode} • {item.groupName}</div>
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                    CATEGORY_BADGE_STYLES[item.category] || 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className="text-sm font-black text-slate-800">
                                                    {stock.toLocaleString('en-IN')}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-normal ml-1">{item.uom || 'Pcs'}</span>
                                            </td>
                                            <td className="p-3 text-right text-sm font-semibold text-slate-700">
                                                ₹{rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-3 text-right text-sm font-black text-indigo-700">
                                                ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-3 text-center text-xs">
                                                {item.category === 'Raw Material' ? (
                                                    Number(item.totalWeightKg) > 0 ? (
                                                        <span className="font-bold text-amber-800">{item.totalWeightKg} KG</span>
                                                    ) : Number(item.weightPer1000) > 0 ? (
                                                        <span className="text-slate-500 font-medium">{item.weightPer1000}kg/1k</span>
                                                    ) : '-'
                                                ) : (
                                                    <span className="text-slate-300 font-mono">-</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                {isOutOfStock ? (
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-full">
                                                        Out of Stock
                                                    </span>
                                                ) : isLow ? (
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full">
                                                        Low Stock
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full">
                                                        In Stock
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {item.category === 'Raw Material' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onOpenCalc && onOpenCalc(item, item.groupObj)}
                                                            className="p-1.5 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors"
                                                            title="Weight ⇄ Pieces Calculator (Raw Material)"
                                                        >
                                                            <Scale className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStartEditFlatItem(item)}
                                                        className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                                                        title="Edit Item"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteFlatItem(item)}
                                                        className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                                        title="Delete Item"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredFlatItems.length === 0 && (
                                    <tr>
                                        <td colSpan="9" className="p-8 text-center text-slate-400">
                                            No inventory items match the selected filter. Use the bar above to add an item directly!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {filteredFlatItems.length > 0 && (
                                <tfoot>
                                    <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-800 text-xs">
                                        <td colSpan="3" className="p-3 uppercase">Total Valuation Summary:</td>
                                        <td className="p-3 text-center text-sm font-black text-slate-900">
                                            {filteredFlatItems.reduce((sum, i) => sum + Number(i.stock || 0), 0).toLocaleString('en-IN')} Pcs
                                        </td>
                                        <td className="p-3 text-right">-</td>
                                        <td className="p-3 text-right text-sm font-black text-indigo-700">
                                            ₹{filteredFlatItems.reduce((sum, i) => sum + (Number(i.stock || 0) * Number(i.unitCost || 0)), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 text-center text-amber-800">
                                            {filteredFlatItems.reduce((sum, i) => sum + Number(i.totalWeightKg || 0), 0).toFixed(2)} KG
                                        </td>
                                        <td colSpan="2" className="p-3 text-center text-slate-400">Excel Mode</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            )}

            {/* Groups Grid (When viewMode === 'groups') */}
            {viewMode === 'groups' && (
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
            )}

            {/* Edit Item Modal (Clean dialog to update name, stock, rate, category) */}
            {editingFlatItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Edit2 className="w-4 h-4 text-blue-400" />
                                <h3 className="text-sm font-black uppercase tracking-wide">
                                    Edit Inventory Item
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingFlatItem(null)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveFlatItemEdit} className="p-5 space-y-4 text-xs">
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Item Code / SKU</label>
                                <input
                                    type="text"
                                    disabled
                                    value={editingFlatItem.itemCode}
                                    className="w-full px-3 py-2 border rounded-lg bg-slate-100 text-slate-500 font-mono font-bold"
                                />
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Particulars (Item Name) *</label>
                                <input
                                    type="text"
                                    value={editingFlatItem.name}
                                    onChange={(e) => setEditingFlatItem(p => ({ ...p, name: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold text-slate-800 uppercase outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Category</label>
                                    <select
                                        value={editingFlatItem.category}
                                        onChange={(e) => setEditingFlatItem(p => ({ ...p, category: e.target.value }))}
                                        className="w-full px-2.5 py-2 border border-slate-200 rounded-lg bg-white font-semibold outline-none"
                                    >
                                        <option value="After-Market">Bolt & Fitting (AM)</option>
                                        <option value="Packaging">Packaging (Paking)</option>
                                        <option value="Raw Material">Raw Material</option>
                                        <option value="Semi-Finished">Semi-Finished</option>
                                        <option value="Finished Good">Finished Good</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">UOM</label>
                                    <select
                                        value={editingFlatItem.uom}
                                        onChange={(e) => setEditingFlatItem(p => ({ ...p, uom: e.target.value }))}
                                        className="w-full px-2.5 py-2 border border-slate-200 rounded-lg bg-white font-semibold outline-none"
                                    >
                                        <option value="Pcs">Pcs</option>
                                        <option value="Box">Box</option>
                                        <option value="Set">Set</option>
                                        <option value="Kg">Kg</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Quantity / Stock</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={editingFlatItem.stock}
                                        onChange={(e) => setEditingFlatItem(p => ({ ...p, stock: e.target.value }))}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Unit Rate (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editingFlatItem.unitCost}
                                        onChange={(e) => setEditingFlatItem(p => ({ ...p, unitCost: e.target.value }))}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold text-emerald-700 outline-none"
                                    />
                                </div>
                            </div>

                            {editingFlatItem.category === 'Raw Material' && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                                    <span className="text-[11px] font-bold text-amber-900 block">
                                        Raw Material Weight Config
                                    </span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-amber-800 font-bold block mb-0.5">1k Wt (KG)</label>
                                            <input
                                                type="number"
                                                step="0.001"
                                                value={editingFlatItem.weightPer1000}
                                                onChange={(e) => setEditingFlatItem(p => ({ ...p, weightPer1000: e.target.value }))}
                                                className="w-full px-2 py-1.5 border rounded bg-white font-bold text-amber-950"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-amber-800 font-bold block mb-0.5">Total Wt (KG)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={editingFlatItem.totalWeightKg}
                                                onChange={(e) => setEditingFlatItem(p => ({ ...p, totalWeightKg: e.target.value }))}
                                                className="w-full px-2 py-1.5 border rounded bg-white font-bold text-amber-950"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setEditingFlatItem(null)}
                                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saveGroupMutation.isPending}
                                    className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black shadow-sm"
                                >
                                    {saveGroupMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// ==========================================
// 2. DETAIL VIEW (Shows Physical Stock, Reserved In Process & Net Available)
// ==========================================
function InventoryDetail({ group, onNavigate, onDelete, onOpenCalc }) {
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
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => onOpenCalc && onOpenCalc(null, group)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-bold rounded-lg shadow-sm transition-colors"
                        title="Calculate weight to pieces for items in this group"
                    >
                        <Scale className="w-4 h-4" /> ⚖️ Weight Calc
                    </button>
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
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <span>{stock} <span className="text-xs text-slate-400 font-medium">{item.uom}</span></span>
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenCalc && onOpenCalc(item, group)}
                                                        className="p-1 hover:bg-amber-100 text-amber-700 rounded transition-colors"
                                                        title="Calculate / Convert Weight & Pieces"
                                                    >
                                                        <Scale className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                {(Number(item.totalWeightKg) > 0 || Number(item.weightPer1000) > 0) && (
                                                    <div className="text-[11px] text-blue-700 font-bold pt-0.5">
                                                        {Number(item.totalWeightKg) > 0 && <span>⚖️ {item.totalWeightKg} KG </span>}
                                                        {Number(item.weightPer1000) > 0 && (
                                                            <span className="text-[10px] text-slate-400 font-normal">
                                                                (1k: {item.weightPer1000}kg)
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
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
    unitCost: 0,
    weightPer1000: 0,
    totalWeightKg: 0
};

function InventoryForm({ group, onNavigate, onSave, isSaving, onOpenCalc }) {
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
                // Automatic weight to pieces conversion
                const wt1000 = Number(field === 'weightPer1000' ? value : (item.weightPer1000 || 0));
                if (field === 'totalWeightKg' && wt1000 > 0) {
                    const kg = Number(value);
                    updated.stock = Math.round((kg / wt1000) * 1000);
                } else if (field === 'stock' && wt1000 > 0) {
                    const pcs = Number(value);
                    updated.totalWeightKg = Number(((pcs * wt1000) / 1000).toFixed(2));
                } else if (field === 'weightPer1000' && wt1000 > 0) {
                    if (Number(item.totalWeightKg) > 0) {
                        updated.stock = Math.round((Number(item.totalWeightKg) / wt1000) * 1000);
                    } else if (Number(item.stock) > 0) {
                        updated.totalWeightKg = Number(((Number(item.stock) * wt1000) / 1000).toFixed(2));
                    }
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
                                <th className="p-3 w-32">Item Code (SKU)</th>
                                <th className="p-3 min-w-[180px]">Item Name & Specs</th>
                                <th className="p-3 w-40">Category</th>
                                <th className="p-3 w-36">Store</th>
                                <th className="p-3 w-24">UOM</th>
                                <th className="p-3 w-32 bg-amber-50/70 text-amber-900 border-x border-amber-200/60">
                                    <div className="flex items-center gap-1">
                                        <Scale className="w-3.5 h-3.5 text-amber-600" />
                                        <span>1000 Pcs Wt (KG)</span>
                                    </div>
                                </th>
                                <th className="p-3 w-36 bg-amber-50/70 text-amber-900 border-r border-amber-200/60">
                                    <div className="flex items-center justify-between">
                                        <span>Total Wt (KG)</span>
                                        <span className="text-[10px] text-amber-600 font-normal">Auto ⇄</span>
                                    </div>
                                </th>
                                <th className="p-3 w-28">Stock (Pcs)</th>
                                <th className="p-3 w-24">Unit Cost (₹)</th>
                                <th className="p-3 w-10 text-center">Act</th>
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
                                        <td className="p-2 bg-amber-50/20 border-x border-amber-100">
                                            <input
                                                type="number"
                                                step="0.001"
                                                min="0"
                                                value={item.weightPer1000 ?? ''}
                                                onChange={(e) =>
                                                    handleSubItemChange(rowId, 'weightPer1000', e.target.value ? Number(e.target.value) : '')
                                                }
                                                placeholder="e.g. 250"
                                                title="Weight of 1000 Pieces in Kilograms"
                                                className="w-full px-2.5 py-2 text-xs border border-amber-200 rounded-lg outline-none focus:ring-1 focus:ring-amber-500 font-semibold bg-white"
                                            />
                                            {Number(item.weightPer1000) > 0 && (
                                                <div className="text-[10px] text-amber-700 font-medium mt-0.5 text-center">
                                                    ={Number(item.weightPer1000)}g / pc
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-2 bg-amber-50/20 border-r border-amber-100">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={item.totalWeightKg ?? ''}
                                                    onChange={(e) =>
                                                        handleSubItemChange(rowId, 'totalWeightKg', e.target.value ? Number(e.target.value) : '')
                                                    }
                                                    placeholder="Total KG"
                                                    title="Total Weight in Kilograms"
                                                    className="w-full pl-2.5 pr-7 py-2 text-xs border border-amber-200 rounded-lg outline-none focus:ring-1 focus:ring-amber-500 font-bold text-amber-900 bg-white"
                                                />
                                                {onOpenCalc && (
                                                    <button
                                                        type="button"
                                                        title="Open Weight ⇄ Pieces Calculator"
                                                        onClick={() =>
                                                            onOpenCalc(item, formData, (calcStock, wt1k, totKg) => {
                                                                handleSubItemChange(rowId, 'weightPer1000', wt1k);
                                                                handleSubItemChange(rowId, 'totalWeightKg', totKg);
                                                                handleSubItemChange(rowId, 'stock', calcStock);
                                                            })
                                                        }
                                                        className="absolute right-1 p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded transition-colors"
                                                    >
                                                        <Calculator className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                            {Number(item.weightPer1000) > 0 && Number(item.totalWeightKg) > 0 && (
                                                <div className="text-[10px] text-amber-700 font-medium mt-0.5 text-center">
                                                    ≈ {Math.round((Number(item.totalWeightKg) / Number(item.weightPer1000)) * 1000)} Pcs
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                value={item.stock}
                                                onChange={(e) =>
                                                    handleSubItemChange(rowId, 'stock', Number(e.target.value))
                                                }
                                                className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-black text-indigo-700 bg-white"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={item.unitCost}
                                                onChange={(e) =>
                                                    handleSubItemChange(rowId, 'unitCost', Number(e.target.value))
                                                }
                                                className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-slate-700"
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

// ==========================================
// 4. ADVANCED WEIGHT ⇄ PIECES CONVERSION & BATCH ALLOCATOR (MODAL)
// ==========================================
const DEFAULT_HARDWARE_PRESETS = [
    { id: '1', label: 'Brass Handle', wt1k: 250, desc: '250g / pc' },
    { id: '2', label: 'Zinc Handle', wt1k: 120, desc: '120g / pc' },
    { id: '3', label: 'Brass Stud / Bush', wt1k: 18, desc: '18g / pc' },
    { id: '4', label: '4mm Machine Screw', wt1k: 2.5, desc: '2.5g / pc' },
    { id: '5', label: 'Casting Blank', wt1k: 45, desc: '45g / pc' },
    { id: '6', label: 'Scrap Runner / Ingot', wt1k: 60, desc: '60g / pc' },
];

function InventoryWeightCalculatorModal({
    isOpen,
    onClose,
    initialItem = null,
    initialGroup = null,
    onRowApply = null,
    groups = [],
    boms = [],
    onSaveItemWeight = null,
    showToast = () => {}
}) {
    if (!isOpen) return null;

    // 2 Clean Modes: 'kg_to_pcs' (Total KG -> Pieces) and 'pcs_to_kg' (Pieces -> Total KG)
    const [mode, setMode] = useState('kg_to_pcs');
    const [selectedGroupId, setSelectedGroupId] = useState(initialGroup?._id || initialGroup?.groupId || '');
    const [selectedItemId, setSelectedItemId] = useState(initialItem?._id || initialItem?.id || '');

    const currentGroup = groups.find(g => g._id === selectedGroupId || g.groupId === selectedGroupId) || initialGroup;
    const currentItem = currentGroup?.subItems?.find(i => (i._id || i.id) === selectedItemId || i.itemCode === selectedItemId) || initialItem;

    // Filter Raw Material items ONLY (user constraint: weight only for raw materials)
    const rawMaterialItems = (currentGroup?.subItems || []).filter(i => i.category === 'Raw Material');

    // --- 1. PRESETS MANAGEMENT (Stored in localStorage, full Add/Edit/Delete) ---
    const [presets, setPresets] = useState(() => {
        try {
            const saved = localStorage.getItem('rudra_weight_presets');
            if (saved) return JSON.parse(saved);
        } catch {}
        return DEFAULT_HARDWARE_PRESETS;
    });

    const [showPresetManager, setShowPresetManager] = useState(false);
    const [editingPresetId, setEditingPresetId] = useState(null);
    const [presetForm, setPresetForm] = useState({ label: '', wt1k: '', desc: '' });

    const savePresetsToStorage = (updated) => {
        setPresets(updated);
        try {
            localStorage.setItem('rudra_weight_presets', JSON.stringify(updated));
        } catch {}
    };

    const handleSavePreset = (e) => {
        e?.preventDefault();
        if (!presetForm.label.trim() || !presetForm.wt1k) {
            showToast('Preset name and 1,000 Pcs Weight are required', 'warning');
            return;
        }
        const numWt = Number(presetForm.wt1k);
        if (numWt <= 0) {
            showToast('Weight must be greater than 0', 'warning');
            return;
        }

        if (editingPresetId) {
            const updated = presets.map(p =>
                p.id === editingPresetId
                    ? { ...p, label: presetForm.label.trim(), wt1k: numWt, desc: presetForm.desc.trim() || `${numWt}g / pc` }
                    : p
            );
            savePresetsToStorage(updated);
            showToast(`Updated preset "${presetForm.label}"`, 'success');
        } else {
            const newP = {
                id: Math.random().toString(36).substring(2, 9),
                label: presetForm.label.trim(),
                wt1k: numWt,
                desc: presetForm.desc.trim() || `${numWt}g / pc`
            };
            savePresetsToStorage([...presets, newP]);
            showToast(`Added new preset "${newP.label}"`, 'success');
        }

        setEditingPresetId(null);
        setPresetForm({ label: '', wt1k: '', desc: '' });
    };

    const handleDeletePreset = (id, label) => {
        const updated = presets.filter(p => p.id !== id);
        savePresetsToStorage(updated);
        showToast(`Deleted preset "${label}"`, 'info');
    };

    // --- 2. WEIGHT CONVERSION STATE ---
    const [weightPer1000, setWeightPer1000] = useState(() => {
        if (initialItem?.weightPer1000 > 0) return initialItem.weightPer1000;
        return 250;
    });

    const [totalWeightKg, setTotalWeightKg] = useState(() => {
        if (initialItem?.totalWeightKg > 0) return initialItem.totalWeightKg;
        if (initialItem?.stock > 0 && initialItem?.weightPer1000 > 0) {
            return Number(((initialItem.stock * initialItem.weightPer1000) / 1000).toFixed(2));
        }
        return 100;
    });

    const [pieces, setPieces] = useState(() => {
        if (initialItem?.stock > 0) return initialItem.stock;
        return 400;
    });

    const handleItemSelect = (itemId) => {
        setSelectedItemId(itemId);
        const item = currentGroup?.subItems?.find(i => (i._id || i.id) === itemId);
        if (item) {
            if (item.weightPer1000 > 0) setWeightPer1000(item.weightPer1000);
            if (item.totalWeightKg > 0) setTotalWeightKg(item.totalWeightKg);
            if (item.stock > 0) setPieces(item.stock);
        }
    };

    const numWt1k = Number(weightPer1000) || 0;
    const numTotalKg = Number(totalWeightKg) || 0;
    const numPcs = Number(pieces) || 0;

    const calculatedPieces = numWt1k > 0 ? Math.round((numTotalKg / numWt1k) * 1000) : 0;
    const calculatedTotalKg = numWt1k > 0 ? Number(((numPcs * numWt1k) / 1000).toFixed(2)) : 0;
    const singlePieceGrams = numWt1k;

    const finalPieces = mode === 'kg_to_pcs' ? calculatedPieces : numPcs;
    const finalKg = mode === 'kg_to_pcs' ? numTotalKg : calculatedTotalKg;

    const handleApply = () => {
        if (numWt1k <= 0) {
            showToast('Please enter a valid 1000 Pieces Weight (> 0)', 'warning');
            return;
        }

        if (onRowApply) {
            onRowApply(finalPieces, numWt1k, finalKg);
            showToast(`Applied: ${finalPieces} Pcs (${finalKg} KG) to row`, 'success');
            onClose();
            return;
        }

        if (onSaveItemWeight && (selectedItemId || currentItem)) {
            const targetGrpId = currentGroup?._id || currentGroup?.groupId;
            const targetItemId = selectedItemId || currentItem?._id || currentItem?.id;
            onSaveItemWeight(targetGrpId, targetItemId, {
                stock: finalPieces,
                weightPer1000: numWt1k,
                totalWeightKg: finalKg
            });
            return;
        }

        showToast(`Calculated: ${finalPieces} Pcs (${finalKg} KG)`, 'info');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 text-white flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
                            <Scale className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-black tracking-wide flex items-center gap-2">
                                Raw Material Weight ⇄ Pieces Calculator
                            </h2>
                            <p className="text-xs text-amber-100 font-medium">
                                Fast hardware converter: (Total KG ÷ 1000 Pcs Wt) × 1000 = Total Pieces
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto space-y-4">
                    {/* Item Selector (Optional) */}
                    {groups.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                    Inventory Group
                                </label>
                                <select
                                    value={selectedGroupId}
                                    onChange={(e) => {
                                        setSelectedGroupId(e.target.value);
                                        setSelectedItemId('');
                                    }}
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-medium outline-none"
                                >
                                    <option value="">-- Select Group --</option>
                                    {groups.map(g => (
                                        <option key={g._id} value={g._id}>{g.groupName}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                    Raw Material Sub-Item
                                </label>
                                <select
                                    value={selectedItemId}
                                    onChange={(e) => handleItemSelect(e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-medium outline-none"
                                >
                                    <option value="">-- Select Raw Material --</option>
                                    {rawMaterialItems.map(it => (
                                        <option key={it._id || it.id} value={it._id || it.id}>
                                            [{it.itemCode}] {it.name} (Cur: {it.stock || 0} Pcs)
                                        </option>
                                    ))}
                                    {rawMaterialItems.length === 0 && currentItem && (
                                        <option value={currentItem._id || currentItem.id}>
                                            {currentItem.name}
                                        </option>
                                    )}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Mode Toggle Tabs (Clean 2-Way) */}
                    <div className="flex border border-slate-200 rounded-xl p-1 bg-slate-100 gap-1">
                        <button
                            type="button"
                            onClick={() => setMode('kg_to_pcs')}
                            className={`flex-1 py-2 px-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                mode === 'kg_to_pcs'
                                    ? 'bg-white text-amber-800 shadow-sm border border-slate-200'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Scale className="w-3.5 h-3.5 text-amber-600" />
                            Total Weight (KG) ➔ Calculate Pieces
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('pcs_to_kg')}
                            className={`flex-1 py-2 px-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                mode === 'pcs_to_kg'
                                    ? 'bg-white text-indigo-800 shadow-sm border border-slate-200'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                            Quantity (Pieces) ➔ Calculate Total KG
                        </button>
                    </div>

                    {/* Preset Manager Drawer / Panel */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                Quick Hardware Standard Presets (1k Pcs Weight)
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowPresetManager(!showPresetManager);
                                    setEditingPresetId(null);
                                    setPresetForm({ label: '', wt1k: '', desc: '' });
                                }}
                                className="px-2.5 py-1 text-[11px] bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                {showPresetManager ? 'Hide Manager' : '⚙️ Add / Edit Presets'}
                            </button>
                        </div>

                        {/* Preset Chips */}
                        <div className="flex flex-wrap gap-1.5">
                            {presets.map((preset) => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => setWeightPer1000(preset.wt1k)}
                                    className={`px-3 py-1.5 text-xs rounded-lg border font-bold transition-all flex items-center gap-1.5 ${
                                        Number(weightPer1000) === preset.wt1k
                                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                            : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50'
                                    }`}
                                >
                                    <span>{preset.label}</span>
                                    <span className="text-[10px] opacity-80 font-normal">({preset.wt1k} kg)</span>
                                </button>
                            ))}
                        </div>

                        {/* Full Preset Manager Form (Add / Edit / Delete) */}
                        {showPresetManager && (
                            <div className="mt-3 pt-3 border-t border-slate-200 space-y-3 bg-white p-3 rounded-lg">
                                <form onSubmit={handleSavePreset} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                                    <div className="sm:col-span-5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                            Preset Name / Part
                                        </label>
                                        <input
                                            type="text"
                                            value={presetForm.label}
                                            onChange={(e) => setPresetForm(p => ({ ...p, label: e.target.value }))}
                                            placeholder="e.g. Rose Mortise Handle, 5mm Stud"
                                            className="w-full px-2.5 py-1.5 text-xs border rounded-lg outline-none font-semibold"
                                        />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                            1k Wt in KG *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            min="0.001"
                                            value={presetForm.wt1k}
                                            onChange={(e) => setPresetForm(p => ({ ...p, wt1k: e.target.value }))}
                                            placeholder="e.g. 180"
                                            className="w-full px-2.5 py-1.5 text-xs font-bold border rounded-lg outline-none"
                                        />
                                    </div>
                                    <div className="sm:col-span-4 flex gap-1.5">
                                        <button
                                            type="submit"
                                            className="flex-1 py-1.5 bg-amber-600 text-white font-bold text-xs rounded-lg hover:bg-amber-700 shadow-xs"
                                        >
                                            {editingPresetId ? 'Update Preset' : '+ Save Preset'}
                                        </button>
                                        {editingPresetId && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingPresetId(null);
                                                    setPresetForm({ label: '', wt1k: '', desc: '' });
                                                }}
                                                className="px-2 py-1.5 bg-slate-200 text-slate-700 text-xs rounded-lg font-semibold"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </form>

                                {/* Presets List with Edit & Delete */}
                                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                                    {presets.map(p => (
                                        <div key={p.id} className="p-2 flex items-center justify-between text-xs hover:bg-slate-50">
                                            <div>
                                                <span className="font-bold text-slate-800">{p.label}</span>
                                                <span className="text-slate-400 ml-2">({p.wt1k} kg / 1k pcs)</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingPresetId(p.id);
                                                        setPresetForm({ label: p.label, wt1k: p.wt1k, desc: p.desc || '' });
                                                    }}
                                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Edit Preset"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeletePreset(p.id, p.label)}
                                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                    title="Delete Preset"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Standard Weight Inputs */}
                    <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl space-y-3">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                                    1,000 Pieces Weight in KG *
                                </label>
                                <span className="text-xs text-amber-700 font-semibold">
                                    Single Piece Weight: <strong>{singlePieceGrams} Grams</strong>
                                </span>
                            </div>
                            <div className="relative flex items-center">
                                <input
                                    type="number"
                                    step="0.001"
                                    min="0.001"
                                    value={weightPer1000}
                                    onChange={(e) => setWeightPer1000(e.target.value)}
                                    placeholder="e.g. 250"
                                    className="w-full px-3.5 py-2.5 text-base font-black border-2 border-amber-300 rounded-xl outline-none focus:border-amber-500 bg-white"
                                />
                                <span className="absolute right-3 text-xs font-bold text-amber-800">
                                    KG / 1000 Pcs
                                </span>
                            </div>
                        </div>

                        {/* Two-Way Input Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                            {mode === 'kg_to_pcs' ? (
                                <>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            Total Raw Material Weight (KG) *
                                        </label>
                                        <div className="relative flex items-center">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                value={totalWeightKg}
                                                onChange={(e) => setTotalWeightKg(e.target.value)}
                                                placeholder="e.g. 100"
                                                className="w-full px-3.5 py-2.5 text-base font-black border border-slate-300 rounded-xl outline-none focus:border-indigo-500 bg-white"
                                            />
                                            <span className="absolute right-3 text-xs font-bold text-slate-500">
                                                KG Total
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                                            Total weighed mass on factory scale
                                        </span>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            Calculated Total Pieces (Pcs)
                                        </label>
                                        <div className="px-3.5 py-2.5 text-base font-black bg-emerald-50 border-2 border-emerald-300 text-emerald-800 rounded-xl flex items-center justify-between">
                                            <span>{calculatedPieces.toLocaleString('en-IN')}</span>
                                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                                Pieces
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-emerald-700 mt-0.5 block font-medium">
                                            Formula: ({numTotalKg} ÷ {numWt1k}) × 1000
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            Quantity of Pieces (Pcs) *
                                        </label>
                                        <div className="relative flex items-center">
                                            <input
                                                type="number"
                                                min="1"
                                                value={pieces}
                                                onChange={(e) => setPieces(e.target.value)}
                                                placeholder="e.g. 400"
                                                className="w-full px-3.5 py-2.5 text-base font-black border border-slate-300 rounded-xl outline-none focus:border-indigo-500 bg-white"
                                            />
                                            <span className="absolute right-3 text-xs font-bold text-slate-500">
                                                Pcs
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            Calculated Total Weight (KG)
                                        </label>
                                        <div className="px-3.5 py-2.5 text-base font-black bg-blue-50 border-2 border-blue-300 text-blue-800 rounded-xl flex items-center justify-between">
                                            <span>{calculatedTotalKg.toLocaleString('en-IN')}</span>
                                            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                                                KG
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-blue-700 mt-0.5 block font-medium">
                                            Formula: ({numPcs} × {numWt1k}) ÷ 1000
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Summary Outcome Box */}
                    <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                                Calculated Result Summary
                            </span>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-2xl font-black text-amber-900">
                                    {finalPieces.toLocaleString('en-IN')} <span className="text-sm font-bold text-amber-700">Pieces</span>
                                </span>
                                <span className="text-slate-400 font-bold">⇄</span>
                                <span className="text-xl font-black text-amber-950">
                                    {finalKg.toLocaleString('en-IN')} <span className="text-sm font-bold text-amber-700">KG</span>
                                </span>
                            </div>
                        </div>
                        <div className="text-right text-xs text-amber-800">
                            <div>Standard Rate: <strong>{numWt1k} kg / 1k pcs</strong></div>
                            <div>Piece Wt: <strong>{singlePieceGrams} g</strong></div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-100 transition-colors"
                    >
                        Close / Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-sm rounded-xl shadow-md transition-colors"
                    >
                        <Check className="w-4 h-4" />
                        {onRowApply
                            ? 'Apply to Current Row'
                            : (selectedItemId || currentItem)
                            ? 'Save & Update Item in Inventory'
                            : 'Done'}
                    </button>
                </div>
            </div>
        </div>
    );
}