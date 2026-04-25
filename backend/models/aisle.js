const mongoose = require('mongoose');
const { TRASH_LOCATION } = require('./equipment');

//Simple REST: /api/aisles (see backend/routes/aisle.routes.js) — frontend calls use axios like StockMovementHistory.
 
const aisleSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  label: {
    type: String,
    trim: true,
    default: '',
  },
  maxSpace: {
    type: Number,
    required: true,
    min: 1,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

aisleSchema.path('code').validate(function (v) {
  return String(v).trim() !== TRASH_LOCATION;
}, `Code cannot be "${TRASH_LOCATION}" (reserved for damaged stock).`);

const Aisle = mongoose.model('Aisle', aisleSchema);

module.exports = Aisle;
