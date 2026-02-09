import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import StoreSettings from '../models/StoreSettings.js';
import { sendEmail } from '../utils/email.js';

const signToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken({ id: admin._id, role: 'admin' });

    return res.json({
      success: true,
      message: 'Admin logged in successfully',
      token,
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin dashboard stats (totals + simple charts + recent orders)
export const getAdminStats = async (_req, res) => {
  try {
    const [totalCustomers, activeCustomers, totalOrders, pendingOrders, revenueAgg, productsCount] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ status: 'active' }),
        Order.countDocuments(),
        Order.countDocuments({ status: 'pending' }),
        Order.aggregate([
          { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
        ]),
        Product.countDocuments(),
      ]);

    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

    // Revenue by last 6 months
    const revenueByMonth = await Order.aggregate([
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 6 },
    ]);

    const revenueSeries = revenueByMonth
      .map(r => ({
        month: `${String(r._id.month).padStart(2, '0')}/${String(r._id.year).slice(-2)}`,
        revenue: r.revenue,
      }))
      .reverse();

    // Orders per day (last 7 days)
    const ordersByDay = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 7 },
    ]);

    const ordersSeries = ordersByDay
      .map(o => ({
        day: o._id,
        orders: o.orders,
      }))
      .reverse();

    // Recent orders
    const recentOrdersRaw = await Order.find()
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentOrders = recentOrdersRaw.map(o => ({
      id: o.orderNumber || o._id,
      customer: o.user?.fullName || o.user?.email || o.email,
      status: o.status,
      total: o.total,
      date: o.createdAt,
    }));

    return res.json({
      success: true,
      stats: {
        totalRevenue,
        totalOrders,
        totalCustomers,
        activeCustomers,
        pendingOrders,
        productsCount,
      },
      revenueSeries,
      ordersSeries,
      recentOrders,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to load admin stats' });
  }
};

export const getAdminProfile = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  return res.json({ success: true, admin: req.user });
};

export const getAllUsers = async (_req, res) => {
  try {
    const users = await User.find({}, 'fullName email createdAt status');

    // Compute orders count per user
    const counts = await Order.aggregate([
      {
        $group: {
          _id: '$user',
          ordersCount: { $sum: 1 },
        },
      },
    ]);

    const countsMap = new Map(counts.map(c => [String(c._id), c.ordersCount]));

    return res.json({
      success: true,
      users: users.map(u => ({
        id: u._id,
        fullName: u.fullName,
        email: u.email,
        status: u.status,
        createdAt: u.createdAt,
        ordersCount: countsMap.get(String(u._id)) || 0,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to load users' });
  }
};

// Get store settings (single document)
export const getStoreSettings = async (_req, res) => {
  try {
    let settings = await StoreSettings.findOne();

    if (!settings) {
      settings = await StoreSettings.create({});
    }

    return res.json({
      success: true,
      settings: {
        id: settings._id,
        storeName: settings.storeName,
        currency: settings.currency,
        themeIndex: settings.themeIndex,
      },
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to load store settings' });
  }
};

// Update store settings
export const updateStoreSettings = async (req, res) => {
  try {
    const { storeName, currency, themeIndex } = req.body;

    const allowedCurrencies = ['PKR', 'USD', 'EUR', 'GBP'];
    if (currency && !allowedCurrencies.includes(currency)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid currency value' });
    }

    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = new StoreSettings();
    }

    if (typeof storeName === 'string' && storeName.trim()) {
      settings.storeName = storeName.trim();
    }

    if (currency) {
      settings.currency = currency;
    }

    if (typeof themeIndex === 'number') {
      settings.themeIndex = themeIndex;
    }

    await settings.save();

    return res.json({
      success: true,
      message: 'Store settings updated',
      settings: {
        id: settings._id,
        storeName: settings.storeName,
        currency: settings.currency,
        themeIndex: settings.themeIndex,
      },
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to update store settings' });
  }
};

// Update a user's active/inactive status from admin panel
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      message: 'User status updated',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        status: user.status,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
};

// Admin: request password reset (send OTP code)
export const requestAdminPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      // Do not reveal whether the email exists
      return res.json({
        success: true,
        message: 'If an admin account with this email exists, a reset code has been sent.',
      });
    }

    const resetCode = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    admin.passwordResetCode = resetCode;
    admin.passwordResetExpires = expires;
    await admin.save();

    const html = `
      <p>You requested to reset your ZahraLareina admin password.</p>
      <p>Your admin password reset code is:</p>
      <h2 style="letter-spacing:4px;">${resetCode}</h2>
      <p>This code will expire in 10 minutes.</p>
    `;

    try {
      await sendEmail({
        to: admin.email,
        subject: 'Admin password reset code',
        html,
      });
    } catch (emailErr) {
      console.error('Failed to send admin password reset email', emailErr);
      // Still respond success to avoid leaking details
    }

    return res.json({
      success: true,
      message: 'If an admin account with this email exists, a reset code has been sent.',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin: reset password using OTP code
export const resetAdminPasswordWithCode = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: 'Email, code and new password are required' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin || !admin.passwordResetCode || !admin.passwordResetExpires) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset code' });
    }

    const now = new Date();
    if (admin.passwordResetExpires < now || admin.passwordResetCode !== code) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset code' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    admin.password = hashed;
    admin.passwordResetCode = undefined;
    admin.passwordResetExpires = undefined;
    await admin.save();

    return res.json({
      success: true,
      message: 'Admin password has been updated successfully',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
