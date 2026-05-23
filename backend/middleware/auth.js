/**
 * middleware/auth.js
 * JWT verify middleware — access token (15 min) + refresh token (7 days)
 * Sessions stored in Redis for stateless horizontal scaling
 */

const jwt      = require('jsonwebtoken');
const { redisClient } = require('../config/redis');

/**
 * Verify JWT access token from Authorization header
 * Also checks Redis blacklist (for logged-out tokens)
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Check blacklist (logged out tokens)
    const blacklisted = await redisClient.get(`bl:${token}`).catch(() => null);
    if (blacklisted) {
      return res.status(401).json({ success: false, message: 'Token revoked' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { user_id, role, department_id, name }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = { authenticate };
