// models/Inventory.js
import mongoose from 'mongoose';

const SubItemSchema = new mongoose.Schema({
    itemCode: { type: String, required: true },
    name: { type: String, required: true },
    category: {
        type: String,
        enum: ['Raw Material', 'Semi-Finished', 'After-Market', 'Finished Good', 'Consumable', 'Component', 'Rejected'],
        default: 'Raw Material'
    },
    inventoryType: {
        type: String,
        enum: ['process', 'aftermarket'],
        default: 'process'
    },
    uom: { type: String, required: true, default: 'Pcs' },
    unitCost: { type: Number, default: 0 },
    details: { type: String },
    stock: { type: Number, default: 0 },
    reservedInProcess: { type: Number, default: 0 } // Soft-reserved rejected pieces used in active (not yet dispatched) orders
});

const InventoryGroupSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    groupName: { type: String, required: true },
    details: { type: String },
    subItems: [SubItemSchema]
}, { timestamps: true });

export default mongoose.models.InventoryGroup || mongoose.model('InventoryGroup', InventoryGroupSchema);