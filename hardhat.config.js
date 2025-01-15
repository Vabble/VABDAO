require('dotenv').config();
require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-verify");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("@nomicfoundation/hardhat-network-helpers");

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();
  for (const account of accounts) {
    console.log(account.address);
  }
});

console.log("Hardhat config Network: ", process.env.NETWORK);

const alchemy_key = process.env.ALCHEMY_KEY;
const mnemonic = process.env.MNEMONIC;
const privateKey = process.env.DEPLOY_PRIVATE_KEY;
const BUYER_PRIVATE_KEY = process.env.BUYER_PRIVATE_KEY;
const coinmarketcap_api_key = process.env.COINMARKETCAP_API_KEY;

const chainIds = {
  ganache: 1337,
  goerli: 5,
  hardhat: 31337,
  kovan: 42,
  mainnet: 1,
  rinkeby: 4,
  ropsten: 3,
  bscTest: 97,
  bscMain: 56,
  mumbai: 80001,
  amoy: 80002,
  baseSepolia: 84532,
  base: 8453,
  matic: 137,
  fuji: 43113,
  avax: 43114,
};

if (!privateKey) {
  throw new Error("Please set your DEPLOY_PRIVATE_KEY in a .env file");
}

module.exports = {
  defaultNetwork: "hardhat",
  gasReporter: {
    coinmarketcap: coinmarketcap_api_key,
    currency: "USD",
    enabled: false,
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
      chainId: chainIds.hardhat,
      blockGasLimit: 3245000000,
    },
    // Base networks
    baseSepolia: {
      url: "https://sepolia.base.org/",
      chainId: chainIds.baseSepolia,
      accounts: BUYER_PRIVATE_KEY ? [privateKey, BUYER_PRIVATE_KEY] : [privateKey],
      live: false,
      saveDeployments: true,
      gasPrice: 22500000000,
      gasMultiplier: 2,
    },
    base: {
      url: "https://mainnet.base.org",
      chainId: chainIds.base,
      accounts: [privateKey],
      live: true,
      saveDeployments: true,
    },
    // Other networks from original config
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${alchemy_key}`,
      accounts: [privateKey],
      chainId: chainIds.mainnet,
      live: false,
      saveDeployments: true,
    },
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${alchemy_key}`,
      accounts: [privateKey],
      chainId: chainIds.goerli,
      live: false,
      saveDeployments: true,
      tags: ["staging"],
      gasPrice: 5000000000,
      gasMultiplier: 2,
    },
    bscTest: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: chainIds.bscTest,
      accounts: [privateKey],
      live: true,
      saveDeployments: true,
      gasMultiplier: 2,
    },
    bscMain: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: chainIds.bscMain,
      accounts: [privateKey],
      live: true,
      saveDeployments: true,
    },
    mumbai: {
      url: "https://polygon-mumbai.g.alchemy.com/v2/MS1xXvCUQzKUdIBnUrKZpdx26AHMixO4",
      chainId: chainIds.mumbai,
      accounts: [privateKey],
      live: false,
      saveDeployments: true,
      gasPrice: 22500000000,
      gasMultiplier: 2,
    },
    polygonAmoy: {
      url: "https://rpc-amoy.polygon.technology/",
      chainId: chainIds.amoy,
      accounts: [privateKey],
      live: false,
      saveDeployments: true,
      gasPrice: 22500000000,
      gasMultiplier: 2,
    },
    matic: {
      url: "https://polygon-rpc.com",
      chainId: chainIds.matic,
      accounts: [privateKey],
      live: true,
      saveDeployments: true,
    },
    fuji: {
      url: "https://api.avax-test.network/ext/C/rpc",
      gasPrice: 225000000000,
      chainId: chainIds.fuji,
      accounts: [privateKey],
    },
    avax: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      gasPrice: 225000000000,
      chainId: chainIds.avax,
      accounts: {
        mnemonic,
      },
      live: true,
      saveDeployments: true,
    },
  },
  etherscan: {
    apiKey: process.env.BASE_SCAN_API_KEY || "",
    customChains: [
      {
        network: "baseSepolia",
        chainId: chainIds.baseSepolia,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "base",
        chainId: chainIds.base,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "polygonAmoy",
        chainId: chainIds.amoy,
        urls: {
          apiURL: "https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/AMOY_TESTNET",
          browserURL: "https://www.oklink.com/amoy",
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
  paths: {
    deploy: "deploy",
    deployments: "deployments",
    sources: "contracts",
    tests: "test",
  },
  mocha: {
    timeout: 200e10,
  },
  solidity: {
    compilers: [
      {
        version: "0.8.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
};
