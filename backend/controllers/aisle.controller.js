const mongoose = require('mongoose');
const Aisle = require('../models/aisle');
const { totalQuantityAtLocation } = require('../utils/aisleCapacity');
const { TRASH_LOCATION } = require('../models/equipment');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

async function enrichAisle(doc) {
  const usedSpace = await totalQuantityAtLocation(doc.code, null);
  const o = doc.toObject();
  return {
    ...o,
    usedSpace,
    availableSpace: Math.max(0, doc.maxSpace - usedSpace),
  };
}

//list aisles(Get all): GET /api/aisles
const listAisles = async (req, res) => {
  try {
    const aisles = await Aisle.find().sort({ sortOrder: 1, code: 1 });
    const list = await Promise.all(aisles.map((a) => enrichAisle(a)));
    res.json({ message: 'OK', aisles: list });
  } catch (err) {
    console.error('listAisles error:', err);
    res.status(500).json({ message: 'Failed to load aisles' });
  }
};

//create Aisle: POST /api/aisles { code, label, maxSpace, sortOrder }
const createAisle = async (req, res) => {
  try {
    const { code, label, maxSpace, sortOrder } = req.body;
    const c = code !== undefined ? String(code).trim() : '';
    if (!c) {
      return res.status(400).json({ message: 'Aisle code is required' });
    }
    if (c === TRASH_LOCATION) {
      return res.status(400).json({ message: `Cannot use reserved code "${TRASH_LOCATION}"` });
    }
    const max = Number(maxSpace);
    if (Number.isNaN(max) || max < 1) {
      return res.status(400).json({ message: 'maxSpace must be at least 1' });
    }

    const aisle = await Aisle.create({
      code: c,
      label: label !== undefined ? String(label).trim() : '',
      maxSpace: max,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
    });

    res.status(201).json({ message: 'Aisle created', aisle: await enrichAisle(aisle) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'An aisle with this code already exists' });
    }
    console.error('createAisle error:', err);
    res.status(500).json({ message: 'Failed to create aisle' });
  }
};

//update Aisle: PUT /api/aisles/:id { label, maxSpace, sortOrder }
const updateAisle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid aisle id' });
    }

    const { label, maxSpace, sortOrder } = req.body;
    const aisle = await Aisle.findById(id);
    if (!aisle) {
      return res.status(404).json({ message: 'Aisle not found' });
    }

    if (maxSpace !== undefined) {
      const max = Number(maxSpace);
      if (Number.isNaN(max) || max < 1) {
        return res.status(400).json({ message: 'maxSpace must be at least 1' });
      }
      const used = await totalQuantityAtLocation(aisle.code, null);
      if (max < used) {
        return res.status(400).json({
          message: `maxSpace cannot be less than current stock (${used} units already in this aisle).`,
        });
      }
      aisle.maxSpace = max;
    }
    if (label !== undefined) aisle.label = String(label).trim();
    if (sortOrder !== undefined) aisle.sortOrder = Number(sortOrder);

    await aisle.save();
    res.json({ message: 'Aisle updated', aisle: await enrichAisle(aisle) });
  } catch (err) {
    console.error('updateAisle error:', err);
    res.status(500).json({ message: 'Failed to update aisle' });
  }
};

//delete Aisle: DELETE /api/aisles/:id
const deleteAisle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid aisle id' });
    }

    const aisle = await Aisle.findById(id);
    if (!aisle) {
      return res.status(404).json({ message: 'Aisle not found' });
    }

    const used = await totalQuantityAtLocation(aisle.code, null);
    if (used > 0) {
      return res.status(400).json({
        message: `Cannot delete aisle while ${used} units are still stored there. Move or remove inventory first.`,
      });
    }

    await Aisle.findByIdAndDelete(id);
    res.json({ message: 'Aisle deleted' });
  } catch (err) {
    console.error('deleteAisle error:', err);
    res.status(500).json({ message: 'Failed to delete aisle' });
  }
};

module.exports = {
  listAisles,
  createAisle,
  updateAisle,
  deleteAisle,
};
