import { useState, useEffect, useMemo, useRef } from "react";
import {
    ClipboardList, Factory, Package, Trash2, Archive, Settings,
    X, GripVertical, Loader2, Plus, Pencil, Lock, ShieldAlert, Check, Sparkles,
    AlertTriangle, Truck, RotateCcw, Search, UserCheck, UserPlus, Building2,
    Phone, MapPin, Boxes, BookmarkPlus, Layers, ArrowRight, CheckCircle2,
    ChevronDown, RefreshCw, Hash, Tag, PlusCircle, Scale
} from "lucide-react";
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    useSensor, useSensors
} from "@dnd-kit/core";
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates,
    useSortable, verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Data Hooks & Auth
import { useAuth } from "../context/AuthContext";
import { useOrders } from "../hooks/useOrderData";
import {
    useProcessSequence,
    useAllProcessSequences,
    useSaveProcessSequence,
    useDispatchOrder
} from "../hooks/useProcessData";
import { useCalculateOrderBOM } from "../hooks/useBOMData";
import {
    useInventory,
    useReserveRejected,
    useReleaseRejected,
    useDeductProcessItem,
    useReleaseProcessItem
} from "../hooks/useInventoryData";
import { useCustomerList, useCreateCustomer, useUpdateCustomer } from "../hooks/useCustomerData";
import { useFeedback } from "../context/FeedbackContext";
import api from "../services/api/apiClient";

// ==========================================
// CONSTANTS & HELPERS
// ==========================================
const ALL_FIELDS = [
    { key: "partyName", label: "Party Name", type: "text" },
    { key: "size", label: "Size", type: "text" },
    { key: "size_unit", label: "Size Unit", type: "select", options: ["Pieces", "Inches"] },
    { key: "kg", label: "KG (Raw Material)", type: "number" },
    { key: "weightPer1000", label: "Pcs Wt (KG)", type: "number" },
    { key: "inputQty", label: "Pieces Required", type: "number" },
    { key: "pending", label: "Pending", type: "number" },
    { key: "rejection", label: "Rejection", type: "number" },
    { key: "extra", label: "Inventory (Store)", type: "number" },
    { key: "output", label: "Output To Next Process", type: "number", calculated: true },
    { key: "cutting", label: "Cutting (Auto)", type: "number", calculated: true },
    { key: "hole", label: "Hole (Per Pc)", type: "number" },
    { key: "rate", label: "Rate", type: "number" },
    { key: "totalCost", label: "Total Cost", type: "number", calculated: true },
    { key: "finishing", label: "Finishing", type: "text" },
    { key: "piecesPerBox", label: "Pieces Per Box", type: "number" },
    { key: "totalBoxes", label: "Total Boxes", type: "number", calculated: true },
];

const STANDARD_CUSTOMER_GROUPS = [
    { value: 'all', label: 'All Groups' },
    { value: 'buffing', label: 'Buffing' },
    { value: 'polishing', label: 'Polishing' },
    { value: 'cutting', label: 'Cutting' },
    { value: 'plating', label: 'Plating / Nikal' },
    { value: 'turning', label: 'Turning / Lathe' },
    { value: 'sundry_creditors', label: 'Sundry Creditors (Vendors)' },
    { value: 'sundry_debtors', label: 'Sundry Debtors (Clients)' },
    { value: 'assembling', label: 'Assembling' },
    { value: 'packaging', label: 'Packaging' },
];

const CUSTOM_GROUPS_STORAGE_KEY = 'rudra_custom_customer_groups';

const loadCustomGroups = () => {
    try {
        const stored = localStorage.getItem(CUSTOM_GROUPS_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveCustomGroup = (newGroup) => {
    try {
        const clean = String(newGroup || '').trim().toLowerCase().replace(/\s+/g, '_');
        if (!clean) return clean;
        const current = loadCustomGroups();
        if (!current.includes(clean)) {
            const next = [...current, clean];
            localStorage.setItem(CUSTOM_GROUPS_STORAGE_KEY, JSON.stringify(next));
        }
        return clean;
    } catch (e) {
        console.error("Failed to save custom group:", e);
        return newGroup;
    }
};

const getAllDynamicGroups = (customers = [], extraGroup = null) => {
    const set = new Set();
    STANDARD_CUSTOMER_GROUPS.forEach((g) => {
        if (g.value !== 'all') set.add(g.value.toLowerCase().trim());
    });
    loadCustomGroups().forEach((g) => {
        if (g) set.add(g.toLowerCase().trim());
    });
    customers.forEach((c) => {
        if (c.group) set.add(c.group.toLowerCase().trim());
    });
    if (extraGroup && extraGroup !== 'all') {
        set.add(extraGroup.toLowerCase().trim());
    }
    return Array.from(set).map((g) => ({
        value: g,
        label: g.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    }));
};

const DEFAULT_TEMPLATES = [
    {
        id: 'tpl-cutting',
        name: 'Cutting Process',
        processName: 'Cutting',
        activeFields: ['size', 'kg', 'weightPer1000', 'inputQty', 'pending', 'cutting', 'rejection', 'output', 'rate', 'totalCost'],
        partyGroupFilter: 'cutting'
    },
    {
        id: 'tpl-turning',
        name: 'Turning / Lathe',
        processName: 'Turning',
        activeFields: ['kg', 'weightPer1000', 'inputQty', 'pending', 'rejection', 'output', 'rate', 'totalCost'],
        partyGroupFilter: 'turning'
    },
    {
        id: 'tpl-buffing',
        name: 'Buffing Process',
        processName: 'Buffing',
        activeFields: ['inputQty', 'pending', 'rejection', 'extra', 'output', 'rate', 'totalCost'],
        partyGroupFilter: 'buffing'
    },
    {
        id: 'tpl-polishing',
        name: 'Polishing / Nikal Finish',
        processName: 'Polishing',
        activeFields: ['inputQty', 'pending', 'rejection', 'output', 'rate', 'totalCost', 'finishing'],
        partyGroupFilter: 'polishing'
    },
    {
        id: 'tpl-packaging',
        name: 'Boxing & Packaging',
        processName: 'Packaging',
        activeFields: ['inputQty', 'pending', 'piecesPerBox', 'totalBoxes'],
        partyGroupFilter: 'packaging'
    }
];

const TEMPLATE_STORAGE_KEY = "rudra_process_templates";

const loadTemplates = () => {
    try {
        const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
        localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
        return DEFAULT_TEMPLATES;
    } catch (e) {
        console.error("Failed to load templates", e);
        return DEFAULT_TEMPLATES;
    }
};

const saveTemplate = (template) => {
    try {
        const templates = loadTemplates();
        const existingIdx = templates.findIndex(
            (t) => t.id === template.id || t.name?.toLowerCase() === template.name?.toLowerCase()
        );
        let updated;
        if (existingIdx >= 0) {
            updated = [...templates];
            updated[existingIdx] = { ...template, id: templates[existingIdx].id };
        } else {
            updated = [...templates, { ...template, id: template.id || generateId() }];
        }
        localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(updated));
        return updated;
    } catch (e) {
        console.error("Failed to save template", e);
        return [];
    }
};

const deleteTemplate = (id) => {
    try {
        const templates = loadTemplates().filter((t) => t.id !== id);
        localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
        return templates;
    } catch (e) {
        console.error("Failed to delete template", e);
        return [];
    }
};

const generateId = () => Math.random().toString(36).substring(2, 10);

// ==========================================
// MAIN MODULE ENTRY
// ==========================================
export default function ProcessModule() {
    const [view, setView] = useState("list");
    const [selectedOrder, setSelectedOrder] = useState(null);
    const { data: orders = [], isLoading: ordersLoading } = useOrders();

    if (view === "list") {
        return (
            <div className="w-full">
                <ProcessOrdersList
                    orders={orders}
                    loading={ordersLoading}
                    onOpen={(order) => {
                        setSelectedOrder(order);
                        setView("detail");
                    }}
                />
            </div>
        );
    }

    return (
        <div className="w-full">
            <ProcessDetail
                key={selectedOrder._id}
                order={selectedOrder}
                onBack={() => {
                    setView("list");
                    setSelectedOrder(null);
                }}
            />
        </div>
    );
}

// ==========================================
// 1. ORDERS LIST WITH STATUS FILTER TABS
// ==========================================
const PROCESS_STATUS_STYLES = {
    Pending: 'bg-orange-100 text-orange-700 border-orange-200',
    Approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'In Progress': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    Dispatched: 'bg-blue-100 text-blue-700 border-blue-200',
};

function ProcessOrdersList({ orders, loading, onOpen }) {
    const [statusTab, setStatusTab] = useState("all"); // 'all' | 'pending' | 'in_progress' | 'dispatched'

    // Status Counts for Tab Badges
    const counts = useMemo(() => {
        let pending = 0;
        let inProgress = 0;
        let dispatched = 0;

        orders.forEach((o) => {
            const st = (o.status || '').toLowerCase();
            if (st === 'pending') {
                pending++;
            } else if (st === 'approved' || st === 'in progress') {
                inProgress++;
            } else if (st === 'dispatched') {
                dispatched++;
            }
        });

        return {
            all: orders.length,
            pending,
            inProgress,
            dispatched
        };
    }, [orders]);

    // Filter by Tab and Sort Urgent Orders First
    const filteredOrders = useMemo(() => {
        const filtered = orders.filter((order) => {
            const st = (order.status || '').toLowerCase();
            if (statusTab === 'pending') return st === 'pending';
            if (statusTab === 'in_progress') return st === 'approved' || st === 'in progress';
            if (statusTab === 'dispatched') return st === 'dispatched';
            return true; // 'all'
        });

        return [...filtered].sort((a, b) => {
            const priorityOrder = { urgent: 0, mixed: 1, normal: 2 };
            const pa = priorityOrder[a.orderPriority] ?? 2;
            const pb = priorityOrder[b.orderPriority] ?? 2;
            if (pa !== pb) return pa - pb;
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
    }, [orders, statusTab]);

    return (
        <div className="space-y-4 max-w-7xl mx-auto pb-12">
            {/* Page Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                        <ClipboardList className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Process Orders</h1>
                        <p className="text-sm text-slate-500">
                            Urgent ("Pehla Maal") orders are prioritized at the top • Select an order to manage size-wise process flows
                        </p>
                    </div>
                </div>
            </div>

            {/* Feature A: Status Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                    type="button"
                    onClick={() => setStatusTab("all")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        statusTab === "all"
                            ? "bg-slate-800 text-white shadow-sm"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                >
                    <span>All Orders</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        statusTab === "all" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                        {counts.all}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setStatusTab("pending")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        statusTab === "pending"
                            ? "bg-orange-600 text-white shadow-sm"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-orange-50 hover:text-orange-700"
                    }`}
                >
                    <span>⏳ Pending</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        statusTab === "pending" ? "bg-orange-700 text-white" : "bg-orange-100 text-orange-700"
                    }`}>
                        {counts.pending}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setStatusTab("in_progress")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        statusTab === "in_progress"
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700"
                    }`}
                >
                    <span>⚙️ In Progress</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        statusTab === "in_progress" ? "bg-indigo-700 text-white" : "bg-indigo-100 text-indigo-700"
                    }`}>
                        {counts.inProgress}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setStatusTab("dispatched")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        statusTab === "dispatched"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                >
                    <span>🚚 Dispatched</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        statusTab === "dispatched" ? "bg-blue-700 text-white" : "bg-blue-100 text-blue-700"
                    }`}>
                        {counts.dispatched}
                    </span>
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[750px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="p-4 w-8"></th>
                                    <th className="p-4">Order ID (PI No.)</th>
                                    <th className="p-4">Client Name</th>
                                    <th className="p-4">Products & Size Variants</th>
                                    <th className="p-4 text-center">Urgent / Normal Qty</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredOrders.map((order) => {
                                    const isUrgent = order.orderPriority === 'urgent';
                                    const isMixed = order.orderPriority === 'mixed';
                                    const urgentQty = (order.items || [])
                                        .filter((i) => i.priority === 'urgent')
                                        .reduce((a, i) => a + Number(i.qty || 0), 0);
                                    const normalQty = (order.items || [])
                                        .filter((i) => i.priority !== 'urgent')
                                        .reduce((a, i) => a + Number(i.qty || 0), 0);

                                    return (
                                        <tr
                                            key={order._id}
                                            className={`hover:bg-slate-50 transition-colors ${
                                                isUrgent
                                                    ? 'border-l-4 border-red-500 bg-red-50/30'
                                                    : isMixed
                                                    ? 'border-l-4 border-amber-400 bg-amber-50/20'
                                                    : ''
                                            }`}
                                        >
                                            <td className="p-4 text-center">
                                                {isUrgent && <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />}
                                                {isMixed && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                                            </td>
                                            <td className="p-4 font-bold text-blue-600">{order.piNo}</td>
                                            <td className="p-4">
                                                <div className="text-sm font-semibold text-slate-800">{order.name}</div>
                                                <div className="text-xs text-slate-400">{order.brandName || '-'}</div>
                                            </td>
                                            <td className="p-4 text-xs font-bold text-indigo-600">
                                                {(order.items || [])
                                                    .map((i) => `${i.rudraCode}${i.size ? ` (${i.size}: ${i.qty})` : ` (${i.qty})`}`)
                                                    .join(', ') || '-'}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                    {urgentQty > 0 && (
                                                        <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                                                            🔴 {urgentQty} Urgent
                                                        </span>
                                                    )}
                                                    {normalQty > 0 && (
                                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                                                            {normalQty} Normal
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full border uppercase ${
                                                        PROCESS_STATUS_STYLES[order.status] || 'bg-orange-100 text-orange-700 border-orange-200'
                                                    }`}>
                                                        {order.status || 'Pending'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => onOpen(order)}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                                                >
                                                    Open Process
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-slate-400">
                                            No process orders found for this status tab.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// ==========================================
// 2. PROCESS DETAIL (Variant Tabs, BOM Sync, Stock & Party Management)
// ==========================================
function ProcessDetail({ order, onBack }) {
    const { hasPermission, hasProcessStepPermission, isAdmin } = useAuth();
    const [showProcessModal, setShowProcessModal] = useState(false);

    // Modal state for Feature B (Party Quick Add & Picker)
    const [partyModalStep, setPartyModalStep] = useState(null);
    const [partyModalInitialCustomer, setPartyModalInitialCustomer] = useState(null);
    // Modal state for Feature E (Inventory Picker)
    const [inventoryModalStep, setInventoryModalStep] = useState(null);

    // Queries
    const { data: defaultSequence, isLoading: singleLoading } = useProcessSequence(order._id);
    const { data: allSequences = [], isLoading: allLoading } = useAllProcessSequences(order._id);
    const { data: inventoryGroups = [] } = useInventory();
    const { data: customers = [] } = useCustomerList();

    // Mutations
    const saveMutation = useSaveProcessSequence();
    const dispatchMutation = useDispatchOrder();
    const reserveRejectedMutation = useReserveRejected();
    const releaseRejectedMutation = useReleaseRejected();
    const deductProcessItemMutation = useDeductProcessItem();
    const releaseProcessItemMutation = useReleaseProcessItem();
    const createCustomerMutation = useCreateCustomer();
    const updateCustomerMutation = useUpdateCustomer();

    const { showToast, showConfirm } = useFeedback();

    // Build Variant Tabs (Each line item gets an independent process sequence)
    const orderVariants = useMemo(() => {
        const items = order.items || [];
        return items
            .map((item, idx) => ({
                variantKey: String(item._id || item.id || `item-${idx}`),
                rudraCode: item.rudraCode || 'ITEM',
                size: item.size || `Batch ${idx + 1}`,
                qty: Number(item.qty || 0),
                priority: item.priority || 'normal',
                rawItem: item
            }))
            .sort((a, b) => (a.priority === 'urgent' ? -1 : 1) - (b.priority === 'urgent' ? -1 : 1));
    }, [order.items]);

    const [activeVariantKey, setActiveVariantKey] = useState(() =>
        orderVariants.length > 1 ? orderVariants[0].variantKey : 'all'
    );

    const activeVariant = useMemo(() => {
        if (activeVariantKey === 'all') return null;
        return orderVariants.find((v) => v.variantKey === activeVariantKey) || null;
    }, [activeVariantKey, orderVariants]);

    // Scoped Order for BOM Calculation
    const scopedOrderForBOM = useMemo(() => {
        if (!activeVariant) return order;
        return {
            ...order,
            _id: `${order._id}_${activeVariant.variantKey}`,
            items: [activeVariant.rawItem]
        };
    }, [order, activeVariant]);

    const { data: bomData, isLoading: bomLoading } = useCalculateOrderBOM(scopedOrderForBOM);

    // Resolve active remote document
    const activeRemoteDoc = useMemo(() => {
        if (activeVariantKey === 'all') {
            return (
                allSequences.find((s) => !s.orderItemId) ||
                defaultSequence ||
                allSequences[0] ||
                null
            );
        }
        return (
            allSequences.find(
                (s) =>
                    s.orderItemId === activeVariantKey ||
                    (activeVariant?.size && s.sizeVariant === activeVariant.size && s.priority === activeVariant.priority)
            ) || null
        );
    }, [activeVariantKey, activeVariant, allSequences, defaultSequence]);

    const [sequence, setSequence] = useState([]);
    const [rejectedUsage, setRejectedUsage] = useState([]);

    // Sync local state when switching variants or loading remote data
    useEffect(() => {
        if (activeRemoteDoc) {
            setSequence(activeRemoteDoc.steps || []);
            setRejectedUsage(activeRemoteDoc.rejectedUsage || []);
        } else {
            setSequence([]);
            setRejectedUsage([]);
        }
    }, [activeRemoteDoc, activeVariantKey]);

    // Find available rejected pieces in inventory
    const availableRejectedPieces = useMemo(() => {
        const rudraCodesInOrder = [
            ...new Set((order.items || []).map((i) => i.rudraCode?.toUpperCase()).filter(Boolean))
        ];
        const rejected = [];
        inventoryGroups.forEach((group) => {
            (group.subItems || []).forEach((sub) => {
                if (sub.category === 'Rejected' && Number(sub.stock || 0) > 0) {
                    const available = Math.max(0, Number(sub.stock || 0) - Number(sub.reservedInProcess || 0));
                    rejected.push({
                        inventoryGroupId: group._id,
                        inventorySubItemId: sub._id,
                        itemCode: sub.itemCode,
                        itemName: sub.name,
                        availableQty: available,
                        totalStock: Number(sub.stock || 0),
                        reservedInProcess: Number(sub.reservedInProcess || 0),
                        matchesOrder: rudraCodesInOrder.includes(sub.itemCode?.toUpperCase())
                    });
                }
            });
        });
        return rejected.sort((a, b) => (b.matchesOrder ? 1 : 0) - (a.matchesOrder ? 1 : 0));
    }, [inventoryGroups, order.items]);

    const canConfigureSteps =
        isAdmin || hasPermission("process", "add") || hasPermission("process", "edit");
    const canSave =
        isAdmin ||
        hasPermission("process", "add") ||
        hasPermission("process", "edit") ||
        (hasPermission("process", "view") &&
            sequence.some((step) => hasProcessStepPermission(step.processName)));

    const calculateStepFields = (rawFields, changedKey = null) => {
        const newFields = { ...rawFields };
        const safeSize = Number(newFields.size);
        let inputQty = Number(newFields.inputQty) || 0;

        const rawKg = Number(newFields.kg) || 0;
        const pcsWt = Number(newFields.weightPer1000) || 0;

        // Weight to Pieces conversion:
        // KG (Raw Material) / Pcs Wt (KG) = Pieces Required
        if (changedKey === 'kg' && rawKg > 0 && pcsWt > 0) {
            inputQty = Math.round(rawKg / pcsWt);
            newFields.inputQty = inputQty;
        } else if (changedKey === 'weightPer1000' && pcsWt > 0) {
            if (rawKg > 0) {
                inputQty = Math.round(rawKg / pcsWt);
                newFields.inputQty = inputQty;
            } else if (inputQty > 0) {
                newFields.kg = Number((inputQty * pcsWt).toFixed(2));
            }
        } else if (changedKey === 'inputQty' && inputQty > 0 && pcsWt > 0) {
            newFields.kg = Number((inputQty * pcsWt).toFixed(2));
        }

        if (safeSize > 0 && inputQty > 0) {
            newFields.cutting = Number((inputQty / safeSize).toFixed(2));
        }
        if (Number(newFields.piecesPerBox) > 0 && inputQty > 0) {
            newFields.totalBoxes = Number((inputQty / Number(newFields.piecesPerBox)).toFixed(2));
        }

        const rej = Number(newFields.rejection) || 0;
        const pend = Number(newFields.pending) || 0;

        // Auto-calculate Inventory (Store):
        // What is automatically calculated as accepted good pieces goes directly into Inventory (Store)!
        const calculatedStoreQty = Math.max(0, inputQty - rej - pend);
        if (changedKey !== 'extra') {
            newFields.extra = calculatedStoreQty;
        }

        const storePcs = Number(newFields.extra !== undefined ? newFields.extra : calculatedStoreQty) || 0;
        newFields.output = storePcs;

        // Total Cost = Output / Store Pcs * Rate
        const rate = Number(newFields.rate) || 0;
        newFields.totalCost = Number((storePcs * rate).toFixed(2));

        return newFields;
    };

    const handleFieldChange = (stepId, fieldKey, value) => {
        // Sync common Size across all processes in the sequence!
        if (fieldKey === 'size' || fieldKey === 'size_unit') {
            setSequence((prev) =>
                prev.map((step) => {
                    const updatedFields = calculateStepFields({
                        ...step.fields,
                        [fieldKey]: value,
                    }, fieldKey);
                    return { ...step, fields: updatedFields };
                })
            );
            return;
        }

        setSequence((prev) =>
            prev.map((step) => {
                if (step.stepId !== stepId) return step;
                if (!isAdmin && !hasProcessStepPermission(step.processName)) {
                    return step;
                }

                // If user changes weightPer1000 (Pcs Wt), remember it for this process in localStorage
                if (fieldKey === 'weightPer1000' && Number(value) > 0) {
                    try {
                        localStorage.setItem(`rudra_wt1000_${step.processName.toLowerCase().trim()}`, String(value));
                    } catch (e) {}
                }

                const updatedFields = calculateStepFields({
                    ...step.fields,
                    [fieldKey]: value,
                }, fieldKey);

                let extraUpdates = {};
                if (fieldKey === 'partyName') {
                    extraUpdates.partyName = value;
                }
                if (fieldKey === 'pending') {
                    const numVal = Number(value) || 0;
                    extraUpdates.pendingQty = numVal;
                    updatedFields.pendingQty = numVal;
                }
                if (fieldKey === 'inputQty') {
                    const numVal = Number(value) || 0;
                    extraUpdates.givenQty = numVal;
                    updatedFields.givenQty = numVal;
                }

                return { ...step, ...extraUpdates, fields: updatedFields };
            })
        );
    };

    // Tracking handler: Given Qty, Received Qty & Pending Qty
    const handleTrackingChange = (stepId, fieldKey, rawValue) => {
        const val = rawValue === '' ? 0 : Number(rawValue);
        setSequence((prev) =>
            prev.map((step) => {
                if (step.stepId !== stepId) return step;
                if (!isAdmin && !hasProcessStepPermission(step.processName)) return step;

                const nextGiven = fieldKey === 'givenQty' ? val : Number(step.givenQty ?? step.fields?.givenQty ?? 0);
                const nextReceived = fieldKey === 'receivedQty' ? val : Number(step.receivedQty ?? step.fields?.receivedQty ?? 0);
                const nextPending = Math.max(0, nextGiven - nextReceived);

                return {
                    ...step,
                    givenQty: nextGiven,
                    receivedQty: nextReceived,
                    pendingQty: nextPending,
                    fields: {
                        ...(step.fields || {}),
                        givenQty: nextGiven,
                        receivedQty: nextReceived,
                        pendingQty: nextPending
                    }
                };
            })
        );
    };

    // Step direct field updater (for party, partyGroupFilter, etc.)
    const handleStepUpdate = (stepId, updates) => {
        setSequence((prev) =>
            prev.map((step) => {
                if (step.stepId !== stepId) return step;
                const nextStep = { ...step, ...updates };
                if (updates.partyName !== undefined) {
                    nextStep.fields = {
                        ...(nextStep.fields || {}),
                        partyName: updates.partyName
                    };
                }
                return nextStep;
            })
        );
    };

    const persistCurrentSequence = async (stepsToSave, rejectedToSave = rejectedUsage) => {
        return await saveMutation.mutateAsync({
            orderId: order._id,
            sequence: stepsToSave,
            orderItemId: activeVariant ? activeVariant.variantKey : undefined,
            sizeVariant: activeVariant ? activeVariant.size : undefined,
            priority: activeVariant ? activeVariant.priority : (order.orderPriority || 'normal'),
            rejectedUsage: rejectedToSave
        });
    };

    const handleSyncFromBOM = async () => {
        const inHouseParts = bomData?.inHouseParts || [];
        if (inHouseParts.length === 0) {
            showToast("No In-House BOM parts found for this Rudra Code.", "warning");
            return;
        }

        const variantLabel = activeVariant ? ` (${activeVariant.size})` : "";
        const generatedSteps = inHouseParts.map((part) => {
            const baseName = part.processName
                ? `${part.fieldName} - ${part.processName}`
                : part.fieldName;

            const inputQuantity = part.requiredPieces || 0;

            return {
                stepId: generateId(),
                processName: `${baseName}${variantLabel}`,
                processType: "custom",
                partyId: "",
                partyName: "",
                partyGroupFilter: "all",
                givenQty: inputQuantity,
                receivedQty: 0,
                pendingQty: inputQuantity,
                inventoryUsage: [],
                activeFields: ["size", "inputQty", "kg", "rejection", "extra", "output", "rate", "totalCost"],
                fields: calculateStepFields({
                    size: activeVariant?.size || "",
                    inputQty: inputQuantity,
                    kg: part.totalWeightKg || 0,
                    rejection: 0,
                    extra: 0,
                    givenQty: inputQuantity,
                    receivedQty: 0,
                    pendingQty: inputQuantity
                }),
            };
        });

        const merged = [...sequence, ...generatedSteps];
        setSequence(merged);

        try {
            await persistCurrentSequence(merged, rejectedUsage);
            showToast(
                `Synced BOM parts for ${activeVariant ? `${activeVariant.rudraCode} (${activeVariant.size})` : "Order"}!`,
                "success"
            );
        } catch (e) {
            showToast("Error syncing BOM parts: " + e.message, "error");
        }
    };

    const handleSave = async () => {
        try {
            await persistCurrentSequence(sequence, rejectedUsage);

            // Automatically store all steps with Inventory (Store) > 0 into Master Inventory!
            const itemsToStore = sequence
                .map((step, idx) => {
                    const storeQty = Number(step.fields?.extra || 0);
                    if (storeQty <= 0) return null;
                    const isLast = idx === sequence.length - 1;
                    const cleanCode = (order.rudraCode || order.piNo || 'PRC').trim().toUpperCase();
                    const cleanProc = String(step.processName || 'STEP').toUpperCase().replace(/\s+/g, '_');
                    const code = `${cleanCode}-${cleanProc}`;
                    return {
                        itemCode: code,
                        name: `${order.rudraCode || order.piNo || ''} - ${step.processName}`.trim(),
                        stock: storeQty,
                        unitCost: Number(step.fields?.rate || 0),
                        category: isLast ? 'Finished Good' : 'Semi-Finished',
                        uom: 'Pcs'
                    };
                })
                .filter(Boolean);

            if (itemsToStore.length > 0) {
                try {
                    await api.patch('/inventory', {
                        action: 'sync_process_store',
                        items: itemsToStore
                    });
                } catch (syncErr) {
                    console.error("Auto inventory sync error:", syncErr);
                }
            }

            showToast("Process saved & Output automatically stored in Inventory!", "success");
        } catch (e) {
            showToast("Error saving: " + e.message, "error");
        }
    };

    // Reserve Rejected Pieces
    const handleUseRejected = async (rejItem, quantity) => {
        if (quantity <= 0 || quantity > rejItem.availableQty) {
            showToast(`Invalid quantity. Available: ${rejItem.availableQty}`, 'warning');
            return;
        }
        try {
            await reserveRejectedMutation.mutateAsync({
                inventorySubItemId: rejItem.inventorySubItemId,
                quantity
            });

            const nextRejectedUsage = [
                ...rejectedUsage,
                {
                    inventoryGroupId: rejItem.inventoryGroupId,
                    inventorySubItemId: rejItem.inventorySubItemId,
                    itemCode: rejItem.itemCode,
                    itemName: rejItem.itemName,
                    quantity,
                    confirmed: false
                }
            ];
            setRejectedUsage(nextRejectedUsage);
            await persistCurrentSequence(sequence, nextRejectedUsage);

            showToast(
                `Soft-reserved ${quantity} Pcs of ${rejItem.itemCode} (Used in Process — will deduct from Inventory on Dispatch)`,
                'success'
            );
        } catch (e) {
            showToast(e.message || 'Failed to reserve rejected pieces', 'error');
        }
    };

    // Release Rejected Pieces
    const handleReleaseRejectedItem = async (usageItem, idx) => {
        try {
            await releaseRejectedMutation.mutateAsync({
                rejectedUsages: [{ inventorySubItemId: usageItem.inventorySubItemId, quantity: usageItem.quantity }]
            });
            const nextRejectedUsage = rejectedUsage.filter((_, i) => i !== idx);
            setRejectedUsage(nextRejectedUsage);
            await persistCurrentSequence(sequence, nextRejectedUsage);
            showToast(`Released ${usageItem.quantity} Pcs of ${usageItem.itemCode} back to available stock`, 'info');
        } catch (e) {
            showToast(e.message || 'Failed to release rejected stock', 'error');
        }
    };

    // Feature E: Add Inventory Item to Process Step (Immediate Deduction & Real-time Auto-Sync with Process)
    const handleAddInventoryToStep = async (stepId, { subItem, group, quantity }) => {
        const deductQty = Number(quantity);
        if (!subItem?._id || deductQty <= 0) {
            showToast("Please enter a valid quantity greater than zero.", "warning");
            return;
        }
        if (deductQty > (subItem.stock || 0)) {
            showToast(`Only ${subItem.stock || 0} pieces available in inventory.`, "warning");
            return;
        }

        try {
            await deductProcessItemMutation.mutateAsync({
                inventorySubItemId: subItem._id,
                quantity: deductQty
            });

            const usageEntry = {
                inventoryGroupId: group._id,
                inventorySubItemId: subItem._id,
                itemCode: subItem.itemCode,
                itemName: subItem.name,
                quantity: deductQty,
                deductedAt: new Date()
            };

            const nextSeq = sequence.map((step) => {
                if (step.stepId !== stepId) return step;
                const prevUsage = step.inventoryUsage || [];
                const updatedUsage = [...prevUsage, usageEntry];

                // Auto-sync process pieces with consumed inventory
                const totalInvQty = updatedUsage.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
                const updatedFields = calculateStepFields({
                    ...(step.fields || {}),
                    inputQty: totalInvQty,
                    givenQty: totalInvQty
                });

                return {
                    ...step,
                    inventoryUsage: updatedUsage,
                    givenQty: totalInvQty,
                    pendingQty: Math.max(0, totalInvQty - Number(step.receivedQty || 0)),
                    fields: updatedFields
                };
            });

            setSequence(nextSeq);
            await persistCurrentSequence(nextSeq, rejectedUsage);
            showToast(`Deducted ${deductQty} units of ${subItem.itemCode} & auto-synced Process Required pieces (${deductQty} Pcs)`, "success");
        } catch (err) {
            showToast(err.message || "Failed to deduct inventory item", "error");
        }
    };

    // Feature E: Release Inventory Item back to stock & Auto-Sync
    const handleReleaseInventoryFromStep = async (stepId, usageItem, usageIndex) => {
        const isConfirmed = await showConfirm({
            title: "Release Inventory Item",
            message: `Release ${usageItem.quantity} Pcs of ${usageItem.itemCode} back to available inventory stock?`,
            type: "info",
            confirmText: "Release Stock"
        });
        if (!isConfirmed) return;

        try {
            await releaseProcessItemMutation.mutateAsync({
                inventorySubItemId: usageItem.inventorySubItemId,
                quantity: usageItem.quantity
            });

            const nextSeq = sequence.map((step) => {
                if (step.stepId !== stepId) return step;
                const nextUsage = (step.inventoryUsage || []).filter((_, idx) => idx !== usageIndex);

                // Recalculate total inventory quantity after release
                const totalInvQty = nextUsage.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
                const updatedFields = calculateStepFields({
                    ...(step.fields || {}),
                    inputQty: totalInvQty,
                    givenQty: totalInvQty
                });

                return {
                    ...step,
                    inventoryUsage: nextUsage,
                    givenQty: totalInvQty,
                    pendingQty: Math.max(0, totalInvQty - Number(step.receivedQty || 0)),
                    fields: updatedFields
                };
            });

            setSequence(nextSeq);
            await persistCurrentSequence(nextSeq, rejectedUsage);
            showToast(`Released ${usageItem.quantity} Pcs of ${usageItem.itemCode} back to inventory & updated Process pieces`, "info");
        } catch (err) {
            showToast(err.message || "Failed to release inventory item", "error");
        }
    };

    // Feature B: Party Assignment & Quick Add (Syncs step.partyName, step.partyId, and step.fields.partyName)
    const handleAssignPartyToStep = (stepId, customer) => {
        const pName = customer ? (customer.firmName || customer.personalName || customer.partyCode) : "";
        setSequence((prev) =>
            prev.map((step) => {
                if (step.stepId !== stepId) return step;
                return {
                    ...step,
                    partyId: customer ? customer._id : "",
                    partyName: pName,
                    partyGroupFilter: customer ? (customer.group || step.partyGroupFilter) : step.partyGroupFilter,
                    fields: {
                        ...(step.fields || {}),
                        partyName: pName
                    }
                };
            })
        );
    };

    // Dispatch Order
    const handleDispatch = async () => {
        const unconfirmedCount = rejectedUsage
            .filter((r) => !r.confirmed)
            .reduce((sum, r) => sum + Number(r.quantity || 0), 0);

        const isConfirmed = await showConfirm({
            title: 'Confirm Order Dispatch',
            message: `Confirm dispatch for Order ${order.piNo}? This will mark the order as Dispatched and permanently deduct ${unconfirmedCount} soft-reserved rejected piece(s) from Inventory.`,
            type: 'info',
            confirmText: 'Confirm Dispatch'
        });
        if (!isConfirmed) return;

        try {
            if (sequence.length > 0) {
                await persistCurrentSequence(sequence, rejectedUsage);
            }
            await dispatchMutation.mutateAsync({ orderId: order._id });
            showToast('Order Dispatched! Soft-reserved rejected pieces permanently deducted from Inventory.', 'success');
            onBack();
        } catch (e) {
            showToast(e.message || 'Failed to dispatch', 'error');
        }
    };

    // Modal Save for Sequence Configuration
    const handleModalSave = async (newSeq) => {
        const normalizedSeq = newSeq.map((step) => {
            const existingStep = sequence.find((s) => s.stepId === step.stepId);
            return {
                ...existingStep,
                ...step,
                partyId: step.partyId ?? existingStep?.partyId ?? "",
                partyName: step.partyName ?? existingStep?.partyName ?? "",
                partyGroupFilter: step.partyGroupFilter ?? existingStep?.partyGroupFilter ?? "all",
                givenQty: Number(step.givenQty ?? existingStep?.givenQty ?? 0),
                receivedQty: Number(step.receivedQty ?? existingStep?.receivedQty ?? 0),
                pendingQty: Number(step.pendingQty ?? existingStep?.pendingQty ?? 0),
                inventoryUsage: step.inventoryUsage ?? existingStep?.inventoryUsage ?? [],
                fields: calculateStepFields(step.fields || existingStep?.fields || {}),
            };
        });

        setSequence(normalizedSeq);
        setShowProcessModal(false);

        try {
            await persistCurrentSequence(normalizedSeq, rejectedUsage);
            showToast("Process sequence updated successfully!", "success");
        } catch (e) {
            showToast("Failed to save sequence structure: " + e.message, "error");
        }
    };

    // Summary calculations
    let totalExtra = 0,
        totalRejection = 0,
        finalOutput = 0,
        totalPendingPieces = 0;

    sequence.forEach((step, idx) => {
        totalExtra += Number(step.fields?.extra || 0);
        totalRejection += Number(step.fields?.rejection || 0);
        if (step.activeFields?.includes("totalBoxes")) {
            finalOutput = Number(step.fields?.totalBoxes || 0);
        }
        totalPendingPieces += Number(step.fields?.pending ?? step.pendingQty ?? step.fields?.pendingQty ?? 0);
    });

    // In the final process step, output goes directly into Inventory Store!
    const lastStep = sequence[sequence.length - 1];
    const finalStepOutput = sequence.length > 0 ? Number(lastStep?.fields?.output || 0) : 0;
    const totalToInventory = totalExtra + finalStepOutput;



    const inHouseParts = bomData?.inHouseParts || [];
    const isDispatched = order.status === 'Dispatched' || activeRemoteDoc?.status === 'Dispatched';

    if (singleLoading && allLoading) {
        return (
            <div className="flex justify-center p-24">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-24">
            {/* Top Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${
                        order.orderPriority === 'urgent'
                            ? 'bg-red-100 text-red-600'
                            : order.orderPriority === 'mixed'
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-blue-100 text-blue-600'
                    }`}>
                        <ClipboardList className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-bold text-slate-800">Process Flow: {order.piNo}</h1>
                            {order.orderPriority === 'urgent' && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full uppercase animate-pulse">
                                    🔴 URGENT ORDER
                                </span>
                            )}
                            {order.orderPriority === 'mixed' && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase">
                                    ⚡ URGENT SPLIT ORDER
                                </span>
                            )}
                            {isDispatched && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase">
                                    ✅ DISPATCHED
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-500">
                            Client: <span className="font-semibold text-slate-700">{order.name}</span> ({order.partyCode || 'N/A'}) • Total Order Qty: {order.items?.reduce((a, i) => a + Number(i.qty || 0), 0)} Sets
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                    >
                        ← Back to Orders
                    </button>
                </div>
            </div>

            {/* Multi-Size & Urgent Split Variant Tabs */}
            {orderVariants.length > 1 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            📐 Select Size / Priority Batch to View & Edit Its Independent Process Pipeline
                        </label>
                        <span className="text-xs text-slate-400 font-medium">
                            Each size or urgent split batch has its own dedicated process flow
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {orderVariants.map((sv) => {
                            const isSelected = activeVariantKey === sv.variantKey;
                            const hasSavedSteps = allSequences.some(
                                (s) => s.orderItemId === sv.variantKey && s.steps?.length > 0
                            );
                            return (
                                <button
                                    key={sv.variantKey}
                                    onClick={() => setActiveVariantKey(sv.variantKey)}
                                    className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border ${
                                        isSelected
                                            ? sv.priority === 'urgent'
                                                ? 'bg-red-600 text-white border-red-600 shadow-sm'
                                                : 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                            : sv.priority === 'urgent'
                                            ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    {sv.priority === 'urgent' && <AlertTriangle className="w-3.5 h-3.5" />}
                                    <span>
                                        {sv.rudraCode} — <strong>Size: {sv.size}</strong> ({sv.qty} Pcs)
                                    </span>
                                    {sv.priority === 'urgent' && (
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase ${
                                            isSelected ? 'bg-red-800 text-white' : 'bg-red-200 text-red-800'
                                        }`}>
                                            Urgent
                                        </span>
                                    )}
                                    {hasSavedSteps && (
                                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} title="Process steps configured" />
                                    )}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setActiveVariantKey('all')}
                            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all border ${
                                activeVariantKey === 'all'
                                    ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            Combined Order View ({order.items?.reduce((a, i) => a + Number(i.qty || 0), 0)} Pcs)
                        </button>
                    </div>
                </div>
            )}

            {/* BOM In-House Factory Parts Banner */}
            <div className="bg-blue-50/80 rounded-xl border border-blue-200 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-600 text-white rounded-lg">
                            <Factory className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                                BOM In-House Factory Parts Required{' '}
                                {activeVariant
                                    ? `for ${activeVariant.rudraCode} — Size ${activeVariant.size} (${activeVariant.qty} Pcs)`
                                    : '(Full Order)'}
                            </h3>
                            <p className="text-xs text-slate-500">
                                Calculated from BOM Recipe × {activeVariant ? `Selected Variant Qty (${activeVariant.qty})` : 'Total Order Qty'}
                            </p>
                        </div>
                    </div>
                    {!isDispatched && canConfigureSteps && inHouseParts.length > 0 && (
                        <button
                            type="button"
                            onClick={handleSyncFromBOM}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                        >
                            <Sparkles className="w-3.5 h-3.5" /> Auto-Create Steps for This {activeVariant ? 'Size / Batch' : 'Order'}
                        </button>
                    )}
                </div>

                {bomLoading ? (
                    <div className="py-4 flex justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    </div>
                ) : inHouseParts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {inHouseParts.map((part, i) => (
                            <div
                                key={i}
                                className="bg-white p-3.5 rounded-lg border border-blue-100 shadow-sm flex justify-between items-center"
                            >
                                <div>
                                    <span className="text-xs font-bold text-slate-400 uppercase block">
                                        {part.processName || "Factory Part"}
                                    </span>
                                    <span className="text-sm font-bold text-slate-800">
                                        {part.fieldName}
                                    </span>
                                    {part.partCode && part.partCode !== "-" && (
                                        <span className="text-[10px] text-blue-600 font-semibold block">
                                            Code: {part.partCode}
                                        </span>
                                    )}
                                </div>
                                <div className="text-right">
                                    <span className="text-base font-extrabold text-blue-600 block">
                                        {part.requiredPieces} Pcs
                                    </span>
                                    {part.totalWeightKg > 0 && (
                                        <span className="text-[11px] text-slate-500 font-medium">
                                            {part.totalWeightKg} Kg
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-slate-500">
                        No In-House BOM parts found for <strong>{activeVariant?.rudraCode || order.items?.[0]?.rudraCode || "this item"}</strong>.
                    </p>
                )}
            </div>

            {/* Rejected Stock Available Panel */}
            {(availableRejectedPieces.length > 0 || rejectedUsage.length > 0) && (
                <div className="bg-amber-50/80 rounded-xl border border-amber-200 p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-amber-600 text-white rounded-lg">
                                <RotateCcw className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                                    🔄 Rejected Stock Reuse (Soft-Hold in Process Until Dispatch)
                                </h3>
                                <p className="text-xs text-slate-600">
                                    Pulling rejected pieces marks them as <strong>"Used in Process"</strong> across all orders. Physical stock is deducted from Inventory only when <strong>Confirm Dispatch</strong> is clicked.
                                </p>
                            </div>
                        </div>
                    </div>

                    {availableRejectedPieces.length > 0 && !isDispatched && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {availableRejectedPieces.map((rp) => (
                                <div
                                    key={rp.inventorySubItemId}
                                    className={`bg-white p-3.5 rounded-lg border shadow-sm ${
                                        rp.matchesOrder ? 'border-amber-400 ring-1 ring-amber-200' : 'border-slate-200'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div>
                                            <span className="text-xs font-bold text-amber-700 uppercase block">{rp.itemCode}</span>
                                            <span className="text-sm font-bold text-slate-800">{rp.itemName}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-extrabold text-emerald-700 block">
                                                {rp.availableQty} Available
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                Total: {rp.totalStock} | In Process: {rp.reservedInProcess}
                                            </span>
                                        </div>
                                    </div>
                                    {rp.matchesOrder && (
                                        <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 font-bold rounded-full mb-2 inline-block">
                                            ✓ Matches Order Rudra Code
                                        </span>
                                    )}
                                    {rp.availableQty > 0 ? (
                                        <div className="mt-2 flex gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                max={rp.availableQty}
                                                placeholder="Qty to use"
                                                id={`rej-qty-${rp.inventorySubItemId}`}
                                                className="w-24 px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const input = document.getElementById(`rej-qty-${rp.inventorySubItemId}`);
                                                    const qty = Number(input?.value || 0);
                                                    if (qty > 0) {
                                                        handleUseRejected(rp, qty);
                                                        input.value = '';
                                                    } else {
                                                        showToast('Enter a valid quantity', 'warning');
                                                    }
                                                }}
                                                disabled={reserveRejectedMutation.isPending}
                                                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                Use in Process
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-amber-700 font-semibold mt-2">
                                            All {rp.totalStock} pcs currently reserved in active processes
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Active Soft-Reserved Rejected Pieces */}
                    {rejectedUsage.length > 0 && (
                        <div className="bg-white rounded-lg border border-amber-200 p-3 space-y-2">
                            <span className="text-xs font-bold text-slate-700 uppercase block">
                                Rejected Pieces Used in This Process:
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {rejectedUsage.map((u, idx) => (
                                    <div
                                        key={idx}
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                                            u.confirmed
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : 'bg-yellow-50 text-yellow-800 border-yellow-300'
                                        }`}
                                    >
                                        <span>
                                            {u.confirmed ? '🟢 Deducted:' : '🟡 Soft-Hold (In Process):'} {u.itemCode} — {u.quantity} Pcs
                                        </span>
                                        {!u.confirmed && !isDispatched && (
                                            <button
                                                type="button"
                                                onClick={() => handleReleaseRejectedItem(u, idx)}
                                                className="text-red-600 hover:underline ml-1 text-[11px]"
                                                title="Release back to Inventory"
                                            >
                                                Release
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Target Variant Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="w-full md:w-2/3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Active Process Pipeline Target
                    </label>
                    <input
                        value={
                            activeVariant
                                ? `${activeVariant.rudraCode} — Size: ${activeVariant.size} (${activeVariant.qty} Sets • ${activeVariant.priority.toUpperCase()})`
                                : order.items?.map((i) => `${i.rudraCode} (${i.qty} Sets${i.size ? ` — ${i.size}` : ''})`).join(", ") || "Multiple Items"
                        }
                        readOnly
                        className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 bg-slate-50 font-bold text-indigo-700 text-sm"
                    />
                </div>
                {!isDispatched && canConfigureSteps && (
                    <button
                        onClick={() => setShowProcessModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
                    >
                        <Settings size={18} /> Configure Sequence & Templates
                    </button>
                )}
            </div>

            {!isAdmin && (
                <div className="flex items-center gap-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                    <p className="text-amber-700">
                        <strong>Access Control Active</strong> — You can only edit process steps assigned to you. Locked steps are view-only.
                    </p>
                </div>
            )}

            {/* Steps Section */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider">
                    Process Execution Flow {activeVariant ? `— Size: ${activeVariant.size} (${activeVariant.qty} Pcs)` : ''}
                </h2>
                {totalPendingPieces > 0 && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 animate-pulse">
                        <AlertTriangle className="w-4 h-4 text-amber-600" /> Total {totalPendingPieces} Pcs Pending Vendor Return
                    </span>
                )}
            </div>

            <div className="space-y-6">
                {sequence.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                        {canConfigureSteps
                            ? `No process steps configured for ${activeVariant ? `Size ${activeVariant.size}` : 'this order'} yet. Click 'Configure Sequence' or 'Auto-Create Steps' above.`
                            : "No process steps configured. Contact your Super Admin."}
                    </div>
                ) : (
                    sequence.map((step, index) => (
                        <div key={step.stepId} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <DynamicProcessStep
                                step={step}
                                index={index}
                                totalSteps={sequence.length}
                                customers={customers}
                                onFieldChange={handleFieldChange}
                                onTrackingChange={handleTrackingChange}
                                onStepUpdate={handleStepUpdate}
                                onOpenPartyModal={(cust) => {
                                    setPartyModalStep(step);
                                    setPartyModalInitialCustomer(cust || null);
                                }}
                                onOpenInventoryModal={() => setInventoryModalStep(step)}
                                onReleaseInventory={(usageItem, uIdx) =>
                                    handleReleaseInventoryFromStep(step.stepId, usageItem, uIdx)
                                }
                                isDispatched={isDispatched}
                            />
                        </div>
                    ))
                )}
            </div>

            {/* Summary Totals Footer */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-100">
                    <Package size={28} className="text-green-600 shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Added To Inventory</p>
                        <h2 className="text-2xl font-extrabold text-green-800">{totalToInventory} <span className="text-sm font-normal">Pcs</span></h2>
                    </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
                    <Trash2 size={28} className="text-red-600 shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Total Rejection (Scrap)</p>
                        <h2 className="text-2xl font-extrabold text-red-800">{totalRejection} <span className="text-sm font-normal">Pcs</span></h2>
                    </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <AlertTriangle size={28} className="text-amber-600 shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending Pieces (All Steps)</p>
                        <h2 className="text-2xl font-extrabold text-amber-800">{totalPendingPieces} <span className="text-sm font-normal">Pcs</span></h2>
                    </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <Archive size={28} className="text-blue-600 shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Final Output (Boxes)</p>
                        <h2 className="text-2xl font-extrabold text-blue-800">{finalOutput} <span className="text-sm font-normal">Box</span></h2>
                    </div>
                </div>
            </div>

            {/* Bottom Actions Bar (Save Process & Confirm Dispatch) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4">
                <button
                    onClick={onBack}
                    className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                >
                    ← Back to Orders
                </button>

                <div className="flex items-center gap-3">
                    {!isDispatched && canSave && (
                        <button
                            onClick={handleSave}
                            disabled={saveMutation.isPending || sequence.length === 0}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save Process
                        </button>
                    )}
                    {!isDispatched && canSave && (
                        <button
                            onClick={handleDispatch}
                            disabled={dispatchMutation.isPending}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {dispatchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                            Confirm Dispatch
                        </button>
                    )}
                </div>
            </div>

            {/* Sequence & Templates Config Modal */}
            <ProductProcessModal
                isOpen={showProcessModal}
                onClose={() => setShowProcessModal(false)}
                productName={
                    activeVariant
                        ? `${activeVariant.rudraCode} (${activeVariant.size})`
                        : order.items?.[0]?.rudraCode || "Product"
                }
                initialSequence={sequence}
                onSave={handleModalSave}
                showToast={showToast}
            />

            {/* Feature B: Party Quick Add & Picker Modal */}
            {partyModalStep && (
                <PartyQuickAddModal
                    isOpen={!!partyModalStep}
                    onClose={() => {
                        setPartyModalStep(null);
                        setPartyModalInitialCustomer(null);
                    }}
                    step={partyModalStep}
                    customers={customers}
                    initialCustomer={partyModalInitialCustomer}
                    onSelectCustomer={(cust) => {
                        handleAssignPartyToStep(partyModalStep.stepId, cust);
                        setPartyModalStep(null);
                        setPartyModalInitialCustomer(null);
                        showToast(`Assigned ${cust.firmName || cust.personalName} to ${partyModalStep.processName}!`, 'success');
                    }}
                    onCreateCustomer={async (newCustData) => {
                        try {
                            const created = await createCustomerMutation.mutateAsync(newCustData);
                            const customerDoc = created?.data || created;
                            handleAssignPartyToStep(partyModalStep.stepId, customerDoc);
                            setPartyModalStep(null);
                            setPartyModalInitialCustomer(null);
                            showToast(`Party created and assigned to ${partyModalStep.processName}!`, 'success');
                            return customerDoc;
                        } catch (err) {
                            showToast(err.message || 'Failed to create party', 'error');
                            throw err;
                        }
                    }}
                    onUpdateCustomer={async (id, updateData, shouldAssign) => {
                        try {
                            const updated = await updateCustomerMutation.mutateAsync({ id, ...updateData });
                            const customerDoc = updated?.data || updated;
                            if (shouldAssign) {
                                handleAssignPartyToStep(partyModalStep.stepId, customerDoc);
                                setPartyModalStep(null);
                                setPartyModalInitialCustomer(null);
                                showToast(`Party updated and assigned to ${partyModalStep.processName}!`, 'success');
                            } else {
                                showToast(`Party updated successfully!`, 'success');
                            }
                            return customerDoc;
                        } catch (err) {
                            showToast(err.message || 'Failed to update party', 'error');
                            throw err;
                        }
                    }}
                    showToast={showToast}
                />
            )}

            {/* Feature E: Inventory Picker Modal (Immediate Deduction) */}
            {inventoryModalStep && (
                <InventoryPickerModal
                    isOpen={!!inventoryModalStep}
                    onClose={() => setInventoryModalStep(null)}
                    step={inventoryModalStep}
                    inventoryGroups={inventoryGroups}
                    onAdd={(payload) => handleAddInventoryToStep(inventoryModalStep.stepId, payload)}
                    showToast={showToast}
                />
            )}
        </div>
    );
}

// ==========================================
// 3. DYNAMIC PROCESS STEP
// Layout in exact required order:
// 1. Step Header
// 2. Dynamic fields grid
// 3. [NEW] Given / Received / Pending tracking section (grey bg)
// 4. [NEW] Party Assignment section (amber bg)
// 5. [NEW] Inventory Used section (green bg)
// ==========================================
function DynamicProcessStep({
    step,
    index,
    totalSteps,
    customers,
    onFieldChange,
    onTrackingChange,
    onStepUpdate,
    onOpenPartyModal,
    onOpenInventoryModal,
    onReleaseInventory,
    isDispatched
}) {
    const { hasProcessStepPermission, isAdmin } = useAuth();
    const isAuthorized = isAdmin || hasProcessStepPermission(step.processName);

    const activeFieldKeys = useMemo(() => {
        const list = [...(step.activeFields || [])];
        // Ensure pending is included if inputQty or rejection is present
        if ((list.includes('inputQty') || list.includes('rejection')) && !list.includes('pending')) {
            const rejIdx = list.indexOf('rejection');
            if (rejIdx >= 0) {
                list.splice(rejIdx, 0, 'pending');
            } else {
                list.push('pending');
            }
        }
        // Ensure weightPer1000 is included if kg is present
        if (list.includes('kg') && !list.includes('weightPer1000')) {
            const kgIdx = list.indexOf('kg');
            list.splice(kgIdx + 1, 0, 'weightPer1000');
        }
        return list;
    }, [step.activeFields]);

    const fields = ALL_FIELDS.filter((f) => activeFieldKeys.includes(f.key));

    const colors = [
        { bg: "bg-green-600", text: "text-white" },
        { bg: "bg-blue-600", text: "text-white" },
        { bg: "bg-purple-600", text: "text-white" },
        { bg: "bg-pink-600", text: "text-white" },
        { bg: "bg-indigo-600", text: "text-white" },
    ];
    const color = colors[index % colors.length];

    // Tracking values
    const givenQty = step.givenQty ?? step.fields?.givenQty ?? 0;
    const receivedQty = step.receivedQty ?? step.fields?.receivedQty ?? 0;
    const pendingQty = Math.max(0, (Number(givenQty) || 0) - (Number(receivedQty) || 0));

    // Inventory usage
    const inventoryItems = step.inventoryUsage || [];

    // Extract all unique customer groups available
    const availableCustomerGroups = useMemo(() => {
        return getAllDynamicGroups(customers, step.processName);
    }, [customers, step.processName]);

    // Filter customers for this step's inline quick-select
    const currentGroupFilter = step.partyGroupFilter || 'all';
    const groupFilteredCustomers = useMemo(() => {
        if (!currentGroupFilter || currentGroupFilter === 'all') return customers;
        return customers.filter(
            (c) => (c.group || '').toLowerCase().trim() === currentGroupFilter.toLowerCase().trim()
        );
    }, [customers, currentGroupFilter]);

    // Resolved assigned customer
    const assignedCustomer = useMemo(() => {
        if (step.partyId) {
            const found = customers.find((c) => c._id === step.partyId);
            if (found) return found;
        }
        if (step.partyName) {
            const found = customers.find(
                (c) => (c.firmName || c.personalName || '').toLowerCase() === step.partyName.toLowerCase()
            );
            if (found) return found;
        }
        return null;
    }, [customers, step.partyId, step.partyName]);

    return (
        <div className={`space-y-4 ${!isAuthorized ? "opacity-75" : ""}`}>
            {/* 1. Step Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${isAuthorized ? color.bg : "bg-slate-300"} ${color.text} flex items-center justify-center font-bold text-sm shadow-sm`}>
                        {isAuthorized ? index + 1 : <Lock className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Step #{index + 1}</span>
                            {step.partyGroupFilter && step.partyGroupFilter !== 'all' && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded uppercase">
                                    🏷️ {step.partyGroupFilter.replace('_', ' ')}
                                </span>
                            )}
                        </div>
                        <h3 className="text-base font-bold text-slate-800">{step.processName}</h3>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!isAuthorized && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 border border-red-200 text-red-500 text-xs font-bold rounded-full uppercase tracking-wider">
                            <Lock className="w-3 h-3" /> View Only — Not Authorized
                        </span>
                    )}
                </div>
            </div>

            {/* 2. [TOP TOOLBAR] Vendor Assignment & Inventory Consumed (Placed at the TOP, Popup Triggered & Auto-Synced) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0.5">
                {/* A. Assigned Vendor / Party (Popup-based) */}
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 flex flex-col justify-between shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                        <div className="flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-amber-700" />
                            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                                Assigned Vendor / Party
                            </span>
                        </div>
                        {isAuthorized && !isDispatched && (
                            <div className="flex items-center gap-1.5">
                                {assignedCustomer && (
                                    <button
                                        type="button"
                                        onClick={() => onOpenPartyModal(assignedCustomer)}
                                        className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-lg border border-amber-300 flex items-center gap-1 transition-colors"
                                        title="Edit this account directly"
                                    >
                                        <Pencil className="w-3 h-3 text-amber-700" />
                                        Edit Account
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => onOpenPartyModal(null)}
                                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    {assignedCustomer || step.partyName ? "Change Party" : "Assign Party (Popup)"}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                        {assignedCustomer || step.partyName ? (
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                    {assignedCustomer?.partyCode || <Building2 className="w-4 h-4" />}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                        <span className="truncate">{step.partyName || assignedCustomer?.firmName || assignedCustomer?.personalName}</span>
                                        {assignedCustomer?.partyCode && (
                                            <span className="text-[10px] px-1.5 py-0.2 bg-amber-200 text-amber-800 rounded font-bold font-mono">
                                                {assignedCustomer.partyCode}
                                            </span>
                                        )}
                                        {(step.partyGroupFilter || assignedCustomer?.group) && (
                                            <span className="text-[9px] uppercase px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold">
                                                🏷️ {(step.partyGroupFilter || assignedCustomer?.group).replace(/_/g, ' ')}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                        {assignedCustomer?.mobileNo && (
                                            <span className="flex items-center gap-0.5">
                                                <Phone className="w-3 h-3 text-slate-400" /> {assignedCustomer.mobileNo}
                                            </span>
                                        )}
                                        {assignedCustomer?.city && (
                                            <span className="flex items-center gap-0.5">
                                                <MapPin className="w-3 h-3 text-slate-400" /> {assignedCustomer.city}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={isAuthorized && !isDispatched ? () => onOpenPartyModal(null) : undefined}
                                className={`text-xs text-amber-800 italic flex items-center gap-1.5 py-1 ${isAuthorized && !isDispatched ? 'cursor-pointer hover:text-amber-900' : ''}`}
                            >
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>No party assigned. Click to open Group-Wise Party selector popup →</span>
                            </div>
                        )}

                        {isAuthorized && !isDispatched && (assignedCustomer || step.partyName) && (
                            <button
                                type="button"
                                onClick={() => onStepUpdate(step.stepId, { partyId: "", partyName: "" })}
                                className="text-xs text-slate-400 hover:text-red-600 font-semibold px-2 py-1 ml-2"
                                title="Remove assigned party"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* B. Inventory Consumed in Step (Popup & Real-time Auto-Synced to Process pieces) */}
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex flex-col justify-between shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                        <div className="flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-emerald-700" />
                            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                                Inventory Materials Consumed
                            </span>
                        </div>
                        {isAuthorized && !isDispatched && (
                            <button
                                type="button"
                                onClick={onOpenInventoryModal}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 transition-colors"
                            >
                                <PlusCircle className="w-3.5 h-3.5" /> + Add from Inventory (Popup)
                            </button>
                        )}
                    </div>

                    <div className="pt-2">
                        {inventoryItems.length > 0 ? (
                            <div className="space-y-1.5">
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                    {inventoryItems.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-white border border-emerald-300 rounded-lg px-2.5 py-1 text-xs flex items-center gap-2 shadow-xs"
                                        >
                                            <span className="font-bold text-emerald-800">{item.itemCode}</span>
                                            <span className="text-slate-600 truncate max-w-[120px]">{item.itemName}</span>
                                            <span className="font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                                {item.quantity} Pcs
                                            </span>
                                            {isAuthorized && !isDispatched && (
                                                <button
                                                    type="button"
                                                    onClick={() => onReleaseInventory(item, idx)}
                                                    className="text-slate-400 hover:text-red-600 ml-0.5"
                                                    title="Release and restore stock back to inventory"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="text-[11px] text-emerald-800 font-bold flex items-center justify-between pt-1">
                                    <span>Total Consumed: {inventoryItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} Pcs</span>
                                    <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-semibold">
                                        ✓ Auto-synced with Process
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={isAuthorized && !isDispatched ? onOpenInventoryModal : undefined}
                                className={`text-xs text-emerald-700 italic flex items-center gap-1.5 py-1 ${isAuthorized && !isDispatched ? 'cursor-pointer hover:text-emerald-800' : ''}`}
                            >
                                <PlusCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>No materials consumed yet. Click "+ Add from Inventory" to deduct in real-time →</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. Dynamic Fields Grid (including Pending and Raw Material Weight to Pieces) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 pt-1">
                {fields.map((field) => {
                    const isCalculated = field.calculated;
                    const isLocked = isCalculated || !isAuthorized || isDispatched;
                    
                    // Saved wt fallback for weightPer1000
                    const savedWt = field.key === 'weightPer1000' && (step.fields?.[field.key] === undefined || step.fields?.[field.key] === "")
                        ? (localStorage.getItem("rudra_wt1000_" + step.processName.toLowerCase().trim()) || "")
                        : "";

                    const value = field.key === 'partyName'
                        ? (step.partyName || (step.fields?.[field.key] ?? ''))
                        : (step.fields?.[field.key] ?? savedWt);

                    let bgColor = "bg-white";
                    let borderColor = "border-slate-200";
                    let textColor = "text-slate-800";
                    let labelColor = "text-slate-700 font-semibold";

                    if (isCalculated) {
                        if (field.key === "output" || field.key === "totalBoxes") {
                            bgColor = "bg-green-50/70";
                            borderColor = "border-green-300";
                            labelColor = "text-green-800 font-extrabold";
                            textColor = "text-green-900 font-extrabold";
                        } else {
                            bgColor = "bg-slate-50";
                        }
                    } else if (field.key === "pending") {
                        bgColor = "bg-amber-50/70";
                        borderColor = "border-amber-300";
                        labelColor = "text-amber-800 font-extrabold";
                        textColor = "text-amber-900 font-extrabold";
                    } else if (field.key === "rejection") {
                        bgColor = "bg-red-50/50";
                        borderColor = "border-red-200";
                        labelColor = "text-red-700 font-bold";
                        textColor = "text-red-900 font-bold";
                    } else if (field.key === "extra") {
                        bgColor = "bg-emerald-50/70";
                        borderColor = "border-emerald-300";
                        labelColor = "text-emerald-800 font-extrabold";
                        textColor = "text-emerald-900 font-extrabold";
                    } else if (field.key === "weightPer1000") {
                        bgColor = "bg-sky-50/50";
                        borderColor = "border-sky-300";
                        labelColor = "text-sky-800 font-bold";
                        textColor = "text-sky-900 font-bold";
                    } else if (field.key === "kg") {
                        bgColor = "bg-blue-50/40";
                        borderColor = "border-blue-200";
                        labelColor = "text-blue-800 font-bold";
                    } else if (isLocked) {
                        bgColor = "bg-slate-50";
                        textColor = "text-slate-400";
                    }

                    const isLastStep = index === totalSteps - 1;
                    const fieldLabel = field.key === "output" && isLastStep
                        ? "Final Output (Store)"
                        : field.key === "extra"
                        ? "Inventory (Store)"
                        : field.label;

                    // Calculate pieces from KG: KG (Raw Material) / Pcs Wt (KG) = Pieces Required
                    const currentPcsWt = Number(step.fields?.weightPer1000 || savedWt || 0);
                    const calcPcsFromKg = field.key === "kg" && Number(value) > 0 && currentPcsWt > 0
                        ? Math.round(Number(value) / currentPcsWt)
                        : null;

                    return (
                        <div key={field.key} className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className={`block text-xs truncate ${labelColor}`}>
                                    {fieldLabel}
                                </label>
                                {field.key === "pending" && Number(value) > 0 && (
                                    <span className="text-[9px] px-1 bg-amber-200 text-amber-800 rounded font-bold uppercase">
                                        Pending
                                    </span>
                                )}
                            </div>

                            {field.key === "partyName" ? (
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={value}
                                        readOnly
                                        onClick={!isLocked ? () => onOpenPartyModal(null) : undefined}
                                        placeholder="Click to assign party..."
                                        className={`w-full border ${borderColor} rounded-lg pl-3 pr-8 py-1.5 ${bgColor} ${textColor} text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer`}
                                    />
                                    <button
                                        type="button"
                                        onClick={!isLocked ? () => onOpenPartyModal(null) : undefined}
                                        className="absolute right-2 top-2 text-amber-600 hover:text-amber-800"
                                        title="Open Party Selector Popup"
                                    >
                                        <UserCheck className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : field.type === "select" ? (
                                <select
                                    value={value}
                                    onChange={(e) => onFieldChange(step.stepId, field.key, e.target.value)}
                                    disabled={isLocked}
                                    className={`w-full border ${borderColor} rounded-lg px-2.5 py-1.5 ${bgColor} text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                        isLocked ? "cursor-not-allowed opacity-75" : ""
                                    }`}
                                >
                                    <option value="">Select...</option>
                                    {field.options?.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            ) : (
                                <div>
                                    <input
                                        type={field.type}
                                        value={value}
                                        onChange={(e) =>
                                            onFieldChange(
                                                step.stepId,
                                                field.key,
                                                field.type === "number"
                                                    ? e.target.value === ""
                                                        ? ""
                                                        : Number(e.target.value)
                                                    : e.target.value
                                            )
                                        }
                                        disabled={isLocked}
                                        placeholder="0"
                                        className={`w-full border ${borderColor} rounded-lg px-2.5 py-1.5 ${bgColor} ${textColor} text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium ${
                                            isLocked ? "cursor-not-allowed opacity-75" : ""
                                        }`}
                                    />
                                    {calcPcsFromKg !== null && (
                                        <span className="text-[10px] text-blue-700 font-extrabold block pt-0.5 truncate">
                                            ⚡ = {calcPcsFromKg} Pcs
                                        </span>
                                    )}
                                    {field.key === "weightPer1000" && (
                                        <span className="text-[9px] text-sky-700 font-medium block pt-0.5 truncate">
                                            kg ÷ Pcs Wt = Pieces Req
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ==========================================
// 4. CONFIGURE SEQUENCE & TEMPLATES MODAL
// ==========================================
function ProductProcessModal({
    isOpen,
    onClose,
    productName,
    initialSequence,
    onSave,
    showToast
}) {
    const [sequence, setSequence] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newProcessName, setNewProcessName] = useState("");
    const [newGroupFilter, setNewGroupFilter] = useState("all");
    const [selectedFields, setSelectedFields] = useState([]);
    const [saveAsTemplateChecked, setSaveAsTemplateChecked] = useState(false);

    // Edit Step state
    const [editingStepId, setEditingStepId] = useState(null);
    const [editProcessName, setEditProcessName] = useState("");
    const [editGroupFilter, setEditGroupFilter] = useState("all");
    const [editSelectedFields, setEditSelectedFields] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setSequence(initialSequence || []);
            setTemplates(loadTemplates());
            setShowAdd(false);
            setNewProcessName("");
            setNewGroupFilter("all");
            setSelectedFields([]);
            setSaveAsTemplateChecked(false);
            setEditingStepId(null);
            setEditProcessName("");
            setEditGroupFilter("all");
            setEditSelectedFields([]);
        }
    }, [isOpen, initialSequence]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (e) => {
        const { active, over } = e;
        if (over && active.id !== over.id) {
            const oldIdx = sequence.findIndex((p) => p.stepId === active.id);
            const newIdx = sequence.findIndex((p) => p.stepId === over.id);
            setSequence(arrayMove(sequence, oldIdx, newIdx));
        }
    };

    // Load template into Add Step form
    const handleApplyTemplate = (tplId) => {
        const found = templates.find((t) => t.id === tplId);
        if (!found) return;
        setNewProcessName(found.processName || found.name);
        setSelectedFields(found.activeFields || []);
        setNewGroupFilter(found.partyGroupFilter || "all");
        setShowAdd(true);
        showToast(`Loaded template "${found.name}"!`, "info");
    };

    // Save existing step as reusable template
    const handleSaveStepAsTemplate = (step) => {
        const templateName = step.processName || "Process Template";
        const tpl = {
            id: `tpl-${generateId()}`,
            name: templateName,
            processName: step.processName,
            activeFields: step.activeFields || [],
            partyGroupFilter: step.partyGroupFilter || "all"
        };
        const updated = saveTemplate(tpl);
        setTemplates(updated);
        showToast(`Saved "${templateName}" as reusable template!`, "success");
    };

    const handleStartEdit = (step) => {
        setShowAdd(false);
        setEditingStepId(step.stepId);
        setEditProcessName(step.processName || "");
        setEditGroupFilter(step.partyGroupFilter || "all");
        setEditSelectedFields(step.activeFields || []);
    };

    const handleCancelEdit = () => {
        setEditingStepId(null);
        setEditProcessName("");
        setEditGroupFilter("all");
        setEditSelectedFields([]);
    };

    const handleSaveEdit = (stepId) => {
        if (!editProcessName.trim()) {
            showToast("Process name cannot be empty.", "warning");
            return false;
        }
        if (editSelectedFields.length === 0) {
            showToast("Please select at least one field for this process step.", "warning");
            return false;
        }

        setSequence((prev) =>
            prev.map((step) =>
                step.stepId === stepId
                    ? {
                          ...step,
                          processName: editProcessName.trim(),
                          partyGroupFilter: editGroupFilter,
                          activeFields: editSelectedFields
                      }
                    : step
            )
        );

        handleCancelEdit();
        return true;
    };

    const handleAdd = () => {
        if (!newProcessName.trim()) {
            showToast("Please enter a process name.", "warning");
            return;
        }
        if (selectedFields.length === 0) {
            showToast("Please select at least one field for your new process.", "warning");
            return;
        }

        const newStepObj = {
            stepId: generateId(),
            processName: newProcessName.trim(),
            processType: "custom",
            partyId: "",
            partyName: "",
            partyGroupFilter: newGroupFilter,
            givenQty: 0,
            receivedQty: 0,
            pendingQty: 0,
            inventoryUsage: [],
            activeFields: selectedFields,
            fields: {},
        };

        setSequence([...sequence, newStepObj]);

        if (saveAsTemplateChecked) {
            handleSaveStepAsTemplate(newStepObj);
        }

        setShowAdd(false);
        setNewProcessName("");
        setNewGroupFilter("all");
        setSelectedFields([]);
        setSaveAsTemplateChecked(false);
    };

    const handleModalSave = () => {
        let finalSeq = [...sequence];

        if (editingStepId) {
            if (!editProcessName.trim() || editSelectedFields.length === 0) {
                showToast("Please complete or cancel the step currently being edited.", "warning");
                return;
            }
            finalSeq = finalSeq.map((step) =>
                step.stepId === editingStepId
                    ? {
                          ...step,
                          processName: editProcessName.trim(),
                          partyGroupFilter: editGroupFilter,
                          activeFields: editSelectedFields
                      }
                    : step
            );
        }

        if (showAdd && newProcessName.trim() !== "") {
            if (selectedFields.length === 0) {
                showToast("Please select at least one field for your new process.", "warning");
                return;
            }
            finalSeq.push({
                stepId: generateId(),
                processName: newProcessName.trim(),
                processType: "custom",
                partyId: "",
                partyName: "",
                partyGroupFilter: newGroupFilter,
                givenQty: 0,
                receivedQty: 0,
                pendingQty: 0,
                inventoryUsage: [],
                activeFields: selectedFields,
                fields: {},
            });
        }

        if (finalSeq.length === 0) {
            showToast("Please add at least one process step before saving.", "warning");
            return;
        }

        onSave(finalSeq);
        setShowAdd(false);
        setNewProcessName("");
        setSelectedFields([]);
        handleCancelEdit();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Configure Process Sequence</h2>
                        <p className="text-sm text-slate-500">Target Variant: {productName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Templates Quick Bar (Feature C) */}
                <div className="px-6 py-3 bg-indigo-50/60 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                            Step Templates:
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    handleApplyTemplate(e.target.value);
                                    e.target.value = "";
                                }
                            }}
                            defaultValue=""
                            className="text-xs border border-indigo-200 bg-white rounded-lg px-3 py-1.5 font-semibold text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="" disabled>⚡ Load Step From Template...</option>
                            {templates.map((t) => (
                                <option key={t.id} value={t.id}>
                                    📋 {t.name} ({t.processName})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Sortable Steps List */}
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={sequence.map((s) => s.stepId)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-3">
                                {sequence.map((step, index) => (
                                    <SortableItem
                                        key={step.stepId}
                                        step={step}
                                        index={index}
                                        isEditing={editingStepId === step.stepId}
                                        editProcessName={editProcessName}
                                        setEditProcessName={setEditProcessName}
                                        editGroupFilter={editGroupFilter}
                                        setEditGroupFilter={setEditGroupFilter}
                                        editSelectedFields={editSelectedFields}
                                        setEditSelectedFields={setEditSelectedFields}
                                        onStartEdit={() => handleStartEdit(step)}
                                        onSaveEdit={() => handleSaveEdit(step.stepId)}
                                        onCancelEdit={handleCancelEdit}
                                        onSaveTemplate={() => handleSaveStepAsTemplate(step)}
                                        onRemove={() => {
                                            if (editingStepId === step.stepId) handleCancelEdit();
                                            setSequence((s) => s.filter((x) => x.stepId !== step.stepId));
                                        }}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>

                    {/* Add New Step Form */}
                    {showAdd ? (
                        <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4 shadow-sm">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    New Process Step Details
                                </h4>
                                <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    placeholder="Process Name (e.g., Round Dabi Turning)"
                                    value={newProcessName}
                                    onChange={(e) => setNewProcessName(e.target.value)}
                                    className="border border-slate-200 bg-white rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />

                                <select
                                    value={newGroupFilter}
                                    onChange={(e) => setNewGroupFilter(e.target.value)}
                                    className="border border-slate-200 bg-white rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">Assigned Party Group: All Groups</option>
                                    {getAllDynamicGroups().map((g) => (
                                        <option key={g.value} value={g.value}>{g.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">
                                    Select Dynamic Active Fields:
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-2 bg-white border border-slate-200 rounded-lg">
                                    {ALL_FIELDS.map((f) => (
                                        <label key={f.key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-1 hover:bg-slate-50 rounded">
                                            <input
                                                type="checkbox"
                                                checked={selectedFields.includes(f.key)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedFields([...selectedFields, f.key]);
                                                    else setSelectedFields(selectedFields.filter((x) => x !== f.key));
                                                }}
                                                className="rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="truncate">{f.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <label className="flex items-center gap-2 text-xs font-semibold text-indigo-700 cursor-pointer pt-1">
                                <input
                                    type="checkbox"
                                    checked={saveAsTemplateChecked}
                                    onChange={(e) => setSaveAsTemplateChecked(e.target.checked)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <BookmarkPlus size={16} /> Save this step as reusable template for future orders
                            </label>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleAdd}
                                    className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-sm"
                                >
                                    Add Process Step
                                </button>
                                <button
                                    onClick={() => setShowAdd(false)}
                                    className="px-4 py-2 border rounded-lg text-sm bg-white hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                handleCancelEdit();
                                setShowAdd(true);
                            }}
                            className="flex items-center gap-2 text-blue-600 font-semibold px-4 py-2 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            <Plus size={18} /> Add Process Step
                        </button>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 border rounded-lg text-sm font-medium hover:bg-white bg-slate-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleModalSave}
                        className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
                    >
                        Save Sequence
                    </button>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// 5. SORTABLE STEP ITEM COMPONENT
// ==========================================
function SortableItem({
    step,
    index,
    isEditing,
    editProcessName,
    setEditProcessName,
    editGroupFilter,
    setEditGroupFilter,
    editSelectedFields,
    setEditSelectedFields,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onSaveTemplate,
    onRemove,
}) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: step.stepId,
        disabled: isEditing,
    });
    const style = { transform: CSS.Transform.toString(transform), transition };

    const activeLabels = ALL_FIELDS.filter((f) => step.activeFields?.includes(f.key)).map((f) => f.label);

    if (isEditing) {
        return (
            <div ref={setNodeRef} style={style} className="p-5 bg-blue-50/60 rounded-xl border-2 border-blue-400 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 uppercase">Editing Step #{index + 1}</span>
                    <button onClick={onCancelEdit} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                        type="text"
                        value={editProcessName}
                        onChange={(e) => setEditProcessName(e.target.value)}
                        className="border border-slate-300 bg-white rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-800"
                        placeholder="Process Name"
                    />

                    <select
                        value={editGroupFilter}
                        onChange={(e) => setEditGroupFilter(e.target.value)}
                        className="border border-slate-300 bg-white rounded-lg px-3 py-2 text-sm font-medium text-slate-700"
                    >
                        <option value="all">Party Group: All Groups</option>
                        {getAllDynamicGroups().map((g) => (
                            <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto bg-white p-3 rounded-lg border border-slate-200">
                    {ALL_FIELDS.map((f) => (
                        <label key={f.key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={editSelectedFields.includes(f.key)}
                                onChange={(e) => {
                                    if (e.target.checked) setEditSelectedFields([...editSelectedFields, f.key]);
                                    else setEditSelectedFields(editSelectedFields.filter((x) => x !== f.key));
                                }}
                                className="rounded text-blue-600"
                            />
                            <span className="truncate">{f.label}</span>
                        </label>
                    ))}
                </div>

                <div className="flex justify-end gap-2">
                    <button onClick={onCancelEdit} className="px-3 py-1.5 border bg-white text-xs font-semibold rounded-lg">
                        Cancel
                    </button>
                    <button onClick={onSaveEdit} className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg">
                        <Check size={14} /> Update
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <button type="button" {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-600 p-1">
                <GripVertical size={20} />
            </button>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">#{index + 1}</span>
                    <span className="font-semibold text-slate-800 truncate">{step.processName}</span>
                    {step.partyGroupFilter && step.partyGroupFilter !== 'all' && (
                        <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 font-semibold rounded uppercase">
                            {step.partyGroupFilter.replace('_', ' ')}
                        </span>
                    )}
                </div>
                {activeLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {activeLabels.map((label) => (
                            <span key={label} className="text-[10px] px-2 py-0.5 bg-slate-50 border text-slate-500 rounded-md">
                                {label}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <button
                    type="button"
                    onClick={onSaveTemplate}
                    title="Save as reusable Template"
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                    <BookmarkPlus size={18} />
                </button>
                <button
                    type="button"
                    onClick={onStartEdit}
                    title="Edit Step"
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                    <Pencil size={18} />
                </button>
                <button
                    type="button"
                    onClick={onRemove}
                    title="Delete Step"
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
}

// ==========================================
// 6. INVENTORY PICKER MODAL (Feature E - Immediate Deduction)
// ==========================================
function InventoryPickerModal({
    isOpen,
    onClose,
    step,
    inventoryGroups,
    onAdd,
    showToast
}) {
    const [selectedGroupId, setSelectedGroupId] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [quantities, setQuantities] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    // Flatten all items with group references
    const allItems = [];
    inventoryGroups.forEach((group) => {
        (group.subItems || []).forEach((sub) => {
            allItems.push({
                group,
                subItem: sub
            });
        });
    });

    const filteredItems = allItems.filter(({ group, subItem }) => {
        if (selectedGroupId !== "all" && group._id !== selectedGroupId) return false;
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
            subItem.itemCode?.toLowerCase().includes(term) ||
            subItem.name?.toLowerCase().includes(term) ||
            subItem.category?.toLowerCase().includes(term)
        );
    }).sort((a, b) => Number(b.subItem.stock || 0) - Number(a.subItem.stock || 0));

    const handleQtyChange = (subId, val) => {
        setQuantities((prev) => ({
            ...prev,
            [subId]: val
        }));
    };

    const handleDeductAndAdd = async (group, subItem) => {
        const qty = Number(quantities[subItem._id] || 0);
        if (qty <= 0) {
            showToast("Please enter a valid quantity greater than zero.", "warning");
            return;
        }
        if (qty > (subItem.stock || 0)) {
            showToast(`Only ${subItem.stock || 0} pieces available in stock.`, "warning");
            return;
        }

        setIsSubmitting(true);
        try {
            await onAdd({ group, subItem, quantity: qty });
            handleQtyChange(subItem._id, "");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-emerald-600" />
                            <h2 className="text-xl font-bold text-slate-800">Add Inventory Items to Step</h2>
                        </div>
                        <p className="text-sm text-slate-500">
                            Target Step: <strong className="text-slate-700">{step.processName}</strong> • Stock is deducted immediately
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Filters */}
                <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by Item Code or Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Group:</label>
                        <select
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            className="text-sm border border-slate-200 bg-white rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        >
                            <option value="all">All Groups ({inventoryGroups.length})</option>
                            {inventoryGroups.map((g) => (
                                <option key={g._id} value={g._id}>{g.groupName}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="p-6 overflow-y-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="p-3">Item Code</th>
                                <th className="p-3">Item Name</th>
                                <th className="p-3">Category</th>
                                <th className="p-3 text-right">Available Stock</th>
                                <th className="p-3 text-center w-36">Qty to Deduct</th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredItems.map(({ group, subItem }) => {
                                const stock = Number(subItem.stock || 0);
                                const isZeroStock = stock <= 0;
                                const currentQty = quantities[subItem._id] || "";

                                return (
                                    <tr
                                        key={subItem._id}
                                        className={`hover:bg-slate-50 transition-colors ${
                                            isZeroStock ? "opacity-50 bg-slate-50/50" : ""
                                        }`}
                                    >
                                        <td className="p-3 font-bold text-emerald-800">{subItem.itemCode}</td>
                                        <td className="p-3 font-medium text-slate-800">{subItem.name}</td>
                                        <td className="p-3 text-xs text-slate-500">{subItem.category || "-"}</td>
                                        <td className="p-3 text-right">
                                            <span className={`font-extrabold ${isZeroStock ? 'text-red-500' : 'text-slate-800'}`}>
                                                {stock}
                                            </span>
                                            <span className="text-xs text-slate-400 ml-1">Pcs</span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex flex-col items-center">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={stock}
                                                    disabled={isZeroStock || isSubmitting}
                                                    placeholder={isZeroStock ? "Out of stock" : "Qty"}
                                                    value={currentQty}
                                                    onChange={(e) => handleQtyChange(subItem._id, e.target.value)}
                                                    className="w-24 px-2.5 py-1.5 border border-slate-200 rounded-lg text-center font-bold text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
                                                />
                                                {!isZeroStock && Number(step?.fields?.inputQty || 0) > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleQtyChange(subItem._id, Math.min(stock, Number(step.fields.inputQty)))}
                                                        className="text-[10px] text-emerald-600 hover:text-emerald-800 font-semibold underline mt-1"
                                                        title="Fill with Process Target Qty"
                                                    >
                                                        ⚡ Use {step.fields.inputQty} Pcs
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 text-right">
                                            <button
                                                type="button"
                                                disabled={isZeroStock || !currentQty || isSubmitting}
                                                onClick={() => handleDeductAndAdd(group, subItem)}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                + Deduct & Add
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredItems.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400">
                                        No inventory items found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                    <span className="text-xs text-slate-500">
                        Items added here are tracked directly in the process sequence and deducted immediately from stock.
                    </span>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// 7. PARTY / ACCOUNT MASTER MODAL (Tally & Plus 2.0 Inspired Dual-Pane Manager)
// ==========================================
function PartyQuickAddModal({
    isOpen,
    onClose,
    step,
    customers = [],
    initialCustomer = null,
    onSelectCustomer,
    onCreateCustomer,
    onUpdateCustomer,
    showToast
}) {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterGroup, setFilterGroup] = useState(step?.partyGroupFilter || "all");
    const [activeTab, setActiveTab] = useState("main"); // 'main' | 'balance'
    const [customGroupsVersion, setCustomGroupsVersion] = useState(0);

    // Derived step group name (e.g. "casting", "buffing")
    const stepDerivedGroup = useMemo(() => {
        if (!step?.processName) return "buffing";
        return step.processName.split('-')[0].trim().toLowerCase().replace(/\s+/g, '_');
    }, [step]);

    // All dynamic groups
    const dynamicGroups = useMemo(() => {
        return getAllDynamicGroups(customers, stepDerivedGroup);
    }, [customers, stepDerivedGroup, customGroupsVersion]);

    // Editing mode state
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState(null);

    // Initial group default
    const initialGroup = step?.partyGroupFilter && step.partyGroupFilter !== "all"
        ? step.partyGroupFilter
        : (stepDerivedGroup || "buffing");

    const defaultFormData = {
        firmName: "",
        alias: "",
        group: initialGroup,
        personalName: "",
        mobileNo: "",
        city: "",
        area: "",
        state: "Gujarat",
        address: "",
        gstNo: "",
        panNo: "",
        regType: "Registered",
        openingBalance: 0,
        balanceType: "Debit",
        creditLimit: 0,
        creditDays: 0,
        billToBill: "No"
    };

    const [formData, setFormData] = useState(defaultFormData);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize with initialCustomer if passed
    useEffect(() => {
        if (initialCustomer) {
            handleStartEdit(initialCustomer);
        } else {
            handleResetToNew();
        }
    }, [initialCustomer, isOpen]);

    if (!isOpen) return null;

    // Filter customers on search and group filter
    const filteredCustomers = customers.filter((c) => {
        if (filterGroup !== "all") {
            if ((c.group || "").toLowerCase().trim() !== filterGroup.toLowerCase().trim()) return false;
        }
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
            c.firmName?.toLowerCase().includes(term) ||
            c.alias?.toLowerCase().includes(term) ||
            c.partyCode?.toLowerCase().includes(term) ||
            c.group?.toLowerCase().includes(term) ||
            c.mobileNo?.includes(term) ||
            c.city?.toLowerCase().includes(term)
        );
    });

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleResetToNew = () => {
        setEditingCustomer(null);
        setSelectedCustomerId(null);
        setFormData({
            ...defaultFormData,
            group: step?.partyGroupFilter && step.partyGroupFilter !== "all" ? step.partyGroupFilter : (stepDerivedGroup || "buffing")
        });
        setActiveTab("main");
    };

    const handleStartEdit = (c) => {
        if (!c) return;
        setEditingCustomer(c);
        setSelectedCustomerId(c._id);
        setFormData({
            firmName: c.firmName || "",
            alias: c.alias || "",
            group: c.group || initialGroup,
            personalName: c.personalName || "",
            mobileNo: c.mobileNo || "",
            city: c.city || "",
            area: c.area || "",
            state: c.state || "Gujarat",
            address: c.address || "",
            gstNo: c.gstNo || "",
            panNo: c.panNo || "",
            regType: c.regType || "Registered",
            openingBalance: c.openingBalance ?? 0,
            balanceType: c.balanceType || "Debit",
            creditLimit: c.creditLimit ?? 0,
            creditDays: c.creditDays ?? 0,
            billToBill: c.billToBill || "No"
        });
    };

    const handleSelectRow = (c) => {
        handleStartEdit(c);
    };

    const handleSubmitForm = async (e, shouldAssign = true) => {
        if (e) e.preventDefault();
        if (!formData.firmName.trim()) {
            showToast("Firm / Account Name is required.", "warning");
            return;
        }
        if (!formData.mobileNo.trim()) {
            showToast("Mobile Number is required.", "warning");
            return;
        }

        const rawGroup = formData.group || stepDerivedGroup || 'buffing';
        const cleanGroup = rawGroup.trim().toLowerCase().replace(/\s+/g, '_');
        saveCustomGroup(cleanGroup);
        setCustomGroupsVersion((v) => v + 1);

        const payload = {
            firmName: formData.firmName.trim(),
            alias: formData.alias?.trim() || "",
            group: cleanGroup,
            personalName: formData.personalName?.trim() || "",
            mobileNo: formData.mobileNo.trim(),
            city: formData.city.trim(),
            area: formData.area?.trim() || "",
            state: formData.state?.trim() || "Gujarat",
            address: formData.address?.trim() || "",
            gstNo: formData.gstNo?.trim() || "",
            panNo: formData.panNo?.trim() || "",
            regType: formData.regType || "Registered",
            openingBalance: Number(formData.openingBalance) || 0,
            balanceType: formData.balanceType || "Debit",
            creditLimit: Number(formData.creditLimit) || 0,
            creditDays: Number(formData.creditDays) || 0,
            billToBill: formData.billToBill || "No"
        };

        setIsSubmitting(true);
        try {
            if (editingCustomer) {
                if (onUpdateCustomer) {
                    const updated = await onUpdateCustomer(editingCustomer._id, payload, shouldAssign);
                    if (!shouldAssign) {
                        setEditingCustomer((prev) => ({ ...prev, ...payload }));
                    }
                }
            } else {
                if (onCreateCustomer) {
                    await onCreateCustomer(payload);
                }
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const quickGroupPills = useMemo(() => {
        const top = [];
        if (stepDerivedGroup) top.push(stepDerivedGroup);
        ['buffing', 'polishing', 'casting', 'turning', 'sundry_debtors', 'sundry_creditors'].forEach((g) => {
            if (!top.includes(g)) top.push(g);
        });
        return top;
    }, [stepDerivedGroup]);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-slate-300">
                {/* Header (Tally / Plus 2.0 Style Topbar) */}
                <div className="px-6 py-4 bg-slate-800 text-white flex justify-between items-center shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500 text-slate-900 rounded-lg font-bold">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-extrabold tracking-wide uppercase">
                                    {editingCustomer ? `Edit Account Master: ${editingCustomer.firmName}` : "Add New Account / Party"}
                                </h2>
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-amber-400 text-slate-900 rounded">
                                    Plus 2.0 / Tally Mode
                                </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-0.5">
                                Active Process Step: <strong className="text-amber-300 capitalize">{step?.processName}</strong>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title="Close window"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Main Dual-Pane Body */}
                <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                    {/* LEFT PANE: Account Directory (5 cols) */}
                    <div className="lg:col-span-5 p-4 flex flex-col bg-slate-50/70 space-y-3">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search Account Name, Alias, City, Mobile (F10)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                            />
                        </div>

                        {/* Group Filter Selector */}
                        <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-slate-600 uppercase text-[11px] shrink-0">Group:</span>
                            <select
                                value={filterGroup}
                                onChange={(e) => setFilterGroup(e.target.value)}
                                className="flex-1 text-xs border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                                <option value="all">All Groups ({dynamicGroups.length})</option>
                                {dynamicGroups.map((g) => (
                                    <option key={g.value} value={g.value}>{g.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Account Table List */}
                        <div className="flex-1 overflow-y-auto max-h-[380px] border border-slate-200 rounded-xl bg-white shadow-xs">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                                        <th className="p-2.5">Account Name</th>
                                        <th className="p-2.5">Group</th>
                                        <th className="p-2.5">City</th>
                                        <th className="p-2.5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCustomers.map((c) => {
                                        const isSelected = selectedCustomerId === c._id || editingCustomer?._id === c._id;
                                        return (
                                            <tr
                                                key={c._id}
                                                onClick={() => handleSelectRow(c)}
                                                className={`cursor-pointer border-b border-slate-100 transition-colors ${
                                                    isSelected
                                                        ? "bg-amber-100/80 font-bold text-slate-900"
                                                        : "hover:bg-slate-50 text-slate-700"
                                                }`}
                                            >
                                                <td className="p-2.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span>{c.firmName}</span>
                                                        {c.partyCode && (
                                                            <span className="text-[10px] px-1 bg-slate-200 text-slate-700 rounded font-mono font-semibold">
                                                                {c.partyCode}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {c.mobileNo && (
                                                        <div className="text-[10px] text-slate-400 font-normal">
                                                            📞 {c.mobileNo}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-2.5">
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded uppercase font-semibold">
                                                        {(c.group || 'sundry_debtors').replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="p-2.5 text-slate-600 truncate max-w-[80px]">
                                                    {c.city || '-'}
                                                </td>
                                                <td className="p-2.5 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onSelectCustomer(c);
                                                        }}
                                                        className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded shadow-xs"
                                                        title="Assign directly to step"
                                                    >
                                                        Assign
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredCustomers.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-6 text-center text-slate-400 italic">
                                                No accounts match this filter. Click "+ New Account" below to create one.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Bottom Action Bar for List (Tally F2 New / Edit buttons) */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                            <button
                                type="button"
                                onClick={handleResetToNew}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" /> + New Account
                            </button>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    disabled={!selectedCustomerId}
                                    onClick={() => {
                                        const found = customers.find((c) => c._id === selectedCustomerId);
                                        if (found) handleStartEdit(found);
                                    }}
                                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 disabled:opacity-40"
                                >
                                    <Pencil className="w-3.5 h-3.5 text-blue-600" /> Edit
                                </button>
                                <button
                                    type="button"
                                    disabled={!selectedCustomerId}
                                    onClick={() => {
                                        const found = customers.find((c) => c._id === selectedCustomerId);
                                        if (found) onSelectCustomer(found);
                                    }}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-40"
                                >
                                    Assign Selected
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANE: Account Master Form (7 cols - Tally Form Layout) */}
                    <div className="lg:col-span-7 p-6 flex flex-col justify-between space-y-4 bg-white">
                        <div>
                            {/* Form Topbar */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                                        {editingCustomer ? <Pencil className="w-4 h-4 text-blue-600" /> : <UserPlus className="w-4 h-4 text-amber-700" />}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                                            {editingCustomer ? (
                                                <span>Edit Account: <span className="text-blue-600">{editingCustomer.firmName}</span></span>
                                            ) : (
                                                <span>Add New Account</span>
                                            )}
                                        </h3>
                                        <p className="text-[11px] text-slate-400">
                                            Fill account details & assign directly to process step
                                        </p>
                                    </div>
                                </div>

                                {editingCustomer && (
                                    <button
                                        type="button"
                                        onClick={handleResetToNew}
                                        className="text-xs font-bold px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-300 transition-colors"
                                    >
                                        + Switch to New Account
                                    </button>
                                )}
                            </div>

                            {/* Main Account Form */}
                            <form id="party-master-form" onSubmit={(e) => handleSubmitForm(e, true)} className="space-y-3.5">
                                {/* Row 1: Name & Alias */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                            Account / Firm Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="firmName"
                                            required
                                            placeholder="e.g., RADHE AARTI-5"
                                            value={formData.firmName}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                            Alias / Short Name
                                        </label>
                                        <input
                                            type="text"
                                            name="alias"
                                            placeholder="e.g., RA-5"
                                            value={formData.alias}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
                                        />
                                    </div>
                                </div>

                                {/* Row 2: Group Name (Smart Combobox with dynamic pills) & Reg Type */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                            Group Name <span className="text-red-500">*</span> <span className="text-[10px] text-amber-700 font-normal lowercase">(type any or pick)</span>
                                        </label>
                                        <input
                                            type="text"
                                            list="tally-group-options"
                                            name="group"
                                            required
                                            placeholder="e.g., Casting, Buffing, Sundry Debtors"
                                            value={formData.group}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-slate-800"
                                        />
                                        <datalist id="tally-group-options">
                                            {dynamicGroups.map((g) => (
                                                <option key={g.value} value={g.label} />
                                            ))}
                                        </datalist>

                                        {/* Quick suggestion pills */}
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Quick:</span>
                                            {quickGroupPills.map((g) => (
                                                <button
                                                    key={g}
                                                    type="button"
                                                    onClick={() => setFormData((prev) => ({ ...prev, group: g }))}
                                                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded capitalize border transition-colors ${
                                                        formData.group.toLowerCase().replace(/\s+/g, '_') === g
                                                            ? "bg-amber-600 text-white border-amber-600"
                                                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                                                    }`}
                                                >
                                                    {g.replace(/_/g, ' ')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                            Reg. Type
                                        </label>
                                        <select
                                            name="regType"
                                            value={formData.regType}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                                        >
                                            <option value="Registered">Registered</option>
                                            <option value="Unregistered">Unregistered</option>
                                            <option value="Composite">Composite</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Row 3: City, Area, State */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                            City
                                        </label>
                                        <input
                                            type="text"
                                            name="city"
                                            placeholder="e.g., Rajkot"
                                            value={formData.city}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                            Area / GIDC
                                        </label>
                                        <input
                                            type="text"
                                            name="area"
                                            placeholder="e.g., Shapar, Aji GIDC"
                                            value={formData.area}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                            State
                                        </label>
                                        <input
                                            type="text"
                                            name="state"
                                            placeholder="Gujarat"
                                            value={formData.state}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>

                                {/* Row 4: Mobile, GSTIN, PAN */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                            Mobile No <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            name="mobileNo"
                                            required
                                            placeholder="e.g., 9876543210"
                                            value={formData.mobileNo}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                            GSTIN No.
                                        </label>
                                        <input
                                            type="text"
                                            name="gstNo"
                                            placeholder="24AAAAA0000A1Z5"
                                            value={formData.gstNo}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                            PAN No.
                                        </label>
                                        <input
                                            type="text"
                                            name="panNo"
                                            placeholder="ABCDE1234F"
                                            value={formData.panNo}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
                                        />
                                    </div>
                                </div>

                                {/* Tabs Section (Tally Style: Main Details, Balances & Address) */}
                                <div className="pt-2">
                                    <div className="flex border-b border-slate-200 mb-2">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("main")}
                                            className={`px-3 py-1 text-xs font-bold border-b-2 -mb-px transition-colors ${
                                                activeTab === "main"
                                                    ? "border-amber-600 text-amber-800 bg-amber-50/50"
                                                    : "border-transparent text-slate-400 hover:text-slate-600"
                                            }`}
                                        >
                                            Contact & Address
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("balance")}
                                            className={`px-3 py-1 text-xs font-bold border-b-2 -mb-px transition-colors ${
                                                activeTab === "balance"
                                                    ? "border-amber-600 text-amber-800 bg-amber-50/50"
                                                    : "border-transparent text-slate-400 hover:text-slate-600"
                                            }`}
                                        >
                                            Opening Balance & Method
                                        </button>
                                    </div>

                                    {activeTab === "main" && (
                                        <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    Contact Person / Proprietor Name
                                                </label>
                                                <input
                                                    type="text"
                                                    name="personalName"
                                                    placeholder="e.g., Ramesh Bhai"
                                                    value={formData.personalName}
                                                    onChange={handleFormChange}
                                                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    Full Address
                                                </label>
                                                <textarea
                                                    name="address"
                                                    rows="2"
                                                    placeholder="Plot No., Street, Industrial Area"
                                                    value={formData.address}
                                                    onChange={handleFormChange}
                                                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "balance" && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    Opening Balance
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    name="openingBalance"
                                                    placeholder="0.00"
                                                    value={formData.openingBalance}
                                                    onChange={handleFormChange}
                                                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded font-semibold text-right"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    Balance Type
                                                </label>
                                                <select
                                                    name="balanceType"
                                                    value={formData.balanceType}
                                                    onChange={handleFormChange}
                                                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded font-bold"
                                                >
                                                    <option value="Debit">Debit (Dr)</option>
                                                    <option value="Credit">Credit (Cr)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                    Bill To Bill
                                                </label>
                                                <select
                                                    name="billToBill"
                                                    value={formData.billToBill}
                                                    onChange={handleFormChange}
                                                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded font-bold"
                                                >
                                                    <option value="No">No</option>
                                                    <option value="Yes">Yes</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>

                        {/* Bottom Actions Bar (Tally [OK] / [Cancel] style) */}
                        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-700"
                            >
                                Close
                            </button>

                            <div className="flex items-center gap-2">
                                {editingCustomer && (
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={(e) => handleSubmitForm(e, false)}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        Save Changes Only
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    form="party-master-form"
                                    disabled={isSubmitting}
                                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <Check className="w-4 h-4" />
                                    {editingCustomer ? "Update & Assign Party" : "Save & Assign Party"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
