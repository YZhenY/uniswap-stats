import { providers } from 'ethers'
import { LiquidityPositionStats } from './types'
import { LiquidityPositionManager } from './manager'
import { PoolFactory } from './factory'
import { LiquidityPool } from './pool'
import {
  getCurrencyAmounts,
  getCurrentAmounts2,
  getPriceFromSqrtPriceX96,
  newTokenFromTokenAddress,
} from './util'
import { tickToPrice } from '@uniswap/v3-sdk'

export async function getLiquidityPositionStats(
  provider: providers.Provider,
  positionId: number
): Promise<LiquidityPositionStats> {
  const manager = new LiquidityPositionManager(provider)
  const position = await manager.getLiquidityPosition(positionId)
  const token0 = await newTokenFromTokenAddress(position.token0, provider)
  const token1 = await newTokenFromTokenAddress(position.token1, provider)

  const lowerTickPrice = tickToPrice(token0, token1, position.tickLower)
  const upperTickPrice = tickToPrice(token0, token1, position.tickUpper)

  const factory = new PoolFactory(provider)
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

  const current = getCurrentAmounts2(
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

  return {
    lowerTickPrice,
    upperTickPrice,
    currentPrice: currentPrice,
    uncollected: uncollected,
    current: current,
  }
}
