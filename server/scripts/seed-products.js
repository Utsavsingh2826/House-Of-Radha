/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

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

async function seed({ exit = true } = {}) {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set in server/.env');
  }
  if (!fs.existsSync(PRODUCTS_JSON_PATH)) {
    throw new Error(`products.json not found at ${PRODUCTS_JSON_PATH}`);
  }

  const items = JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, 'utf-8'));
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('products.json is empty or not an array');
  }

  // Allow this script to be imported in tests with an already-open connection.
  const ownConnection = mongoose.connection.readyState === 0;
  if (ownConnection) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  let upserted = 0;
  for (const item of items) {
    if (!item.sku) {
      console.warn('Skipping product without SKU:', item.name || '(unknown)');
      continue;
    }
    await Product.updateOne(
      { sku: item.sku },
      {
        $set: {
          sku: item.sku,
          name: item.name,
          gender: item.gender || 'unisex',
          genderLabel: item.genderLabel || '',
          category: item.category || '',
          subcategory: item.subcategory || '',
          weight: typeof item.weight === 'number' ? item.weight : 0,
          weightLabel: item.weightLabel || '',
          priceRaw: item.priceRaw || '',
          priceAmount: Number(item.priceAmount) || 0,
          priceDisplay: item.priceDisplay || '',
          description: item.description || '',
          keywords: item.keywords || '',
          image: item.image || '',
          images: Array.isArray(item.images) ? item.images : [],
          available: item.available !== false,
        },
      },
      { upsert: true }
    );
    upserted += 1;
  }

  console.log(`Seeded ${upserted} product(s) from ${path.basename(PRODUCTS_JSON_PATH)}.`);

  if (ownConnection) {
    await mongoose.disconnect();
  }
  if (exit) {
    process.exit(0);
  }
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  });
}

module.exports = seed;
