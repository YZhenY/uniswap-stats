import { BigNumber, BigNumberish, providers } from 'ethers'
import { LiquidityPositionStats } from './types'
import { LiquidityPositionManager } from './manager'
import { PoolFactory } from './factory'
import { LiquidityPool } from './pool'
import {
  getCollected,
  getCurrencyAmounts,
  getCurrentAmounts,
  getDeposited,
  getPriceFromSqrtPriceX96,
  getWithdrawn,
  newTokenFromTokenAddress,
  toQuoteCurrencyAmount,
  calculateImpermanentLoss,
  calculateBreakEvenDays,
} from './util/uniswap'
import { tickToPrice } from '@uniswap/v3-sdk'
import { CurrencyAmount, Fraction, Price } from '@uniswap/sdk-core'

// Original implementation
export async function getLiquidityPositionStats(
  provider: providers.Provider,
  positionId: BigNumberish,
  chainId: string
): Promise<LiquidityPositionStats> {
  console.log(`Starting getLiquidityPositionStats for chain: ${chainId}, position: ${positionId}`);
  try {
  const manager = new LiquidityPositionManager(provider, chainId)
  const position = await manager.getLiquidityPosition(positionId)
  const token0 = await newTokenFromTokenAddress(position.token0, provider, chainId)
  const token1 = await newTokenFromTokenAddress(position.token1, provider, chainId)

  const lowerTickPrice = tickToPrice(token0, token1, position.tickLower)
  const upperTickPrice = tickToPrice(token0, token1, position.tickUpper)

  const factory = new PoolFactory(provider, chainId)
  const poolAddress = await factory.getLiquidityPoolAddress(
    position.token0,
    position.token1,
    position.fee
  )

  const pool = new LiquidityPool(poolAddress, provider)

  const slot0 = await pool.getSlot0()
  const currentPrice = getPriceFromSqrtPriceX96(
    slot0.sqrtPriceX96,
    token0,
    token1
  )

  const current = getCurrentAmounts(
    position.liquidity,
    slot0.sqrtPriceX96,
    position.tickLower,
    position.tickUpper,
    token0,
    token1
  )

  const uncollectedRaw = await manager.getUncollected(positionId)
  const uncollected = getCurrencyAmounts(
    token0,
    uncollectedRaw.amount0,
    token1,
    uncollectedRaw.amount1
  )

  const depositedRaw = await getDeposited(
    provider,
    BigNumber.from(positionId),
    pool,
    chainId
  )
  const deposited = getCurrencyAmounts(
    token0,
    depositedRaw.amount0,
    token1,
    depositedRaw.amount1
  )
  const avgDepositPrice = getPriceFromSqrtPriceX96(
    BigNumber.from(depositedRaw.avgSqrtPriceX96.toFixed(0)),
    token0,
    token1
  )

  const withdrawnRaw = await getWithdrawn(
    provider,
    BigNumber.from(positionId),
    pool,
    chainId
  )
  const withdrawn = getCurrencyAmounts(
    token0,
    withdrawnRaw.amount0,
    token1,
    withdrawnRaw.amount1
  )
  const avgWithdrawnPrice = withdrawnRaw.avgSqrtPriceX96
    ? getPriceFromSqrtPriceX96(
        BigNumber.from(withdrawnRaw.avgSqrtPriceX96.toFixed(0)),
        token0,
        token1
      )
    : undefined

  const collectedRaw = await getCollected(
    provider,
    BigNumber.from(positionId),
    pool,
    position.tickLower,
    position.tickUpper,
    chainId
  )
  const collected = getCurrencyAmounts(
    token0,
    collectedRaw.amount0,
    token1,
    collectedRaw.amount1
  )
  const avgCollectedPrice = collectedRaw.avgSqrtPriceX96
    ? getPriceFromSqrtPriceX96(
        BigNumber.from(collectedRaw.avgSqrtPriceX96.toFixed(0)),
        token0,
        token1
      )
    : undefined

  const totalYield = collected.map((v, i) => v.add(uncollected[i]))
  const avgYieldPrice = (() => {
    if (!avgCollectedPrice) {
      return currentPrice
    }

    const collectedQuoteAmount = toQuoteCurrencyAmount(
      collected,
      avgCollectedPrice
    )
    const uncollectedQuoteAmount = toQuoteCurrencyAmount(
      uncollected,
      currentPrice
    )
    const totalQuoteAmount = collectedQuoteAmount.add(uncollectedQuoteAmount)
    const priceFrac = avgCollectedPrice.asFraction
      .multiply(collectedQuoteAmount)
      .add(currentPrice.asFraction.multiply(uncollectedQuoteAmount))
      .divide(totalQuoteAmount)

    return new Price(
      avgCollectedPrice.baseCurrency,
      avgCollectedPrice.quoteCurrency,
      priceFrac.denominator,
      priceFrac.numerator
    )
  })()
  const durationPositionHeld = (() => {
    const endDate = withdrawnRaw.dateLastWithdrawn || new Date()
    const duration = endDate.getTime() - depositedRaw.dateFirstDeposited.getTime()
    // Make sure duration is at least one day to avoid extremely high yields
    return duration <= 0 ? 86_400_000 : duration
  })()
  
  // Calculate yield per day with safety check
  const yieldPerDay = totalYield.map((v) => {
    try {
      return v.multiply(86_400_000).divide(durationPositionHeld)
    } catch (error) {
      console.error('Error calculating yieldPerDay:', error)
      return CurrencyAmount.fromRawAmount(v.currency, 0)
    }
  })

  // Calculate APR with safety checks for division by zero
  const apr = yieldPerDay.map((v, i) => {
    // Check if deposit is zero or extremely small
    if (deposited[i].equalTo(CurrencyAmount.fromRawAmount(deposited[i].currency, 0)) || 
        deposited[i].lessThan(CurrencyAmount.fromRawAmount(deposited[i].currency, 1))) {
      console.log(`Skipping APR calculation for zero or near-zero deposit at index ${i}`);
      return new Fraction(0, 1);
    }
    try {
      return v.divide(deposited[i]).multiply(365).asFraction;
    } catch (error) {
      console.error(`Error calculating APR at index ${i}:`, error);
      return new Fraction(0, 1);
    }
  })
  
  // Calculate impermanent loss at the range boundaries
  console.log('Calculating impermanent loss for range boundaries...')
  const impermanentLossLower = calculateImpermanentLoss(avgDepositPrice, lowerTickPrice)
  const impermanentLossUpper = calculateImpermanentLoss(avgDepositPrice, upperTickPrice)
  
  // Get deposited value in quote currency for break-even calculations
  const depositedQuoteAmount = toQuoteCurrencyAmount(deposited, avgDepositPrice)
  const yieldPerDayQuoteAmount = toQuoteCurrencyAmount(yieldPerDay, avgYieldPrice)
  
  // Calculate break-even days for both range boundaries
  console.log('Calculating break-even days for impermanent loss...')
  const breakEvenDaysLower = calculateBreakEvenDays(
    impermanentLossLower,
    yieldPerDayQuoteAmount,
    depositedQuoteAmount
  )
  
  const breakEvenDaysUpper = calculateBreakEvenDays(
    impermanentLossUpper,
    yieldPerDayQuoteAmount,
    depositedQuoteAmount
  )
  
  console.log(`IL Lower: ${impermanentLossLower.multiply(100).toFixed(2)}%, Break-even: ${breakEvenDaysLower.toFixed(2)} days`)
  console.log(`IL Upper: ${impermanentLossUpper.multiply(100).toFixed(2)}%, Break-even: ${breakEvenDaysUpper.toFixed(2)} days`)

  const result = {
    positionId: BigNumber.from(positionId),
    lowerTickPrice,
    upperTickPrice,
    currentPrice,
    uncollected,
    current,
    deposited,
    avgDepositPrice,
    withdrawn,
    avgWithdrawnPrice,
    collected,
    avgCollectedPrice,
    dateOpened: depositedRaw.dateFirstDeposited,
    dateClosed: withdrawnRaw.dateLastWithdrawn,
    totalYield,
    avgYieldPrice,
    durationPositionHeld,
    yieldPerDay,
    apr,
    // New impermanent loss metrics
    impermanentLossLower,
    impermanentLossUpper,
    breakEvenDaysLower,
    breakEvenDaysUpper,
  };
  console.log('Successfully completed getLiquidityPositionStats');
  return result;
  } catch (error) {
    console.error(`Error in getLiquidityPositionStats for chain ${chainId}:`, error);
    
    // If it's specifically a division by zero error, provide a more helpful error message
    if (error instanceof Error && error.message.includes('Division by zero')) {
      console.error('This appears to be a division by zero error, likely caused by a position with no deposits or very small deposits');
      
      // You could potentially return a partial result with zeroed out calculations
      // This is optional and depends on your application's needs
      throw new Error(`Position calculation failed: Division by zero error when calculating position statistics. The position may have no deposits or very small deposits. Original error: ${error.message}`);
    }
    
    throw error;
  }
}

// Import the caching middleware
import { initializeCachedFunctions, getCachedLiquidityPositionStats } from './db/middleware';

// Initialize the cached version with the original function
initializeCachedFunctions(getLiquidityPositionStats);

// Export the cached version as the default
export { getCachedLiquidityPositionStats as getPositionStatsWithCache };
