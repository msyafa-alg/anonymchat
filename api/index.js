const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  path: '/socket.io'
});

// Middleware untuk static files
app.use(express.static('public'));

// Store active users
let onlineUsers = [];

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);
  
  // Generate random anonymous name
  const randomNum = Math.floor(Math.random() * 1000);
  const userName = `Anonym-${randomNum}`;
  
  // Add to online users
  onlineUsers.push({
    id: socket.id,
    name: userName
  });
  
  // Send welcome message
  socket.emit('welcome', {
    message: `Welcome ${userName}! You're connected.`,
    userName: userName
  });
  
  // Broadcast to all users that a new user joined
  io.emit('user-joined', {
    userName: userName,
    onlineCount: onlineUsers.length
  });
  
  // Handle chat messages
  socket.on('send-message', (data) => {
    io.emit('new-message', {
      userName: data.userName,
      message: data.message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });
  
  // Handle typing indicator
  socket.on('typing', (data) => {
    socket.broadcast.emit('user-typing', data);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove from online users
    onlineUsers = onlineUsers.filter(user => user.id !== socket.id);
    
    // Broadcast user left
    io.emit('user-left', {
      onlineCount: onlineUsers.length
    });
  });
});

// Untuk Vercel serverless
module.exports = app;
module.exports.io = io;

// Untuk local development
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}