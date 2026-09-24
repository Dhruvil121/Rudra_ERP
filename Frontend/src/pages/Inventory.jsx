import { useState } from 'react';
import { Search, Plus, Edit2, Trash2, ArrowLeft, Package, Check, X, Loader2, IndianRupee } from 'lucide-react';
import { PermissionGuard } from '../components/auth/PermissionGuard';
import { ACTIONS } from '../context/AuthContext';
import { useInventory, useSaveInventory, useDeleteInventory } from '../hooks/useInventoryData';
import { useFeedback } from '../context/FeedbackContext';

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

    const handleDelete = async (id, groupName) => {
        const isConfirmed = await showConfirm({
            title: 'Delete Inventory Group',
            message: `Are you sure you want to delete "${groupName}"?`,
            type: 'danger',
            confirmText: 'Delete'
        });

        if (isConfirmed) {
            try {
                await deleteMutation.mutateAsync(id);
                showToast('Inventory group deleted successfully', 'success');
                handleNavigate('list');
            } catch (err) {
                showToast('Failed to delete inventory group', 'error');
            }
        }
    };

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="w-full max-w-[1400px] mx-auto">
            {view === 'list' && <InventoryList groups={inventoryGroups} onNavigate={handleNavigate} />}
            {view === 'detail' && <InventoryDetail group={selectedGroup} onNavigate={handleNavigate} onDelete={handleDelete} />}
            {view === 'form' && <InventoryForm group={selectedGroup} onNavigate={handleNavigate} onSave={saveMutation.mutate} />}
        </div>
    );
}

// ==========================================
// 1. LIST VIEW
// ==========================================
function InventoryList({ groups, onNavigate }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredGroups = groups.filter(g =>
        g.groupName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.groupId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><Package className="w-6 h-6" /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Master Inventory</h1>
                        <p className="text-sm text-slate-500">Raw Materials, Finished Goods, & Consumables</p>
                    </div>
                </div>
                <PermissionGuard module="inventory" action={ACTIONS.ADD}>
                    <button onClick={() => onNavigate('form')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm">
                        <Plus className="w-4 h-4" /> New Group
                    </button>
                </PermissionGuard>
            </div>

            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex gap-4">
                <div className="relative w-96">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input type="text" placeholder="Search Group Name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredGroups.map(group => {
                    // Auto-calculate total group valuation
                    const groupValue = group.subItems?.reduce((total, item) => total + (Number(item.stock) * Number(item.unitCost || 0)), 0) || 0;

                    return (
                        <div key={group._id} onClick={() => onNavigate('detail', group)} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <Package className="w-5 h-5" />
                                </div>
                                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded uppercase tracking-wider">{group.groupId}</span>
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg mb-1 truncate">{group.groupName}</h3>
                            <p className="text-sm text-slate-500 mb-4">{group.subItems?.length || 0} Items linked</p>
                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Valuation</span>
                                <span className="text-sm font-bold text-indigo-600 flex items-center">
                                    <IndianRupee className="w-3 h-3 mr-0.5" />
                                    {groupValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ==========================================
// 2. DETAIL VIEW
// ==========================================
function InventoryDetail({ group, onNavigate, onDelete }) {
    if (!group) return null;
    const groupValue = group.subItems?.reduce((total, item) => total + (Number(item.stock) * Number(item.unitCost || 0)), 0) || 0;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 text-sm">
                    <button onClick={() => onNavigate('list')} className="text-slate-400 hover:text-slate-600"><ArrowLeft className="w-5 h-5" /></button>
                    <span className="text-slate-400 cursor-pointer" onClick={() => onNavigate('list')}>Master Inventory</span>
                    <span className="text-slate-300">›</span>
                    <span className="font-bold text-slate-800 text-lg">{group.groupName}</span>
                </div>
                <div className="flex items-center gap-3">
                    <PermissionGuard module="inventory" action={ACTIONS.EDIT}>
                        <button onClick={() => onNavigate('form', group)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700">
                            <Edit2 className="w-4 h-4" /> Edit
                        </button>
                    </PermissionGuard>
                    <PermissionGuard module="inventory" action={ACTIONS.DELETE}>
                        <button onClick={() => onDelete(group._id, group.groupName)} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100">
                            <Trash2 className="w-4 h-4" /> Delete
                        </button>
                    </PermissionGuard>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6 self-start">
                    <div className="w-16 h-16 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4"><Package className="w-8 h-8" /></div>
                    <InfoRow label="Group Name" value={group.groupName} />
                    <InfoRow label="Group ID Code" value={group.groupId} />
                    <InfoRow label="Total Valuation" value={`₹ ${groupValue.toLocaleString('en-IN')}`} isHighlight />
                    <InfoRow label="Description" value={group.details} />
                </div>

                <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Inventory Items ({group.subItems?.length || 0})</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <th className="p-4">SKU / Code</th>
                                    <th className="p-4">Item Details</th>
                                    <th className="p-4 text-center">Category</th>
                                    <th className="p-4 text-right">Unit Cost</th>
                                    <th className="p-4 text-right">In Stock</th>
                                    <th className="p-4 text-right">Total Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {group.subItems?.map((item) => {
                                    const value = Number(item.stock) * Number(item.unitCost || 0);
                                    return (
                                        <tr key={item._id} className="hover:bg-slate-50">
                                            <td className="p-4 font-bold text-indigo-600 text-sm">{item.itemCode || '-'}</td>
                                            <td className="p-4">
                                                <div className="text-sm font-bold text-slate-800">{item.name}</div>
                                                <div className="text-xs text-slate-500">{item.details}</div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${item.category === 'Raw Material' ? 'bg-orange-100 text-orange-700' : item.category === 'Finished Good' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                                    {item.category || 'Raw Material'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm font-semibold text-slate-600 text-right">₹{item.unitCost || 0}</td>
                                            <td className="p-4 text-sm font-bold text-slate-800 text-right">{item.stock} <span className="text-xs text-slate-400 font-medium">{item.uom}</span></td>
                                            <td className="p-4 text-sm font-bold text-indigo-600 text-right">₹{value.toLocaleString('en-IN')}</td>
                                        </tr>
                                    )
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
        <span className={`text-sm ${isHighlight ? 'font-bold text-indigo-600 text-xl' : 'font-semibold text-slate-800'}`}>{value || '-'}</span>
    </div>
);

// ==========================================
// 3. FORM VIEW
// ==========================================
const INITIAL_SUB_ITEM = { itemCode: '', name: '', category: 'Raw Material', details: '', stock: 0, uom: 'Pcs', unitCost: 0 };

function InventoryForm({ group, onNavigate, onSave }) {
    const isEditing = !!group;
    const [formData, setFormData] = useState(group || {
        _id: '', groupId: '', groupName: '', details: '',
        subItems: [{ ...INITIAL_SUB_ITEM, id: crypto.randomUUID() }]
    });

    const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSubItemChange = (id, field, value) => {
        setFormData(prev => ({ ...prev, subItems: prev.subItems.map(item => (item._id === id || item.id === id) ? { ...item, [field]: value } : item) }));
    };

    return (
        <div className="space-y-6 pb-24">
            <div className="flex justify-between items-center bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm sticky top-4 z-10">
                <div className="flex items-center gap-3 text-sm">
                    <button onClick={() => onNavigate(isEditing ? 'detail' : 'list', group)} className="text-slate-400 hover:text-slate-600"><ArrowLeft className="w-5 h-5" /></button>
                    <span className="text-slate-400">Inventory</span><span className="text-slate-300">›</span>
                    <span className="font-bold text-slate-800 text-lg">{isEditing ? group.groupName : 'New Master Group'}</span>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => onNavigate(isEditing ? 'detail' : 'list', group)} className="px-6 py-2 bg-white border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-50">Cancel</button>
                    <button onClick={() => { onSave(formData); onNavigate('list'); }} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-sm">Save Group</button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormInput label="Group Name (e.g., Fasteners, Handles)" name="groupName" value={formData.groupName} onChange={handleInputChange} required />
                <FormInput label="Group Code ID" name="groupId" value={formData.groupId} onChange={handleInputChange} placeholder="Auto-generated if blank" />
                <div className="md:col-span-2">
                    <label className="text-sm font-bold text-slate-600 block mb-2">Description</label>
                    <input type="text" name="details" value={formData.details} onChange={handleInputChange} className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Item Master Data</h2>
                    <button type="button" onClick={() => setFormData(p => ({ ...p, subItems: [...p.subItems, { ...INITIAL_SUB_ITEM, id: crypto.randomUUID() }] }))} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                        <Plus className="w-4 h-4" /> Add Item
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <th className="p-4 w-40">Item Code (SKU)</th>
                                <th className="p-4 w-64">Item Name & Specs</th>
                                <th className="p-4 w-40">Category</th>
                                <th className="p-4 w-32">UOM</th>
                                <th className="p-4 w-32">Unit Cost (₹)</th>
                                <th className="p-4 w-32">Opening Stock</th>
                                <th className="p-4 w-12 text-center">Act</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {formData.subItems.map((item) => {
                                const rowId = item._id || item.id;
                                return (
                                    <tr key={rowId} className="hover:bg-slate-50">
                                        <td className="p-2"><input type="text" value={item.itemCode} onChange={(e) => handleSubItemChange(rowId, 'itemCode', e.target.value)} placeholder="e.g. RM-001" className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 uppercase font-bold" /></td>
                                        <td className="p-2">
                                            <input type="text" value={item.name} onChange={(e) => handleSubItemChange(rowId, 'name', e.target.value)} placeholder="Name" className="w-full px-3 py-2 text-sm border rounded-t-lg outline-none focus:ring-1 focus:ring-indigo-500 font-semibold mb-1" />
                                            <input type="text" value={item.details} onChange={(e) => handleSubItemChange(rowId, 'details', e.target.value)} placeholder="Specs/Dimensions" className="w-full px-3 py-1.5 text-xs bg-slate-50 border rounded-b-lg outline-none focus:ring-1 focus:ring-indigo-500" />
                                        </td>
                                        <td className="p-2">
                                            <select value={item.category} onChange={(e) => handleSubItemChange(rowId, 'category', e.target.value)} className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-white font-medium">
                                                <option>Raw Material</option><option>Finished Good</option><option>Consumable</option><option>Component</option>
                                            </select>
                                        </td>
                                        <td className="p-2">
                                            <select value={item.uom} onChange={(e) => handleSubItemChange(rowId, 'uom', e.target.value)} className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-white font-medium">
                                                <option>Pcs</option><option>Kg</option><option>Mtrs</option><option>Ltrs</option><option>Box</option>
                                            </select>
                                        </td>
                                        <td className="p-2"><input type="number" step="0.01" value={item.unitCost} onChange={(e) => handleSubItemChange(rowId, 'unitCost', Number(e.target.value))} className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-slate-700" /></td>
                                        <td className="p-2"><input type="number" value={item.stock} onChange={(e) => handleSubItemChange(rowId, 'stock', Number(e.target.value))} className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-slate-700" /></td>
                                        <td className="p-3 text-center">
                                            <button type="button" onClick={() => setFormData(p => ({ ...p, subItems: p.subItems.filter(i => (i._id !== rowId && i.id !== rowId)) }))} disabled={formData.subItems.length === 1} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
        <label className="text-sm font-bold text-slate-600 block mb-2">{label} {required && <span className="text-red-500">*</span>}</label>
        <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required} className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
    </div>
);