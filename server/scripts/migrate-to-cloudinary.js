/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { v2: cloudinary } = require('cloudinary');

// Load environment variables from server/.env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const Product = require('../models/Product');

const PRODUCTS_JSON_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'src',
  'data',
  'products.json'
);

const PUBLIC_DIR_PATH = path.resolve(__dirname, '..', '..', 'public');

// Configure Cloudinary
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('\x1b[31mError: Cloudinary environment variables are missing in server/.env!\x1b[0m');
  console.error('Please configure the following in your server/.env:');
  console.error('  CLOUDINARY_CLOUD_NAME');
  console.error('  CLOUDINARY_API_KEY');
  console.error('  CLOUDINARY_API_SECRET\n');
  process.exit(1);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

async function migrate() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/houseofradha';
  console.log(`Connecting to local MongoDB at: ${mongoUri}...`);
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB successfully.');

  if (!fs.existsSync(PRODUCTS_JSON_PATH)) {
    throw new Error(`products.json not found at ${PRODUCTS_JSON_PATH}`);
  }

  const productsData = JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, 'utf-8'));
  if (!Array.isArray(productsData) || productsData.length === 0) {
    throw new Error('products.json is empty or not an array');
  }

  console.log(`Loaded ${productsData.length} products from products.json. Starting migration...`);

  // Map to cache uploaded files to avoid duplicate uploads
  const uploadCache = new Map();

  let upsertedCount = 0;
  let uploadCount = 0;

  for (const product of productsData) {
    if (!product.sku) {
      console.warn('Skipping product without SKU:', product.name || '(unknown)');
      continue;
    }

    console.log(`\nProcessing SKU: ${product.sku} - "${product.name}"`);

    // Helper to upload a single relative image path
    const uploadImage = async (relativeUrl) => {
      if (!relativeUrl) return '';
      
      // If it's already a remote URL (e.g. Cloudinary or unsplash), return as-is
      if (relativeUrl.startsWith('http') || relativeUrl.includes('res.cloudinary.com')) {
        return relativeUrl;
      }

      // Decode the URL-encoded path and remove leading slash
      const localFilename = decodeURIComponent(relativeUrl.replace(/^\//, ''));
      const localFilePath = path.join(PUBLIC_DIR_PATH, localFilename);

      // Check cache first
      if (uploadCache.has(localFilePath)) {
        return uploadCache.get(localFilePath);
      }

      if (!fs.existsSync(localFilePath)) {
        console.warn(`  [Warning] Local file not found: ${localFilePath}. Skipping upload.`);
        return '';
      }

      try {
        console.log(`  Uploading ${localFilename} to Cloudinary...`);
        
        // Clean public_id: remove spaces and special characters
        const cleanPublicId = path.parse(localFilename).name
          .replace(/[^a-zA-Z0-9-_]/g, '_')
          .replace(/_+/g, '_');

        const uploadResult = await cloudinary.uploader.upload(localFilePath, {
          folder: 'products',
          public_id: `${product.sku}_${cleanPublicId}`,
          overwrite: true,
          invalidate: true
        });

        const cloudUrl = uploadResult.secure_url;
        uploadCache.set(localFilePath, cloudUrl);
        uploadCount += 1;
        console.log(`  Uploaded successfully. URL: ${cloudUrl}`);
        return cloudUrl;
      } catch (err) {
        console.error(`  [Error] Failed to upload image ${localFilename}:`, err.message);
        return '';
      }
    };

    // 1. Upload main image
    let newMainImage = '';
    if (product.image) {
      newMainImage = await uploadImage(product.image);
    }

    // 2. Upload gallery images
    const newGalleryImages = [];
    if (Array.isArray(product.images)) {
      for (const imgUrl of product.images) {
        const cloudUrl = await uploadImage(imgUrl);
        if (cloudUrl) {
          newGalleryImages.push(cloudUrl);
        }
      }
    }

    // 3. Upsert product into MongoDB
    await Product.updateOne(
      { sku: product.sku.toUpperCase() },
      {
        $set: {
          sku: product.sku.toUpperCase(),
          name: product.name,
          gender: product.gender || 'unisex',
          genderLabel: product.genderLabel || '',
          category: product.category || 'Bracelet',
          subcategory: product.subcategory || '',
          weight: typeof product.weight === 'number' ? product.weight : parseFloat(product.weight) || 0,
          weightLabel: product.weightLabel || '',
          priceRaw: product.priceRaw || '',
          priceAmount: Number(product.priceAmount) || 0,
          priceDisplay: product.priceDisplay || '',
          description: product.description || '',
          keywords: product.keywords || '',
          image: newMainImage || null,
          images: newGalleryImages,
          available: product.available !== false,
        },
      },
      { upsert: true }
    );
    upsertedCount += 1;
    console.log(`✓ SKU ${product.sku} saved to local MongoDB database.`);
  }

  console.log('\n==================================================');
  console.log('Migration Completed Successfully!');
  console.log(`- Uploaded ${uploadCount} unique images to Cloudinary.`);
  console.log(`- Saved/Updated ${upsertedCount} products in local MongoDB.`);
  console.log('==================================================');

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('\x1b[31mMigration failed:\x1b[0m', err.message);
  process.exit(1);
});
