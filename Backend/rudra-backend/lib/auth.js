import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "rudra-erp-secret-key";

export const ACTIONS = {
    VIEW: 'view',
    ADD: 'add',
    EDIT: 'edit',
    DELETE: 'delete',
    APPROVE: 'approve',
    PROCESS_TURNING: 'process_turning',
    PROCESS_BUFFING: 'process_buffing',
    PROCESS_PLATING: 'process_plating',
};

export async function checkPermission(module, action) {
    const headersList = await headers();
    const authHeader = headersList.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { authorized: false, error: "Unauthorized: Missing or invalid token format", status: 401 };
    }

    const token = authHeader.split(' ')[1];
    let user;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        user = decoded;
    } catch (err) {
        return { authorized: false, error: "Unauthorized: Invalid or expired token", status: 401 };
    }

    if (user.role === 'super_admin') {
        return { authorized: true, user };
    }

    const modulePermissions = user.permissions?.[module] || [];
    if (!modulePermissions.includes(action)) {
        return { authorized: false, error: "Forbidden: Missing Permissions", status: 403 };
    }

    return { authorized: true, user };
}