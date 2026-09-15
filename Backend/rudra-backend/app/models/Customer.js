import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
    firmName: { type: String, required: true },
    brandName: { type: String },
    personalName: { type: String },
    mobileNo: { type: String, required: true },
    email: { type: String },
    gstNo: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    group: { type: String, required: true },
    status: { type: String, default: 'Active' }
}, { timestamps: true });

export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);