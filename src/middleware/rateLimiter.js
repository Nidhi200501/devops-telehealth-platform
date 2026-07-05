const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * General API rate limiter
 * Allow more requests for high traffic load testing
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 200, // Increased from 100 to 200
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method
    });
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * Stricter rate limiter for auth endpoints (login/register)
 * Increased for load testing
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Increased from 20 to 50
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: (req, res, next, options) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      email: req.body?.email || 'unknown'
    });
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * Health check rate limiter - Very permissive
 * Allows frequent health checks without blocking
 */
const healthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 500, // 500 health checks per minute
  message: {
    success: false,
    message: 'Too many health check requests.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => true, // Skip for health endpoint (handled in app.js)
  handler: (req, res, next, options) => {
    logger.warn('Health rate limit exceeded', { ip: req.ip });
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * Appointment rate limiter
 */
const appointmentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 appointment requests per minute
  message: {
    success: false,
    message: 'Too many appointment requests, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn('Appointment rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id || 'anonymous'
    });
    res.status(options.statusCode).json(options.message);
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  healthLimiter,
  appointmentLimiter
};