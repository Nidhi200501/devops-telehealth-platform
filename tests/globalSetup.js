const { MongoMemoryServer } = require('mongodb-memory-server');
const path = require('path');
const fs = require('fs');

module.exports = async () => {
  // Create MongoDB Memory Server (downloads binary on first run — no timeout here)
  console.log('\\n[globalSetup] Starting MongoDB Memory Server...');
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  console.log(`[globalSetup] MongoDB Memory Server started: ${mongoUri}`);

  // Store URI for test workers via environment variable
  process.env.MONGO_TEST_URI = mongoUri;

  // Also write to a temp file (backup for worker processes)
  const configPath = path.join(__dirname, '.mongo-uri');
  fs.writeFileSync(configPath, mongoUri);

  // Store server instance for globalTeardown
  globalThis.__MONGO_SERVER__ = mongoServer;
};
