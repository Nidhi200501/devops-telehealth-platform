const express = require('express');
const { getDoctors, getDoctorById } = require('../controllers/doctorController');
const { objectIdValidation } = require('../middleware/validator');

const router = express.Router();

// GET /api/doctors
router.get('/', getDoctors);

// GET /api/doctors/:id
router.get('/:id', objectIdValidation, getDoctorById);

module.exports = router;
