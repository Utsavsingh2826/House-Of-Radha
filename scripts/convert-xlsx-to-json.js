import XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'Product list.xlsx');
const OUT_PATH = path.join(ROOT, 'products_raw.json');

try {
    console.log(`Reading from: ${XLSX_PATH}`);
    const wb = XLSX.readFile(XLSX_PATH);
    console.log('Sheets found:', wb.SheetNames);

    // Convert first sheet to JSON (as array of arrays or array of objects)
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

    fs.writeFileSync(OUT_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Successfully wrote ${data.length} rows to ${OUT_PATH}`);
} catch (err) {
    console.error('Error during conversion:', err);
    process.exit(1);
}
