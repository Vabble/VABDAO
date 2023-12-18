module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const { getConfig } = require('../scripts/utils');
  
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;

  const {vabToken, usdcAdress, walletAddress} = getConfig(chainId);

  this.GnosisSafe = await deployments.get('GnosisSafeL2');  
  
  await deploy('Ownablee', {
    from: deployer,
    args: [
      walletAddress,
      vabToken, 
      usdcAdress,
      this.GnosisSafe.address
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  });

  this.Ownablee = await deployments.get('Ownablee');
};

module.exports.id = 'deploy_ownablee'
module.exports.tags = ['Ownablee'];
// module.exports.dependencies = ['MultiSigWallet'];
module.exports.dependencies = ['GnosisSafeL2'];
