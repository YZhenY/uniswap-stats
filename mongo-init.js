// This script will be executed when the MongoDB container starts up
// It creates the necessary collections and indexes for the Uniswap stats application

db = db.getSiblingDB('uniswap_stats');

// Create users collection
db.createCollection('positions');

// Create indexes for faster querying
db.positions.createIndex({ "positionId": 1, "chainId": 1 }, { unique: true });
db.positions.createIndex({ "lastUpdated": 1 });
db.positions.createIndex({ "token0Symbol": 1, "token1Symbol": 1 });

// Create metrics collection for tracking APY and other statistics
db.createCollection('metrics');
db.metrics.createIndex({ "positionId": 1, "chainId": 1, "timestamp": 1 });

// Create cache collection for storing temporary data
db.createCollection('cache');
db.cache.createIndex({ "key": 1 }, { unique: true });
db.cache.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });

print('MongoDB initialization completed');
