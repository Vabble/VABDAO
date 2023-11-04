module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { CONFIG, NETWORK } = require('../scripts/utils');
  
  this.Ownablee = await deployments.get('Ownablee');
  this.UniHelper = await deployments.get('UniHelper');
  this.Vote = await deployments.get('Vote');
  this.StakingPool = await deployments.get('StakingPool');
  this.Property = await deployments.get('Property');
  this.VabbleFund = await deployments.get('VabbleFund');
  
  await deploy('VabbleDAO', {
    from: deployer,
    args: [
      this.Ownablee.address,      // Ownablee contract
      this.UniHelper.address,     // UniHelper contract
      this.Vote.address,          // Vote contract
      this.StakingPool.address,   // StakingPool contract
      this.Property.address,      // Property contract
      this.VabbleFund.address     // VabbleFund contract
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  });  
};

module.exports.id = 'deploy_vabble_dao'
module.exports.tags = ['VabbleDAO'];
module.exports.dependencies = ['Ownablee', 'UniHelper', 'Vote', 'StakingPool', 'Property', 'VabbleFund'];
