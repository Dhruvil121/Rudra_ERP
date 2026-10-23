import mongoose from 'mongoose';

const AssemblySchema = new mongoose.Schema({
    batchNo: { type: String, required: true },
    orderId: { type: String },
    piNo: { type: String },
    customerName: { type: String },
    partyCode: { type: String },
    finishedItemCode: { type: String, required: true, uppercase: true, trim: true }, // Rudra Code
    productName: { type: String },
    assembledSets: { type: Number, required: true },
    piecesPerBox: { type: Number, default: 1 },
    totalBoxes: { type: Number, default: 0 },
    stockSource: {
        type: String,
        enum: ['buffing', 'inventory'],
        default: 'buffing'
    }, // 'buffing' (Process WIP) | 'inventory' (Master Inventory)
    inHouseConsumed: [{
        fieldName: String,
        partCode: String,
        requiredPieces: Number
    }],
    afterMarketConsumed: [{
        inventorySubItemId: String,
        materialName: String,
        materialCode: String,
        consumedQty: Number,
        unit: String
    }],
    remarks: { type: String },
    status: { type: String, default: 'Completed' }
}, { timestamps: true });

export default mongoose.models.Assembly || mongoose.model('Assembly', AssemblySchema);