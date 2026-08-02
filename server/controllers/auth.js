const crypto = require('crypto');
const User = require('../models/User');
const AdminUser = require('../models/AdminUser');
const jwt = require('jsonwebtoken');
const { sendEmail, isSmtpConfigured, resetPasswordTemplate } = require('../utils/sendEmail');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const user = await User.create({
      firstName,
      lastName,
      email,
      password
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide an email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// Public regular user shape — never leaks the password hash or reset-token internals.
const publicUser = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone || '',
  address: user.address || {},
  role: user.role,
  createdAt: user.createdAt,
});

// Public admin user shape — only essential admin fields
const publicAdminUser = (admin) => ({
  id: admin._id,
  firstName: admin.firstName,
  lastName: admin.lastName,
  email: admin.email,
  role: admin.role,
  createdAt: admin.createdAt,
});

const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });

  const options = {
    expires: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: publicUser(user),
    });
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  res.status(200).json({ success: true, data: publicUser(user) });
};

// @desc    Update current user (profile)
// @route   PATCH /api/auth/me
// @access  Private
exports.updateMe = async (req, res) => {
  try {
    const allowed = ['firstName', 'lastName', 'phone', 'address'];
    const patch = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        patch[key] = req.body[key];
      }
    }

    // Normalise phone — strip everything except digits so callers can send
    // "93216 36155" or "+91 9876543210" and we store the canonical 10-digit form.
    if (typeof patch.phone === 'string') {
      patch.phone = patch.phone.replace(/\D/g, '');
    }

    // Address is a nested doc — replace the whole subdoc so removed fields clear.
    if (patch.address && typeof patch.address === 'object') {
      const rawPin = String(patch.address.pincode || '');
      patch.address = {
        line1: patch.address.line1 || '',
        line2: patch.address.line2 || '',
        city: patch.address.city || '',
        state: patch.address.state || '',
        pincode: rawPin.replace(/\D/g, ''),
        country: patch.address.country || 'India',
      };
    }

    const user = await User.findByIdAndUpdate(req.user.id, patch, {
      new: true,
      runValidators: true,
      context: 'query',
    });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    return res.status(200).json({ success: true, data: publicUser(user) });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Forgot password — emails a reset link
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  const { email } = req.body || {};
  const genericResponse = {
    success: true,
    message: 'If an account exists for this email, a reset link has been sent.',
  };

  try {
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    if (!isSmtpConfigured()) {
      return res
        .status(503)
        .json({ success: false, error: 'Email service not configured' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Anti-enumeration: don't reveal whether the email exists.
      return res.status(200).json(genericResponse);
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const base = (process.env.RESET_URL || 'https://houseofradha.com/reset-password').replace(/\/$/, '');
    const resetUrl = `${base}/${resetToken}`;
    const tmpl = resetPasswordTemplate({ firstName: user.firstName, resetUrl });

    try {
      await sendEmail({ to: user.email, ...tmpl });
    } catch (mailErr) {
      // Clear token so a retry can issue a fresh one.
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res
        .status(500)
        .json({ success: false, error: 'Could not send reset email' });
    }

    return res.status(200).json(genericResponse);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Reset password using emailed token
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password || String(password).length < 6) {
      return res
        .status(400)
        .json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const hashed = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid or expired token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return sendTokenResponse(user, 200, res);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Admin login with brute-force lock protection
// @route   POST /api/auth/admin-login
// @access  Public
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide an email and password' });
    }

    const admin = await AdminUser.findOne({ email }).select('+password');

    if (!admin) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check if account is locked
    if (admin.isLocked()) {
      const timeLeft = Math.ceil((admin.lockUntil - Date.now()) / 1000 / 60); // minutes
      return res.status(423).json({
        success: false,
        error: `Account is locked. Please try again after ${timeLeft} minute(s).`,
        isLocked: true,
      });
    }

    const isMatch = await admin.matchPassword(password);

    if (!isMatch) {
      admin.loginAttempts += 1;
      let errorMsg = 'Invalid credentials';
      let isLocked = false;

      if (admin.loginAttempts >= 5) {
        admin.lockUntil = Date.now() + 15 * 60 * 1000; // 15 mins lock
        errorMsg = 'Account locked due to 5 failed attempts. Please wait 15 minutes.';
        isLocked = true;
      } else {
        const remaining = 5 - admin.loginAttempts;
        errorMsg = `Invalid credentials. ${remaining} attempt(s) remaining before lock.`;
      }

      await admin.save();
      return res.status(401).json({ success: false, error: errorMsg, isLocked, remainingAttempts: 5 - admin.loginAttempts });
    }

    // Reset login attempts on success
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    await admin.save();

    // Send admin-specific token response
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });

    const options = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
      options.secure = true;
    }

    res
      .status(200)
      .cookie('token', token, options)
      .json({
        success: true,
        token,
        user: publicAdminUser(admin),
      });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Admin create user (regular or admin)
// @route   POST /api/auth/admin-create-user
// @access  Private/Admin
exports.adminCreateUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ success: false, error: 'Please provide all required fields' });
    }

    if (role === 'admin') {
      const existing = await AdminUser.findOne({ email });
      if (existing) {
        return res.status(400).json({ success: false, error: 'Email already registered as admin' });
      }

      const admin = await AdminUser.create({ firstName, lastName, email, password });
      return res.status(201).json({ success: true, data: publicUser(admin) });
    } else {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ success: false, error: 'Email already registered' });
      }

      const user = await User.create({ firstName, lastName, email, password });
      return res.status(201).json({ success: true, data: publicUser(user) });
    }
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Admin list all users
// @route   GET /api/auth/admin-users
// @access  Private/Admin
exports.adminListUsers = async (req, res) => {
  try {
    const users = await User.find({});
    const admins = await AdminUser.find({});

    const allUsers = [
      ...users.map(u => ({ ...publicUser(u), role: 'user' })),
      ...admins.map(a => ({ ...publicUser(a), role: 'admin' })),
    ];

    res.status(200).json({ success: true, count: allUsers.length, data: allUsers });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
