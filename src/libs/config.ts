// For browser environments, we need to use hard-coded defaults or window.ENV if available
export interface ChainConfig {
  name: string
  rpcUrl: string
  poolFactoryAddress: string
  positionManagerAddress: string
}

// Default values - these should match your .env.example file
const ETHEREUM_RPC_URL = 'https://mainnet.infura.io/v3/bed3d13c6bb948b99430721f466e6101';
const BASE_RPC_URL = 'https://api.developer.coinbase.com/rpc/v1/base/E23ov1FDMyEGPVjPItiKV5DlQIHEFWr6';
const ETHEREUM_POOL_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const ETHEREUM_POSITION_MANAGER_ADDRESS = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';
const BASE_POOL_FACTORY_ADDRESS = '0x33128a8fC17869897dcE68Ed026d694621f6FDfD';
const BASE_POSITION_MANAGER_ADDRESS = '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1';

export const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: 'Base',
    rpcUrl: BASE_RPC_URL,
    poolFactoryAddress: BASE_POOL_FACTORY_ADDRESS,
    positionManagerAddress: BASE_POSITION_MANAGER_ADDRESS,
  },
  ethereum: {
    name: 'Ethereum',
    rpcUrl: ETHEREUM_RPC_URL,
    poolFactoryAddress: ETHEREUM_POOL_FACTORY_ADDRESS,
    positionManagerAddress: ETHEREUM_POSITION_MANAGER_ADDRESS,
  },
}

// Default chain
export const DEFAULT_CHAIN = 'ethereum'

// Database config
export const DB_CONFIG = {
  enabled: true, // Enable by default
  uri: 'mongodb://admin:password@localhost:27017/uniswap_stats?authSource=admin',
}

// Cache config
export const CACHE_CONFIG = {
  ttl: 3600, // Default: 1 hour
  checkPeriod: 600, // Default: 10 minutes
  useDb: true, // Enable by default
}
