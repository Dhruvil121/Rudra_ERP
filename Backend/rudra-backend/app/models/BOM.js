import mongoose from 'mongoose';

const BOMItemSchema = new mongoose.Schema({
    // We store the ID to easily look up the component name later, though we might need a custom ref since Inventory subItems are embedded.
    inventorySubItemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    inventoryGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryGroup', required: true }, // Parent group
    quantity: { type: Number, required: true },
    unit: { type: String, required: true }, // e.g., 'pcs', 'kg', 'mtrs'
    remarks: { type: String }
});

const BOMSchema = new mongoose.Schema({
    finishedItemCode: { type: String, required: true, unique: true }, // Links to the Order Item rudraCode
    version: { type: String, default: '1.0' },
    isActive: { type: Boolean, default: true },
    components: [BOMItemSchema]
}, { timestamps: true });

export default mongoose.models.BOM || mongoose.model('BOM', BOMSchema);
