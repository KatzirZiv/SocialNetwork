// app.js - Main Express app setup for the backend API
// Handles middleware, database connection, routes, and error handling

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { errorHandler } = require('./middleware/error');
const connectDB = require('./config/db');

// Load env vars from .env file
require('dotenv').config();

// Connect to MongoDB database
connectDB();

const app = express();

// Parse incoming JSON requests
app.use(express.json());

// Enable CORS for cross-origin requests
app.use(cors());

// Log HTTP requests in development
app.use(morgan('dev'));

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log('=== Incoming Request ===');
  console.log('Method:', req.method);
  console.log('URL:', req.originalUrl);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Params:', req.params);
  console.log('Query:', req.query);
  console.log('=====================');
  next();
});

// Mount API routers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/messages', require('./routes/messages'));

// Serve static files (profile pictures, uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
}); 