import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api/apiClient';

// Define action-level permissions as requested
export const ACTIONS = {
    VIEW: 'view',
    ADD: 'add',
    EDIT: 'edit',
    DELETE: 'delete',
    PRINT: 'print',
    EXPORT: 'export',
    APPROVE: 'approve',
    // Granular Process permissions
    PROCESS_TURNING: 'process_turning',
    PROCESS_BUFFING: 'process_buffing',
    PROCESS_PLATING: 'process_plating',
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // Initial auth check loading state

    // On app load, check localStorage for an existing session
    useEffect(() => {
        try {
            const savedUser = localStorage.getItem('rudra_user');
            const savedToken = localStorage.getItem('rudra_token');
            if (savedUser && savedToken) {
                setUser(JSON.parse(savedUser));
            }
        } catch {
            // Corrupted localStorage data, clear it
            localStorage.removeItem('rudra_user');
            localStorage.removeItem('rudra_token');
        } finally {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const data = await api.post('/auth/login', { email, password });

        // Persist the token and user data
        localStorage.setItem('rudra_token', data.token);
        localStorage.setItem('rudra_user', JSON.stringify(data.user));
        setUser(data.user);

        return data.user;
    };

    const logout = () => {
        localStorage.removeItem('rudra_token');
        localStorage.removeItem('rudra_user');
        setUser(null);
    };

    /**
     * Re-fetches the current user's fresh profile & permissions from the database.
     * Industry-standard approach to handle JWT staleness — call this after
     * permission changes or on route navigation to keep permissions up-to-date.
     */
    const refreshUser = useCallback(async () => {
        try {
            const token = localStorage.getItem('rudra_token');
            if (!token) return;

            const freshUser = await api.get('/users/me');

            // Update local state and localStorage with fresh data
            localStorage.setItem('rudra_user', JSON.stringify(freshUser));
            setUser(freshUser);

            return freshUser;
        } catch (err) {
            // If refresh fails (e.g., deactivated), log out
            if (err.message?.includes('deactivated') || err.message?.includes('403')) {
                logout();
                window.location.href = '/login';
            }
            console.error('Failed to refresh user:', err);
        }
    }, []);

    const hasPermission = (module, action) => {
        if (!user) return false;
        // Super admin has all permissions
        if (user.role === 'super_admin') return true;
        const modulePermissions = user.permissions?.[module];
        return modulePermissions ? modulePermissions.includes(action) : false;
    };

    /**
     * Checks if the user has permission to edit a specific process step.
     * Uses strict, case-insensitive EXACT matching to prevent permission bleed.
     * Since permissions are dynamically based on actual process names from the database,
     * exact matching ensures assigning "Raw Material Cutting" doesn't accidentally unlock "cutting".
     *
     * @param {string} stepName - The actual process step name from the process sequence
     * @returns {boolean}
     */
    const hasProcessStepPermission = (stepName) => {
        if (!user || !stepName) return false;
        if (user.role === 'super_admin') return true;

        const processPerms = user.permissions?.process || [];

        // Clean the incoming step name to ensure safe comparison
        const cleanStepName = stepName.trim().toLowerCase();

        return processPerms.some(perm => {
            // Clean the stored permission string
            const cleanPerm = perm.trim().toLowerCase();
            // Match exactly, ignoring case and trailing/leading spaces
            return cleanStepName === cleanPerm;
        });
    };

    /** Convenience getter — true if the current user is a super admin */
    const isAdmin = user?.role === 'super_admin';

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            hasPermission,
            hasProcessStepPermission,
            refreshUser,
            isAdmin,
            loading
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);