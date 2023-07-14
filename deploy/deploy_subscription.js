module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const { DISCOUNT } = require('../scripts/utils');
  this.Ownablee = await deployments.get('Ownablee');
  this.UniHelper = await deployments.get('UniHelper');
  this.Property = await deployments.get('Property');
  
  await deploy('Subscription', {
    from: deployer,
    args: [
      this.Ownablee.address,
      this.UniHelper.address,    // UniHelper contract
      this.Property.address,     // Property contract
      [DISCOUNT.month3, DISCOUNT.month6, DISCOUNT.month12] // 3 months => 11%, 6 months => 22%, 12 months => 25%
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  });  
};

module.exports.id = 'deploy_subscription'
module.exports.tags = ['Subscription'];
module.exports.dependencies = ['Ownablee', 'UniHelper', 'Property'];
