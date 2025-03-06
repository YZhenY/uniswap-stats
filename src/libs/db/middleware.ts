import { Provider } from '@ethersproject/providers';
import { BigNumberish } from 'ethers';
import { LiquidityPositionStats } from '../types';
import { getApiResponse, storeApiResponse } from './browser-api-cache';
import { CACHE_CONFIG } from '../config';

/**
 * Middleware for getLiquidityPositionStats that adds caching
 * @param originalFn The original function
 * @returns A wrapped function with caching
 */
// Import ethers
import { Contract } from '@ethersproject/contracts';

// Store last checked data for each position
interface LastCheckedData {
  blockNumber: number;
  timestamp: number;
}

const positionLastCheckedMap = new Map<string, LastCheckedData>();

// Uniswap V3 NonfungiblePositionManager ABI (minimal for events)
const POSITION_MANAGER_ABI = [
  'event Collect(uint256 indexed tokenId, address recipient, uint256 amount0, uint256 amount1)',
  'event IncreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)',
  'event DecreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
];

// Position Manager addresses for different chains
const POSITION_MANAGER_ADDRESSES: Record<string, string> = {
  '1': '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // Ethereum mainnet
  '8453': '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1', // Base
  '137': '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // Polygon
  '42161': '0xC36442b4a4522E871399CD717aBDD847Ab11FE88' // Arbitrum
};

/**
 * Check if a position has had any updates (events) since the last checked block
 * @param provider Ethereum provider
 * @param positionId Uniswap V3 position ID
 * @param chainId Chain ID
 * @param lastCheckedBlock Last block we checked events for
 * @returns Boolean indicating if position has updates
 */
async function hasPositionUpdates(
  provider: Provider, 
  positionId: string, 
  chainId: string, 
  lastCheckedBlock: number
): Promise<boolean> {
  try {
    // Get current block number
    const currentBlock = await provider.getBlockNumber();
    
    // If we're just starting or too many blocks have passed, assume there are updates
    if (lastCheckedBlock === 0 || currentBlock - lastCheckedBlock > 10000) {
      return true;
    }
    
    // Get position manager address for this chain
    const positionManagerAddress = POSITION_MANAGER_ADDRESSES[chainId];
    if (!positionManagerAddress) {
      console.error(`Position manager address not found for chain ${chainId}`);
      return true; // Assume updates if we can't check
    }
    
    // Create contract instance
    const positionManager = new Contract(
      positionManagerAddress,
      POSITION_MANAGER_ABI,
      provider
    );
    
    // Filter for events related to this position
    const positionIdBigInt = BigInt(positionId);
    
    // Check for Collect events
    const collectFilter = positionManager.filters.Collect(positionIdBigInt);
    const collectEvents = await positionManager.queryFilter(collectFilter, lastCheckedBlock, currentBlock);
    
    // Check for IncreaseLiquidity events
    const increaseFilter = positionManager.filters.IncreaseLiquidity(positionIdBigInt);
    const increaseEvents = await positionManager.queryFilter(increaseFilter, lastCheckedBlock, currentBlock);
    
    // Check for DecreaseLiquidity events
    const decreaseFilter = positionManager.filters.DecreaseLiquidity(positionIdBigInt);
    const decreaseEvents = await positionManager.queryFilter(decreaseFilter, lastCheckedBlock, currentBlock);
    
    // Check for Transfer events
    const transferFilter = positionManager.filters.Transfer(null, null, positionIdBigInt);
    const transferEvents = await positionManager.queryFilter(transferFilter, lastCheckedBlock, currentBlock);
    
    // If any events are found, position has updates
    const hasUpdates = [
      collectEvents.length,
      increaseEvents.length,
      decreaseEvents.length,
      transferEvents.length
    ].some(length => length > 0);
    
    if (hasUpdates) {
      console.log(`Found ${collectEvents.length + increaseEvents.length + decreaseEvents.length + transferEvents.length} events for position ${positionId} since block ${lastCheckedBlock}`);
    }
    
    return hasUpdates;
  } catch (error) {
    console.error(`Error checking for position updates:`, error);
    return true; // Assume updates if there's an error
  }
}

/**
 * Get the latest block number for a chain
 * @param provider Ethereum provider
 * @param chainId Chain ID
 * @returns Latest block number
 */
async function getLatestBlockNumber(provider: Provider, chainId: string): Promise<number> {
  try {
    return await provider.getBlockNumber();
  } catch (error) {
    console.error(`Error getting latest block number for chain ${chainId}:`, error);
    return 0;
  }
}

export function withApiCache<T extends (...args: any[]) => Promise<any>>(originalFn: T): T {
  return async function(...args: any[]): Promise<any> {
    // Extract parameters from args
    // For getLiquidityPositionStats, args are [provider, positionId, chainId]
    const provider = args[0] as Provider;
    const positionId = args[1]?.toString();
    const chainId = args[2]?.toString();
    
    if (!positionId || !chainId || !provider) {
      console.warn('Missing provider, position ID or chain ID for caching');
      return originalFn(...args);
    }
    
    // Get current block number
    const currentBlockNumber = await getLatestBlockNumber(provider, chainId);
    
    // Create cache key
    const cacheKey = `position_${chainId}_${positionId}`;
    
    // Get last checked data for this position
    const positionKey = `${chainId}_${positionId}`;
    const lastChecked = positionLastCheckedMap.get(positionKey) || { blockNumber: 0, timestamp: 0 };
    
    // Try to get cached data
    let cachedData = null;
    try {
      cachedData = await getApiResponse(cacheKey);
    } catch (error) {
      console.error(`Error retrieving from cache:`, error);
      // Continue to fetch fresh data
    }
    
    // Check if position has had any updates since we last checked
    const positionHasUpdates = await hasPositionUpdates(
      provider,
      positionId,
      chainId,
      lastChecked.blockNumber
    );
    
    // Determine if we can use cached data
    let useCachedData = false;
    
    if (cachedData && !positionHasUpdates) {
      console.log(`Using cached data for position ${positionId} on chain ${chainId} (no position updates)`);
      useCachedData = true;
    } else if (positionHasUpdates) {
      console.log(`Position ${positionId} on chain ${chainId} has updates since block ${lastChecked.blockNumber}`);
    } else {
      console.log(`No cached data found for position ${positionId} on chain ${chainId}`);
    }
    
    // Return cached data if valid
    if (useCachedData && cachedData) {
      return cachedData;
    }
    
    // Execute original function to get fresh data
    console.log(`Fetching fresh data for position ${positionId} on chain ${chainId}`);
    const result = await originalFn(...args);
    
    // Store in cache with current block number metadata
    try {
      // Store the result with metadata
      const dataWithMetadata = {
        ...result,
        _metadata: {
          cachedAtBlock: currentBlockNumber,
          cachedAt: Date.now()
        }
      };
      await storeApiResponse(cacheKey, dataWithMetadata, CACHE_CONFIG.ttl);
      
      // Update last checked data for this position
      positionLastCheckedMap.set(positionKey, {
        blockNumber: currentBlockNumber,
        timestamp: Date.now()
      });
      
      console.log(`Updated cache for position ${positionId} on chain ${chainId} at block ${currentBlockNumber}`);
    } catch (error) {
      console.error(`Error storing in cache:`, error);
    }
    
    return result;
  } as T;
}

/**
 * Get liquidity position stats with caching
 * This is a placeholder to be replaced with the actual implementation
 */
export let getCachedLiquidityPositionStats = async (
  _provider: Provider,
  _positionId: BigNumberish,
  _chainId: string
): Promise<LiquidityPositionStats> => {
  throw new Error('This function must be initialized with the original getLiquidityPositionStats');
};

/**
 * Initialize the cached function with the original implementation
 * @param originalFn The original getLiquidityPositionStats function
 */
export function initializeCachedFunctions(originalFn: any) {
  getCachedLiquidityPositionStats = withApiCache(originalFn);
}
