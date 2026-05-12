const Razorpay = require('razorpay');

let cached = null;
let cachedKeyId = null;

// Returns a configured Razorpay instance or `null` when keys aren't set.
// Lazy so the server still boots cleanly with empty placeholders in .env.
function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;

  if (cached && cachedKeyId === key_id) return cached;
  cached = new Razorpay({ key_id, key_secret });
  cachedKeyId = key_id;
  return cached;
}

// Test hook: allow tests to swap in a mocked client.
function __setRazorpay(instance) {
  cached = instance;
  cachedKeyId = instance ? '__mock__' : null;
}

module.exports = { getRazorpay, __setRazorpay };
