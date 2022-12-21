module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { CONFIG, NETWORK } = require('../scripts/utils');
  
  this.Vote = await deployments.get('Vote');
  this.StakingPool = await deployments.get('StakingPool');
  this.UniHelper = await deployments.get('UniHelper');
  this.Property = await deployments.get('Property');
  this.Ownablee = await deployments.get('Ownablee');
  this.FilmNFTFactory = await deployments.get('FactoryFilmNFT');
  
  await deploy('VabbleDAO', {
    from: deployer,
    args: [
      this.Ownablee.address,      // Ownablee contract
      this.Vote.address,          // Vote contract
      this.StakingPool.address,   // StakingPool contract
      this.UniHelper.address,     // UniHelper contract
      this.Property.address,      // Property contract
      this.FilmNFTFactory.address // film NFT Factory contract
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  });  
};

module.exports.id = 'deploy_vabble_dao'
module.exports.tags = ['VabbleDAO'];
module.exports.dependencies = ['Ownablee', 'Vote', 'StakingPool', 'UniHelper', 'Property', 'FactoryFilmNFT'];
