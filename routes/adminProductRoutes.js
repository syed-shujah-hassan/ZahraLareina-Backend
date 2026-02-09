import express from 'express';
import Product from '../models/Product.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes here require admin auth
router.use(protect, adminOnly);

// Get all products (admin list)
router.get('/', async (_req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load products' });
  }
});

// Create product
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      subcategory,
      images,
      sizes,
      inStock,
      isNew,
      isFeatured,
      featuredPriority,
      discount,
    } = req.body;

    if (!name || !description || price == null || !category) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const product = await Product.create({
      name: name.trim(),
      description: description.trim(),
      price,
      category: category.trim(),
      subcategory: subcategory?.trim() || undefined,
      images: Array.isArray(images) ? images : images ? [images] : [],
      sizes: Array.isArray(sizes) ? sizes : sizes ? [sizes] : [],
      inStock: inStock ?? true,
      isNew: isNew ?? false,
      isFeatured: isFeatured ?? false,
      featuredPriority: typeof featuredPriority === 'number' ? featuredPriority : 0,
      discount: discount ?? undefined,
    });

    res.status(201).json({ success: true, product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
});

// Update product
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const update = { ...req.body };

    if (update.name) update.name = update.name.trim();
    if (update.description) update.description = update.description.trim();
    if (update.category) update.category = update.category.trim();
    if (update.subcategory) update.subcategory = update.subcategory.trim();

    const product = await Product.findByIdAndUpdate(id, update, { new: true });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
});

export default router;
