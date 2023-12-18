const { ethers } = require("hardhat");
const {CONFIG, isTest } = require('../scripts/utils');
const addressZero = CONFIG.addressZero;
  
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

  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;
	console.log("Chain ID: ", chainId);

  const accounts = await getNamedAccounts();
  const deployer = this.signers[0];
  const signer1 = new ethers.Wallet(process.env.PK1, ethers.provider);
  const signer2 = new ethers.Wallet(process.env.PK2, ethers.provider);

  console.log("accounts", accounts);
  console.log("deployer", deployer.address);
  // console.log("Config Signers", sig);
  console.log("Private Signers Address", {user1: signer1.address, user2: signer2.address});
  // console.log("Private Signers", signer1, signer2);

  const GnosisSafeContract = await ethers.getContractAt('GnosisSafeL2', this.GnosisSafeL2.address)
  const threshold = await GnosisSafeContract.getThreshold();
  if (threshold == 0) {
    await GnosisSafeContract.connect(deployer).setup(
      [signer1.address, signer2.address], 
      2, 
      addressZero, 
      "0x", 
      addressZero, 
      addressZero, 
      0, 
      addressZero, 
      {from: deployer.address}
    )  
  }
  
  console.log('complete => GnosisSafeL2 setup')

  const FactoryFilmNFTContract = await ethers.getContractAt('FactoryFilmNFT', this.FactoryFilmNFT.address)
  await FactoryFilmNFTContract.connect(deployer).initialize(
    this.VabbleDAO.address, 
    this.VabbleFund.address, 
    {from: deployer.address}
  )
  
  console.log('complete => FactoryFilmNFT initialize')

  const OwnableeContract = await ethers.getContractAt('Ownablee', this.Ownablee.address)
  await OwnableeContract.connect(deployer).setup(
    this.Vote.address, 
    this.VabbleDAO.address, 
    this.StakingPool.address,
    {from: deployer.address}
  )

  console.log('complete => Ownablee setup')

  const StakingPoolContract = await ethers.getContractAt('StakingPool', this.StakingPool.address)
  await StakingPoolContract.connect(deployer).initialize(
    this.VabbleDAO.address, 
    this.Property.address, 
    this.Vote.address,
    {from: deployer.address}
  )  

  console.log('complete => StakingPool initialize')

  const UniHelperContract = await ethers.getContractAt('UniHelper', this.UniHelper.address)
  await UniHelperContract.connect(deployer).setWhiteList(
    this.VabbleDAO.address, 
    this.VabbleFund.address, 
    this.Subscription.address, 
    this.FactoryFilmNFT.address, 
    this.FactorySubNFT.address, 
    {from: deployer.address}
  )

  console.log('complete => UniHelper setWhiteList')

  const VabbleFundContract = await ethers.getContractAt('VabbleFund', this.VabbleFund.address)
  await VabbleFundContract.connect(deployer).initialize(
    this.VabbleDAO.address, 
    {from: deployer.address}
  )
  
  console.log('complete => VabbleFund initialize')

  const VoteContract = await ethers.getContractAt('Vote', this.Vote.address)
  await VoteContract.connect(deployer).initialize(
    this.VabbleDAO.address, 
    this.StakingPool.address, 
    this.Property.address, 
    {from: deployer.address}
  )

  console.log('complete => Vote initialize')

  const PropertyContract = await ethers.getContractAt('Property', this.Property.address);
  if (isTest(chainId)) {
    await PropertyContract.updateForTesting();
  }

  const fPeriod = await PropertyContract.filmRewardClaimPeriod();
  console.log("filmRewardClaimPeriod", fPeriod.toString());

  console.log('complete => Property initialize')

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
  