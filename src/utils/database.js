const mongoose = require('mongoose');
const logger = require('./logger');

const connectDatabase = async () => {
  const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/telehealth';

  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  try {
    await mongoose.connect(dbUrl, options);
    logger.info('MongoDB connected successfully', { url: dbUrl.replace(/\/\/.*@/, '//<credentials>@') });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting reconnection...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });
  } catch (error) {
    logger.error('MongoDB connection failed', { error: error.message });
    // Retry after 5 seconds
    logger.info('Retrying MongoDB connection in 5 seconds...');
    setTimeout(connectDatabase, 5000);
  }
};

const disconnectDatabase = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected gracefully');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB', { error: error.message });
  }
};

module.exports = { connectDatabase, disconnectDatabase };
