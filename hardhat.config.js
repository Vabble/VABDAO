const { utils } = require("ethers");

require("@nomiclabs/hardhat-waffle");
require("hardhat-deploy");
require("hardhat-deploy-ethers");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter")
require('dotenv').config();

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for(const account of accounts) {
    console.log(account.address);
  }
});

const alchemy_key = process.env.ALCHEMY_KEY;
const etherScan_api_key = process.env.ETHER_SCAN_API_KEY;
const bscScan_api_key = process.env.BSC_SCAN_API_KEY;
const polyScan_api_key = process.env.POLYGON_SCAN_API_KEY;
const avaxScan_api_key = process.env.AVAX_SCAN_API_KEY;

const mnemonic = process.env.MNEMONIC;
const coinmarketcap_api_key = process.env.COINMARKETCAP_API_KEY;

const chainIds = {
  ganache: 1337,
  goerli: 5,
  hardhat: 31337,
  kovan: 42,
  mainnet: 1,
  rinkeby: 4,
  ropsten: 3,
  bscTest: 97,   // BSC testnet
  bscMain: 56,   // BSC mainnet
  mumbai: 80001, // Polygon testnet
  matic: 137,    // Polygon mainnet
  fuji: 43113,   // Avalance testnet
  avax: 43114,   // Avalance mainnet
};
if (!mnemonic || !alchemy_key) {
  throw new Error("Please set your data in a .env file");
}

module.exports = {
  defaultNetwork: 'hardhat',
  gasReporter: {
    coinmarketcap: coinmarketcap_api_key,
    currency: "USD",
    enabled: false
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    dev: {
      default: 1,
    },
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      chainId: chainIds.mumbai,
      saveDeployments: true,
      forking: {
        // url: `https://eth-goerli.alchemyapi.io/v2/${alchemy_key}`,
        // blockNumber: 11328709,
        url: `https://polygon-mumbai.g.alchemy.com/v2/${alchemy_key}`
      },
      accounts: {
        mnemonic,
      },      
      // gasPrice: 22500000000,
      gasMultiplier: 2,
      // throwOnTransactionFailures: true,
      // blockGasLimit: 1245000000 
    },
    // Ethereum mainnet
    mainnet: { 
      url: `https://eth-mainnet.alchemyapi.io/v2/${alchemy_key}`,
      accounts: {
        mnemonic,
      },
      chainId: chainIds.mainnet,
      live: false,
      saveDeployments: true
    },
    // Ethereum testnet(Goerli)
    goerli: { 
      url: `https://eth-goerli.alchemyapi.io/v2/${alchemy_key}`,
      accounts: {
        mnemonic,
      },
      chainId: chainIds.goerli,
      live: false,
      saveDeployments: true,
      tags: ["staging"],
      gasPrice: 5000000000,
      gasMultiplier: 2,
    },
    // BSC testnet
    bscTest: { 
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: chainIds.bscTest,
      accounts: {
        mnemonic,
      },
      live: true,
      saveDeployments: true,
      gasMultiplier: 2,
    },
    // BSC mainnet
    bscMain: { 
      url: "https://bsc-dataseed.binance.org/",
      chainId: chainIds.bscMain,
      accounts: {
        mnemonic,
      },
      live: true,
      saveDeployments: true
    },
    // Polygon testnet
    mumbai: { 
      url: "https://rpc-mumbai.maticvigil.com",
      chainId: chainIds.mumbai,
      accounts: {
        mnemonic,
      },
      live: false,
      saveDeployments: true,
      gasPrice: 22500000000,
      gasMultiplier: 2,
    },
    // Polygon mainnet
    matic: { 
      url: "https://polygon-rpc.com",
      chainId: chainIds.matic,
      accounts: {
        mnemonic,
      },
      live: true,
      saveDeployments: true
    },
    // Avalance testnet(Fuji: C-Chain)
    fuji: { 
      url: "https://api.avax-test.network/ext/C/rpc",
      gasPrice: 225000000000,
      chainId: chainIds.fuji,
      accounts: {
        mnemonic,
      },
    },
    // Avalance mainnet
    avax: { 
      url: "https://api.avax.network/ext/bc/C/rpc",
      gasPrice: 225000000000,
      chainId: chainIds.avax,
      accounts: {
        mnemonic,
      },
      live: true,
      saveDeployments: true
    },
  },
  etherscan: {
    // apiKey: etherScan_api_key
    // apiKey: bscScan_api_key    
    apiKey: polyScan_api_key
    // apiKey: avaxScan_api_key 
  },
  paths: {
    deploy: "deploy",
    deployments: "deployments",
    sources: "contracts",
    tests: "test"
  },
  mocha: {
    timeout: 200e3
  },
  solidity: {
    compilers: [
      {
        version: '0.8.4',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },        
      },
    ],
  }
};
