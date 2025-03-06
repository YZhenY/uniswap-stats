export interface ChainConfig {
  name: string
  rpcUrl: string
  poolFactoryAddress: string
  positionManagerAddress: string
}

export const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: 'Base',
    rpcUrl:
      'https://api.developer.coinbase.com/rpc/v1/base/E23ov1FDMyEGPVjPItiKV5DlQIHEFWr6',
    poolFactoryAddress: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    positionManagerAddress: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
  },
  ethereum: {
    name: 'Ethereum',
    rpcUrl:
      'https://blockchain.googleapis.com/v1/projects/tidy-gravity-386108/locations/asia-east1/endpoints/ethereum-mainnet/rpc?key=AIzaSyCAJf_X_coik3gf3tpxHw0ANb4DabNmOcI', // Replace with your Ethereum RPC URL if you have one
    poolFactoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    positionManagerAddress: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  },
}

// Default chain
export const DEFAULT_CHAIN = 'base'
