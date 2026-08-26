const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// =============================================================
// MR.MED AI Assistant Routes (100% Server-Side Automated Proxy)
// No client-side API key required - open to all visitors
// =============================================================

// Main Chat Dispatch Endpoint
router.post('/chat', aiController.handleChat);

// Status route
router.get('/status', aiController.getStatus);

module.exports = router;
