import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
    rudraCode: String,
    partyCode: String,
    finishing: String,
    color: String,
    hsnSac: String,
    size: String,
    qty: String,
    priority: { type: String, enum: ['normal', 'urgent'], default: 'normal' }
});

const OrderSchema = new mongoose.Schema({
    piNo: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    partyCode: String,
    date: String,
    brandName: String,
    box: String,
    city: String,
    remarks: String,
    status: { type: String, default: 'Pending' }, // Pending → Approved → Dispatched
    orderPriority: { type: String, enum: ['normal', 'urgent', 'mixed'], default: 'normal' },
    inventorySynced: { type: Boolean, default: false },
    inventorySyncedAt: { type: Date },
    items: [OrderItemSchema]
}, { timestamps: true });

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);