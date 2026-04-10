const express = require('express');
const router = express.Router();
const { handlePatientChat } = require('../controllers/aiController');
const { protect } = require('../middlewares/authMiddleware'); // Protect it so only logged-in patients can chat

router.post('/chat', protect, handlePatientChat);

module.exports = router;