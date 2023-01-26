module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  this.Ownablee = await deployments.get('Ownablee');  
  this.VabbleDAO = await deployments.get('VabbleDAO');
  this.VabbleFunding = await deployments.get('VabbleFunding');

  await deploy('FactoryTierNFT', {
    from: deployer,
    args: [
      this.Ownablee.address,
      this.VabbleDAO.address,
      this.VabbleFunding.address
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  }); 
};

module.exports.id = 'deploy_factory_tier_nft'
module.exports.tags = ['FactoryTierNFT'];
module.exports.dependencies = ['Ownablee', 'VabbleDAO', 'VabbleFunding'];
