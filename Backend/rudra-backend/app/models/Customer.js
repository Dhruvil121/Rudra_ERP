// models/Customer.js
import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
    partyCode: { type: String, trim: true, uppercase: true }, // Unique Client Code (e.g., PC-101)
    firmName: { type: String, required: true },
    brandName: { type: String },
    alias: { type: String },
    defaultBox: { type: String },
    personalName: { type: String },
    mobileNo: { type: String, required: true },
    email: { type: String },
    gstNo: { type: String },
    panNo: { type: String },
    aadharNo: { type: String },
    address: { type: String },
    city: { type: String },
    area: { type: String },
    state: { type: String, default: 'Gujarat' },
    group: { type: String, required: true, default: 'sundry_debtors' },
    status: { type: String, default: 'Active' },
    regType: { type: String, default: 'Registered' },
    openingBalance: { type: Number, default: 0 },
    balanceType: { type: String, default: 'Debit' }
}, { timestamps: true });

export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
