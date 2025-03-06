import React from 'react';
import { CHAINS } from '../libs/config';

interface PositionHistoryProps {
  positions: Array<{
    positionId: string;
    chainId: string;
    poolPair?: string;
    apy?: string;
    timestamp: number;
  }>;
  onPositionSelect: (positionId: string, chainId: string) => void;
}

const PositionHistory: React.FC<PositionHistoryProps> = ({ positions, onPositionSelect }) => {
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
            <div className="position-id">
              <span className="chain-badge">{CHAINS[pos.chainId]?.name}</span>
              Position #{pos.positionId}
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
