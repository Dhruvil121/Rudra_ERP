import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    useUsers, useUpdatePermissions, useCreateUser,
    useDeleteUser, useReactivateUser
} from '../hooks/useUserData';
import { useAllProcessStepNames } from '../hooks/useProcessData';
import {
    Shield, User, Check, AlertCircle, Loader2, CheckCircle2,
    Trash2, UserPlus, Users as UsersIcon, Lock, Eye, EyeOff,
    RefreshCw, X, Settings as SettingsIcon, Search, Plus
} from 'lucide-react';
import { ERP_MODULES } from '../config/modules';
import { useFeedback } from '../context/FeedbackContext';

// ==========================================
// MAIN SETTINGS MODULE (Matches BOM Layout)
// ==========================================
export default function SettingsModule() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('users');
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const createMutation = useCreateUser();

    if (user?.role !== 'super_admin') {
        return (
            <div className="w-full">
                <div className="flex flex-col items-center justify-center p-24 text-red-500 max-w-7xl mx-auto">
                    <AlertCircle className="w-16 h-16 mb-4" />
                    <h2 className="text-2xl font-bold">Access Denied</h2>
                    <p>Only the Super Admin can manage user roles and permissions.</p>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'users', label: 'User Management', icon: UsersIcon },
        { id: 'modules', label: 'Module Access', icon: Shield },
        { id: 'process', label: 'Process Access', icon: SettingsIcon },
    ];

    return (
        <div className="w-full">
            <div className="space-y-4 max-w-7xl mx-auto">
                {/* Top Header — Matches BOM Layout */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Access Management</h1>
                            <p className="text-sm text-slate-500">
                                Super Admin Control Panel — Manage users, modules, and process access
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Create Manager
                    </button>
                </div>

                {/* Full-Width White Search & Tabs Bar — Matches BOM Layout */}
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-4">
                    <div className="relative w-80">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search Manager Name or Email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-semibold text-xs transition-all ${activeTab === tab.id
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Create Manager Modal */}
                {showCreateForm && (
                    <CreateManagerModal
                        onClose={() => setShowCreateForm(false)}
                        onSubmit={createMutation}
                    />
                )}

                {/* Tab Content */}
                {activeTab === 'users' && <UserManagementTab searchTerm={searchTerm} />}
                {activeTab === 'modules' && <ModuleAccessTab searchTerm={searchTerm} />}
                {activeTab === 'process' && <ProcessAccessTab searchTerm={searchTerm} />}
            </div>
        </div>
    );
}

// ==========================================
// TAB 1: USER MANAGEMENT
// ==========================================
function UserManagementTab({ searchTerm }) {
    const { data: usersFromDb, isLoading, isError } = useUsers();
    const deleteMutation = useDeleteUser();
    const reactivateMutation = useReactivateUser();
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const { showToast } = useFeedback();

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-6 text-red-500 bg-red-50 rounded-xl border border-red-200">
                Failed to load users. Make sure the backend is running.
            </div>
        );
    }

    const managers = (usersFromDb || [])
        .filter(u => u.role !== 'super_admin')
        .filter(u =>
            !searchTerm ||
            u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const handleDelete = async (userId) => {
        try {
            await deleteMutation.mutateAsync(userId);
            setDeleteConfirm(null);
            showToast("Manager deactivated successfully", "success");
        } catch (err) {
            showToast("Error: " + err.message, "error");
        }
    };

    const handleReactivate = async (userId) => {
        try {
            await reactivateMutation.mutateAsync(userId);
            showToast("Manager reactivated successfully", "success");
        } catch (err) {
            showToast("Error: " + err.message, "error");
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="p-4">Manager Name</th>
                        <th className="p-4">Email Address</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Created Date</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {managers.map(manager => (
                        <tr key={manager._id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                                        {manager.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || <User className="w-4 h-4" />}
                                    </div>
                                    <span className="font-bold text-indigo-600">{manager.name}</span>
                                </div>
                            </td>
                            <td className="p-4 text-sm font-medium text-slate-700">{manager.email}</td>
                            <td className="p-4">
                                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full uppercase">
                                    Manager
                                </span>
                            </td>
                            <td className="p-4">
                                {manager.isActive !== false ? (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase">
                                        Active
                                    </span>
                                ) : (
                                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full uppercase">
                                        Deactivated
                                    </span>
                                )}
                            </td>
                            <td className="p-4 text-sm text-slate-600">
                                {manager.createdAt
                                    ? new Date(manager.createdAt).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    })
                                    : '-'}
                            </td>
                            <td className="p-4 flex justify-end gap-2">
                                {manager.isActive !== false ? (
                                    deleteConfirm === manager._id ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-red-600 font-medium">Deactivate?</span>
                                            <button
                                                onClick={() => handleDelete(manager._id)}
                                                disabled={deleteMutation.isPending}
                                                className="px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 disabled:opacity-50"
                                            >
                                                {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(null)}
                                                className="px-2.5 py-1 bg-slate-200 text-slate-600 text-xs font-bold rounded hover:bg-slate-300"
                                            >
                                                No
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setDeleteConfirm(manager._id)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                                            title="Deactivate Account"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )
                                ) : (
                                    <button
                                        onClick={() => handleReactivate(manager._id)}
                                        disabled={reactivateMutation.isPending}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-md hover:bg-green-100 transition-colors disabled:opacity-50"
                                    >
                                        {reactivateMutation.isPending ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <RefreshCw className="w-3 h-3" />
                                        )}
                                        Reactivate
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {managers.length === 0 && (
                        <tr>
                            <td colSpan={6} className="p-12 text-center text-slate-400">
                                No managers found. Click "Create Manager" to add one.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

// ==========================================
// CREATE MANAGER MODAL
// ==========================================
function CreateManagerModal({ onClose, onSubmit }) {
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.name.trim() || !form.email.trim() || !form.password) {
            setError('All fields are required');
            return;
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        try {
            await onSubmit.mutateAsync(form);
            onClose();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Create Manager Account</h2>
                        <p className="text-sm text-slate-500">
                            New manager will be able to login after permissions are assigned
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleCreate} className="p-6 space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                        </div>
                    )}

                    <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-2">Full Name</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g., Rajesh Kumar"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-2">Email Address</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            placeholder="e.g., rajesh@rudra.com"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-2">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                placeholder="Min. 6 characters"
                                className="w-full px-4 py-2.5 pr-12 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={onSubmit.isPending}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                        >
                            {onSubmit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                            Create Account
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ==========================================
// TAB 2: MODULE ACCESS
// ==========================================
function ModuleAccessTab({ searchTerm }) {
    const { data: usersFromDb, isLoading, isError } = useUsers();
    const updateMutation = useUpdatePermissions();
    const [localPermissions, setLocalPermissions] = useState({});
    const [saveMessages, setSaveMessages] = useState({});

    useEffect(() => {
        if (usersFromDb) {
            const permMap = {};
            usersFromDb.forEach(u => {
                const perms = u.permissions instanceof Map
                    ? Object.fromEntries(u.permissions)
                    : (u.permissions || {});
                permMap[u._id] = { ...perms };
            });
            setLocalPermissions(permMap);
        }
    }, [usersFromDb]);

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (isError) {
        return <div className="p-6 text-red-500 bg-red-50 rounded-xl">Failed to load users.</div>;
    }

    const managers = (usersFromDb || [])
        .filter(u => u.role !== 'super_admin' && u.isActive !== false)
        .filter(u =>
            !searchTerm ||
            u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const togglePermission = (userId, module, action) => {
        setLocalPermissions(prev => {
            const userPerms = { ...(prev[userId] || {}) };
            const modulePerms = [...(userPerms[module] || [])];
            const hasPerm = modulePerms.includes(action);

            userPerms[module] = hasPerm
                ? modulePerms.filter(p => p !== action)
                : [...modulePerms, action];

            return { ...prev, [userId]: userPerms };
        });
        setSaveMessages(prev => ({ ...prev, [userId]: null }));
    };

    const toggleModuleAll = (userId, moduleId, allActions) => {
        setLocalPermissions(prev => {
            const userPerms = { ...(prev[userId] || {}) };
            const modulePerms = userPerms[moduleId] || [];
            const allGranted = allActions.every(a => modulePerms.includes(a));
            userPerms[moduleId] = allGranted ? [] : [...allActions];
            return { ...prev, [userId]: userPerms };
        });
        setSaveMessages(prev => ({ ...prev, [userId]: null }));
    };

    const savePermissions = async (manager) => {
        const permissions = localPermissions[manager._id] || {};
        try {
            await updateMutation.mutateAsync({ userId: manager._id, permissions });
            setSaveMessages(prev => ({ ...prev, [manager._id]: { type: 'success', text: 'Saved!' } }));
        } catch (err) {
            setSaveMessages(prev => ({ ...prev, [manager._id]: { type: 'error', text: err.message } }));
        }
    };

    if (managers.length === 0) {
        return (
            <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                No active managers match your search.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {managers.map(manager => {
                const perms = localPermissions[manager._id] || {};
                const msg = saveMessages[manager._id];

                return (
                    <div key={manager._id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                                    {manager.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || <User className="w-4 h-4" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">{manager.name}</h3>
                                    <p className="text-xs text-slate-500">{manager.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {msg && (
                                    <span className={`text-sm font-medium flex items-center gap-1 ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                        {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        {msg.text}
                                    </span>
                                )}
                                <button
                                    onClick={() => savePermissions(manager)}
                                    disabled={updateMutation.isPending}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    Save Access
                                </button>
                            </div>
                        </div>

                        <div className="p-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {ERP_MODULES.map(mod => {
                                    const modulePerms = perms[mod.id] || [];
                                    const allGranted = mod.actions.every(a => modulePerms.includes(a));

                                    return (
                                        <div key={mod.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 hover:border-indigo-200 transition-colors">
                                            <div className="flex items-center justify-between mb-3">
                                                <h5 className="capitalize font-semibold text-slate-700 text-sm flex items-center gap-2">
                                                    <mod.icon className="w-4 h-4 text-indigo-600" />
                                                    {mod.title}
                                                </h5>
                                                <button
                                                    onClick={() => toggleModuleAll(manager._id, mod.id, mod.actions)}
                                                    className={`text-xs font-bold px-2 py-0.5 rounded transition-colors ${allGranted
                                                            ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                                                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                                        }`}
                                                >
                                                    {allGranted ? 'Revoke All' : 'Grant All'}
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-3">
                                                {mod.actions.map(action => (
                                                    <label key={action} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                                            checked={modulePerms.includes(action)}
                                                            onChange={() => togglePermission(manager._id, mod.id, action)}
                                                        />
                                                        <span className="capitalize">{action}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ==========================================
// TAB 3: PROCESS ACCESS
// ==========================================
function ProcessAccessTab({ searchTerm }) {
    const { data: usersFromDb, isLoading, isError } = useUsers();
    const { data: activeProcessSteps = [], isLoading: stepsLoading } = useAllProcessStepNames();
    const updateMutation = useUpdatePermissions();
    const [localPermissions, setLocalPermissions] = useState({});
    const [saveMessages, setSaveMessages] = useState({});

    useEffect(() => {
        if (usersFromDb) {
            const permMap = {};
            usersFromDb.forEach(u => {
                const perms = u.permissions instanceof Map
                    ? Object.fromEntries(u.permissions)
                    : (u.permissions || {});
                permMap[u._id] = { ...perms };
            });
            setLocalPermissions(permMap);
        }
    }, [usersFromDb]);

    if (isLoading || stepsLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (isError) {
        return <div className="p-6 text-red-500 bg-red-50 rounded-xl">Failed to load users.</div>;
    }

    const managers = (usersFromDb || [])
        .filter(u => u.role !== 'super_admin' && u.isActive !== false)
        .filter(u =>
            !searchTerm ||
            u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const toggleProcessPermission = (userId, processName) => {
        setLocalPermissions(prev => {
            const userPerms = { ...(prev[userId] || {}) };
            const processPerms = [...(userPerms.process || [])];
            const hasPerm = processPerms.includes(processName);

            userPerms.process = hasPerm
                ? processPerms.filter(p => p !== processName)
                : [...processPerms, processName];

            return { ...prev, [userId]: userPerms };
        });
        setSaveMessages(prev => ({ ...prev, [userId]: null }));
    };

    const toggleAllProcesses = (userId) => {
        setLocalPermissions(prev => {
            const userPerms = { ...(prev[userId] || {}) };
            const processPerms = userPerms.process || [];
            const allGranted = activeProcessSteps.every(p => processPerms.includes(p));

            userPerms.process = allGranted
                ? processPerms.filter(p => !activeProcessSteps.includes(p))
                : [...new Set([...processPerms, ...activeProcessSteps])];

            return { ...prev, [userId]: userPerms };
        });
        setSaveMessages(prev => ({ ...prev, [userId]: null }));
    };

    const savePermissions = async (manager) => {
        const permissions = localPermissions[manager._id] || {};
        try {
            await updateMutation.mutateAsync({ userId: manager._id, permissions });
            setSaveMessages(prev => ({ ...prev, [manager._id]: { type: 'success', text: 'Saved!' } }));
        } catch (err) {
            setSaveMessages(prev => ({ ...prev, [manager._id]: { type: 'error', text: err.message } }));
        }
    };

    if (managers.length === 0) {
        return (
            <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                No active managers match your search.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {managers.map(manager => {
                const processPerms = localPermissions[manager._id]?.process || [];
                const msg = saveMessages[manager._id];
                const allGranted = activeProcessSteps.length > 0 && activeProcessSteps.every(p => processPerms.includes(p));
                const assignedCount = activeProcessSteps.filter(p => processPerms.includes(p)).length;

                return (
                    <div key={manager._id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                                    {manager.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">{manager.name}</h3>
                                    <p className="text-xs text-slate-500">
                                        {assignedCount} of {activeProcessSteps.length} process steps assigned
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {msg && (
                                    <span className={`text-sm font-medium flex items-center gap-1 ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                        {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        {msg.text}
                                    </span>
                                )}
                                <button
                                    onClick={() => savePermissions(manager)}
                                    disabled={updateMutation.isPending}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    Save Process Access
                                </button>
                            </div>
                        </div>

                        <div className="p-5">
                            <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-slate-100">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider w-full">Module Access</p>
                                {['view', 'add'].map(action => (
                                    <label key={action} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                                        <input
                                            type="checkbox"
                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                            checked={processPerms.includes(action) || false}
                                            onChange={() => toggleProcessPermission(manager._id, action)}
                                        />
                                        <span className="capitalize">{action} Process Module</span>
                                    </label>
                                ))}
                            </div>

                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Editable Process Steps</p>
                                <button
                                    onClick={() => toggleAllProcesses(manager._id)}
                                    className={`text-xs font-bold px-3 py-1 rounded transition-colors ${allGranted
                                            ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                >
                                    {allGranted ? 'Revoke All Steps' : 'Grant All Steps'}
                                </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                {activeProcessSteps.length === 0 && (
                                    <div className="col-span-full py-4 text-center text-sm text-slate-400">
                                        No process steps have been created yet.
                                    </div>
                                )}
                                {activeProcessSteps.map(processName => {
                                    const isGranted = processPerms.includes(processName);
                                    return (
                                        <label
                                            key={processName}
                                            className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${isGranted
                                                    ? 'border-indigo-200 bg-indigo-50/70 shadow-sm'
                                                    : 'border-slate-200 bg-white hover:bg-slate-50'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                                checked={isGranted}
                                                onChange={() => toggleProcessPermission(manager._id, processName)}
                                            />
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                {isGranted ? (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                                ) : (
                                                    <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                                )}
                                                <span className={`text-xs font-semibold truncate ${isGranted ? 'text-indigo-700' : 'text-slate-600'}`}>
                                                    {processName}
                                                </span>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}