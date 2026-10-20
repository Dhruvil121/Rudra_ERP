import { useState, useEffect } from "react";
import {
    ClipboardList, Factory, Package, Trash2, Archive, Settings,
    X, GripVertical, Loader2, Plus, Pencil, Lock, ShieldAlert, Check, Sparkles, ArrowRight
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
import { useProcessSequence, useSaveProcessSequence } from "../hooks/useProcessData";
import { useCalculateOrderBOM } from "../hooks/useBOMData";
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
// 1. ORDERS LIST (Synced to BOM & Settings Layout)
// ==========================================
function ProcessOrdersList({ orders, loading, onOpen }) {
    return (
        <div className="space-y-4 max-w-7xl mx-auto">
            {/* Top Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                        <ClipboardList className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Process Orders</h1>
                        <p className="text-sm text-slate-500">Select an order to start or update the manufacturing process</p>
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="p-4">Order ID (PI No.)</th>
                                <th className="p-4">Client Name</th>
                                <th className="p-4">Brand</th>
                                <th className="p-4">Product (Rudra Code)</th>
                                <th className="p-4 text-center">Quantity</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.map((order) => (
                                <tr key={order._id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-bold text-blue-600">{order.piNo}</td>
                                    <td className="p-4 text-sm font-semibold text-slate-800">{order.name}</td>
                                    <td className="p-4 text-sm text-slate-600">{order.brandName || "-"}</td>
                                    <td className="p-4 text-sm font-bold text-indigo-600">
                                        {order.items?.map(i => i.rudraCode).filter(Boolean).join(", ") || "-"}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                                            {order.items?.reduce((acc, item) => acc + Number(item.qty || 0), 0)} Sets
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span
                                            className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase ${order.status === "Pending"
                                                    ? "bg-orange-100 text-orange-700"
                                                    : "bg-green-100 text-green-700"
                                                }`}
                                        >
                                            {order.status}
                                        </span>
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
                            ))}
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
            )}
        </div>
    );
}

// ==========================================
// 2. PROCESS DETAIL & BOM IN-HOUSE SYNC
// ==========================================
function ProcessDetail({ order, onBack }) {
    const { hasPermission, hasProcessStepPermission, isAdmin } = useAuth();
    const [showProcessModal, setShowProcessModal] = useState(false);
    const { data: remoteSequence, isLoading } = useProcessSequence(order._id);
    const { data: bomData, isLoading: bomLoading } = useCalculateOrderBOM(order);
    const saveMutation = useSaveProcessSequence();
    const { showToast } = useFeedback();

    const [sequence, setSequence] = useState([]);
    const [hasLoaded, setHasLoaded] = useState(false);

    const canConfigureSteps = isAdmin;
    const canSave =
        isAdmin ||
        (hasPermission("process", "view") &&
            sequence.some((step) => hasProcessStepPermission(step.processName)));

    useEffect(() => {
        if (remoteSequence && !hasLoaded) {
            setSequence(remoteSequence.steps || []);
            setHasLoaded(true);
        }
    }, [remoteSequence, hasLoaded]);

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

    const handleSyncFromBOM = async () => {
        const inHouseParts = bomData?.inHouseParts || [];
        if (inHouseParts.length === 0) {
            showToast("No In-House BOM parts found for this order's Rudra Code.", "warning");
            return;
        }

        const generatedSteps = inHouseParts.map((part) => {
            const stepName = part.processName
                ? `${part.fieldName} - ${part.processName}`
                : part.fieldName;

            return {
                stepId: generateId(),
                processName: stepName,
                processType: "custom",
                activeFields: ["inputQty", "kg", "rejection", "extra", "output", "rate", "totalCost"],
                fields: calculateStepFields({
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
            await saveMutation.mutateAsync({ orderId: order._id, sequence: merged });
            showToast("Synced BOM In-House Parts into Process Flow!", "success");
        } catch (e) {
            showToast("Error syncing BOM parts: " + e.message, "error");
        }
    };

    const handleSave = async () => {
        try {
            await saveMutation.mutateAsync({ orderId: order._id, sequence });
            showToast("Process details saved successfully!", "success");
        } catch (e) {
            showToast("Error saving: " + e.message, "error");
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
            await saveMutation.mutateAsync({ orderId: order._id, sequence: normalizedSeq });
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

    if (isLoading && !hasLoaded) {
        return (
            <div className="flex justify-center p-24">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-24">
            {/* Top Header — Clean Layout */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                        <ClipboardList className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Process Flow: {order.piNo}</h1>
                        <p className="text-sm text-slate-500">
                            Client: <span className="font-semibold text-slate-700">{order.name}</span> ({order.partyCode || 'N/A'}) • Qty: {order.items?.reduce((a, i) => a + Number(i.qty || 0), 0)} Sets
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
                    {canSave && (
                        <button
                            onClick={handleSave}
                            disabled={saveMutation.isPending || sequence.length === 0}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save Process
                        </button>
                    )}
                </div>
            </div>

            {/* BOM In-House Factory Parts Banner */}
            <div className="bg-blue-50/80 rounded-xl border border-blue-200 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-600 text-white rounded-lg">
                            <Factory className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                                BOM In-House Factory Parts Required (Process Module)
                            </h3>
                            <p className="text-xs text-slate-500">
                                Calculated from BOM Recipe × Order Quantity
                            </p>
                        </div>
                    </div>
                    {canConfigureSteps && inHouseParts.length > 0 && (
                        <button
                            type="button"
                            onClick={handleSyncFromBOM}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                        >
                            <Sparkles className="w-3.5 h-3.5" /> Auto-Create Process Steps from BOM Parts
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
                        No In-House BOM parts found for <strong>{order.items?.[0]?.rudraCode || "this order"}</strong>. Configure them in the BOM module to see required pieces here.
                    </p>
                )}
            </div>

            {/* Product & Config Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="w-full md:w-2/3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Product Rudra Code & Sets
                    </label>
                    <input
                        value={order.items?.map(i => `${i.rudraCode} (${i.qty} Sets)`).join(", ") || "Multiple Items"}
                        readOnly
                        className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 bg-slate-50 font-bold text-indigo-700 text-sm"
                    />
                </div>
                {canConfigureSteps && (
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

            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider mt-6">Process Execution Flow</h2>

            {/* Process Flow Cards */}
            <div className="space-y-6">
                {sequence.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                        {canConfigureSteps
                            ? "No process steps configured. Click 'Configure Sequence' or 'Auto-Create Process Steps from BOM Parts'."
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
                productName={order.items?.[0]?.rudraCode || "Product"}
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
function DynamicProcessStep({ step, index, totalSteps, onFieldChange }) {
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

            {/* Clean Grid Layout instead of forced horizontal scroll */}
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
                        <p className="text-sm text-slate-500">Product: {productName}</p>
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