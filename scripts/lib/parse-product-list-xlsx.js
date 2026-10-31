/**
 * Parses `Product list.xlsx` (Band Bracelets sheet) into normalized catalog rows.
 */

import XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';
import { norm, parseWeightGrams } from './catalog.js';

/** Main catalog sheets. Sheet1 is Rakhi-only and is excluded. */
export const CATALOG_SHEET_NAMES = ['Band Bracelets'];

const SKU_RE = /^[A-Z]{2}-[A-Z0-9]+-\d+$/i;

function findHeaderRowIndex(matrix) {
  for (let i = 0; i < Math.min(matrix.length, 10); i++) {
    const col1 = norm(matrix[i]?.[1]).toLowerCase();
    if (col1.includes('product code')) return i;
  }
  return 1;
}

function columnMap(headerRow) {
  const map = {};
  headerRow.forEach((label, index) => {
    const key = norm(label).toLowerCase();
    if (!key) return;
    if (key.includes('product code') && key.includes('sku')) map.sku = index;
    else if (key === 'issue with product') map.issue = index;
    else if (key.includes('product name')) map.name = index;
    else if (key === 'gender') map.gender = index;
    else if (key === 'category') map.category = index;
    else if (key === 'subcategory') map.subcategory = index;
    else if (key === 'description') map.description = index;
    else if (key === 'weight') map.weight = index;
    else if (key.includes('price (inr)')) map.priceInr = index;
    else if (key === 'product code' && map.priceTier === undefined) map.priceTier = index;
    else if (key.includes('update rate')) map.updateRate = index;
    else if (key === 'keywords') map.keywords = index;
  });
  // New sheet: tier code column is labeled "Product code" after Price (INR)
  if (map.priceTier === undefined) {
    const priceIdx = map.priceInr;
    if (typeof priceIdx === 'number') map.priceTier = priceIdx + 1;
  }
  return map;
}

export function normalizeCategory(raw) {
  const c = norm(raw);
  if (!c) return '';
  return c.replace(/\s+/g, ' ').trim();
}

export function parseRowFromMatrix(row, cols, sheetName, rowIndex) {
  const sku = norm(row[cols.sku]).toUpperCase();
  if (!sku || sku.includes('PRODUCT CODE') || !SKU_RE.test(sku)) {
    return null;
  }

  const category = normalizeCategory(row[cols.category]);
  if (/^rakhi$/i.test(category)) return null;

  const name = norm(row[cols.name]) || sku;
  const priceInr = row[cols.priceInr];
  const priceTier = row[cols.priceTier] ?? row[cols.updateRate];

  return {
    sku,
    name,
    genderRaw: norm(row[cols.gender]),
    category: category || 'Jewelry',
    subcategory: norm(row[cols.subcategory]),
    weight: parseWeightGrams(row[cols.weight]),
    priceInr,
    priceTier,
    description: norm(row[cols.description]),
    keywords: norm(row[cols.keywords]),
    excelIssue: norm(row[cols.issue]),
    sourceSheet: sheetName,
    sourceRow: rowIndex + 1,
  };
}

function rowCompletenessScore(row) {
  let score = 0;
  if (norm(row.genderRaw)) score += 4;
  if (row.priceInr !== '' && row.priceInr != null) score += 4;
  if (norm(row.priceTier)) score += 2;
  if (norm(row.name)) score += 1;
  if (norm(row.description)) score += 1;
  if (row.weight > 0) score += 1;
  return score;
}

function mergeCatalogRow(existing, incoming) {
  if (rowCompletenessScore(incoming) > rowCompletenessScore(existing)) {
    return {
      ...incoming,
      excelIssue: incoming.excelIssue || existing.excelIssue,
      description: incoming.description || existing.description,
      keywords: incoming.keywords || existing.keywords,
    };
  }
  return {
    ...existing,
    excelIssue: existing.excelIssue || incoming.excelIssue,
    description: existing.description || incoming.description,
    keywords: existing.keywords || incoming.keywords,
  };
}

export function parseProductListFromWorkbook(wb) {
  const bySku = new Map();

  for (const sheetName of CATALOG_SHEET_NAMES) {
    if (!wb.SheetNames.includes(sheetName)) continue;
    const matrix = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
    const headerIdx = findHeaderRowIndex(matrix);
    const cols = columnMap(matrix[headerIdx]);

    if (cols.sku === undefined || cols.name === undefined) {
      throw new Error(`Could not detect SKU/name columns on sheet "${sheetName}"`);
    }

    for (let i = headerIdx + 1; i < matrix.length; i++) {
      const parsed = parseRowFromMatrix(matrix[i], cols, sheetName, i);
      if (!parsed) continue;
      if (bySku.has(parsed.sku)) {
        bySku.set(parsed.sku, mergeCatalogRow(bySku.get(parsed.sku), parsed));
      } else {
        bySku.set(parsed.sku, parsed);
      }
    }
  }

  return [...bySku.values()].sort((a, b) => a.sku.localeCompare(b.sku));
}

export function parseProductListXlsx(xlsxPath) {
  if (!fs.existsSync(xlsxPath)) {
    throw new Error(`Product list not found at ${xlsxPath}`);
  }
  const wb = XLSX.readFile(xlsxPath);
  return parseProductListFromWorkbook(wb);
}

export function writeProductCatalogJson(rows, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
}
