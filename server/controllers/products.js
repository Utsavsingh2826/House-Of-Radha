const Product = require('../models/Product');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary if credentials are provided in env
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

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

// GET /api/products?gender=male|female|unisex&category=Bracelet&q=keyword&all=true
// Public — no auth required. Returns products sorted by SKU for stable order.
exports.listProducts = async (req, res) => {
  try {
    const filter = {};

    // Filter by availability unless admins request all products
    if (req.query.all !== 'true') {
      filter.available = true;
    }

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

// POST /api/products — admin creation or update (upsert by SKU)
exports.createProduct = async (req, res) => {
  try {
    const { sku, name, priceAmount } = req.body;

    if (!sku) {
      return res.status(400).json({ success: false, error: 'SKU is required' });
    }
    if (!name) {
      return res.status(400).json({ success: false, error: 'Product name is required' });
    }
    if (priceAmount === undefined || priceAmount === null) {
      return res.status(400).json({ success: false, error: 'priceAmount is required' });
    }

    const formattedSku = String(sku).trim().toUpperCase();

    // Check if product already exists
    let product = await Product.findOne({ sku: formattedSku });

    const productData = {
      ...req.body,
      sku: formattedSku,
    };

    if (product) {
      // Update existing product
      product = await Product.findOneAndUpdate(
        { sku: formattedSku },
        productData,
        { new: true, runValidators: true }
      );
      return res.status(200).json({ success: true, data: toClient(product) });
    } else {
      // Create new product
      product = await Product.create(productData);
      return res.status(201).json({ success: true, data: toClient(product) });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/products/upload — admin upload to Cloudinary (receives base64 string)
exports.uploadProductImage = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, error: 'Please provide an image base64 data' });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      console.warn('Cloudinary env credentials not set. Using fallback mock image URL.');
      return res.status(200).json({
        success: true,
        url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=1000',
        public_id: 'mock_unconfigured_cloudinary'
      });
    }

    const uploadResult = await cloudinary.uploader.upload(image, {
      folder: 'products',
      resource_type: 'image',
    });

    return res.status(200).json({
      success: true,
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/products/:sku — admin deletion
exports.deleteProduct = async (req, res) => {
  try {
    const sku = String(req.params.sku || '').toUpperCase();
    const product = await Product.findOneAndDelete({ sku });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    return res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
