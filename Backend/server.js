require('dotenv').config(); // Make sure you load your .env variables!
const app = require('./src/app');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose'); // Import mongoose

const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:5173', 
  'https://bucolic-profiterole-328034.netlify.app'
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.set('socketio', io);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('join_hospital_room', (hospitalId) => {
    socket.join(hospitalId);
    console.log(`🏥 Hospital ${hospitalId} joined its private room.`);
  });
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// ==========================================
// THE FIX: CONNECT TO MONGODB
// ==========================================
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI; // Make sure this is in your Render Environment Variables!

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully!');
    // Start the server ONLY after the database is connected
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err);
  });
