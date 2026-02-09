import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { placeOrder, getMyOrders, getAllOrders, updateOrderStatus } from '../controllers/orderController.js';

const router = express.Router();

// User routes
router.post('/', protect, placeOrder);
router.get('/mine', protect, getMyOrders);

// Admin routes
router.get('/admin', protect, adminOnly, getAllOrders);
router.patch('/admin/:id/status', protect, adminOnly, updateOrderStatus);

export default router;
