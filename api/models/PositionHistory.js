const mongoose = require('mongoose');

const PositionHistorySchema = new mongoose.Schema({
  positionId: {
    type: String,
    required: true
  },
  chainId: {
    type: String,
    required: true
  },
  poolPair: {
    type: String,
    default: 'Unknown Pair'
  },
  apy: {
    type: String,
    default: '0.00%'
  },
  timestamp: {
    type: Number,
    default: Date.now
  },
  lowerPrice: {
    type: Number
  },
  upperPrice: {
    type: Number
  },
  currentPrice: {
    type: Number
  },
  lastRefreshed: {
    type: Number,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create a compound index for positionId and chainId for efficient queries
// Not using unique constraint as we want to update existing records
PositionHistorySchema.index({ positionId: 1, chainId: 1 });

module.exports = mongoose.model('PositionHistory', PositionHistorySchema);
