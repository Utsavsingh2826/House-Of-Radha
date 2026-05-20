const express = require('express');
const {
  register,
  login,
  getMe,
  updateMe,
  forgotPassword,
  resetPassword,
  adminLogin,
  adminCreateUser,
  adminListUsers
} = require('../controllers/auth');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);

router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);

// Admin-only endpoints
router.post('/admin-login', adminLogin);
router.post('/admin-create-user', protect, authorize('admin'), adminCreateUser);
router.get('/admin-users', protect, authorize('admin'), adminListUsers);

module.exports = router;

