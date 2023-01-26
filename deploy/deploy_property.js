module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  
  this.Ownablee = await deployments.get('Ownablee');  
  this.UniHelper = await deployments.get('UniHelper');
  this.Vote = await deployments.get('Vote');
  this.StakingPool = await deployments.get('StakingPool');
  
  await deploy('Property', {
    from: deployer,
    args: [
      this.Ownablee.address,
      this.UniHelper.address,   // UniHelper contract
      this.Vote.address,        // Vote contract
      this.StakingPool.address, // StakingPool contract
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  });
};

module.exports.id = 'deploy_property'
module.exports.tags = ['Property'];
module.exports.dependencies = ['Ownablee', 'UniHelper', 'Vote', 'StakingPool'];
