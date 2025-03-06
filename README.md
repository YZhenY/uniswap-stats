# Uniswap V3 Stats Viewer

A static web page that lets you view stats on your Uniswap V3 liquidity position on multiple networks.

Available at: https://matthiasgeihs.github.io/uniswap-stats/

## Features

- View detailed statistics for your Uniswap V3 positions
- Support for multiple networks:
  - Base
  - Ethereum Mainnet
- Calculate APR, yield, and other key metrics

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

### Environment Configuration

Create a `.env` file in the root directory with the following variables:

```
# MongoDB Connection
MONGO_URI=mongodb://admin:password@localhost:27017/uniswap_stats?authSource=admin

# Cache settings
CACHE_TTL=3600  # Time to live in seconds (1 hour)
CACHE_CHECK_PERIOD=600  # Check for expired cache entries every 10 minutes
```
