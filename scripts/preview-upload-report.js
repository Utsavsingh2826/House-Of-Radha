/**
 * Dry-run: catalog + images → upload failure report (no Mongo/Cloudinary).
 *
 * Run: npm run catalog:report
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assessCatalogRow,
  buildImageMapping,
  loadCatalogRows,
  parseExcelPrice,
} from './lib/catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const OVERRIDES = path.join(__dirname, 'image-overrides.json');
const OUT_PATH = path.join(ROOT, 'reports', 'upload-failures.json');

function main() {
  const catalogRows = loadCatalogRows(ROOT);
  const mapping = buildImageMapping({
    rootDir: ROOT,
    catalogRows,
    overridesPath: OVERRIDES,
  });

  const failures = [];
  let storefrontReady = 0;

  for (const row of catalogRows) {
    const paths = mapping.bySku[row.sku]?.paths || [];
    const price = parseExcelPrice(row.priceInr, row.priceTier);
    const assessment = assessCatalogRow(row, paths, price);

    if (assessment.storefrontReady) {
      storefrontReady += 1;
    } else {
      failures.push({
        sku: row.sku,
        name: row.name,
        category: row.category,
        gender: row.genderRaw,
        price: price.priceAmount,
        imageCount: paths.length,
        reasons: [...assessment.reasons, ...assessment.warnings],
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    catalogSkus: catalogRows.length,
    storefrontReady,
    notReady: failures.length,
    failures: failures.sort((a, b) => a.sku.localeCompare(b.sku)),
    mappingStats: mapping.stats,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`Catalog SKUs: ${report.catalogSkus}`);
  console.log(`Storefront-ready (name+gender+price+image): ${storefrontReady}`);
  console.log(`Not ready: ${failures.length}`);
  console.log(`Report → ${path.relative(ROOT, OUT_PATH)}`);

  if (failures.length > 0) {
    console.log('\n--- Not uploaded to storefront (preview) ---');
    for (const f of failures) {
      console.log(`${f.sku} | ${f.name} | ${f.reasons.join('; ')}`);
    }
  }
}

main();
