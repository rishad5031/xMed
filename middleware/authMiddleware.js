const jwt = require('jsonwebtoken');

require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'xmed_super_secure_national_health_secret_key_2026_bd';

/**
 * Universal Authentication Middleware
 * Validates cryptographic JWT tokens across three extraction channels:
 * 1. HTTP Authorization Header: "Bearer <token>" (REST API consumers)
 * 2. URL Query String: "?token=<token>" (Direct PDF exports / printable prescriptions)
 * 3. Browser Cookie: "xmed_token=<token>" (Seamless multi-page web sessions)
 */
function authenticateToken(req, res, next) {
  let token = null;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {

    token = authHeader.substring(7);
  } 
  else if (req.query && req.query.token) {

    token = req.query.token;
  } 
  else if (req.headers.cookie) {

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
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required. Please log in to access this protected healthcare resource.' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: 'Session expired or invalid cryptographic token. Please log in again.' 
      });
    }

    req.user = user;

    next();
  });
}

/**
 * Doctor Role Guard Middleware
 * Restricts access strictly to verified BMDC clinical doctors.
 */
function isDoctor(req, res, next) {
  if (!req.user || req.user.role !== 'doctor') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied: Doctor clinical privileges required for this action.' 
    });
  }
  next();
}

/**
 * Patient Role Guard Middleware
 * Restricts access strictly to registered national citizens.
 */
function isPatient(req, res, next) {
  if (!req.user || req.user.role !== 'patient') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied: Citizen patient privileges required for this action.' 
    });
  }
  next();
}

module.exports = {
  authenticateToken,
  isDoctor,
  isPatient
};
