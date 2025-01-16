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
const privateKey = process.env.DEPLOY_PRIVATE_KEY;
const BUYER_PRIVATE_KEY = process.env.BUYER_PRIVATE_KEY;
const coinmarketcap_api_key = process.env.COINMARKETCAP_API_KEY;

const chainIds = {
  hardhat: 31337,
  mainnet: 1,
  baseSepolia: 84532,
  base: 8453,
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
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${alchemy_key}`,
      accounts: [privateKey],
      chainId: chainIds.mainnet,
      live: true,
      saveDeployments: true,
    },
    baseSepolia: {
      url: "https://sepolia.base.org/",
      chainId: chainIds.baseSepolia,
      accounts: BUYER_PRIVATE_KEY ? [privateKey, BUYER_PRIVATE_KEY] : [privateKey],
      live: false,
      saveDeployments: true,
    },
    base: {
      url: "https://mainnet.base.org",
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
