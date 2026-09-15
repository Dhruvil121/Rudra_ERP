import { createContext, useContext, useState, useEffect } from 'react';
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

    const hasPermission = (module, action) => {
        if (!user) return false;
        // Super admin has all permissions
        if (user.role === 'super_admin') return true;
        const modulePermissions = user.permissions?.[module];
        return modulePermissions ? modulePermissions.includes(action) : false;
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, hasPermission, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);