import { useState, useMemo } from 'react';
import {
    Search, Plus, Edit2, Trash2, ArrowLeft, Check, X, FileJson,
    Loader2, Factory, Package, ArrowRight
} from 'lucide-react';
import { PermissionGuard } from '../components/auth/PermissionGuard';
import { ACTIONS } from '../context/AuthContext';
import { useBOMs, useSaveBOM, useDeleteBOM } from '../hooks/useBOMMasterData';
import { useInventory, useQuickAddInventoryItem } from '../hooks/useInventoryData';
import { useOrders } from '../hooks/useOrderData';
import { useFeedback } from '../context/FeedbackContext';

const generateRowId = () => Math.random().toString(36).substring(2, 10);

export default function BOMModule() {
    const [view, setView] = useState('list');
    const [selectedBOM, setSelectedBOM] = useState(null);

    const { data: boms = [], isLoading } = useBOMs();
    const saveMutation = useSaveBOM();
    const deleteMutation = useDeleteBOM();

    const handleNavigate = (newView, bom = null) => {
        setSelectedBOM(bom);
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
            {view === 'list' && (
                <BOMList
                    boms={boms}
                    onNavigate={handleNavigate}
                    onDelete={deleteMutation.mutateAsync}
                />
            )}
            {view === 'form' && (
                <BOMForm
                    initialData={selectedBOM}
                    boms={boms}
                    onNavigate={handleNavigate}
                    onSave={saveMutation.mutateAsync}
                />
            )}
        </div>
    );
}

// ==========================================
// 1. LIST VIEW
// ==========================================
function BOMList({ boms, onNavigate, onDelete }) {
    const [searchTerm, setSearchTerm] = useState('');
    const { showConfirm, showToast } = useFeedback();

    const filteredBOMs = boms.filter(b =>
        b.finishedItemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.productName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (bom) => {
        const ok = await showConfirm({
            title: 'Delete BOM Recipe',
            message: `Delete BOM recipe for "${bom.finishedItemCode}"?`,
            type: 'danger',
            confirmText: 'Delete'
        });
        if (!ok) return;
        try {
            await onDelete(bom._id);
            showToast('BOM deleted successfully', 'success');
        } catch (e) {
            showToast(e.message || 'Failed to delete BOM', 'error');
        }
    };

    return (
        <div className="space-y-4 max-w-7xl mx-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                        <FileJson className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Bill of Materials (BOM)</h1>
                        <p className="text-sm text-slate-500">
                            In-House Factory Parts (Process) & After-Market Requirements (Inventory)
                        </p>
                    </div>
                </div>
                <PermissionGuard module="bom" action={ACTIONS.ADD}>
                    <button
                        onClick={() => onNavigate('form')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Create Recipe
                    </button>
                </PermissionGuard>
            </div>

            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex gap-4">
                <div className="relative w-80">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search Finished Rudra Code or Name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="p-4">Rudra Code</th>
                            <th className="p-4">Product Name / Specs</th>
                            <th className="p-4 text-center">In-House Parts (Process)</th>
                            <th className="p-4 text-center">After-Market Items (Inventory)</th>
                            <th className="p-4">Version</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredBOMs.map((bom) => (
                            <tr key={bom._id} className="hover:bg-slate-50">
                                <td className="p-4 font-bold text-indigo-600">{bom.finishedItemCode}</td>
                                <td className="p-4">
                                    <div className="text-sm font-semibold text-slate-800">{bom.productName || '-'}</div>
                                    <div className="text-xs text-slate-400">
                                        {bom.defaultSize ? `Size: ${bom.defaultSize} ` : ''}
                                        {bom.defaultFinishing ? `• Finish: ${bom.defaultFinishing}` : ''}
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">
                                        {bom.inHouseParts?.length || 0} Factory Parts
                                    </span>
                                </td>
                                <td className="p-4 text-center">
                                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                                        {bom.components?.length || 0} After-Market
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-slate-600">v{bom.version}</td>
                                <td className="p-4">
                                    <span
                                        className={`px-2 py-1 text-xs font-bold rounded-full uppercase ${bom.isActive
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-red-100 text-red-700'
                                            }`}
                                    >
                                        {bom.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="p-4 flex justify-end gap-2">
                                    <PermissionGuard module="bom" action={ACTIONS.EDIT}>
                                        <button
                                            onClick={() => onNavigate('form', bom)}
                                            className="p-1.5 text-slate-400 hover:text-blue-600"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </PermissionGuard>
                                    <PermissionGuard module="bom" action={ACTIONS.DELETE}>
                                        <button
                                            onClick={() => handleDelete(bom)}
                                            className="p-1.5 text-slate-400 hover:text-red-600"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </PermissionGuard>
                                </td>
                            </tr>
                        ))}
                        {filteredBOMs.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-12 text-center text-slate-400">
                                    No BOM recipes found. Click "Create Recipe" to build your first product BOM.
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
// 2. SPLIT BOM FORM VIEW (Matches Diagram)
// ==========================================
const INITIAL_IN_HOUSE = {
    id: '',
    fieldName: '', // e.g., "Round Dabi", "Key Hole"
    partCode: '',
    inventoryGroupId: '',
    inventorySubItemId: '',
    qtyInPieces: 1,
    weightPerPcGrams: 0,
    processName: ''
};

const INITIAL_AFTER_MARKET = {
    id: '',
    fieldName: '',
    inventoryGroupId: '',
    inventorySubItemId: '',
    quantity: 1,
    unit: 'Pcs',
    remarks: ''
};

function BOMForm({ initialData, onNavigate, onSave }) {
    const isEditing = !!initialData;
    const { data: inventory = [] } = useInventory();
    const { data: orders = [] } = useOrders();
    const quickAddItemMutation = useQuickAddInventoryItem();
    const { showToast } = useFeedback();

    const [formData, setFormData] = useState(() => {
        if (initialData) {
            return {
                ...initialData,
                inHouseParts:
                    initialData.inHouseParts?.length > 0
                        ? initialData.inHouseParts
                        : [{ ...INITIAL_IN_HOUSE, id: generateRowId() }],
                components:
                    initialData.components?.length > 0
                        ? initialData.components
                        : [{ ...INITIAL_AFTER_MARKET, id: generateRowId() }]
            };
        }
        return {
            finishedItemCode: '',
            productName: '',
            defaultSize: '',
            defaultFinishing: '',
            hsnSac: '',
            version: '1.0',
            isActive: true,
            inHouseParts: [
                { ...INITIAL_IN_HOUSE, id: generateRowId(), fieldName: 'Round Dabi', qtyInPieces: 1 },
                { ...INITIAL_IN_HOUSE, id: generateRowId(), fieldName: 'Key Hole', qtyInPieces: 1 }
            ],
            components: [{ ...INITIAL_AFTER_MARKET, id: generateRowId() }]
        };
    });

    const [quickModal, setQuickModal] = useState({
        open: false,
        targetType: 'afterMarket', // 'finishedCode' | 'inHouse' | 'afterMarket'
        rowId: null,
        groupId: '',
        newGroupName: '',
        itemCode: '',
        name: '',
        category: 'After-Market',
        uom: 'Pcs',
        unitCost: 0,
        stock: 0
    });

    const allSubItems = useMemo(() => {
        return inventory.flatMap(group =>
            (group.subItems || []).map(sub => ({
                ...sub,
                groupName: group.groupName,
                groupId: group._id
            }))
        );
    }, [inventory]);

    const finishedCodeSuggestions = useMemo(() => {
        const map = new Map();
        allSubItems
            .filter(i => i.category === 'Finished Good' || i.itemCode)
            .forEach(i => {
                if (i.itemCode) {
                    map.set(i.itemCode.toUpperCase(), {
                        code: i.itemCode.toUpperCase(),
                        name: i.name
                    });
                }
            });
        orders.forEach(o => {
            (o.items || []).forEach(it => {
                if (it.rudraCode && !map.has(it.rudraCode.toUpperCase())) {
                    map.set(it.rudraCode.toUpperCase(), {
                        code: it.rudraCode.toUpperCase(),
                        name: `Order Item (${it.size || ''} ${it.finishing || ''})`.trim(),
                        size: it.size,
                        finishing: it.finishing,
                        hsnSac: it.hsnSac
                    });
                }
            });
        });
        return Array.from(map.values());
    }, [allSubItems, orders]);

    // Left Side Handlers: In-House Factory Parts
    const handleInHouseChange = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            inHouseParts: prev.inHouseParts.map(part =>
                (part._id === id || part.id === id) ? { ...part, [field]: value } : part
            )
        }));
    };

    const addInHouseRow = () => {
        setFormData(prev => ({
            ...prev,
            inHouseParts: [...prev.inHouseParts, { ...INITIAL_IN_HOUSE, id: generateRowId() }]
        }));
    };

    const removeInHouseRow = (id) => {
        if (formData.inHouseParts.length === 1) return;
        setFormData(prev => ({
            ...prev,
            inHouseParts: prev.inHouseParts.filter(p => p._id !== id && p.id !== id)
        }));
    };

    // Right Side Handlers: After-Market Requirements
    const handleCompChange = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            components: prev.components.map(comp =>
                (comp._id === id || comp.id === id) ? { ...comp, [field]: value } : comp
            )
        }));
    };

    const addComponentRow = () => {
        setFormData(prev => ({
            ...prev,
            components: [...prev.components, { ...INITIAL_AFTER_MARKET, id: generateRowId() }]
        }));
    };

    const removeComponentRow = (id) => {
        if (formData.components.length === 1) return;
        setFormData(prev => ({
            ...prev,
            components: prev.components.filter(c => c._id !== id && c.id !== id)
        }));
    };

    const openQuickAddModal = (targetType, rowId = null, prefillName = '') => {
        const defaultGroup = inventory[0]?._id || 'NEW_GROUP';
        const defaultCategory =
            targetType === 'finishedCode'
                ? 'Finished Good'
                : targetType === 'inHouse'
                    ? 'Semi-Finished'
                    : 'After-Market';

        const prefix =
            targetType === 'finishedCode' ? 'R-' : targetType === 'inHouse' ? 'SF-' : 'AM-';
        const randomNum = Math.floor(100 + Math.random() * 900);

        setQuickModal({
            open: true,
            targetType,
            rowId,
            groupId: defaultGroup,
            newGroupName: '',
            itemCode:
                prefillName && targetType === 'finishedCode'
                    ? prefillName.toUpperCase()
                    : `${prefix}${randomNum}`,
            name: prefillName || '',
            category: defaultCategory,
            uom: 'Pcs',
            unitCost: 0,
            stock: 0
        });
    };

    const handleQuickModalSubmit = async () => {
        if (!quickModal.itemCode.trim() || !quickModal.name.trim()) {
            showToast('Item Code and Name are required', 'warning');
            return;
        }
        try {
            const result = await quickAddItemMutation.mutateAsync({
                groupId: quickModal.groupId,
                newGroupName: quickModal.newGroupName,
                item: {
                    itemCode: quickModal.itemCode.trim().toUpperCase(),
                    name: quickModal.name.trim(),
                    category: quickModal.category,
                    uom: quickModal.uom,
                    unitCost: Number(quickModal.unitCost) || 0,
                    stock: Number(quickModal.stock) || 0
                }
            });

            const createdSub = result.subItem;
            const createdGroup = result.group;

            if (quickModal.targetType === 'finishedCode') {
                setFormData(prev => ({
                    ...prev,
                    finishedItemCode: createdSub.itemCode,
                    productName: createdSub.name
                }));
            } else if (quickModal.targetType === 'inHouse' && quickModal.rowId) {
                handleInHouseChange(quickModal.rowId, 'fieldName', createdSub.name);
                handleInHouseChange(quickModal.rowId, 'partCode', createdSub.itemCode);
                handleInHouseChange(quickModal.rowId, 'inventorySubItemId', createdSub._id);
                handleInHouseChange(quickModal.rowId, 'inventoryGroupId', createdGroup._id);
            } else if (quickModal.targetType === 'afterMarket' && quickModal.rowId) {
                handleCompChange(quickModal.rowId, 'fieldName', createdSub.name);
                handleCompChange(quickModal.rowId, 'inventorySubItemId', createdSub._id);
                handleCompChange(quickModal.rowId, 'inventoryGroupId', createdGroup._id);
                handleCompChange(quickModal.rowId, 'unit', createdSub.uom || 'Pcs');
            }

            showToast(`Added "${createdSub.name} (${createdSub.itemCode})" to Inventory!`, 'success');
            setQuickModal(prev => ({ ...prev, open: false }));
        } catch (err) {
            showToast(err.message || 'Failed to add item to inventory', 'error');
        }
    };

    const handleSave = async () => {
        if (!formData.finishedItemCode.trim()) {
            showToast('Finished Product Code (Rudra Code) is required', 'warning');
            return;
        }

        const cleanInHouse = formData.inHouseParts
            .filter(p => p.fieldName && p.fieldName.trim() !== '')
            .map(({ id, ...rest }) => rest);

        const cleanComponents = formData.components
            .filter(c => c.inventorySubItemId || (c.fieldName && c.fieldName.trim() !== ''))
            .map(({ id, ...rest }) => rest);

        if (cleanInHouse.length === 0 && cleanComponents.length === 0) {
            showToast('Please add at least one In-House Part or After-Market Material', 'warning');
            return;
        }

        try {
            await onSave({
                ...formData,
                finishedItemCode: formData.finishedItemCode.trim().toUpperCase(),
                inHouseParts: cleanInHouse,
                components: cleanComponents
            });
            showToast('BOM Recipe saved and synced!', 'success');
            onNavigate('list');
        } catch (error) {
            showToast(error.message || 'Failed to save BOM', 'error');
        }
    };

    return (
        <div className="space-y-6 max-w-[1440px] mx-auto pb-16">
            {/* Top Bar */}
            <div className="flex justify-between items-center bg-white px-6 py-4 rounded-xl border border-slate-200 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-2 text-sm">
                    <button onClick={() => onNavigate('list')} className="text-slate-400 hover:text-slate-600">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-slate-400">Master BOM</span>
                    <span className="text-slate-300">›</span>
                    <span className="font-bold text-slate-800 text-base">
                        {isEditing ? `Edit Recipe: ${formData.finishedItemCode}` : 'New Split-BOM Recipe'}
                    </span>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => onNavigate('list')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50"
                    >
                        <X className="w-4 h-4" /> Cancel
                    </button>
                    <PermissionGuard module="bom" action={isEditing ? ACTIONS.EDIT : ACTIONS.ADD}>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-sm"
                        >
                            <Check className="w-4 h-4" /> Save & Sync Recipe
                        </button>
                    </PermissionGuard>
                </div>
            </div>

            {/* Header: Finished Product Code (Rudra Code) with Smart Suggestion & + Button */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            Finished Product Code (Rudra Code) *
                        </label>
                        <div className="flex gap-1.5">
                            <input
                                list="finished-code-suggestions"
                                type="text"
                                value={formData.finishedItemCode}
                                onChange={(e) => {
                                    const val = e.target.value.toUpperCase();
                                    const match = finishedCodeSuggestions.find(s => s.code === val);
                                    setFormData(p => ({
                                        ...p,
                                        finishedItemCode: val,
                                        productName: match?.name && !p.productName ? match.name : p.productName,
                                        defaultSize: match?.size && !p.defaultSize ? match.size : p.defaultSize,
                                        defaultFinishing: match?.finishing && !p.defaultFinishing ? match.finishing : p.defaultFinishing,
                                        hsnSac: match?.hsnSac && !p.hsnSac ? match.hsnSac : p.hsnSac
                                    }));
                                }}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-indigo-500 outline-none font-bold uppercase text-indigo-700"
                                placeholder="Search or type e.g. R-001"
                            />
                            <datalist id="finished-code-suggestions">
                                {finishedCodeSuggestions.map(item => (
                                    <option key={item.code} value={item.code}>{item.name}</option>
                                ))}
                            </datalist>
                            <button
                                type="button"
                                onClick={() => openQuickAddModal('finishedCode', null, formData.finishedItemCode)}
                                title="Register New Finished Product in Inventory"
                                className="px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg font-bold shrink-0"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            Product Name
                        </label>
                        <input
                            type="text"
                            value={formData.productName || ''}
                            onChange={(e) => setFormData(p => ({ ...p, productName: e.target.value }))}
                            placeholder="e.g. Mortise Handle Set"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-indigo-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            Default Size
                        </label>
                        <input
                            type="text"
                            value={formData.defaultSize || ''}
                            onChange={(e) => setFormData(p => ({ ...p, defaultSize: e.target.value }))}
                            placeholder="e.g. 8 Inch"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-indigo-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            Default Finish
                        </label>
                        <input
                            type="text"
                            value={formData.defaultFinishing || ''}
                            onChange={(e) => setFormData(p => ({ ...p, defaultFinishing: e.target.value }))}
                            placeholder="e.g. Antique / Rose Gold"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-indigo-500 outline-none"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-2 pb-1">
                        <div className="w-20">
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Ver.</label>
                            <input
                                type="text"
                                value={formData.version}
                                onChange={(e) => setFormData(p => ({ ...p, version: e.target.value }))}
                                className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg outline-none"
                            />
                        </div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer pt-5">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData(p => ({ ...p, isActive: e.target.checked }))}
                                className="w-4 h-4 text-indigo-600 rounded"
                            />
                            Active
                        </label>
                    </div>
                </div>
            </div>

            {/* SPLIT BOM SECTIONS (LEFT: IN-HOUSE -> PROCESS | RIGHT: AFTER-MARKET -> INVENTORY) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                {/* 1. LEFT PANEL: IN-HOUSE FACTORY PARTS -> PROCESS MODULE */}
                <div className="bg-white rounded-xl border-2 border-blue-200 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-blue-100 bg-blue-50/70 flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-blue-600 text-white rounded-lg">
                                <Factory className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                                    1. In-House Factory Parts
                                </h2>
                                <p className="text-xs text-blue-700 font-medium flex items-center gap-1">
                                    e.g., Round Dabi, Key Hole <ArrowRight className="w-3 h-3" /> Process & Inventory
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={addInHouseRow}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add Part
                        </button>
                    </div>

                    <div className="p-4 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                                    <th className="pb-2 pr-2">Field Name (Factory Part)</th>
                                    <th className="pb-2 px-2 w-28">Qty in Pieces</th>
                                    <th className="pb-2 px-2 w-24">Wt/Pc (g)</th>
                                    <th className="pb-2 px-2 w-32">Process Stage</th>
                                    <th className="pb-2 w-10 text-center">Act</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {formData.inHouseParts.map((part) => {
                                    const rowId = part._id || part.id;
                                    return (
                                        <tr key={rowId} className="hover:bg-slate-50">
                                            <td className="py-2.5 pr-2">
                                                <div className="flex gap-1">
                                                    <input
                                                        list={`inhouse-list-${rowId}`}
                                                        type="text"
                                                        value={part.fieldName}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            handleInHouseChange(rowId, 'fieldName', val);
                                                            const match = allSubItems.find(
                                                                i =>
                                                                    i.name.toLowerCase() === val.toLowerCase() ||
                                                                    i.itemCode.toLowerCase() === val.toLowerCase()
                                                            );
                                                            if (match) {
                                                                handleInHouseChange(rowId, 'partCode', match.itemCode);
                                                                handleInHouseChange(rowId, 'inventorySubItemId', match._id);
                                                                handleInHouseChange(rowId, 'inventoryGroupId', match.groupId);
                                                            }
                                                        }}
                                                        placeholder="e.g. Round Dabi, Key Hole"
                                                        className="w-full px-2.5 py-1.5 text-sm font-semibold border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                                                    />
                                                    <datalist id={`inhouse-list-${rowId}`}>
                                                        <option value="Round Dabi" />
                                                        <option value="Key Hole" />
                                                        <option value="Main Handle Body" />
                                                        <option value="Back Plate" />
                                                        <option value="Spindle Rod" />
                                                        {allSubItems
                                                            .filter(i => i.category === 'Semi-Finished' || i.category === 'Raw Material')
                                                            .map(sub => (
                                                                <option key={sub._id} value={sub.name}>
                                                                    {sub.itemCode} (Stock: {sub.stock})
                                                                </option>
                                                            ))}
                                                    </datalist>
                                                    <button
                                                        type="button"
                                                        onClick={() => openQuickAddModal('inHouse', rowId, part.fieldName)}
                                                        title="Create & Sync Part in Inventory"
                                                        className="px-2 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg shrink-0"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {part.partCode && (
                                                    <span className="text-[10px] text-blue-600 font-bold block mt-0.5">
                                                        Linked Code: {part.partCode}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={part.qtyInPieces}
                                                    onChange={(e) => handleInHouseChange(rowId, 'qtyInPieces', Number(e.target.value))}
                                                    className="w-full px-2.5 py-1.5 text-sm font-bold text-blue-700 border border-slate-200 rounded-lg outline-none"
                                                />
                                            </td>
                                            <td className="py-2.5 px-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.1"
                                                    value={part.weightPerPcGrams || ''}
                                                    onChange={(e) => handleInHouseChange(rowId, 'weightPerPcGrams', Number(e.target.value))}
                                                    placeholder="Grams"
                                                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none"
                                                />
                                            </td>
                                            <td className="py-2.5 px-2">
                                                <input
                                                    type="text"
                                                    value={part.processName || ''}
                                                    onChange={(e) => handleInHouseChange(rowId, 'processName', e.target.value)}
                                                    placeholder="e.g. Turning"
                                                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none"
                                                />
                                            </td>
                                            <td className="py-2.5 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeInHouseRow(rowId)}
                                                    disabled={formData.inHouseParts.length === 1}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-40"
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

                {/* 2. RIGHT PANEL: AFTER-MARKET REQUIREMENTS -> INVENTORY MODULE */}
                <div className="bg-white rounded-xl border-2 border-emerald-200 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-emerald-100 bg-emerald-50/70 flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-emerald-600 text-white rounded-lg">
                                <Package className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                                    2. After-Market Requirements
                                </h2>
                                <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                                    Bought-Out Screws, Springs, Boxes <ArrowRight className="w-3 h-3" /> Inventory Module
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={addComponentRow}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add Material
                        </button>
                    </div>

                    <div className="p-4 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                                    <th className="pb-2 pr-2">Field Name (Inventory Item)</th>
                                    <th className="pb-2 px-2 w-24">Quantity</th>
                                    <th className="pb-2 px-2 w-24">Unit</th>
                                    <th className="pb-2 px-2">Remarks</th>
                                    <th className="pb-2 w-10 text-center">Act</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {formData.components.map((comp) => {
                                    const rowId = comp._id || comp.id;
                                    return (
                                        <tr key={rowId} className="hover:bg-slate-50">
                                            <td className="py-2.5 pr-2">
                                                <div className="flex gap-1">
                                                    <select
                                                        value={comp.inventorySubItemId}
                                                        onChange={(e) => {
                                                            const selected = allSubItems.find(i => i._id === e.target.value);
                                                            if (selected) {
                                                                handleCompChange(rowId, 'inventorySubItemId', selected._id);
                                                                handleCompChange(rowId, 'inventoryGroupId', selected.groupId);
                                                                handleCompChange(rowId, 'fieldName', selected.name);
                                                                handleCompChange(rowId, 'unit', selected.uom || 'Pcs');
                                                            }
                                                        }}
                                                        className="w-full px-2.5 py-1.5 text-sm font-semibold border border-slate-200 rounded-lg outline-none bg-white"
                                                    >
                                                        <option value="">Select or click + to add...</option>
                                                        {inventory.map(group => (
                                                            <optgroup key={group._id} label={group.groupName}>
                                                                {group.subItems?.map(sub => (
                                                                    <option key={sub._id} value={sub._id}>
                                                                        [{sub.itemCode}] {sub.name} (Stock: {sub.stock} {sub.uom})
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => openQuickAddModal('afterMarket', rowId, '')}
                                                        title="Add New After-Market Material to Inventory"
                                                        className="px-2 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg shrink-0"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={comp.quantity}
                                                    onChange={(e) => handleCompChange(rowId, 'quantity', Number(e.target.value))}
                                                    className="w-full px-2.5 py-1.5 text-sm font-bold text-emerald-700 border border-slate-200 rounded-lg outline-none"
                                                />
                                            </td>
                                            <td className="py-2.5 px-2">
                                                <select
                                                    value={comp.unit}
                                                    onChange={(e) => handleCompChange(rowId, 'unit', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none bg-white"
                                                >
                                                    <option value="Pcs">Pcs</option>
                                                    <option value="Kg">Kg</option>
                                                    <option value="Set">Set</option>
                                                    <option value="Box">Box</option>
                                                    <option value="Mtrs">Mtrs</option>
                                                </select>
                                            </td>
                                            <td className="py-2.5 px-2">
                                                <input
                                                    type="text"
                                                    value={comp.remarks || ''}
                                                    onChange={(e) => handleCompChange(rowId, 'remarks', e.target.value)}
                                                    placeholder="Optional note"
                                                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none"
                                                />
                                            </td>
                                            <td className="py-2.5 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeComponentRow(rowId)}
                                                    disabled={formData.components.length === 1}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-40"
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

            {/* QUICK-ADD INVENTORY MODAL (Triggered by any + button) */}
            {quickModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-base">
                                    {quickModal.targetType === 'finishedCode'
                                        ? 'Register New Finished Product (Rudra Code)'
                                        : quickModal.targetType === 'inHouse'
                                            ? 'Register In-House Factory Part in Inventory'
                                            : 'Register After-Market Item in Inventory'}
                                </h3>
                                <p className="text-xs text-slate-300">Auto-syncs with Master Inventory</p>
                            </div>
                            <button onClick={() => setQuickModal(p => ({ ...p, open: false }))}>
                                <X className="w-5 h-5 text-slate-400 hover:text-white" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                                    Inventory Group
                                </label>
                                <select
                                    value={quickModal.groupId}
                                    onChange={(e) => setQuickModal(p => ({ ...p, groupId: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white font-semibold"
                                >
                                    {inventory.map(g => (
                                        <option key={g._id} value={g._id}>
                                            {g.groupName} ({g.groupId})
                                        </option>
                                    ))}
                                    <option value="NEW_GROUP">+ Create New Inventory Group</option>
                                </select>
                            </div>

                            {quickModal.groupId === 'NEW_GROUP' && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                                        New Group Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={quickModal.newGroupName}
                                        onChange={(e) => setQuickModal(p => ({ ...p, newGroupName: e.target.value }))}
                                        placeholder="e.g. Brass Sub-Parts, After-Market Fasteners"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                                        Unique Code / SKU *
                                    </label>
                                    <input
                                        type="text"
                                        value={quickModal.itemCode}
                                        onChange={(e) => setQuickModal(p => ({ ...p, itemCode: e.target.value.toUpperCase() }))}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-bold uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                                        Category
                                    </label>
                                    <select
                                        value={quickModal.category}
                                        onChange={(e) => setQuickModal(p => ({ ...p, category: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                                    >
                                        <option value="Semi-Finished">Semi-Finished (In-House)</option>
                                        <option value="After-Market">After-Market (Bought-Out)</option>
                                        <option value="Raw Material">Raw Material</option>
                                        <option value="Finished Good">Finished Good</option>
                                        <option value="Consumable">Consumable</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                                    Item / Part Name *
                                </label>
                                <input
                                    type="text"
                                    value={quickModal.name}
                                    onChange={(e) => setQuickModal(p => ({ ...p, name: e.target.value }))}
                                    placeholder="e.g. Round Dabi, Key Hole, Grub Screw 6mm"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-semibold"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">UOM</label>
                                    <select
                                        value={quickModal.uom}
                                        onChange={(e) => setQuickModal(p => ({ ...p, uom: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                                    >
                                        <option value="Pcs">Pcs</option>
                                        <option value="Kg">Kg</option>
                                        <option value="Box">Box</option>
                                        <option value="Set">Set</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cost (₹)</label>
                                    <input
                                        type="number"
                                        value={quickModal.unitCost}
                                        onChange={(e) => setQuickModal(p => ({ ...p, unitCost: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Stock</label>
                                    <input
                                        type="number"
                                        value={quickModal.stock}
                                        onChange={(e) => setQuickModal(p => ({ ...p, stock: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setQuickModal(p => ({ ...p, open: false }))}
                                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={quickAddItemMutation.isPending}
                                    onClick={handleQuickModalSubmit}
                                    className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-1.5"
                                >
                                    {quickAddItemMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Create & Select
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}