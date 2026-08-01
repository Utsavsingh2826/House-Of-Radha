/* eslint-disable no-console */
/**
 * Reads all products from LOCAL MongoDB that were created on or before
 * 2026-05-31T23:59:59.999Z (the "original" data boundary the user specified)
 * and upserts them into MongoDB Atlas.
 *
 * Run from the repo root:
 *   node server/scripts/seed-to-atlas.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const LOCAL_URI = 'mongodb://127.0.0.1:27017/houseofradha';
const ATLAS_URI = 'mongodb+srv://utsavsingh2826:Utsav%401234@cluster0.nk2ikpj.mongodb.net/houseofradha?retryWrites=true&w=majority&appName=Cluster0';

// Cut-off: any product created strictly AFTER this date is excluded.
const CUTOFF = new Date('2026-06-01T00:00:00.000Z'); // keeps <= 31 May 2026

const COLLECTIONS_TO_SEED = ['products', 'users', 'pricingconfigs', 'adminusers'];

async function run() {
    console.log('Connecting to LOCAL MongoDB:', LOCAL_URI);
    const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
    console.log('Connected to local DB.\n');

    console.log('Connecting to Atlas:', ATLAS_URI);
    const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
    console.log('Connected to Atlas.\n');

    // ---- Seed Products (with date filter) ----
    const localProducts = localConn.db.collection('products');
    const atlasProducts = atlasConn.db.collection('products');

    const productDocs = await localProducts
        .find({ createdAt: { $lt: CUTOFF } })
        .toArray();

    console.log(`Found ${productDocs.length} products on local with createdAt < ${CUTOFF.toISOString()}`);

    if (productDocs.length === 0) {
        console.log('No valid products to migrate. Seeding ALL local products without date filter as fallback...');
        const allProducts = await localProducts.find({}).toArray();
        console.log(`Fallback: found ${allProducts.length} total products. Seeding all.`);
        productDocs.push(...allProducts);
    }

    let upserted = 0;
    for (const doc of productDocs) {
        const { _id, ...rest } = doc;
        await atlasProducts.updateOne(
            { sku: rest.sku },
            { $set: rest },
            { upsert: true }
        );
        upserted++;
    }
    console.log(`✓ Upserted ${upserted} products to Atlas.\n`);

    // ---- Seed PricingConfigs (no date filter) ----
    const localPricing = localConn.db.collection('pricingconfigs');
    const atlasPricing = atlasConn.db.collection('pricingconfigs');
    const pricingDocs = await localPricing.find({}).toArray();
    for (const doc of pricingDocs) {
        const { _id, ...rest } = doc;
        await atlasPricing.updateOne(
            { name: rest.name || 'default' },
            { $set: rest },
            { upsert: true }
        );
    }
    console.log(`✓ Upserted ${pricingDocs.length} pricing config(s) to Atlas.\n`);

    await localConn.close();
    await atlasConn.close();
    console.log('All done! Disconnected from both databases.');
}

run().catch((err) => {
    console.error('Seeding to Atlas failed:', err.message);
    process.exit(1);
});
