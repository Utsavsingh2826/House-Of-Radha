const request = require('supertest');
const User = require('../models/User');
const Product = require('../models/Product');

async function registerUser(app, overrides = {}) {
  const payload = {
    firstName: 'Test',
    lastName: 'User',
    email: `test${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`,
    password: 'secret123',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(payload);
  if (!res.body.success) {
    throw new Error(`registerUser failed: ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user, password: payload.password };
}

async function seedSampleProducts() {
  const products = [
    {
      sku: 'TEST-001',
      name: 'Test Bracelet One',
      gender: 'female',
      category: 'Bracelet',
      priceAmount: 1000,
      priceDisplay: 'Rs. 1,000',
      image: '/test-001.jpg',
      images: ['/test-001.jpg'],
      available: true,
    },
    {
      sku: 'TEST-002',
      name: 'Test Bracelet Two',
      gender: 'male',
      category: 'Bracelet',
      priceAmount: 2500,
      priceDisplay: 'Rs. 2,500',
      image: '/test-002.jpg',
      images: ['/test-002.jpg'],
      available: true,
    },
    {
      sku: 'TEST-003',
      name: 'Unavailable Item',
      gender: 'unisex',
      category: 'Necklace',
      priceAmount: 5000,
      priceDisplay: 'Rs. 5,000',
      available: false,
    },
  ];
  return Product.insertMany(products);
}

const sampleAddress = () => ({
  fullName: 'Radha Sharma',
  phone: '9876543210',
  line1: '12, Silver Lane',
  line2: 'Apt 5',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  country: 'India',
});

module.exports = { registerUser, seedSampleProducts, sampleAddress };
