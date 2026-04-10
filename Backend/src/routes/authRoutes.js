const express = require('express');
const router = express.Router();
const { patientLogin, adminLogin, hospitalLogin } = require('../controllers/authController');

router.post('/patient/login', patientLogin);
router.post('/admin/login', adminLogin);
router.post('/hospital/login', hospitalLogin);

module.exports = router;