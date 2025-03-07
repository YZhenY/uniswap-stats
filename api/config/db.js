const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // Use the MongoDB URI from the environment variables
    const mongoURI = process.env.MONGO_URI || 'mongodb://admin:password@localhost:27017/uniswap_stats?authSource=admin';
    
    console.log('Connecting to MongoDB at:', mongoURI);
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      useNewUrlParser: true, // Deprecated but kept for backward compatibility
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Set up event listeners for connection issues
    mongoose.connection.on('error', err => {
      console.error(`MongoDB connection error: ${err}`);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
    
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    console.error('Please make sure MongoDB is running and credentials are correct.');
    process.exit(1);
  }
};

module.exports = { connectDB };
