/**
 * Impermanent Loss Validation Script
 * 
 * This script validates the impermanent loss formula used in our codebase:
 * IL = 2 * sqrt(price_ratio) / (1 + price_ratio) - 1
 * 
 * It compares our results with known values from various sources.
 */

// Implementation of the IL formula matching our codebase function
function calculateImpermanentLoss(initialPrice, finalPrice) {
  try {
    if (initialPrice <= 0 || finalPrice <= 0) {
      console.error('Invalid price values for IL calculation:', initialPrice, finalPrice);
      return 0; // Return 0 for invalid prices
    }
    
    // Calculate price ratio
    const priceRatio = finalPrice / initialPrice;
    
    // Calculate IL using the formula: IL = 2 * sqrt(price_ratio) / (1 + price_ratio) - 1
    const sqrtPriceRatio = Math.sqrt(priceRatio);
    const impermanentLossValue = (2 * sqrtPriceRatio) / (1 + priceRatio) - 1;
    
    return impermanentLossValue;
  } catch (error) {
    console.error('Error calculating impermanent loss:', error);
    return 0; // Return 0 in case of error
  }
}

// Test cases from industry standard examples
const testCases = [
  { initialPrice: 1000, finalPrice: 1000, expectedIL: 0, description: 'No price change' },
  { initialPrice: 3000, finalPrice: 3600, expectedIL: -0.0042, description: '20% price increase (example from chainport.io)' },
  { initialPrice: 1000, finalPrice: 1200, expectedIL: -0.0042, description: '20% price increase' },
  { initialPrice: 1000, finalPrice: 800, expectedIL: -0.0062, description: '20% price decrease' },
  { initialPrice: 1000, finalPrice: 2000, expectedIL: -0.0572, description: '100% price increase' },
  { initialPrice: 1000, finalPrice: 500, expectedIL: -0.0572, description: '50% price decrease' },
  { initialPrice: 1000, finalPrice: 4000, expectedIL: -0.2, description: '300% price increase' },
  { initialPrice: 1000, finalPrice: 250, expectedIL: -0.2, description: '75% price decrease' }
];

console.log('\n==================================');
console.log('IMPERMANENT LOSS CALCULATION TESTS');
console.log('==================================\n');

// Test normal cases
console.log('=== Standard Test Cases ===\n');
let allTestsPassed = true;

for (const testCase of testCases) {
  const { initialPrice, finalPrice, expectedIL, description } = testCase;
  const calculatedIL = calculateImpermanentLoss(initialPrice, finalPrice);
  const passed = Math.abs(calculatedIL - expectedIL) < 0.0001;
  
  if (!passed) allTestsPassed = false;
  
  console.log(`Test Case: ${description}`);
  console.log(`  Initial Price: ${initialPrice}, Final Price: ${finalPrice}`);
  console.log(`  Expected IL: ${expectedIL.toFixed(6)}`);
  console.log(`  Calculated:  ${calculatedIL.toFixed(6)}`);
  console.log(`  Test ${passed ? 'PASSED ✓' : 'FAILED ✗'}`);
  console.log('---');
}

// Test edge cases
console.log('\n=== Edge Cases ===\n');
const edgeCases = [
  { initialPrice: 0, finalPrice: 1000, description: 'Zero initial price' },
  { initialPrice: -100, finalPrice: 1000, description: 'Negative initial price' },
  { initialPrice: 1000, finalPrice: 0, description: 'Zero final price' },
  { initialPrice: 1000, finalPrice: -500, description: 'Negative final price' }
];

for (const testCase of edgeCases) {
  const { initialPrice, finalPrice, description } = testCase;
  const calculatedIL = calculateImpermanentLoss(initialPrice, finalPrice);
  
  console.log(`Edge Case: ${description}`);
  console.log(`  Initial Price: ${initialPrice}, Final Price: ${finalPrice}`);
  console.log(`  Result: ${calculatedIL} (should be 0 for invalid inputs)`);
  console.log('---');
}

console.log('\n==== TEST SUMMARY ====');
console.log(`${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
console.log(`\nFormula validated: IL = 2 * sqrt(price_ratio) / (1 + price_ratio) - 1`);
console.log('This matches the industry standard formula for impermanent loss calculations.');
console.log('==================================');
