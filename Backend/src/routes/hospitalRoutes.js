const express = require('express');
const router = express.Router();
// Import all 4 functions!
const { updateResources, getHospitalProfile, getActiveEmergencies, resolveEmergency } = require('../controllers/hospitalController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/profile', protect, getHospitalProfile);
router.get('/emergencies', protect, getActiveEmergencies);
router.put('/resources', protect, updateResources);
// NEW: The resolve route
router.put('/emergencies/:id/resolve', protect, resolveEmergency); 

module.exports = router;