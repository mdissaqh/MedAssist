const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./src/config/db');
const app = require('./src/app');
const http = require('http'); // Built-in Node module
const { Server } = require('socket.io'); // Import Socket.io



// Connect to MongoDB
connectDB();

// Create HTTP server wrapping the Express app
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Allow your React frontend
    methods: ["GET", "POST"]
  }
});

// When a hospital dashboard connects
io.on('connection', (socket) => {
  console.log(`🔌 Hospital Dashboard connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`❌ Dashboard disconnected: ${socket.id}`);
  });
});

// Make 'io' globally accessible to all our backend controllers!
app.set('socketio', io);

const PORT = process.env.PORT || 5000;

// IMPORTANT: We use server.listen now, NOT app.listen!
server.listen(PORT, () => {
  console.log(`🚀 Server & WebSockets running on port ${PORT}`);
});