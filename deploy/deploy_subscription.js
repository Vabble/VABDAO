module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { CONFIG } = require('../scripts/utils');
  
  this.UniHelper = await deployments.get('UniHelper');
  this.Property = await deployments.get('Property');
  this.VabbleDAO = await deployments.get('VabbleDAO');

  await deploy('Subscription', {
    from: deployer,
    args: [
      CONFIG.vabToken,          // mockVAB
      this.UniHelper.address,   // UniHelper contract
      this.Property.address,    // Property contract
      this.VabbleDAO.address,   // VabbleDAO contract
      CONFIG.usdcAdress,
      CONFIG.daoWalletAddress
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  });  
};

module.exports.id = 'deploy_subscription'
module.exports.tags = ['Subscription'];
module.exports.dependencies = ['UniHelper', 'Property', 'VabbleDAO'];
