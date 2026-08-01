/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { v2: cloudinary } = require('cloudinary');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const Product = require('../models/Product');

const RAKHI_JSON_PATH = path.resolve(__dirname, '..', '..', 'rakhi.json');
const RAKHI_IMAGES_DIR = path.resolve(__dirname, '..', '..', 'Rakhi');
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.jfif', '.webp', '.heic'];

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error('Cloudinary environment credentials are missing in server/.env');
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

function normalizeName(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/O/g, '0')
    .replace(/I/g, '1')
    .replace(/L/g, '1');
}

function listImageFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs.readdirSync(dirPath)
    .filter((file) => IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase()))
    .map((file) => path.join(dirPath, file));
}

function findMatchingImages(sku, files) {
  const normalizedSku = normalizeName(sku);
  return files.filter((filePath) => {
    const baseName = path.basename(filePath, path.extname(filePath));
    return normalizeName(baseName) === normalizedSku;
  });
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

async function uploadImage(localPath, sku) {
  const baseName = path.basename(localPath, path.extname(localPath));
  const cleanPublicId = baseName.replace(/[^a-zA-Z0-9-_]/g, '_').replace(/_+/g, '_');
  const publicId = `${sku}_${cleanPublicId}`.toLowerCase();

  const result = await cloudinary.uploader.upload(localPath, {
    folder: 'products/rakhi',
    public_id: publicId,
    overwrite: true,
    invalidate: true,
  });

  return result.secure_url;
}

async function seedRakhiProducts({ exit = true } = {}) {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set in server/.env');
  }
  if (!fs.existsSync(RAKHI_JSON_PATH)) {
    throw new Error(`Rakhi JSON not found at ${RAKHI_JSON_PATH}`);
  }

  const items = JSON.parse(fs.readFileSync(RAKHI_JSON_PATH, 'utf-8'));
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Rakhi JSON is empty or not an array');
  }

  const imageFiles = listImageFiles(RAKHI_IMAGES_DIR);
  const ownConnection = mongoose.connection.readyState === 0;
  if (ownConnection) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  let upserted = 0;
  let uploaded = 0;

  for (const item of items) {
    const sku = String(item.productCode || '').trim().toUpperCase();
    if (!sku) {
      continue;
    }

    const matchingImages = findMatchingImages(sku, imageFiles);
    const uploadedUrls = [];

    for (const localPath of matchingImages) {
      const url = await uploadImage(localPath, sku);
      uploadedUrls.push(url);
      uploaded += 1;
    }

    const priceAmount = Number(item.rate) || 0;
    const priceDisplay = formatCurrency(priceAmount);

    await Product.updateOne(
      { sku },
      {
        $set: {
          sku,
          name: item.productName || sku,
          gender: String(item.gender || 'male').toLowerCase(),
          genderLabel: item.gender || 'MALE',
          category: 'RAKHI',
          subcategory: item.subcategory || '',
          weight: 0,
          weightLabel: '',
          priceRaw: String(item.rate || ''),
          basePriceAmount: priceAmount,
          priceAmount,
          priceDisplay,
          description: item.description || '',
          keywords: [item.category, item.subcategory, item.productName].filter(Boolean).join(' '),
          image: uploadedUrls[0] || '',
          images: uploadedUrls,
          available: true,
        },
      },
      { upsert: true }
    );

    upserted += 1;
    console.log(`Seeded ${sku} (${uploadedUrls.length} image${uploadedUrls.length === 1 ? '' : 's'})`);
  }

  console.log(`Seeded ${upserted} Rakhi product(s) and uploaded ${uploaded} image(s).`);

  if (ownConnection) {
    await mongoose.disconnect();
  }
  if (exit) {
    process.exit(0);
  }
}

if (require.main === module) {
  seedRakhiProducts().catch((err) => {
    console.error('Rakhi seed failed:', err.message);
    process.exit(1);
  });
}

module.exports = seedRakhiProducts;
