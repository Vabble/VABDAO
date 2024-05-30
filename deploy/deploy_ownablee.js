module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const { getConfig } = require('../scripts/utils');

  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;

  let GnosisSafeAddress = GnosisSafeL2;
  if (GnosisSafeAddress == "") {
    this.GnosisSafe = await deployments.get('GnosisSafeL2');  
    GnosisSafeAddress = this.GnosisSafe.address;
  }

  const {vabToken, usdcAdress, walletAddress, GnosisSafeL2} = getConfig(chainId);

  console.log("------------- Ownablee Deployment -----------------");
  console.log({vabToken, usdcAdress, walletAddress, GnosisSafeL2});
    
  await deploy('Ownablee', {
    from: deployer,
    args: [
      walletAddress,
      vabToken, 
      usdcAdress,
      GnosisSafeAddress,
      // "0xe0536a4D730a78DB8B4c4605D73e107201d9543e"
      // "0x3E5e853d1784cDB519DB1eB175B374FB53FE285C"
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  });

  this.Ownablee = await deployments.get('Ownablee');
};

module.exports.id = 'deploy_ownablee'
module.exports.tags = ['Ownablee', 'Deploy'];
// module.exports.dependencies = ['MultiSigWallet'];
module.exports.dependencies = ['GnosisSafeL2'];
