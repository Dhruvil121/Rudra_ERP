import { useState, useEffect } from 'react';
import { SubModuleLayout } from "../layout/SubModuleLayout"
import { FormInput, FormSelect } from '../components/forms/FormInputs';
import { useCustomerSearch } from '../hooks/useCustomerData';
import { Search, Loader2, Plus, Check, X } from 'lucide-react';

const INITIAL_FORM_STATE = {
    firmName: '',
    brandName: '',
    personalName: '',
    mobileNo: '',
    email: '',
    gstNo: '',
    address: '',
    city: '',
    state: '',
    group: '',
};

const STATE_OPTIONS = [
    { value: 'gujarat', label: 'Gujarat' },
    { value: 'maharashtra', label: 'Maharashtra' },
    { value: 'rajasthan', label: 'Rajasthan' },
    { value: 'karnataka', label: 'Karnataka' },
    { value: 'delhi', label: 'Delhi' },
];

export default function CustomerModule() {
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [searchCode, setSearchCode] = useState('');
    const [triggerSearch, setTriggerSearch] = useState(false);

    // Dynamic Group State
    const [groups, setGroups] = useState([
        { value: 'sundry_debtors', label: 'Sundry Debtors' },
        { value: 'sundry_creditors', label: 'Sundry Creditors' },
        { value: 'retail_clients', label: 'Retail Clients' }
    ]);
    const [isAddingGroup, setIsAddingGroup] = useState(false);
    const [newGroup, setNewGroup] = useState('');

    const { data: customerData, isLoading, isError, error } = useCustomerSearch(searchCode, triggerSearch);

    useEffect(() => {
        if (customerData) {
            setFormData(customerData);
            setTriggerSearch(false);
        }
    }, [customerData]);

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

    const handleAddGroup = (e) => {
        e.preventDefault(); // Prevent form submission if triggered by Enter key
        if (newGroup.trim() === '') return;

        const groupValue = newGroup.toLowerCase().replace(/\s+/g, '_');

        // Add to options and auto-select it
        setGroups(prev => [...prev, { value: groupValue, label: newGroup }]);
        setFormData(prev => ({ ...prev, group: groupValue }));

        setNewGroup('');
        setIsAddingGroup(false);
    };

    const handleSave = (e) => {
        e.preventDefault();
        console.log('Saving customer payload:', { code: searchCode, ...formData });
    };

    return (
        <>
            <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8">

                {/* TOP ROW */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 pb-6 border-b border-slate-100">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                        <FormInput label="Firm Name" name="firmName" value={formData.firmName} onChange={handleInputChange} />
                        <FormInput label="Brand Name" name="brandName" value={formData.brandName} onChange={handleInputChange} />
                    </div>

                    <div className="w-full md:w-64">
                        <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Customer Code</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Enter code & press Enter"
                                className={`w-full pl-10 pr-4 py-2.5 bg-purple-50 border-2 rounded-xl focus:outline-none focus:ring-0 transition-all ${isError ? 'border-red-400' : 'border-purple-200 focus:border-purple-500'}`}
                                value={searchCode}
                                onChange={(e) => {
                                    setSearchCode(e.target.value);
                                    setTriggerSearch(false);
                                }}
                                onKeyDown={handleCodeKeyDown}
                            />
                            <div className="absolute left-3 top-3 text-purple-500">
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                            </div>
                        </div>
                        {isError && <span className="text-xs text-red-500 mt-1 block">{error.message}</span>}
                    </div>
                </div>

                {/* MAIN FORM GRID */}
                <form onSubmit={handleSave}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">

                        {/* Left Column */}
                        <div>
                            <FormInput label="Personal Name" name="personalName" value={formData.personalName} onChange={handleInputChange} />
                            <FormInput label="Mobile No" name="mobileNo" value={formData.mobileNo} onChange={handleInputChange} type="tel" />
                            <FormInput label="Email" name="email" value={formData.email} onChange={handleInputChange} type="email" />
                            <FormInput label="GST NO." name="gstNo" value={formData.gstNo} onChange={handleInputChange} className="uppercase" placeholder="24AAAAA1234A1Z5" />
                        </div>

                        {/* Right Column */}
                        <div>
                            <div className="flex flex-col gap-1.5 mb-4">
                                <label className="text-sm font-semibold text-slate-700">Address / Area</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none w-full"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormInput label="City" name="city" value={formData.city} onChange={handleInputChange} />
                                <FormSelect label="State" name="state" value={formData.state} onChange={handleInputChange} options={STATE_OPTIONS} />
                            </div>

                            {/* Dynamic Group Selector */}
                            <div className="flex flex-col gap-1.5 mb-4">
                                <label className="text-sm font-semibold text-slate-700">Group</label>
                                <div className="flex gap-2">
                                    {!isAddingGroup ? (
                                        <>
                                            <select
                                                name="group"
                                                value={formData.group}
                                                onChange={handleInputChange}
                                                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                            >
                                                <option value="">Select...</option>
                                                {groups.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                                            </select>

                                            {/* Wrap this button in your role-based condition later */}
                                            <button
                                                type="button"
                                                onClick={() => setIsAddingGroup(true)}
                                                className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors flex items-center justify-center"
                                                title="Create New Group"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <input
                                                type="text"
                                                value={newGroup}
                                                onChange={(e) => setNewGroup(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddGroup(e)}
                                                placeholder="Enter new group name..."
                                                className="flex-1 px-3 py-2 bg-slate-50 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddGroup}
                                                className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                                                title="Save Group"
                                            >
                                                <Check className="w-5 h-5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setIsAddingGroup(false); setNewGroup(''); }}
                                                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                                title="Cancel"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => { setFormData(INITIAL_FORM_STATE); setSearchCode(''); }}
                            className="px-6 py-2.5 rounded-lg font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                            Clear
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 rounded-lg font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-sm"
                        >
                            Save Customer
                        </button>
                    </div>
                </form>

            </div>
        </>
    );
}