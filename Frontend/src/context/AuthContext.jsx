import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api/apiClient';

export const ACTIONS = {
    VIEW: 'view',
    ADD: 'add',
    EDIT: 'edit',
    DELETE: 'delete',
    PRINT: 'print',
    EXPORT: 'export',
    APPROVE: 'approve',
    PROCESS_TURNING: 'process_turning',
    PROCESS_BUFFING: 'process_buffing',
    PROCESS_PLATING: 'process_plating',
};

const MODULE_LEVEL_ACTIONS = ['view', 'add', 'edit', 'delete', 'print', 'export', 'approve'];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        localStorage.removeItem('rudra_token');
        localStorage.removeItem('rudra_user');
        setUser(null);
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const token = localStorage.getItem('rudra_token');
            if (!token) return null;

            const res = await api.get('/users/me');
            const payload = res?.data || res;
            const freshUser = payload?.user || payload;
            const freshToken = payload?.token;

            if (freshUser && (freshUser.id || freshUser._id)) {
                if (freshToken) {
                    localStorage.setItem('rudra_token', freshToken);
                }
                localStorage.setItem('rudra_user', JSON.stringify(freshUser));
                setUser(freshUser);
                return freshUser;
            }
            return null;
        } catch (err) {
            if (err.message?.includes('deactivated') || err.message?.includes('403')) {
                logout();
                window.location.href = '/login';
            }
            console.error('Failed to refresh user:', err);
            return null;
        }
    }, [logout]);

    useEffect(() => {
        const initAuth = async () => {
            try {
                const savedUser = localStorage.getItem('rudra_user');
                const savedToken = localStorage.getItem('rudra_token');
                if (savedUser && savedToken) {
                    setUser(JSON.parse(savedUser));
                    await refreshUser();
                }
            } catch {
                localStorage.removeItem('rudra_user');
                localStorage.removeItem('rudra_token');
            } finally {
                setLoading(false);
            }
        };
        initAuth();
    }, [refreshUser]);

    useEffect(() => {
        const handleFocus = () => {
            if (localStorage.getItem('rudra_token')) {
                refreshUser();
            }
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [refreshUser]);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        const data = res.data || res;

        localStorage.setItem('rudra_token', data.token);
        localStorage.setItem('rudra_user', JSON.stringify(data.user));
        setUser(data.user);

        return data.user;
    };

    const hasPermission = (module, action) => {
        if (!user) return false;
        if (user.role === 'super_admin') return true;
        if (!module) return true;

        const permsObj =
            user.permissions instanceof Map
                ? Object.fromEntries(user.permissions)
                : user.permissions || {};

        const targetModule = String(module).trim().toLowerCase();
        const targetAction = String(action || 'view').trim().toLowerCase();

        // Collect permissions from any matching key regardless of case ('BOM' and 'bom')
        const matchingKeys = Object.keys(permsObj).filter(
            k => k.trim().toLowerCase() === targetModule
        );

        const combinedPerms = matchingKeys.flatMap(k =>
            Array.isArray(permsObj[k]) ? permsObj[k] : []
        );

        const normalizedPerms = combinedPerms.map(p => String(p).trim().toLowerCase());

        if (targetModule === 'process' && targetAction === 'edit' && normalizedPerms.includes('add')) {
            return true;
        }

        return normalizedPerms.includes(targetAction);
    };

    /**
     * Step-level RBAC check for ProcessModule:
     * 1. Super Admin always has access.
     * 2. If specific steps are assigned in Settings -> Process Access (e.g. 'Cutting', 'Drilling', 'test'),
     *    checks if this step matches any assigned step (exact or stage-part match).
     * 3. If no specific steps were restricted in Tab 3, falls back to checking if the user has 'add' or 'edit' on Process.
     */
    const hasProcessStepPermission = (stepName) => {
        if (!user || !stepName) return false;
        if (user.role === 'super_admin') return true;

        const permsObj =
            user.permissions instanceof Map
                ? Object.fromEntries(user.permissions)
                : user.permissions || {};

        const matchingKeys = Object.keys(permsObj).filter(
            k => k.trim().toLowerCase() === 'process'
        );
        const rawProcessPerms = matchingKeys.flatMap(k =>
            Array.isArray(permsObj[k]) ? permsObj[k] : []
        );

        const processPerms = rawProcessPerms.map(p => String(p).trim().toLowerCase());
        const assignedStepNames = processPerms.filter(p => !MODULE_LEVEL_ACTIONS.includes(p));

        const cleanStepName = String(stepName).trim().toLowerCase();
        // Strip size suffix like "Round Dabi - Turning (4mm)" -> ["round dabi", "turning"]
        const withoutParens = cleanStepName.replace(/\([^)]*\)/g, '').trim();
        const stepParts = withoutParens.split(' - ').map(s => s.trim());

        if (assignedStepNames.length > 0) {
            return assignedStepNames.some(
                perm =>
                    cleanStepName === perm ||
                    withoutParens === perm ||
                    stepParts.includes(perm)
            );
        }

        return processPerms.includes('add') || processPerms.includes('edit');
    };

    const isAdmin = user?.role === 'super_admin';

    return (
        <AuthContext.Provider
            value={{
                user,
                login,
                logout,
                hasPermission,
                hasProcessStepPermission,
                refreshUser,
                isAdmin,
                loading
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);