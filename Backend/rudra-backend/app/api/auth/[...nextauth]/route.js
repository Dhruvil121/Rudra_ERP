import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import dbConnect from "../../../../lib/mongodb";
import User from "../../../models/User";

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                await dbConnect();

                const user = await User.findOne({ email: credentials.email });
                if (!user) {
                    throw new Error("No user found with this email");
                }

                const isValidPassword = await bcrypt.compare(credentials.password, user.password);
                if (!isValidPassword) {
                    throw new Error("Invalid password");
                }

                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    permissions: Object.fromEntries(user.permissions)
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.permissions = user.permissions;
            }
            return token;
        },
        async session({ session, token }) {
            if (session?.user) {
                session.user.role = token.role;
                session.user.permissions = token.permissions;
            }
            return session;
        }
    },
    session: { strategy: "jwt" },
    pages: {
        signIn: '/login',
    }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };