const networkConfig = {
  default: {
    name: 'hardhat'
  },
  31337: {
    name: 'localhost'
  }
};

const developmentChains = ['hardhat', 'localhost'];
const VERIFICATION_BLOCK_CONFIRMATIONS = 6;

module.exports = {
  networkConfig,
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS
};
