const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const CartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    qty: { type: Number, default: 1, min: 1, max: 10 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AddressSchema = new mongoose.Schema(
  {
    line1: { type: String, default: '' },
    line2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: {
      type: String,
      default: '',
      validate: {
        validator: (v) => v === '' || /^\d{6}$/.test(v),
        message: 'Please add a valid 6-digit pincode',
      },
    },
    country: { type: String, default: 'India' },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please add a first name']
  },
  lastName: {
    type: String,
    required: [true, 'Please add a last name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  phone: {
    type: String,
    default: '',
    validate: {
      validator: (v) => v === '' || /^[6-9]\d{9}$/.test(v),
      message: 'Please add a valid 10-digit phone',
    },
  },
  address: { type: AddressSchema, default: () => ({}) },
  cart: { type: [CartItemSchema], default: [] },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpire: { type: Date, select: false },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt. Mongoose 8+ drives async hooks via the
// returned promise, so this function is async-only (no `next` callback).
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password reset token.
// Stores the SHA-256 hash + 10-min expiry on the user, returns the plain
// token (only ever sent in the email link, never stored).
UserSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model('User', UserSchema);
