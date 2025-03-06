import { saveToCache, getFromCache } from '../db/operations';

/**
 * Cache service class to manage in-memory and persistent caching
 */
export class CacheService {
  private static instance: CacheService;
  private memoryCache: Map<string, { value: any; expiresAt: Date }>;
  private useDb: boolean;

  constructor(useDb: boolean = true) {
    this.memoryCache = new Map();
    this.useDb = useDb;
  }

  /**
   * Get the singleton instance of the cache service
   */
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Set a value in the cache
   * @param key The cache key
   * @param value The value to cache
   * @param ttlSeconds Time to live in seconds
   */
  public async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    
    // Set in memory cache
    this.memoryCache.set(key, { value, expiresAt });
    
    // Persist to database if enabled
    if (this.useDb) {
      try {
        await saveToCache(key, value, ttlSeconds);
      } catch (error) {
        console.error(`Error persisting cache for key ${key}:`, error);
      }
    }
  }

  /**
   * Get a value from the cache
   * @param key The cache key
   * @returns The cached value or null if not found
   */
  public async get(key: string): Promise<any> {
    // Check memory cache first
    const memCacheItem = this.memoryCache.get(key);
    
    if (memCacheItem && memCacheItem.expiresAt > new Date()) {
      return memCacheItem.value;
    }
    
    // Remove expired item from memory cache
    if (memCacheItem) {
      this.memoryCache.delete(key);
    }
    
    // If not in memory cache or expired, try database if enabled
    if (this.useDb) {
      try {
        const dbValue = await getFromCache(key);
        
        if (dbValue) {
          // Add back to memory cache
          this.memoryCache.set(key, { 
            value: dbValue, 
            expiresAt: new Date(Date.now() + 3600 * 1000) // Default 1 hour
          });
          return dbValue;
        }
      } catch (error) {
        console.error(`Error retrieving from persistent cache for key ${key}:`, error);
      }
    }
    
    return null;
  }

  /**
   * Delete a value from the cache
   * @param key The cache key
   */
  public async delete(key: string): Promise<void> {
    // Remove from memory cache
    this.memoryCache.delete(key);
    
    // Remove from database if enabled
    if (this.useDb) {
      try {
        // We don't have a dedicated function but we can use the mongoose model directly
        const { Cache } = require('../db/models/cache');
        await Cache.deleteOne({ key });
      } catch (error) {
        console.error(`Error deleting from persistent cache for key ${key}:`, error);
      }
    }
  }

  /**
   * Clear all values from the cache
   */
  public async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();
    
    // Clear database cache if enabled
    if (this.useDb) {
      try {
        const { Cache } = require('../db/models/cache');
        await Cache.deleteMany({});
      } catch (error) {
        console.error('Error clearing persistent cache:', error);
      }
    }
  }

  /**
   * Check if a key exists in the cache
   * @param key The cache key
   * @returns Whether the key exists in the cache
   */
  public async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }
}
