import mongoose from 'mongoose';

// Define the Metric schema for tracking position metrics over time
const metricSchema = new mongoose.Schema({
  positionId: {
    type: String,
    required: true,
  },
  chainId: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  currentPrice: String,
  liquidity: String,
  feesCollected0: String,
  feesCollected1: String,
  tokenAmounts: {
    amount0: String,
    amount1: String,
  },
  depositedValue: String,
  currentValue: String,
  apy: String,
  impermanentLoss: String,
});

// Create a compound index on positionId, chainId, and timestamp
metricSchema.index({ positionId: 1, chainId: 1, timestamp: 1 });

// Create the Metric model
export const Metric = mongoose.model('Metric', metricSchema);
