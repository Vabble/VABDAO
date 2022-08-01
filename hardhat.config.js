const { utils } = require("ethers");

require("@nomiclabs/hardhat-waffle");
require("hardhat-deploy");
require("hardhat-deploy-ethers");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter")
require('dotenv').config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for(const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
const alchemy_key = process.env.ALCHEMY_KEY;
const etherScan_api_key = process.env.ETHERSCAN_API_KEY;
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
  bscTest: 97,
  bscMain: 56
};
if (!mnemonic || !alchemy_key || !etherScan_api_key) {
  throw new Error("Please set your data in a .env file");
}
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
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
      chainId: chainIds.rinkeby,
      saveDeployments: true,
      forking: {
        url: `https://eth-rinkeby.alchemyapi.io/v2/${alchemy_key}`,
        blockNumber: 10908608,
      },
      gasPrice: "auto",
      accounts: {
        mnemonic,
      },
    },
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${alchemy_key}`,
      accounts: {
        mnemonic,
      },
      chainId: chainIds.mainnet,
      live: false,
      saveDeployments: true
    },
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${alchemy_key}`,
      accounts: {
        mnemonic,
      },
      chainId: chainIds.rinkeby,
      live: false,
      saveDeployments: true,
      tags: ["staging"],
      gasPrice: 5000000000,
      gasMultiplier: 2,
    },
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
    bscMain: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: chainIds.bscMain,
      accounts: {
        mnemonic,
      },
      live: true,
      saveDeployments: true
    }
  },
  etherscan: {
    apiKey: etherScan_api_key
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
        // evmVersion: "byzantium",
      },
      {
        version: '0.8.1',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
        // evmVersion: "byzantium",
      },
    ],
  }
};
