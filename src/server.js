require('dotenv').config();

const app = require('./app');
const { connectDatabase } = require('./utils/database');
const { initializeCloudWatch } = require('./services/cloudwatchService');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Start the server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Initialize CloudWatch (non-blocking)
    initializeCloudWatch().catch((err) => {
      logger.warn('CloudWatch initialization failed (non-critical)', {
        error: err.message,
      });
    });

    // Start listening
    const server = app.listen(PORT, () => {
      logger.info(`🚀 TeleHealth Platform server running`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        pid: process.pid,
      });
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection', { reason: reason?.message || reason });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

startServer();

module.exports = startServer;
