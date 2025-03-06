import { Position } from './models/position';
import { Cache } from './models/cache';
import { Metric } from './models/metric';
import { LiquidityPositionStats } from '../types';
import { BigNumber } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Constants
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '3600'); // Default: 1 hour

/**
 * Save position data to the database
 * @param positionId The position ID
 * @param chainId The chain ID
 * @param stats The position stats
 */
export const savePosition = async (
  positionId: string,
  chainId: string,
  stats: LiquidityPositionStats
): Promise<void> => {
  try {
    // Convert token symbols to string
    const token0Symbol = stats.deposited[0].currency.symbol;
    const token1Symbol = stats.deposited[1].currency.symbol;
    const token0Decimals = stats.deposited[0].currency.decimals;
    const token1Decimals = stats.deposited[1].currency.decimals;
    
    // Create position object
    const positionData = {
      positionId,
      chainId,
      token0Address: stats.deposited[0].currency.address,
      token1Address: stats.deposited[1].currency.address,
      token0Symbol,
      token1Symbol,
      token0Decimals,
      token1Decimals,
      tickLower: stats.lowerTickPrice.numerator,
      tickUpper: stats.upperTickPrice.numerator,
      liquidity: stats.positionId.toString(),
      stats: {
        aggregatedApy: stats.apr[0].asFraction.multiply(100).toFixed(2),
        impermanentLossLower: stats.impermanentLossLower.multiply(100).toFixed(2),
        impermanentLossUpper: stats.impermanentLossUpper.multiply(100).toFixed(2),
        breakEvenDaysLower: stats.breakEvenDaysLower,
        breakEvenDaysUpper: stats.breakEvenDaysUpper,
        totalYield0: stats.totalYield[0].toExact(),
        totalYield1: stats.totalYield[1].toExact(),
      },
      lastUpdated: new Date(),
      dateCreated: stats.dateOpened,
      dateLastActive: stats.dateClosed || new Date(),
    };

    // Update or create position
    await Position.findOneAndUpdate(
      { positionId, chainId },
      positionData,
      { upsert: true, new: true }
    );

    // Save metrics snapshot
    await saveMetrics(positionId, chainId, stats);

    console.log(`Position ${positionId} on chain ${chainId} saved to database`);
  } catch (error) {
    console.error(`Error saving position ${positionId} to database:`, error);
    // Don't throw, just log - we want the app to continue even if DB operations fail
  }
};

/**
 * Save position metrics to the database
 * @param positionId The position ID
 * @param chainId The chain ID
 * @param stats The position stats
 */
const saveMetrics = async (
  positionId: string,
  chainId: string,
  stats: LiquidityPositionStats
): Promise<void> => {
  try {
    const metricData = {
      positionId,
      chainId,
      timestamp: new Date(),
      currentPrice: stats.currentPrice.toFixed(10),
      liquidity: stats.positionId.toString(),
      tokenAmounts: {
        amount0: stats.current[0].toExact(),
        amount1: stats.current[1].toExact(),
      },
      depositedValue: stats.deposited.map(d => d.toExact()).join(','),
      currentValue: stats.current.map(c => c.toExact()).join(','),
      apy: stats.apr[0].asFraction.multiply(100).toFixed(2),
      impermanentLoss: stats.impermanentLossLower.multiply(100).toFixed(2),
    };

    await Metric.create(metricData);
  } catch (error) {
    console.error(`Error saving metrics for position ${positionId}:`, error);
  }
};

/**
 * Get a position from the database
 * @param positionId The position ID
 * @param chainId The chain ID
 * @returns The position data
 */
export const getPosition = async (
  positionId: string,
  chainId: string
): Promise<any> => {
  try {
    const position = await Position.findOne({ positionId, chainId });
    return position;
  } catch (error) {
    console.error(`Error getting position ${positionId} from database:`, error);
    return null;
  }
};

/**
 * Get metrics for a position
 * @param positionId The position ID
 * @param chainId The chain ID
 * @param limit The number of metrics to return
 * @returns The position metrics
 */
export const getPositionMetrics = async (
  positionId: string,
  chainId: string,
  limit: number = 30
): Promise<any[]> => {
  try {
    const metrics = await Metric.find({ positionId, chainId })
      .sort({ timestamp: -1 })
      .limit(limit);
    return metrics;
  } catch (error) {
    console.error(`Error getting metrics for position ${positionId}:`, error);
    return [];
  }
};

/**
 * Get recent positions
 * @param limit The number of positions to return
 * @returns The recent positions
 */
export const getRecentPositions = async (limit: number = 10): Promise<any[]> => {
  try {
    const positions = await Position.find()
      .sort({ lastUpdated: -1 })
      .limit(limit);
    return positions;
  } catch (error) {
    console.error('Error getting recent positions:', error);
    return [];
  }
};

/**
 * Save data to cache
 * @param key The cache key
 * @param value The data to cache
 * @param ttl Optional TTL in seconds
 */
export const saveToCache = async (
  key: string,
  value: any,
  ttl: number = CACHE_TTL
): Promise<void> => {
  try {
    const expiresAt = new Date(Date.now() + ttl * 1000);
    
    await Cache.findOneAndUpdate(
      { key },
      { key, value, expiresAt },
      { upsert: true }
    );
  } catch (error) {
    console.error(`Error saving data to cache with key ${key}:`, error);
  }
};

/**
 * Get data from cache
 * @param key The cache key
 * @returns The cached data or null if not found
 */
export const getFromCache = async (key: string): Promise<any> => {
  try {
    const cacheItem = await Cache.findOne({ key });
    if (!cacheItem) {
      return null;
    }
    return cacheItem.value;
  } catch (error) {
    console.error(`Error getting data from cache with key ${key}:`, error);
    return null;
  }
};
