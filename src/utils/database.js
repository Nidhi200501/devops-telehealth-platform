const mongoose = require('mongoose');
const logger = require('./logger');

// Connection options
const getConnectionOptions = () => ({
  maxPoolSize: 100,              // Increased from 10 — supports more concurrent connections
  minPoolSize: 50,               // Minimum connections in pool
  maxIdleTimeMS: 60000,          // Close idle connections after 60s
  serverSelectionTimeoutMS: 10000, // Increased from 5s — more time for server selection
  socketTimeoutMS: 60000,        // Increased from 45s — longer socket timeout
  connectTimeoutMS: 30000,       // Connection timeout
  heartbeatFrequencyMS: 10000,   // Check connection health every 10s
  retryWrites: true,
  retryReads: true,
});

// Retry configuration
const RETRY_DELAYS = [5000, 10000, 20000, 40000, 60000]; // 5s, 10s, 20s, 40s, 60s
let retryCount = 0;
let isConnecting = false;

const connectDatabase = async () => {
  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    logger.info('Connection attempt already in progress...');
    return;
  }

  isConnecting = true;
  const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/telehealth';

  try {
    // Close existing connection if any
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    const options = getConnectionOptions();

    await mongoose.connect(dbUrl, options);

    // Reset retry count on successful connection
    retryCount = 0;
    isConnecting = false;

    // Log connection details (hide credentials)
    const sanitizedUrl = dbUrl.replace(/\/\/.*@/, '//<credentials>@');
    logger.info('✅ MongoDB connected successfully', {
      url: sanitizedUrl,
      maxPoolSize: options.maxPoolSize,
      minPoolSize: options.minPoolSize
    });

    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      logger.error('❌ MongoDB connection error', {
        error: err.message,
        code: err.code
      });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB disconnected. Attempting reconnection...');
      // Auto-reconnect handled by Mongoose
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 MongoDB reconnected successfully');
      retryCount = 0;
    });

    // Handle Node process termination
    process.on('SIGINT', async () => {
      await disconnectDatabase();
      process.exit(0);
    });

  } catch (error) {
    isConnecting = false;
    logger.error('❌ MongoDB connection failed', {
      error: error.message,
      code: error.code,
      retryCount: retryCount
    });

    // Retry with exponential backoff
    if (retryCount < RETRY_DELAYS.length) {
      const delay = RETRY_DELAYS[retryCount];
      retryCount++;
      logger.info(`🔄 Retrying connection in ${delay / 1000}s... (Attempt ${retryCount})`);
      setTimeout(connectDatabase, delay);
    } else {
      logger.error('❌ Max retry attempts reached. Please check MongoDB connection.');
    }
  }
};

const disconnectDatabase = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      logger.info('✅ MongoDB disconnected gracefully');
    }
  } catch (error) {
    logger.error('❌ Error disconnecting from MongoDB', {
      error: error.message
    });
  }
};

// Get connection status
const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };
  const state = mongoose.connection.readyState;
  return {
    state: states[state] || 'unknown',
    readyState: state,
    host: mongoose.connection.host || 'not connected',
    port: mongoose.connection.port || 'not connected'
  };
};

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getConnectionStatus
};