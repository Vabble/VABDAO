// Defining bytecode and abi from original contract on mainnet to ensure bytecode matches and it produces the same pair code hash

module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { CONFIG } = require('../scripts/utils');

  await deploy('UniHelper', {
    from: deployer,
    args: [
      CONFIG.uniswap.factory,
      CONFIG.uniswap.router, 
      CONFIG.usdcAdress
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: true,
  });
};

module.exports.id = 'deploy_uni_helper'
module.exports.tags = ['UniHelper'];
