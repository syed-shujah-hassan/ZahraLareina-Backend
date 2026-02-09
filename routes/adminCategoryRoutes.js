import express from 'express';
import Category from '../models/Category.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(protect, adminOnly);

// Get all categories (admin view)
router.get('/', async (_req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ success: true, categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load categories' });
  }
});

// Create category
router.post('/', async (req, res) => {
  try {
    const { name, image, showInMenu = true, showOnHome = false } = req.body;

    if (!name || !name.trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'Category name is required' });
    }

    const existing = await Category.findOne({ name: name.trim() });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: 'Category with this name already exists' });
    }

    const category = await Category.create({
      name: name.trim(),
      image: image || '',
      showInMenu,
      showOnHome,
    });

    res.status(201).json({ success: true, category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
});

// Update category basic fields
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image, showInMenu, showOnHome } = req.body;

    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (image !== undefined) update.image = image;
    if (showInMenu !== undefined) update.showInMenu = !!showInMenu;
    if (showOnHome !== undefined) update.showOnHome = !!showOnHome;

    const category = await Category.findByIdAndUpdate(id, update, { new: true });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update category' });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
});

// Add subcategory
router.post('/:id/subcategories', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'Subcategory name is required' });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    category.subcategories.push({ name: name.trim() });
    await category.save();

    res.json({ success: true, category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to add subcategory' });
  }
});

// Remove subcategory by index
router.delete('/:id/subcategories/:subIndex', async (req, res) => {
  try {
    const { id, subIndex } = req.params;
    const index = parseInt(subIndex, 10);

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (Number.isNaN(index) || index < 0 || index >= category.subcategories.length) {
      return res.status(400).json({ success: false, message: 'Invalid subcategory index' });
    }

    category.subcategories.splice(index, 1);
    await category.save();

    res.json({ success: true, category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to remove subcategory' });
  }
});

export default router;
