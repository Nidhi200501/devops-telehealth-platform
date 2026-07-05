const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

/**
 * Call this function at the top level of each test file to register
 * beforeAll / afterEach / afterAll hooks for MongoDB connection.
 *
 * MongoDB Memory Server is started by globalSetup.js (no timeout issues).
 * This helper just connects mongoose to the already-running server.
 */
const setupTestDB = () => {
  beforeAll(async () => {
    // Get URI from env (set by globalSetup) or from temp file
    let mongoUri = process.env.MONGO_TEST_URI;
    if (!mongoUri) {
      const configPath = path.join(__dirname, '.mongo-uri');
      mongoUri = fs.readFileSync(configPath, 'utf8');
    }
    await mongoose.connect(mongoUri);
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });
};

module.exports = { setupTestDB };
