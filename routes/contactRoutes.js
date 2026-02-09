import express from 'express';
import ContactMessage from '../models/ContactMessage.js';

const router = express.Router();

// Public: submit a contact message
router.post('/', async (req, res) => {
  try {
    const { fullName, email, subject, message } = req.body;

    if (!fullName || !email || !subject || !message) {
      return res
        .status(400)
        .json({ success: false, message: 'Full name, email, subject and message are required' });
    }

    await ContactMessage.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      subject: subject.trim(),
      message: message.trim(),
    });

    return res.status(201).json({ success: true, message: 'Message sent successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

export default router;
