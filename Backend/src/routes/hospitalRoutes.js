const express = require('express');
const router = express.Router();

const { addHospital, editHospital, searchHospitals } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// GET route for searching hospitals
router.get('/hospitals/search', protect, adminOnly, searchHospitals);

// POST route for adding a hospital
router.post('/hospitals', protect, adminOnly, addHospital);

// PUT route for editing a hospital
router.put('/hospitals/:id', protect, adminOnly, editHospital);

module.exports = router;