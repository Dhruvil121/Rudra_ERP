import mongoose from 'mongoose';

const ProcessStepSchema = new mongoose.Schema({
    stepId: { type: String, required: true },
    processName: { type: String, required: true }, // e.g., "Cutting", "Polish"
    processType: { type: String, required: true },
    partyName: { type: String },
    activeFields: [{ type: String }], // Array of field keys like ['inputQty', 'cutting', 'rate']
    fields: { type: mongoose.Schema.Types.Mixed }, // Dynamic object storing actual values
    inventoryItemId: { type: Number },
    inventoryQuantity: { type: Number }
});

const RejectedUsageSchema = new mongoose.Schema({
    inventoryGroupId: { type: String },
    inventorySubItemId: { type: String },
    itemCode: { type: String },
    itemName: { type: String },
    quantity: { type: Number, default: 0 },
    confirmed: { type: Boolean, default: false } // true after dispatch confirmation
});

const ProcessSequenceSchema = new mongoose.Schema({
    orderId: { type: String, required: true },
    orderItemId: { type: String },       // Links to specific order line item (_id) for multi-size support
    sizeVariant: { type: String },       // e.g., "4mm", "6mm" — for filtering in Process UI
    priority: { type: String, enum: ['normal', 'urgent'], default: 'normal' },
    steps: [ProcessStepSchema],          // Array of dynamic process steps
    status: { type: String, default: 'In Progress' }, // In Progress → Completed → Dispatched
    rejectedUsage: [RejectedUsageSchema], // Tracks rejected pieces pulled from inventory
    dispatchedAt: { type: Date }
}, { timestamps: true });

// Compound index: allows multiple sequences per order (one per size variant)
// but ensures each order+item combination is unique
ProcessSequenceSchema.index({ orderId: 1, orderItemId: 1 }, { unique: true, sparse: true });

export default mongoose.models.ProcessSequence || mongoose.model('ProcessSequence', ProcessSequenceSchema);