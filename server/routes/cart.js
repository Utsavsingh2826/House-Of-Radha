const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require('../controllers/cart');

const router = express.Router();

router.use(protect);

router.get('/', getCart);
router.post('/', addToCart);
router.delete('/', clearCart);
router.patch('/:sku', updateCartItem);
router.delete('/:sku', removeFromCart);

module.exports = router;
