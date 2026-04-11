const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');

const app = express();

// Middlewares
const allowedOrigins = [
  'http://localhost:5173', 
  'https://bucolic-profiterole-328034.netlify.app' // Your live Netlify URL
];

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
};

// 2. Apply it to your Express app
app.use(cors(corsOptions));

// 3. Apply it to your Socket.io server
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});
app.use(express.json()); // Parse incoming JSON payloads

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/hospital', require('./routes/hospitalRoutes'));
app.use('/api/hospital', hospitalRoutes);

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
