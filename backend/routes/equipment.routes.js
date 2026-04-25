const express = require('express');
const equipment = require('../controllers/equipment.controller');

const router = express.Router();

router.get('/', equipment.getAllEquipment);
router.get('/search', equipment.searchEquipment);
router.get('/:id', equipment.getEquipmentById);
router.post('/', equipment.addEquipment);
router.put('/damage/:id', equipment.markAsDamaged);
router.put('/:id', equipment.updateEquipment);
router.delete('/:id', equipment.deleteEquipment);

module.exports = router;
