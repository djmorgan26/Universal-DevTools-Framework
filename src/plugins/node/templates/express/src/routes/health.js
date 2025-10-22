/**
 * Health Check Routes
 *
 * Provides health check endpoints for monitoring
 */

const express = require('express');
const router = express.Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * GET /health/ready
 * Readiness check (for K8s/container orchestration)
 */
router.get('/ready', (req, res) => {
  // Add checks for database, external services, etc.
  const isReady = true;

  if (isReady) {
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /health/live
 * Liveness check (for K8s/container orchestration)
 */
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

module.exports = { healthRouter: router };
