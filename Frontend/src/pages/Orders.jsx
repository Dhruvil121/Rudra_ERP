import { useState, useEffect } from 'react';
import { SubModuleLayout } from '../layout/SubModuleLayout';
import { FormInput } from '../components/forms/FormInputs';
import { useOrderSearch } from '../hooks/useOrderData';
import { Search, Loader2, Plus, Trash2 } from 'lucide-react';

const INITIAL_ITEM = { id: '', rudraCode: '', partyCode: '', finishing: '', color: '', hsnSac: '', size: '', qty: '' };

const INITIAL_FORM_STATE = {
    name: '',
    partyCode: '',
    date: new Date().toISOString().split('T')[0], // Defaults to today
    brandName: '',
    box: '',
    city: '',
    remarks: '',
    items: [{ ...INITIAL_ITEM, id: crypto.randomUUID() }], // Start with one empty row
};

export default function OrderModule() {
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [searchCode, setSearchCode] = useState('');
    const [triggerSearch, setTriggerSearch] = useState(false);

    const { data: orderData, isLoading, isError, error } = useOrderSearch(searchCode, triggerSearch);

    // Auto-populate form on successful fetch
    useEffect(() => {
        if (orderData) {
            setFormData({ ...INITIAL_FORM_STATE, ...orderData });
            setTriggerSearch(false);
        }
    }, [orderData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleCodeKeyDown = (e) => {
        if (e.key === 'Enter' && searchCode.trim() !== '') {
            e.preventDefault();
            setTriggerSearch(true);
        }
    };

    // --- Dynamic Table Logic ---
    const handleItemChange = (id, field, value) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
        }));
    };

    const addItemRow = () => {
        setFormData((prev) => ({
            ...prev,
            items: [...prev.items, { ...INITIAL_ITEM, id: crypto.randomUUID() }],
        }));
    };

    const removeItemRow = (id) => {
        if (formData.items.length === 1) return; // Keep at least one row
        setFormData((prev) => ({
            ...prev,
            items: prev.items.filter((item) => item.id !== id),
        }));
    };

    const handleSave = (e) => {
        e.preventDefault();
        console.log('Saving PI payload:', { code: searchCode, ...formData });
    };

    return (
        <>
            <form onSubmit={handleSave} className="max-w-7xl mx-auto space-y-6">

                {/* HEADER SECTION */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                        <FormInput label="Name" name="name" value={formData.name} onChange={handleInputChange} />

                        {/* Searchable Code Field */}
                        <div>
                            <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Code (PI No.)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Enter PI & press Enter"
                                    className={`w-full pl-10 pr-4 py-2 bg-blue-50 border-2 rounded-lg focus:outline-none focus:ring-0 transition-all ${isError ? 'border-red-400' : 'border-blue-200 focus:border-blue-500'}`}
                                    value={searchCode}
                                    onChange={(e) => { setSearchCode(e.target.value); setTriggerSearch(false); }}
                                    onKeyDown={handleCodeKeyDown}
                                />
                                <div className="absolute left-3 top-2.5 text-blue-500">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                </div>
                            </div>
                            {isError && <span className="text-xs text-red-500 mt-1 block">{error.message}</span>}
                        </div>

                        <FormInput label="Party Code" name="partyCode" value={formData.partyCode} onChange={handleInputChange} />
                        <FormInput label="Date" name="date" type="date" value={formData.date} onChange={handleInputChange} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                        <FormInput label="Brand Name" name="brandName" value={formData.brandName} onChange={handleInputChange} />
                        <FormInput label="Box" name="box" value={formData.box} onChange={handleInputChange} />
                        <FormInput label="City" name="city" value={formData.city} onChange={handleInputChange} />
                    </div>
                </div>

                {/* ITEMS TABLE SECTION */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-700">
                                    <th className="p-4 w-12 text-center">#</th>
                                    <th className="p-4 min-w-[120px]">Rudra Code</th>
                                    <th className="p-4 min-w-[120px]">Party Code</th>
                                    <th className="p-4 min-w-[120px]">Finishing</th>
                                    <th className="p-4 min-w-[120px]">Color</th>
                                    <th className="p-4 min-w-[120px]">HSN/SAC Code</th>
                                    <th className="p-4 min-w-[100px]">Size</th>
                                    <th className="p-4 min-w-[100px]">Set (Qty)</th>
                                    <th className="p-4 w-16 text-center">Act</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {formData.items.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-4 text-center text-slate-400 font-medium">{index + 1}</td>
                                        {[
                                            { key: 'rudraCode', placeholder: 'R-000' },
                                            { key: 'partyCode', placeholder: 'P-000' },
                                            { key: 'finishing', placeholder: 'Finishing' },
                                            { key: 'color', placeholder: 'Color' },
                                            { key: 'hsnSac', placeholder: 'HSN' },
                                            { key: 'size', placeholder: 'Size' },
                                            { key: 'qty', placeholder: '0' },
                                        ].map((col) => (
                                            <td key={col.key} className="p-2">
                                                <input
                                                    type="text"
                                                    value={item[col.key]}
                                                    placeholder={col.placeholder}
                                                    onChange={(e) => handleItemChange(item.id, col.key, e.target.value)}
                                                    // This input class removes borders until focused, keeping the table clean
                                                    className="w-full px-2 py-1.5 bg-transparent border border-transparent rounded focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                />
                                            </td>
                                        ))}
                                        <td className="p-4 text-center">
                                            <button
                                                type="button"
                                                onClick={() => removeItemRow(item.id)}
                                                disabled={formData.items.length === 1}
                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                        <button
                            type="button"
                            onClick={addItemRow}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add Row
                        </button>
                    </div>
                </div>

                {/* BOTTOM SECTION */}
                < div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col md:flex-row gap-8 items-end" >
                    <div className="flex-1 w-full">
                        <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Remarks / Notes</label>
                        <textarea
                            name="remarks"
                            value={formData.remarks}
                            onChange={handleInputChange}
                            rows={2}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all"
                            placeholder="Enter any additional order notes here..."
                        />
                    </div>

                    <div className="flex gap-4 w-full md:w-auto shrink-0">
                        <button
                            type="button"
                            onClick={() => { setFormData(INITIAL_FORM_STATE); setSearchCode(''); }}
                            className="px-6 py-3 rounded-lg font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors w-full md:w-auto"
                        >
                            Clear
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm w-full md:w-auto"
                        >
                            Save Order (PI)
                        </button>
                    </div>
                </div >

            </form >
        </ >
    );
}