module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  this.Ownablee = await deployments.get('Ownablee');  
  this.UniHelper = await deployments.get('UniHelper');

  await deploy('FactorySubNFT', {
    from: deployer,
    args: [
      this.Ownablee.address,
      this.UniHelper.address
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  }); 
};

module.exports.id = 'deploy_factory_sub_nft'
module.exports.tags = ['FactorySubNFT'];
module.exports.dependencies = ['Ownablee', 'UniHelper'];
