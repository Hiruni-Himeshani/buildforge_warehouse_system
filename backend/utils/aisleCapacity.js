const mongoose = require('mongoose');
const Equipment = require('../models/equipment');
const Aisle = require('../models/aisle');
const { TRASH_LOCATION } = Equipment;

/**
 * Sum of quantities stored at this location (excluding one equipment doc if updating).
 */
async function totalQuantityAtLocation(locationCode, excludeEquipmentId) {
  const code = String(locationCode || '').trim();
  if (!code || code === TRASH_LOCATION) return 0;

  const match = { location: code };
  if (excludeEquipmentId && mongoose.Types.ObjectId.isValid(excludeEquipmentId)) {
    match._id = { $ne: new mongoose.Types.ObjectId(excludeEquipmentId) };
  }

  const r = await Equipment.aggregate([
    { $match: match },
    { $group: { _id: null, t: { $sum: '$quantity' } } },
  ]);
  return r[0]?.t || 0;
}

/**
 * If an Aisle exists for `locationCode`, ensure used + additionalQty <= maxSpace.
 * When no aisle is defined for that code, storage is unlimited (backward compatible).
 */
async function assertFitsInAisle(locationCode, additionalQty, excludeEquipmentId) {
  const code = String(locationCode || '').trim();
  const qty = Number(additionalQty);
  if (!code || code === TRASH_LOCATION) {
    return { ok: true };
  }
  if (Number.isNaN(qty) || qty < 0) {
    return { ok: false, message: 'Invalid quantity for capacity check' };
  }

  const aisle = await Aisle.findOne({ code });
  if (!aisle) {
    return { ok: true };
  }

  const used = await totalQuantityAtLocation(code, excludeEquipmentId);
  const available = aisle.maxSpace - used;
  if (used + qty > aisle.maxSpace) {
    return {
      ok: false,
      message: `Aisle "${code}" does not have enough space: ${used}/${aisle.maxSpace} used, ${available} free (you need ${qty}).`,
      used,
      maxSpace: aisle.maxSpace,
      available,
    };
  }

  return {
    ok: true,
    used,
    maxSpace: aisle.maxSpace,
    available: available - qty,
  };
}

module.exports = {
  totalQuantityAtLocation,
  assertFitsInAisle,
};
