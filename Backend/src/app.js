const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Middlewares
app.use(cors()); // Allow cross-origin requests from React
app.use(express.json()); // Parse incoming JSON payloads

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Base route for testing
app.get('/', (req, res) => {
  res.send('MedAssist API is running properly...');
});

// Export the configured app
module.exports = app;