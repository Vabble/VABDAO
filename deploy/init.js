const { ethers } = require("hardhat");

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  
  this.signers = await ethers.getSigners();
  
  this.FactoryFilmNFT = await deployments.get('FactoryFilmNFT'); 
  this.Ownablee = await deployments.get('Ownablee'); 
  this.StakingPool = await deployments.get('StakingPool');
  this.UniHelper = await deployments.get('UniHelper');
  this.Vote = await deployments.get('Vote');
    
  this.FactorySubNFT = await deployments.get('FactorySubNFT');
  this.FactoryTierNFT = await deployments.get('FactoryTierNFT');
  this.MultiSigWallet = await deployments.get('MultiSigWallet');
  this.Property = await deployments.get('Property');
  this.Subscription = await deployments.get('Subscription');
  this.VabbleDAO = await deployments.get('VabbleDAO');
  this.VabbleFunding = await deployments.get('VabbleFunding');
    
  // const contract1 = await ethers.getContractAt('FactoryFilmNFT', this.FactoryFilmNFT.address)
  // await contract1.connect(this.signers[0]).initializeFactory(
  //   this.VabbleDAO.address, 
  //   this.VabbleFunding.address, 
  //   this.StakingPool.address, 
  //   this.Property.address, 
  //   {from: this.signers[0].address}
  // )

  // const contract2 = await ethers.getContractAt('Vote', this.Vote.address)
  // await contract2.connect(this.signers[0]).initializeVote(
  //   this.VabbleDAO.address, 
  //   this.StakingPool.address, 
  //   this.Property.address, 
  //   {from: this.signers[0].address}
  // )
  
  const contract3 = await ethers.getContractAt('UniHelper', this.UniHelper.address)
  await contract3.connect(this.signers[0]).setWhiteList(
    this.VabbleDAO.address, 
    this.VabbleFunding.address, 
    this.Subscription.address, 
    this.FactoryFilmNFT.address, 
    this.FactorySubNFT.address, 
    {from: this.signers[0].address}
  )

  // const contract4 = await ethers.getContractAt('StakingPool', this.StakingPool.address)
  // await contract4.connect(this.signers[0]).initializePool(
  //   this.VabbleDAO.address, 
  //   this.Property.address, 
  //   this.Vote.address,
  //   {from: this.signers[0].address}
  // )
  
  // const contract5 = await ethers.getContractAt('Ownablee', this.Ownablee.address)
  // await contract5.connect(this.signers[0]).setup(
  //   this.Vote.address, 
  //   this.VabbleDAO.address, 
  //   this.StakingPool.address,
  //   {from: this.signers[0].address}
  // )
};

module.exports.id = 'init'
module.exports.dependencies = [
  'FactoryFilmNFT',
  'FactorySubNFT',
  'FactoryTierNFT',
  'MultiSigWallet',
  'Ownablee',
  'Property',
  'StakingPool',
  'Subscription',
  'UniHelper',
  'VabbleDAO',
  'VabbleFunding',
  'Vote'
];
  