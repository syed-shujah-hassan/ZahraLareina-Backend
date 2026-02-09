import express from 'express';
import Subscriber from '../models/Subscriber.js';
import { sendEmail } from '../utils/email.js';

const router = express.Router();

// Public: subscribe to newsletter / updates
router.post('/', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Valid email is required' });
    }

    const normalized = email.toLowerCase().trim();

    let existing = await Subscriber.findOne({ email: normalized });
    if (existing) {
      return res.json({ success: true, message: 'You are already subscribed' });
    }

    const subscriber = await Subscriber.create({ email: normalized });

    // Fire-and-forget welcome email (non-blocking)
    const html = `
      <p>Thank you for subscribing to ZahraLareina Luxe.</p>
      <p>You will be the first to know about new arrivals and exclusive offers.</p>
    `;

    sendEmail({
      to: subscriber.email,
      subject: 'Welcome to ZahraLareina Luxe',
      html,
    }).catch(err => {
      console.error('Failed to send subscription welcome email', err);
    });

    return res.status(201).json({ success: true, message: 'Subscribed successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to subscribe' });
  }
});

export default router;
