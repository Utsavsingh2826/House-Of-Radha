const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const AdminUser = require('../models/AdminUser');

async function seedAdmin() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set in server/.env');
  }

  const ownConnection = mongoose.connection.readyState === 0;
  if (ownConnection) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  const adminCount = await AdminUser.countDocuments();
  if (adminCount > 0) {
    console.log('Admin user already exists. Skipping seeding.');
  } else {
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@houseofradha.com';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'adminpassword123';

    await AdminUser.create({
      firstName: 'Admin',
      lastName: 'User',
      email: adminEmail,
      password: adminPassword,
    });

    console.log('--------------------------------------------------');
    console.log('Default Admin User Seeded Successfully!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('--------------------------------------------------');
  }

  if (ownConnection) {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seedAdmin().catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  });
}

module.exports = seedAdmin;
