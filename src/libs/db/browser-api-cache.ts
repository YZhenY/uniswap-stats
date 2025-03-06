import { CACHE_CONFIG } from '../config';

// In-memory cache for faster access
const memoryCache = new Map<string, { value: any; expiresAt: number }>();

/**
 * Initialize the cache system
 */
export async function initializeDb(): Promise<boolean> {
  try {
    // Set up periodic cleanup
    setInterval(() => {
      cleanupCache();
    }, CACHE_CONFIG.checkPeriod * 1000);
    
    console.log('Browser cache initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize browser cache:', error);
    return false;
  }
}

/**
 * Store API response in cache
 * @param key Cache key
 * @param data Data to cache
 * @param ttl Time to live in seconds (defaults to config value)
 */
export async function storeApiResponse(key: string, data: any, ttl: number = CACHE_CONFIG.ttl): Promise<void> {
  try {
    const expiresAt = Date.now() + ttl * 1000;
    
    // Store in memory cache
    memoryCache.set(key, { value: data, expiresAt });
    
    // Store in localStorage for persistence
    try {
      localStorage.setItem(
        `uniswap_cache_${key}`, 
        JSON.stringify({ value: data, expiresAt })
      );
    } catch (error) {
      console.error('localStorage error:', error);
      // Continue even if localStorage fails
    }
  } catch (error) {
    console.error('Error storing in cache:', error);
  }
}

/**
 * Get API response from cache
 * @param key Cache key
 * @returns Cached data or null if not found/expired
 */
export async function getApiResponse(key: string): Promise<any> {
  try {
    // Check memory cache first
    const cached = memoryCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
    
    // Try localStorage
    try {
      const storedItem = localStorage.getItem(`uniswap_cache_${key}`);
      if (storedItem) {
        const parsed = JSON.parse(storedItem);
        if (parsed.expiresAt > Date.now()) {
          // Refresh memory cache
          memoryCache.set(key, parsed);
          return parsed.value;
        } else {
          // Remove expired item
          localStorage.removeItem(`uniswap_cache_${key}`);
        }
      }
    } catch (error) {
      console.error('localStorage error:', error);
      // Continue even if localStorage fails
    }
    
    return null;
  } catch (error) {
    console.error('Error getting from cache:', error);
    return null;
  }
}

/**
 * Clear expired cache entries
 */
export async function cleanupCache(): Promise<void> {
  try {
    const now = Date.now();
    
    // Clean memory cache
    Array.from(memoryCache.entries()).forEach(([key, entry]) => {
      if (entry.expiresAt <= now) {
        memoryCache.delete(key);
      }
    });
    
    // Clean localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('uniswap_cache_')) {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            if (parsed.expiresAt <= now) {
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (error) {
      console.error('localStorage cleanup error:', error);
    }
  } catch (error) {
    console.error('Error cleaning cache:', error);
  }
}

/**
 * Create indexing for cache (browser-friendly version is a no-op)
 */
export async function setupCacheIndexes(): Promise<void> {
  // No indexing needed for browser storage
  return Promise.resolve();
}
