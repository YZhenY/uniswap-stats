import { ethers, providers } from 'ethers'
import { CHAINS, DEFAULT_CHAIN } from './config'
import UniswapV3Factory from '@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json'

export class PoolFactory {
  contract: ethers.Contract

  constructor(provider: providers.Provider, chainId: string = DEFAULT_CHAIN) {
    console.log(`Creating PoolFactory for chain: ${chainId}`);
    const chainConfig = CHAINS[chainId]
    if (!chainConfig) {
      throw new Error(`Chain configuration not found for chain ID: ${chainId}`)
    }
    console.log(`Using pool factory address: ${chainConfig.poolFactoryAddress}`);

    this.contract = new ethers.Contract(
      chainConfig.poolFactoryAddress,
      UniswapV3Factory.abi,
      provider
    )
  }

  async getLiquidityPoolAddress(
    token0: string,
    token1: string,
    fee: number
  ): Promise<string> {
    console.log(`Getting pool address for tokens: ${token0}, ${token1}, fee: ${fee}`);
    try {
      const pool = await this.contract.getPool(token0, token1, fee);
      console.log(`Pool address: ${pool}`);
      return pool;
    } catch (error) {
      console.error('Error getting liquidity pool address:', error);
      throw error;
    }
  }
}
