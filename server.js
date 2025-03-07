const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { positionHistoryRoutes } = require('./api/routes/positionHistory');
const cacheRoutes = require('./api/routes/cache');
const { connectDB } = require('./api/config/db');
require('dotenv').config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/position-history', positionHistoryRoutes);
app.use('/api/cache', cacheRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    message: 'Uniswap Stats API is operational',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message,
    error: process.env.NODE_ENV === 'production' ? {} : err.stack
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Uniswap Stats API server running on port ${PORT}`);
});

module.exports = app;
