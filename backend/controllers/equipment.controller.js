const mongoose = require('mongoose');
const Equipment = require('../models/equipment');
const { TRASH_LOCATION } = Equipment;
const { assertFitsInAisle } = require('../utils/aisleCapacity');

// Helper: check if id string is a valid MongoDB ObjectId
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normItemId = (v) => (v !== undefined && v !== null ? String(v).trim() : '');

// Create new equipment
const addEquipment = async (req, res) => {
  try {
    const { name, itemId, category, quantity, location, status, damagedQuantity } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (quantity === undefined || quantity === null || Number(quantity) < 0) {
      return res.status(400).json({ message: 'Quantity is required and must be 0 or greater' });
    }

    const loc = location !== undefined ? String(location).trim() : '';
    if (loc === TRASH_LOCATION) {
      return res.status(400).json({
        message: `Use "${TRASH_LOCATION}" only via marking items damaged; pick a rack/aisle for new stock.`,
      });
    }

    const fit = await assertFitsInAisle(loc, Number(quantity), null);
    if (!fit.ok) {
      return res.status(400).json({ message: fit.message });
    }

    const equipment = await Equipment.create({
      name: name.trim(),
      itemId: normItemId(itemId),
      category: category !== undefined ? String(category).trim() : '',
      quantity: Number(quantity),
      location: loc,
      status: status || undefined,
      damagedQuantity:
        damagedQuantity !== undefined && damagedQuantity !== null
          ? Number(damagedQuantity)
          : 0,
    });

    res.status(201).json({
      message: 'Equipment created',
      equipment,
    });
  } catch (err) {
    console.error('addEquipment error:', err);
    res.status(500).json({ message: 'Failed to create equipment' });
  }
};

// Search by name or itemId (case-insensitive partial match)
const searchEquipment = async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 1) {
      return res.status(400).json({ message: 'Query ?q= is required (name or item ID)' });
    }

    const safe = escapeRegex(q);
    const list = await Equipment.find({
      $or: [{ name: new RegExp(safe, 'i') }, { itemId: new RegExp(safe, 'i') }],
    })
      .sort({ location: 1, name: 1 })
      .limit(50);

    res.json({ message: 'OK', count: list.length, equipment: list });
  } catch (err) {
    console.error('searchEquipment error:', err);
    res.status(500).json({ message: 'Search failed' });
  }
};

// Get all equipment
const getAllEquipment = async (req, res) => {
  try {
    const list = await Equipment.find().sort({ location: 1, name: 1, itemId: 1 });
    res.json({ message: 'OK', count: list.length, equipment: list });
  } catch (err) {
    console.error('getAllEquipment error:', err);
    res.status(500).json({ message: 'Failed to fetch equipment' });
  }
};

// Get one equipment by id
const getEquipmentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid equipment id' });
    }

    const equipment = await Equipment.findById(id);
    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    res.json({ message: 'OK', equipment });
  } catch (err) {
    console.error('getEquipmentById error:', err);
    res.status(500).json({ message: 'Failed to fetch equipment' });
  }
};

// Update equipment details (general fields from body)
const updateEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid equipment id' });
    }

    const { name, itemId, category, quantity, location, status, damagedQuantity } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = String(name).trim();
    if (itemId !== undefined) updates.itemId = normItemId(itemId);
    if (category !== undefined) updates.category = String(category).trim();
    if (quantity !== undefined) updates.quantity = Number(quantity);
    if (location !== undefined) {
      const loc = String(location).trim();
      if (loc === TRASH_LOCATION) {
        return res.status(400).json({
          message: `Do not set location to "${TRASH_LOCATION}" manually; use Mark damaged instead.`,
        });
      }
      updates.location = loc;
    }
    if (status !== undefined) updates.status = status;
    if (damagedQuantity !== undefined) updates.damagedQuantity = Number(damagedQuantity);

    if (updates.quantity !== undefined && updates.quantity < 0) {
      return res.status(400).json({ message: 'Quantity cannot be negative' });
    }
    if (updates.damagedQuantity !== undefined && updates.damagedQuantity < 0) {
      return res.status(400).json({ message: 'damagedQuantity cannot be negative' });
    }

    const existing = await Equipment.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    const newLoc =
      updates.location !== undefined
        ? String(updates.location).trim()
        : (existing.location || '').trim();
    const newQty =
      updates.quantity !== undefined ? Number(updates.quantity) : existing.quantity;

    const fit = await assertFitsInAisle(newLoc, newQty, id);
    if (!fit.ok) {
      return res.status(400).json({ message: fit.message });
    }

    const equipment = await Equipment.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ message: 'Equipment updated', equipment });
  } catch (err) {
    console.error('updateEquipment error:', err);
    res.status(500).json({ message: 'Failed to update equipment' });
  }
};

// Delete equipment record
const deleteEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid equipment id' });
    }

    const equipment = await Equipment.findByIdAndDelete(id);
    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    res.json({ message: 'Equipment deleted', equipment });
  } catch (err) {
    console.error('deleteEquipment error:', err);
    res.status(500).json({ message: 'Failed to delete equipment' });
  }
};

// Update stock quantity (only the quantity field)
const updateStockQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid equipment id' });
    }

    const { quantity } = req.body;
    if (quantity === undefined || quantity === null || Number(quantity) < 0) {
      return res.status(400).json({ message: 'quantity is required and must be 0 or greater' });
    }

    const existing = await Equipment.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    const fit = await assertFitsInAisle(
      (existing.location || '').trim(),
      Number(quantity),
      id
    );
    if (!fit.ok) {
      return res.status(400).json({ message: fit.message });
    }

    const equipment = await Equipment.findByIdAndUpdate(
      id,
      { quantity: Number(quantity) },
      { new: true, runValidators: true }
    );

    res.json({ message: 'Stock quantity updated', equipment });
  } catch (err) {
    console.error('updateStockQuantity error:', err);
    res.status(500).json({ message: 'Failed to update stock quantity' });
  }
};

// Change location only
const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid equipment id' });
    }

    const { location } = req.body;
    if (location === undefined || location === null) {
      return res.status(400).json({ message: 'location is required' });
    }

    const loc = String(location).trim();
    if (loc === TRASH_LOCATION) {
      return res.status(400).json({
        message: `Use Mark damaged to move stock to "${TRASH_LOCATION}".`,
      });
    }

    const existing = await Equipment.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    const fit = await assertFitsInAisle(loc, existing.quantity, id);
    if (!fit.ok) {
      return res.status(400).json({ message: fit.message });
    }

    const equipment = await Equipment.findByIdAndUpdate(
      id,
      { location: loc },
      { new: true, runValidators: true }
    );

    res.json({ message: 'Location updated', equipment });
  } catch (err) {
    console.error('updateLocation error:', err);
    res.status(500).json({ message: 'Failed to update location' });
  }
};

// Damaged units: deduct from this rack row and add to a Trash location row (same name + itemId)
const markAsDamaged = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid equipment id' });
    }

    let amount = req.body.amount !== undefined ? Number(req.body.amount) : 1;
    if (Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number' });
    }

    const equipment = await Equipment.findById(id);
    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    const loc = (equipment.location || '').trim();
    if (loc === TRASH_LOCATION) {
      return res.status(400).json({ message: 'This row is already in Trash' });
    }

    const newQuantity = equipment.quantity - amount;
    if (newQuantity < 0) {
      return res.status(400).json({
        message: 'Not enough quantity at this location to move to Trash',
      });
    }

    equipment.quantity = newQuantity;
    await equipment.save();

    const idKey = normItemId(equipment.itemId);
    const trashFilter = {
      name: equipment.name,
      itemId: idKey,
      location: TRASH_LOCATION,
    };

    let trashRow = await Equipment.findOne(trashFilter);
    if (!trashRow) {
      trashRow = await Equipment.create({
        name: equipment.name,
        itemId: idKey,
        category: equipment.category || '',
        quantity: amount,
        location: TRASH_LOCATION,
        status: 'Damaged',
        damagedQuantity: 0,
      });
    } else {
      trashRow.quantity += amount;
      trashRow.status = 'Damaged';
      await trashRow.save();
    }

    res.json({
      message: `Moved ${amount} unit(s) to ${TRASH_LOCATION}`,
      equipment,
      trashRow,
    });
  } catch (err) {
    console.error('markAsDamaged error:', err);
    res.status(500).json({ message: 'Failed to mark equipment as damaged' });
  }
};

module.exports = {
  addEquipment,
  searchEquipment,
  getAllEquipment,
  getEquipmentById,
  updateEquipment,
  deleteEquipment,
  updateStockQuantity,
  updateLocation,
  markAsDamaged,
};
