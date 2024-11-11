require('dotenv').config();
require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-verify"); // Only use this verification plugin

const mnemonic = process.env.MNEMONIC;
const privateKey = process.env.DEPLOY_PRIVATE_KEY;
const BUYER_PRIVATE_KEY = process.env.BUYER_PRIVATE_KEY;

const chainIds = {
  hardhat: 1337,
  baseSepolia: 84532,
  base: 8453,
};

module.exports = {
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
  networks: {
    hardhat: {
      chainId: 1337,
    },
    baseSepolia: {
      url: "https://sepolia.base.org/",
      chainId: chainIds.baseSepolia,
      accounts: [privateKey, BUYER_PRIVATE_KEY],
      live: false,
      saveDeployments: true,
      gasPrice: 22500000000,
      gasMultiplier: 2,
    },
    base: {
      url: `https://mainnet.base.org`,
      chainId: chainIds.base,
      accounts: [privateKey],
      live: true,
      saveDeployments: true,
    },
  },
  etherscan: {
    apiKey: process.env.BASE_SCAN_API_KEY || "",
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
    ],
  },
  sourcify: {
    enabled: false
  },
  paths: {
    deploy: "deploy",
    deployments: "deployments",
    sources: "contracts",
    tests: "test"
  },
};