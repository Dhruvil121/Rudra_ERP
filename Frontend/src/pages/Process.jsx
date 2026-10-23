import { useState, useEffect, useMemo } from "react";
import {
    ClipboardList, Factory, Package, Trash2, Archive, Settings,
    X, GripVertical, Loader2, Plus, Pencil, Lock, ShieldAlert, Check, Sparkles,
    AlertTriangle, Truck, RotateCcw
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
import { useInventory, useReserveRejected, useReleaseRejected } from "../hooks/useInventoryData";
import { useFeedback } from "../context/FeedbackContext";

const ALL_FIELDS = [
    { key: "partyName", label: "Party Name", type: "text" },
    { key: "size", label: "Size", type: "text" },
    { key: "size_unit", label: "Size Unit", type: "select", options: ["Pieces", "Inches"] },
    { key: "kg", label: "KG (Raw Material)", type: "number" },
    { key: "inputQty", label: "Pieces Required", type: "number" },
    { key: "rejection", label: "Rejection", type: "number" },
    { key: "extra", label: "Extra (To Inventory)", type: "number" },
    { key: "output", label: "Output To Next Process", type: "number", calculated: true },
    { key: "cutting", label: "Cutting (Auto)", type: "number", calculated: true },
    { key: "hole", label: "Hole (Per Pc)", type: "number" },
    { key: "rate", label: "Rate", type: "number" },
    { key: "totalCost", label: "Total Cost", type: "number", calculated: true },
    { key: "finishing", label: "Finishing", type: "text" },
    { key: "piecesPerBox", label: "Pieces Per Box", type: "number" },
    { key: "totalBoxes", label: "Total Boxes", type: "number", calculated: true },
];

const generateId = () => Math.random().toString(36).substring(2, 10);

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
// 1. ORDERS LIST (Urgent First + Priority Breakdown)
// ==========================================
const PROCESS_STATUS_STYLES = {
    Pending: 'bg-orange-100 text-orange-700',
    Approved: 'bg-green-100 text-green-700',
    Dispatched: 'bg-blue-100 text-blue-700',
};

function ProcessOrdersList({ orders, loading, onOpen }) {
    const sortedOrders = useMemo(() => {
        return [...orders].sort((a, b) => {
            const priorityOrder = { urgent: 0, mixed: 1, normal: 2 };
            const pa = priorityOrder[a.orderPriority] ?? 2;
            const pb = priorityOrder[b.orderPriority] ?? 2;
            if (pa !== pb) return pa - pb;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }, [orders]);

    return (
        <div className="space-y-4 max-w-7xl mx-auto pb-12">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
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
                                {sortedOrders.map((order) => {
                                    const isUrgent = order.orderPriority === 'urgent';
                                    const isMixed = order.orderPriority === 'mixed';
                                    const urgentQty = (order.items || [])
                                        .filter(i => i.priority === 'urgent')
                                        .reduce((a, i) => a + Number(i.qty || 0), 0);
                                    const normalQty = (order.items || [])
                                        .filter(i => i.priority !== 'urgent')
                                        .reduce((a, i) => a + Number(i.qty || 0), 0);

                                    return (
                                        <tr
                                            key={order._id}
                                            className={`hover:bg-slate-50 transition-colors ${isUrgent
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
                                                    .map(i => `${i.rudraCode}${i.size ? ` (${i.size}: ${i.qty})` : ` (${i.qty})`}`)
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
                                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase ${PROCESS_STATUS_STYLES[order.status] || 'bg-orange-100 text-orange-700'}`}>
                                                        {order.status}
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
                                {orders.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-slate-400">
                                            No process orders available.
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
// 2. PROCESS DETAIL (True Per-Size/Per-Variant Pipelines + Rejected Stock Soft-Hold)
// ==========================================
function ProcessDetail({ order, onBack }) {
    const { hasPermission, hasProcessStepPermission, isAdmin } = useAuth();
    const [showProcessModal, setShowProcessModal] = useState(false);

    // Fetch both legacy single sequence AND all variant sequences for multi-size / urgent-split orders
    const { data: defaultSequence, isLoading: singleLoading } = useProcessSequence(order._id);
    const { data: allSequences = [], isLoading: allLoading } = useAllProcessSequences(order._id);
    const { data: inventoryGroups = [] } = useInventory();

    const saveMutation = useSaveProcessSequence();
    const dispatchMutation = useDispatchOrder();
    const reserveRejectedMutation = useReserveRejected();
    const releaseRejectedMutation = useReleaseRejected();
    const { showToast, showConfirm } = useFeedback();

    // Build Variant Tabs (Each line item—e.g. 4mm screw, 6mm screw, or 20 Urgent vs 130 Normal—gets a tab)
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

    // Default to the first Urgent variant if multiple variants exist, or 'all' if single item
    const [activeVariantKey, setActiveVariantKey] = useState(() =>
        orderVariants.length > 1 ? orderVariants[0].variantKey : 'all'
    );

    const activeVariant = useMemo(() => {
        if (activeVariantKey === 'all') return null;
        return orderVariants.find(v => v.variantKey === activeVariantKey) || null;
    }, [activeVariantKey, orderVariants]);

    // Calculate BOM dynamically for the currently selected variant (or whole order if 'all' tab)
    const scopedOrderForBOM = useMemo(() => {
        if (!activeVariant) return order;
        return {
            ...order,
            _id: `${order._id}_${activeVariant.variantKey}`,
            items: [activeVariant.rawItem]
        };
    }, [order, activeVariant]);

    const { data: bomData, isLoading: bomLoading } = useCalculateOrderBOM(scopedOrderForBOM);

    // Resolve the active sequence & rejectedUsage for the currently selected Size/Priority tab
    const activeRemoteDoc = useMemo(() => {
        if (activeVariantKey === 'all') {
            return (
                allSequences.find(s => !s.orderItemId) ||
                defaultSequence ||
                allSequences[0] ||
                null
            );
        }
        return (
            allSequences.find(
                s =>
                    s.orderItemId === activeVariantKey ||
                    (activeVariant?.size && s.sizeVariant === activeVariant.size && s.priority === activeVariant.priority)
            ) || null
        );
    }, [activeVariantKey, activeVariant, allSequences, defaultSequence]);

    const [sequence, setSequence] = useState([]);
    const [rejectedUsage, setRejectedUsage] = useState([]);

    // Sync local state whenever the user switches Size/Variant tabs or data loads
    useEffect(() => {
        if (activeRemoteDoc) {
            setSequence(activeRemoteDoc.steps || []);
            setRejectedUsage(activeRemoteDoc.rejectedUsage || []);
        } else {
            setSequence([]);
            setRejectedUsage([]);
        }
    }, [activeRemoteDoc, activeVariantKey]);

    // Find rejected pieces available in inventory
    const availableRejectedPieces = useMemo(() => {
        const rudraCodesInOrder = [
            ...new Set((order.items || []).map(i => i.rudraCode?.toUpperCase()).filter(Boolean))
        ];
        const rejected = [];
        inventoryGroups.forEach(group => {
            (group.subItems || []).forEach(sub => {
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

    const calculateStepFields = (rawFields) => {
        const newFields = { ...rawFields };
        const safeSize = Number(newFields.size);
        const inputQty = Number(newFields.inputQty) || 0;

        if (safeSize > 0 && inputQty > 0) {
            newFields.cutting = Number((inputQty / safeSize).toFixed(2));
        }
        if (newFields.rate && inputQty > 0) {
            newFields.totalCost = Number((inputQty * Number(newFields.rate)).toFixed(2));
        }
        if (Number(newFields.piecesPerBox) > 0 && inputQty > 0) {
            newFields.totalBoxes = Number((inputQty / Number(newFields.piecesPerBox)).toFixed(2));
        }

        const rej = Number(newFields.rejection) || 0;
        const ext = Number(newFields.extra) || 0;
        newFields.output = inputQty - rej - ext;

        return newFields;
    };

    const handleFieldChange = (stepId, fieldKey, value) => {
        setSequence((prev) =>
            prev.map((step) => {
                if (step.stepId !== stepId) return step;
                if (!isAdmin && !hasProcessStepPermission(step.processName)) {
                    return step;
                }
                const updatedFields = calculateStepFields({
                    ...step.fields,
                    [fieldKey]: value,
                });
                return { ...step, fields: updatedFields };
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

            return {
                stepId: generateId(),
                processName: `${baseName}${variantLabel}`,
                processType: "custom",
                activeFields: ["size", "inputQty", "kg", "rejection", "extra", "output", "rate", "totalCost"],
                fields: calculateStepFields({
                    size: activeVariant?.size || "",
                    inputQty: part.requiredPieces || 0,
                    kg: part.totalWeightKg || 0,
                    rejection: 0,
                    extra: 0,
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
            showToast("Process details saved successfully!", "success");
        } catch (e) {
            showToast("Error saving: " + e.message, "error");
        }
    };

    // Problem 3: Soft-Reserve Rejected Pieces from Inventory & Immediately Save to ProcessSequence
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

            // Immediately persist to ProcessSequence so it is tracked for Dispatch
            await persistCurrentSequence(sequence, nextRejectedUsage);

            showToast(
                `Soft-reserved ${quantity} Pcs of ${rejItem.itemCode} (Used in Process — will deduct from Inventory on Dispatch)`,
                'success'
            );
        } catch (e) {
            showToast(e.message || 'Failed to reserve rejected pieces', 'error');
        }
    };

    // Release soft-reserved rejected pieces back to Inventory if needed before dispatch
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

    const handleDispatch = async () => {
        const unconfirmedCount = rejectedUsage
            .filter(r => !r.confirmed)
            .reduce((sum, r) => sum + Number(r.quantity || 0), 0);

        const isConfirmed = await showConfirm({
            title: 'Confirm Order Dispatch',
            message: `Confirm dispatch for Order ${order.piNo}? This will mark the order as Dispatched and permanently deduct ${unconfirmedCount} soft-reserved rejected piece(s) from Inventory.`,
            type: 'info',
            confirmText: 'Confirm Dispatch'
        });
        if (!isConfirmed) return;
        try {
            // Save latest sequence state before dispatching
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

    const handleModalSave = async (newSeq) => {
        const normalizedSeq = newSeq.map((step) => ({
            ...step,
            fields: calculateStepFields(step.fields || {}),
        }));

        setSequence(normalizedSeq);
        setShowProcessModal(false);

        try {
            await persistCurrentSequence(normalizedSeq, rejectedUsage);
            showToast("Process sequence updated successfully!", "success");
        } catch (e) {
            showToast("Failed to save sequence structure: " + e.message, "error");
        }
    };

    let totalExtra = 0,
        totalRejection = 0,
        finalOutput = 0;
    sequence.forEach((step) => {
        totalExtra += Number(step.fields?.extra || 0);
        totalRejection += Number(step.fields?.rejection || 0);
        if (step.activeFields?.includes("totalBoxes")) {
            finalOutput = Number(step.fields?.totalBoxes || 0);
        }
    });

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
                    <div className={`p-3 rounded-xl ${order.orderPriority === 'urgent' ? 'bg-red-100 text-red-600' :
                            order.orderPriority === 'mixed' ? 'bg-amber-100 text-amber-600' :
                                'bg-blue-100 text-blue-600'
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
                    {!isDispatched && canSave && (
                        <button
                            onClick={handleSave}
                            disabled={saveMutation.isPending || sequence.length === 0}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save Process
                        </button>
                    )}
                    {!isDispatched && canSave && (
                        <button
                            onClick={handleDispatch}
                            disabled={dispatchMutation.isPending}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {dispatchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                            Confirm Dispatch
                        </button>
                    )}
                </div>
            </div>

            {/* Problem 1 & 2: Multi-Size & Urgent Split Variant Selector Tabs */}
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
                                s => s.orderItemId === sv.variantKey && s.steps?.length > 0
                            );
                            return (
                                <button
                                    key={sv.variantKey}
                                    onClick={() => setActiveVariantKey(sv.variantKey)}
                                    className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border ${isSelected
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
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase ${isSelected ? 'bg-red-800 text-white' : 'bg-red-200 text-red-800'}`}>
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
                            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all border ${activeVariantKey === 'all'
                                    ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            Combined Order View ({order.items?.reduce((a, i) => a + Number(i.qty || 0), 0)} Pcs)
                        </button>
                    </div>
                </div>
            )}

            {/* BOM In-House Factory Parts Banner (Scoped to Selected Size/Urgent Variant) */}
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

            {/* Problem 3: Rejected Stock Available Panel (Provisional Soft-Hold until Dispatch) */}
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
                                    className={`bg-white p-3.5 rounded-lg border shadow-sm ${rp.matchesOrder ? 'border-amber-400 ring-1 ring-amber-200' : 'border-slate-200'
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

                    {/* Active Soft-Reserved Rejected Pieces in this Order/Variant */}
                    {rejectedUsage.length > 0 && (
                        <div className="bg-white rounded-lg border border-amber-200 p-3 space-y-2">
                            <span className="text-xs font-bold text-slate-700 uppercase block">
                                Rejected Pieces Used in This Process:
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {rejectedUsage.map((u, idx) => (
                                    <div
                                        key={idx}
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border ${u.confirmed
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

            {/* Active Variant Product & Config Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="w-full md:w-2/3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Active Process Pipeline Target
                    </label>
                    <input
                        value={
                            activeVariant
                                ? `${activeVariant.rudraCode} — Size: ${activeVariant.size} (${activeVariant.qty} Sets • ${activeVariant.priority.toUpperCase()})`
                                : order.items?.map(i => `${i.rudraCode} (${i.qty} Sets${i.size ? ` — ${i.size}` : ''})`).join(", ") || "Multiple Items"
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
                        <Settings size={18} /> Configure Sequence
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

            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider mt-6">
                Process Execution Flow {activeVariant ? `— Size: ${activeVariant.size} (${activeVariant.qty} Pcs)` : ''}
            </h2>

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
                                onFieldChange={handleFieldChange}
                            />
                        </div>
                    ))
                )}
            </div>

            {/* Summary Totals Footer */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-100">
                    <Package size={28} className="text-green-600 shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Total Added To Inventory</p>
                        <h2 className="text-2xl font-extrabold text-green-800">{totalExtra} <span className="text-sm font-normal">Pcs</span></h2>
                    </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
                    <Trash2 size={28} className="text-red-600 shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Total Rejection (Scrap)</p>
                        <h2 className="text-2xl font-extrabold text-red-800">{totalRejection} <span className="text-sm font-normal">Pcs</span></h2>
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
        </div>
    );
}

// ==========================================
// 3. PROCESS STEP WITH CLEAN WRAP GRID
// ==========================================
function DynamicProcessStep({ step, index, onFieldChange }) {
    const { hasProcessStepPermission } = useAuth();
    const isAuthorized = hasProcessStepPermission(step.processName);

    const activeFieldKeys = step.activeFields || [];
    const fields = ALL_FIELDS.filter((f) => activeFieldKeys.includes(f.key));

    const colors = [
        { bg: "bg-green-600", text: "text-white" },
        { bg: "bg-blue-600", text: "text-white" },
        { bg: "bg-purple-600", text: "text-white" },
        { bg: "bg-pink-600", text: "text-white" },
        { bg: "bg-indigo-600", text: "text-white" },
    ];
    const color = colors[index % colors.length];

    return (
        <div className={`space-y-4 ${!isAuthorized ? "opacity-75" : ""}`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${isAuthorized ? color.bg : "bg-slate-300"} ${color.text} flex items-center justify-center font-bold text-sm shadow-sm`}>
                        {isAuthorized ? index + 1 : <Lock className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Step #{index + 1}</span>
                        <h3 className="text-base font-bold text-slate-800">{step.processName}</h3>
                    </div>
                </div>
                {!isAuthorized && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 border border-red-200 text-red-500 text-xs font-bold rounded-full uppercase tracking-wider">
                        <Lock className="w-3 h-3" /> View Only — Not Authorized
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-2">
                {fields.map((field) => {
                    const isCalculated = field.calculated;
                    const isLocked = isCalculated || !isAuthorized;
                    const value = step.fields?.[field.key] ?? "";

                    let bgColor = "bg-white";
                    let borderColor = "border-slate-200";
                    let textColor = "text-slate-800";
                    let labelColor = "text-slate-700 font-semibold";

                    if (isCalculated) {
                        if (field.key === "output" || field.key === "totalBoxes") {
                            bgColor = "bg-green-50/60";
                            borderColor = "border-green-300";
                            labelColor = "text-green-700 font-bold";
                        } else {
                            bgColor = "bg-slate-50";
                        }
                    } else if (!isLocked) {
                        if (field.key === "rejection") {
                            bgColor = "bg-red-50/40";
                            borderColor = "border-red-200";
                        }
                        if (field.key === "extra") {
                            bgColor = "bg-orange-50/40";
                            borderColor = "border-orange-200";
                        }
                    } else {
                        bgColor = "bg-slate-50";
                        textColor = "text-slate-400";
                    }

                    return (
                        <div key={field.key} className="space-y-1.5">
                            <label className={`block text-xs truncate ${labelColor}`}>{field.label}</label>
                            {field.type === "select" ? (
                                <select
                                    value={value}
                                    onChange={(e) => onFieldChange(step.stepId, field.key, e.target.value)}
                                    disabled={isLocked}
                                    className={`w-full border ${borderColor} rounded-lg px-3 py-2 ${bgColor} text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${isLocked ? "cursor-not-allowed opacity-75" : ""
                                        }`}
                                >
                                    <option value="">Select...</option>
                                    {field.options?.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            ) : (
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
                                    className={`w-full border ${borderColor} rounded-lg px-3 py-2 ${bgColor} ${textColor} text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium ${isLocked ? "cursor-not-allowed opacity-75" : ""
                                        }`}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ==========================================
// 4. DRAG, DROP & FULL EDIT MODAL
// ==========================================
function ProductProcessModal({ isOpen, onClose, productName, initialSequence, onSave, showToast }) {
    const [sequence, setSequence] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newProcessName, setNewProcessName] = useState("");
    const [selectedFields, setSelectedFields] = useState([]);

    const [editingStepId, setEditingStepId] = useState(null);
    const [editProcessName, setEditProcessName] = useState("");
    const [editSelectedFields, setEditSelectedFields] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setSequence(initialSequence || []);
            setShowAdd(false);
            setNewProcessName("");
            setSelectedFields([]);
            setEditingStepId(null);
            setEditProcessName("");
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

    const handleStartEdit = (step) => {
        setShowAdd(false);
        setEditingStepId(step.stepId);
        setEditProcessName(step.processName || "");
        setEditSelectedFields(step.activeFields || []);
    };

    const handleCancelEdit = () => {
        setEditingStepId(null);
        setEditProcessName("");
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
                    ? { ...step, processName: editProcessName.trim(), activeFields: editSelectedFields }
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

        setSequence([
            ...sequence,
            {
                stepId: generateId(),
                processName: newProcessName.trim(),
                processType: "custom",
                activeFields: selectedFields,
                fields: {},
            },
        ]);
        setShowAdd(false);
        setNewProcessName("");
        setSelectedFields([]);
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
                    ? { ...step, processName: editProcessName.trim(), activeFields: editSelectedFields }
                    : step
            );
        }

        if (showAdd && newProcessName.trim() !== "") {
            if (selectedFields.length === 0) {
                showToast("Please select at least one checkbox field for your new process.", "warning");
                return;
            }
            finalSeq.push({
                stepId: generateId(),
                processName: newProcessName.trim(),
                processType: "custom",
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
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Configure Process Sequence</h2>
                        <p className="text-sm text-slate-500">Target Variant: {productName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext
                            items={sequence.map((s) => s.stepId)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-3">
                                {sequence.map((step, index) => (
                                    <SortableItem
                                        key={step.stepId}
                                        step={step}
                                        index={index}
                                        isEditing={editingStepId === step.stepId}
                                        editProcessName={editProcessName}
                                        setEditProcessName={setEditProcessName}
                                        editSelectedFields={editSelectedFields}
                                        setEditSelectedFields={setEditSelectedFields}
                                        onStartEdit={() => handleStartEdit(step)}
                                        onSaveEdit={() => handleSaveEdit(step.stepId)}
                                        onCancelEdit={handleCancelEdit}
                                        onRemove={() => {
                                            if (editingStepId === step.stepId) handleCancelEdit();
                                            setSequence((s) => s.filter((x) => x.stepId !== step.stepId));
                                        }}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>

                    {showAdd ? (
                        <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Process Step</h4>
                            <input
                                type="text"
                                placeholder="Process Name (e.g., Round Dabi Turning)"
                                value={newProcessName}
                                onChange={(e) => setNewProcessName(e.target.value)}
                                className="w-full border border-slate-200 bg-white rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1 bg-white border border-slate-200 rounded-lg">
                                {ALL_FIELDS.map((f) => (
                                    <label key={f.key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-1">
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
                            <div className="flex gap-2">
                                <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">Add Process</button>
                                <button onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-lg text-sm bg-white">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => { handleCancelEdit(); setShowAdd(true); }}
                            className="flex items-center gap-2 text-blue-600 font-semibold px-4 py-2 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            <Plus size={18} /> Add Process Step
                        </button>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 border rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                    <button onClick={handleModalSave} className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-blue-700">Save Sequence</button>
                </div>
            </div>
        </div>
    );
}

function SortableItem({
    step,
    index,
    isEditing,
    editProcessName,
    setEditProcessName,
    editSelectedFields,
    setEditSelectedFields,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
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
                <input
                    type="text"
                    value={editProcessName}
                    onChange={(e) => setEditProcessName(e.target.value)}
                    className="w-full border border-slate-300 bg-white rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-800"
                />
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
                    <button onClick={onCancelEdit} className="px-3 py-1.5 border bg-white text-xs font-semibold rounded-lg">Cancel</button>
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
                <button type="button" onClick={onStartEdit} title="Edit Step" className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Pencil size={18} />
                </button>
                <button type="button" onClick={onRemove} title="Delete Step" className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
}