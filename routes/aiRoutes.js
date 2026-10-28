const express = require('express');

const router = express.Router();

const aiController = require('../controllers/aiController');

router.post('/chat', aiController.handleChat);

router.get('/status', aiController.getStatus);

module.exports = router;
