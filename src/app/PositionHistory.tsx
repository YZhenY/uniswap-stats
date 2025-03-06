import React from 'react';
import { CHAINS } from '../libs/config';

// Price scale component to visualize position range and current price
interface PriceScaleProps {
  lowerPrice?: number;
  upperPrice?: number;
  currentPrice?: number;
}

const PriceScale: React.FC<PriceScaleProps> = ({ lowerPrice, upperPrice, currentPrice }) => {
  // If we don't have all the required data, don't render
  if (!lowerPrice || !upperPrice || !currentPrice) {
    return null;
  }
  
  // Calculate the extended range (+/- 10%)
  const rangeBuffer = 0.1; // 10%
  const minPrice = lowerPrice * (1 - rangeBuffer);
  const maxPrice = upperPrice * (1 + rangeBuffer);
  
  // Calculate positions as percentages for the slider
  const range = maxPrice - minPrice;
  const lowerPct = ((lowerPrice - minPrice) / range) * 100;
  const upperPct = ((upperPrice - minPrice) / range) * 100;
  const currentPct = ((currentPrice - minPrice) / range) * 100;
  
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
        <span className="price-min">Min: {minPrice.toFixed(2)}</span>
        <span className="price-max">Max: {maxPrice.toFixed(2)}</span>
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
    timestamp: number;
    lowerPrice?: number;
    upperPrice?: number;
    currentPrice?: number;
  }>;
  onPositionSelect: (positionId: string, chainId: string) => void;
  onPositionRemove?: (positionId: string, chainId: string) => void;
}

const PositionHistory: React.FC<PositionHistoryProps> = ({ positions, onPositionSelect, onPositionRemove }) => {
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
              </div>
            )}
            {/* Price Scale Visualization */}
            {pos.lowerPrice && pos.upperPrice && pos.currentPrice ? (
              <>
                <div className="current-price-display">
                  <span className="current-price-label">Current Price:</span>
                  <span className="price-value">{pos.currentPrice.toFixed(4)}</span>
                </div>
                <PriceScale
                  lowerPrice={pos.lowerPrice}
                  upperPrice={pos.upperPrice}
                  currentPrice={pos.currentPrice}
                />
                <div className="price-bounds">
                  <span className="price-bound lower">Min: {pos.lowerPrice.toFixed(4)}</span>
                  <span className="price-bound upper">Max: {pos.upperPrice.toFixed(4)}</span>
                </div>
              </>
            ) : (
              <div className="missing-price-data">
                <span>Price data will appear here for new positions</span>
              </div>
            )}
            <div className="timestamp">
              {new Date(pos.timestamp).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PositionHistory;
