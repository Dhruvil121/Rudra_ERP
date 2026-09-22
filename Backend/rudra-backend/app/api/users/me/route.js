import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import User from "../../../models/User";
import { requireAuth } from "../../../../lib/auth";

/**
 * GET /api/users/me
 * Returns the authenticated user's FRESH profile & permissions from the database.
 * This is the industry-standard approach to handle JWT staleness —
 * the frontend calls this on route changes to get up-to-date permissions
 * instead of relying solely on the JWT payload.
 */
export async function GET(req) {
    try {
        const auth = await requireAuth();
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();

        const user = await User.findById(auth.user.id, { password: 0 });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Block deactivated users
        if (user.isActive === false) {
            return NextResponse.json(
                { error: "Account deactivated. Contact your administrator." },
                { status: 403 }
            );
        }

        // Return a clean user object matching the JWT payload shape
        const userPayload = {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.isActive !== false, // default to true
            permissions: user.permissions instanceof Map
                ? Object.fromEntries(user.permissions)
                : (user.permissions || {}),
        };

        return NextResponse.json(userPayload, { status: 200 });
    } catch (error) {
        console.error("Fetch current user error:", error);
        return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 });
    }
}
