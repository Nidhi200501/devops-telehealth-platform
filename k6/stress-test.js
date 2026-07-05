import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// ================================
// Stress Test Configuration
// ================================
// Purpose: Find the breaking point of the application

const errorRate = new Rate('error_rate');

export const options = {
  stages: [
    // Warm up
    { duration: '1m', target: 50 },
    // Normal load
    { duration: '2m', target: 100 },
    // Stress
    { duration: '2m', target: 200 },
    // Spike
    { duration: '1m', target: 500 },
    // Beyond capacity
    { duration: '1m', target: 1000 },
    // Recovery
    { duration: '2m', target: 50 },
    // Cool down
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<3000'], // Relaxed for stress test
    error_rate: ['rate<0.10'],         // Allow up to 10% errors under extreme load
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// ================================
// Stress Test Scenario
// ================================
export default function () {
  // Health check (lightweight)
  const healthRes = http.get(`${BASE_URL}/health`);
  const healthOk = check(healthRes, {
    'health: is 200': (r) => r.status === 200,
  });
  errorRate.add(!healthOk);

  sleep(0.2);

  // API endpoint stress
  const doctorsRes = http.get(`${BASE_URL}/api/doctors`);
  const doctorsOk = check(doctorsRes, {
    'doctors: is 200': (r) => r.status === 200,
  });
  errorRate.add(!doctorsOk);

  sleep(0.2);

  // Auth stress - register
  const id = `stress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const registerRes = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({
      name: `Stress Test ${id}`,
      email: `stress-${id}@example.com`,
      password: 'Password123!',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const registerOk = check(registerRes, {
    'register: is 201 or 429': (r) => r.status === 201 || r.status === 429,
  });
  errorRate.add(!registerOk);

  sleep(0.3);

  // Auth stress - login
  if (registerRes.status === 201) {
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        email: `stress-${id}@example.com`,
        password: 'Password123!',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    check(loginRes, {
      'login: is 200 or 429': (r) => r.status === 200 || r.status === 429,
    });
  }

  sleep(0.5);
}

// ================================
// Summary
// ================================
export function handleSummary(data) {
  const summary = {
    type: 'stress-test',
    timestamp: new Date().toISOString(),
    maxVUs: 1000,
    results: {
      avgResponseTime: data.metrics.http_req_duration?.values?.avg || 0,
      p95ResponseTime: data.metrics.http_req_duration?.values['p(95)'] || 0,
      p99ResponseTime: data.metrics.http_req_duration?.values['p(99)'] || 0,
      maxResponseTime: data.metrics.http_req_duration?.values?.max || 0,
      errorRate: data.metrics.error_rate?.values?.rate || 0,
      totalRequests: data.metrics.http_reqs?.values?.count || 0,
    },
  };

  return {
    stdout: JSON.stringify(summary, null, 2) + '\n',
    'k6/stress-test-results.json': JSON.stringify(data, null, 2),
  };
}
