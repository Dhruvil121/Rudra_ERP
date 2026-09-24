import mongoose from 'mongoose';

const LeadSchema = new mongoose.Schema({
    source: { 
        type: String, 
        required: true,
        enum: ['INDIAMART', 'JUSTDIAL', 'TRADEINDIA', 'WEBSITE', 'WHATSAPP', 'OTHER']
    },
    externalLeadId: { 
        type: String, 
        required: true 
    },
    customerName: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String },
    company: { type: String },
    product: { type: String },
    message: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    status: { 
        type: String, 
        default: 'NEW',
        enum: ['NEW', 'CONTACTED', 'FOLLOW_UP', 'QUOTED', 'WON', 'LOST']
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rawPayload: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// Compound unique index to prevent duplicate leads from the same source
LeadSchema.index({ source: 1, externalLeadId: 1 }, { unique: true });

export default mongoose.models.Lead || mongoose.model('Lead', LeadSchema);
