const { ethers } = require("hardhat");
const { CONFIG, NETWORK } = require('../scripts/utils');
  
module.exports = async function ({ deployments }) {
  
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
      
  console.log('=========== setup start ==========')
  
  if(NETWORK == 'mumbai') {
    this.sig1Address = CONFIG.mumbai.sig.user1
    this.sig2Address = CONFIG.mumbai.sig.user2
  } else if(NETWORK == 'polygon') {
    this.sig1Address = CONFIG.polygon.sig.user1
    this.sig2Address = CONFIG.polygon.sig.user2
  }
  // const GnosisSafeContract = await ethers.getContractAt('GnosisSafeL2', this.GnosisSafeL2.address)
  // await GnosisSafeContract.connect(this.signers[0]).setup(
  //   [this.sig1Address, this.sig2Address], 
  //   2, 
  //   CONFIG.addressZero, 
  //   "0x", 
  //   CONFIG.addressZero, 
  //   CONFIG.addressZero, 
  //   0, 
  //   CONFIG.addressZero, 
  //   {from: this.signers[0].address}
  // )

  console.log('complete => GnosisSafeL2 setup')

  const FactoryFilmNFTContract = await ethers.getContractAt('FactoryFilmNFT', this.FactoryFilmNFT.address)
  await FactoryFilmNFTContract.connect(this.signers[0]).initialize(
    this.VabbleDAO.address, 
    this.VabbleFund.address, 
    {from: this.signers[0].address}
  )
  
  console.log('complete => FactoryFilmNFT initialize')

  const OwnableeContract = await ethers.getContractAt('Ownablee', this.Ownablee.address)
  await OwnableeContract.connect(this.signers[0]).setup(
    this.Vote.address, 
    this.VabbleDAO.address, 
    this.StakingPool.address,
    {from: this.signers[0].address}
  )

  console.log('complete => Ownablee setup')

  const StakingPoolContract = await ethers.getContractAt('StakingPool', this.StakingPool.address)
  await StakingPoolContract.connect(this.signers[0]).initialize(
    this.VabbleDAO.address, 
    this.Property.address, 
    this.Vote.address,
    {from: this.signers[0].address}
  )  

  console.log('complete => StakingPool initialize')

  const UniHelperContract = await ethers.getContractAt('UniHelper', this.UniHelper.address)
  await UniHelperContract.connect(this.signers[0]).setWhiteList(
    this.VabbleDAO.address, 
    this.VabbleFund.address, 
    this.Subscription.address, 
    this.FactoryFilmNFT.address, 
    this.FactorySubNFT.address, 
    {from: this.signers[0].address}
  )

  console.log('complete => UniHelper setWhiteList')

  const VabbleFundContract = await ethers.getContractAt('VabbleFund', this.VabbleFund.address)
  await VabbleFundContract.connect(this.signers[0]).initialize(
    this.VabbleDAO.address, 
    {from: this.signers[0].address}
  )
  
  console.log('complete => VabbleFund initialize')

  const VoteContract = await ethers.getContractAt('Vote', this.Vote.address)
  await VoteContract.connect(this.signers[0]).initialize(
    this.VabbleDAO.address, 
    this.StakingPool.address, 
    this.Property.address, 
    {from: this.signers[0].address}
  )

  console.log('complete => Vote initialize')
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
  