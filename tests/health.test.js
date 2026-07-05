const request = require('supertest');
const app = require('../src/app');
const { setupTestDB } = require('./setup');

// Set test environment
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

// Initialize in-memory MongoDB
setupTestDB();

describe('Health Endpoints', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('status');
      expect(res.body.data).toHaveProperty('timestamp');
      expect(res.body.data).toHaveProperty('uptime');
      expect(res.body.data).toHaveProperty('environment');
      expect(res.body.data).toHaveProperty('database');
      expect(res.body.data).toHaveProperty('system');
      expect(res.body.data).toHaveProperty('process');
    });

    it('should return system information', async () => {
      const res = await request(app).get('/health');

      expect(res.body.data.system).toHaveProperty('hostname');
      expect(res.body.data.system).toHaveProperty('platform');
      expect(res.body.data.system).toHaveProperty('memoryUsage');
    });
  });

  describe('GET /api/metrics', () => {
    it('should return Prometheus metrics', async () => {
      const res = await request(app).get('/api/metrics');

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      // Should contain default Node.js metrics
      expect(res.text).toContain('process_cpu');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nonexistent');

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });
  });
});
