import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import dbConnect from "../../../lib/mongodb";
import User from "../../models/User";
import { requireSuperAdmin } from "../../../lib/auth";

// GET: List all users (super_admin only)
export async function GET(req) {
    try {
        const auth = await requireSuperAdmin();
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();

        // Fetch all users, excluding their hashed passwords
        const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });

        return NextResponse.json(users, { status: 200 });
    } catch (error) {
        console.error("Fetch users error:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}

// POST: Create a new manager account (super_admin only)
export async function POST(req) {
    try {
        const auth = await requireSuperAdmin();
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const { name, email, password, permissions } = await req.json();

        // --- Validation ---
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: "Name, email, and password are required" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        // Check for duplicate email
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return NextResponse.json(
                { error: "A user with this email already exists" },
                { status: 409 }
            );
        }

        // Hash the password (10 salt rounds — industry standard)
        const hashedPassword = await bcrypt.hash(password, 10);

        // Force role to 'manager' — cannot create super_admin via API
        const newUser = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: 'manager',
            permissions: permissions || {},
        });

        await newUser.save();

        // Return created user without password
        const userResponse = newUser.toObject();
        delete userResponse.password;

        return NextResponse.json(userResponse, { status: 201 });
    } catch (error) {
        console.error("Create user error:", error);
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
}