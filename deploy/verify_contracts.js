const { ethers } = require("hardhat");
const { Etherscan } = require("@nomicfoundation/hardhat-verify/etherscan");
const {CONFIG, DISCOUNT, getConfig } = require('../scripts/utils');
  
module.exports = async function ({ deployments, run }) {  
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;
  
  console.log("chainId", chainId);
  if (chainId != 80002) 
    return;

  const instance = new Etherscan(
    process.env.AMOY_SCAN_API_KEY, // Etherscan API key
    "https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/AMOY_TESTNET", // Etherscan API URL
    "https://www.oklink.com/amoy" // Etherscan browser URL
  );

  const {vabToken, usdcAdress, walletAddress, uniswap, sushiswap} = getConfig(chainId);
  
  this.signers = await ethers.getSigners();
  
  this.FactoryFilmNFT = await deployments.get('FactoryFilmNFT'); 
  this.FactorySubNFT = await deployments.get('FactorySubNFT');
  this.FactoryTierNFT = await deployments.get('FactoryTierNFT');
  this.GnosisSafeL2 = await deployments.get('GnosisSafeL2');
  this.Ownablee = await deployments.get('Ownablee'); 
  this.Property = await deployments.get('Property');
  this.StakingPool = await deployments.get('StakingPool');
  this.Subscription = await deployments.get('Subscription');
  this.UniHelper = await deployments.get('UniHelper');
  this.VabbleDAO = await deployments.get('VabbleDAO');
  this.VabbleFund = await deployments.get('VabbleFund');
  this.Vote = await deployments.get('Vote');    
      
  console.log('=========== Start to verify VAB Contract start ==========')
  const contractAddressList = [
    this.FactoryFilmNFT.address,
    this.FactorySubNFT.address,
    this.FactoryTierNFT.address,
    this.GnosisSafeL2.address,
    this.Ownablee.address,
    this.Property.address,
    this.StakingPool.address,
    this.Subscription.address,
    this.UniHelper.address,
    this.VabbleDAO.address,
    this.VabbleFund.address,
    this.Vote.address
  ];

  const argList = [
    [
      this.Ownablee.address 
    ], // FactoryFilmNFT
    [
      this.Ownablee.address, 
      this.UniHelper.address
    ], // FactorySubNFT
    [
      this.Ownablee.address,
      this.VabbleDAO.address,
      this.VabbleFund.address
    ], // FactoryTierNFT
    [], // GnosisSafeL2
    [
      walletAddress,
      vabToken, 
      usdcAdress,
      this.GnosisSafeL2.address      
    ], // Ownablee
    [
      this.Ownablee.address,
      this.UniHelper.address,   // UniHelper contract
      this.Vote.address,        // Vote contract
      this.StakingPool.address, // StakingPool contract
    ], // Property
    [
      this.Ownablee.address
    ], // StakingPool
    [
      this.Ownablee.address,
      this.UniHelper.address,    // UniHelper contract
      this.Property.address,     // Property contract
      [DISCOUNT.month3, DISCOUNT.month6, DISCOUNT.month12] // 3 months => 11%, 6 months => 22%, 12 months => 25%
    ], // Subscription
    [
      uniswap.factory,
      uniswap.router,
      sushiswap.factory,
      sushiswap.router,
      this.Ownablee.address
    ], // UniHelper
    [
      this.Ownablee.address,      // Ownablee contract
      this.UniHelper.address,     // UniHelper contract
      this.Vote.address,          // Vote contract
      this.StakingPool.address,   // StakingPool contract
      this.Property.address,      // Property contract
      this.VabbleFund.address     // VabbleFund contract
    ], // VabbleDAO
    [
      this.Ownablee.address,      // Ownablee contract
      this.UniHelper.address,     // UniHelper contract
      this.StakingPool.address,   // StakingPool contract
      this.Property.address,      // Property contract
      this.FactoryFilmNFT.address // film NFT Factory contract
    ], // VabbleFund
    [
      this.Ownablee.address
    ], // Vote
  ];

  const contractNames = [
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
  ]

  

  for (var i = 0; i < contractAddressList.length; i++) {
    try {
      if (instance.isVerified(contractAddressList[i])) {
        console.log(`${contractNames[i]} is already verified!`)
        continue;
      }
      await run("verify:verify", {
          address: contractAddressList[i],
          constructorArguments: argList[i],
      })
    } catch (e) {
        if (e.message.toLowerCase().includes("already verified")) {
          console.log(`${contractNames[i]} is already verified!`);
        } else {
            console.log(e)
        }
    }
  }

  console.log('=========== End to verify VAB Contract end ==========')
  
  for (var i = 0; i < contractAddressList.length; i++) {
    console.log(`${contractNames[i]} (${contractAddressList[i]})`)
  }
};

module.exports.id = 'init'
module.exports.dependencies = [
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
  