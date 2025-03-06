import { Price, Token, Fraction } from '@uniswap/sdk-core';
import { calculateImpermanentLoss } from './libs/util/uniswap';

// Create mock tokens for testing
const token0 = new Token(1, '0x0000000000000000000000000000000000000001', 18, 'TKN0', 'Token0');
const token1 = new Token(1, '0x0000000000000000000000000000000000000002', 18, 'TKN1', 'Token1');

/**
 * Test function to validate impermanent loss calculation
 * Compare our implementation with the standard formula: 
 * IL = 2 * sqrt(price_ratio) / (1 + price_ratio) - 1
 */
function testImpermanentLossCalculation() {
  console.log('=== Impermanent Loss Calculation Test ===');
  
  // Test scenarios with different price ratios
  const testCases = [
    { initialPrice: 1000, finalPrice: 1000, expectedIL: 0 },        // No price change
    { initialPrice: 1000, finalPrice: 1200, expectedIL: -0.0042 },  // 20% price increase
    { initialPrice: 1000, finalPrice: 800, expectedIL: -0.0101 },   // 20% price decrease
    { initialPrice: 1000, finalPrice: 2000, expectedIL: -0.0572 },  // 100% price increase
    { initialPrice: 1000, finalPrice: 500, expectedIL: -0.0572 },   // 50% price decrease
    { initialPrice: 1000, finalPrice: 4000, expectedIL: -0.1716 },  // 300% price increase
    { initialPrice: 1000, finalPrice: 250, expectedIL: -0.1339 }    // 75% price decrease
  ];
  
  // Manual calculation function for verification
  function calculateExpectedIL(initialPrice: number, finalPrice: number): number {
    const priceRatio = finalPrice / initialPrice;
    return (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;
  }
  
  // Run tests
  for (const testCase of testCases) {
    const { initialPrice, finalPrice, expectedIL } = testCase;
    
    // Create Price objects for our function
    const depositPrice = new Price(token0, token1, 1, initialPrice);
    const boundaryPrice = new Price(token0, token1, 1, finalPrice);
    
    // Calculate IL using our implementation
    const calculatedIL: Fraction = calculateImpermanentLoss(depositPrice, boundaryPrice);
    const calculatedILValue = parseFloat(calculatedIL.toFixed(6));
    
    // Calculate expected IL manually for verification
    const manualIL = calculateExpectedIL(initialPrice, finalPrice);
    
    // Compare results
    const passed = Math.abs(calculatedILValue - expectedIL) < 0.0001;
    
    console.log(`Test Case: Initial Price = ${initialPrice}, Final Price = ${finalPrice}`);
    console.log(`  Expected IL: ${expectedIL.toFixed(6)}`);
    console.log(`  Manual IL:   ${manualIL.toFixed(6)}`);
    console.log(`  Calculated:  ${calculatedILValue.toFixed(6)}`);
    console.log(`  Test ${passed ? 'PASSED ✓' : 'FAILED ✗'}`);
    console.log('---');
  }
}

// Edge cases test
function testEdgeCases() {
  console.log('=== Edge Cases Test ===');
  
  // Test with zero and negative values
  const edgeCases = [
    { initialPrice: 0, finalPrice: 1000, label: 'Zero initial price' },
    { initialPrice: -100, finalPrice: 1000, label: 'Negative initial price' },
    { initialPrice: 1000, finalPrice: 0, label: 'Zero final price' },
    { initialPrice: 1000, finalPrice: -500, label: 'Negative final price' }
  ];
  
  for (const testCase of edgeCases) {
    const { initialPrice, finalPrice, label } = testCase;
    
    // Create Price objects
    const depositPrice = new Price(token0, token1, 1, initialPrice);
    const boundaryPrice = new Price(token0, token1, 1, finalPrice);
    
    // Our function should handle these gracefully
    const calculatedIL: Fraction = calculateImpermanentLoss(depositPrice, boundaryPrice);
    const calculatedILValue = parseFloat(calculatedIL.toFixed(6));
    
    console.log(`Edge Case: ${label}`);
    console.log(`  Input: Initial Price = ${initialPrice}, Final Price = ${finalPrice}`);
    console.log(`  Result: ${calculatedILValue} (should be 0 for invalid inputs)`);
    console.log('---');
  }
}

// Run all tests
function runTests() {
  console.log('\n==================================');
  console.log('IMPERMANENT LOSS CALCULATION TESTS');
  console.log('==================================\n');
  testImpermanentLossCalculation();
  testEdgeCases();
  console.log('\nTests completed.');
}

// Execute tests
runTests();
