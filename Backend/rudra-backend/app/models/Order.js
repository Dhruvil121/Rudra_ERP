import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
    rudraCode: { type: String },
    partyCode: { type: String },
    finishing: { type: String },
    color: { type: String },
    hsnSac: { type: String },
    size: { type: String },
    qty: { type: String },
}, { _id: false });

const OrderSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true }, // PI number e.g. PI-1001
    name: { type: String, required: true },
    partyCode: { type: String },
    date: { type: Date, default: Date.now },
    brandName: { type: String },
    box: { type: String },
    city: { type: String },
    remarks: { type: String },
    items: [OrderItemSchema],
    status: { type: String, default: 'draft' }, // draft, confirmed, processing, completed
}, { timestamps: true });

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
