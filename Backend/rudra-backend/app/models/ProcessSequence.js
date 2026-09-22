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

const ProcessSequenceSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
    steps: [ProcessStepSchema], // Array of dynamic steps
    status: { type: String, default: 'In Progress' }
}, { timestamps: true });

export default mongoose.models.ProcessSequence || mongoose.model('ProcessSequence', ProcessSequenceSchema);