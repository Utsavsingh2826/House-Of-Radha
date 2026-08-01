require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const path = require('path');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { listProducts } = require('../controllers/products');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const docs = await Product.find({}).sort({ sku: 1 }).limit(15).lean();
  console.log('raw docs count', docs.length);
  console.log(docs.slice(0, 5).map((d) => ({ sku: d.sku, category: d.category, price: d.priceAmount })));

  const req = { query: { all: 'true' } };
  let payload;
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
    },
  };

  await listProducts(req, res);
  console.log('controller payload count', payload?.count);
  console.log(payload?.data?.slice(0, 8).map((p) => ({ sku: p.sku, category: p.category, price: p.priceAmount })));

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
