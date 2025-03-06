// Test database persistence
const { MongoClient } = require('mongodb');

// Connection URI
const uri = 'mongodb://admin:password@localhost:27017/uniswap_stats?authSource=admin';

// Create a new MongoClient
const client = new MongoClient(uri);

async function run() {
  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log('Connected successfully to MongoDB server');
    
    // Get the database
    const db = client.db('uniswap_stats');
    
    // Get collections
    const positionsCollection = db.collection('positions');
    const metricsCollection = db.collection('metrics');
    const cacheCollection = db.collection('cache');
    
    // Query for our test position
    const position = await positionsCollection.findOne({ positionId: '123456' });
    if (position) {
      console.log('✅ Test position found with persistence');
      console.log(`ID: ${position.positionId}, Chain: ${position.chainId}`);
      console.log(`Pool: ${position.token0Symbol}/${position.token1Symbol}`);
      console.log(`APY: ${position.stats.aggregatedApy}%`);
    } else {
      console.log('❌ Test position NOT found - persistence failed');
    }
    
    // Query for metrics
    const metricsCount = await metricsCollection.countDocuments({ positionId: '123456' });
    console.log(`Found ${metricsCount} metrics entries for position`);
    
    // Query for cache
    const cache = await cacheCollection.findOne({ key: 'position_1_123456' });
    if (cache) {
      console.log('✅ Cache entry found with persistence');
      console.log(`Key: ${cache.key}, Expires: ${cache.expiresAt}`);
    } else {
      console.log('❌ Cache entry NOT found - persistence failed');
    }
    
    // Success
    console.log('Database persistence test completed');
  } catch (err) {
    console.error('Error testing database persistence:', err);
  } finally {
    // Close the connection
    await client.close();
    console.log('Database connection closed');
  }
}

run().catch(console.dir);
