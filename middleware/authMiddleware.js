const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'xmed_super_secure_national_health_secret_key_2026_bd';

function authenticateToken(req, res, next) {
  let token = null;

  // Check Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query && req.query.token) {
    // Support token in query for printable views / direct document downloads
    token = req.query.token;
  } else if (req.headers.cookie) {
    // Support token in cookie
    const cookies = req.headers.cookie.split(';');
    for (const c of cookies) {
      const [name, val] = c.trim().split('=');
      if (name === 'xmed_token') {
        token = decodeURIComponent(val);
        break;
      }
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Session expired or invalid token.' });
    }
    req.user = user;
    next();
  });
}

function isDoctor(req, res, next) {
  if (!req.user || req.user.role !== 'doctor') {
    return res.status(403).json({ success: false, message: 'Access denied: Doctor privileges required.' });
  }
  next();
}

function isPatient(req, res, next) {
  if (!req.user || req.user.role !== 'patient') {
    return res.status(403).json({ success: false, message: 'Access denied: Patient privileges required.' });
  }
  next();
}

module.exports = {
  authenticateToken,
  isDoctor,
  isPatient
};
