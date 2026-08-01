import XLSX from 'xlsx';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'Product list.xlsx');

try {
    const wb = XLSX.readFile(XLSX_PATH);
    const ws = wb.Sheets['Sheet1'];
    const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
    console.log('Sheet1 Rows:', JSON.stringify(data, null, 2));
} catch (err) {
    console.error(err);
}
