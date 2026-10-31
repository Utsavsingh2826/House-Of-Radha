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
const MAPPING_PATH = path.join(ROOT, 'product-image-mapping.json');
const OVERRIDES_PATH = path.join(ROOT, 'scripts', 'image-overrides.json');
const FAILURES_PATH = path.join(ROOT, 'reports', 'upload-failures.json');
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

function trimCategory(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
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
  const catalogRows = catalog.loadCatalogRows(ROOT);
  console.log(`Loaded ${catalogRows.length} catalog SKU(s) from Product list.`);

  const built = catalog.buildImageMapping({
    rootDir: ROOT,
    catalogRows,
    overridesPath: OVERRIDES_PATH,
  });
  fs.mkdirSync(path.dirname(MAPPING_PATH), { recursive: true });
  fs.writeFileSync(MAPPING_PATH, `${JSON.stringify(built, null, 2)}\n`, 'utf8');
  console.log(`Refreshed ${path.basename(MAPPING_PATH)} (${built.stats.catalogWithImages} SKUs with local images).`);

  return { catalog, catalogRows, bySku: built.bySku, mappingStats: built.stats };
}

function writeFailureReport(report) {
  fs.mkdirSync(path.dirname(FAILURES_PATH), { recursive: true });
  fs.writeFileSync(FAILURES_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function importAndUpload() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/houseofradha';
  console.log(`Connecting to MongoDB at: ${mongoUri}...`);
  await mongoose.connect(mongoUri, MONGO_OPTIONS);
  console.log('Connected to MongoDB successfully.');
  if (process.env.SEED_RESUME === '1') {
    console.log('SEED_RESUME=1 — skipping SKUs that already have full Cloudinary galleries.');
  }

  const { catalog, catalogRows, bySku, mappingStats } = await loadCatalogContext();

  const pricingConfig = await getOrCreatePricingConfig();
  const uploadCache = new Map();

  let totalUploaded = 0;
  let totalSaved = 0;
  let storefrontLive = 0;
  const failures = [];

  for (const row of catalogRows) {
    const { sku } = row;
    const name = row.name;
    const mappingEntry = bySku[sku] || { paths: [] };
    const relPaths = mappingEntry.paths || [];
    const parsedPrice = catalog.parseExcelPrice(row.priceInr, row.priceTier);
    const assessment = catalog.assessCatalogRow(row, relPaths, parsedPrice);
    const rowReasons = [...assessment.reasons];

    if (process.env.SEED_RESUME === '1' && relPaths.length > 0) {
      await ensureMongoConnected();
      const existing = await Product.findOne({ sku }).select('images image').lean();
      if (
        existing?.image?.includes('res.cloudinary.com') &&
        Array.isArray(existing.images) &&
        existing.images.length >= relPaths.length
      ) {
        console.log(`\nSkipping SKU: ${sku} (${existing.images.length}/${relPaths.length} images already in DB).`);
        if (assessment.storefrontReady) storefrontLive += 1;
        continue;
      }
    }

    console.log(`\nImporting SKU: ${sku} - "${name}"`);

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

    const priceDisplay = /^P\d/i.test(parsedPrice.priceRaw)
      ? parsedPrice.priceRaw.toUpperCase()
      : formatCurrency(priceAmount);

    const gender = catalog.normaliseGender(row.genderRaw);
    const uploadedUrls = [];
    const uploadErrors = [];

    for (const relPath of relPaths) {
      const localPath = catalog.resolveAbsolutePath(ROOT, relPath);
      if (!fs.existsSync(localPath)) {
        uploadErrors.push(`Missing file: ${relPath}`);
        continue;
      }

      const secureUrl = await uploadToCloudinary(localPath, sku, uploadCache);
      if (secureUrl) {
        uploadedUrls.push(secureUrl);
        totalUploaded += 1;
      } else {
        uploadErrors.push(`Cloudinary upload failed: ${relPath}`);
      }
    }

    if (uploadErrors.length > 0) {
      rowReasons.push(...uploadErrors);
    }

    const available = uploadedUrls.length > 0 && parsedPrice.priceAmount > 0;

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
            category: trimCategory(row.category) || 'Jewelry',
            subcategory: trimCategory(row.subcategory),
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
            available,
          },
        },
        { upsert: true }
      );
      totalSaved += 1;
      console.log(`✓ Saved product ${sku} to MongoDB (available=${available}).`);
      if (available && assessment.storefrontReady) storefrontLive += 1;
    } catch (err) {
      rowReasons.push(`MongoDB save failed: ${formatError(err)}`);
      await ensureMongoConnected();
    }

    if (rowReasons.length > 0 || assessment.warnings.length > 0) {
      failures.push({
        sku,
        name,
        category: row.category,
        gender: row.genderRaw,
        priceAmount: parsedPrice.priceAmount,
        imagesUploaded: uploadedUrls.length,
        savedToMongo: rowReasons.every((r) => !r.startsWith('MongoDB save failed')),
        reasons: [...new Set([...rowReasons, ...assessment.warnings])],
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    catalogSkus: catalogRows.length,
    savedToMongo: totalSaved,
    imagesUploaded: totalUploaded,
    storefrontLive,
    mappingStats,
    failureCount: failures.length,
    failures: failures.sort((a, b) => a.sku.localeCompare(b.sku)),
  };

  writeFailureReport(report);

  console.log('\n==================================================');
  console.log('Seeding and Cloudinary upload completed.');
  console.log(`- Saved/Updated ${totalSaved} products in MongoDB.`);
  console.log(`- Uploaded ${totalUploaded} images to Cloudinary.`);
  console.log(`- Storefront-live (name+gender+price+image): ${storefrontLive}`);
  console.log(`- Issues logged: ${failures.length} → ${path.relative(ROOT, FAILURES_PATH)}`);
  console.log('==================================================');

  if (failures.length > 0) {
    console.log('\n--- Products not fully live on storefront ---');
    for (const f of failures) {
      console.log(`${f.sku} | ${f.name}`);
      for (const reason of f.reasons) {
        console.log(`   • ${reason}`);
      }
    }
  }

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
  process.exit(failures.length > 0 ? 0 : 0);
}

importAndUpload().catch((err) => {
  console.error('Seeding script failed:', formatError(err));
  process.exit(1);
});
