/**
 * Types for the services
 */

export interface CacheItem<T> {
  value: T;
  expiresAt: Date;
}

export interface PositionCacheEntry {
  positionId: string;
  chainId: string;
  data: any;
  timestamp: Date;
}
