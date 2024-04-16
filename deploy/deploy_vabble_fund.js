module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  
  this.Ownablee = await deployments.get('Ownablee');
  this.UniHelper = await deployments.get('UniHelper');
  this.StakingPool = await deployments.get('StakingPool');
  this.Property = await deployments.get('Property');
  this.FilmNFTFactory = await deployments.get('FactoryFilmNFT');
  
  await deploy('VabbleFund', {
    from: deployer,
    args: [
      this.Ownablee.address,      // Ownablee contract
      this.UniHelper.address,     // UniHelper contract
      this.StakingPool.address,   // StakingPool contract
      this.Property.address,      // Property contract
      this.FilmNFTFactory.address // film NFT Factory contract
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  });  
};

module.exports.id = 'deploy_vabble_fund'
module.exports.tags = ['VabbleFund', 'Deploy'];
module.exports.dependencies = ['Ownablee', 'UniHelper', 'StakingPool', 'Property', 'FactoryFilmNFT'];
