const Doctor = require('../models/Doctor');
const logger = require('../utils/logger');

/**
 * Get all doctors
 * GET /api/doctors
 */
const getDoctors = async (req, res, next) => {
  try {
    const {
      specialization,
      page = 1,
      limit = 10,
      sort = 'name',
    } = req.query;

    const query = { isActive: true };
    if (specialization) query.specialization = specialization;

    const doctors = await Doctor.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10));

    const total = await Doctor.countDocuments(query);

    res.json({
      success: true,
      data: {
        doctors,
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
 * Get a single doctor by ID
 * GET /api/doctors/:id
 */
const getDoctorById = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    res.json({
      success: true,
      data: { doctor },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDoctors, getDoctorById };
