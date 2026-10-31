const express = require('express');
const { protect, optionalProtect } = require('../middleware/auth');
const {
  createOrder,
  verifyOrder,
  getOrder,
  listMyOrders,
  getOrderConfirmation,
} = require('../controllers/orders');

const router = express.Router();

router.post('/create', optionalProtect, createOrder);
router.post('/verify', optionalProtect, verifyOrder);
router.get('/confirmation/:id', getOrderConfirmation);

router.use(protect);

router.get('/', listMyOrders);
router.get('/:id', getOrder);

module.exports = router;
