import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Position } from './models/position';
import { Cache } from './models/cache';
import { Metric } from './models/metric';

// Load environment variables
dotenv.config();

// MongoDB connection string
const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:password@localhost:27017/uniswap_stats?authSource=admin';

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
} as mongoose.ConnectOptions;

// Create MongoDB connection
const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGO_URI, options);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Don't crash the app if MongoDB connection fails - we can still use in-memory cache
  }
};

// Export models and connection function
export { connectDB, Position, Cache, Metric };

// Export database operations
export * from './operations';

// Export API cache middleware
export * from './middleware';
export * from './api-cache';
