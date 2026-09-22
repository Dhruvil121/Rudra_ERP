import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import dns from 'node:dns';

// Force Node.js to use Google's DNS to avoid 'querySrv ECONNREFUSED' errors
dns.setServers(['8.8.8.8', '1.1.1.1']);

// Load environment variables from the .env file
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ Error: MONGODB_URI is missing from your .env file.');
    process.exit(1);
}

// We define the schema directly here to avoid complex import resolutions 
// when running standalone Node scripts outside of Next.js
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, default: 'manager' },
    isActive: { type: Boolean, default: true },
    permissions: { type: Map, of: [String], default: {} }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function seedDatabase() {
    try {
        console.log('⏳ Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB.');

        const adminEmail = 'superadmin@rudra.com';

        // Check if Super Admin already exists
        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('⚠️ Super Admin already exists. No changes made.');
            process.exit(0);
        }

        console.log('🔐 Hashing password...');
        // Industry standard is 10 salt rounds
        const hashedPassword = await bcrypt.hash('password123', 10);

        console.log('👤 Creating Super Admin account...');
        const superAdmin = new User({
            email: adminEmail,
            password: hashedPassword,
            name: 'Super Admin',
            role: 'super_admin',
            permissions: { all: ['true'] } // Wildcard permission
        });

        await superAdmin.save();
        console.log('✅ Super Admin created successfully!');

    } catch (error) {
        console.error('❌ Database Seeding Error:', error);
    } finally {
        // Always disconnect to prevent terminal hanging
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB.');
        process.exit(0);
    }
}

seedDatabase();