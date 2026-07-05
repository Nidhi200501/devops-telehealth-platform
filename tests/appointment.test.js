const request = require('supertest');
const app = require('../src/app');
const Doctor = require('../src/models/Doctor');
const { setupTestDB } = require('./setup');

// Set test environment
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

// Initialize in-memory MongoDB
setupTestDB();

describe('Appointment Endpoints', () => {
  let authToken;
  let doctorId;

  const testUser = {
    name: 'Test Patient',
    email: 'patient@example.com',
    password: 'password123',
  };

  const testDoctor = {
    name: 'Dr. Smith',
    email: 'dr.smith@example.com',
    specialization: 'Cardiology',
    phone: '+1234567890',
    experience: 10,
  };

  beforeEach(async () => {
    // Register user and get token
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    authToken = registerRes.body.data.token;

    // Create a doctor
    const doctor = await Doctor.create(testDoctor);
    doctorId = doctor._id.toString();
  });

  describe('POST /api/appointments', () => {
    it('should create a new appointment', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const appointmentData = {
        doctor: doctorId,
        date: futureDate.toISOString(),
        timeSlot: '10:00',
        reason: 'Regular checkup',
        type: 'consultation',
      };

      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(appointmentData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.appointment).toHaveProperty('status', 'scheduled');
      expect(res.body.data.appointment).toHaveProperty('reason', 'Regular checkup');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .send({
          doctor: doctorId,
          date: new Date().toISOString(),
          timeSlot: '10:00',
          reason: 'Test',
        });

      expect(res.statusCode).toBe(401);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ doctor: 'invalid-id' });

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 for non-existent doctor', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          doctor: '507f1f77bcf86cd799439011',
          date: futureDate.toISOString(),
          timeSlot: '10:00',
          reason: 'Test',
        });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/appointments', () => {
    beforeEach(async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      // Create an appointment
      await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          doctor: doctorId,
          date: futureDate.toISOString(),
          timeSlot: '10:00',
          reason: 'Regular checkup',
        });
    });

    it('should return user appointments', async () => {
      const res = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.appointments).toBeInstanceOf(Array);
      expect(res.body.data.appointments.length).toBeGreaterThan(0);
      expect(res.body.data).toHaveProperty('pagination');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/appointments');
      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/appointments/:id', () => {
    let appointmentId;

    beforeEach(async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const createRes = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          doctor: doctorId,
          date: futureDate.toISOString(),
          timeSlot: '14:00',
          reason: 'Follow-up visit',
        });

      appointmentId = createRes.body.data.appointment._id;
    });

    it('should cancel an appointment', async () => {
      const res = await request(app)
        .delete(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Schedule conflict' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.appointment.status).toBe('cancelled');
    });

    it('should return 404 for non-existent appointment', async () => {
      const res = await request(app)
        .delete('/api/appointments/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 when cancelling already cancelled appointment', async () => {
      // Cancel first
      await request(app)
        .delete(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Try to cancel again
      const res = await request(app)
        .delete(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
    });
  });
});
