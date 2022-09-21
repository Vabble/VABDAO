module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { CONFIG, NETWORK } = require('../scripts/utils');
  
  this.Vote = await deployments.get('Vote');
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

  await deploy('VabbleDAO', {
    from: deployer,
    args: [
      this.vabToken,            // mockVAB
      this.Vote.address,        // Vote contract
      this.StakingPool.address, // StakingPool contract
      this.UniHelper.address,   // UniHelper contract
      this.Property.address,    // Property contract
      this.usdc
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  });  
};

module.exports.id = 'deploy_vabble_dao'
module.exports.tags = ['VabbleDAO'];
module.exports.dependencies = ['Vote', 'StakingPool', 'UniHelper', 'Property'];
