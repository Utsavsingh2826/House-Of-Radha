const express = require('express');
const { listProducts, getProductBySku } = require('../controllers/products');

const router = express.Router();

// Public catalog endpoints — no auth required.
router.get('/', listProducts);
router.get('/:sku', getProductBySku);

module.exports = router;
