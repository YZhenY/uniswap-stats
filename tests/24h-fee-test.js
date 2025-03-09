// Test script for verifying 24-hour fee calculation
const { providers } = require('ethers');
const { BigNumber } = require('ethers');

// Setup require hooks for TypeScript files
require('ts-node').register({
  compilerOptions: {
    module: 'commonjs',
    target: 'es2017',
    jsx: 'react'
  }
});

// Import directly from source files
const { getLiquidityPositionStats } = require('../src/libs/stats');
const { getProvider } = require('../src/libs/provider');

// Sample configuration for the test
const config = {
  // Testing on mainnet
  chainId: '1',
  // Example position ID - should be replaced with a known valid position
  positionId: '12345',
  // Expected results (these should be updated with actual expected values)
  expectedDailyFees: {
    token0: {
      min: 0,     // Minimum expected token0 fee (in token units)
      max: 100    // Maximum expected token0 fee (in token units)
    },
    token1: {
      min: 0,     // Minimum expected token1 fee (in token units)
      max: 100    // Maximum expected token1 fee (in token units)
    }
  }
};

async function runTest() {
  try {
    console.log(`Starting 24-hour fee calculation test for position ${config.positionId} on chain ${config.chainId}...`);
    
    // Get provider
    const provider = getProvider(config.chainId);
    console.log('Provider initialized');
    
    // Get position stats
    console.log('Fetching position stats...');
    const stats = await getLiquidityPositionStats(
      provider,
      BigNumber.from(config.positionId),
      config.chainId
    );
    
    // Check that daily fees are calculated
    if (!stats.dailyCollected) {
      throw new Error('dailyCollected property missing from stats result');
    }
    
    // Print the results
    console.log('Test Results:');
    console.log('---------------------------------');
    console.log(`Position ID: ${stats.positionId.toString()}`);
    console.log(`Position Range: ${stats.lowerTickPrice.toSignificant(6)} - ${stats.upperTickPrice.toSignificant(6)}`);
    console.log(`Current Price: ${stats.currentPrice.toSignificant(6)}`);
    
    console.log('\nDaily Collected Fees:');
    console.log(`Token0 (${stats.dailyCollected[0].currency.symbol}): ${stats.dailyCollected[0].toExact()}`);
    console.log(`Token1 (${stats.dailyCollected[1].currency.symbol}): ${stats.dailyCollected[1].toExact()}`);
    
    // Validate token0 fee is within expected range
    const token0Fee = parseFloat(stats.dailyCollected[0].toExact());
    if (token0Fee < config.expectedDailyFees.token0.min || token0Fee > config.expectedDailyFees.token0.max) {
      console.warn(`WARNING: Token0 fee ${token0Fee} is outside expected range [${config.expectedDailyFees.token0.min}, ${config.expectedDailyFees.token0.max}]`);
    } else {
      console.log(`Token0 fee validation: PASSED`);
    }
    
    // Validate token1 fee is within expected range
    const token1Fee = parseFloat(stats.dailyCollected[1].toExact());
    if (token1Fee < config.expectedDailyFees.token1.min || token1Fee > config.expectedDailyFees.token1.max) {
      console.warn(`WARNING: Token1 fee ${token1Fee} is outside expected range [${config.expectedDailyFees.token1.min}, ${config.expectedDailyFees.token1.max}]`);
    } else {
      console.log(`Token1 fee validation: PASSED`);
    }
    
    console.log('\nDaily APR:');
    console.log(`Token0 APR: ${stats.dailyApr[0].multiply(100).toFixed(2)}%`);
    console.log(`Token1 APR: ${stats.dailyApr[1].multiply(100).toFixed(2)}%`);
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

// Run the test
runTest().then(() => {
  console.log('Test execution finished');
});
