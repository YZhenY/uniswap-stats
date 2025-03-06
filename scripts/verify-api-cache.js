// Script to verify the API cache functionality
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
    
    // Check for api_cache collection
    const collections = await db.listCollections({ name: 'api_cache' }).toArray();
    if (collections.length === 0) {
      console.log('api_cache collection not found - will be created on first use');
    } else {
      console.log('api_cache collection exists');
      
      // Check for cache entries
      const apiCache = db.collection('api_cache');
      const count = await apiCache.countDocuments();
      console.log(`Found ${count} entries in api_cache collection`);
      
      if (count > 0) {
        // Show a sample of the cache entries
        const entries = await apiCache.find().limit(5).toArray();
        console.log('Sample cache entries:');
        entries.forEach((entry, index) => {
          console.log(`Entry ${index + 1}:`);
          console.log(`  Key: ${entry.key}`);
          console.log(`  Expires: ${entry.expiresAt}`);
          console.log(`  Updated: ${entry.updatedAt || 'N/A'}`);
          // Don't print the full value as it could be very large
          console.log(`  Value: [${typeof entry.value}]`);
        });
      }
    }
    
    // Check for indexes on api_cache collection
    if (collections.length > 0) {
      const apiCache = db.collection('api_cache');
      const indexes = await apiCache.indexes();
      console.log('Indexes on api_cache collection:');
      indexes.forEach(index => {
        console.log(`  ${index.name}: ${JSON.stringify(index.key)}`);
      });
    }
    
    console.log('\nVerification complete');
  } catch (error) {
    console.error('Error verifying API cache:', error);
  } finally {
    // Close the connection
    await client.close();
    console.log('Database connection closed');
  }
}

run().catch(console.dir);
