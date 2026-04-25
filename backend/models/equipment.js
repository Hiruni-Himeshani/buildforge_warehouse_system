const mongoose = require('mongoose');

// Allowed values for equipment status (used in enum validation)
const EQUIPMENT_STATUS = ['Available', 'Reserved', 'Damaged'];

/** Reserved location label for damaged stock (single warehouse trash zone). */
const TRASH_LOCATION = 'Trash';

/**
 * Equipment schema — inventory per rack/aisle in one warehouse.
 * - location: aisle/rack code (e.g. A-12, R3-B2). Use TRASH_LOCATION for damaged quarantine rows.
 * - itemId: optional SKU / asset tag for lookup.
 */
const equipmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  itemId: {
    type: String,
    trim: true,
    default: '',
  },
  category: {
    type: String,
    trim: true,
    default: '',
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  /** Units committed to approved orders (subset of quantity). */
  reservedQty: {
    type: Number,
    default: 0,
    min: 0,
  },
  location: {
    type: String,
    trim: true,
    default: '',
  },
  status: {
    type: String,
    enum: EQUIPMENT_STATUS,
    default: 'Available',
  },
  damagedQuantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Mongoose 9: document pre('validate') is promise-based; do not use next().
equipmentSchema.pre('validate', function validateReserved() {
  if (this.reservedQty > this.quantity) {
    throw new Error('reservedQty cannot exceed quantity');
  }
});

const Equipment = mongoose.model('Equipment', equipmentSchema);

module.exports = Equipment;
module.exports.EQUIPMENT_STATUS = EQUIPMENT_STATUS;
module.exports.TRASH_LOCATION = TRASH_LOCATION;
