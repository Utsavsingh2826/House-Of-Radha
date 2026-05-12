const Product = require('../models/Product');

// Drop the MongoDB-internal __v field and rename _id → id so the JSON the
// frontend sees matches the previous `src/data/products.json` shape closely.
const toClient = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(obj._id),
    sku: obj.sku,
    name: obj.name,
    gender: obj.gender,
    genderLabel: obj.genderLabel,
    category: obj.category,
    subcategory: obj.subcategory,
    weight: obj.weight,
    weightLabel: obj.weightLabel,
    priceRaw: obj.priceRaw,
    priceAmount: obj.priceAmount,
    priceDisplay: obj.priceDisplay,
    description: obj.description,
    keywords: obj.keywords,
    image: obj.image,
    images: obj.images,
    available: obj.available,
  };
};

// GET /api/products?gender=male|female|unisex&category=Bracelet&q=keyword
// Public — no auth required. Returns products sorted by SKU for stable order.
exports.listProducts = async (req, res) => {
  try {
    const filter = { available: true };

    if (req.query.gender) {
      const g = String(req.query.gender).toLowerCase();
      if (['male', 'female', 'unisex'].includes(g)) filter.gender = g;
    }
    if (req.query.category) {
      filter.category = String(req.query.category);
    }
    if (req.query.q) {
      const rx = new RegExp(String(req.query.q).trim(), 'i');
      filter.$or = [{ name: rx }, { keywords: rx }, { sku: rx }];
    }

    const products = await Product.find(filter).sort({ sku: 1 });
    return res.status(200).json({
      success: true,
      count: products.length,
      data: products.map(toClient),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/products/:sku — public lookup used by Checkout's Buy Now flow.
exports.getProductBySku = async (req, res) => {
  try {
    const sku = String(req.params.sku || '').toUpperCase();
    const product = await Product.findOne({ sku });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    return res.status(200).json({ success: true, data: toClient(product) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
