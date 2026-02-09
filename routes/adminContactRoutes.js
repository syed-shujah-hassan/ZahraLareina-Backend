import express from 'express';
import ContactMessage from '../models/ContactMessage.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require admin auth
router.use(protect, adminOnly);

// Get all contact messages
router.get('/', async (_req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    return res.json({ success: true, messages });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to load messages' });
  }
});

// Mark a message as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const msg = await ContactMessage.findByIdAndUpdate(
      id,
      { status: 'read' },
      { new: true }
    );

    if (!msg) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    return res.json({ success: true, message: 'Message marked as read', data: msg });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to update message' });
  }
});

export default router;
