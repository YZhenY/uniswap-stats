// Seed test position data
const { MongoClient } = require('mongodb');

// Connection URI
const uri = 'mongodb://admin:password@localhost:27017/uniswap_stats?authSource=admin';

// Create a new MongoClient
const client = new MongoClient(uri);

// Sample position data
const samplePosition = {
  positionId: '123456',
  chainId: '1', // Ethereum
  token0Address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
  token1Address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
  token0Symbol: 'USDC',
  token1Symbol: 'WETH',
  token0Decimals: 6,
  token1Decimals: 18,
  fee: 3000, // 0.3%
  tickLower: 192180,
  tickUpper: 193380,
  liquidity: '1000000000000000000',
  poolAddress: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
  owner: '0x1234567890123456789012345678901234567890',
  deposited: [
    {
      amount0: '1000000000', // 1000 USDC
      amount1: '500000000000000000', // 0.5 WETH
      timestamp: new Date('2025-01-01'),
      transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    }
  ],
  withdrawn: [],
  collected: [
    {
      amount0: '10000000', // 10 USDC
      amount1: '5000000000000000', // 0.005 WETH
      timestamp: new Date('2025-02-01'),
      transactionHash: '0x0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba'
    }
  ],
  stats: {
    aggregatedApy: '12.5',
    impermanentLossLower: '-2.3',
    impermanentLossUpper: '-1.8',
    breakEvenDaysLower: 60,
    breakEvenDaysUpper: 50,
    totalYield0: '20000000', // 20 USDC
    totalYield1: '10000000000000000', // 0.01 WETH
  },
  lastUpdated: new Date(),
  dateCreated: new Date('2025-01-01'),
  dateLastActive: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
};

// Sample metrics data
const sampleMetrics = [
  {
    positionId: '123456',
    chainId: '1',
    timestamp: new Date('2025-02-01'),
    currentPrice: '1800.50',
    liquidity: '1000000000000000000',
    feesCollected0: '10000000',
    feesCollected1: '5000000000000000',
    tokenAmounts: {
      amount0: '990000000',
      amount1: '495000000000000000'
    },
    depositedValue: '2700000000',
    currentValue: '2750000000',
    apy: '12.5',
    impermanentLoss: '-2.3'
  },
  {
    positionId: '123456',
    chainId: '1',
    timestamp: new Date('2025-03-01'),
    currentPrice: '1950.25',
    liquidity: '1000000000000000000',
    feesCollected0: '20000000',
    feesCollected1: '10000000000000000',
    tokenAmounts: {
      amount0: '980000000',
      amount1: '490000000000000000'
    },
    depositedValue: '2700000000',
    currentValue: '2800000000',
    apy: '13.2',
    impermanentLoss: '-2.5'
  }
];

// Sample cache data
const sampleCache = {
  key: 'position_1_123456',
  value: {
    // Position data would go here (simplified for example)
    positionId: '123456',
    chainId: '1',
    currentStats: {
      apy: 13.2,
      impermanentLoss: -2.5
    }
  },
  expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
  createdAt: new Date()
};

async function run() {
  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log('Connected successfully to MongoDB server');
    
    // Get the database
    const db = client.db('uniswap_stats');
    
    // Insert position data
    const positionsCollection = db.collection('positions');
    await positionsCollection.deleteMany({ positionId: samplePosition.positionId }); // Clear any existing data
    const positionResult = await positionsCollection.insertOne(samplePosition);
    console.log(`Position inserted with _id: ${positionResult.insertedId}`);
    
    // Insert metrics data
    const metricsCollection = db.collection('metrics');
    await metricsCollection.deleteMany({ positionId: samplePosition.positionId }); // Clear any existing data
    const metricsResult = await metricsCollection.insertMany(sampleMetrics);
    console.log(`${metricsResult.insertedCount} metrics inserted`);
    
    // Insert cache data
    const cacheCollection = db.collection('cache');
    await cacheCollection.deleteMany({ key: sampleCache.key }); // Clear any existing data
    const cacheResult = await cacheCollection.insertOne(sampleCache);
    console.log(`Cache entry inserted with _id: ${cacheResult.insertedId}`);
    
    // Verify data
    const position = await positionsCollection.findOne({ positionId: samplePosition.positionId });
    console.log('Retrieved position:');
    console.log(`ID: ${position.positionId}, Chain: ${position.chainId}`);
    console.log(`Pool: ${position.token0Symbol}/${position.token1Symbol}`);
    console.log(`APY: ${position.stats.aggregatedApy}%`);
    
    const metrics = await metricsCollection.find({ positionId: samplePosition.positionId }).toArray();
    console.log(`Retrieved ${metrics.length} metrics entries`);
    
    // Success
    console.log('Database seed completed successfully');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    // Close the connection
    await client.close();
    console.log('Database connection closed');
  }
}

run().catch(console.dir);
