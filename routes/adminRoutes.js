import express from 'express';
import {
  adminLogin,
  getAdminProfile,
  getAllUsers,
  updateUserStatus,
  getAdminStats,
  getStoreSettings,
  updateStoreSettings,
  requestAdminPasswordReset,
  resetAdminPasswordWithCode,
} from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', adminLogin);
router.get('/me', protect, adminOnly, getAdminProfile);
router.get('/users', protect, adminOnly, getAllUsers);
router.patch('/users/:id/status', protect, adminOnly, updateUserStatus);
router.get('/stats', protect, adminOnly, getAdminStats);

// Store settings
router.get('/settings', protect, adminOnly, getStoreSettings);
router.put('/settings', protect, adminOnly, updateStoreSettings);

// Public, read-only view of store settings (for storefront currency, name, theme)
router.get('/public-settings', getStoreSettings);

// Admin forgot password (OTP-based)
router.post('/forgot-password', requestAdminPasswordReset);
router.post('/reset-password', resetAdminPasswordWithCode);

export default router;
