const express = require('express');
const router = express.Router();
// IMPORT BOTH FUNCTIONS NOW:
const { updateResources, getHospitalProfile } = require('../controllers/hospitalController');
const { protect } = require('../middlewares/authMiddleware');

// Add the GET route to fetch data
router.get('/profile', protect, getHospitalProfile);

// Your existing PUT route
router.put('/resources', protect, updateResources);

module.exports = router;