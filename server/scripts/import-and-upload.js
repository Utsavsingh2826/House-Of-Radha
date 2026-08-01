/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { v2: cloudinary } = require('cloudinary');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const Product = require('../models/Product');
const PricingConfig = require('../models/PricingConfig');
const { calculateDynamicPrice } = require('../utils/pricing');

const PRODUCTS_JSON_PATH = path.resolve(__dirname, '..', '..', 'products_raw.json');

const BRACELETS_DIR = path.resolve(__dirname, '..', '..', 'Bracelets-20260728T205231Z-1-001', 'Bracelets');
const BROOCHES_DIR = path.resolve(__dirname, '..', '..', 'Brooches-20260728T205233Z-1-001', 'Brooches');
const EARRINGS_DIR = path.resolve(__dirname, '..', '..', 'Earrings-20260728T205235Z-1-001', 'Earrings');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.jfif', '.webp', '.heic'];

// Validate Cloudinary Credentials
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

function getFilteredImages(dirPath, prefixCode) {
    if (!fs.existsSync(dirPath)) {
        console.warn(`[Warning] Directory does not exist: ${dirPath}`);
        return [];
    }
    const files = fs.readdirSync(dirPath);
    return files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        const isImage = IMAGE_EXTENSIONS.includes(ext);
        const startsWithPrefix = file.toLowerCase().startsWith(prefixCode.toLowerCase());
        return isImage && startsWithPrefix;
    }).map(file => path.join(dirPath, file));
}

function parseExcelPrice(priceInr, priceTier) {
    const rawInr = String(priceInr || '').trim();
    const rawTier = String(priceTier || '').trim();

    if (rawInr) {
        const num = parseFloat(rawInr);
        if (!isNaN(num)) {
            return {
                priceRaw: rawInr,
                priceAmount: num,
            };
        }
    }

    if (rawTier) {
        const match = rawTier.match(/(\d+(?:\.\d+)?)/);
        if (match) {
            const num = parseFloat(match[1]);
            // If it is a tier code like P75, we scale it by 100 to 7500 INR
            const amount = Math.round(num * 100);
            return {
                priceRaw: rawTier,
                priceAmount: amount,
            };
        }
        return {
            priceRaw: rawTier,
            priceAmount: 0,
        };
    }

    return {
        priceRaw: '',
        priceAmount: 0,
    };
}

async function getOrCreatePricingConfig() {
    let config = await PricingConfig.findOne({ name: 'default' });
    if (!config) {
        config = await PricingConfig.create({ name: 'default' });
    }
    return config;
}

async function importAndUpload() {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/houseofradha';
    console.log(`Connecting to MongoDB at: ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.');

    if (!fs.existsSync(PRODUCTS_JSON_PATH)) {
        throw new Error(`products_raw.json not found at ${PRODUCTS_JSON_PATH}`);
    }

    const productsData = JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, 'utf-8'));
    console.log(`Loaded products_raw.json rows. Scanning image folders...`);

    // Build the SKU image matching map
    const skuToFiles = {};
    function addFilesToMap(files) {
        for (const filePath of files) {
            const filename = path.basename(filePath);
            const match = filename.match(/^((BC|BO|ER)-[A-Z0-9]+-\d+)/i);
            if (match) {
                const sku = match[1].toUpperCase();
                if (!skuToFiles[sku]) {
                    skuToFiles[sku] = [];
                }
                skuToFiles[sku].push(filePath);
            }
        }
    }

    addFilesToMap(getFilteredImages(BRACELETS_DIR, 'BC'));
    addFilesToMap(getFilteredImages(BROOCHES_DIR, 'BO'));
    addFilesToMap(getFilteredImages(EARRINGS_DIR, 'ER'));

    // Sort files for each SKU: prefer ones with "front" in name to be first
    for (const sku of Object.keys(skuToFiles)) {
        skuToFiles[sku].sort((a, b) => {
            const aFront = /front/i.test(a) ? 0 : 1;
            const bFront = /front/i.test(b) ? 0 : 1;
            if (aFront !== bFront) return aFront - bFront;
            return a.localeCompare(b);
        });
    }

    const pricingConfig = await getOrCreatePricingConfig();
    const uploadCache = new Map();

    let totalUploaded = 0;
    let totalSaved = 0;

    for (let i = 0; i < productsData.length; i++) {
        const row = productsData[i];
        // Skip header row
        if (i === 0 || !row["__EMPTY"] || String(row["__EMPTY"]).toUpperCase().includes('PRODUCT CODE')) {
            continue;
        }

        const sku = String(row["__EMPTY"]).trim().toUpperCase();
        const name = String(row["__EMPTY_1"] || '').trim();

        if (!sku || !name) {
            continue;
        }

        console.log(`\nImporting SKU: ${sku} - "${name}"`);

        // Get pricing
        const parsedPrice = parseExcelPrice(row["__EMPTY_11"], row["__EMPTY_12"]);
        const basePriceAmount = parsedPrice.priceAmount;
        const weight = parseFloat(row["__EMPTY_10"]) || 0;

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
            priceStepAmount
        });

        const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;
        const priceDisplay = parsedPrice.priceRaw.startsWith('P') ? parsedPrice.priceRaw : formatCurrency(priceAmount);

        // Get gender
        const genderStr = String(row["__EMPTY_2"] || '').trim().toLowerCase();
        let gender = 'unisex';
        if (genderStr.startsWith('f') || genderStr.includes('women')) {
            gender = 'female';
        } else if (genderStr.startsWith('m') || genderStr.includes('men')) {
            gender = 'male';
        }

        // Process and upload images
        const matchedFiles = skuToFiles[sku] || [];
        const uploadedUrls = [];

        for (const localPath of matchedFiles) {
            if (uploadCache.has(localPath)) {
                uploadedUrls.push(uploadCache.get(localPath));
                continue;
            }

            try {
                const filename = path.basename(localPath);
                const cleanPublicId = path.parse(filename).name
                    .replace(/[^a-zA-Z0-9-_]/g, '_')
                    .replace(/_+/g, '_');

                console.log(`  Uploading ${filename} to Cloudinary...`);
                const result = await cloudinary.uploader.upload(localPath, {
                    folder: 'products',
                    public_id: `${sku}_${cleanPublicId}`,
                    overwrite: true,
                    invalidate: true
                });

                const secureUrl = result.secure_url;
                uploadCache.set(localPath, secureUrl);
                uploadedUrls.push(secureUrl);
                totalUploaded += 1;
                console.log(`  Cloudinary secure URL: ${secureUrl}`);
            } catch (err) {
                console.error(`  [Error] Cloudinary upload failed for ${localPath}:`, err.message);
            }
        }

        // Update database Product collection
        await Product.updateOne(
            { sku },
            {
                $set: {
                    sku,
                    name,
                    gender,
                    genderLabel: String(row["__EMPTY_2"] || '').trim(),
                    category: String(row["__EMPTY_3"] || '').trim() || 'Bracelet',
                    subcategory: String(row["__EMPTY_4"] || '').trim(),
                    weight,
                    weightLabel: row["__EMPTY_10"] ? `${row["__EMPTY_10"]}g` : '',
                    priceRaw: parsedPrice.priceRaw,
                    basePriceAmount,
                    priceAmount,
                    priceDisplay,
                    description: String(row["__EMPTY_7"] || '').trim(),
                    keywords: String(row["__EMPTY_15"] || '').trim(),
                    image: uploadedUrls[0] || null,
                    images: uploadedUrls,
                    available: uploadedUrls.length > 0
                }
            },
            { upsert: true }
        );
        totalSaved += 1;
        console.log(`✓ Saved product ${sku} to MongoDB.`);
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

importAndUpload().catch(err => {
    console.error('Seeding script failed:', err.message);
    process.exit(1);
});
