module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { getConfig } = require('../scripts/utils');

  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;
  const {uniswap, sushiswap} = getConfig(chainId);

  console.log("------------- UniHelper Deployment -----------------");
  console.log({uniswap, sushiswap});

  this.Ownablee = await deployments.get('Ownablee');

  await deploy('UniHelper', {
    from: deployer,
    args: [
      uniswap.factory,
      uniswap.router,
      sushiswap.factory,
      sushiswap.router,
      this.Ownablee.address
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  });
};

module.exports.id = 'deploy_uni_helper'
module.exports.tags = ['UniHelper'];
module.exports.dependencies = ['Ownablee'];
