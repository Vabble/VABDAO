module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { CONFIG, NETWORK } = require('../scripts/utils');
  
  this.UniHelper = await deployments.get('UniHelper');
  this.Property = await deployments.get('Property');
  this.VabbleDAO = await deployments.get('VabbleDAO');

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
  
  await deploy('Subscription', {
    from: deployer,
    args: [
      this.vabToken,            // mockVAB
      this.UniHelper.address,   // UniHelper contract
      this.Property.address,    // Property contract
      this.VabbleDAO.address,   // VabbleDAO contract
      this.usdc,
      CONFIG.daoWalletAddress
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  });  
};

module.exports.id = 'deploy_subscription'
module.exports.tags = ['Subscription'];
module.exports.dependencies = ['UniHelper', 'Property', 'VabbleDAO'];
