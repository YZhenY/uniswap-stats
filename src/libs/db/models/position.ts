import mongoose from 'mongoose';

// Define the Position schema
const positionSchema = new mongoose.Schema({
  positionId: {
    type: String,
    required: true,
  },
  chainId: {
    type: String,
    required: true,
  },
  token0Address: {
    type: String,
    required: true,
  },
  token1Address: {
    type: String,
    required: true,
  },
  token0Symbol: String,
  token1Symbol: String,
  token0Decimals: Number,
  token1Decimals: Number,
  fee: Number,
  tickLower: Number,
  tickUpper: Number,
  liquidity: String, // BigNumber as string
  poolAddress: String,
  owner: String,
  deposited: [{
    amount0: String, // Store as string to preserve precision
    amount1: String,
    timestamp: Date,
    transactionHash: String,
  }],
  withdrawn: [{
    amount0: String,
    amount1: String,
    timestamp: Date,
    transactionHash: String,
  }],
  collected: [{
    amount0: String,
    amount1: String,
    timestamp: Date,
    transactionHash: String,
  }],
  stats: {
    aggregatedApy: String,
    impermanentLossLower: String,
    impermanentLossUpper: String,
    breakEvenDaysLower: Number,
    breakEvenDaysUpper: Number,
    totalYield0: String,
    totalYield1: String,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  dateCreated: Date,
  dateLastActive: Date,
}, {
  timestamps: true,
});

// Create a compound index on positionId and chainId for uniqueness
positionSchema.index({ positionId: 1, chainId: 1 }, { unique: true });

// Create the Position model
export const Position = mongoose.model('Position', positionSchema);
