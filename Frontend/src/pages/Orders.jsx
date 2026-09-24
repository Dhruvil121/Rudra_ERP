import { useState } from 'react';
import { Search, Plus, Edit2, Trash2, ArrowLeft, FileText, Check, X, Printer, CheckCircle, Package } from 'lucide-react';
import { PermissionGuard } from '../components/auth/PermissionGuard';
import { ACTIONS } from '../context/AuthContext';
import { useOrders, useSaveOrder } from '../hooks/useOrderData';
import { useCalculateOrderBOM } from '../hooks/useBOMData';
import { useFeedback } from '../context/FeedbackContext';
import { Loader2 } from 'lucide-react';

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
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="w-full">
            {view === 'list' && <OrderList orders={orders} onNavigate={handleNavigate} />}
            {view === 'detail' && <OrderDetail order={selectedOrder} onNavigate={handleNavigate} onApprove={saveMutation.mutateAsync} isApproving={saveMutation.isPending} />}
            {view === 'form' && <OrderForm order={selectedOrder} onNavigate={handleNavigate} onSave={saveMutation.mutate} />}
        </div>
    );
}

const formatDisplayDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
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
        const matchesSearch = !searchTerm || order.piNo?.toLowerCase().includes(searchTerm.toLowerCase()) || order.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All Status' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Orders (PI)</h1>
                    <p className="text-sm text-slate-500">Proforma Invoices <span className="text-slate-400 ml-1">{orders.length} total</span></p>
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
                            placeholder="Search PI No, Customer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-400 transition-colors"
                        />
                    </div>
                    <select 
                        className="py-1.5 px-3 text-sm bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-400"
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
                            <th className="p-4">Date</th>
                            <th className="p-4">Customer Name</th>
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
                                {/* Fallback to 'N/A' if the database record is missing a piNo */}
                                <td className="p-4 font-semibold text-blue-600">{order.piNo || 'N/A'}</td>
                                <td className="p-4 text-sm text-slate-600">
                                    {formatDisplayDate(order.date)}
                                </td>
                                <td className="p-4 text-sm font-medium text-slate-800">{order.name}</td>
                                <td className="p-4 text-sm text-slate-600">{order.city}</td>
                                <td className="p-4">
                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-sm uppercase tracking-wide">
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
// 2. DETAIL VIEW
// ==========================================
function OrderDetail({ order, onNavigate, onApprove, isApproving }) {
    const { showConfirm, showToast } = useFeedback();
    const [showBOM, setShowBOM] = useState(false);
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
            } catch (err) {
                showToast('Failed to approve order', 'error');
            }
        }
    };

    return (
        <div className="space-y-4 max-w-6xl mx-auto">
            <div className="flex justify-between items-center bg-white px-4 py-3 rounded-t-md border-b border-slate-200">
                <div className="flex items-center gap-2 text-sm">
                    <button onClick={() => onNavigate('list')} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="text-slate-400 cursor-pointer hover:text-slate-600" onClick={() => onNavigate('list')}>Orders</span>
                    <span className="text-slate-300">›</span>
                    {/* Fixed: Render order.piNo here */}
                    <span className="font-semibold text-slate-800">{order.piNo}</span>
                </div>

                <div className="flex items-center gap-2">
                    <PermissionGuard module="order" action={ACTIONS.PRINT}>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-sm hover:bg-slate-200 transition-colors">
                            <Printer className="w-3.5 h-3.5" /> Print
                        </button>
                    </PermissionGuard>

                    <button 
                        onClick={() => setShowBOM(!showBOM)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${showBOM ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
                    >
                        <Package className="w-3.5 h-3.5" /> {showBOM ? 'Hide BOM' : 'View BOM'}
                    </button>

                    <PermissionGuard module="order" action={ACTIONS.APPROVE}>
                        {order.status !== 'Approved' && (
                            <button 
                                onClick={handleApprove}
                                disabled={isApproving}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-sm hover:bg-green-200 transition-colors disabled:opacity-50"
                            >
                                {isApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} 
                                {isApproving ? 'Approving...' : 'Approve'}
                            </button>
                        )}
                    </PermissionGuard>

                    <PermissionGuard module="order" action={ACTIONS.EDIT}>
                        <button onClick={() => onNavigate('form', order)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white text-sm font-medium rounded-sm hover:bg-slate-700 transition-colors">
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
                                <th className="p-3">Party Code</th>
                                <th className="p-3">Finishing</th>
                                <th className="p-3">Color</th>
                                <th className="p-3">HSN/SAC</th>
                                <th className="p-3">Size</th>
                                <th className="p-3 text-right">Set (Qty)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {order.items.map((item, index) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 text-center text-slate-400 text-sm">{index + 1}</td>
                                    <td className="p-3 text-sm font-medium text-slate-800">{item.rudraCode}</td>
                                    <td className="p-3 text-sm text-slate-600">{item.partyCode}</td>
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
                <div className="bg-white rounded-sm border border-indigo-200 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-indigo-100 bg-indigo-50 flex justify-between items-center">
                        <h2 className="text-xs font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                            <Package className="w-4 h-4" /> Bill of Materials (Required)
                        </h2>
                    </div>
                    <div className="p-4">
                        {isBomLoading ? (
                            <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
                        ) : bomData && bomData.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                                            <th className="p-3">Material ID</th>
                                            <th className="p-3 text-right">Required Qty</th>
                                            <th className="p-3">Unit</th>
                                            <th className="p-3">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {bomData.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-3 text-sm text-slate-800 font-medium">{item.inventorySubItemId}</td>
                                                <td className="p-3 text-sm font-bold text-indigo-600 text-right">{item.requiredQuantity}</td>
                                                <td className="p-3 text-sm text-slate-600">{item.unit}</td>
                                                <td className="p-3 text-sm text-slate-500">{item.remarks || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 text-center py-4">No BOM found for the items in this order.</p>
                        )}
                    </div>
                </div>
            )}

            {order.remarks && (
                <div className="bg-white rounded-sm border border-slate-200 p-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Remarks / Notes</h3>
                    <p className="text-sm text-slate-700">{order.remarks}</p>
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
// 3. FORM VIEW
// ==========================================
const INITIAL_ITEM = { id: '', rudraCode: '', partyCode: '', finishing: '', color: '', hsnSac: '', size: '', qty: '' };

function OrderForm({ order, onNavigate, onSave }) {
    const isEditing = !!order;

    const getSafeInputDate = (dateString) => {
        if (!dateString) return new Date().toISOString().split('T')[0];
        try {
            return new Date(dateString).toISOString().split('T')[0];
        } catch (e) {
            return new Date().toISOString().split('T')[0];
        }
    };
    const [formData, setFormData] = useState(order ? {
        ...order,
        date: getSafeInputDate(order.date)
    } : {
        _id: '', piNo: '', name: '', partyCode: '', date: new Date().toISOString().split('T')[0],
        brandName: '', box: '', city: '', remarks: '',
        items: [{ ...INITIAL_ITEM, id: crypto.randomUUID() }]
    });
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
        }));
    };

    const addItemRow = () => {
        setFormData(prev => ({ ...prev, items: [...prev.items, { ...INITIAL_ITEM, id: crypto.randomUUID() }] }));
    };

    const removeItemRow = (id) => {
        if (formData.items.length === 1) return;
        setFormData(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
    };

    const handleSave = () => {
        onSave(formData);
        onNavigate('list');
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
                    <span className="font-semibold text-slate-800">{isEditing ? order.id : 'New Order (PI)'}</span>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => onNavigate(isEditing ? 'detail' : 'list', order)} className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-sm hover:bg-slate-50">
                        <X className="w-4 h-4" /> Cancel
                    </button>
                    <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-sm hover:bg-blue-700 shadow-sm">
                        <Check className="w-4 h-4" /> {isEditing ? 'Save Changes' : 'Create Order'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-sm border border-slate-200">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Order Header</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormInput label="Customer Name" name="name" value={formData.name} onChange={handleInputChange} />
                    <FormInput label="Code (PI No.)" name="piNo" value={formData.piNo} onChange={handleInputChange} placeholder="Auto-generated if blank" />
                    <FormInput label="Party Code" name="partyCode" value={formData.partyCode} onChange={handleInputChange} />
                    <FormInput label="Date" name="date" type="date" value={formData.date} onChange={handleInputChange} />
                    <FormInput label="Brand Name" name="brandName" value={formData.brandName} onChange={handleInputChange} />
                    <FormInput label="Box" name="box" value={formData.box} onChange={handleInputChange} />
                    <FormInput label="City" name="city" value={formData.city} onChange={handleInputChange} />
                </div>
            </div>

            <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Line Items</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-slate-200 text-xs font-semibold text-slate-500">
                                <th className="p-3 w-12 text-center">#</th>
                                <th className="p-3">Rudra Code</th>
                                <th className="p-3">Party Code</th>
                                <th className="p-3">Finishing</th>
                                <th className="p-3">Color</th>
                                <th className="p-3">HSN/SAC</th>
                                <th className="p-3">Size</th>
                                <th className="p-3">Set (Qty)</th>
                                <th className="p-3 w-12 text-center">Act</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {formData.items.map((item, index) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 text-center text-slate-400 text-sm font-medium">{index + 1}</td>
                                    {['rudraCode', 'partyCode', 'finishing', 'color', 'hsnSac', 'size', 'qty'].map(col => (
                                        <td key={col} className="p-2">
                                            <input
                                                type="text"
                                                value={item[col]}
                                                onChange={(e) => handleItemChange(item.id, col, e.target.value)}
                                                className="w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded-sm focus:outline-none focus:border-slate-400 transition-colors"
                                            />
                                        </td>
                                    ))}
                                    <td className="p-3 text-center">
                                        <button
                                            type="button"
                                            onClick={() => removeItemRow(item.id)}
                                            disabled={formData.items.length === 1}
                                            className="p-1.5 text-slate-400 hover:text-red-500 rounded disabled:opacity-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                    <button
                        type="button"
                        onClick={addItemRow}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-sm transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Add Row
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-sm border border-slate-200 p-6">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Remarks / Notes</label>
                <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-sm focus:outline-none focus:border-slate-400 resize-none"
                />
            </div>
        </div>
    );
}

const FormInput = ({ label, name, type = 'text', value, onChange, placeholder }) => (
    <div>
        <label className="text-sm font-medium text-slate-500 block mb-1.5">{label}</label>
        <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-sm focus:outline-none focus:border-slate-400 transition-colors"
        />
    </div>
);