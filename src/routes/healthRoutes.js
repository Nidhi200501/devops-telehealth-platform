const express = require('express');
const { healthCheck, getMetrics } = require('../controllers/healthController');

const router = express.Router();

// GET /health
router.get('/health', healthCheck);

// GET /api/metrics
router.get('/api/metrics', getMetrics);

module.exports = router;
