import { useState } from 'react';
import { Search, Plus, Edit2, Trash2, ArrowLeft, Check, X, FileJson, Loader2 } from 'lucide-react';
import { PermissionGuard } from '../components/auth/PermissionGuard';
import { ACTIONS } from '../context/AuthContext';
import { useBOMs, useSaveBOM, useDeleteBOM } from '../hooks/useBOMMasterData';
import { useInventory } from '../hooks/useInventoryData';

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
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="w-full">
            {view === 'list' && <BOMList boms={boms} onNavigate={handleNavigate} onDelete={deleteMutation.mutateAsync} />}
            {view === 'form' && <BOMForm initialData={selectedBOM} onNavigate={handleNavigate} onSave={saveMutation.mutateAsync} />}
        </div>
    );
}

// ==========================================
// 1. LIST VIEW
// ==========================================
function BOMList({ boms, onNavigate, onDelete }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredBOMs = boms.filter(b => b.finishedItemCode?.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-4 max-w-6xl mx-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><FileJson className="w-6 h-6" /></div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Bill of Materials (BOM)</h1>
                        <p className="text-sm text-slate-500">Master Product Recipes</p>
                    </div>
                </div>
                <PermissionGuard module="inventory" action={ACTIONS.ADD}>
                    <button onClick={() => onNavigate('form')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700">
                        <Plus className="w-4 h-4" /> Create Recipe
                    </button>
                </PermissionGuard>
            </div>

            <div className="bg-white p-3 rounded-md shadow-sm border border-slate-100 flex gap-4">
                <div className="relative w-72">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search Finished Item Code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-blue-400"
                    />
                </div>
            </div>

            <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="p-4">Finished Item Code</th>
                            <th className="p-4 text-center">Total Components</th>
                            <th className="p-4">Version</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredBOMs.map((bom) => (
                            <tr key={bom._id} className="hover:bg-slate-50">
                                <td className="p-4 font-bold text-indigo-600">{bom.finishedItemCode}</td>
                                <td className="p-4 text-sm text-center text-slate-600 font-medium">{bom.components?.length || 0} Materials</td>
                                <td className="p-4 text-sm text-slate-600">v{bom.version}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 text-xs font-bold rounded-sm uppercase ${bom.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {bom.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="p-4 flex justify-end gap-2">
                                    <PermissionGuard module="inventory" action={ACTIONS.EDIT}>
                                        <button onClick={() => onNavigate('form', bom)} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                                    </PermissionGuard>
                                    <PermissionGuard module="inventory" action={ACTIONS.DELETE}>
                                        <button onClick={() => { if (window.confirm('Delete this BOM?')) onDelete(bom._id); }} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                    </PermissionGuard>
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
// 2. FORM VIEW
// ==========================================
const INITIAL_COMP = { id: '', inventoryGroupId: '', inventorySubItemId: '', quantity: 1, unit: 'Pcs', remarks: '' };

function BOMForm({ initialData, onNavigate, onSave }) {
    const isEditing = !!initialData;
    const { data: inventory = [] } = useInventory();

    const [formData, setFormData] = useState(initialData || {
        finishedItemCode: '', version: '1.0', isActive: true,
        components: [{ ...INITIAL_COMP, id: crypto.randomUUID() }]
    });

    const handleCompChange = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            components: prev.components.map(comp => (comp._id === id || comp.id === id) ? { ...comp, [field]: value } : comp)
        }));
    };

    const addComponent = () => {
        setFormData(prev => ({ ...prev, components: [...prev.components, { ...INITIAL_COMP, id: crypto.randomUUID() }] }));
    };

    const handleSave = async () => {
        try {
            await onSave(formData);
            onNavigate('list');
        } catch (error) {
            alert(error.message || "Failed to save BOM");
        }
    };

    return (
        <div className="space-y-4 max-w-6xl mx-auto pb-12">
            <div className="flex justify-between items-center bg-white px-4 py-3 rounded-t-md border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-2 text-sm">
                    <button onClick={() => onNavigate('list')} className="text-slate-400 hover:text-slate-600"><ArrowLeft className="w-4 h-4" /></button>
                    <span className="text-slate-400">Master Data</span><span className="text-slate-300">›</span>
                    <span className="font-semibold text-slate-800">{isEditing ? formData.finishedItemCode : 'New BOM Recipe'}</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => onNavigate('list')} className="flex items-center gap-1.5 px-4 py-1.5 bg-white border text-slate-600 text-sm font-medium rounded-sm hover:bg-slate-50"><X className="w-4 h-4" /> Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-sm hover:bg-indigo-700"><Check className="w-4 h-4" /> Save Recipe</button>
                </div>
            </div>

            <div className="bg-white rounded-sm border border-slate-200 p-6 grid grid-cols-3 gap-6">
                <div>
                    <label className="text-sm font-medium text-slate-500 block mb-1.5">Finished Product Code (Rudra Code)</label>
                    <input type="text" value={formData.finishedItemCode} onChange={(e) => setFormData(p => ({ ...p, finishedItemCode: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-sm focus:border-indigo-400 outline-none uppercase font-bold" placeholder="e.g. R-001" />
                </div>
                <div>
                    <label className="text-sm font-medium text-slate-500 block mb-1.5">Version</label>
                    <input type="text" value={formData.version} onChange={(e) => setFormData(p => ({ ...p, version: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-sm focus:border-indigo-400 outline-none" />
                </div>
                <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData(p => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 text-indigo-600 rounded" /> Recipe is Active
                    </label>
                </div>
            </div>

            <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Raw Materials Required for 1 Unit</h2>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-white border-b border-slate-200 text-xs text-slate-500">
                        <tr>
                            <th className="p-3">Raw Material (From Inventory)</th>
                            <th className="p-3 w-32">Qty Needed</th>
                            <th className="p-3 w-32">Unit</th>
                            <th className="p-3">Remarks</th>
                            <th className="p-3 w-12 text-center">Act</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {formData.components.map((comp) => {
                            const rowId = comp._id || comp.id;
                            // Extract all subItems into a flat list for easy selection
                            const allSubItems = inventory.flatMap(group =>
                                group.subItems?.map(sub => ({ ...sub, groupName: group.groupName, groupId: group._id })) || []
                            );

                            return (
                                <tr key={rowId} className="hover:bg-slate-50">
                                    <td className="p-2">
                                        <select
                                            value={comp.inventorySubItemId}
                                            onChange={(e) => {
                                                const selected = allSubItems.find(i => i._id === e.target.value);
                                                if (selected) {
                                                    handleCompChange(rowId, 'inventorySubItemId', selected._id);
                                                    handleCompChange(rowId, 'inventoryGroupId', selected.groupId);
                                                }
                                            }}
                                            className="w-full px-2 py-1.5 text-sm border rounded-sm outline-none bg-white"
                                        >
                                            <option value="">Select Material...</option>
                                            {inventory.map(group => (
                                                <optgroup key={group._id} label={group.groupName}>
                                                    {group.subItems?.map(sub => (
                                                        <option key={sub._id} value={sub._id}>{sub.name} (Stock: {sub.stock})</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-2"><input type="number" step="0.01" value={comp.quantity} onChange={(e) => handleCompChange(rowId, 'quantity', Number(e.target.value))} className="w-full px-2 py-1.5 text-sm border rounded-sm outline-none" /></td>
                                    <td className="p-2">
                                        <select value={comp.unit} onChange={(e) => handleCompChange(rowId, 'unit', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-sm outline-none bg-white">
                                            <option value="Pcs">Pcs</option><option value="Kg">Kg</option><option value="Mtrs">Mtrs</option>
                                        </select>
                                    </td>
                                    <td className="p-2"><input type="text" value={comp.remarks} onChange={(e) => handleCompChange(rowId, 'remarks', e.target.value)} placeholder="e.g. Include 5% scrap buffer" className="w-full px-2 py-1.5 text-sm border rounded-sm outline-none" /></td>
                                    <td className="p-2 text-center">
                                        <button onClick={() => setFormData(p => ({ ...p, components: p.components.filter(c => (c._id !== rowId && c.id !== rowId)) }))} disabled={formData.components.length === 1} className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <div className="p-3 bg-slate-50 border-t border-slate-100">
                    <button onClick={addComponent} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-sm"><Plus className="w-4 h-4" /> Add Material</button>
                </div>
            </div>
        </div>
    );
}