import React, { useEffect, useState } from 'react'
import './App.css'
import { getPositionStatsWithCache } from '../libs/stats'
import { getProvider } from '../libs/provider'
import {
  formatBaseCurrencyPrice,
  formatCurrencyAmountsWithQuote,
  toQuoteCurrencyAmount,
} from '../libs/util/uniswap'
import { LiquidityPositionStats } from '../libs/types'
import { CurrencyAmount, Fraction, Token } from '@uniswap/sdk-core'
import { CHAINS, DEFAULT_CHAIN } from '../libs/config'
import PositionHistory from './PositionHistory'
import './PositionHistory.css'
import { getPositionHistory, savePositionHistory, deleteAllPositionHistory } from '../libs/api/positionHistory'

/* eslint-disable */
// Define a type for the position history entries
interface PositionHistoryEntry {
  positionId: string;
  chainId: string;
  poolPair?: string;
  apy?: string;
  dailyApy?: string;      // 24-hour APY 
  timestamp: number;       // When the entry was created/updated
  lowerPrice?: number;
  upperPrice?: number;
  currentPrice?: number;
  lastRefreshed?: number;  // Last time position data was refreshed
}

const LOCAL_STORAGE_KEY = 'uniswap-stats-position-history';

const App = () => {
  const [positionId, setPositionId] = useState<string>('1628115')
  const [stats, setStats] = useState<LiquidityPositionStats | null>(null)
  const [statsText, setStatsText] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedChain, setSelectedChain] = useState<string>(DEFAULT_CHAIN)
  const [positionHistory, setPositionHistory] = useState<PositionHistoryEntry[]>([])
  const [poolPair, setPoolPair] = useState<string>('')
  const [aggregatedApy, setAggregatedApy] = useState<string>('')
  const [dailyApy, setDailyApy] = useState<string>('')  
  const [dailyAprFormatted, setDailyAprFormatted] = useState<string>('N/A')
  const [backgroundRefreshing, setBackgroundRefreshing] = useState<{[key: string]: boolean}>({})

  // Load position history from MongoDB API when component mounts
  useEffect(() => {
    const loadPositionHistory = async () => {
      try {
        console.log('Fetching position history from MongoDB API...');
        const positions = await getPositionHistory();
        console.log(`Successfully loaded ${positions.length} positions from MongoDB`);
        
        // Make sure all entries have a lastRefreshed timestamp
        const updatedHistory = positions.map(entry => ({
          ...entry,
          lastRefreshed: entry.lastRefreshed || entry.timestamp
        }));
        
        setPositionHistory(updatedHistory);
        
        // Refresh price data for the first position if available
        if (updatedHistory.length > 0) {
          const firstPos = updatedHistory[0];
          console.log('Auto-loading first position to get price data:', firstPos.positionId);
          // Just set the position ID and chain instead of calling handleSelectPosition
          // This prevents the position history from being overwritten
          setPositionId(firstPos.positionId);
          setSelectedChain(firstPos.chainId);
          // Use a special version of fetchPositionStats that won't modify position history
          fetchPositionStatsPreserveHistory(firstPos.positionId, firstPos.chainId);
        }
      } catch (error) {
        console.error('Failed to load position history from API:', error);
        // Fall back to localStorage if API fails
        const savedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedHistory) {
          try {
            console.log('Falling back to localStorage position history...');
            const parsedHistory = JSON.parse(savedHistory) as PositionHistoryEntry[];
            setPositionHistory(parsedHistory);
          } catch (e) {
            console.error('Failed to parse position history from localStorage:', e);
          }
        }
      }
    };
    
    loadPositionHistory();
  }, []);
  
  // Set up background refresh for positions
  useEffect(() => {
    const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
    const REFRESH_STAGGER_DELAY = 30 * 1000; // 30 seconds between position refreshes
    
    // Schedule the periodic check
    const intervalId = setInterval(() => {
      if (positionHistory.length === 0) return;
      
      console.log('Running scheduled position refresh check');
      const now = Date.now();
      
      // Find positions that need to be refreshed
      const positionsToRefresh = positionHistory
        .filter(pos => !pos.lastRefreshed || (now - pos.lastRefreshed > REFRESH_INTERVAL))
        .sort((a, b) => (a.lastRefreshed || 0) - (b.lastRefreshed || 0)); // Refresh oldest first
      
      if (positionsToRefresh.length === 0) {
        console.log('No positions need refreshing at this time');
        return;
      }
      
      console.log(`${positionsToRefresh.length} positions need refreshing. Staggering refreshes...`);
      
      // Refresh positions with staggered timing to avoid overloading API
      positionsToRefresh.forEach((position, index) => {
        setTimeout(() => {
          console.log(`Background refreshing position ${position.positionId} on ${CHAINS[position.chainId]?.name}`);
          // We'll use a separate method that doesn't change the UI state for position ID/chain
          backgroundRefreshPosition(position.positionId, position.chainId);
        }, index * REFRESH_STAGGER_DELAY);
      });
    }, REFRESH_INTERVAL / 3); // Check more frequently than the actual refresh interval
    
    return () => clearInterval(intervalId);
  }, [positionHistory]);

  useEffect(() => {
    if (stats === null) {
      setStatsText([])
      setPoolPair('')
      setAggregatedApy('')
      return
    }

    const aprFormatted = (() => {
      const apr = stats.yieldPerDay.map((v, i) => {
        try {
          // Check if deposit is zero or extremely small to avoid division by zero
          if (stats.deposited[i].equalTo(CurrencyAmount.fromRawAmount(stats.deposited[i].currency, 0)) || 
              stats.deposited[i].lessThan(CurrencyAmount.fromRawAmount(stats.deposited[i].currency, 1))) {
            console.log(`UI: Skipping APR calculation for zero or near-zero deposit at index ${i}`);
            return {
              value: new Fraction(0, 1),
              currency: v.currency,
            };
          }
          
          return {
            value: v.divide(stats.deposited[i]).multiply(365).asFraction,
            currency: v.currency,
          };
        } catch (error) {
          console.error(`UI: Error calculating APR at index ${i}:`, error);
          return {
            value: new Fraction(0, 1),
            currency: v.currency,
          };
        }
      })

      const yieldPerDayQuoteAmount = toQuoteCurrencyAmount(
        stats.yieldPerDay,
        stats.avgYieldPrice
      )
      const depositedQuoteAmount = toQuoteCurrencyAmount(
        stats.deposited,
        stats.avgDepositPrice
      )
      // Add safety check to prevent division by zero when calculating aprQuoteAmount
      let aprQuoteAmount: Fraction;
      try {
        // Check if depositedQuoteAmount is zero or extremely small
        if (depositedQuoteAmount.equalTo(CurrencyAmount.fromRawAmount(depositedQuoteAmount.currency, 0)) || 
            depositedQuoteAmount.lessThan(CurrencyAmount.fromRawAmount(depositedQuoteAmount.currency, 1))) {
          console.log('UI: Skipping quote APR calculation for zero or near-zero deposit');
          aprQuoteAmount = new Fraction(0, 1);
        } else {
          aprQuoteAmount = yieldPerDayQuoteAmount
            .divide(depositedQuoteAmount)
            .multiply(365).asFraction;
        }
      } catch (error) {
        console.error('UI: Error calculating quote APR:', error);
        aprQuoteAmount = new Fraction(0, 1);
      }
      const fmtApr = (apr: { value: Fraction; currency: Token }) =>
        `${apr.value.multiply(100).toFixed(2)}% ${apr.currency.symbol}`
      const formattedApr = `${apr.map(fmtApr).join(' ')} (= ${fmtApr({
        value: aprQuoteAmount,
        currency: yieldPerDayQuoteAmount.currency,
      })} at ${formatBaseCurrencyPrice(stats.avgYieldPrice)})`;
      
      // Save the aggregated APY for display in position history
      setAggregatedApy(`${aprQuoteAmount.multiply(100).toFixed(2)}%`);
      
      return formattedApr;
    })()
    
    // Calculate and format 24-hour APR
    const dailyAprFmt = (() => {
      // Check if dailyApr exists
      if (!stats.dailyApr || !stats.dailyCollected) {
        return 'N/A'
      }
      
      const dailyYieldQuoteAmount = toQuoteCurrencyAmount(
        stats.dailyCollected,
        stats.avgYieldPrice // Use same price as overall yield for consistency
      )
      
      const depositedQuoteAmount = toQuoteCurrencyAmount(
        stats.deposited,
        stats.avgDepositPrice
      )
      
      // Add safety check to prevent division by zero when calculating dailyAprQuoteAmount
      let dailyAprQuoteAmount: Fraction;
      try {
        if (depositedQuoteAmount.equalTo(CurrencyAmount.fromRawAmount(depositedQuoteAmount.currency, 0)) || 
            depositedQuoteAmount.lessThan(CurrencyAmount.fromRawAmount(depositedQuoteAmount.currency, 1))) {
          console.log('UI: Skipping daily quote APR calculation for zero or near-zero deposit')
          dailyAprQuoteAmount = new Fraction(0, 1);
        } else {
          dailyAprQuoteAmount = dailyYieldQuoteAmount
            .divide(depositedQuoteAmount)
            .multiply(365).asFraction;
        }
      } catch (error) {
        console.error('UI: Error calculating daily quote APR:', error);
        dailyAprQuoteAmount = new Fraction(0, 1);
      }
      
      const fmtApr = (apr: { value: Fraction; currency: Token }) =>
        `${apr.value.multiply(100).toFixed(2)}% ${apr.currency.symbol}`
      
      const dailyAprValues = stats.dailyApr.map((apr, i) => ({
        value: apr,
        currency: stats.dailyCollected[i].currency,
      }))
      
      // Save daily APY for position history display
      setDailyApy(`${dailyAprQuoteAmount.multiply(100).toFixed(2)}%`)
      
      const formattedDailyApr = `${dailyAprValues.map(fmtApr).join(' ')} (= ${fmtApr({
        value: dailyAprQuoteAmount,
        currency: dailyYieldQuoteAmount.currency,
      })} at ${formatBaseCurrencyPrice(stats.avgYieldPrice)})`;
      
      return formattedDailyApr;
    })()
    setDailyAprFormatted(dailyAprFmt)
    
    // Extract and set pool pair information
    try {
      const token0 = stats.deposited[0].currency.symbol;
      const token1 = stats.deposited[1].currency.symbol;
      const poolPairString = `${token0}/${token1}`;
      setPoolPair(poolPairString);
      console.log(`Set pool pair: ${poolPairString}`);
    } catch (error) {
      console.error('Error setting pool pair:', error);
      setPoolPair('Unknown Pair');
    }

    setStatsText([
      `positionId: ${stats.positionId.toString()}`,
      `range: ${formatBaseCurrencyPrice(
        stats.lowerTickPrice
      )} ${formatBaseCurrencyPrice(stats.upperTickPrice)}`,
      `price: ${formatBaseCurrencyPrice(stats.currentPrice)}`,
      `deposited: ${formatCurrencyAmountsWithQuote(
        stats.deposited,
        stats.avgDepositPrice
      )}`,
      `withdrawn: ${formatCurrencyAmountsWithQuote(
        stats.withdrawn,
        stats.avgWithdrawnPrice
      )}`,
      `current: ${formatCurrencyAmountsWithQuote(
        stats.current,
        stats.currentPrice
      )}`,
      `yield: ${formatCurrencyAmountsWithQuote(
        stats.totalYield,
        stats.avgYieldPrice
      )}`,
      `dateRange: ${stats.dateOpened.toLocaleString()} ${
        stats.dateClosed ? stats.dateClosed.toLocaleString() : 'N/A'
      } (${(stats.durationPositionHeld / 86_400_000).toFixed(1)} days)`,
      `yieldPerDay: ${formatCurrencyAmountsWithQuote(
        stats.yieldPerDay,
        stats.avgYieldPrice
      )}`,
      `apr: ${aprFormatted}`,
      // Add 24-hour fee information
      `24hr fees: ${formatCurrencyAmountsWithQuote(
        stats.dailyCollected,
        stats.avgYieldPrice
      )}`,
      `24hr apr: ${dailyAprFormatted}`,
      `impermanent loss lower: ${stats.impermanentLossLower.multiply(100).toFixed(2)}% (break-even in ${stats.breakEvenDaysLower === Number.POSITIVE_INFINITY ? '∞' : stats.breakEvenDaysLower.toFixed(1)} days)`,
      `impermanent loss upper: ${stats.impermanentLossUpper.multiply(100).toFixed(2)}% (break-even in ${stats.breakEvenDaysUpper === Number.POSITIVE_INFINITY ? '∞' : stats.breakEvenDaysUpper.toFixed(1)} days)`,
    ])
  }, [stats])

  const handleGetStatsClick = async () => {
    if (!positionId) {
      alert('Please enter a Liquidity Position ID')
      return
    }
    
    await fetchPositionStats(positionId, selectedChain);
  }
  
  const handleSelectPosition = (posId: string, chainId: string) => {
    setPositionId(posId);
    setSelectedChain(chainId);
    fetchPositionStats(posId, chainId);
  }
  
  // Separated fetch logic to reuse it
  const fetchPositionStats = async (posId: string, chainId: string) => {

    setLoading(true)
    try {
      console.log(`Fetching stats for chain: ${chainId}, position ID: ${posId}`)
      const provider = getProvider(chainId)
      console.log('Provider obtained:', provider)
      
      // Clear any existing localStorage cache for this position before fetching new data
      try {
        const cacheKey = `getPositionStats:${JSON.stringify([provider, posId, chainId])}`;
        localStorage.removeItem(`uniswap_cache_${cacheKey}`);
        console.log(`Cleared cache for position ${posId} on chain ${chainId}`);
      } catch (e) {
        console.error('Failed to clear position cache:', e);
      }
      
      // Use the cached version for better performance
      const stats = await getPositionStatsWithCache(
        provider,
        posId,
        chainId
      )
      setStats(stats)
      console.log('Stats loaded successfully:', stats)
      
      // After successful fetch, add/update in position history
      let poolPairString = 'Unknown Pair';
      try {
        const token0 = stats.deposited[0].currency.symbol;
        const token1 = stats.deposited[1].currency.symbol;
        poolPairString = `${token0}/${token1}`;
      } catch (error) {
        console.error('Error getting pool pair for history:', error);
      }
      
      // Calculate APY for history
      const yieldPerDayQuoteAmount = toQuoteCurrencyAmount(
        stats.yieldPerDay,
        stats.avgYieldPrice
      )
      const depositedQuoteAmount = toQuoteCurrencyAmount(
        stats.deposited,
        stats.avgDepositPrice
      )
      
      let apyString = "0.00%";
      try {
        if (!depositedQuoteAmount.equalTo(CurrencyAmount.fromRawAmount(depositedQuoteAmount.currency, 0))) {
          const aprQuoteAmount = yieldPerDayQuoteAmount
            .divide(depositedQuoteAmount)
            .multiply(365).asFraction;
          apyString = `${aprQuoteAmount.multiply(100).toFixed(2)}%`;
        }
      } catch (error) {
        console.error('Error calculating APY for history:', error);
      }
      
      // Extract price data for the position history
      let lowerPrice: number | undefined = undefined;
      let upperPrice: number | undefined = undefined;
      let currentPrice: number | undefined = undefined;
      
      try {
        lowerPrice = parseFloat(stats.lowerTickPrice.toSignificant(6));
        upperPrice = parseFloat(stats.upperTickPrice.toSignificant(6));
        currentPrice = parseFloat(stats.currentPrice.toSignificant(6));
        
        console.log(`Creating position history entry for ${posId} on chain ${chainId}`);
        console.log(`Pool pair: ${poolPairString}`);
        console.log(`Price data - Lower: ${lowerPrice}, Upper: ${upperPrice}, Current: ${currentPrice}`);
      } catch (error) {
        console.error('Error extracting price data in fetchPositionStats:', error);
      }
      
      updatePositionHistory(posId, chainId, poolPairString, apyString, lowerPrice, upperPrice, currentPrice, dailyApy);
    } catch (error: any) {
      console.error('Error fetching stats:', error)
      
      // Check for specific error types and messages
      if (error.code === 'POSITION_NOT_FOUND' || 
          error.code === 'POSITION_DATA_ERROR' ||
          (error.message && error.message.includes('call revert exception')) ||
          (error.message && error.message.includes('does not exist on this network')) ||
          (error.message && error.message.includes('data cannot be retrieved'))) {
        alert(`Position ID ${posId} cannot be accessed on the ${CHAINS[chainId].name} network. \n\nPlease try a different position ID or switch to a different network.`);
      } 
      // Handle division by zero errors
      else if (error.message && (error.message.includes('Division by zero') || 
                error.message.includes('division by zero'))) {
        console.error('Division by zero error in calculations:', error);
        alert(`Error calculating statistics for position ID ${posId}: Division by zero error. \n\nThis usually happens with positions that have zero or extremely small deposits. Try a different position.`);
      } 
      // Other errors
      else {
        alert(`Error fetching stats: ${error.message || String(error)}`);
      }
      
      setStats(null)
    } finally {
      setLoading(false)
    }
  }
  
  // Helper function to update position history
  const updatePositionHistory = async (
    posId: string, 
    chainId: string, 
    poolPairString: string, 
    apyString: string,
    lowerPrice?: number,
    upperPrice?: number,
    currentPrice?: number,
    dailyApyString?: string
  ) => {
    // Only extract price data from stats if not provided as parameters
    if (!lowerPrice || !upperPrice || !currentPrice) {
      if (stats) {
        try {
          // Extract prices from stats
          if (!lowerPrice) lowerPrice = parseFloat(stats.lowerTickPrice.toSignificant(6));
          if (!upperPrice) upperPrice = parseFloat(stats.upperTickPrice.toSignificant(6));
          if (!currentPrice) currentPrice = parseFloat(stats.currentPrice.toSignificant(6));
        
          // Add detailed debug logging
          console.log(`Position ${posId} on ${CHAINS[chainId]?.name} price data:`);
          console.log(`  Pool Pair: ${poolPairString}`);
          console.log(`  Lower Price: ${lowerPrice}`);
          console.log(`  Upper Price: ${upperPrice}`);
          console.log(`  Current Price: ${currentPrice}`);
          console.log(`  Raw Lower Price: ${stats.lowerTickPrice.toSignificant(10)}`);
          console.log(`  Raw Upper Price: ${stats.upperTickPrice.toSignificant(10)}`);
          console.log(`  Raw Current Price: ${stats.currentPrice.toSignificant(10)}`);
        } catch (error) {
          console.error('Error extracting price data for history:', error);
        }
      }
    }
    
    const now = Date.now();
    const newEntry: PositionHistoryEntry = {
      positionId: posId,
      chainId: chainId,
      poolPair: poolPairString,
      apy: apyString,
      dailyApy: dailyApyString, // Add 24-hour APY
      timestamp: now,
      lowerPrice,
      upperPrice,
      currentPrice,
      lastRefreshed: now
    };
    
    // Save to MongoDB API
    try {
      console.log('Saving position history to MongoDB...');
      await savePositionHistory(newEntry);
      
      // Update local state with the new entry
      // Remove any existing entry for the same position and chain
      const filteredHistory = positionHistory.filter(
        entry => !(entry.positionId === posId && entry.chainId === chainId)
      );
      
      // Add new entry at the beginning
      const updatedHistory = [newEntry, ...filteredHistory];
      
      // Limit to 10 entries
      const limitedHistory = updatedHistory.slice(0, 10);
      
      setPositionHistory(limitedHistory);
    } catch (error) {
      console.error('Failed to save position history to MongoDB:', error);
      
      // Fall back to localStorage
      try {
        // Remove any existing entry for the same position and chain
        const filteredHistory = positionHistory.filter(
          entry => !(entry.positionId === posId && entry.chainId === chainId)
        );
        
        // Add new entry at the beginning
        const updatedHistory = [newEntry, ...filteredHistory];
        
        // Limit to 10 entries
        const limitedHistory = updatedHistory.slice(0, 10);
        
        setPositionHistory(limitedHistory);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(limitedHistory));
      } catch (e) {
        console.error('Failed to save position history to localStorage:', e);
      }
    }
  }
  
  // Background refresh function that silently updates position data without changing UI state
  const backgroundRefreshPosition = async (posId: string, chainId: string) => {
    // Skip if this position is already being refreshed
    const refreshKey = `${chainId}-${posId}`;
    if (backgroundRefreshing[refreshKey]) {
      console.log(`Position ${posId} on ${CHAINS[chainId]?.name} is already being refreshed. Skipping.`);
      return;
    }
    
    // Set background refreshing flag
    setBackgroundRefreshing(prev => ({
      ...prev,
      [refreshKey]: true
    }));
    
    try {
      console.log(`Background refreshing position ${posId} on ${CHAINS[chainId]?.name}`);
      const provider = getProvider(chainId);
      const stats = await getPositionStatsWithCache(provider, posId, chainId);
      
      // Update only the position in history without changing selected position
      let poolPairString = 'Unknown Pair';
      try {
        const token0 = stats.deposited[0].currency.symbol;
        const token1 = stats.deposited[1].currency.symbol;
        poolPairString = `${token0}/${token1}`;
      } catch (error) {
        console.error('Error getting pool pair for background refresh:', error);
      }
      
      // Calculate APY for history
      const yieldPerDayQuoteAmount = toQuoteCurrencyAmount(
        stats.yieldPerDay,
        stats.avgYieldPrice
      );
      const depositedQuoteAmount = toQuoteCurrencyAmount(
        stats.deposited,
        stats.avgDepositPrice
      );
      
      let apyString = "0.00%";
      try {
        if (!depositedQuoteAmount.equalTo(CurrencyAmount.fromRawAmount(depositedQuoteAmount.currency, 0))) {
          const aprQuoteAmount = yieldPerDayQuoteAmount
            .divide(depositedQuoteAmount)
            .multiply(365).asFraction;
          apyString = `${aprQuoteAmount.multiply(100).toFixed(2)}%`;
        }
      } catch (error) {
        console.error('Error calculating APY for background refresh:', error);
      }
      
      // Extract price data
      let lowerPrice: number | undefined = undefined;
      let upperPrice: number | undefined = undefined;
      let currentPrice: number | undefined = undefined;
      try {
        lowerPrice = parseFloat(stats.lowerTickPrice.toSignificant(6));
        upperPrice = parseFloat(stats.upperTickPrice.toSignificant(6));
        currentPrice = parseFloat(stats.currentPrice.toSignificant(6));
      } catch (error) {
        console.error('Error extracting price data for background refresh:', error);
      }
      
      // Update the position in history
      const now = Date.now();
      const updatedHistory = positionHistory.map(pos => {
        // If this is the position we're refreshing, update it
        if (pos.positionId === posId && pos.chainId === chainId) {
          return {
            ...pos,
            poolPair: poolPairString,
            apy: apyString,
            lowerPrice,
            upperPrice,
            currentPrice,
            lastRefreshed: now
          };
        }
        return pos;
      });
      
      // Update state and localStorage
      setPositionHistory(updatedHistory);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedHistory));
      console.log(`Successfully refreshed position ${posId} on ${CHAINS[chainId]?.name} in background`);
    } catch (error) {
      console.error(`Failed to refresh position ${posId} on ${CHAINS[chainId]?.name} in background:`, error);
    } finally {
      // Clear background refreshing flag
      setBackgroundRefreshing(prev => ({
        ...prev,
        [refreshKey]: false
      }));
    }
  };

  // Function to remove a position from history
  const removePositionFromHistory = (posId: string, chainId: string) => {
    // Filter out the position to be removed
    const updatedHistory = positionHistory.filter(
      entry => !(entry.positionId === posId && entry.chainId === chainId)
    );
    
    setPositionHistory(updatedHistory);
    
    // Update localStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Failed to save updated position history to localStorage:', error);
    }
  }
  
  // Clear all history entries and cache
  const clearAllHistory = async () => {
    console.log('Clearing all position history and cache');
    setLoading(true);
    
    // Clear position history in MongoDB
    try {
      console.log('Clearing all position history from MongoDB...');
      await deleteAllPositionHistory();
      setPositionHistory([]);
    } catch (error) {
      console.error('Failed to clear position history from MongoDB:', error);
      
      // Fall back to clearing localStorage
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setPositionHistory([]);
      } catch (e) {
        console.error('Failed to clear position history from localStorage:', e);
      }
    }
    
    // Clear position cache
    try {
      import('../libs/db/browser-api-cache').then(({ clearPositionCache }) => {
        clearPositionCache();
      });
    } catch (error) {
      console.error('Failed to clear position cache:', error);
    }
    
    setLoading(false);
  }

  // Special version of fetchPositionStats that doesn't modify position history
  // Used during initial loading to prevent overwriting loaded positions
  const fetchPositionStatsPreserveHistory = async (posId: string, chainId: string) => {
    setLoading(true)
    try {
      console.log(`Loading initial position stats (preserving history) for chain: ${chainId}, position ID: ${posId}`)
      const provider = getProvider(chainId)
      
      // Use the cached version for better performance
      const stats = await getPositionStatsWithCache(
        provider,
        posId,
        chainId
      )
      setStats(stats)
      console.log('Initial stats loaded successfully')
      
      // Do NOT update position history here - that's the key difference
      
    } catch (error: any) {
      console.error('Error fetching initial stats:', error)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="App">
      <h1>UniswapV3 Stats Viewer</h1>
      
      {/* Display Position History */}
      {positionHistory.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' }}>
          <button 
            onClick={clearAllHistory} 
            style={{ 
              padding: '5px 10px', 
              backgroundColor: '#f44336', 
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '10px'
            }}
          >
            Clear All History & Cache
          </button>
        </div>
      )}
      <PositionHistory 
        positions={positionHistory} 
        onPositionSelect={handleSelectPosition}
        onPositionRemove={removePositionFromHistory}
        onPositionRefresh={backgroundRefreshPosition}
      />
      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px' }}>Select Chain:</label>
        <select
          value={selectedChain}
          onChange={(e) => setSelectedChain(e.target.value)}
          style={{ padding: '5px', marginRight: '10px' }}
        >
          {Object.entries(CHAINS).map(([id, config]) => (
            <option key={id} value={id}>{config.name}</option>
          ))}
        </select>
      </div>
      <input
        type="text"
        onChange={(e) => setPositionId(e.target.value)}
        value={positionId}
        placeholder="Liquidity Position ID"
        style={{ textAlign: 'center' }}
      />
      <button onClick={handleGetStatsClick}>
        Get Liquidity Position Stats
      </button>

      {(loading && (
        <div className="loader" style={{ margin: '20px 0' }}></div>
      )) ||
        (stats && (
          <div style={{ marginTop: '20px' }}>
            {/* <h3>Liquidity Position Stats</h3> */}
            <table style={{ textAlign: 'left' }}>
              <tbody>
                {/* Display Pool Pair at the top */}
                {poolPair && (
                  <tr className="pool-pair-row" style={{ fontWeight: 'bold', backgroundColor: '#f8f9fa' }}>
                    <td>Pool Pair</td>
                    <td>{poolPair}</td>
                  </tr>
                )}
                {/* Display Aggregated APY prominently */}
                {aggregatedApy && (
                  <tr className="apy-row" style={{ fontWeight: 'bold', color: '#28a745', backgroundColor: '#f8f9fa' }}>
                    <td>Aggregated APY</td>
                    <td>{aggregatedApy}</td>
                  </tr>
                )}
                {/* Separator row */}
                {(poolPair || aggregatedApy) && (
                  <tr style={{ height: '10px', backgroundColor: 'transparent' }}>
                    <td colSpan={2}></td>
                  </tr>
                )}
                {statsText.map((stat, index) => (
                  <tr key={index}>
                    <td>{stat.split(': ')[0]}</td>
                    <td>{stat.split(': ')[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  )
}

export default App
