import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { CACHE_CONFIG } from '../config';

// Load environment variables
dotenv.config();

// Connection URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:password@localhost:27017/uniswap_stats?authSource=admin';

// Create a MongoDB client
const client = new MongoClient(MONGO_URI);

// In-memory cache as a fallback
const memoryCache = new Map<string, { value: any; expiresAt: number }>();

/**
 * Initialize the database connection
 */
export async function initializeDb(): Promise<boolean> {
  try {
    await client.connect();
    console.log('Connected to MongoDB for API cache');
    return true;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    return false;
  }
}

/**
 * Store API response in database
 * @param key Cache key
 * @param data API response data
 * @param ttl Time to live in seconds
 */
export async function storeApiResponse(
  key: string,
  data: any,
  ttl: number = CACHE_CONFIG.ttl
): Promise<void> {
  // Always store in memory cache
  const expiresAt = Date.now() + ttl * 1000;
  memoryCache.set(key, { value: data, expiresAt });
  
  try {
    // Also store in database if connected
    if (client) {
      // Try to connect if not already connected
      try {
        await client.connect();
      } catch (connectError) {
        // Connection might already be established
      }
      const db = client.db('uniswap_stats');
      const collection = db.collection('api_cache');
      
      // Create or update the cache entry
      await collection.updateOne(
        { key },
        { 
          $set: { 
            key,
            value: data,
            expiresAt: new Date(expiresAt),
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      
      console.log(`Stored API data in database: ${key}`);
    }
  } catch (error) {
    console.error(`Error storing API data in database: ${key}`, error);
    // Continue execution - memory cache is still valid
  }
}

/**
 * Get API response from cache
 * @param key Cache key
 * @returns Cached data or null if not found/expired
 */
export async function getApiResponse(key: string): Promise<any> {
  // First check memory cache
  const memCacheEntry = memoryCache.get(key);
  if (memCacheEntry && memCacheEntry.expiresAt > Date.now()) {
    console.log(`Retrieved from memory cache: ${key}`);
    return memCacheEntry.value;
  }
  
  // If expired or not in memory cache, remove it
  if (memCacheEntry) {
    memoryCache.delete(key);
  }
  
  try {
    // Try to get from database
    if (client) {
      // Try to connect if not already connected
      try {
        await client.connect();
      } catch (connectError) {
        // Connection might already be established
      }
      const db = client.db('uniswap_stats');
      const collection = db.collection('api_cache');
      
      const dbCacheEntry = await collection.findOne({ 
        key,
        expiresAt: { $gt: new Date() } 
      });
      
      if (dbCacheEntry) {
        console.log(`Retrieved from database cache: ${key}`);
        
        // Refresh memory cache
        memoryCache.set(key, { 
          value: dbCacheEntry.value, 
          expiresAt: dbCacheEntry.expiresAt.getTime() 
        });
        
        return dbCacheEntry.value;
      }
    }
  } catch (error) {
    console.error(`Error retrieving API data from database: ${key}`, error);
    // Continue execution - data may not be in cache
  }
  
  // If we got here, data wasn't found or was expired
  return null;
}

/**
 * Clear expired cache entries
 */
export async function cleanupCache(): Promise<void> {
  // Clean memory cache
  const now = Date.now();
  // Convert to array first to avoid iterator issues
  Array.from(memoryCache.entries()).forEach(([key, entry]) => {
    if (entry.expiresAt <= now) {
      memoryCache.delete(key);
    }
  });
  
  try {
    // Clean database cache
    if (client) {
      // Try to connect if not already connected
      try {
        await client.connect();
      } catch (connectError) {
        // Connection might already be established
      }
      const db = client.db('uniswap_stats');
      const collection = db.collection('api_cache');
      
      const result = await collection.deleteMany({
        expiresAt: { $lte: new Date() }
      });
      
      if (result.deletedCount > 0) {
        console.log(`Cleaned up ${result.deletedCount} expired cache entries`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up expired cache entries:', error);
  }
}

/**
 * Create a TTL index on the expiresAt field
 * This ensures automatic cleanup of expired documents
 */
export async function setupCacheIndexes(): Promise<void> {
  try {
    if (client) {
      // Try to connect if not already connected
      try {
        await client.connect();
      } catch (connectError) {
        // Connection might already be established
        console.log('Connection already established or couldn\'t connect:', connectError);
      }
      
      const db = client.db('uniswap_stats');
      const collection = db.collection('api_cache');
      
      // Create TTL index on expiresAt field
      await collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 }
      );
      
      // Create index on key for fast lookups
      await collection.createIndex(
        { key: 1 },
        { unique: true }
      );
      
      console.log('Cache indexes created successfully');
    }
  } catch (error) {
    console.error('Error setting up cache indexes:', error);
  }
}
