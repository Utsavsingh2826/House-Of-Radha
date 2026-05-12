const express = require('express');
const {
  register,
  login,
  getMe,
  updateMe,
  forgotPassword,
  resetPassword,
} = require('../controllers/auth');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);

router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);

module.exports = router;
