import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_PATH = path.resolve(__dirname, '..', 'server', '.env');

const envContent = `PORT=5000
MONGO_URI=mongodb+srv://utsavsingh2826:Utsav%401234@cluster0.nk2ikpj.mongodb.net/houseofradha?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=radha_secret_key_925_silver_premium
JWT_EXPIRE=7d
NODE_ENV=development

RAZORPAY_KEY_ID=rzp_test_SpxBevQ66zbRNz
RAZORPAY_KEY_SECRET=ECDqStCd21iCqZ0M58LR6xy3
RESET_URL=http://localhost:5173/reset-password

DEFAULT_ADMIN_EMAIL=utsav@houseofradha.com
DEFAULT_ADMIN_PASSWORD=Utsav@1234
CLOUDINARY_CLOUD_NAME=djcdk3pi4
CLOUDINARY_API_KEY=284522539313373
CLOUDINARY_API_SECRET=XDaFMq4IbnMC4fXjaL3T1SP-f6w
`;

fs.writeFileSync(ENV_PATH, envContent, 'utf8');
console.log('Successfully wrote server/.env file.');
