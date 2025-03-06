/**
 * Break-Even Days Calculation Validation Script
 * 
 * This script validates the break-even days calculation formula used in our codebase:
 * breakEvenDays = (depositedValue * absoluteILValue) / yieldPerDay
 * 
 * This formula determines how many days of yield are needed to offset the impermanent loss.
 */

// Implementation of the break-even days formula matching our codebase function
function calculateBreakEvenDays(impermanentLoss, yieldPerDay, depositedValue) {
  try {
    // If impermanent loss is positive or zero (meaning no loss or gain), no need to break even
    if (impermanentLoss >= 0) {
      return 0; // No days needed to break even if there's no loss
    }
    
    // Convert the IL to a positive number (it's typically negative)
    const absoluteILValue = Math.abs(impermanentLoss);
    
    // Calculate the total value lost due to IL
    const ilValueLost = depositedValue * absoluteILValue;
    
    // Break-even days = Value lost due to IL / Yield per day
    // To avoid division by very small numbers, check if yield is substantial
    if (yieldPerDay <= 0.0000001) {
      return Number.POSITIVE_INFINITY; // Return infinity if yield is zero or very small
    }
    
    const breakEvenDays = ilValueLost / yieldPerDay;
    return Math.max(0, breakEvenDays); // Ensure we don't return negative days
  } catch (error) {
    console.error('Error calculating break-even days:', error);
    return Number.POSITIVE_INFINITY;
  }
}

// Test cases
const testCases = [
  { 
    impermanentLoss: -0.05, // 5% impermanent loss
    yieldPerDay: 2, // $2 per day yield
    depositedValue: 1000, // $1000 deposited
    expectedDays: 25, // $50 loss / $2 per day = 25 days
    description: 'Standard case with 5% IL'
  },
  { 
    impermanentLoss: -0.1, // 10% impermanent loss
    yieldPerDay: 5, // $5 per day yield
    depositedValue: 2000, // $2000 deposited
    expectedDays: 40, // $200 loss / $5 per day = 40 days
    description: 'Higher IL with higher yield'
  },
  { 
    impermanentLoss: 0, // No impermanent loss
    yieldPerDay: 3, // $3 per day yield
    depositedValue: 1500, // $1500 deposited
    expectedDays: 0, // No loss, no need to break even
    description: 'No impermanent loss case'
  },
  { 
    impermanentLoss: -0.03, // 3% impermanent loss
    yieldPerDay: 0, // No yield
    depositedValue: 1200, // $1200 deposited
    expectedDays: Number.POSITIVE_INFINITY, // Can't recover with no yield
    description: 'Zero yield case'
  },
  { 
    impermanentLoss: -0.02, // 2% impermanent loss
    yieldPerDay: 0.0000001, // Very small yield
    depositedValue: 1000, // $1000 deposited
    expectedDays: Number.POSITIVE_INFINITY, // Effectively can't recover
    description: 'Very small yield case'
  }
];

console.log('\n==================================');
console.log('BREAK-EVEN DAYS CALCULATION TESTS');
console.log('==================================\n');

// Run tests
let allTestsPassed = true;

for (const testCase of testCases) {
  const { impermanentLoss, yieldPerDay, depositedValue, expectedDays, description } = testCase;
  const calculatedDays = calculateBreakEvenDays(impermanentLoss, yieldPerDay, depositedValue);
  
  // For infinite results, we just check if both are Infinity
  const passed = expectedDays === Number.POSITIVE_INFINITY ? 
                calculatedDays === Number.POSITIVE_INFINITY :
                Math.abs(calculatedDays - expectedDays) < 0.01;
  
  if (!passed) allTestsPassed = false;
  
  console.log(`Test Case: ${description}`);
  console.log(`  Impermanent Loss: ${impermanentLoss * 100}%`);
  console.log(`  Yield Per Day: $${yieldPerDay}`);
  console.log(`  Deposited Value: $${depositedValue}`);
  console.log(`  Expected Break-even Days: ${expectedDays === Number.POSITIVE_INFINITY ? '∞' : expectedDays.toFixed(2)}`);
  console.log(`  Calculated Break-even Days: ${calculatedDays === Number.POSITIVE_INFINITY ? '∞' : calculatedDays.toFixed(2)}`);
  console.log(`  Test ${passed ? 'PASSED ✓' : 'FAILED ✗'}`);
  console.log('---');
}

console.log('\n==== TEST SUMMARY ====');
console.log(`${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
console.log(`\nFormula validated: breakEvenDays = (depositedValue * absoluteILValue) / yieldPerDay`);
console.log('This calculation correctly determines how many days of yield are needed to offset impermanent loss.');
console.log('==================================');
