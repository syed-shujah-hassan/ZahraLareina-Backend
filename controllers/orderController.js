import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { sendEmail } from '../utils/email.js';

// User: place a new order
export const placeOrder = async (req, res) => {
  try {
    const { items, total } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in order' });
    }

    if (!req.user || (!req.user._id && !req.user.id)) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const userId = req.user._id || req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const orderItems = [];

    for (const item of items) {
      const { productId, size, quantity } = item;
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(400).json({ success: false, message: 'One of the products no longer exists' });
      }

      const finalPrice = typeof product.discount === 'number' && product.discount > 0
        ? product.discount
        : product.price;

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0] || '',
        price: finalPrice,
        size,
        quantity,
      });
    }

    const calculatedTotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    // Simple human-friendly order number, e.g. ZL-20240204-1234
    const timestamp = new Date();
    const y = String(timestamp.getFullYear());
    const m = String(timestamp.getMonth() + 1).padStart(2, '0');
    const d = String(timestamp.getDate()).padStart(2, '0');
    const rnd = String(Math.floor(1000 + Math.random() * 9000));
    const orderNumber = `ZL-${y}${m}${d}-${rnd}`;

    const order = await Order.create({
      orderNumber,
      user: user._id,
      email: user.email,
      items: orderItems,
      total: calculatedTotal,
    });

    // Build simple HTML list of ordered items for emails
    const itemsHtml = orderItems
      .map(i => {
        const lineTotal = (i.price * i.quantity).toFixed(2);
        const sizePart = i.size ? ` (Size: ${i.size})` : '';
        return `<li>${i.name}${sizePart} &times; ${i.quantity} - Rs ${lineTotal}</li>`;
      })
      .join('');

    const itemsSectionHtml = `
      <ul>
        ${itemsHtml}
      </ul>
    `;

    // Fire-and-forget email notifications (don't block order creation on email failures)
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

    if (adminEmail) {
      const adminSubject = `New order placed: ${orderNumber}`;
      const adminHtml = `
        <p>A new order has been placed on ZahraLareina.</p>
        <p><strong>Order Number:</strong> ${orderNumber}</p>
        <p><strong>Customer:</strong> ${user.fullName} (${user.email})</p>
        <p><strong>Total:</strong> Rs ${calculatedTotal.toFixed(2)}</p>
        <p><strong>Items:</strong></p>
        ${itemsSectionHtml}
      `;

      sendEmail({ to: adminEmail, subject: adminSubject, html: adminHtml }).catch(err => {
        console.error('Failed to send admin order notification email', err);
      });
    }

    const userSubject = `Your order ${orderNumber} has been placed`;
    const userHtml = `
      <p>Dear ${user.fullName || 'Customer'},</p>
      <p>Thank you for your order at ZahraLareina Luxe.</p>
      <p><strong>Order Number:</strong> ${orderNumber}</p>
      <p><strong>Total:</strong> Rs ${calculatedTotal.toFixed(2)}</p>
      <p><strong>Your Items:</strong></p>
      ${itemsSectionHtml}
      <p>We will notify you when your order is shipped.</p>
    `;

    sendEmail({ to: user.email, subject: userSubject, html: userHtml }).catch(err => {
      console.error('Failed to send user order confirmation email', err);
    });

    return res.status(201).json({ success: true, message: 'Order placed', order });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to place order' });
  }
};

// User: get my orders
export const getMyOrders = async (req, res) => {
  try {
    if (!req.user || (!req.user._id && !req.user.id)) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const userId = req.user._id || req.user.id;

    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });

    return res.json({ success: true, orders });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to load orders' });
  }
};

// Admin: get all orders
export const getAllOrders = async (_req, res) => {
  try {
    const orders = await Order.find().populate('user', 'fullName email').sort({ createdAt: -1 });

    return res.json({ success: true, orders });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to load orders' });
  }
};

// Admin: update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'processing', 'shipped', 'delivered'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Fire-and-forget email notification to customer about status change
    if (order.email) {
      const userEmail = order.email;
      const orderNumber = order.orderNumber || order._id.toString();

      const subject = `Your order ${orderNumber} status is now ${status}`;
      const html = `
        <p>Dear Customer,</p>
        <p>Your order <strong>${orderNumber}</strong> status has been updated.</p>
        <p><strong>New Status:</strong> ${status}</p>
        <p>If you have any questions, you can reply to this email.</p>
        <p>Thank you for shopping with ZahraLareina Luxe.</p>
      `;

      sendEmail({ to: userEmail, subject, html }).catch(err => {
        console.error('Failed to send order status update email', err);
      });
    }

    return res.json({ success: true, message: 'Order status updated', order });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
};
