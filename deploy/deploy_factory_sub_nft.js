module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  this.Ownablee = await deployments.get('Ownablee');  

  await deploy('FactorySubNFT', {
    from: deployer,
    args: [
      this.Ownablee.address
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  }); 
};

module.exports.id = 'deploy_factory_sub_nft'
module.exports.tags = ['FactorySubNFT'];
module.exports.dependencies = ['Ownablee'];
