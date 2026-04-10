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
// TEST ROUTE: Trigger this to simulate the AI finding an emergency!
app.post('/api/simulate-emergency', (req, res) => {
  const io = req.app.get('socketio'); // Grab the socket server
  
  const mockEmergency = {
    id: Date.now(), // Unique ID
    patientMobile: "+91 9876543210",
    address: "Koramangala Block 5, Bengaluru",
    symptoms: "Severe chest pain, left arm numbness, sweating",
    predictedDisease: "Myocardial Infarction (Heart Attack)",
    eta: "8 Mins",
    status: "En Route"
  };

  // Broadcast to all connected hospitals
  io.emit('new_emergency', mockEmergency);
  
  res.json({ message: "Emergency broadcasted successfully!" });
});

// Export the configured app
module.exports = app;