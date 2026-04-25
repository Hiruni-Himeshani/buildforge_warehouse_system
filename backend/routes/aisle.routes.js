const express = require('express');
const aisle = require('../controllers/aisle.controller');

const router = express.Router();

router.get('/', aisle.listAisles);
router.post('/', aisle.createAisle);
router.put('/:id', aisle.updateAisle);
router.delete('/:id', aisle.deleteAisle);

module.exports = router;
