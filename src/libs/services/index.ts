import { CacheService } from './CacheService';
import { PositionService } from './PositionService';
import { connectDB } from '../db';
import { DB_CONFIG } from '../config';

// Initialize database connection if enabled
if (DB_CONFIG.enabled) {
  connectDB()
    .then(() => console.log('Database connected'))
    .catch((err) => console.error('Database connection error:', err));
}

// Initialize cache service
const cacheService = CacheService.getInstance();

// Export services
export { 
  cacheService,
  PositionService 
};

// Export types
export * from './types';
