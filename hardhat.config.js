require('dotenv').config();
require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomiclabs/hardhat-ethers");

const mnemonic = process.env.MNEMONIC;
const privateKey = process.env.DEPLOY_PRIVATE_KEY;

const chainIds = {
  hardhat: 1337,      // Hardhat
  baseSepolia: 84532, // Base Sepolia testnet
  base: 8453,			    // Base mainnet
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
    // Hardhat
    hardhat: {
      chainId: 1337,
    },
    // Base Sepolia testnet
    baseSepolia: {
      url: "https://sepolia.base.org/",
      chainId: chainIds.baseSepolia,
      accounts: [
        privateKey
      ],
      live: false,
      saveDeployments: true,
      gasPrice: 22500000000,
      gasMultiplier: 2
    },
    // Base mainnet
    base: {
      url: `https://mainnet.base.org`,
      chainId: chainIds.base,
      accounts: [
        privateKey,
      ],
      live: true,
      saveDeployments: true
    },
  },
  paths: {
    deploy: "deploy",
    deployments: "deployments",
    sources: "contracts",
    tests: "test"
  },
};
