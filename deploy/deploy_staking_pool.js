module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  this.Ownablee = await deployments.get('Ownablee');  

  this.VabbleDAO = await deployments.get('VabbleDAO');
  this.VabbleFunding = await deployments.get('VabbleFunding');
  this.Property = await deployments.get('Property');
  this.Vote = await deployments.get('Vote');

  const deployContract = await deploy('StakingPool', {
    from: deployer,
    args: [
      this.Ownablee.address
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  });

  const contract = await ethers.getContractAt('StakingPool', deployContract.address)
  await (await contract.initializePool(
    this.VabbleDAO.address, this.VabbleFunding.address, this.Property.address, this.Vote.address)
  ).wait();

};

module.exports.id = 'deploy_staking_pool'
module.exports.tags = ['StakingPool'];
module.exports.dependencies = ['Ownablee'];
