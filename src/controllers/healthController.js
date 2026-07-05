const os = require('os');
const mongoose = require('mongoose');
const client = require('prom-client');

// Create a Registry for Prometheus metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

/**
 * Middleware to track request metrics
 */
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  activeConnections.inc();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;

    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode },
      duration
    );

    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });

    activeConnections.dec();
  });

  next();
};

/**
 * Health check endpoint
 * GET /health
 */
const healthCheck = async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const healthData = {
    status: dbState === 1 ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    database: {
      status: dbStatus[dbState] || 'unknown',
    },
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      cpuUsage: os.loadavg(),
      memoryUsage: {
        total: `${(os.totalmem() / 1024 / 1024).toFixed(0)} MB`,
        free: `${(os.freemem() / 1024 / 1024).toFixed(0)} MB`,
        used: `${((os.totalmem() - os.freemem()) / 1024 / 1024).toFixed(0)} MB`,
      },
    },
    process: {
      pid: process.pid,
      memory: {
        rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
      },
    },
  };

  const statusCode = dbState === 1 ? 200 : 503;
  res.status(statusCode).json({
    success: statusCode === 200,
    data: healthData,
  });
};

/**
 * Prometheus metrics endpoint
 * GET /api/metrics
 */
const getMetrics = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to collect metrics',
    });
  }
};

module.exports = {
  healthCheck,
  getMetrics,
  metricsMiddleware,
  httpRequestDuration,
  httpRequestTotal,
  activeConnections,
};
