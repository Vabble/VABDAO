const { ethers } = require("hardhat");
const {CONFIG, isTest, getBigNumber, getConfig } = require('../scripts/utils');
const addressZero = CONFIG.addressZero;
const ERC20 = require('../data/ERC20.json');
  
module.exports = async function ({ deployments, run }) {  
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;
  
  console.log("chainId", chainId);
  if (chainId == 1337) 
    return;
  
  this.signers = await ethers.getSigners();
  
  this.MockERC20 = await deployments.get('MockERC20'); 
      
  console.log('=========== Start to verify VAB Contract start ==========')
  const VABContract = await ethers.getContractAt('MockERC20', this.MockERC20.address);
  
//   try {
//     await run("verify:verify", {
//         address: VABContract.address,
//         constructorArguments: ['Vabble', 'VAB'],
//     })
//   } catch (e) {
//       if (e.message.toLowerCase().includes("already verified")) {
//           console.log("Already verified!")
//       } else {
//           console.log(e)
//       }
//   }
};

module.exports.id = 'init'
module.exports.dependencies = [
  'MockERC20',
  'FactoryFilmNFT',
  'FactorySubNFT',
  'FactoryTierNFT',
  'GnosisSafeL2',
  'Ownablee',
  'Property',
  'StakingPool',
  'Subscription',
  'UniHelper',
  'VabbleDAO',
  'VabbleFund',
  'Vote'
];
module.exports.tags = ['Verify'];
  