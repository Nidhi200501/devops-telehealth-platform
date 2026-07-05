const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');

// Rate limiters
const {
  apiLimiter,
  authLimiter,
  healthLimiter,
  appointmentLimiter
} = require('./middleware/rateLimiter');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { metricsMiddleware } = require('./controllers/healthController');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/authRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const healthRoutes = require('./routes/healthRoutes');

// Create Express app
const app = express();

// ======================
// Security Middleware
// ======================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // 24 hours
}));

// ======================
// General Middleware
// ======================
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// ======================
// Monitoring Middleware
// ======================
// Prometheus metrics collection
app.use(metricsMiddleware);

// Request tracking middleware (adds requestId)
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] ||
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

// ======================
// Rate Limiters (Applied Per Route)
// ======================
// Health routes - very permissive
app.use('/health', healthLimiter);

// API routes - general
app.use('/api/', apiLimiter);

// Auth routes - stricter
app.use('/api/auth', authLimiter);

// Appointment routes - moderate
app.use('/api/appointments', appointmentLimiter);

// ======================
// Routes
// ======================

// Health & metrics (no prefix)
app.use('/', healthRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes);

// ======================
// Root Route (API Info)
// ======================
app.get('/', (req, res) => {
  res.json({
    name: '🏥 TeleHealth Platform API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    endpoints: {
      health: {
        check: 'GET /health',
        metrics: 'GET /api/metrics'
      },
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile'
      },
      doctors: {
        list: 'GET /api/doctors',
        details: 'GET /api/doctors/:id'
      },
      appointments: {
        list: 'GET /api/appointments',
        create: 'POST /api/appointments',
        details: 'GET /api/appointments/:id',
        cancel: 'DELETE /api/appointments/:id'
      }
    },
    documentation: 'https://github.com/Nidhi200501/devops-telehealth-platform'
  });
});

// ======================
// Error Handling
// ======================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ======================
// Graceful Shutdown
// ======================
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server...');
  // Close any open connections if needed
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, closing server...');
  process.exit(0);
});

module.exports = app;