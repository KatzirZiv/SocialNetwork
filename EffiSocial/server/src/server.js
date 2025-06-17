const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const morgan = require('morgan');
const colors = require('colors');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Force development mode
process.env.NODE_ENV = 'development';

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Files:', req.file);
    
    // Log the full request for debugging
    console.log('Full request:', {
      method: req.method,
      path: req.path,
      headers: req.headers,
      body: req.body,
      file: req.file,
      files: req.files
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

// Add logging for static file requests
app.use('/uploads', (req, res, next) => {
  console.log('=== Static File Request ===');
  console.log('Request path:', req.path);
  console.log('Request method:', req.method);
  console.log('Request headers:', req.headers);
  const filePath = path.join(__dirname, '../uploads', req.path);
  console.log('Looking for file at:', filePath);
  console.log('File exists:', fs.existsSync(filePath));
  next();
}, express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'http://localhost:3000');
    res.set('Cache-Control', 'no-cache');
  }
}));

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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Routes (to be implemented)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/messages', require('./routes/messages'));

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