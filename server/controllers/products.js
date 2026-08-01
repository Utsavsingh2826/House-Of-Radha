const Product = require('../models/Product');
const PricingConfig = require('../models/PricingConfig');
const { calculateDynamicPrice } = require('../utils/pricing');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary if credentials are provided in env
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const getOrCreatePricingConfig = async () => {
  let config = await PricingConfig.findOne({ name: 'default' });
  if (!config) {
    config = await PricingConfig.create({ name: 'default' });
  }
  return config;
};

const buildPricingSnapshot = (product, pricingConfig) => {
  const basePriceAmount = Number(product?.basePriceAmount ?? product?.priceAmount ?? 0);
  const priceAmount = calculateDynamicPrice({
    basePriceAmount,
    weightGrams: product?.weight ?? 0,
    currentSilverRate: pricingConfig?.currentSilverRate ?? 225,
    baseSilverRate: pricingConfig?.baseSilverRate ?? 225,
    silverRateChangeThreshold: pricingConfig?.silverRateChangeThreshold ?? 275,
    silverRateStep: pricingConfig?.silverRateStep ?? 25,
    priceStepAmount: pricingConfig?.priceStepAmount ?? 25,
  });

  return {
    priceAmount,
    priceDisplay: formatCurrency(priceAmount),
  };
};

// Drop the MongoDB-internal __v field and rename _id → id so the JSON the
// frontend sees matches the previous `src/data/products.json` shape closely.
const toClient = (doc, pricingConfig) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  const pricing = buildPricingSnapshot(obj, pricingConfig);

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
    basePriceAmount: obj.basePriceAmount ?? obj.priceAmount ?? 0,
    priceAmount: pricing.priceAmount,
    priceDisplay: pricing.priceDisplay,
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
    const pricingConfig = await getOrCreatePricingConfig();

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
    const clientProducts = products
      .map((product) => toClient(product, pricingConfig))
      .filter((product) => Number(product.priceAmount) > 0);
    return res.status(200).json({
      success: true,
      count: clientProducts.length,
      data: clientProducts,
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
    const pricingConfig = await getOrCreatePricingConfig();

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    return res.status(200).json({ success: true, data: toClient(product, pricingConfig) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getPricingConfig = async (req, res) => {
  try {
    const pricingConfig = await getOrCreatePricingConfig();
    return res.status(200).json({ success: true, data: pricingConfig });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.updatePricingConfig = async (req, res) => {
  try {
    const updates = {
      currentSilverRate: Number(req.body.currentSilverRate ?? 225),
      baseSilverRate: Number(req.body.baseSilverRate ?? 225),
      silverRateChangeThreshold: Number(req.body.silverRateChangeThreshold ?? 275),
      silverRateStep: Number(req.body.silverRateStep ?? 25),
      priceStepAmount: Number(req.body.priceStepAmount ?? 25),
    };

    const pricingConfig = await PricingConfig.findOneAndUpdate(
      { name: 'default' },
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({ success: true, data: pricingConfig });
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
    const pricingConfig = await getOrCreatePricingConfig();
    const basePriceAmount = Number(req.body.basePriceAmount ?? priceAmount ?? 0);
    const computedPrice = calculateDynamicPrice({
      basePriceAmount,
      weightGrams: Number(req.body.weight) || 0,
      currentSilverRate: pricingConfig.currentSilverRate,
      baseSilverRate: pricingConfig.baseSilverRate,
      silverRateChangeThreshold: pricingConfig.silverRateChangeThreshold,
      silverRateStep: pricingConfig.silverRateStep,
      priceStepAmount: pricingConfig.priceStepAmount,
    });

    // Check if product already exists
    let product = await Product.findOne({ sku: formattedSku });

    const productData = {
      ...req.body,
      sku: formattedSku,
      basePriceAmount,
      priceAmount: computedPrice.priceAmount,
      priceDisplay: req.body.priceDisplay || formatCurrency(computedPrice.priceAmount),
    };

    if (product) {
      // Update existing product
      product = await Product.findOneAndUpdate(
        { sku: formattedSku },
        productData,
        { new: true, runValidators: true }
      );
      return res.status(200).json({ success: true, data: toClient(product, pricingConfig) });
    } else {
      // Create new product
      product = await Product.create(productData);
      return res.status(201).json({ success: true, data: toClient(product, pricingConfig) });
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
