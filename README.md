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
