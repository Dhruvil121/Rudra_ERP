import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    useUsers, useUpdatePermissions, useCreateUser,
    useDeleteUser, useReactivateUser
} from '../hooks/useUserData';
import { useAllProcessStepNames } from '../hooks/useProcessData';
import {
    Shield, User, Check, AlertCircle, Loader2, CheckCircle2,
    Plus, Trash2, UserPlus, Users as UsersIcon, Lock, Eye, EyeOff,
    ToggleLeft, ToggleRight, RefreshCw, X, Settings as SettingsIcon, Layers
} from 'lucide-react';
import { ERP_MODULES } from '../config/modules';

// ==========================================
// MAIN SETTINGS MODULE
// ==========================================
export default function SettingsModule() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('users');

    // If the logged-in user isn't a Super Admin, block them
    if (user?.role !== 'super_admin') {
        return (
            <div className="flex flex-col items-center justify-center p-24 text-red-500">
                <AlertCircle className="w-16 h-16 mb-4" />
                <h2 className="text-2xl font-bold">Access Denied</h2>
                <p>Only the Super Admin can manage user roles and permissions.</p>
            </div>
        );
    }

    const tabs = [
        { id: 'users', label: 'User Management', icon: UsersIcon },
        { id: 'modules', label: 'Module Access', icon: Shield },
        { id: 'process', label: 'Process Access', icon: SettingsIcon },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 pb-6 border-b border-slate-200">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                    <Shield className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Access Management</h1>
                    <p className="text-sm text-slate-500">Super Admin Control Panel — Manage users, modules, and process access</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${activeTab === tab.id
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            {activeTab === 'users' && <UserManagementTab />}
            {activeTab === 'modules' && <ModuleAccessTab />}
            {activeTab === 'process' && <ProcessAccessTab />}
        </div>
    );
}

// ==========================================
// TAB 1: USER MANAGEMENT
// ==========================================
function UserManagementTab() {
    const { data: usersFromDb, isLoading, isError } = useUsers();
    const createMutation = useCreateUser();
    const deleteMutation = useDeleteUser();
    const reactivateMutation = useReactivateUser();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    if (isLoading) {
        return <div className="flex justify-center p-24"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
    }

    if (isError) {
        return <div className="p-6 text-red-500 bg-red-50 rounded-xl">Failed to load users. Make sure the backend is running.</div>;
    }

    const managers = (usersFromDb || []).filter(u => u.role !== 'super_admin');

    const handleDelete = async (userId) => {
        try {
            await deleteMutation.mutateAsync(userId);
            setDeleteConfirm(null);
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    const handleReactivate = async (userId) => {
        try {
            await reactivateMutation.mutateAsync(userId);
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Manager Accounts</h2>
                    <p className="text-sm text-slate-500">{managers.length} manager(s) registered</p>
                </div>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
                >
                    <UserPlus className="w-4 h-4" />
                    Create Manager
                </button>
            </div>

            {/* Create Manager Modal */}
            {showCreateForm && (
                <CreateManagerModal
                    onClose={() => setShowCreateForm(false)}
                    onSubmit={createMutation}
                />
            )}

            {/* Users Table */}
            {managers.length === 0 ? (
                <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                    <UsersIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="font-medium">No managers found</p>
                    <p className="text-sm mt-1">Click "Create Manager" to add one.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="p-4">Name</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Created</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {managers.map(manager => (
                                <tr key={manager._id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                                                {manager.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || <User className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800">{manager.name}</p>
                                                <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 font-bold uppercase rounded-full tracking-wider">Manager</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">{manager.email}</td>
                                    <td className="p-4">
                                        {manager.isActive !== false ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                                Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                                Deactivated
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-slate-500">
                                        {manager.createdAt ? new Date(manager.createdAt).toLocaleDateString('en-IN', {
                                            day: '2-digit', month: 'short', year: 'numeric'
                                        }) : '-'}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            {manager.isActive !== false ? (
                                                <>
                                                    {deleteConfirm === manager._id ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-red-600 font-medium">Deactivate?</span>
                                                            <button
                                                                onClick={() => handleDelete(manager._id)}
                                                                disabled={deleteMutation.isPending}
                                                                className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-md hover:bg-red-700 disabled:opacity-50"
                                                            >
                                                                {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteConfirm(null)}
                                                                className="px-3 py-1 bg-slate-200 text-slate-600 text-xs font-bold rounded-md hover:bg-slate-300"
                                                            >
                                                                No
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setDeleteConfirm(manager._id)}
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Deactivate Account"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => handleReactivate(manager._id)}
                                                    disabled={reactivateMutation.isPending}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 text-xs font-bold rounded-md hover:bg-green-100 transition-colors disabled:opacity-50"
                                                >
                                                    {reactivateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                                    Reactivate
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
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
                        <p className="text-sm text-slate-500">New manager will be able to login after permissions are assigned</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
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
function ModuleAccessTab() {
    const { data: usersFromDb, isLoading, isError } = useUsers();
    const updateMutation = useUpdatePermissions();
    const [localPermissions, setLocalPermissions] = useState({});
    const [saveMessages, setSaveMessages] = useState({});

    // Sync DB data into local state
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
        return <div className="flex justify-center p-24"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
    }

    if (isError) {
        return <div className="p-6 text-red-500 bg-red-50 rounded-xl">Failed to load users.</div>;
    }

    // Only show active managers
    const managers = (usersFromDb || []).filter(u => u.role !== 'super_admin' && u.isActive !== false);

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

    // Convenience: toggle all actions for a module at once
    const toggleModuleAll = (userId, moduleId, allActions) => {
        setLocalPermissions(prev => {
            const userPerms = { ...(prev[userId] || {}) };
            const modulePerms = userPerms[moduleId] || [];

            // If all actions are already granted, revoke all. Otherwise grant all.
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
            <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                No active managers. Create a manager first to assign module permissions.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-slate-800">Module Permissions</h2>
                <p className="text-sm text-slate-500">Control which modules each manager can see and what actions they can perform</p>
            </div>

            {managers.map(manager => {
                const perms = localPermissions[manager._id] || {};
                const msg = saveMessages[manager._id];

                return (
                    <div key={manager._id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Manager Header */}
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                    {manager.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || <User className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{manager.name}</h3>
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
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Save Access
                                </button>
                            </div>
                        </div>

                        {/* Permission Grid */}
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {ERP_MODULES.map(mod => {
                                    const modulePerms = perms[mod.id] || [];
                                    const allGranted = mod.actions.every(a => modulePerms.includes(a));

                                    return (
                                        <div key={mod.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 hover:border-slate-200 transition-colors">
                                            <div className="flex items-center justify-between mb-3">
                                                <h5 className="capitalize font-semibold text-slate-700 flex items-center gap-2">
                                                    <mod.icon className="w-4 h-4 text-slate-400" />
                                                    {mod.title}
                                                </h5>
                                                <button
                                                    onClick={() => toggleModuleAll(manager._id, mod.id, mod.actions)}
                                                    className={`text-xs font-bold px-2 py-0.5 rounded transition-colors ${allGranted
                                                        ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                                                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                                                        }`}
                                                >
                                                    {allGranted ? 'Revoke All' : 'Grant All'}
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {mod.actions.map(action => (
                                                    <label key={action} className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
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
function ProcessAccessTab() {
    const { data: usersFromDb, isLoading, isError } = useUsers();
    const { data: activeProcessSteps = [], isLoading: stepsLoading } = useAllProcessStepNames();
    const updateMutation = useUpdatePermissions();
    const [localPermissions, setLocalPermissions] = useState({});
    const [saveMessages, setSaveMessages] = useState({});

    // Sync DB data into local state
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
        return <div className="flex justify-center p-24"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
    }

    if (isError) {
        return <div className="p-6 text-red-500 bg-red-50 rounded-xl">Failed to load users.</div>;
    }

    const managers = (usersFromDb || []).filter(u => u.role !== 'super_admin' && u.isActive !== false);

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
            <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                No active managers. Create a manager first to assign process permissions.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-slate-800">Process Step Permissions</h2>
                <p className="text-sm text-slate-500">
                    Assign which manufacturing process steps each manager can view and edit.
                    Unassigned steps appear as read-only with a lock icon in the Process module.
                </p>
            </div>

            {managers.map(manager => {
                const processPerms = localPermissions[manager._id]?.process || [];
                const msg = saveMessages[manager._id];
                const allGranted = activeProcessSteps.length > 0 && activeProcessSteps.every(p => processPerms.includes(p));
                const assignedCount = activeProcessSteps.filter(p => processPerms.includes(p)).length;

                return (
                    <div key={manager._id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Manager Header */}
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                    {manager.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{manager.name}</h3>
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
                                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Save Process Access
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Module-level process permissions */}
                            <div className="flex flex-wrap gap-3 mb-5 pb-5 border-b border-slate-100">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider w-full mb-1">Module Access</p>
                                {['view', 'add'].map(action => (
                                    <label key={action} className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-colors">
                                        <input
                                            type="checkbox"
                                            className="rounded text-orange-500 focus:ring-orange-500"
                                            checked={processPerms.includes(action) || false}
                                            onChange={() => toggleProcessPermission(manager._id, action)}
                                        />
                                        <span className="capitalize">{action} Process Module</span>
                                    </label>
                                ))}
                            </div>

                            {/* Per-process step permissions */}
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Editable Process Steps</p>
                                <button
                                    onClick={() => toggleAllProcesses(manager._id)}
                                    className={`text-xs font-bold px-3 py-1 rounded transition-colors ${allGranted
                                        ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                                        }`}
                                >
                                    {allGranted ? 'Revoke All Steps' : 'Grant All Steps'}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                {activeProcessSteps.length === 0 && (
                                    <div className="col-span-full py-4 text-center text-sm text-slate-400">
                                        No process steps have been created yet. Create a process sequence first.
                                    </div>
                                )}
                                {activeProcessSteps.map(processName => {
                                    const isGranted = processPerms.includes(processName);
                                    return (
                                        <label
                                            key={processName}
                                            className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${isGranted
                                                ? 'border-orange-200 bg-orange-50 shadow-sm'
                                                : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="rounded text-orange-500 focus:ring-orange-500"
                                                checked={isGranted}
                                                onChange={() => toggleProcessPermission(manager._id, processName)}
                                            />
                                            <div className="flex items-center gap-1.5">
                                                {isGranted
                                                    ? <CheckCircle2 className="w-3.5 h-3.5 text-orange-500" />
                                                    : <Lock className="w-3.5 h-3.5 text-slate-300" />
                                                }
                                                <span className={`text-sm font-medium ${isGranted ? 'text-orange-700' : 'text-slate-500'}`}>
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