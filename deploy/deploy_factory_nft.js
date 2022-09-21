module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { CONFIG, NETWORK } = require('../scripts/utils');
  
  this.StakingPool = await deployments.get('StakingPool');
  this.UniHelper = await deployments.get('UniHelper');
  this.Property = await deployments.get('Property');

  if(NETWORK == 'mumbai') {
    this.vabToken = CONFIG.mumbai.vabToken
    this.usdc = CONFIG.mumbai.usdcAdress
  } else if(NETWORK == 'rinkeby') {
    this.vabToken = CONFIG.rinkeby.vabToken
    this.usdc = CONFIG.rinkeby.usdcAdress
  } else if(NETWORK == 'ethereum') {
    this.vabToken = CONFIG.ethereum.vabToken
    this.usdc = CONFIG.ethereum.usdcAdress
  } else if(NETWORK == 'polygon') {
    this.vabToken = CONFIG.polygon.vabToken
    this.usdc = CONFIG.polygon.usdcAdress
  }
  
  await deploy('FactoryNFT', {
    from: deployer,
    args: [
      this.vabToken,
      this.StakingPool.address,
      this.UniHelper.address,
      this.Property.address,
      this.usdc,
      'Vabble NFT', 
      'vnft'
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  }); 
};

module.exports.id = 'deploy_factory_nft'
module.exports.tags = ['FactoryNFT'];
module.exports.dependencies = ['StakingPool', 'UniHelper', 'Property'];
