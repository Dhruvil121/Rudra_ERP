import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        default: 'manager',
    },
    permissions: {
        type: Map,
        of: [String],
        default: {},
    }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);