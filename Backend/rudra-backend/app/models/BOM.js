import mongoose from 'mongoose';

// Section 1: In-House Factory Parts -> Process Module
const InHousePartSchema = new mongoose.Schema({
    fieldName: { type: String, required: true }, // e.g., "Round Dabi", "Key Hole"
    partCode: { type: String },
    inventoryGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryGroup' },
    inventorySubItemId: { type: mongoose.Schema.Types.ObjectId },
    qtyInPieces: { type: Number, required: true, default: 1 },
    weightPerPcGrams: { type: Number, default: 0 },
    processName: { type: String }
});

// Section 2: After-Market Requirements (Bolt & Fitting Kit) -> Inventory Module
const BOMItemSchema = new mongoose.Schema({
    fieldName: { type: String },
    inventorySubItemId: { type: mongoose.Schema.Types.ObjectId },
    inventoryGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryGroup' },
    quantity: { type: Number, required: true, default: 1 },
    rate: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    unit: { type: String, required: true, default: 'Pcs' },
    remarks: { type: String }
});

// Section 3: Packaging Requirements (Paking - Bags, Print Boxes, Cartons, Bhida Pati)
const PackagingItemSchema = new mongoose.Schema({
    fieldName: { type: String, required: true }, // e.g. "Cloth Bag Mortish", "Print Box", "Cartun", "Bhida Pati"
    inventorySubItemId: { type: mongoose.Schema.Types.ObjectId },
    inventoryGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryGroup' },
    quantity: { type: Number, required: true, default: 1 },
    rate: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    unit: { type: String, default: 'Pcs' },
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
    components: [BOMItemSchema], // After-Market / Fitting Kit
    packaging: [PackagingItemSchema] // Packaging Requirements
}, { timestamps: true });

export default mongoose.models.BOM || mongoose.model('BOM', BOMSchema);
