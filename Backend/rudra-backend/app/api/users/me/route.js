import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "../../../../lib/mongodb";
import User from "../../../models/User";
import { requireAuth, normalizePermissionsMap } from "../../../../lib/auth";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "rudra-erp-secret-key";

export async function GET() {
    try {
        const auth = await requireAuth();
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();

        const userId = auth.user?.id || auth.user?._id;
        const user = await User.findById(userId, { password: 0 });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (user.isActive === false) {
            return NextResponse.json(
                { error: "Account deactivated. Contact your administrator." },
                { status: 403 }
            );
        }

        const normalizedPermissions = normalizePermissionsMap(user.permissions);

        const userPayload = {
            id: user._id.toString(),
            _id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.isActive !== false,
            permissions: normalizedPermissions,
        };

        // Re-sign a fresh JWT token so backend routes immediately see updated permissions
        const freshToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "7d" });

        return NextResponse.json(
            {
                ...userPayload,
                token: freshToken,
                user: userPayload,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Fetch current user error:", error);
        return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 });
    }
}