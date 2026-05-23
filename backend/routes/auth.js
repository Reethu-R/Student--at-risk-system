/**
 * routes/auth.js
 * POST /api/auth/login
 * POST /api/auth/logout
 * POST /api/auth/refresh-token
 */

const express   = require('express');
const router    = express.Router();
const bcrypt    = require('bcrypt');
const jwt       = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db        = require('../config/db');
const { redisClient } = require('../config/redis');
const { authenticate } = require('../middleware/auth');
const pool      = require('../config/db');

// ── Helper: generate tokens ──────────────────────────────────
const generateTokens = (user) => {
  const payload = {
    user_id:       user.user_id,
    role:          user.role,
    department_id: user.department_id,
    name:          user.name,
  };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });
  const refreshToken = jwt.sign(
    { user_id: user.user_id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

// ── POST /api/auth/login ─────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      // Fetch user
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
        [email]
      );

      if (!rows.length) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const user = rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const { accessToken, refreshToken } = generateTokens(user);

      // Store refresh token hash in Redis (TTL: 7 days)
      const crypto = require('crypto');
      const rtHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await redisClient.setEx(`rt:${user.user_id}:${rtHash}`, 7 * 24 * 3600, '1');

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge:   7 * 24 * 60 * 60 * 1000,
      });

      // Audit log
      await pool.execute(
        'INSERT INTO audit_logs (user_id, action, ip_address) VALUES (?, ?, ?)',
        [user.user_id, 'LOGIN', req.ip]
      );

      return res.json({
        success: true,
        accessToken,
        user: {
          user_id:       user.user_id,
          name:          user.name,
          email:         user.email,
          role:          user.role,
          department_id: user.department_id,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ── POST /api/auth/refresh-token ─────────────────────────────
router.post('/refresh-token', async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No refresh token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const crypto  = require('crypto');
    const rtHash  = crypto.createHash('sha256').update(token).digest('hex');
    const exists  = await redisClient.get(`rt:${decoded.user_id}:${rtHash}`);

    if (!exists) {
      return res.status(401).json({ success: false, message: 'Refresh token invalid or expired' });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE user_id = ? AND is_active = TRUE',
      [decoded.user_id]
    );
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const { accessToken, refreshToken: newRT } = generateTokens(rows[0]);

    // Rotate refresh token
    await redisClient.del(`rt:${decoded.user_id}:${rtHash}`);
    const newHash = crypto.createHash('sha256').update(newRT).digest('hex');
    await redisClient.setEx(`rt:${decoded.user_id}:${newHash}`, 7 * 24 * 3600, '1');

    res.cookie('refreshToken', newRT, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge:   7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ success: true, accessToken });
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

// ── POST /api/auth/logout ────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      // Blacklist access token until it expires (15 min)
      await redisClient.setEx(`bl:${token}`, 15 * 60, '1');
    }
    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    await pool.execute(
      'INSERT INTO audit_logs (user_id, action, ip_address) VALUES (?, ?, ?)',
      [req.user.user_id, 'LOGOUT', req.ip]
    );

    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
