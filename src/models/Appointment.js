const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient is required'],
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor is required'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Appointment date is required'],
      validate: {
        validator: function (value) {
          return value > new Date();
        },
        message: 'Appointment date must be in the future',
      },
      index: true,
    },
    timeSlot: {
      type: String,
      required: [true, 'Time slot is required'],
      match: [/^\d{2}:\d{2}$/, 'Time slot must be in HH:MM format'],
    },
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'],
      default: 'scheduled',
      index: true,
    },
    type: {
      type: String,
      enum: ['consultation', 'follow-up', 'emergency', 'routine-checkup'],
      default: 'consultation',
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      trim: true,
    },
    reason: {
      type: String,
      required: [true, 'Reason for appointment is required'],
      trim: true,
      maxlength: [200, 'Reason cannot exceed 200 characters'],
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

// 1. Patient appointments query (most common)
appointmentSchema.index({ patient: 1, date: -1 });

// 2. Doctor availability check
appointmentSchema.index({ doctor: 1, date: 1, timeSlot: 1 });

// 3. Status-based queries
appointmentSchema.index({ status: 1, date: 1 });

// 4. Composite index for dashboard
appointmentSchema.index({ doctor: 1, status: 1, date: 1 });

// 5. Unique constraint - prevent double booking
appointmentSchema.index(
  { doctor: 1, date: 1, timeSlot: 1 },
  { unique: true }
);

// ============================================
// VIRTUAL PROPERTIES
// ============================================

// Check if appointment is upcoming
appointmentSchema.virtual('isUpcoming').get(function () {
  return this.status === 'scheduled' && this.date > new Date();
});

// Check if appointment is overdue
appointmentSchema.virtual('isOverdue').get(function () {
  return this.status === 'scheduled' && this.date < new Date();
});

// ============================================
// INSTANCE METHODS
// ============================================

// Cancel appointment
appointmentSchema.methods.cancel = function (reason) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  if (reason) this.cancellationReason = reason;
  return this.save();
};

// Confirm appointment
appointmentSchema.methods.confirm = function () {
  this.status = 'confirmed';
  return this.save();
};

// Complete appointment
appointmentSchema.methods.complete = function () {
  this.status = 'completed';
  return this.save();
};

// ============================================
// STATIC METHODS
// ============================================

// Get appointments for a patient
appointmentSchema.statics.getPatientAppointments = function (patientId, limit = 50) {
  return this.find({ patient: patientId })
    .sort({ date: -1 })
    .limit(limit)
    .populate('doctor', 'name specialization')
    .lean();
};

// Get appointments for a doctor
appointmentSchema.statics.getDoctorAppointments = function (doctorId, date, limit = 50) {
  const query = { doctor: doctorId };
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    query.date = { $gte: start, $lte: end };
  }
  return this.find(query)
    .sort({ date: 1 })
    .limit(limit)
    .populate('patient', 'name email phone')
    .lean();
};

// Get upcoming appointments for today
appointmentSchema.statics.getTodayAppointments = function (doctorId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const query = {
    date: { $gte: today, $lt: tomorrow },
    status: { $in: ['scheduled', 'confirmed'] }
  };
  if (doctorId) query.doctor = doctorId;

  return this.find(query)
    .sort({ date: 1 })
    .populate('patient', 'name phone')
    .populate('doctor', 'name specialization')
    .lean();
};

// Check if slot is available
appointmentSchema.statics.isSlotAvailable = async function (doctorId, date, timeSlot) {
  const existing = await this.findOne({
    doctor: doctorId,
    date: new Date(date),
    timeSlot: timeSlot,
    status: { $in: ['scheduled', 'confirmed'] }
  });
  return !existing;
};

module.exports = mongoose.model('Appointment', appointmentSchema);
