import { useState } from 'react';
import { Search, Plus, Edit2, Trash2, ArrowLeft, Building2, Check, X, Loader2 } from 'lucide-react';
import { PermissionGuard } from '../components/auth/PermissionGuard';
import { ACTIONS } from '../context/AuthContext';
import { useCustomerList, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '../hooks/useCustomerData';

export default function CustomerModule() {
    const [view, setView] = useState('list'); // 'list' | 'detail' | 'form'
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const handleNavigate = (newView, customer = null) => {
        setSelectedCustomer(customer);
        setView(newView);
    };

    return (
        <div className="w-full">
            {view === 'list' && <CustomerList onNavigate={handleNavigate} />}
            {view === 'detail' && <CustomerDetail customer={selectedCustomer} onNavigate={handleNavigate} />}
            {view === 'form' && <CustomerForm customer={selectedCustomer} onNavigate={handleNavigate} />}
        </div>
    );
}

// ==========================================
// 1. LIST VIEW — Fetches from backend
// ==========================================
function CustomerList({ onNavigate }) {
    const [searchTerm, setSearchTerm] = useState('');
    const { data: customers, isLoading, isError } = useCustomerList();

    // Filter customers based on search term
    const filteredCustomers = (customers || []).filter(c => {
        const term = searchTerm.toLowerCase();
        return (
            c.firmName?.toLowerCase().includes(term) ||
            c.brandName?.toLowerCase().includes(term) ||
            c.personalName?.toLowerCase().includes(term) ||
            c.mobileNo?.includes(term)
        );
    });

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Customers</h1>
                    <p className="text-sm text-slate-500">Customer Master <span className="text-slate-400 ml-1">{filteredCustomers.length} active</span></p>
                </div>
                <PermissionGuard module="customer" action={ACTIONS.ADD}>
                    <button
                        onClick={() => onNavigate('form')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-md hover:bg-slate-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> New Customer
                    </button>
                </PermissionGuard>
            </div>

            <div className="flex justify-between items-center bg-white p-3 rounded-md shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-72">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search Firm, Brand, Code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-400"
                        />
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
            )}

            {/* Error State */}
            {isError && (
                <div className="p-6 text-center text-red-500 font-medium bg-red-50 rounded-md">
                    Failed to load customers. Make sure the backend is running.
                </div>
            )}

            {/* Customer Cards */}
            {!isLoading && !isError && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
                    {filteredCustomers.map(customer => (
                        <div
                            key={customer._id}
                            onClick={() => onNavigate('detail', customer)}
                            className="bg-white p-4 rounded-md shadow-sm border border-slate-100 flex gap-4 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all"
                        >
                            <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col gap-1 overflow-hidden w-full">
                                <h3 className="font-semibold text-slate-800 text-sm truncate">{customer.firmName}</h3>
                                <p className="text-xs text-slate-500">{customer.brandName} • {customer.mobileNo}</p>
                                <div className="flex items-center justify-between mt-1 w-full">
                                    <span className="px-2 py-0.5 bg-slate-800 text-white text-[10px] font-bold rounded-sm uppercase tracking-wide">
                                        {customer.status || 'Active'}
                                    </span>
                                    <span className="text-xs text-slate-400 capitalize">{customer.group?.replace('_', ' ')}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredCustomers.length === 0 && !isLoading && (
                        <div className="col-span-full text-center py-12 text-slate-400">
                            No customers found. Create your first customer to get started.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ==========================================
// 2. DETAIL VIEW
// ==========================================
function CustomerDetail({ customer, onNavigate }) {
    const deleteCustomer = useDeleteCustomer();

    if (!customer) return null;

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete "${customer.firmName}"?`)) return;
        try {
            await deleteCustomer.mutateAsync(customer._id);
            onNavigate('list');
        } catch (err) {
            alert('Failed to delete customer: ' + err.message);
        }
    };

    return (
        <div className="space-y-4 max-w-5xl mx-auto">
            <div className="flex justify-between items-center bg-white px-4 py-3 rounded-t-md border-b border-slate-200">
                <div className="flex items-center gap-2 text-sm">
                    <button onClick={() => onNavigate('list')} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="text-slate-400 cursor-pointer" onClick={() => onNavigate('list')}>Customers</span>
                    <span className="text-slate-300">›</span>
                    <span className="font-semibold text-slate-800">{customer.firmName}</span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-sm uppercase tracking-wide">
                        {customer.status || 'Active'}
                    </span>
                    <PermissionGuard module="customer" action={ACTIONS.EDIT}>
                        <button onClick={() => onNavigate('form', customer)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white text-sm font-medium rounded-sm hover:bg-slate-700">
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                    </PermissionGuard>
                    <PermissionGuard module="customer" action={ACTIONS.DELETE}>
                        <button
                            onClick={handleDelete}
                            disabled={deleteCustomer.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-sm hover:bg-red-700 disabled:opacity-50"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> {deleteCustomer.isPending ? 'Deleting...' : 'Delete'}
                        </button>
                    </PermissionGuard>
                </div>
            </div>

            <div className="bg-white rounded-sm border border-slate-200">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Customer Info</h2>
                </div>
                <div className="p-6">
                    <div className="max-w-xl flex flex-col">
                        <InfoRow label="Firm Name" value={customer.firmName} />
                        <InfoRow label="Brand Name" value={customer.brandName} />
                        <InfoRow label="Personal Name" value={customer.personalName} />
                        <InfoRow label="Mobile" value={customer.mobileNo} icon="📞" />
                        <InfoRow label="Email" value={customer.email} icon="✉️" />
                        <InfoRow label="GST No." value={customer.gstNo} />
                        <InfoRow label="Address" value={`${customer.address || ''}, ${customer.city || ''}, ${customer.state || ''}`} icon="📍" />
                        <InfoRow label="Group" value={customer.group?.replace('_', ' ').toUpperCase()} />
                    </div>
                </div>
            </div>
        </div>
    );
}

const InfoRow = ({ label, value, icon }) => (
    <div className="flex py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50">
        <div className="w-1/3 text-right pr-6 text-sm font-medium text-slate-400 flex justify-end items-center gap-1.5">
            {icon && <span>{icon}</span>} {label}
        </div>
        <div className="w-2/3 text-sm font-semibold text-slate-800">
            {value || '-'}
        </div>
    </div>
);

// ==========================================
// 3. FORM VIEW — Wired to backend mutations
// ==========================================
function CustomerForm({ customer, onNavigate }) {
    const isEditing = !!customer;
    const createCustomer = useCreateCustomer();
    const updateCustomer = useUpdateCustomer();
    const [error, setError] = useState('');

    // Controlled form state
    const [formData, setFormData] = useState({
        firmName: customer?.firmName || '',
        brandName: customer?.brandName || '',
        gstNo: customer?.gstNo || '',
        group: customer?.group || '',
        personalName: customer?.personalName || '',
        mobileNo: customer?.mobileNo || '',
        email: customer?.email || '',
        address: customer?.address || '',
        city: customer?.city || '',
        state: customer?.state || '',
    });

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const [groups, setGroups] = useState([
        { value: 'sundry_debtors', label: 'Sundry Debtors' },
        { value: 'sundry_creditors', label: 'Sundry Creditors' },
        { value: 'retail_clients', label: 'Retail Clients' }
    ]);
    const [isAddingGroup, setIsAddingGroup] = useState(false);
    const [newGroup, setNewGroup] = useState('');

    const handleAddGroup = () => {
        if (newGroup.trim()) {
            const value = newGroup.trim().toLowerCase().replace(/\s+/g, '_');
            setGroups(prev => [...prev, { value, label: newGroup.trim() }]);
            setFormData(prev => ({ ...prev, group: value }));
            setNewGroup('');
            setIsAddingGroup(false);
        }
    };

    const STATE_OPTIONS = [
        { value: 'gujarat', label: 'Gujarat' },
        { value: 'maharashtra', label: 'Maharashtra' },
        { value: 'rajasthan', label: 'Rajasthan' },
    ];

    const handleSave = async () => {
        setError('');

        // Basic validation
        if (!formData.firmName.trim() || !formData.mobileNo.trim() || !formData.group) {
            setError('Firm Name, Mobile No, and Group are required.');
            return;
        }

        try {
            if (isEditing) {
                await updateCustomer.mutateAsync({ id: customer._id, ...formData });
            } else {
                await createCustomer.mutateAsync(formData);
            }
            onNavigate('list');
        } catch (err) {
            setError(err.message);
        }
    };

    const isPending = createCustomer.isPending || updateCustomer.isPending;

    return (
        <div className="space-y-4 max-w-5xl mx-auto">
            <div className="flex justify-between items-center bg-white px-4 py-3 rounded-t-md border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-2 text-sm">
                    <button onClick={() => onNavigate(isEditing ? 'detail' : 'list', customer)} className="text-slate-400 hover:text-slate-600">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="text-slate-400">Customers</span>
                    <span className="text-slate-300">›</span>
                    <span className="font-semibold text-slate-800">{isEditing ? customer.firmName : 'New Customer'}</span>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => onNavigate(isEditing ? 'detail' : 'list', customer)} className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-sm hover:bg-slate-50">
                        <X className="w-4 h-4" /> Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isPending}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-800 text-white text-sm font-medium rounded-sm hover:bg-slate-700 shadow-sm disabled:opacity-50"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {isEditing ? 'Save Changes' : 'Add Customer'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm font-medium">
                    {error}
                </div>
            )}

            <form className="space-y-6 pb-12" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <div className="bg-white rounded-sm border border-slate-200">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Business Details</h2>
                    </div>
                    <div className="p-6 max-w-2xl mx-auto">
                        <FormRow label="Firm Name" required>
                            <input type="text" name="firmName" value={formData.firmName} onChange={handleChange} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-sm focus:outline-none focus:border-slate-400" />
                        </FormRow>
                        <FormRow label="Brand Name">
                            <input type="text" name="brandName" value={formData.brandName} onChange={handleChange} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-sm focus:outline-none focus:border-slate-400" />
                        </FormRow>
                        <FormRow label="GST No.">
                            <input type="text" name="gstNo" value={formData.gstNo} onChange={handleChange} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-sm focus:outline-none focus:border-slate-400 uppercase" />
                        </FormRow>

                        {/* Dynamic Group Selector */}
                        <FormRow label="Group" required>
                            <div className="flex gap-2">
                                {!isAddingGroup ? (
                                    <>
                                        <select name="group" value={formData.group} onChange={handleChange} className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-sm focus:outline-none focus:border-slate-400">
                                            <option value="">Select...</option>
                                            {groups.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                        </select>
                                        <button type="button" onClick={() => setIsAddingGroup(true)} className="p-1.5 bg-slate-100 text-slate-600 rounded-sm hover:bg-slate-200">
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <input type="text" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="New group..." className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-sm focus:outline-none focus:border-slate-400" />
                                        <button type="button" onClick={handleAddGroup} className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded-sm">Add</button>
                                        <button type="button" onClick={() => setIsAddingGroup(false)} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-sm rounded-sm">Cancel</button>
                                    </>
                                )}
                            </div>
                        </FormRow>
                    </div>
                </div>

                <div className="bg-white rounded-sm border border-slate-200">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Contact & Location</h2>
                    </div>
                    <div className="p-6 max-w-2xl mx-auto">
                        <FormRow label="Personal Name">
                            <input type="text" name="personalName" value={formData.personalName} onChange={handleChange} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-sm focus:outline-none focus:border-slate-400" />
                        </FormRow>
                        <FormRow label="Mobile No." required>
                            <input type="tel" name="mobileNo" value={formData.mobileNo} onChange={handleChange} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-sm focus:outline-none focus:border-slate-400" />
                        </FormRow>
                        <FormRow label="Email">
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-sm focus:outline-none focus:border-slate-400" />
                        </FormRow>
                        <FormRow label="Address">
                            <textarea rows={3} name="address" value={formData.address} onChange={handleChange} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-sm focus:outline-none focus:border-slate-400 resize-none"></textarea>
                        </FormRow>
                        <FormRow label="City">
                            <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-sm focus:outline-none focus:border-slate-400" />
                        </FormRow>
                        <FormRow label="State">
                            <select name="state" value={formData.state} onChange={handleChange} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-sm focus:outline-none focus:border-slate-400">
                                <option value="">Select State...</option>
                                {STATE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </FormRow>
                    </div>
                </div>
            </form>
        </div>
    );
}

const FormRow = ({ label, required, children }) => (
    <div className="flex items-start py-3">
        <div className="w-1/3 text-right pr-6 pt-1.5 text-sm font-medium text-slate-500">
            {label} {required && <span className="text-red-500">*</span>}
        </div>
        <div className="w-2/3">{children}</div>
    </div>
);