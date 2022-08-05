module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { CONFIG } = require('../scripts/utils');

  await deploy('UniHelper', {
    from: deployer,
    args: [
      CONFIG.uniswap.factory,
      CONFIG.uniswap.router
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  });
};

module.exports.id = 'deploy_uni_helper'
module.exports.tags = ['UniHelper'];
