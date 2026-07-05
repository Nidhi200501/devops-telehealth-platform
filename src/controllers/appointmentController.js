const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const logger = require('../utils/logger');
const { putMetric } = require('../services/cloudwatchService');

/**
 * Create a new appointment
 * POST /api/appointments
 */
const createAppointment = async (req, res, next) => {
  try {
    const { doctor, date, timeSlot, type, notes, reason } = req.body;

    // Verify doctor exists
    const doctorExists = await Doctor.findById(doctor);
    if (!doctorExists) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    // Check if doctor is active
    if (!doctorExists.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Doctor is currently unavailable',
      });
    }

    // Create appointment
    const appointment = await Appointment.create({
      patient: req.user._id,
      doctor,
      date,
      timeSlot,
      type,
      notes,
      reason,
    });

    // Populate references
    await appointment.populate([
      { path: 'doctor', select: 'name specialization email' },
      { path: 'patient', select: 'name email phone' },
    ]);

    logger.info('Appointment created', {
      appointmentId: appointment._id,
      patientId: req.user._id,
      doctorId: doctor,
    });

    await putMetric('AppointmentsBooked', 1);

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: { appointment },
    });
  } catch (error) {
    // Handle duplicate booking
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This time slot is already booked for the selected doctor',
      });
    }
    next(error);
  }
};

/**
 * Get all appointments for current user
 * GET /api/appointments
 */
const getAppointments = async (req, res, next) => {
  try {
    const {
      status,
      page = 1,
      limit = 10,
      sort = '-date',
    } = req.query;

    const query = { patient: req.user._id };
    if (status) query.status = status;

    const appointments = await Appointment.find(query)
      .populate('doctor', 'name specialization email phone')
      .populate('patient', 'name email phone')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10));

    const total = await Appointment.countDocuments(query);

    res.json({
      success: true,
      data: {
        appointments,
        pagination: {
          current: parseInt(page, 10),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single appointment by ID
 * GET /api/appointments/:id
 */
const getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      patient: req.user._id,
    })
      .populate('doctor', 'name specialization email phone')
      .populate('patient', 'name email phone');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    res.json({
      success: true,
      data: { appointment },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel an appointment
 * DELETE /api/appointments/:id
 */
const cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      patient: req.user._id,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Appointment is already cancelled',
      });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed appointment',
      });
    }

    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    appointment.cancellationReason = req.body.reason || 'Cancelled by patient';
    await appointment.save();

    logger.info('Appointment cancelled', {
      appointmentId: appointment._id,
      patientId: req.user._id,
    });

    await putMetric('AppointmentsCancelled', 1);

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: { appointment },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAppointment,
  getAppointments,
  getAppointmentById,
  cancelAppointment,
};
