/**
 * Reads Product list.xlsx → products_catalog.json (+ legacy products_raw.json)
 *
 * Run: npm run convert:products
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';
import {
  parseProductListFromWorkbook,
  writeProductCatalogJson,
} from './lib/parse-product-list-xlsx.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'Product list.xlsx');
const CATALOG_PATH = path.join(ROOT, 'products_catalog.json');
const LEGACY_RAW_PATH = path.join(ROOT, 'products_raw.json');

try {
  console.log(`Reading from: ${XLSX_PATH}`);
  const wb = XLSX.readFile(XLSX_PATH);
  console.log('Sheets found:', wb.SheetNames);

  const catalogRows = parseProductListFromWorkbook(wb);
  writeProductCatalogJson(catalogRows, CATALOG_PATH);
  console.log(`✓ Wrote ${catalogRows.length} catalog row(s) → ${path.basename(CATALOG_PATH)}`);

  // Legacy export (first sheet only) for backwards compatibility
  const ws = wb.Sheets[wb.SheetNames[0]];
  const legacy = XLSX.utils.sheet_to_json(ws, { defval: '' });
  fs.writeFileSync(LEGACY_RAW_PATH, `${JSON.stringify(legacy, null, 2)}\n`, 'utf8');
  console.log(`✓ Wrote legacy ${legacy.length} row(s) → ${path.basename(LEGACY_RAW_PATH)}`);
} catch (err) {
  console.error('Error during conversion:', err.message);
  process.exit(1);
}
