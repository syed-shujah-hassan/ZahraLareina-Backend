import express from 'express';
import Category from '../models/Category.js';

const router = express.Router();

// Public: get all categories with subcategories
router.get('/', async (_req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ success: true, categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load categories' });
  }
});

// Public: only categories that should appear in menu
router.get('/menu', async (_req, res) => {
  try {
    const categories = await Category.find({ showInMenu: true }).sort({ name: 1 });
    res.json({ success: true, categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load menu categories' });
  }
});

export default router;
