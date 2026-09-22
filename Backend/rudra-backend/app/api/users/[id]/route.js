import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import User from "../../../models/User";
import { requireSuperAdmin } from "../../../../lib/auth";

// PUT: Update a manager's permissions and profile (super_admin only)
export async function PUT(req, { params }) {
    try {
        const auth = await requireSuperAdmin();
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const { id } = await params;
        const body = await req.json();

        // Build the update object — only allow safe fields
        const updateData = {};

        if (body.permissions !== undefined) {
            updateData.permissions = body.permissions;
        }
        if (body.name !== undefined) {
            updateData.name = body.name.trim();
        }
        if (body.email !== undefined) {
            // Check uniqueness if email is being changed
            const existing = await User.findOne({
                email: body.email.toLowerCase().trim(),
                _id: { $ne: id }
            });
            if (existing) {
                return NextResponse.json(
                    { error: "A user with this email already exists" },
                    { status: 409 }
                );
            }
            updateData.email = body.email.toLowerCase().trim();
        }
        if (body.isActive !== undefined) {
            updateData.isActive = body.isActive;
        }

        // Block role and password manipulation via this endpoint
        // (password changes should go through a dedicated endpoint)

        const updatedUser = await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, select: '-password' }
        );

        if (!updatedUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(updatedUser, { status: 200 });
    } catch (error) {
        console.error("Update user error:", error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}

// DELETE: Soft-delete (deactivate) a manager account (super_admin only)
export async function DELETE(req, { params }) {
    try {
        const auth = await requireSuperAdmin();
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const { id } = await params;

        // Prevent self-deletion
        if (auth.user.id === id) {
            return NextResponse.json(
                { error: "Cannot delete your own account" },
                { status: 400 }
            );
        }

        const targetUser = await User.findById(id);
        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Prevent deletion of other super_admin accounts
        if (targetUser.role === 'super_admin') {
            return NextResponse.json(
                { error: "Cannot delete a Super Admin account" },
                { status: 403 }
            );
        }

        // Soft-delete: mark as inactive instead of permanent removal
        // This preserves audit trails and historical data
        await User.findByIdAndUpdate(id, { isActive: false });

        return NextResponse.json(
            { message: "User deactivated successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Delete user error:", error);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}