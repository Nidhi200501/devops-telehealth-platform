import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ================================
// Custom Metrics
// ================================
const errorRate = new Rate('error_rate');
const registerDuration = new Trend('register_duration');
const loginDuration = new Trend('login_duration');
const appointmentCreateDuration = new Trend('appointment_create_duration');
const appointmentListDuration = new Trend('appointment_list_duration');
const healthCheckDuration = new Trend('health_check_duration');
const totalRequests = new Counter('total_requests');

// ================================
// Test Configuration
// ================================
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Sustain 100 users
    { duration: '1m', target: 50 },    // Ramp down to 50
    { duration: '30s', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],    // 95% of requests < 500ms
    error_rate: ['rate<0.01'],           // Error rate < 1%
    http_req_failed: ['rate<0.01'],      // HTTP failures < 1%
    register_duration: ['p(95)<1000'],   // Registration < 1s
    login_duration: ['p(95)<500'],       // Login < 500ms
    appointment_create_duration: ['p(95)<800'],
    appointment_list_duration: ['p(95)<500'],
    health_check_duration: ['p(95)<200'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// ================================
// Helper Functions
// ================================
function generateUser() {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return {
    name: `LoadTest User ${id}`,
    email: `loadtest-${id}@example.com`,
    password: 'Password123!',
    phone: '+1234567890',
  };
}

function getHeaders(token) {
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

// ================================
// Test Scenarios
// ================================
export default function () {
  const user = generateUser();
  let token = '';
  let doctorId = '';

  // ----- Health Check -----
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/health`);
    healthCheckDuration.add(res.timings.duration);
    totalRequests.add(1);

    const success = check(res, {
      'health: status is 200': (r) => r.status === 200,
      'health: response has status': (r) => {
        const body = r.json();
        return body.data && body.data.status !== undefined;
      },
    });
    errorRate.add(!success);
  });

  sleep(0.5);

  // ----- Register -----
  group('User Registration', () => {
    const payload = JSON.stringify(user);
    const res = http.post(`${BASE_URL}/api/auth/register`, payload, {
      headers: getHeaders(),
    });
    registerDuration.add(res.timings.duration);
    totalRequests.add(1);

    const success = check(res, {
      'register: status is 201': (r) => r.status === 201,
      'register: has token': (r) => r.json().data && r.json().data.token !== undefined,
    });
    errorRate.add(!success);

    if (res.status === 201) {
      token = res.json().data.token;
    }
  });

  sleep(0.5);

  // ----- Login -----
  group('User Login', () => {
    const payload = JSON.stringify({
      email: user.email,
      password: user.password,
    });
    const res = http.post(`${BASE_URL}/api/auth/login`, payload, {
      headers: getHeaders(),
    });
    loginDuration.add(res.timings.duration);
    totalRequests.add(1);

    const success = check(res, {
      'login: status is 200': (r) => r.status === 200,
      'login: has token': (r) => r.json().data && r.json().data.token !== undefined,
    });
    errorRate.add(!success);

    if (res.status === 200) {
      token = res.json().data.token;
    }
  });

  sleep(0.5);

  // ----- Get Doctors -----
  group('List Doctors', () => {
    const res = http.get(`${BASE_URL}/api/doctors`, {
      headers: getHeaders(),
    });
    totalRequests.add(1);

    const success = check(res, {
      'doctors: status is 200': (r) => r.status === 200,
    });
    errorRate.add(!success);

    if (res.status === 200) {
      const doctors = res.json().data?.doctors;
      if (doctors && doctors.length > 0) {
        doctorId = doctors[0]._id;
      }
    }
  });

  sleep(0.5);

  // ----- Book Appointment -----
  if (token && doctorId) {
    group('Book Appointment', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30) + 1);
      const hours = String(Math.floor(Math.random() * 8) + 9).padStart(2, '0'); // 09-16
      const timeSlot = `${hours}:00`;

      const payload = JSON.stringify({
        doctor: doctorId,
        date: futureDate.toISOString(),
        timeSlot: timeSlot,
        reason: 'Load test appointment',
        type: 'consultation',
      });

      const res = http.post(`${BASE_URL}/api/appointments`, payload, {
        headers: getHeaders(token),
      });
      appointmentCreateDuration.add(res.timings.duration);
      totalRequests.add(1);

      const success = check(res, {
        'appointment: status is 201 or 409': (r) =>
          r.status === 201 || r.status === 409,
      });
      errorRate.add(!success);
    });

    sleep(0.5);
  }

  // ----- List Appointments -----
  if (token) {
    group('List Appointments', () => {
      const res = http.get(`${BASE_URL}/api/appointments`, {
        headers: getHeaders(token),
      });
      appointmentListDuration.add(res.timings.duration);
      totalRequests.add(1);

      const success = check(res, {
        'list appointments: status is 200': (r) => r.status === 200,
        'list appointments: has data': (r) => r.json().data !== undefined,
      });
      errorRate.add(!success);
    });
  }

  // ----- Metrics Endpoint -----
  group('Metrics', () => {
    const res = http.get(`${BASE_URL}/api/metrics`);
    totalRequests.add(1);

    check(res, {
      'metrics: status is 200': (r) => r.status === 200,
    });
  });

  sleep(1);
}

// ================================
// Summary Handler
// ================================
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    totalRequests: data.metrics.total_requests?.values?.count || 0,
    errorRate: data.metrics.error_rate?.values?.rate || 0,
    httpReqDuration: {
      avg: data.metrics.http_req_duration?.values?.avg || 0,
      p95: data.metrics.http_req_duration?.values['p(95)'] || 0,
      max: data.metrics.http_req_duration?.values?.max || 0,
    },
    thresholds: Object.entries(data.metrics)
      .filter(([, v]) => v.thresholds)
      .reduce((acc, [k, v]) => {
        acc[k] = Object.entries(v.thresholds).reduce((t, [tk, tv]) => {
          t[tk] = tv.ok ? 'PASS' : 'FAIL';
          return t;
        }, {});
        return acc;
      }, {}),
  };

  return {
    stdout: JSON.stringify(summary, null, 2) + '\n',
    'k6/load-test-results.json': JSON.stringify(data, null, 2),
  };
}
