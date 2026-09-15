import { useAuth } from '../../context/AuthContext';

export function PermissionGuard({ module, action, children, fallback = null }) {
    const { hasPermission } = useAuth();

    if (hasPermission(module, action)) {
        return children;
    }

    return fallback;
}