import { useState, useMemo } from 'react';
import {
    Search, Plus, Edit2, Trash2, ArrowLeft, Check, X, FileJson,
    Loader2, Factory, Package, ArrowRight, Boxes, Sparkles, Layers,
    DollarSign, AlertCircle
} from 'lucide-react';
import { PermissionGuard } from '../components/auth/PermissionGuard';
import { ACTIONS } from '../context/AuthContext';
import { useBOMs, useSaveBOM, useDeleteBOM } from '../hooks/useBOMMasterData';
import { useInventory, useQuickAddInventoryItem } from '../hooks/useInventoryData';
import { useOrders } from '../hooks/useOrderData';
import { useFeedback } from '../context/FeedbackContext';

const generateRowId = () => Math.random().toString(36).substring(2, 10);

// Presets from User's Excel sheets (Image 2: BOLT & FITTING KITT, Image 4: PAKING)
const STANDARD_FITTING_KIT_PRESETS = [
    { fieldName: 'PVC RING WHITE', quantity: 2, rate: 0.42, total: 0.84, unit: 'Pcs' },
    { fieldName: 'SPRING', quantity: 2, rate: 1.75, total: 3.50, unit: 'Pcs' },
    { fieldName: 'LOCK CAME', quantity: 2, rate: 2.25, total: 4.50, unit: 'Pcs' },
    { fieldName: '0.5MM SLIM VOSOR', quantity: 4, rate: 0.60, total: 2.40, unit: 'Pcs' },
    { fieldName: '15MM SIRCLIP', quantity: 2, rate: 0.95, total: 1.90, unit: 'Pcs' },
    { fieldName: '8mm SQUARE ROAD (SPINDL)', quantity: 1, rate: 8.00, total: 8.00, unit: 'Pcs' },
    { fieldName: 'M5 GRUB BOLT', quantity: 10, rate: 0.80, total: 8.00, unit: 'Pcs' },
    { fieldName: 'MALE-FEMALE', quantity: 4, rate: 4.50, total: 18.00, unit: 'Pcs' },
    { fieldName: '4*19 SCREW', quantity: 10, rate: 0.17, total: 1.70, unit: 'Pcs' },
    { fieldName: '2.5mm KEY', quantity: 1, rate: 1.10, total: 1.10, unit: 'Pcs' },
    { fieldName: 'BEG AND PACKING', quantity: 1, rate: 1.50, total: 1.50, unit: 'Pcs' }
];

const STANDARD_PACKAGING_PRESETS = [
    { fieldName: 'CLOTH BAG MORTISH', quantity: 2, rate: 5.50, total: 11.00, unit: 'Pcs' },
    { fieldName: 'CLOTH BAG ROSE', quantity: 2, rate: 3.00, total: 6.00, unit: 'Pcs' },
    { fieldName: 'PRINT BOX', quantity: 1, rate: 32.00, total: 32.00, unit: 'Box' },
    { fieldName: 'CARTUN', quantity: 1, rate: 5.00, total: 5.00, unit: 'Box' },
    { fieldName: 'BHIDA PATI', quantity: 1, rate: 1.50, total: 1.50, unit: 'Pcs' }
];

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
                            1. In-House Parts (Process) • 2. Bolt & Fitting Kit • 3. Packaging (Paking)
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
                            <th className="p-4 text-center">In-House Parts</th>
                            <th className="p-4 text-center">Fitting Kit (AM)</th>
                            <th className="p-4 text-center">Packaging (Paking)</th>
                            <th className="p-4 text-right">Est. Unit Cost</th>
                            <th className="p-4">Version</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredBOMs.map((bom) => {
                            const fittingCost = (bom.components || []).reduce((sum, c) => sum + (Number(c.total) || (Number(c.quantity || 1) * Number(c.rate || 0))), 0);
                            const packingCost = (bom.packaging || []).reduce((sum, p) => sum + (Number(p.total) || (Number(p.quantity || 1) * Number(p.rate || 0))), 0);
                            const totalCost = fittingCost + packingCost;

                            return (
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
                                            {bom.inHouseParts?.length || 0} Parts
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                                            {bom.components?.length || 0} Items
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full">
                                            {bom.packaging?.length || 0} Pkg Items
                                        </span>
                                    </td>
                                    <td className="p-4 text-right text-sm font-black text-slate-800">
                                        {totalCost > 0 ? `₹${totalCost.toFixed(2)}` : '-'}
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">v{bom.version}</td>
                                    <td className="p-4">
                                        <span
                                            className={`px-2 py-1 text-xs font-bold rounded-full uppercase ${
                                                bom.isActive
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
                            );
                        })}
                        {filteredBOMs.length === 0 && (
                            <tr>
                                <td colSpan="9" className="p-8 text-center text-slate-400">
                                    No BOM recipes found matching your search.
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
// 2. 3-PART SPLIT BOM FORM (In-House | Fitting Kit | Packaging)
// ==========================================
const INITIAL_IN_HOUSE = {
    id: '',
    fieldName: '',
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
    rate: 0,
    total: 0,
    unit: 'Pcs',
    remarks: ''
};

const INITIAL_PACKAGING = {
    id: '',
    fieldName: '',
    inventoryGroupId: '',
    inventorySubItemId: '',
    quantity: 1,
    rate: 0,
    total: 0,
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
                        ? initialData.components.map(c => ({
                              ...c,
                              rate: c.rate ?? 0,
                              total: c.total ?? Number(((Number(c.quantity) || 1) * (Number(c.rate) || 0)).toFixed(2))
                          }))
                        : [{ ...INITIAL_AFTER_MARKET, id: generateRowId() }],
                packaging:
                    initialData.packaging?.length > 0
                        ? initialData.packaging.map(p => ({
                              ...p,
                              rate: p.rate ?? 0,
                              total: p.total ?? Number(((Number(p.quantity) || 1) * (Number(p.rate) || 0)).toFixed(2))
                          }))
                        : [{ ...INITIAL_PACKAGING, id: generateRowId() }]
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
            components: [{ ...INITIAL_AFTER_MARKET, id: generateRowId() }],
            packaging: [{ ...INITIAL_PACKAGING, id: generateRowId() }]
        };
    });

    const [quickModal, setQuickModal] = useState({
        open: false,
        targetType: 'afterMarket', // 'finishedCode' | 'inHouse' | 'afterMarket' | 'packaging'
        rowId: null,
        groupId: 'COMMON_STORE',
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

    const fittingInventoryItems = useMemo(() => {
        return allSubItems.filter(i => i.category === 'After-Market');
    }, [allSubItems]);

    const packagingInventoryItems = useMemo(() => {
        return allSubItems.filter(i => i.category === 'Packaging');
    }, [allSubItems]);

    const finishedCodeSuggestions = useMemo(() => {
        const map = new Map();
        allSubItems
            .filter(i => i.category === 'Finished Good' || i.itemCode)
            .forEach(i => {
                if (i.itemCode) {
                    map.set(i.itemCode.toUpperCase(), {
                        code: i.itemCode.toUpperCase(),
                        name: i.name,
                        size: '',
                        finishing: ''
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

    // Section 1: In-House Factory Parts Handlers
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

    // Section 2: Bolt & Fitting Kit Handlers (Auto-syncs with Inventory Items)
    const handleCompChange = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            components: prev.components.map(comp => {
                if (comp._id !== id && comp.id !== id) return comp;
                const updated = { ...comp, [field]: value };

                // If user selected or typed an item name, auto-sync rate and unit from Inventory!
                if (field === 'fieldName' && typeof value === 'string') {
                    const matched = fittingInventoryItems.find(
                        it => it.name?.trim().toUpperCase() === value.trim().toUpperCase() ||
                              it.itemCode?.trim().toUpperCase() === value.trim().toUpperCase()
                    );
                    if (matched) {
                        updated.fieldName = matched.name;
                        updated.rate = Number(matched.unitCost) || 0;
                        updated.unit = matched.uom || updated.unit || 'Pcs';
                        updated.inventorySubItemId = matched._id || matched.id;
                        updated.inventoryGroupId = matched.groupId;
                        const q = Number(updated.quantity) || 1;
                        updated.total = Number((q * (Number(matched.unitCost) || 0)).toFixed(2));
                    }
                }

                if (field === 'quantity' || field === 'rate') {
                    const q = field === 'quantity' ? Number(value) : Number(comp.quantity || 0);
                    const r = field === 'rate' ? Number(value) : Number(comp.rate || 0);
                    updated.total = Number((q * r).toFixed(2));
                }
                return updated;
            })
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

    const loadFittingKitPreset = () => {
        setFormData(prev => ({
            ...prev,
            components: STANDARD_FITTING_KIT_PRESETS.map(p => ({
                ...INITIAL_AFTER_MARKET,
                ...p,
                id: generateRowId()
            }))
        }));
        showToast('Standard Bolt & Fitting Kit Preset loaded (Image 2)!', 'success');
    };

    // Section 3: Packaging Handlers (Auto-syncs with Inventory Items)
    const handlePackagingChange = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            packaging: prev.packaging.map(pack => {
                if (pack._id !== id && pack.id !== id) return pack;
                const updated = { ...pack, [field]: value };

                // If user selected or typed a packaging item name, auto-sync rate and unit from Inventory!
                if (field === 'fieldName' && typeof value === 'string') {
                    const matched = packagingInventoryItems.find(
                        it => it.name?.trim().toUpperCase() === value.trim().toUpperCase() ||
                              it.itemCode?.trim().toUpperCase() === value.trim().toUpperCase()
                    );
                    if (matched) {
                        updated.fieldName = matched.name;
                        updated.rate = Number(matched.unitCost) || 0;
                        updated.unit = matched.uom || updated.unit || 'Pcs';
                        updated.inventorySubItemId = matched._id || matched.id;
                        updated.inventoryGroupId = matched.groupId;
                        const q = Number(updated.quantity) || 1;
                        updated.total = Number((q * (Number(matched.unitCost) || 0)).toFixed(2));
                    }
                }

                if (field === 'quantity' || field === 'rate') {
                    const q = field === 'quantity' ? Number(value) : Number(pack.quantity || 0);
                    const r = field === 'rate' ? Number(value) : Number(pack.rate || 0);
                    updated.total = Number((q * r).toFixed(2));
                }
                return updated;
            })
        }));
    };

    const addPackagingRow = () => {
        setFormData(prev => ({
            ...prev,
            packaging: [...prev.packaging, { ...INITIAL_PACKAGING, id: generateRowId() }]
        }));
    };

    const removePackagingRow = (id) => {
        if (formData.packaging.length === 1) return;
        setFormData(prev => ({
            ...prev,
            packaging: prev.packaging.filter(p => p._id !== id && p.id !== id)
        }));
    };

    const loadPackagingPreset = () => {
        setFormData(prev => ({
            ...prev,
            packaging: STANDARD_PACKAGING_PRESETS.map(p => ({
                ...INITIAL_PACKAGING,
                ...p,
                id: generateRowId()
            }))
        }));
        showToast('Standard Packaging Preset loaded (Image 4)!', 'success');
    };

    // Quick Add Modal Trigger
    const openQuickAddModal = (targetType, rowId = null, prefillName = '') => {
        const defaultCategory =
            targetType === 'finishedCode'
                ? 'Finished Good'
                : targetType === 'inHouse'
                ? 'Semi-Finished'
                : targetType === 'packaging'
                ? 'Packaging'
                : 'After-Market';

        const prefix =
            targetType === 'finishedCode'
                ? 'R-'
                : targetType === 'inHouse'
                ? 'SF-'
                : targetType === 'packaging'
                ? 'PKG-'
                : 'AM-';
        const randomNum = Math.floor(100 + Math.random() * 900);

        setQuickModal({
            open: true,
            targetType,
            rowId,
            groupId: 'COMMON_STORE',
            newGroupName: '',
            itemCode:
                prefillName && targetType === 'finishedCode'
                    ? prefillName.toUpperCase()
                    : `${prefix}${randomNum}`,
            name: prefillName || '',
            category: defaultCategory,
            uom: targetType === 'packaging' ? 'Pcs' : 'Pcs',
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
                handleCompChange(quickModal.rowId, 'rate', Number(createdSub.unitCost) || 0);
            } else if (quickModal.targetType === 'packaging' && quickModal.rowId) {
                handlePackagingChange(quickModal.rowId, 'fieldName', createdSub.name);
                handlePackagingChange(quickModal.rowId, 'inventorySubItemId', createdSub._id);
                handlePackagingChange(quickModal.rowId, 'inventoryGroupId', createdGroup._id);
                handlePackagingChange(quickModal.rowId, 'unit', createdSub.uom || 'Pcs');
                handlePackagingChange(quickModal.rowId, 'rate', Number(createdSub.unitCost) || 0);
            }

            showToast(`Added "${createdSub.name}" to Inventory without group requirement!`, 'success');
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

        const cleanPackaging = formData.packaging
            .filter(p => p.inventorySubItemId || (p.fieldName && p.fieldName.trim() !== ''))
            .map(({ id, ...rest }) => rest);

        if (cleanInHouse.length === 0 && cleanComponents.length === 0 && cleanPackaging.length === 0) {
            showToast('Please add at least one In-House Part, Fitting Item, or Packaging Item', 'warning');
            return;
        }

        try {
            await onSave({
                ...formData,
                finishedItemCode: formData.finishedItemCode.trim().toUpperCase(),
                inHouseParts: cleanInHouse,
                components: cleanComponents,
                packaging: cleanPackaging
            });
            showToast('BOM Recipe saved and synced with In-House, Fitting & Packaging!', 'success');
            onNavigate('list');
        } catch (error) {
            showToast(error.message || 'Failed to save BOM', 'error');
        }
    };

    // Calculate recipe live cost summaries
    const totalFittingCost = useMemo(() => {
        return (formData.components || []).reduce((sum, c) => sum + (Number(c.total) || (Number(c.quantity || 1) * Number(c.rate || 0))), 0);
    }, [formData.components]);

    const totalPackagingCost = useMemo(() => {
        return (formData.packaging || []).reduce((sum, p) => sum + (Number(p.total) || (Number(p.quantity || 1) * Number(p.rate || 0))), 0);
    }, [formData.packaging]);

    const grandRecipeCost = totalFittingCost + totalPackagingCost;

    return (
        <div className="space-y-6 max-w-[1550px] mx-auto pb-20">
            {/* Top Bar */}
            <div className="flex justify-between items-center bg-white px-6 py-4 rounded-xl border border-slate-200 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-2 text-sm">
                    <button onClick={() => onNavigate('list')} className="text-slate-400 hover:text-slate-600">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-slate-400">Master BOM</span>
                    <span className="text-slate-300">»</span>
                    <span className="font-bold text-slate-800 text-base">
                        {isEditing ? `Edit Recipe: ${formData.finishedItemCode}` : 'New Split-BOM Recipe'}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => onNavigate('list')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50"
                    >
                        <X className="w-4 h-4" /> Cancel
                    </button>
                    <PermissionGuard module="bom" action={isEditing ? ACTIONS.EDIT : ACTIONS.ADD}>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 text-white text-sm font-black rounded-lg hover:bg-indigo-700 shadow-md transition-all"
                        >
                            <Check className="w-4 h-4" /> Save & Sync Recipe
                        </button>
                    </PermissionGuard>
                </div>
            </div>

            {/* Header: Finished Product Code (Rudra Code) */}
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
                                    setFormData(p => ({ ...p, finishedItemCode: val }));
                                    const match = finishedCodeSuggestions.find(i => i.code === val);
                                    if (match) {
                                        setFormData(p => ({
                                            ...p,
                                            finishedItemCode: match.code,
                                            productName: match.name || p.productName,
                                            defaultSize: match.size || p.defaultSize,
                                            defaultFinishing: match.finishing || p.defaultFinishing,
                                            hsnSac: match.hsnSac || p.hsnSac
                                        }));
                                    }
                                }}
                                placeholder="e.g. 9055, R-001"
                                className="w-full px-3 py-2 text-sm font-bold text-indigo-700 border border-slate-200 rounded-lg focus:border-indigo-500 outline-none uppercase"
                            />
                            <datalist id="finished-code-suggestions">
                                {finishedCodeSuggestions.map(s => (
                                    <option key={s.code} value={s.code}>
                                        {s.name}
                                    </option>
                                ))}
                            </datalist>
                            <button
                                type="button"
                                onClick={() => openQuickAddModal('finishedCode', null, formData.finishedItemCode)}
                                title="Register New Finished Rudra Code in Inventory"
                                className="px-2.5 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg shrink-0"
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
                            placeholder="e.g. mortise"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-indigo-500 outline-none font-medium"
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
                            placeholder="e.g. 6 Inch"
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
                                className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg outline-none font-bold text-center"
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

                {/* Live Recipe Cost Strip */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-6">
                        <div>
                            <span className="text-slate-400 font-bold block">1. IN-HOUSE PARTS:</span>
                            <span className="font-extrabold text-blue-700 text-sm">{formData.inHouseParts.length} Parts</span>
                        </div>
                        <div>
                            <span className="text-slate-400 font-bold block">2. FITTING KIT (AM):</span>
                            <span className="font-extrabold text-emerald-700 text-sm">₹{totalFittingCost.toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 font-bold block">3. PACKAGING (PAKING):</span>
                            <span className="font-extrabold text-amber-700 text-sm">₹{totalPackagingCost.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="bg-slate-900 text-white px-4 py-2 rounded-xl flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-amber-400" />
                        <span>ESTIMATED HARDWARE + PACKING COST:</span>
                        <span className="font-black text-amber-400 text-base">₹{grandRecipeCost.toFixed(2)} / Set</span>
                    </div>
                </div>
            </div>

            {/* 3-CARD BOM RECIPE GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

                {/* 1. IN-HOUSE FACTORY PARTS -> PROCESS MODULE */}
                <div className="bg-white rounded-xl border-2 border-blue-200 overflow-hidden shadow-sm flex flex-col">
                    <div className="px-5 py-4 border-b border-blue-100 bg-blue-50/70 flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-blue-600 text-white rounded-lg">
                                <Factory className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                                    1. In-House Factory Parts
                                </h2>
                                <p className="text-xs text-blue-700 font-medium">
                                    Round Dabi, Key Hole → Process Module
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={addInHouseRow}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-sm"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add Part
                        </button>
                    </div>

                    <div className="p-3 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                                    <th className="pb-2 pr-2">Field Name</th>
                                    <th className="pb-2 px-1 w-20 text-center">Qty Pcs</th>
                                    <th className="pb-2 px-1 w-16 text-center">Wt (g)</th>
                                    <th className="pb-2 px-1 w-24">Process</th>
                                    <th className="pb-2 w-8 text-center">Act</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {formData.inHouseParts.map((part) => {
                                    const rowId = part._id || part.id;
                                    return (
                                        <tr key={rowId} className="hover:bg-slate-50">
                                            <td className="py-2 pr-1">
                                                <div className="flex gap-1">
                                                    <input
                                                        type="text"
                                                        value={part.fieldName}
                                                        onChange={(e) => handleInHouseChange(rowId, 'fieldName', e.target.value)}
                                                        placeholder="Part Name"
                                                        className="w-full px-2 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => openQuickAddModal('inHouse', rowId, part.fieldName)}
                                                        title="Sync with Inventory"
                                                        className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg shrink-0"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-2 px-1">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={part.qtyInPieces}
                                                    onChange={(e) => handleInHouseChange(rowId, 'qtyInPieces', Number(e.target.value))}
                                                    className="w-full px-1.5 py-1.5 text-xs font-bold text-blue-700 text-center border border-slate-200 rounded-lg outline-none"
                                                />
                                            </td>
                                            <td className="py-2 px-1">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.1"
                                                    value={part.weightPerPcGrams || ''}
                                                    onChange={(e) => handleInHouseChange(rowId, 'weightPerPcGrams', Number(e.target.value))}
                                                    placeholder="g"
                                                    className="w-full px-1.5 py-1.5 text-xs text-center border border-slate-200 rounded-lg outline-none"
                                                />
                                            </td>
                                            <td className="py-2 px-1">
                                                <input
                                                    type="text"
                                                    value={part.processName || ''}
                                                    onChange={(e) => handleInHouseChange(rowId, 'processName', e.target.value)}
                                                    placeholder="Process"
                                                    className="w-full px-1.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none"
                                                />
                                            </td>
                                            <td className="py-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeInHouseRow(rowId)}
                                                    disabled={formData.inHouseParts.length === 1}
                                                    className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-30"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. BOLT & FITTING KIT (AFTER-MARKET REQUIREMENTS - Image 2 Style) */}
                <div className="bg-white rounded-xl border-2 border-emerald-200 overflow-hidden shadow-sm flex flex-col">
                    <div className="px-5 py-4 border-b border-emerald-100 bg-emerald-50/70 flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-emerald-600 text-white rounded-lg">
                                <Package className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                                    2. Bolt & Fitting Kit (AM)
                                </h2>
                                <p className="text-xs text-emerald-700 font-medium">
                                    Screws, Springs, Rods (Image 2)
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={loadFittingKitPreset}
                                title="Load standard preset items from Image 2"
                                className="px-2 py-1 bg-white border border-emerald-300 text-emerald-800 text-[11px] font-bold rounded-lg hover:bg-emerald-100"
                            >
                                ⚡ Preset
                            </button>
                            <button
                                type="button"
                                onClick={addComponentRow}
                                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                        </div>
                    </div>

                    <div className="p-3 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                                    <th className="pb-2 pr-1">Particulars</th>
                                    <th className="pb-2 px-1 w-14 text-center">Qty</th>
                                    <th className="pb-2 px-1 w-16 text-right">Rate</th>
                                    <th className="pb-2 px-1 w-16 text-right">Total</th>
                                    <th className="pb-2 w-8 text-center">Act</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {formData.components.map((comp) => {
                                    const rowId = comp._id || comp.id;
                                    return (
                                        <tr key={rowId} className="hover:bg-slate-50">
                                            <td className="py-2 pr-1">
                                                <div className="flex gap-1">
                                                    <input
                                                        list={`fitting-datalist-${rowId}`}
                                                        type="text"
                                                        value={comp.fieldName}
                                                        onChange={(e) => handleCompChange(rowId, 'fieldName', e.target.value)}
                                                        placeholder="e.g. PVC RING, SPRING"
                                                        className="w-full px-2 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg outline-none uppercase"
                                                    />
                                                    <datalist id={`fitting-datalist-${rowId}`}>
                                                        {fittingInventoryItems.map(fit => (
                                                            <option key={fit._id || fit.itemCode} value={fit.name}>
                                                                Rate: ₹{fit.unitCost} • Stock: {fit.stock} {fit.uom}
                                                            </option>
                                                        ))}
                                                    </datalist>
                                                    <button
                                                        type="button"
                                                        onClick={() => openQuickAddModal('afterMarket', rowId, comp.fieldName)}
                                                        title="Quick Add to Inventory without group name"
                                                        className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg shrink-0"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-2 px-1">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={comp.quantity}
                                                    onChange={(e) => handleCompChange(rowId, 'quantity', Number(e.target.value))}
                                                    className="w-full px-1 py-1.5 text-xs font-bold text-center border border-slate-200 rounded-lg outline-none"
                                                />
                                            </td>
                                            <td className="py-2 px-1">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={comp.rate}
                                                    onChange={(e) => handleCompChange(rowId, 'rate', Number(e.target.value))}
                                                    className="w-full px-1 py-1.5 text-xs text-right border border-slate-200 rounded-lg outline-none"
                                                />
                                            </td>
                                            <td className="py-2 px-1 text-right text-xs font-black text-emerald-700">
                                                ₹{(Number(comp.total) || (Number(comp.quantity || 1) * Number(comp.rate || 0))).toFixed(2)}
                                            </td>
                                            <td className="py-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeComponentRow(rowId)}
                                                    disabled={formData.components.length === 1}
                                                    className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-30"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-4 py-2.5 bg-emerald-50 border-t border-emerald-100 flex justify-between items-center text-xs">
                        <span className="font-bold text-emerald-900">Fitting Kit Sub-Total:</span>
                        <span className="font-black text-emerald-800 text-sm">₹{totalFittingCost.toFixed(2)}</span>
                    </div>
                </div>

                {/* 3. PACKAGING REQUIREMENTS (PAKING - Image 4 Style) */}
                <div className="bg-white rounded-xl border-2 border-amber-200 overflow-hidden shadow-sm flex flex-col">
                    <div className="px-5 py-4 border-b border-amber-100 bg-amber-50/70 flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-amber-600 text-white rounded-lg">
                                <Boxes className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                                    3. Packaging (Paking)
                                </h2>
                                <p className="text-xs text-amber-700 font-medium">
                                    Bags, Print Box, Cartun (Image 4)
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={loadPackagingPreset}
                                title="Load standard preset packaging from Image 4"
                                className="px-2 py-1 bg-white border border-amber-300 text-amber-800 text-[11px] font-bold rounded-lg hover:bg-amber-100"
                            >
                                ⚡ Preset
                            </button>
                            <button
                                type="button"
                                onClick={addPackagingRow}
                                className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                        </div>
                    </div>

                    <div className="p-3 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                                    <th className="pb-2 pr-1">Particulars</th>
                                    <th className="pb-2 px-1 w-14 text-center">Qty</th>
                                    <th className="pb-2 px-1 w-16 text-right">Rate</th>
                                    <th className="pb-2 px-1 w-16 text-right">Total</th>
                                    <th className="pb-2 w-8 text-center">Act</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {formData.packaging.map((pack) => {
                                    const rowId = pack._id || pack.id;
                                    return (
                                        <tr key={rowId} className="hover:bg-slate-50">
                                            <td className="py-2 pr-1">
                                                <div className="flex gap-1">
                                                    <input
                                                        list={`pack-datalist-${rowId}`}
                                                        type="text"
                                                        value={pack.fieldName}
                                                        onChange={(e) => handlePackagingChange(rowId, 'fieldName', e.target.value)}
                                                        placeholder="e.g. CLOTH BAG, PRINT BOX"
                                                        className="w-full px-2 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg outline-none uppercase"
                                                    />
                                                    <datalist id={`pack-datalist-${rowId}`}>
                                                        {packagingInventoryItems.map(pkg => (
                                                            <option key={pkg._id || pkg.itemCode} value={pkg.name}>
                                                                Rate: ₹{pkg.unitCost} • Stock: {pkg.stock} {pkg.uom}
                                                            </option>
                                                        ))}
                                                    </datalist>
                                                    <button
                                                        type="button"
                                                        onClick={() => openQuickAddModal('packaging', rowId, pack.fieldName)}
                                                        title="Quick Add Packaging Item to Inventory"
                                                        className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg shrink-0"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-2 px-1">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={pack.quantity}
                                                    onChange={(e) => handlePackagingChange(rowId, 'quantity', Number(e.target.value))}
                                                    className="w-full px-1 py-1.5 text-xs font-bold text-center border border-slate-200 rounded-lg outline-none"
                                                />
                                            </td>
                                            <td className="py-2 px-1">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={pack.rate}
                                                    onChange={(e) => handlePackagingChange(rowId, 'rate', Number(e.target.value))}
                                                    className="w-full px-1 py-1.5 text-xs text-right border border-slate-200 rounded-lg outline-none"
                                                />
                                            </td>
                                            <td className="py-2 px-1 text-right text-xs font-black text-amber-700">
                                                ₹{(Number(pack.total) || (Number(pack.quantity || 1) * Number(pack.rate || 0))).toFixed(2)}
                                            </td>
                                            <td className="py-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removePackagingRow(rowId)}
                                                    disabled={formData.packaging.length === 1}
                                                    className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-30"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-100 flex justify-between items-center text-xs">
                        <span className="font-bold text-amber-900">Packaging Sub-Total:</span>
                        <span className="font-black text-amber-800 text-sm">₹{totalPackagingCost.toFixed(2)}</span>
                    </div>
                </div>

            </div>

            {/* QUICK-ADD INVENTORY MODAL (WITHOUT MANDATORY GROUP NAME) */}
            {quickModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
                        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-base flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                    {quickModal.targetType === 'finishedCode'
                                        ? 'Register Finished Product'
                                        : quickModal.targetType === 'packaging'
                                        ? 'Add Packaging Item to Inventory'
                                        : quickModal.targetType === 'inHouse'
                                        ? 'Register Factory Part'
                                        : 'Add Bolt & Fitting Item to Inventory'}
                                </h3>
                                <p className="text-xs text-slate-300">
                                    Adds directly to Inventory • No group required
                                </p>
                            </div>
                            <button onClick={() => setQuickModal(p => ({ ...p, open: false }))}>
                                <X className="w-5 h-5 text-slate-400 hover:text-white" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                                    Inventory Repository / Store
                                </label>
                                <select
                                    value={quickModal.groupId}
                                    onChange={(e) => setQuickModal(p => ({ ...p, groupId: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white font-semibold text-slate-800 outline-none"
                                >
                                    <option value="COMMON_STORE">
                                        ⚡ Common Store (Fitting & Packaging) — No Group Needed
                                    </option>
                                    {inventory.map(g => (
                                        <option key={g._id} value={g._id}>
                                            {g.groupName}
                                        </option>
                                    ))}
                                    <option value="NEW_GROUP">+ Create New Custom Group...</option>
                                </select>
                            </div>

                            {quickModal.groupId === 'NEW_GROUP' && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                                        New Group Name (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={quickModal.newGroupName}
                                        onChange={(e) => setQuickModal(p => ({ ...p, newGroupName: e.target.value }))}
                                        placeholder="Leave blank for automatic Common Store"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                                        Item Code / SKU *
                                    </label>
                                    <input
                                        type="text"
                                        value={quickModal.itemCode}
                                        onChange={(e) => setQuickModal(p => ({ ...p, itemCode: e.target.value.toUpperCase() }))}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-bold uppercase text-indigo-700"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                                        Category
                                    </label>
                                    <select
                                        value={quickModal.category}
                                        onChange={(e) => setQuickModal(p => ({ ...p, category: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white font-medium"
                                    >
                                        <option value="Packaging">Packaging (Paking)</option>
                                        <option value="After-Market">After-Market (Fitting Kit)</option>
                                        <option value="Raw Material">Raw Material</option>
                                        <option value="Semi-Finished">Semi-Finished (In-House)</option>
                                        <option value="Finished Good">Finished Good</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                                    Item Name / Particulars *
                                </label>
                                <input
                                    type="text"
                                    value={quickModal.name}
                                    onChange={(e) => setQuickModal(p => ({ ...p, name: e.target.value }))}
                                    placeholder="e.g. PVC RING, CLOTH BAG MORTISH"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-semibold"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">UOM</label>
                                    <select
                                        value={quickModal.uom}
                                        onChange={(e) => setQuickModal(p => ({ ...p, uom: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white font-medium"
                                    >
                                        <option value="Pcs">Pcs</option>
                                        <option value="Box">Box</option>
                                        <option value="Set">Set</option>
                                        <option value="Kg">Kg</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cost (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={quickModal.unitCost}
                                        onChange={(e) => setQuickModal(p => ({ ...p, unitCost: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Stock</label>
                                    <input
                                        type="number"
                                        value={quickModal.stock}
                                        onChange={(e) => setQuickModal(p => ({ ...p, stock: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-semibold"
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
                                    className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-black hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm"
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
