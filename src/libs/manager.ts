import { BigNumber, BigNumberish, ethers, providers } from 'ethers'
import { CHAINS, DEFAULT_CHAIN } from './config'
import INonFungiblePositionManager from '@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json'
import { LiquidityPosition } from './types'

export class LiquidityPositionManager {
  contract: ethers.Contract

  constructor(provider: providers.Provider, chainId: string = DEFAULT_CHAIN) {
    console.log(`Creating LiquidityPositionManager for chain: ${chainId}`);
    const chainConfig = CHAINS[chainId]
    if (!chainConfig) {
      throw new Error(`Chain configuration not found for chain ID: ${chainId}`)
    }
    console.log(`Using position manager address: ${chainConfig.positionManagerAddress}`);

    this.contract = new ethers.Contract(
      chainConfig.positionManagerAddress,
      INonFungiblePositionManager.abi,
      provider
    )
  }

  async getLiquidityPosition(
    positionId: BigNumberish
  ): Promise<LiquidityPosition> {
    console.log(`Getting position: ${positionId}`);
    try {
      // Skip the ownerOf check since it might not be reliable across all networks
      // Instead, directly try to get the position data and handle any errors there
      
      // Try to get the position details directly
      try {
        const position = await this.contract.positions(positionId);
        console.log(`Position found, token0: ${position.token0}, token1: ${position.token1}`);
        return position;
      } catch (positionError) {
        console.error(`Error retrieving position ${positionId} data:`, positionError);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const error: any = new Error(`Position ID ${positionId} data cannot be retrieved on this network`);
        error.code = 'POSITION_DATA_ERROR';
        throw error;
      }
    } catch (error) {
      console.error(`Error getting position ${positionId}:`, error);
      throw error;
    }
  }

  async getUncollected(positionId: BigNumberish): Promise<{
    amount0: BigNumber
    amount1: BigNumber
  }> {
    const maxAmount = BigNumber.from(2).pow(128).sub(1)
    return this.contract.callStatic.collect([
      positionId,
      ethers.constants.AddressZero,
      maxAmount,
      maxAmount,
    ])
  }

  async ownerOf(positionId: BigNumberish): Promise<string> {
    try {
      return await this.contract.ownerOf(positionId)
    } catch (error) {
      console.error(`Error checking ownership for position ${positionId}:`, error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customError: any = new Error(`Position ID ${positionId} does not exist on this network`);
      customError.code = 'POSITION_NOT_FOUND';
      throw customError;
    }
  }
}
