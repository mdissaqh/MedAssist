const app = require('./src/app');
const http = require('http');
const { Server } = require('socket.io'); // THIS is what was missing!

// Create the actual HTTP server
const server = http.createServer(app);

// Apply CORS to Socket.io here!
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

// Make io accessible inside app.js (for your simulate-emergency route)
app.set('socketio', io);

// Basic socket connection logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
