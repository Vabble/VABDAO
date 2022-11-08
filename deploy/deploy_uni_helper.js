module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { CONFIG, NETWORK } = require('../scripts/utils');

  if(NETWORK == 'mumbai') {
    this.uniswapFactory = CONFIG.mumbai.uniswap.factory
    this.uniswapRouter = CONFIG.mumbai.uniswap.router
    this.sushiswapFactory = CONFIG.mumbai.sushiswap.factory
    this.sushiswapRouter = CONFIG.mumbai.sushiswap.router
  } else if(NETWORK == 'ethereum') {
    this.uniswapFactory = CONFIG.mumbai.uniswap.factory
    this.uniswapRouter = CONFIG.mumbai.uniswap.router
    this.sushiswapFactory = CONFIG.mumbai.sushiswap.factory
    this.sushiswapRouter = CONFIG.mumbai.sushiswap.router
  } else if(NETWORK == 'polygon') {
    this.uniswapFactory = CONFIG.mumbai.uniswap.factory
    this.uniswapRouter = CONFIG.mumbai.uniswap.router
    this.sushiswapFactory = CONFIG.mumbai.sushiswap.factory
    this.sushiswapRouter = CONFIG.mumbai.sushiswap.router
  }

  await deploy('UniHelper', {
    from: deployer,
    args: [
      this.uniswapFactory,
      this.uniswapRouter,
      this.sushiswapFactory,
      this.sushiswapRouter
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  });
};

module.exports.id = 'deploy_uni_helper'
module.exports.tags = ['UniHelper'];
