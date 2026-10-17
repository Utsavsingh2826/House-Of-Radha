/**
 * Scans category image folders + Product list SKUs → product-image-mapping.json
 *
 * Run: npm run build:mapping
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildImageMapping,
  parseCatalogRows,
  readProductsRaw,
} from './lib/catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const PRODUCTS_RAW = path.join(ROOT, 'products_raw.json');
const OVERRIDES = path.join(__dirname, 'image-overrides.json');
const OUT_PATH = path.join(ROOT, 'product-image-mapping.json');
const AUDIT_PATH = path.join(ROOT, 'reports', 'mapping-audit.json');

function main() {
  const productsRaw = readProductsRaw(PRODUCTS_RAW);
  const catalogRows = parseCatalogRows(productsRaw);
  const mapping = buildImageMapping({
    rootDir: ROOT,
    catalogRows,
    overridesPath: OVERRIDES,
  });

  fs.mkdirSync(path.dirname(AUDIT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(mapping, null, 2)}\n`, 'utf8');
  fs.writeFileSync(AUDIT_PATH, `${JSON.stringify(mapping, null, 2)}\n`, 'utf8');

  const { stats } = mapping;
  console.log(`✓ Wrote ${path.relative(ROOT, OUT_PATH)}`);
  console.log(`  Catalog SKUs: ${stats.catalogSkus}`);
  console.log(`  With images: ${stats.catalogWithImages}`);
  console.log(`  Missing images: ${stats.catalogMissingImages}`);
  console.log(`  Unmapped files (no SKU in name): ${stats.unmappedFileCount}`);
  console.log(`  Image SKUs not in catalog: ${stats.imageSkusNotInCatalog}`);

  if (mapping.skusWithoutImages.length > 0) {
    console.log(`  Missing: ${mapping.skusWithoutImages.join(', ')}`);
  }
}

main();
