import XLSX from 'xlsx';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const xlsxPath = path.resolve(__dirname, '../public/Product list (1).xlsx');

const wb = XLSX.readFile(xlsxPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });

console.log('Total rows:', rows.length);
console.log('Header row:', JSON.stringify(rows[0]));
console.log('---');
for (let i = 1; i < rows.length; i++) {
  console.log(`Row ${i}:`, JSON.stringify(rows[i]));
}
