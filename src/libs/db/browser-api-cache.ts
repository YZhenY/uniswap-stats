import { CACHE_CONFIG } from '../config';
import { API_BASE_URL } from '../api/config';

// In-memory cache for faster access
const memoryCache = new Map<string, { value: any; expiresAt: number }>();

// Flag to track if we should use localStorage fallback
let useLocalStorageFallback = false;

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
 * @param forceRefresh If true, will store even if key already exists
 */
export async function storeApiResponse(key: string, data: any, ttl: number = CACHE_CONFIG.ttl): Promise<void> {
  try {
    const expiresAt = Date.now() + ttl * 1000;
    
    // Store in memory cache
    memoryCache.set(key, { value: data, expiresAt });
    
    // Store in MongoDB via API
    if (!useLocalStorageFallback) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/cache`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            key: `uniswap_cache_${key}`,
            value: data,
            ttl: ttl
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to store in MongoDB: ${response.statusText}`);
        }
      } catch (error) {
        console.error('MongoDB cache API error:', error);
        useLocalStorageFallback = true;
        // Fall back to localStorage
        storeInLocalStorage(key, data, expiresAt);
      }
    } else {
      // Use localStorage as fallback
      storeInLocalStorage(key, data, expiresAt);
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
    
    // Try MongoDB API if not using fallback
    if (!useLocalStorageFallback) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/cache/uniswap_cache_${key}`);
        
        if (response.ok) {
          const data = await response.json();
          // Refresh memory cache
          memoryCache.set(key, { 
            value: data, 
            expiresAt: Date.now() + CACHE_CONFIG.ttl * 1000 
          });
          return data;
        } else if (response.status !== 404) {
          // If not a 'not found' error, something went wrong with the API
          throw new Error(`Failed to get from MongoDB: ${response.statusText}`);
        }
      } catch (error) {
        console.error('MongoDB cache API error:', error);
        useLocalStorageFallback = true;
        // Fall back to localStorage
        return getFromLocalStorage(key);
      }
    } else {
      // Use localStorage as fallback
      return getFromLocalStorage(key);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting from cache:', error);
    return null;
  }
}

/**
 * Clear all position-related cache data
 */
export async function clearPositionCache(): Promise<void> {
  try {
    console.log('Clearing all position-related cache data');
    
    // Clear memory cache
    Array.from(memoryCache.entries()).forEach(([key, _]) => {
      if (key.includes('position_')) {
        memoryCache.delete(key);
      }
    });
    
    // Clear cache from MongoDB
    if (!useLocalStorageFallback) {
      try {
        // Delete all position-related cache entries
        // This is a simplified approach - in production you might want more specific targeting
        const response = await fetch(`${API_BASE_URL}/api/cache`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to clear MongoDB cache: ${response.statusText}`);
        }
        
        console.log('Cleared position cache entries from MongoDB');
      } catch (error) {
        console.error('Error clearing position cache from MongoDB:', error);
        useLocalStorageFallback = true;
        // Fall back to localStorage
        clearLocalStorageCache();
      }
    } else {
      // Clear localStorage as fallback
      clearLocalStorageCache();
    }
  } catch (error) {
    console.error('Error clearing position cache:', error);
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
    
    // MongoDB handles TTL automatically via the expireAfterSeconds index
    // Clean localStorage as fallback
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

/**
 * Helper function to get an item from localStorage
 */
function getFromLocalStorage(key: string): any {
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
  }
  return null;
}

/**
 * Helper function to store an item in localStorage
 */
function storeInLocalStorage(key: string, data: any, expiresAt: number): void {
  try {
    localStorage.setItem(
      `uniswap_cache_${key}`,
      JSON.stringify({ value: data, expiresAt })
    );
  } catch (error) {
    console.error('localStorage error:', error);
  }
}

/**
 * Helper function to clear localStorage cache
 */
function clearLocalStorageCache(): void {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('uniswap_cache_') && key.includes('position_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log(`Cleared ${keysToRemove.length} position cache entries from localStorage`);
  } catch (error) {
    console.error('Error clearing position cache from localStorage:', error);
  }
}
