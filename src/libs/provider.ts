import { ethers, providers } from 'ethers'
import { CHAINS, DEFAULT_CHAIN } from './config'
import { CachedProvider } from './util/cache'

// Create a map to store cached providers for each chain
const providerCache: Record<string, CachedProvider> = {}

export function getProvider(
  chainId: string = DEFAULT_CHAIN
): providers.Provider {
  // Check if we already have a cached provider for this chain
  if (providerCache[chainId]) {
    return providerCache[chainId]
  }

  // Get the chain configuration
  const chainConfig = CHAINS[chainId]
  if (!chainConfig) {
    throw new Error(`Chain configuration not found for chain ID: ${chainId}`)
  }

  // Check for empty RPC URL
  if (!chainConfig.rpcUrl) {
    console.error(`RPC URL not configured for chain: ${chainId}. Using fallback.`)
    return new ethers.providers.JsonRpcProvider(
      chainId === 'ethereum' 
        ? 'https://mainnet.infura.io/v3/bed3d13c6bb948b99430721f466e6101'
        : 'https://api.developer.coinbase.com/rpc/v1/base/E23ov1FDMyEGPVjPItiKV5DlQIHEFWr6'
    )
  }

  // Create a new provider
  const provider = new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl)
  const cachedProvider = new CachedProvider(provider)

  // Load cache state from local storage.
  const localStorageCacheKey = `providerCache_${chainId}`
  const serializedCache = localStorage.getItem(localStorageCacheKey)
  if (serializedCache) {
    cachedProvider.deserializeCache(serializedCache)
  }

  // Save cache to local storage on cache update.
  let storeScheduled = false
  cachedProvider.onCacheUpdate(async () => {
    // Ensure pause between two store operations.
    const minDurationBetweenStores = 1000
    if (!storeScheduled) {
      storeScheduled = true
      setTimeout(() => {
        localStorage.setItem(
          localStorageCacheKey,
          cachedProvider.serializeCache()
        )
        storeScheduled = false
      }, minDurationBetweenStores)
    }
  })

  // Store the provider in the cache
  providerCache[chainId] = cachedProvider

  return cachedProvider
}
