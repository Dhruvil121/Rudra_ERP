import { useState } from 'react';
import { Search, Plus, Edit2, Trash2, ArrowLeft, Package, Check, X, Loader2 } from 'lucide-react';
import { PermissionGuard } from '../components/auth/PermissionGuard';
import { ACTIONS } from '../context/AuthContext';
import { useInventory, useSaveInventory, useDeleteInventory } from '../hooks/useInventoryData';

export default function InventoryModule() {
    const [view, setView] = useState('list'); // 'list' | 'detail' | 'form'
    const [selectedGroup, setSelectedGroup] = useState(null);

    // Live Database Hooks
    const { data: inventoryGroups = [], isLoading } = useInventory();
    const saveMutation = useSaveInventory();
    const deleteMutation = useDeleteInventory();

    const handleNavigate = (newView, group = null) => {
        setSelectedGroup(group);
        setView(newView);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this inventory group?")) {
            await deleteMutation.mutateAsync(id);
            handleNavigate('list');
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="w-full">
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
        <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Inventory Management</h1>
                    <p className="text-sm text-slate-500">Item Groups & Stock <span className="text-slate-400 ml-1">{groups.length} groups</span></p>
                </div>
                <PermissionGuard module="inventory" action={ACTIONS.ADD}>
                    <button
                        onClick={() => onNavigate('form')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> New Group
                    </button>
                </PermissionGuard>
            </div>

            <div className="flex justify-between items-center bg-white p-3 rounded-md shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-72">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search Group Name, ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-400"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
                {filteredGroups.map(group => (
                    <div
                        key={group._id}
                        onClick={() => onNavigate('detail', group)}
                        className="bg-white p-4 rounded-md shadow-sm border border-slate-100 flex gap-4 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all"
                    >
                        <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center shrink-0 text-blue-500">
                            <Package className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col gap-1 overflow-hidden w-full">
                            <h3 className="font-semibold text-slate-800 text-sm truncate">{group.groupName}</h3>
                            <p className="text-xs text-slate-500">{group.subItems?.length || 0} Sub-items</p>
                            <div className="flex items-center justify-between mt-1 w-full">
                                <span className="px-2 py-0.5 bg-slate-800 text-white text-[10px] font-bold rounded-sm uppercase tracking-wide">
                                    {group.groupId}
                                </span>
                                <span className="text-xs font-bold text-slate-700">{group.stockGv}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ==========================================
// 2. DETAIL VIEW
// ==========================================
function InventoryDetail({ group, onNavigate, onDelete }) {
    if (!group) return null;

    return (
        <div className="space-y-4 max-w-5xl mx-auto">
            <div className="flex justify-between items-center bg-white px-4 py-3 rounded-t-md border-b border-slate-200">
                <div className="flex items-center gap-2 text-sm">
                    <button onClick={() => onNavigate('list')} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="text-slate-400 cursor-pointer" onClick={() => onNavigate('list')}>Inventory</span>
                    <span className="text-slate-300">›</span>
                    <span className="font-semibold text-slate-800">{group.groupName}</span>
                </div>

                <div className="flex items-center gap-2">
                    <PermissionGuard module="inventory" action={ACTIONS.EDIT}>
                        <button onClick={() => onNavigate('form', group)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white text-sm font-medium rounded-sm hover:bg-slate-700">
                            <Edit2 className="w-3.5 h-3.5" /> Edit Group
                        </button>
                    </PermissionGuard>
                    <PermissionGuard module="inventory" action={ACTIONS.DELETE}>
                        <button onClick={() => onDelete(group._id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-sm font-medium rounded-sm hover:bg-red-600 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                    </PermissionGuard>
                </div>
            </div>

            <div className="bg-white rounded-sm border border-slate-200 flex p-6 gap-8">
                <div className="w-16 h-16 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 text-blue-500">
                    <Package className="w-8 h-8" />
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4">
                    <InfoRow label="Group Name (Particular)" value={group.groupName} />
                    <InfoRow label="Group ID Code" value={group.groupId} />
                    <InfoRow label="Description" value={group.details} />
                    <InfoRow label="Total Stock GV" value={group.stockGv} />
                </div>
            </div>

            <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sub-Items ({group.subItems?.length || 0})</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-slate-200 text-xs font-semibold text-slate-500">
                                <th className="p-4 w-12 text-center">#</th>
                                <th className="p-4">Item Name</th>
                                <th className="p-4">Details / Specifications</th>
                                <th className="p-4 text-right">Current Stock</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {group.subItems?.map((item, index) => (
                                <tr key={item._id || index} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-center text-slate-400 text-sm font-medium">{index + 1}</td>
                                    <td className="p-4 text-sm font-semibold text-slate-800">{item.name}</td>
                                    <td className="p-4 text-sm text-slate-600">{item.details}</td>
                                    <td className="p-4 text-sm font-bold text-slate-800 text-right">{item.stock} Units</td>
                                </tr>
                            ))}
                            {(!group.subItems || group.subItems.length === 0) && (
                                <tr><td colSpan="4" className="p-8 text-center text-sm text-slate-400">No sub-items found in this group.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const InfoRow = ({ label, value }) => (
    <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-sm font-semibold text-slate-800">{value || '-'}</span>
    </div>
);

// ==========================================
// 3. FORM VIEW
// ==========================================
const INITIAL_SUB_ITEM = { name: '', details: '', stock: 0 };

function InventoryForm({ group, onNavigate, onSave }) {
    const isEditing = !!group;

    const [formData, setFormData] = useState(group || {
        _id: '', groupId: '', groupName: '', details: '', stockGv: '₹ 0',
        subItems: [{ ...INITIAL_SUB_ITEM, id: crypto.randomUUID() }]
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubItemChange = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            subItems: prev.subItems.map(item => (item._id === id || item.id === id) ? { ...item, [field]: value } : item)
        }));
    };

    const addSubItem = () => {
        setFormData(prev => ({ ...prev, subItems: [...prev.subItems, { ...INITIAL_SUB_ITEM, id: crypto.randomUUID() }] }));
    };

    const removeSubItem = (id) => {
        setFormData(prev => ({ ...prev, subItems: prev.subItems.filter(item => (item._id !== id && item.id !== id)) }));
    };

    const handleSave = () => {
        onSave(formData);
        onNavigate('list');
    };

    return (
        <div className="space-y-4 max-w-5xl mx-auto pb-12">
            <div className="flex justify-between items-center bg-white px-4 py-3 rounded-t-md border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-2 text-sm">
                    <button onClick={() => onNavigate(isEditing ? 'detail' : 'list', group)} className="text-slate-400 hover:text-slate-600">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="text-slate-400">Inventory</span>
                    <span className="text-slate-300">›</span>
                    <span className="font-semibold text-slate-800">{isEditing ? group.groupName : 'New Group'}</span>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => onNavigate(isEditing ? 'detail' : 'list', group)} className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-sm hover:bg-slate-50">
                        <X className="w-4 h-4" /> Cancel
                    </button>
                    <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-sm hover:bg-blue-700 shadow-sm">
                        <Check className="w-4 h-4" /> {isEditing ? 'Save Changes' : 'Create Group'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-sm border border-slate-200">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Group Information</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput label="Group Name (Particular)" name="groupName" value={formData.groupName} onChange={handleInputChange} required />
                    <FormInput label="Group Code ID" name="groupId" value={formData.groupId} onChange={handleInputChange} placeholder="Auto-generated if blank" />
                    <div className="md:col-span-2">
                        <label className="text-sm font-medium text-slate-500 block mb-1.5">Description / Note</label>
                        <input type="text" name="details" value={formData.details} onChange={handleInputChange} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-sm focus:outline-none focus:border-slate-400" />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sub-Items List</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-slate-200 text-xs font-semibold text-slate-500">
                                <th className="p-3 w-12 text-center">#</th>
                                <th className="p-3">Item Name *</th>
                                <th className="p-3">Details / Specifications</th>
                                <th className="p-3 w-32">Opening Stock</th>
                                <th className="p-3 w-12 text-center">Act</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {formData.subItems.map((item, index) => {
                                const rowId = item._id || item.id;
                                return (
                                    <tr key={rowId} className="hover:bg-slate-50">
                                        <td className="p-3 text-center text-slate-400 text-sm font-medium">{index + 1}</td>
                                        <td className="p-2">
                                            <input type="text" value={item.name} onChange={(e) => handleSubItemChange(rowId, 'name', e.target.value)} className="w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded-sm focus:outline-none focus:border-slate-400" />
                                        </td>
                                        <td className="p-2">
                                            <input type="text" value={item.details} onChange={(e) => handleSubItemChange(rowId, 'details', e.target.value)} className="w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded-sm focus:outline-none focus:border-slate-400" />
                                        </td>
                                        <td className="p-2">
                                            <input type="number" value={item.stock} onChange={(e) => handleSubItemChange(rowId, 'stock', e.target.value)} className="w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded-sm focus:outline-none focus:border-slate-400" />
                                        </td>
                                        <td className="p-3 text-center">
                                            <button type="button" onClick={() => removeSubItem(rowId)} className="p-1.5 text-slate-400 hover:text-red-500 rounded">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                    <button type="button" onClick={addSubItem} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-sm transition-colors">
                        <Plus className="w-4 h-4" /> Add Item
                    </button>
                </div>
            </div>
        </div>
    );
}

const FormInput = ({ label, name, type = 'text', value, onChange, placeholder, required }) => (
    <div>
        <label className="text-sm font-medium text-slate-500 block mb-1.5">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-sm focus:outline-none focus:border-slate-400 transition-colors" />
    </div>
);