const express = require('express');
const {
  listProducts,
  getProductBySku,
  createProduct,
  uploadProductImage,
  deleteProduct,
  getPricingConfig,
  updatePricingConfig,
} = require('../controllers/products');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public catalog endpoints — no auth required.
router.get('/', listProducts);
router.get('/pricing-config', protect, authorize('admin'), getPricingConfig);
router.get('/:sku', getProductBySku);

// Admin-only endpoints
router.post('/pricing-config', protect, authorize('admin'), updatePricingConfig);
router.post('/', protect, authorize('admin'), createProduct);
router.post('/upload', protect, authorize('admin'), uploadProductImage);
router.delete('/:sku', protect, authorize('admin'), deleteProduct);

module.exports = router;
