import mongoose from 'mongoose';

const SubItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    details: { type: String },
    stock: { type: Number, default: 0 },
});

const InventoryGroupSchema = new mongoose.Schema({
    groupName: { type: String, required: true },
    details: { type: String },
    stockGv: { type: String }, // e.g. '₹ 45,000'
    subItems: [SubItemSchema],
}, { timestamps: true });

export default mongoose.models.InventoryGroup || mongoose.model('InventoryGroup', InventoryGroupSchema);
