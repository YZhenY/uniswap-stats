import mongoose from 'mongoose';

// Define the Cache schema for caching blockchain data
const cacheSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index that will automatically remove documents
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create the Cache model
export const Cache = mongoose.model('Cache', cacheSchema);
