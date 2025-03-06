// Export browser-friendly cache functions
import { 
  initializeDb, 
  storeApiResponse, 
  getApiResponse, 
  cleanupCache 
} from './browser-api-cache';

// Create a browser-friendly connect function
const connectDB = async (): Promise<void> => {
  try {
    await initializeDb();
    console.log('Browser cache system initialized');
  } catch (error) {
    console.error('Failed to initialize browser cache system:', error);
  }
};

// Export browser-friendly functions
export { 
  connectDB, 
  storeApiResponse, 
  getApiResponse,
  cleanupCache 
};
