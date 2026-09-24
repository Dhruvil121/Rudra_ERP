import mongoose from 'mongoose';

const SubItemSchema = new mongoose.Schema({
    itemCode: { type: String, required: true }, // e.g., RM-001, FG-050
    name: { type: String, required: true },
    category: { type: String, enum: ['Raw Material', 'Finished Good', 'Consumable', 'Component'], default: 'Raw Material' },
    uom: { type: String, required: true, default: 'Pcs' }, // Unit of Measure
    unitCost: { type: Number, default: 0 }, // Cost per unit for BOM and Valuation
    details: { type: String },
    stock: { type: Number, default: 0 }
});

const InventoryGroupSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    groupName: { type: String, required: true },
    details: { type: String },
    subItems: [SubItemSchema]
}, { timestamps: true });

export default mongoose.models.InventoryGroup || mongoose.model('InventoryGroup', InventoryGroupSchema);