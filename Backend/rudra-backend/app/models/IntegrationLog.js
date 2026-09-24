import mongoose from 'mongoose';

const IntegrationLogSchema = new mongoose.Schema({
    source: { 
        type: String, 
        required: true 
    },
    event: {
        type: String,
        required: true
    },
    externalLeadId: {
        type: String
    },
    status: {
        type: String,
        required: true,
        enum: ['SUCCESS', 'DUPLICATE', 'ERROR', 'IGNORED']
    },
    error: {
        type: String
    },
    processingTimeMs: {
        type: Number
    }
}, { timestamps: true });

export default mongoose.models.IntegrationLog || mongoose.model('IntegrationLog', IntegrationLogSchema);
