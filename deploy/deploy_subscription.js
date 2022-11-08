module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { CONFIG, NETWORK } = require('../scripts/utils');
  
  this.UniHelper = await deployments.get('UniHelper');
  this.Property = await deployments.get('Property');
  this.VabbleDAO = await deployments.get('VabbleDAO');
  this.Ownablee = await deployments.get('Ownablee');
  
  await deploy('Subscription', {
    from: deployer,
    args: [
      this.Ownablee.address,
      this.UniHelper.address,   // UniHelper contract
      this.Property.address,    // Property contract
      this.VabbleDAO.address,   // VabbleDAO contract
      CONFIG.daoWalletAddress
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  });  
};

module.exports.id = 'deploy_subscription'
module.exports.tags = ['Subscription'];
module.exports.dependencies = ['Ownablee', 'UniHelper', 'Property', 'VabbleDAO'];
