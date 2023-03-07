module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  this.Ownablee = await deployments.get('Ownablee');  
  this.UniHelper = await deployments.get('UniHelper');
  
  // this.VabbleDAO = await deployments.get('VabbleDAO');
  // this.VabbleFunding = await deployments.get('VabbleFunding');
  // this.StakingPool = await deployments.get('StakingPool');
  // this.Property = await deployments.get('Property');

  const deployContract = await deploy('FactoryFilmNFT', {
    from: deployer,
    args: [
      this.Ownablee.address,
      this.UniHelper.address
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  }); 
  
  // const contract = await ethers.getContractAt('FactoryFilmNFT', deployContract.address)
  // await (await contract.initializeFactory(
  //   this.VabbleDAO.address, this.VabbleFunding.address, this.StakingPool.address, this.Property.address)
  // ).wait();
};

module.exports.id = 'deploy_factory_film_nft'
module.exports.tags = ['FactoryFilmNFT'];
module.exports.dependencies = ['Ownablee', 'UniHelper'];
