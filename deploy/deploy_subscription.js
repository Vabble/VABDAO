module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  
  this.Ownablee = await deployments.get('Ownablee');
  this.UniHelper = await deployments.get('UniHelper');
  this.Property = await deployments.get('Property');
  
  await deploy('Subscription', {
    from: deployer,
    args: [
      this.Ownablee.address,
      this.UniHelper.address,   // UniHelper contract
      this.Property.address     // Property contract
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  });  
};

module.exports.id = 'deploy_subscription'
module.exports.tags = ['Subscription'];
module.exports.dependencies = ['Ownablee', 'UniHelper', 'Property'];
