import express from 'express';
import { signup, login, getMe, googleUpsert, googleCallbackIssueToken, verifyEmail, requestPasswordReset, resetPasswordWithCode } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Email/password auth
router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/google', googleUpsert);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPasswordWithCode);

export default router;
