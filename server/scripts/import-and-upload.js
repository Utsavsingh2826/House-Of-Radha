/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { v2: cloudinary } = require('cloudinary');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const Product = require('../models/Product');
const PricingConfig = require('../models/PricingConfig');
const { calculateDynamicPrice } = require('../utils/pricing');

const ROOT = path.resolve(__dirname, '..', '..');
const PRODUCTS_RAW_PATH = path.join(ROOT, 'products_raw.json');
const MAPPING_PATH = path.join(ROOT, 'product-image-mapping.json');
const OVERRIDES_PATH = path.join(ROOT, 'scripts', 'image-overrides.json');
const CATALOG_MODULE = path.join(ROOT, 'scripts', 'lib', 'catalog.js');

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('Error: Cloudinary environment credentials are missing in server/.env!');
  process.exit(1);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

function formatCurrency(val) {
  return `₹${Number(val || 0).toLocaleString('en-IN')}`;
}

function formatError(err) {
  if (!err) return 'unknown error';
  if (typeof err.message === 'string' && err.message) return err.message;
  if (typeof err.error === 'string' && err.error) return err.error;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 120_000,
  socketTimeoutMS: 600_000,
  maxPoolSize: 10,
  retryWrites: true,
};

async function ensureMongoConnected() {
  if (mongoose.connection.readyState === 1) return;
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/houseofradha';
  await mongoose.connect(mongoUri, MONGO_OPTIONS);
}

async function uploadToCloudinary(localPath, sku, uploadCache) {
  if (uploadCache.has(localPath)) {
    return uploadCache.get(localPath);
  }

  const filename = path.basename(localPath);
  const cleanPublicId = path.parse(filename).name
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_+/g, '_');

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      console.log(`  Uploading ${filename} to Cloudinary...`);
      const result = await cloudinary.uploader.upload(localPath, {
        folder: 'products',
        public_id: `${sku}_${cleanPublicId}`,
        overwrite: true,
        invalidate: true,
        timeout: 120_000,
      });
      uploadCache.set(localPath, result.secure_url);
      console.log(`  Cloudinary secure URL: ${result.secure_url}`);
      return result.secure_url;
    } catch (err) {
      console.error(
        `  [Error] Cloudinary upload failed (attempt ${attempt}/${maxAttempts}) for ${localPath}:`,
        formatError(err)
      );
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  }
  return null;
}

async function getOrCreatePricingConfig() {
  let config = await PricingConfig.findOne({ name: 'default' });
  if (!config) {
    config = await PricingConfig.create({ name: 'default' });
  }
  return config;
}

async function loadCatalogContext() {
  const catalog = await import(pathToFileURL(CATALOG_MODULE).href);
  const productsRaw = catalog.readProductsRaw(PRODUCTS_RAW_PATH);
  const catalogRows = catalog.parseCatalogRows(productsRaw);

  let bySku;
  if (fs.existsSync(MAPPING_PATH)) {
    const mapping = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf8'));
    bySku = mapping.bySku || {};
    console.log(`Using ${path.basename(MAPPING_PATH)} for image paths.`);
  } else {
    console.log('No product-image-mapping.json found; scanning image folders...');
    const built = catalog.buildImageMapping({
      rootDir: ROOT,
      catalogRows,
      overridesPath: OVERRIDES_PATH,
    });
    bySku = built.bySku;
  }

  return { catalog, catalogRows, bySku };
}

async function importAndUpload() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/houseofradha';
  console.log(`Connecting to MongoDB at: ${mongoUri}...`);
  await mongoose.connect(mongoUri, MONGO_OPTIONS);
  console.log('Connected to MongoDB successfully.');
  if (process.env.SEED_RESUME === '1') {
    console.log('SEED_RESUME=1 — skipping SKUs that already have full Cloudinary galleries.');
  }

  const { catalog, catalogRows, bySku } = await loadCatalogContext();
  console.log(`Loaded ${catalogRows.length} catalog SKU(s).`);

  const pricingConfig = await getOrCreatePricingConfig();
  const uploadCache = new Map();

  let totalUploaded = 0;
  let totalSaved = 0;

  for (const row of catalogRows) {
    const { sku } = row;
    const name = row.name;
    const mappingEntry = bySku[sku] || { paths: [] };
    const relPaths = mappingEntry.paths || [];

    if (process.env.SEED_RESUME === '1' && relPaths.length > 0) {
      await ensureMongoConnected();
      const existing = await Product.findOne({ sku }).select('images image').lean();
      if (
        existing?.image?.includes('res.cloudinary.com') &&
        Array.isArray(existing.images) &&
        existing.images.length >= relPaths.length
      ) {
        console.log(`\nSkipping SKU: ${sku} (${existing.images.length}/${relPaths.length} images already in DB).`);
        continue;
      }
    }

    console.log(`\nImporting SKU: ${sku} - "${name}"`);

    const parsedPrice = catalog.parseExcelPrice(row.priceInr, row.priceTier);
    const basePriceAmount = parsedPrice.basePriceAmount;
    const weight = row.weight;

    const baseSilverRate = pricingConfig.baseSilverRate ?? 225;
    const currentSilverRate = pricingConfig.currentSilverRate ?? 225;
    const silverRateChangeThreshold = pricingConfig.silverRateChangeThreshold ?? 275;
    const silverRateStep = pricingConfig.silverRateStep ?? 25;
    const priceStepAmount = pricingConfig.priceStepAmount ?? 25;

    const priceAmount = calculateDynamicPrice({
      basePriceAmount,
      weightGrams: weight,
      currentSilverRate,
      baseSilverRate,
      silverRateChangeThreshold,
      silverRateStep,
      priceStepAmount,
    });

    const priceDisplay = parsedPrice.priceRaw.startsWith('P')
      ? parsedPrice.priceRaw
      : formatCurrency(priceAmount);

    const gender = catalog.normaliseGender(row.genderRaw);
    const uploadedUrls = [];

    for (const relPath of relPaths) {
      const localPath = catalog.resolveAbsolutePath(ROOT, relPath);
      if (!fs.existsSync(localPath)) {
        console.warn(`  [Warning] Missing local file: ${relPath}`);
        continue;
      }

      const secureUrl = await uploadToCloudinary(localPath, sku, uploadCache);
      if (secureUrl) {
        uploadedUrls.push(secureUrl);
        totalUploaded += 1;
      }
    }

    try {
      await ensureMongoConnected();
      await Product.updateOne(
        { sku },
        {
          $set: {
            sku,
            name,
            gender,
            genderLabel: row.genderRaw || '',
            category: row.category || 'Bracelet',
            subcategory: row.subcategory || '',
            weight,
            weightLabel: weight ? `${weight}g` : '',
            priceRaw: parsedPrice.priceRaw,
            basePriceAmount,
            priceAmount,
            priceDisplay,
            description: row.description || '',
            keywords: row.keywords || '',
            image: uploadedUrls[0] || null,
            images: uploadedUrls,
            available: uploadedUrls.length > 0,
          },
        },
        { upsert: true }
      );
      totalSaved += 1;
      console.log(`✓ Saved product ${sku} to MongoDB.`);
    } catch (err) {
      console.error(`✗ MongoDB save failed for ${sku}:`, formatError(err));
      await ensureMongoConnected();
    }
  }

  console.log('\n==================================================');
  console.log('Seeding and Cloudinary upload completed successfully!');
  console.log(`- Uploaded ${totalUploaded} unique images to Cloudinary.`);
  console.log(`- Saved/Updated ${totalSaved} products in MongoDB.`);
  console.log('==================================================');

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
  process.exit(0);
}

importAndUpload().catch((err) => {
  console.error('Seeding script failed:', formatError(err));
  process.exit(1);
});
