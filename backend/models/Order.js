const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },    customerName: { type: String, required: true },
    itemsRequested: [{
        equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' },
        itemName: String,
        qty: Number,
        pickedQty: { type: Number, default: 0 }
    }],
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Dispatched', 'Picking', 'Ready for Gate Pass', 'Backordered', 'Cancelled'], default: 'Pending' },    driverName: String,
    cancellationCategory: String,
    cancellationReason: String,
    cancelledAt: Date,
    vehicleNumber: String,
    vehicleType: String,
    dispatchLocation: String,
    // Picking workflow
    pickingStartedAt: Date,
    pickingCompletedAt: Date,
    pickedBy: String, // warehouse staff name
    // Gate pass
    gatePassNumber: String,
    generatedAt: Date,
    // Stock movement history
    stockMovements: [{
        timestamp: { type: Date, default: Date.now },
        itemName: String,
        qty: Number,
        action: { type: String, enum: ['Reserved', 'Picked', 'Dispatched', 'Damaged', 'Returned'] },
        notes: String
    }],
    // Damage reports
    damageReports: [{
        timestamp: { type: Date, default: Date.now },
        itemName: String,
        qty: Number,
        reason: String,
        reportedBy: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);