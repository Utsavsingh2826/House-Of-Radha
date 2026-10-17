/**
 * Reads products_raw.json + product-image-mapping.json → src/data/products.json
 *
 * Run: npm run build:products  (runs build:mapping first via npm script)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildImageMapping,
  catalogRowsToProducts,
  parseCatalogRows,
  readProductsRaw,
} from './lib/catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const PRODUCTS_RAW = path.join(ROOT, 'products_raw.json');
const MAPPING_PATH = path.join(ROOT, 'product-image-mapping.json');
const OVERRIDES = path.join(__dirname, 'image-overrides.json');
const OUT_DIR = path.join(ROOT, 'src', 'data');
const OUT_PATH = path.join(OUT_DIR, 'products.json');

function loadMapping(catalogRows) {
  if (fs.existsSync(MAPPING_PATH)) {
    const data = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf8'));
    return data.bySku || {};
  }
  const built = buildImageMapping({
    rootDir: ROOT,
    catalogRows,
    overridesPath: OVERRIDES,
  });
  return built.bySku;
}

function main() {
  const productsRaw = readProductsRaw(PRODUCTS_RAW);
  const catalogRows = parseCatalogRows(productsRaw);
  const mappingBySku = loadMapping(catalogRows);
  const products = catalogRowsToProducts(catalogRows, mappingBySku);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(products, null, 2)}\n`, 'utf8');

  const withImages = products.filter((p) => p.available).length;
  console.log(`✓ Wrote ${products.length} products → ${path.relative(ROOT, OUT_PATH)}`);
  console.log(`  ${withImages} with local images, ${products.length - withImages} pending images`);
}

main();
