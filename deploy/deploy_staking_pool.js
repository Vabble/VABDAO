module.exports = async function ({ getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  this.Ownablee = await deployments.get('Ownablee');  

  const deployContract = await deploy('StakingPool', {
    from: deployer,
    args: [
      this.Ownablee.address
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  });
};

module.exports.id = 'deploy_staking_pool'
module.exports.tags = ['StakingPool'];
module.exports.dependencies = ['Ownablee'];
