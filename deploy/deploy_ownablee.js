module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { CONFIG, NETWORK } = require('../scripts/utils');
  
  if(NETWORK == 'mumbai') {
    this.vabToken = CONFIG.mumbai.vabToken
    this.usdc = CONFIG.mumbai.usdcAdress
  } else if(NETWORK == 'polygon') {
    this.vabToken = CONFIG.polygon.vabToken
    this.usdc = CONFIG.polygon.usdcAdress
  }

  // this.MultiSig = await deployments.get('MultiSigWallet');  
  this.GnosisSafe = await deployments.get('GnosisSafeL2');  
  
  await deploy('Ownablee', {
    from: deployer,
    args: [
      CONFIG.daoWalletAddress,
      this.vabToken, 
      this.usdc,
      // this.MultiSig.address
      this.GnosisSafe.address
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: true,
  });
};

module.exports.id = 'deploy_ownablee'
module.exports.tags = ['Ownablee'];
// module.exports.dependencies = ['MultiSigWallet'];
module.exports.dependencies = ['GnosisSafeL2'];
