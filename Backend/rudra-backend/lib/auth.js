import jwt from "jsonwebtoken";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import dbConnect from "./mongodb";
import User from "../app/models/User";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "rudra-erp-secret-key";

export const ACTIONS = {
    VIEW: "view",
    ADD: "add",
    EDIT: "edit",
    DELETE: "delete",
    PRINT: "print",
    EXPORT: "export",
    APPROVE: "approve",
    PROCESS_TURNING: "process_turning",
    PROCESS_BUFFING: "process_buffing",
    PROCESS_PLATING: "process_plating",
};

// Helper: Convert Mongoose Map or Object into a lowercase-keyed plain object
export function normalizePermissionsMap(rawPermissions) {
    if (!rawPermissions) return {};
    const plain =
        rawPermissions instanceof Map || typeof rawPermissions.entries === "function"
            ? Object.fromEntries(rawPermissions)
            : rawPermissions.toObject
                ? rawPermissions.toObject()
                : { ...rawPermissions };

    const normalized = {};
    Object.keys(plain).forEach((key) => {
        const lowerKey = String(key).trim().toLowerCase();
        const actions = Array.isArray(plain[key])
            ? plain[key].map((a) => String(a).trim())
            : [];
        
        const existingLower = normalized[lowerKey] || [];
        normalized[lowerKey] = Array.from(new Set([...existingLower, ...actions]));
        normalized[key] = actions;
    });

    // Unify BOM and bom so both keys always have the complete combined set of permissions
    const bomCombined = Array.from(new Set([
        ...(normalized.BOM || []),
        ...(normalized.bom || [])
    ]));
    if (bomCombined.length > 0 || normalized.BOM !== undefined || normalized.bom !== undefined) {
        normalized.BOM = bomCombined;
        normalized.bom = bomCombined;
    }

    return normalized;
}

/**
 * Authenticates the request via Bearer JWT (or NextAuth session)
 * AND loads fresh user role + permissions from MongoDB so permission
 * updates in Settings take effect immediately without re-login.
 */
export async function requireAuth() {
    try {
        let tokenUserId = null;

        const headersList = await headers();
        const authHeader =
            headersList.get("authorization") || headersList.get("Authorization");

        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            if (token && token !== "null" && token !== "undefined") {
                const decoded = jwt.verify(token, JWT_SECRET);
                tokenUserId = decoded.id || decoded._id;
            }
        }

        // Fallback to NextAuth session if no Bearer header
        if (!tokenUserId) {
            try {
                const session = await getServerSession();
                if (session?.user?.id || session?.user?._id) {
                    tokenUserId = session.user.id || session.user._id;
                }
            } catch {
                // Ignore NextAuth session errors when using custom JWT
            }
        }

        if (!tokenUserId) {
            return {
                authorized: false,
                status: 401,
                error: "Unauthorized: Please log in",
            };
        }

        await dbConnect();
        const dbUser = await User.findById(tokenUserId, { password: 0 });

        if (!dbUser) {
            return {
                authorized: false,
                status: 401,
                error: "User account no longer exists",
            };
        }

        if (dbUser.isActive === false) {
            return {
                authorized: false,
                status: 403,
                error: "Account deactivated. Contact your administrator.",
            };
        }

        const normalizedPermissions = normalizePermissionsMap(dbUser.permissions);

        return {
            authorized: true,
            status: 200,
            user: {
                id: dbUser._id.toString(),
                _id: dbUser._id.toString(),
                name: dbUser.name,
                email: dbUser.email,
                role: dbUser.role,
                isActive: dbUser.isActive !== false,
                permissions: normalizedPermissions,
            },
        };
    } catch (error) {
        console.error("Auth verification error:", error.message);
        return {
            authorized: false,
            status: 401,
            error: "Invalid or expired session token",
        };
    }
}

export async function requireSuperAdmin() {
    const auth = await requireAuth();
    if (!auth.authorized) return auth;

    if (auth.user.role !== "super_admin") {
        return {
            authorized: false,
            status: 403,
            error: "Forbidden: Super Admin access required",
        };
    }

    return auth;
}

/**
 * Case-insensitive permission checker.
 * Matches 'bom' or 'BOM', and treats Process 'add' & 'edit' interchangeably for module checks.
 */
export async function checkPermission(moduleName, action) {
    const auth = await requireAuth();
    if (!auth.authorized) return auth;

    if (auth.user.role === "super_admin") {
        return auth;
    }

    const targetModule = String(moduleName || "").trim().toLowerCase();
    const targetAction = String(action || "view").trim().toLowerCase();

    const modulePerms = (auth.user.permissions?.[targetModule] || []).map((p) =>
        String(p).trim().toLowerCase()
    );

    let hasAccess = modulePerms.includes(targetAction);

    // If checking 'edit' on process, allow if user has 'add' on process
    if (!hasAccess && targetModule === "process" && targetAction === "edit") {
        hasAccess = modulePerms.includes("add");
    }

    if (!hasAccess) {
        return {
            authorized: false,
            status: 403,
            error: `Forbidden: Missing '${targetAction}' permission for '${targetModule}'`,
            user: auth.user,
        };
    }

    return auth;
}