import mongoose from 'mongoose';

// Left Side of Diagram: In-House Factory Parts -> Process Module
const InHousePartSchema = new mongoose.Schema({
    fieldName: { type: String, required: true }, // e.g., "Round Dabi", "Key Hole"
    partCode: { type: String },
    inventoryGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryGroup' },
    inventorySubItemId: { type: mongoose.Schema.Types.ObjectId },
    qtyInPieces: { type: Number, required: true, default: 1 },
    weightPerPcGrams: { type: Number, default: 0 },
    processName: { type: String }
});

// Right Side of Diagram: After-Market Requirements -> Inventory Module
const BOMItemSchema = new mongoose.Schema({
    fieldName: { type: String },
    inventorySubItemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    inventoryGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryGroup', required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true, default: 'Pcs' },
    remarks: { type: String }
});

const BOMSchema = new mongoose.Schema({
    finishedItemCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    productName: { type: String },
    defaultSize: { type: String },
    defaultFinishing: { type: String },
    hsnSac: { type: String },
    version: { type: String, default: '1.0' },
    isActive: { type: Boolean, default: true },
    inHouseParts: [InHousePartSchema],
    components: [BOMItemSchema]
}, { timestamps: true });

export default mongoose.models.BOM || mongoose.model('BOM', BOMSchema);