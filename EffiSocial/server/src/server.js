const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const morgan = require('morgan');
const colors = require('colors');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');
const fs = require('fs');
const socketio = require('socket.io');

// Load environment variables
dotenv.config();

// Force development mode
process.env.NODE_ENV = 'development';

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: 'http://localhost:3000',
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add logging middleware for development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
  // Add request body logging
  app.use((req, res, next) => {
    console.log('=== Request Logging ===');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('Original URL:', req.originalUrl);
    console.log('Base URL:', req.baseUrl);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Files:', req.file);
    console.log('Route:', req.route);
    console.log('Params:', req.params);
    console.log('Query:', req.query);
    
    // Log the full request for debugging
    console.log('Full request:', {
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      headers: req.headers,
      body: req.body,
      file: req.file,
      files: req.files,
      route: req.route,
      params: req.params,
      query: req.query
    });
    
    next();
  });
}

// Add error logging middleware
app.use((err, req, res, next) => {
  console.error('=== Error Logging ===');
  console.error('Error:', err);
  console.error('Request:', {
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body,
    file: req.file,
    files: req.files
  });
  next(err);
});

// Set static folder for uploads
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Add a default profile picture route
app.get('/default-profile.png', (req, res) => {
  console.log('=== Default Profile Picture Request ===');
  const filePath = path.join(__dirname, '../uploads/default-profile.png');
  console.log('File path:', filePath);
  console.log('File exists:', fs.existsSync(filePath));
  res.set('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'http://localhost:3000');
  res.set('Cache-Control', 'no-cache');
  res.sendFile(filePath);
});

// Database connection
connectDB()
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes (to be implemented)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/messages', require('./routes/messages'));

// User to socket mapping
const userSocketMap = {};

io.on('connection', (socket) => {
  // Join event: user comes online
  socket.on('join', (userId) => {
    userSocketMap[userId] = socket.id;
    // Broadcast online users
    io.emit('user:online', Object.keys(userSocketMap));
    socket.join(userId); // join a room for direct messaging
  });

  // Leave event: user goes offline
  socket.on('leave', (userId) => {
    delete userSocketMap[userId];
    io.emit('user:online', Object.keys(userSocketMap));
    socket.leave(userId);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    // Remove user from map
    for (const [userId, id] of Object.entries(userSocketMap)) {
      if (id === socket.id) {
        delete userSocketMap[userId];
        break;
      }
    }
    io.emit('user:online', Object.keys(userSocketMap));
  });

  // Private message event (optional, if you want to handle socket-only messages)
  socket.on('private_message', ({ to, message, from }) => {
    if (userSocketMap[to]) {
      io.to(userSocketMap[to]).emit('message:new', { from, message });
    }
  });
});

// Make io accessible in controllers
app.set('io', io);

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
  );
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`.red);
  // Close server & exit process
  server.close(() => process.exit(1));
}); 