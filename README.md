# Uniswap V3 Stats Viewer

A static web page that lets you view stats on your Uniswap V3 liquidity position on multiple networks.

Available at: https://matthiasgeihs.github.io/uniswap-stats/

## Features

- View detailed statistics for your Uniswap V3 positions
- Support for multiple networks:
  - Base
  - Ethereum Mainnet
- Calculate APR, yield, and other key metrics
- Browser-compatible configuration with fallbacks

> __Note__ that this doesn't use an indexer service (yet) and instead builds an index itself.
> The first run will take a while, depending on the number of transactions of the position owner's account.
> The index will be cached so the next update should be much quicker.
> You can see the progress on the console.

## Database Persistence

The application now features a MongoDB database for persistent storage of position data:

- Position information is cached in-memory and stored in MongoDB
- Historical metrics are tracked over time
- Database is configured using Docker for easy setup

### Setup with Docker

1. Make sure Docker and Docker Compose are installed on your system
2. Run the database container:
   ```bash
   docker-compose up -d mongodb
   ```
3. The MongoDB instance will be available at `mongodb://localhost:27017`
4. Default credentials are:
   - Username: `admin`
   - Password: `password`
   - Database: `uniswap_stats`

### Configuration

#### Frontend Configuration

The frontend application uses hardcoded configuration values for browser compatibility. These values are defined in `src/libs/config.ts` and include:

- RPC URLs for Ethereum and Base networks
- Contract addresses for pool factories and position managers
- Default chain selection
- Database and cache settings

If you need to customize these values for your production deployment, modify the constants directly in `src/libs/config.ts`.

#### Backend Configuration (Server Mode)

If running in server mode with Node.js, you can create a `.env` file in the root directory based on the provided `.env.example` template:

```bash
# Copy the example file
cp .env.example .env

# Edit with your own values
vim .env  # or use any editor of your choice
```

The `.env` file includes the following variables:

```
# RPC URLs (add your own API keys)
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
BASE_RPC_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_COINBASE_KEY

# Contract Addresses (defaults provided, but can be customized)
ETHEREUM_POOL_FACTORY_ADDRESS=0x1F98431c8aD98523631AE4a59f267346ea31F984
ETHEREUM_POSITION_MANAGER_ADDRESS=0xC36442b4a4522E871399CD717aBDD847Ab11FE88
BASE_POOL_FACTORY_ADDRESS=0x33128a8fC17869897dcE68Ed026d694621f6FDfD
BASE_POSITION_MANAGER_ADDRESS=0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1

# MongoDB Connection
MONGO_URI=mongodb://admin:password@localhost:27017/uniswap_stats?authSource=admin

# Cache settings
CACHE_TTL=3600  # Time to live in seconds (1 hour)
CACHE_CHECK_PERIOD=600  # Check for expired cache entries every 10 minutes
USE_DB_CACHE=true  # Whether to use database for cache persistence

# Default Chain (ethereum or base)
DEFAULT_CHAIN=ethereum
```

> **NOTE**: The environment variables are used only for server-side configuration. Browser-based code uses the hardcoded values in `config.ts` for compatibility reasons, as `process.env` is not available in browser environments.

> **IMPORTANT**: Never commit your `.env` file to git. It's already added to `.gitignore` to prevent accidental commits.
