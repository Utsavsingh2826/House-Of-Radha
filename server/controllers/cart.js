const User = require('../models/User');
const Product = require('../models/Product');

// Shape the populated cart into a stable response the frontend consumes:
//   { items: [{ sku, name, image, priceAmount, priceDisplay, qty, lineTotal }],
//     count, total }
// count = sum of qty across lines (drives navbar badge).
// total = sum of priceAmount * qty in INR rupees (prices are all-inclusive).
const buildCartPayload = (user) => {
  const items = (user.cart || [])
    .filter((line) => line.product) // drop dangling refs to deleted products
    .map((line) => {
      const p = line.product;
      const priceAmount = Number(p.priceAmount) || 0;
      return {
        sku: p.sku,
        name: p.name,
        image: p.image,
        priceAmount,
        priceDisplay: p.priceDisplay || `Rs. ${priceAmount}`,
        qty: line.qty,
        lineTotal: priceAmount * line.qty,
        addedAt: line.addedAt,
      };
    });

  const count = items.reduce((acc, l) => acc + l.qty, 0);
  const total = items.reduce((acc, l) => acc + l.lineTotal, 0);

  return { items, count, total };
};

const loadCart = (userId) =>
  User.findById(userId).populate('cart.product');

// GET /api/cart
exports.getCart = async (req, res) => {
  try {
    const user = await loadCart(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    return res.status(200).json({ success: true, data: buildCartPayload(user) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/cart  body: { sku, qty? }
exports.addToCart = async (req, res) => {
  try {
    const { sku } = req.body;
    let qty = parseInt(req.body.qty, 10);
    if (!Number.isFinite(qty) || qty < 1) qty = 1;
    if (qty > 10) qty = 10;

    if (!sku) return res.status(400).json({ success: false, error: 'SKU is required' });

    const product = await Product.findOne({ sku: String(sku).toUpperCase(), available: true });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const existing = user.cart.find((l) => l.product && String(l.product) === String(product._id));
    if (existing) {
      existing.qty = Math.min(10, existing.qty + qty);
    } else {
      user.cart.push({ product: product._id, qty });
    }
    await user.save();

    const populated = await loadCart(user._id);
    return res.status(200).json({ success: true, data: buildCartPayload(populated) });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

// PATCH /api/cart/:sku  body: { qty }
// qty <= 0 removes the line.
exports.updateCartItem = async (req, res) => {
  try {
    const { sku } = req.params;
    const qty = parseInt(req.body.qty, 10);
    if (!Number.isFinite(qty)) {
      return res.status(400).json({ success: false, error: 'qty must be a number' });
    }

    const product = await Product.findOne({ sku: String(sku).toUpperCase() });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const idx = user.cart.findIndex(
      (l) => l.product && String(l.product) === String(product._id)
    );
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Item not in cart' });
    }

    if (qty <= 0) {
      user.cart.splice(idx, 1);
    } else {
      user.cart[idx].qty = Math.min(10, qty);
    }
    await user.save();

    const populated = await loadCart(user._id);
    return res.status(200).json({ success: true, data: buildCartPayload(populated) });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

// DELETE /api/cart/:sku
exports.removeFromCart = async (req, res) => {
  try {
    const { sku } = req.params;
    const product = await Product.findOne({ sku: String(sku).toUpperCase() });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    user.cart = user.cart.filter(
      (l) => !(l.product && String(l.product) === String(product._id))
    );
    await user.save();

    const populated = await loadCart(user._id);
    return res.status(200).json({ success: true, data: buildCartPayload(populated) });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

// DELETE /api/cart
exports.clearCart = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    user.cart = [];
    await user.save();
    return res.status(200).json({ success: true, data: { items: [], count: 0, total: 0 } });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
};
