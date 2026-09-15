import mongoose from 'mongoose';

const ProcessBatchSchema = new mongoose.Schema({
    batchNo: { type: String, required: true, unique: true },
    rawMaterial: { type: String, required: true, default: 'casting' },
    turningWeightBefore: { type: Number },
    turningWeightAfter: { type: Number },
    buffingType: { type: String },
    platingType: { type: String },
    status: { type: String, default: 'pending' }, // pending, approved_turning, approved_buffing, completed
}, { timestamps: true });

export default mongoose.models.ProcessBatch || mongoose.model('ProcessBatch', ProcessBatchSchema);
