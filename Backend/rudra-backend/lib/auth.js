import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from './mongodb';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "rudra-erp-secret-key";

export const ACTIONS = {
    VIEW: 'view',
    ADD: 'add',
    EDIT: 'edit',
    DELETE: 'delete',
    APPROVE: 'approve',
    PRINT: 'print',
    EXPORT: 'export',
    PROCESS_TURNING: 'process_turning',
    PROCESS_BUFFING: 'process_buffing',
    PROCESS_PLATING: 'process_plating',
};

/**
 * Extracts and verifies the JWT from the Authorization header.
 * Returns only the decoded identity (id, role) — does NOT read permissions from JWT.
 *
 * @returns {{ authenticated: boolean, decoded?: object, error?: string, status?: number }}
 */
async function extractToken() {
    const headersList = await headers();
    const authHeader = headersList.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { authenticated: false, error: "Unauthorized: Missing or invalid token format", status: 401 };
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { authenticated: true, decoded };
    } catch (err) {
        return { authenticated: false, error: "Unauthorized: Invalid or expired token", status: 401 };
    }
}

/**
 * Fetches the user's FRESH permissions from MongoDB.
 * This is the industry-standard approach — JWT is used only for authentication (identity),
 * and the database is the single source of truth for authorization (permissions).
 *
 * @param {string} userId - The user's MongoDB _id
 * @returns {object|null} - User document (without password) or null if not found
 */
async function getUserFromDb(userId) {
    // Dynamic import to avoid circular dependency issues with Next.js
    const mongoose = (await import('mongoose')).default;
    await dbConnect();

    // Use raw mongoose query instead of importing User model to avoid
    // circular import issues in Next.js API route resolution
    const user = await mongoose.connection.db.collection('users').findOne(
        { _id: new mongoose.Types.ObjectId(userId) },
        { projection: { password: 0 } }
    );

    return user;
}

/**
 * Verifies the JWT token and checks module-level + action-level permissions.
 * 
 * IMPORTANT: Permissions are ALWAYS fetched from the database, NOT from the JWT.
 * This ensures that when the admin updates a manager's access, it takes effect
 * immediately — no re-login required.
 *
 * @param {string} module - The module identifier (e.g., 'order', 'process')
 * @param {string} action - The required action (e.g., 'view', 'edit')
 * @returns {{ authorized: boolean, user?: object, error?: string, status?: number }}
 */
export async function checkPermission(module, action) {
    const tokenResult = await extractToken();
    if (!tokenResult.authenticated) {
        return { authorized: false, error: tokenResult.error, status: tokenResult.status };
    }

    const decoded = tokenResult.decoded;

    // Super admin bypasses all permission checks (role is immutable in JWT — safe to trust)
    if (decoded.role === 'super_admin') {
        return { authorized: true, user: decoded };
    }

    // For all other users, fetch FRESH permissions from the database
    const dbUser = await getUserFromDb(decoded.id);

    if (!dbUser) {
        return { authorized: false, error: "Unauthorized: User not found", status: 401 };
    }

    // Block deactivated users
    if (dbUser.isActive === false) {
        return { authorized: false, error: "Forbidden: Account deactivated", status: 403 };
    }

    // Build a clean user object with fresh permissions from DB
    const freshPermissions = dbUser.permissions instanceof Map
        ? Object.fromEntries(dbUser.permissions)
        : (dbUser.permissions || {});

    const user = {
        id: dbUser._id.toString(),
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        permissions: freshPermissions,
    };

    const modulePermissions = freshPermissions[module] || [];
    if (!modulePermissions.includes(action)) {
        return { authorized: false, error: "Forbidden: Missing Permissions", status: 403 };
    }

    return { authorized: true, user };
}

/**
 * Convenience: Verifies JWT and ensures the user is a super_admin.
 * Since role is immutable and set at account creation, it's safe to read from JWT.
 *
 * @returns {{ authorized: boolean, user?: object, error?: string, status?: number }}
 */
export async function requireSuperAdmin() {
    const tokenResult = await extractToken();
    if (!tokenResult.authenticated) {
        return { authorized: false, error: tokenResult.error, status: tokenResult.status };
    }

    if (tokenResult.decoded.role !== 'super_admin') {
        return { authorized: false, error: "Forbidden: Super Admin access required", status: 403 };
    }

    return { authorized: true, user: tokenResult.decoded };
}

/**
 * Convenience: Verifies JWT and returns the decoded user without any permission check.
 * Use for endpoints that just need a valid authenticated user (e.g., /users/me).
 *
 * @returns {{ authorized: boolean, user?: object, error?: string, status?: number }}
 */
export async function requireAuth() {
    const tokenResult = await extractToken();
    if (!tokenResult.authenticated) {
        return { authorized: false, error: tokenResult.error, status: tokenResult.status };
    }

    return { authorized: true, user: tokenResult.decoded };
}