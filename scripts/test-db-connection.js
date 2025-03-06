// Test MongoDB connection
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
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('Collections:');
    collections.forEach(collection => {
      console.log(` - ${collection.name}`);
    });
    
    // Insert a test document
    const testCollection = db.collection('test');
    const result = await testCollection.insertOne({
      name: 'Test Document',
      timestamp: new Date(),
      description: 'This is a test document to verify the database connection'
    });
    console.log(`Test document inserted with _id: ${result.insertedId}`);
    
    // Find the test document
    const testDoc = await testCollection.findOne({ name: 'Test Document' });
    console.log('Retrieved test document:');
    console.log(testDoc);
    
    // Success
    console.log('Database connection test completed successfully');
  } catch (err) {
    console.error('Error connecting to database:', err);
  } finally {
    // Close the connection
    await client.close();
    console.log('Database connection closed');
  }
}

run().catch(console.dir);
