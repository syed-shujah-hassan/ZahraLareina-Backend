import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

// Public: get all products (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { category, subcategory, isNew, isFeatured } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (isNew === 'true') filter.isNew = true;
    if (isFeatured === 'true') filter.isFeatured = true;

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: 'Failed to load products' });
  }
});

// Public: get single product by id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: 'Failed to load product' });
  }
});

export default router;