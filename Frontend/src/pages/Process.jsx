import { useState, useEffect } from "react";
import {
    ClipboardList, Factory, Package, Trash2, Archive, Settings,
    ArrowLeft, X, GripVertical, Loader2, Plus, Pencil, Lock, ShieldAlert
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
import { useFeedback } from '../context/FeedbackContext';

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

// Helper to generate safe unique IDs across all browsers
const generateId = () => Math.random().toString(36).substring(2, 10);

export default function ProcessModule() {
    const [view, setView] = useState('list');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const { data: orders = [], isLoading: ordersLoading } = useOrders();

    if (view === 'list') {
        return <ProcessOrdersList orders={orders} loading={ordersLoading} onOpen={(order) => { setSelectedOrder(order); setView('detail'); }} />;
    }

    // Passing a unique key forces React to completely reset state when switching orders
    return <ProcessDetail key={selectedOrder._id} order={selectedOrder} onBack={() => { setView('list'); setSelectedOrder(null); }} />;
}

// ==========================================
// 1. ORDERS LIST
// ==========================================
function ProcessOrdersList({ orders, loading, onOpen }) {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><ClipboardList className="w-6 h-6" /></div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Process Orders</h1>
                    <p className="text-sm text-slate-500">Select Order To Start Process</p>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-semibold mb-6">Orders List</h2>
                <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-7 gap-4 text-sm font-semibold text-slate-600 mb-2">
                    <div>Order ID</div><div>Client Name</div><div>Brand</div><div>Product</div><div>Quantity</div><div>Status</div><div>Action</div>
                </div>
                {loading ? <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div> : (
                    <div className="divide-y divide-slate-100">
                        {orders.map((order) => (
                            <div key={order._id} className="grid grid-cols-7 gap-4 py-4 px-4 items-center hover:bg-slate-50">
                                <div className="font-semibold text-slate-800">{order.piNo}</div>
                                <div>{order.name}</div>
                                <div>{order.brandName || '-'}</div>
                                <div>{order.items?.[0]?.rudraCode || '-'}</div>
                                <div>{order.items?.reduce((acc, item) => acc + Number(item.qty || 0), 0)}</div>
                                <div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${order.status === 'Pending' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{order.status}</span>
                                </div>
                                <div>
                                    <button onClick={() => onOpen(order)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Open</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ==========================================
// 2. PROCESS DETAIL & FLOW
// ==========================================
function ProcessDetail({ order, onBack }) {
    const { user, hasPermission, hasProcessStepPermission, isAdmin } = useAuth();
    const [showProcessModal, setShowProcessModal] = useState(false);
    const { data: remoteSequence, isLoading } = useProcessSequence(order._id);
    const saveMutation = useSaveProcessSequence();
    const { showToast } = useFeedback();

    const [sequence, setSequence] = useState([]);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Only super_admin or users with 'add' permission on process can configure steps
    const canConfigureSteps = isAdmin;
    // Only super_admin or users with at least one process permission can save
    const canSave = isAdmin || (hasPermission('process', 'view') && sequence.some(step =>
        hasProcessStepPermission(step.processName)
    ));

    useEffect(() => {
        // Only set initial data once to prevent React Query from wiping out local inputs on window focus
        if (remoteSequence && !hasLoaded) {
            setSequence(remoteSequence.steps || []);
            setHasLoaded(true);
        }
    }, [remoteSequence, hasLoaded]);

    const handleFieldChange = (stepId, fieldKey, value) => {
        setSequence(prev => prev.map(step => {
            if (step.stepId !== stepId) return step;
            
            // SECURITY: Hard block state updates if the user doesn't have permission for this step.
            if (!isAdmin && !hasProcessStepPermission(step.processName)) {
                return step;
            }

            const newFields = { ...step.fields, [fieldKey]: value };

            // Auto Calculations
            const safeSize = Number(newFields.size);
            if (safeSize > 0 && newFields.inputQty) newFields.cutting = newFields.inputQty / safeSize;
            if (newFields.rate && newFields.inputQty) newFields.totalCost = newFields.inputQty * newFields.rate;
            if (newFields.piecesPerBox > 0 && newFields.inputQty) newFields.totalBoxes = newFields.inputQty / newFields.piecesPerBox;

            const rej = Number(newFields.rejection) || 0;
            const ext = Number(newFields.extra) || 0;
            newFields.output = (Number(newFields.inputQty) || 0) - rej - ext;

            return { ...step, fields: newFields };
        }));
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
        setSequence(newSeq);
        setShowProcessModal(false);
        // Force immediate save to DB when modal closes
        try {
            await saveMutation.mutateAsync({ orderId: order._id, sequence: newSeq });
        } catch (e) {
            console.error("Failed to sync sequence structure", e);
        }
    };

    let totalExtra = 0, totalRejection = 0, finalOutput = 0;
    sequence.forEach(step => {
        totalExtra += Number(step.fields?.extra || 0);
        totalRejection += Number(step.fields?.rejection || 0);
        if (step.activeFields?.includes('totalBoxes')) finalOutput = Number(step.fields?.totalBoxes || 0);
    });

    if (isLoading && !hasLoaded) return <div className="flex justify-center p-24"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 pb-24">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="grid grid-cols-7 gap-6 items-center">
                    <div><p className="text-sm text-slate-500">Order No.</p><h3 className="font-semibold">{order.piNo}</h3></div>
                    <div><p className="text-sm text-slate-500">Order Date</p><h3 className="font-semibold">{order.date ? new Date(order.date).toLocaleDateString() : '-'}</h3></div>
                    <div className="col-span-2"><p className="text-sm text-slate-500">Customer Name</p><h3 className="font-semibold text-blue-600">{order.name}</h3></div>
                    <div><p className="text-sm text-slate-500">Total Qty</p><h3 className="font-semibold">{order.items?.reduce((a, i) => a + Number(i.qty || 0), 0)} Pcs</h3></div>
                    <div><p className="text-sm text-slate-500">Status</p><h3 className="font-semibold text-green-600">{order.status}</h3></div>
                    <div className="flex justify-end"><button onClick={onBack} className="px-5 py-3 border rounded-xl hover:bg-slate-50">← Back to Orders</button></div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-end">
                    <div className="w-1/2">
                        <label className="block text-sm font-medium mb-2">Product Name (From Inventory)</label>
                        <div className="flex gap-2">
                            <input value={order.items?.[0]?.rudraCode || "Multiple Items"} readOnly className="flex-1 border rounded-xl px-4 py-3 bg-white" />
                            {/* Only super_admin can configure process sequence structure */}
                            {canConfigureSteps && (
                                <button onClick={() => setShowProcessModal(true)} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm"><Settings size={20} /></button>
                            )}
                        </div>
                    </div>
                    {canSave && (
                        <button
                            onClick={handleSave}
                            disabled={saveMutation.isPending || sequence.length === 0}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-sm hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                            Save Process Details
                        </button>
                    )}
                </div>
            </div>

            {/* RBAC Legend for managers */}
            {!isAdmin && (
                <div className="flex items-center gap-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                    <p className="text-amber-700">
                        <strong>Access Control Active</strong> — You can only edit process steps assigned to you. Locked steps are view-only.
                    </p>
                </div>
            )}

            <h2 className="text-xl font-bold mt-8 mb-4 uppercase tracking-wider">PROCESS FLOW</h2>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
                {sequence.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        {canConfigureSteps
                            ? "No process steps configured. Click the gear icon to build the sequence."
                            : "No process steps configured. Contact your Super Admin to set up the process sequence."
                        }
                    </div>
                ) : (
                    sequence.map((step, index) => (
                        <div key={step.stepId}>
                            <DynamicProcessStep step={step} index={index} totalSteps={sequence.length} onFieldChange={handleFieldChange} />
                            {index < sequence.length - 1 && <div className="border-t border-slate-100 my-6"></div>}
                        </div>
                    ))
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 grid grid-cols-3 gap-8">
                <div className="flex items-center gap-4">
                    <Package size={32} className="text-green-600" />
                    <div><p className="text-sm text-slate-500">Total Added To Inventory (Extra)</p><h2 className="text-3xl font-bold">{totalExtra} <span className="text-lg font-normal">Pcs</span></h2></div>
                </div>
                <div className="flex items-center gap-4">
                    <Trash2 size={32} className="text-red-600" />
                    <div><p className="text-sm text-slate-500">Total Rejection (Scrap)</p><h2 className="text-3xl font-bold">{totalRejection} <span className="text-lg font-normal">Pcs</span></h2></div>
                </div>
                <div className="flex items-center gap-4">
                    <Archive size={32} className="text-blue-600" />
                    <div><p className="text-sm text-slate-500">Final Output (Boxes)</p><h2 className="text-3xl font-bold">{finalOutput} <span className="text-lg font-normal">Box</span></h2></div>
                </div>
            </div>

            <ProductProcessModal isOpen={showProcessModal} onClose={() => setShowProcessModal(false)} productName={order.items?.[0]?.rudraCode || "Product"} initialSequence={sequence} onSave={handleModalSave} showToast={showToast} />
        </div>
    );
}

// ==========================================
// 3. PROCESS STEP WITH RBAC LOCK UI
// ==========================================
function DynamicProcessStep({ step, index, totalSteps, onFieldChange }) {
    const { hasProcessStepPermission } = useAuth();
    const isAuthorized = hasProcessStepPermission(step.processName);

    const activeFieldKeys = step.activeFields || [];
    const fields = ALL_FIELDS.filter(f => activeFieldKeys.includes(f.key));

    const colors = [
        { bg: "bg-green-500", text: "text-white" },
        { bg: "bg-blue-500", text: "text-white" },
        { bg: "bg-purple-500", text: "text-white" },
        { bg: "bg-pink-500", text: "text-white" },
        { bg: "bg-indigo-500", text: "text-white" }
    ];
    const color = colors[index % colors.length];

    return (
        <div className={`flex gap-6 relative w-full ${!isAuthorized ? 'opacity-75' : ''}`}>
            <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full ${isAuthorized ? color.bg : 'bg-slate-300'} ${color.text} flex items-center justify-center font-bold text-lg shadow-sm`}>
                    {isAuthorized ? index + 1 : <Lock className="w-4 h-4" />}
                </div>
                {index < totalSteps - 1 && <div className="w-[1px] h-full bg-slate-300 mt-2"></div>}
            </div>

            <div className="flex-1 w-full overflow-hidden">
                <div className="flex items-center gap-3 mb-3">
                    <span className={`inline-block px-3 py-1 rounded-md text-[10px] font-bold ${isAuthorized ? color.bg : 'bg-slate-300'} ${color.text} uppercase tracking-wider`}>
                        PROCESS {index + 1}
                    </span>
                    {!isAuthorized && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 text-red-500 text-[10px] font-bold rounded-full uppercase tracking-wider">
                            <Lock className="w-2.5 h-2.5" />
                            View Only — Not Authorized
                        </span>
                    )}
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-4">{step.processName}</h3>

                <div className="flex gap-4 w-full overflow-x-auto pb-2">
                    {fields.map(field => {
                        const isCalculated = field.calculated;
                        const isLocked = isCalculated || !isAuthorized;
                        const value = step.fields?.[field.key] ?? '';

                        let bgColor = "bg-white";
                        let borderColor = "border-slate-200";
                        let textColor = "text-slate-800";
                        let labelColor = "text-slate-800 font-semibold";

                        if (isCalculated) {
                            if (field.key === 'output' || field.key === 'totalBoxes') { bgColor = 'bg-green-50'; borderColor = 'border-green-300'; labelColor = 'text-green-600 font-bold'; }
                        } else if (!isLocked) {
                            if (field.key === 'rejection') { bgColor = 'bg-red-50'; borderColor = 'border-red-200'; }
                            if (field.key === 'extra') { bgColor = 'bg-orange-50'; borderColor = 'border-orange-200'; }
                        } else {
                            bgColor = "bg-slate-50"; textColor = "text-slate-400";
                        }

                        return (
                            <div key={field.key} className="flex-1 min-w-[140px]">
                                <label className={`block text-xs mb-2 ${labelColor}`}>{field.label}</label>
                                {field.type === 'select' ? (
                                    <select value={value} onChange={e => onFieldChange(step.stepId, field.key, e.target.value)} disabled={isLocked} className={`w-full border ${borderColor} rounded-xl px-3 py-2.5 ${bgColor} text-sm focus:outline-none ${isLocked ? 'cursor-not-allowed opacity-75' : ''}`}>
                                        {field.options?.map(opt => <option key={opt}>{opt}</option>)}
                                    </select>
                                ) : (
                                    <input
                                        type={field.type}
                                        value={value}
                                        onChange={e => onFieldChange(step.stepId, field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                                        disabled={isLocked}
                                        className={`w-full border ${borderColor} rounded-xl px-3 py-2.5 ${bgColor} ${textColor} text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${isLocked ? 'cursor-not-allowed opacity-75' : ''}`}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ==========================================
// 4. DRAG AND DROP MODAL (Super Admin Only)
// ==========================================
function ProductProcessModal({ isOpen, onClose, productName, initialSequence, onSave, showToast }) {
    const [sequence, setSequence] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newProcessName, setNewProcessName] = useState("");
    const [selectedFields, setSelectedFields] = useState([]);

    useEffect(() => { if (isOpen) setSequence(initialSequence); }, [isOpen, initialSequence]);

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const handleDragEnd = (e) => {
        const { active, over } = e;
        if (active.id !== over.id) {
            const oldIdx = sequence.findIndex(p => p.stepId === active.id);
            const newIdx = sequence.findIndex(p => p.stepId === over.id);
            setSequence(arrayMove(sequence, oldIdx, newIdx));
        }
    };

    const handleAdd = () => {
        if (newProcessName.trim() && selectedFields.length > 0) {
            setSequence([...sequence, {
                stepId: generateId(), processName: newProcessName.trim(), processType: 'custom', activeFields: selectedFields, fields: {}
            }]);
            setShowAdd(false); setNewProcessName(""); setSelectedFields([]);
        }
    };

    const handleModalSave = () => {
        let finalSeq = [...sequence];

        // Safety check: If user typed a process name but forgot to click "Add Process", auto-add it!
        if (showAdd && newProcessName.trim() !== "") {
            if (selectedFields.length === 0) {
                showToast("Please select at least one checkbox field for your new process.", "warning");
                return;
            }
            finalSeq.push({
                stepId: generateId(),
                processName: newProcessName.trim(),
                processType: 'custom',
                activeFields: selectedFields,
                fields: {}
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
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">Configure Process Sequence</h2>
                        <p className="text-sm text-slate-500">Product: {productName}</p>
                        <p className="text-xs text-amber-600 font-medium mt-1">⚠ Super Admin only — Adding, removing, or reordering steps</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={sequence.map(s => s.stepId)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-3">
                                {sequence.map((step) => (
                                    <SortableItem key={step.stepId} step={step} onRemove={() => setSequence(s => s.filter(x => x.stepId !== step.stepId))} />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>

                    {showAdd ? (
                        <div className="mt-6 p-5 bg-slate-50 border border-slate-200 rounded-xl">
                            <input type="text" placeholder="Process Name (e.g., Cutting)" value={newProcessName} onChange={e => setNewProcessName(e.target.value)} className="w-full border rounded-lg px-4 py-2.5 mb-4 focus:outline-none" />
                            <div className="grid grid-cols-3 gap-3 mb-5 max-h-48 overflow-y-auto">
                                {ALL_FIELDS.map(f => (
                                    <label key={f.key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedFields.includes(f.key)} onChange={e => {
                                        if (e.target.checked) setSelectedFields([...selectedFields, f.key]); else setSelectedFields(selectedFields.filter(x => x !== f.key));
                                    }} className="rounded" /> {f.label}</label>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleAdd} className="px-5 py-2 bg-blue-600 text-white rounded-lg">Add Process</button>
                                <button onClick={() => { setShowAdd(false); setNewProcessName(""); setSelectedFields([]); }} className="px-5 py-2 border rounded-lg bg-white">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setShowAdd(true)} className="mt-6 flex items-center gap-2 text-blue-600 font-semibold px-4 py-2 hover:bg-blue-50 rounded-lg"><Plus size={18} /> Add Process Step</button>
                    )}
                </div>
                <div className="p-6 border-t border-slate-100 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-2.5 border rounded-lg hover:bg-slate-50 font-medium">Cancel</button>
                    <button onClick={handleModalSave} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg shadow-sm hover:bg-blue-700">Save Sequence</button>
                </div>
            </div>
        </div>
    );
}

function SortableItem({ step, onRemove }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.stepId });
    const style = { transform: CSS.Transform.toString(transform), transition };
    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-white p-4 rounded-xl border shadow-sm">
            <button {...attributes} {...listeners} className="cursor-grab text-slate-400"><GripVertical size={20} /></button>
            <div className="flex-1 font-semibold">{step.processName}</div>
            <button onClick={onRemove} className="p-2 text-red-500"><Trash2 size={18} /></button>
        </div>
    );
}