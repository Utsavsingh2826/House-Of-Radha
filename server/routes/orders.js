const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createOrder,
  verifyOrder,
  getOrder,
  listMyOrders,
} = require('../controllers/orders');

const router = express.Router();

router.use(protect);

router.post('/create', createOrder);
router.post('/verify', verifyOrder);
router.get('/', listMyOrders);
router.get('/:id', getOrder);

module.exports = router;
