const express = require('express');
const router = express.Router();
const { addHospital, editHospital } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// In a real production app, we would add JWT protection here to ensure ONLY admins can use this!
router.post('/hospitals', protect, adminOnly, addHospital);
router.put('/hospitals/:id', protect, adminOnly, editHospital);

module.exports = router;