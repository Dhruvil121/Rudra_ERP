import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dbConnect from "../../../../lib/mongodb";
import User from "../../../models/User";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "rudra-erp-secret-key";

// POST: Login with email and password, return JWT token
export async function POST(req) {
    try {
        await dbConnect();
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return NextResponse.json({ error: "No user found with this email" }, { status: 401 });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return NextResponse.json({ error: "Invalid password" }, { status: 401 });
        }

        // Build the user payload for the JWT
        const userPayload = {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            permissions: Object.fromEntries(user.permissions),
        };

        // Sign a JWT token with 7-day expiry
        const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

        return NextResponse.json({ token, user: userPayload }, { status: 200 });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }
}
