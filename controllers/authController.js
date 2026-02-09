import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import crypto from 'crypto';
import { sendVerificationEmail, sendEmail } from '../utils/email.js';

const signToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

export const signup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Full name, email and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      password: hashed,
      role: 'user',
      provider: 'local',
      isEmailVerified: false,
      emailVerificationCode: verificationCode,
      emailVerificationExpires: expires,
    });

    try {
      await sendVerificationEmail({ to: user.email, code: verificationCode });
    } catch (emailErr) {
      console.error('Failed to send verification email', emailErr);
      // We still created the user; client can trigger resend flow if needed.
    }

    return res.status(201).json({
      success: true,
      message: 'Verification code sent to your email. Please verify to activate your account.',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ success: false, message: 'Please verify your email to log in.' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, message: 'Your account is inactive. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken({ id: user._id, role: user.role });

    return res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMe = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  return res.json({ success: true, user: req.user });
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email and code are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase(), provider: 'local' });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isEmailVerified) {
      const token = signToken({ id: user._id, role: user.role });
      return res.json({
        success: true,
        message: 'Email already verified',
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
      });
    }

    if (!user.emailVerificationCode || !user.emailVerificationExpires) {
      return res.status(400).json({ success: false, message: 'No verification code found. Please sign up again.' });
    }

    const now = new Date();
    if (user.emailVerificationExpires < now) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please sign up again.' });
    }

    if (user.emailVerificationCode !== code) {
      return res.status(400).json({ success: false, message: 'OTP is not correct' });
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    const token = signToken({ id: user._id, role: user.role });

    return res.json({
      success: true,
      message: 'Email verified successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create or update a user coming from Google sign-in on the frontend
export const googleUpsert = async (req, res) => {
  try {
    const { fullName, email, googleId } = req.body;

    if (!email || !googleId) {
      return res.status(400).json({ success: false, message: 'Email and googleId are required' });
    }

    const normalizedEmail = email.toLowerCase();

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        fullName: fullName || normalizedEmail,
        email: normalizedEmail,
        googleId,
        provider: 'google',
        role: 'user',
      });
    } else {
      // Update google fields if needed
      if (!user.googleId || user.provider !== 'google') {
        user.googleId = googleId;
        user.provider = 'google';
        await user.save();
      }
    }

    const token = signToken({ id: user._id, role: user.role });

    return res.json({
      success: true,
      message: 'Google user synced',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const googleCallbackIssueToken = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Google authentication failed' });
  }

  const token = signToken({ id: req.user._id, role: 'user' });

  return res.json({
    success: true,
    message: 'Google login successful',
    token,
    user: {
      id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      role: 'user',
    },
  });
};

// User: request password reset (send OTP code)
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase(), provider: 'local' });
    if (!user || !user.password) {
      // Do not reveal whether the email exists
      return res.json({
        success: true,
        message: 'If an account with this email exists, a reset code has been sent.',
      });
    }

    const resetCode = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.passwordResetCode = resetCode;
    user.passwordResetExpires = expires;
    await user.save();

    const html = `
      <p>You requested to reset your ZahraLareina Luxe password.</p>
      <p>Your password reset code is:</p>
      <h2 style="letter-spacing:4px;">${resetCode}</h2>
      <p>This code will expire in 10 minutes.</p>
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Password reset code',
        html,
      });
    } catch (emailErr) {
      console.error('Failed to send password reset email', emailErr);
      // Still respond success to avoid leaking details
    }

    return res.json({
      success: true,
      message: 'If an account with this email exists, a reset code has been sent.',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// User: reset password using OTP code
export const resetPasswordWithCode = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: 'Email, code and new password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase(), provider: 'local' });
    if (!user || !user.passwordResetCode || !user.passwordResetExpires) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset code' });
    }

    const now = new Date();
    if (user.passwordResetExpires < now || user.passwordResetCode !== code) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset code' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    const token = signToken({ id: user._id, role: user.role });

    return res.json({
      success: true,
      message: 'Password has been updated successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
