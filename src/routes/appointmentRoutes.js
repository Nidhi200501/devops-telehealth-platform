const express = require('express');
const {
  createAppointment,
  getAppointments,
  getAppointmentById,
  cancelAppointment,
} = require('../controllers/appointmentController');
const { authenticate } = require('../middleware/auth');
const { appointmentValidation, objectIdValidation } = require('../middleware/validator');

const router = express.Router();

// All appointment routes require authentication
router.use(authenticate);

// GET /api/appointments
router.get('/', getAppointments);

// POST /api/appointments
router.post('/', appointmentValidation, createAppointment);

// GET /api/appointments/:id
router.get('/:id', objectIdValidation, getAppointmentById);

// DELETE /api/appointments/:id
router.delete('/:id', objectIdValidation, cancelAppointment);

module.exports = router;
