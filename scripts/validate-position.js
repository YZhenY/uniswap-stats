const { ethers } = require('ethers');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Import the necessary contract ABI
const INonFungiblePositionManager = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json');

// Define chain configurations from your project
const CHAINS = {
  base: {
    name: 'Base',
    rpcUrl: 'https://api.developer.coinbase.com/rpc/v1/base/E23ov1FDMyEGPVjPItiKV5DlQIHEFWr6',
    positionManagerAddress: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
  },
  ethereum: {
    name: 'Ethereum',
    rpcUrl: 'https://blockchain.googleapis.com/v1/projects/tidy-gravity-386108/locations/asia-east1/endpoints/ethereum-mainnet/rpc?key=AIzaSyCAJf_X_coik3gf3tpxHw0ANb4DabNmOcI',
    positionManagerAddress: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  },
};

// Position IDs to check on each network
const positionIds = {
  ethereum: 940144,
  base: 2172112
};

// Function to get position details
async function checkPosition(chainId) {
  const positionId = positionIds[chainId];
  console.log(`\nChecking position ${positionId} on ${CHAINS[chainId].name}...`);
  
  try {
    // Create provider
    const provider = new ethers.providers.JsonRpcProvider(CHAINS[chainId].rpcUrl);
    
    // Create contract instance
    const contract = new ethers.Contract(
      CHAINS[chainId].positionManagerAddress,
      INonFungiblePositionManager.abi,
      provider
    );
    
    // First check if the position exists by calling ownerOf
    try {
      const owner = await contract.ownerOf(positionId);
      console.log(`Position exists! Owner: ${owner}`);
    } catch (error) {
      console.error(`Position doesn't exist or error checking ownership:`, error.message);
      return;
    }
    
    // Get position details
    try {
      const position = await contract.positions(positionId);
      console.log('Position details:');
      console.log('- Token0:', position.token0);
      console.log('- Token1:', position.token1);
      console.log('- Fee:', position.fee.toString());
      console.log('- Tick Lower:', position.tickLower.toString());
      console.log('- Tick Upper:', position.tickUpper.toString());
      console.log('- Liquidity:', position.liquidity.toString());
    } catch (error) {
      console.error(`Error getting position details:`, error.message);
    }
  } catch (error) {
    console.error(`Error connecting to ${CHAINS[chainId].name}:`, error.message);
  }
}

// Run checks for both networks
async function main() {
  console.log(`Validating position IDs: Ethereum=${positionIds.ethereum}, Base=${positionIds.base}`);
  
  await checkPosition('ethereum');
  await checkPosition('base');
}

main().catch(error => {
  console.error('Unhandled error:', error);
});
