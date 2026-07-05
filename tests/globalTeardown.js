const path = require('path');
const fs = require('fs');

module.exports = async () => {
  // Stop MongoDB Memory Server
  if (globalThis.__MONGO_SERVER__) {
    console.log('\\n[globalTeardown] Stopping MongoDB Memory Server...');
    await globalThis.__MONGO_SERVER__.stop();
    console.log('[globalTeardown] MongoDB Memory Server stopped.');
  }

  // Clean up temp URI file
  const configPath = path.join(__dirname, '.mongo-uri');
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
};
