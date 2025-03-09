import React from 'react';
import { CHAINS } from '../libs/config';

// Helper function to format time ago
const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diffInSeconds = Math.floor((now - timestamp) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
};

// Price scale component to visualize position range and current price
interface PriceScaleProps {
  lowerPrice?: number;
  upperPrice?: number;
  currentPrice?: number;
  poolPair?: string;
}

const PriceScale: React.FC<PriceScaleProps> = ({ lowerPrice, upperPrice, currentPrice, poolPair }) => {
  // If we don't have all the required data, don't render
  if (!lowerPrice || !upperPrice || !currentPrice) {
    return null;
  }
  
  // Detect token pair type to determine scaling
  let displayLowerPrice = lowerPrice;
  let displayUpperPrice = upperPrice;
  let displayCurrentPrice = currentPrice;
  
  // The problem: different token pairs need different scaling for visualization
  if (!poolPair) {
    // No pool pair info available, use default scaling
    displayLowerPrice = lowerPrice;
    displayUpperPrice = upperPrice;
    displayCurrentPrice = currentPrice;
  } else {
    // Get the token symbols from pool pair
    const tokens = poolPair.split('/');
    
    // Check for specific pair types and apply appropriate scaling
    if (poolPair.includes('WBTC') && poolPair.includes('USDC')) {
      // WBTC/USDC pairs have high price values
      console.log(`WBTC/USDC pair detected: ${poolPair}, applying specific scaling`);
      if (currentPrice > 10000) { // WBTC price is typically high
        displayLowerPrice = lowerPrice;
        displayUpperPrice = upperPrice;
        displayCurrentPrice = currentPrice;
      }
    } else if (poolPair.includes('WETH') && poolPair.includes('USDC')) {
      // WETH/USDC pairs
      console.log(`WETH/USDC pair detected: ${poolPair}, applying specific scaling`);
      if (currentPrice < 1) { // USDC/WETH format (price < 1)
        displayLowerPrice = lowerPrice;
        displayUpperPrice = upperPrice;
        displayCurrentPrice = currentPrice;
      }
    } else if (tokens[0] === 'USDC' || tokens[0] === 'USDT' || tokens[0] === 'DAI') {
      // Stablecoin first pairs may need normalization
      console.log(`Stablecoin base pair detected: ${poolPair}, applying normalization`);
      // For stablecoin base pairs (like USDC/WETH), adjust the scaling if needed
      if (currentPrice > 100) { // High values might need scaling down
        displayLowerPrice = lowerPrice / 100;
        displayUpperPrice = upperPrice / 100;
        displayCurrentPrice = currentPrice / 100;
      }
    }
  }
  
  console.log(`Price scaling for ${poolPair}: Original prices [${lowerPrice}, ${currentPrice}, ${upperPrice}], Display prices [${displayLowerPrice}, ${displayCurrentPrice}, ${displayUpperPrice}]`);

  // Calculate min and max values for display
  // Calculate the extended range (+/- 10%)
  const rangeBuffer = 0.1; // 10%
  const minPrice = displayLowerPrice * (1 - rangeBuffer);
  const maxPrice = displayUpperPrice * (1 + rangeBuffer);
  
  // Calculate positions as percentages for the slider
  const range = maxPrice - minPrice;
  const lowerPct = ((displayLowerPrice - minPrice) / range) * 100;
  const upperPct = ((displayUpperPrice - minPrice) / range) * 100;
  const currentPct = ((displayCurrentPrice - minPrice) / range) * 100;
  
  // Ensure percentages are within bounds
  const boundedLowerPct = Math.max(0, Math.min(100, lowerPct));
  const boundedUpperPct = Math.max(0, Math.min(100, upperPct));
  const boundedCurrentPct = Math.max(0, Math.min(100, currentPct));
  
  // Determine if current price is in range
  const inRange = currentPrice >= lowerPrice && currentPrice <= upperPrice;
  
  return (
    <div className="price-scale-container">
      <div className="price-scale-header">
        <span className="price-scale-title">Price Range</span>
        <span className={`price-status ${inRange ? 'in-range' : 'out-of-range'}`}>
          {inRange ? 'In Range' : 'Out of Range'}
        </span>
      </div>
      <div className="price-scale">
        {/* Lower bound indicator */}
        <div 
          className="price-marker lower-bound" 
          style={{ left: `${boundedLowerPct}%` }}
          title={`Lower bound: ${lowerPrice.toFixed(4)}`}
        />
        
        {/* Upper bound indicator */}
        <div 
          className="price-marker upper-bound" 
          style={{ left: `${boundedUpperPct}%` }}
          title={`Upper bound: ${upperPrice.toFixed(4)}`}
        />
        
        {/* Range bar */}
        <div 
          className="price-range-bar" 
          style={{ 
            left: `${boundedLowerPct}%`, 
            width: `${boundedUpperPct - boundedLowerPct}%` 
          }}
        />
        
        {/* Current price indicator */}
        <div 
          className={`price-marker current-price ${inRange ? 'in-range' : 'out-of-range'}`} 
          style={{ left: `${boundedCurrentPct}%` }}
          title={`Current price: ${currentPrice.toFixed(4)} ${inRange ? '(In range)' : '(Out of range)'}`}
        />
      </div>
      <div className="price-scale-labels">
        <span className="price-min">Min: {displayLowerPrice < 0.1 ? displayLowerPrice.toFixed(6) : displayLowerPrice < 10 ? displayLowerPrice.toFixed(4) : displayLowerPrice.toFixed(2)}</span>
        <span className="price-max">Max: {displayUpperPrice < 0.1 ? displayUpperPrice.toFixed(6) : displayUpperPrice < 10 ? displayUpperPrice.toFixed(4) : displayUpperPrice.toFixed(2)}</span>
      </div>
    </div>
  );
};

interface PositionHistoryProps {
  positions: Array<{
    positionId: string;
    chainId: string;
    poolPair?: string;
    apy?: string;
    dailyApy?: string; // New field for 24-hour APY
    timestamp: number;
    lowerPrice?: number;
    upperPrice?: number;
    currentPrice?: number;
    lastRefreshed?: number;
  }>;
  onPositionSelect: (positionId: string, chainId: string) => void;
  onPositionRemove?: (positionId: string, chainId: string) => void;
  onPositionRefresh?: (positionId: string, chainId: string) => void;
}

const PositionHistory: React.FC<PositionHistoryProps> = ({ positions, onPositionSelect, onPositionRemove, onPositionRefresh }) => {
  // Debug log position data when the component renders
  React.useEffect(() => {
    console.log('PositionHistory - Detailed data of all positions:');
    positions.forEach((pos, index) => {
      console.log(`Position ${index + 1}: ID ${pos.positionId} on chain ${pos.chainId}`);
      console.log(`  Pool: ${pos.poolPair}`);
      console.log(`  Lower Price: ${pos.lowerPrice}`);
      console.log(`  Upper Price: ${pos.upperPrice}`);
      console.log(`  Current Price: ${pos.currentPrice}`);
      console.log(`  Last Refreshed: ${pos.lastRefreshed ? new Date(pos.lastRefreshed).toLocaleString() : 'N/A'}`);
    });
  }, [positions]);
  
  if (positions.length === 0) {
    return null;
  }

  return (
    <div className="position-history">
      <h3>Recently Viewed Positions</h3>
      <div className="position-history-list">
        {positions.map((pos, index) => (
          <div
            key={`${pos.chainId}-${pos.positionId}-${index}`}
            className="position-history-item"
            onClick={() => onPositionSelect(pos.positionId, pos.chainId)}
          >
            {onPositionRemove && (
              <button 
                className="remove-position-btn"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering the card click
                  onPositionRemove(pos.positionId, pos.chainId);
                }}
                aria-label="Remove from history"
              >
                ×
              </button>
            )}
            <div className="position-id">
              <span className="chain-badge">{CHAINS[pos.chainId]?.name}</span>
            </div>
            <div className="position-number">
              <span>ID: </span>
              <span className="position-number-value">{pos.positionId}</span>
            </div>
            {pos.poolPair && (
              <div className="pool-pair">
                {pos.poolPair}
              </div>
            )}
            {pos.apy && (
              <div className="apy-info">
                APY: {pos.apy}
                {pos.dailyApy && (
                  <span className="daily-apy">
                    24h APY: {pos.dailyApy}
                  </span>
                )}
              </div>
            )}
            {/* Price Scale Visualization */}
            {pos.lowerPrice && pos.upperPrice && pos.currentPrice ? (
              <>
                <div className="current-price-display">
                  <span className="current-price-label">Current Price:</span>
                  <span className="price-value">
                    {pos.currentPrice < 0.1 ? pos.currentPrice.toFixed(6) : 
                     pos.currentPrice < 10 ? pos.currentPrice.toFixed(4) : 
                     pos.currentPrice.toFixed(2)}
                  </span>
                </div>
                <PriceScale
                  lowerPrice={pos.lowerPrice}
                  upperPrice={pos.upperPrice}
                  currentPrice={pos.currentPrice}
                  poolPair={pos.poolPair}
                />
                <div className="price-bounds">
                  <span className="price-bound lower">
                    Min: {pos.lowerPrice < 0.1 ? pos.lowerPrice.toFixed(6) : 
                         pos.lowerPrice < 10 ? pos.lowerPrice.toFixed(4) : 
                         pos.lowerPrice.toFixed(2)}
                  </span>
                  <span className="price-bound upper">
                    Max: {pos.upperPrice < 0.1 ? pos.upperPrice.toFixed(6) : 
                         pos.upperPrice < 10 ? pos.upperPrice.toFixed(4) : 
                         pos.upperPrice.toFixed(2)}
                  </span>
                </div>
              </>
            ) : (
              <div className="missing-price-data">
                <span>Price data will appear here for new positions</span>
              </div>
            )}
            <div className="position-footer">
              <div className="timestamp">
                {new Date(pos.timestamp).toLocaleString()}
              </div>
              {pos.lastRefreshed && pos.lastRefreshed !== pos.timestamp && (
                <div className="last-refreshed-info">
                  Updated: {formatTimeAgo(pos.lastRefreshed)}
                  {onPositionRefresh && (
                    <button 
                      className="refresh-position-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPositionRefresh(pos.positionId, pos.chainId);
                      }}
                      title="Manually refresh this position"
                      aria-label="Refresh position"
                    >
                      ↻
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PositionHistory;
