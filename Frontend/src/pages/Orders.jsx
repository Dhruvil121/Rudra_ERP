import { useState, useMemo } from 'react';
import {
    Search, Plus, Edit2, Trash2, ArrowLeft, Check, X, Printer,
    CheckCircle, Package, Loader2, Factory, Building2
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

// ==========================================
// 1. LIST VIEW
// ==========================================
function OrderList({ orders, onNavigate }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');

    const filteredOrders = orders?.filter(order => {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
            !searchTerm ||
            order.piNo?.toLowerCase().includes(term) ||
            order.name?.toLowerCase().includes(term) ||
            order.partyCode?.toLowerCase().includes(term);
        const matchesStatus = statusFilter === 'All Status' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Orders (PI)</h1>
                    <p className="text-sm text-slate-500">
                        Proforma Invoices <span className="text-slate-400 ml-1">{orders.length} total</span>
                    </p>
                </div>
                <PermissionGuard module="order" action={ACTIONS.ADD}>
                    <button
                        onClick={() => onNavigate('form')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> New Order (PI)
                    </button>
                </PermissionGuard>
            </div>

            <div className="flex justify-between items-center bg-white p-3 rounded-md shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-72">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search PI No, Party Code, Customer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-400"
                        />
                    </div>
                    <select
                        className="py-1.5 px-3 text-sm bg-slate-50 border border-slate-200 rounded focus:outline-none"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option>All Status</option>
                        <option>Pending</option>
                        <option>Approved</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="p-4">PI No.</th>
                            <th className="p-4">Party Code</th>
                            <th className="p-4">Customer Name</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">City</th>
                            <th className="p-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredOrders?.map((order) => (
                            <tr
                                key={order._id}
                                onClick={() => onNavigate('detail', order)}
                                className="hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                <td className="p-4 font-semibold text-blue-600">{order.piNo || 'N/A'}</td>
                                <td className="p-4 text-xs font-bold text-indigo-600">{order.partyCode || '-'}</td>
                                <td className="p-4 text-sm font-medium text-slate-800">{order.name}</td>
                                <td className="p-4 text-sm text-slate-600">{formatDisplayDate(order.date)}</td>
                                <td className="p-4 text-sm text-slate-600">{order.city || '-'}</td>
                                <td className="p-4">
                                    <span
                                        className={`px-2 py-1 text-xs font-bold rounded-sm uppercase tracking-wide ${order.status === 'Approved'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                            }`}
                                    >
                                        {order.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ==========================================
// 2. DETAIL VIEW (With Split BOM Breakdown)
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
                        {order.status !== 'Approved' && (
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
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Line Items</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-slate-200 text-xs font-semibold text-slate-500">
                                <th className="p-3 w-12 text-center">#</th>
                                <th className="p-3">Rudra Code</th>
                                <th className="p-3">Party Item Code</th>
                                <th className="p-3">Finishing</th>
                                <th className="p-3">Color</th>
                                <th className="p-3">HSN/SAC</th>
                                <th className="p-3">Size</th>
                                <th className="p-3 text-right">Set (Qty)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {order.items?.map((item, index) => (
                                <tr key={item._id || item.id || index} className="hover:bg-slate-50">
                                    <td className="p-3 text-center text-slate-400 text-sm">{index + 1}</td>
                                    <td className="p-3 text-sm font-bold text-indigo-600">{item.rudraCode}</td>
                                    <td className="p-3 text-sm font-semibold text-slate-700">{item.partyCode || '-'}</td>
                                    <td className="p-3 text-sm text-slate-600">{item.finishing}</td>
                                    <td className="p-3 text-sm text-slate-600">{item.color}</td>
                                    <td className="p-3 text-sm text-slate-600">{item.hsnSac}</td>
                                    <td className="p-3 text-sm text-slate-600">{item.size}</td>
                                    <td className="p-3 text-sm font-bold text-slate-800 text-right">{item.qty}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showBOM && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left: In-House Factory Parts (Process Module) */}
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

                    {/* Right: After-Market Requirements (Inventory Module) */}
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
// 3. FORM VIEW (Code Auto-Complete + Quick-Add Modals)
// ==========================================
const INITIAL_ITEM = { id: '', rudraCode: '', partyCode: '', finishing: '', color: '', hsnSac: '', size: '', qty: '' };
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
                items: [{ ...INITIAL_ITEM, id: generateRowId() }]
            }
    );

    // Quick-Add Customer Modal State
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

    // Quick-Add Product (Rudra Code) Modal State
    const [productModal, setProductModal] = useState({
        open: false,
        rowId: null,
        rudraCode: '',
        name: '',
        size: '',
        finishing: ''
    });

    // Build combined Rudra Code suggestions from BOMs + Inventory
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

    // Auto-fill Customer Details when Party Code or Customer Name is selected
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

                // If Rudra Code is entered, auto-fill specs from BOM/Inventory & past client history
                if (field === 'rudraCode') {
                    const cleanCode = value.toUpperCase();
                    updated.rudraCode = cleanCode;
                    const spec = productSuggestions.find(p => p.code === cleanCode);
                    if (spec) {
                        if (!updated.size && spec.size) updated.size = spec.size;
                        if (!updated.finishing && spec.finishing) updated.finishing = spec.finishing;
                        if (!updated.hsnSac && spec.hsnSac) updated.hsnSac = spec.hsnSac;
                    }
                    // Look up client's historical party item code for this Rudra Code
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
        <div className="space-y-4 max-w-6xl mx-auto pb-12">
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

            {/* Order Header with Code-Based Customer Lookup & + Button */}
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

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
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
                </div>
            </div>

            {/* Line Items with Smart Rudra Code Suggestions & + Button */}
            <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Line Items</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-slate-200 text-xs font-semibold text-slate-500">
                                <th className="p-3 w-10 text-center">#</th>
                                <th className="p-3 w-48">Rudra Code (Factory)</th>
                                <th className="p-3">Party Item Code</th>
                                <th className="p-3">Finishing</th>
                                <th className="p-3">Color</th>
                                <th className="p-3">HSN/SAC</th>
                                <th className="p-3">Size</th>
                                <th className="p-3 w-28">Set (Qty)</th>
                                <th className="p-3 w-10 text-center">Act</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {formData.items.map((item, index) => {
                                const rowId = item._id || item.id;
                                return (
                                    <tr key={rowId} className="hover:bg-slate-50">
                                        <td className="p-3 text-center text-slate-400 text-sm font-medium">{index + 1}</td>
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
                                                    value={item[col] || ''}
                                                    onChange={(e) => handleItemChange(rowId, col, e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded-sm focus:outline-none"
                                                />
                                            </td>
                                        ))}
                                        <td className="p-3 text-center">
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
                                                className="p-1.5 text-slate-400 hover:text-red-500 rounded disabled:opacity-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
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
                        <Plus className="w-4 h-4" /> Add Row
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