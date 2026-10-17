/**
 * Shared product catalog + image mapping utilities.
 * Used by build-product-image-mapping, build-products, and import-and-upload.
 */

import fs from 'node:fs';
import path from 'node:path';

export const SKU_PREFIXES = 'BC|BO|ER|BG|NC|AN|PS|PD|KI|CH|RA';

/** Category folders at repo root (relative paths). */
export const IMAGE_CATEGORY_DIRS = [
  'bracelets',
  'earrings',
  'brooches',
  'bangles',
  'chains',
  'necklaces',
  'pendants',
  'pendant set',
  'anklets',
  'kids',
];

export const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.jfif',
  '.webp',
  '.heic',
  '.gif',
]);

const SKU_PATTERN = new RegExp(
  `^((?:${SKU_PREFIXES})-[A-Z0-9]+-\\d+)`,
  'i'
);

export const norm = (s) => String(s ?? '').trim();

export function extractSkuFromBasename(basename) {
  const base = norm(basename);
  if (!base) return null;
  const m = base.match(SKU_PATTERN);
  return m ? m[1].toUpperCase() : null;
}

/**
 * True if the file should be considered a product image (including extension-less SKU names).
 */
export function isScannableImageEntry(name) {
  const n = norm(name);
  if (!n || n.startsWith('.')) return false;
  if (extractSkuFromBasename(n) !== null) return true;
  const ext = path.extname(n).toLowerCase();
  return Boolean(ext && IMAGE_EXTENSIONS.has(ext));
}

export function sortImagePaths(paths) {
  const score = (p) => {
    const base = path.basename(p).toLowerCase();
    if (/front/.test(base)) return 0;
    if (/^[^_]+_\d+\./.test(base) || /_\d+$/.test(base)) return 2;
    if (/\(\d+\)/.test(base)) return 3;
    if (/\.(\d+)$/.test(base) && !/\.\w+$/.test(base)) return 4;
    return 1;
  };
  return [...paths].sort((a, b) => {
    const sa = score(a);
    const sb = score(b);
    if (sa !== sb) return sa - sb;
    return a.localeCompare(b);
  });
}

export function loadImageOverrides(overridesPath) {
  if (!fs.existsSync(overridesPath)) {
    return {};
  }
  const raw = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`image-overrides.json must be a plain object at ${overridesPath}`);
  }
  const out = {};
  for (const [sku, value] of Object.entries(raw)) {
    const key = norm(sku).toUpperCase();
    if (!key) continue;
    const list = Array.isArray(value) ? value : [value];
    out[key] = list.map((p) => norm(p)).filter(Boolean);
  }
  return out;
}

/**
 * @param {string} rootDir - repo root
 * @returns {Map<string, string[]>} sku -> repo-relative paths
 */
export function scanImagesBySku(rootDir) {
  const bySku = new Map();

  function add(relPath) {
    const basename = path.basename(relPath);
    const sku = extractSkuFromBasename(basename);
    if (!sku) return false;
    if (!bySku.has(sku)) bySku.set(sku, []);
    bySku.get(sku).push(relPath);
    return true;
  }

  const unmappedFiles = [];

  for (const dir of IMAGE_CATEGORY_DIRS) {
    const absDir = path.join(rootDir, dir);
    if (!fs.existsSync(absDir)) continue;
    for (const entry of fs.readdirSync(absDir)) {
      if (!isScannableImageEntry(entry)) continue;
      const rel = path.join(dir, entry).split(path.sep).join('/');
      if (!add(rel)) unmappedFiles.push(rel);
    }
  }

  for (const list of bySku.values()) {
    const sorted = sortImagePaths(list);
    list.length = 0;
    list.push(...sorted);
  }

  return { bySku, unmappedFiles };
}

export function applyImageOverrides(bySku, overrides, rootDir) {
  for (const [sku, relPaths] of Object.entries(overrides)) {
    const resolved = [];
    for (const rel of relPaths) {
      const abs = path.join(rootDir, rel);
      if (!fs.existsSync(abs)) {
        console.warn(`[override] Missing file for ${sku}: ${rel}`);
        continue;
      }
      resolved.push(rel.split(path.sep).join('/'));
    }
    if (resolved.length === 0) continue;
    const merged = sortImagePaths([...(bySku.get(sku) || []), ...resolved]);
    const deduped = [...new Set(merged)];
    bySku.set(sku, deduped);
  }
}

export function readProductsRaw(productsRawPath) {
  if (!fs.existsSync(productsRawPath)) {
    throw new Error(`products_raw.json not found at ${productsRawPath}`);
  }
  return JSON.parse(fs.readFileSync(productsRawPath, 'utf8'));
}

/**
 * Parse rows from products_raw.json (xlsx → json via convert-xlsx-to-json.js).
 */
export function parseCatalogRows(productsRaw) {
  if (!Array.isArray(productsRaw)) {
    throw new Error('products_raw.json must be an array');
  }

  const rows = [];
  for (let i = 0; i < productsRaw.length; i++) {
    const row = productsRaw[i];
    const sku = norm(row['__EMPTY']).toUpperCase();
    if (!sku || sku.includes('PRODUCT CODE')) continue;

    const name = norm(row['__EMPTY_1']) || sku;

    rows.push({
      sku,
      name,
      genderRaw: norm(row['__EMPTY_2']),
      category: norm(row['__EMPTY_3']) || 'Bracelet',
      subcategory: norm(row['__EMPTY_4']),
      weight: parseFloat(row['__EMPTY_10']) || 0,
      priceInr: row['__EMPTY_11'],
      priceTier: row['__EMPTY_12'],
      description: norm(row['__EMPTY_7']),
      keywords: norm(row['__EMPTY_15']),
    });
  }
  return rows;
}

export function normaliseGender(raw) {
  const s = norm(raw).toLowerCase();
  if (s.startsWith('f') || s.includes('women')) return 'female';
  if (s.startsWith('m') || s.includes('men')) return 'male';
  return 'unisex';
}

export function parseExcelPrice(priceInr, priceTier) {
  const rawInr = norm(priceInr);
  const rawTier = norm(priceTier);

  if (rawInr) {
    const num = parseFloat(rawInr);
    if (!Number.isNaN(num)) {
      return { priceRaw: rawInr, priceAmount: num, basePriceAmount: num };
    }
  }

  if (rawTier) {
    const match = rawTier.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      const num = parseFloat(match[1]);
      const amount = Math.round(num * 100);
      return { priceRaw: rawTier, priceAmount: amount, basePriceAmount: amount };
    }
    return { priceRaw: rawTier, priceAmount: 0, basePriceAmount: 0 };
  }

  return { priceRaw: '', priceAmount: 0, basePriceAmount: 0 };
}

export function resolveAbsolutePath(rootDir, relPath) {
  return path.join(rootDir, relPath.split('/').join(path.sep));
}

/**
 * Build mapping artifact + stats from catalog rows and scanned images.
 */
export function buildImageMapping({ rootDir, catalogRows, overridesPath }) {
  const { bySku: scanned, unmappedFiles } = scanImagesBySku(rootDir);
  const overrides = loadImageOverrides(overridesPath);
  applyImageOverrides(scanned, overrides, rootDir);

  const catalogSkus = new Set(catalogRows.map((r) => r.sku));
  const bySkuOut = {};
  const skusWithoutImages = [];

  for (const row of catalogRows) {
    const paths = scanned.get(row.sku) || [];
    if (paths.length === 0) skusWithoutImages.push(row.sku);
    bySkuOut[row.sku] = {
      paths,
      primary: paths[0] || null,
    };
  }

  const imageSkusNotInCatalog = [];
  for (const sku of scanned.keys()) {
    if (!catalogSkus.has(sku)) imageSkusNotInCatalog.push(sku);
  }
  imageSkusNotInCatalog.sort();

  return {
    generatedAt: new Date().toISOString(),
    bySku: bySkuOut,
    unmappedFiles: unmappedFiles.sort(),
    skusWithoutImages: skusWithoutImages.sort(),
    imageSkusNotInCatalog,
    stats: {
      catalogSkus: catalogRows.length,
      catalogWithImages: catalogRows.length - skusWithoutImages.length,
      catalogMissingImages: skusWithoutImages.length,
      distinctImageSkus: scanned.size,
      unmappedFileCount: unmappedFiles.length,
      imageSkusNotInCatalog: imageSkusNotInCatalog.length,
    },
  };
}

export function catalogRowsToProducts(catalogRows, mappingBySku) {
  return catalogRows.map((row) => {
    const price = parseExcelPrice(row.priceInr, row.priceTier);
    const entry = mappingBySku[row.sku] || { paths: [], primary: null };
    const paths = entry.paths || [];

    return {
      sku: row.sku,
      name: row.name,
      gender: normaliseGender(row.genderRaw),
      genderLabel: row.genderRaw || '',
      category: row.category,
      subcategory: row.subcategory,
      weight: row.weight,
      weightLabel: row.weight ? `${row.weight}g` : '',
      priceRaw: price.priceRaw,
      basePriceAmount: price.basePriceAmount,
      priceAmount: price.priceAmount,
      priceDisplay: price.priceRaw.startsWith('P') ? price.priceRaw : price.priceRaw,
      description: row.description,
      keywords: row.keywords,
      localImages: paths,
      image: '',
      images: [],
      available: paths.length > 0,
    };
  });
}
