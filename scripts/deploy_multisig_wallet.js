// module.exports = async function ({ getNamedAccounts, deployments }) {
//   const { deploy } = deployments;
//   const { deployer } = await getNamedAccounts();
//   const { CONFIG, NETWORK } = require('../scripts/utils');
  
//   if(NETWORK == 'mumbai') {
//     this.sig1 = CONFIG.mumbai.sig.user1
//     this.sig2 = CONFIG.mumbai.sig.user2
//   } else if(NETWORK == 'polygon') {
//     this.sig1 = CONFIG.polygon.sig.user1
//     this.sig2 = CONFIG.polygon.sig.user2
//   }
//   this.confirmCount = 2;

//   await deploy('MultiSigWallet', {
//     from: deployer,
//     args: [
//       [this.sig1, this.sig2],
//       this.confirmCount
//     ],
//     log: true,
//     deterministicDeployment: false,
//     skipIfAlreadyDeployed: true,
//   });
// };

// module.exports.id = 'deploy_multisig_wallet'
// module.exports.tags = ['MultiSigWallet'];
