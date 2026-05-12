/**
 * Reads `public/Product list (1).xlsx` + scans `public/` for product images
 * (matched by SKU prefix, e.g. BC-BN-001_front.jpg → BC-BN-001) and writes
 * `src/data/products.json`.
 *
 * Run with: `npm run build:products`
 */

import XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const XLSX_PATH = path.join(PUBLIC_DIR, 'Product list (1).xlsx');
const OUT_DIR = path.join(ROOT, 'src', 'data');
const OUT_PATH = path.join(OUT_DIR, 'products.json');

const IMAGE_EXT = /\.(jpg|jpeg|png|webp|avif)$/i;

const norm = (s) => String(s ?? '').trim();

// Excel price column holds tier codes (e.g. "P75", "P50"). Until the real
// ₹ mapping is finalised we show the code itself on the UI. `amount` stays
// numeric (digits × 100 placeholder) so cart totals and Razorpay continue
// to work end-to-end; once a real mapping is provided just update `amount`.
function parsePrice(raw) {
  const s = norm(raw);
  if (!s) return { display: 'Price on request', raw: '', amount: null };
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if (!m) return { display: s, raw: s, amount: null };
  const amount = Math.round(parseFloat(m[1]) * 100);
  return {
    raw: s,
    amount,
    display: s,
  };
}

function normaliseGender(raw) {
  const s = norm(raw).toLowerCase();
  if (s.startsWith('f') || s.includes('women')) return 'female';
  if (s.startsWith('m') || s.includes('men')) return 'male';
  return 'unisex';
}

function indexImagesBySku() {
  const files = fs
    .readdirSync(PUBLIC_DIR, { withFileTypes: true })
    .filter((d) => d.isFile() && IMAGE_EXT.test(d.name))
    .map((d) => d.name);

  const bySku = new Map();
  for (const file of files) {
    const skuMatch = file.match(/^(BC-BN-\d+)/i);
    if (!skuMatch) continue;
    const sku = skuMatch[1].toUpperCase();
    if (!bySku.has(sku)) bySku.set(sku, []);
    bySku.get(sku).push(file);
  }

  // Sort views: prefer "front" first, then everything else.
  for (const list of bySku.values()) {
    list.sort((a, b) => {
      const aFront = /front/i.test(a) ? 0 : 1;
      const bFront = /front/i.test(b) ? 0 : 1;
      if (aFront !== bFront) return aFront - bFront;
      return a.localeCompare(b);
    });
  }
  return bySku;
}

function rowsFromSheet() {
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });
  // Header is at index 1; product rows start at index 2.
  const rows = [];
  for (let i = 2; i < matrix.length; i++) {
    const r = matrix[i];
    if (!r || !norm(r[1])) continue; // skip blank rows
    rows.push({
      sr: r[0],
      sku: norm(r[1]).toUpperCase(),
      name: norm(r[2]),
      gender: norm(r[3]),
      category: norm(r[4]) || 'Bracelet',
      subcategory: norm(r[5]),
      weight: r[6],
      price: r[7],
      description: norm(r[8]),
      excelImageNote: norm(r[9]),
      keywords: norm(r[11]),
    });
  }
  return rows;
}

function publicUrl(filename) {
  return '/' + encodeURIComponent(filename);
}

function build() {
  const skuToFiles = indexImagesBySku();
  const rawRows = rowsFromSheet();

  const products = rawRows
    .filter((r) => r.name) // require at least a name
    .map((r) => {
      const files = skuToFiles.get(r.sku) ?? [];
      const price = parsePrice(r.price);
      return {
        sku: r.sku,
        name: r.name,
        gender: normaliseGender(r.gender),
        genderLabel: r.gender || '',
        category: r.category,
        subcategory: r.subcategory,
        weight: typeof r.weight === 'number' ? r.weight : norm(r.weight),
        weightLabel: r.weight ? `${r.weight}g` : '',
        priceRaw: price.raw,
        priceAmount: price.amount,
        priceDisplay: price.display,
        description: r.description,
        keywords: r.keywords,
        image: files[0] ? publicUrl(files[0]) : null,
        images: files.map(publicUrl),
        available: files.length > 0,
      };
    });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(products, null, 2) + '\n', 'utf8');

  const withImages = products.filter((p) => p.available).length;
  const without = products.length - withImages;
  console.log(`✓ Wrote ${products.length} products → ${path.relative(ROOT, OUT_PATH)}`);
  console.log(`  ${withImages} with images, ${without} pending images`);
  console.log(`  Genders: ${
    JSON.stringify(
      products.reduce((acc, p) => {
        acc[p.gender] = (acc[p.gender] ?? 0) + 1;
        return acc;
      }, {}),
    )
  }`);
}

build();
