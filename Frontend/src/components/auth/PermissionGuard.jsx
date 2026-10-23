import { useAuth } from '../../context/AuthContext';

export function PermissionGuard({ module, action, children, fallback = null }) {
    const { user, hasPermission } = useAuth();

    if (!user) return fallback;
    if (user.role === 'super_admin') return children;

    // Case-insensitive check via AuthContext
    if (hasPermission(module, action)) {
        return children;
    }

    return fallback;
}

export default PermissionGuard;