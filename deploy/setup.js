const { ethers } = require("hardhat");
const {CONFIG, isTest, getBigNumber } = require('../scripts/utils');
const addressZero = CONFIG.addressZero;
const ERC20 = require('../data/ERC20.json');
  
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

  console.log('complete => Property initialize')

  // checking configured values
  console.log("\n--------- Checking configured values ---------")
  const vabToken = await OwnableeContract.PAYOUT_TOKEN();
  const usdcAdress = await OwnableeContract.USDC_TOKEN();
  const walletAddress = await OwnableeContract.VAB_WALLET();

  console.log({vabToken, usdcAdress, walletAddress});

  const vabTokenContract = new ethers.Contract(vabToken, JSON.stringify(ERC20), ethers.provider);

  const balanceOfWallet = (await vabTokenContract.balanceOf(walletAddress)) / getBigNumber(1);
  
  console.log({balanceOfWallet});
  
  const uinswapFactory = await UniHelperContract.getUniswapFactory();
  const uinswapRouter = await UniHelperContract.getUniswapRouter();
  const sushiFactory = await UniHelperContract.getSushiFactory();
  const sushiRouter = await UniHelperContract.getSushiRouter();

  console.log({uinswapFactory, uinswapRouter, sushiFactory, sushiRouter});

  const filmVotePeriod = (await PropertyContract.filmVotePeriod()).toString();
  const agentVotePeriod = (await PropertyContract.agentVotePeriod()).toString();
  const disputeGracePeriod = (await PropertyContract.disputeGracePeriod()).toString();
  const propertyVotePeriod = (await PropertyContract.propertyVotePeriod()).toString();
  const lockPeriod = (await PropertyContract.lockPeriod()).toString();
  const rewardRate = (await PropertyContract.rewardRate()).toString();
  const filmRewardClaimPeriod = (await PropertyContract.filmRewardClaimPeriod()).toString();
  const maxAllowPeriod = (await PropertyContract.maxAllowPeriod()).toString();
  const proposalFeeAmount = (await PropertyContract.proposalFeeAmount()).toString();
  const fundFeePercent = (await PropertyContract.fundFeePercent()).toString();
  const minDepositAmount = (await PropertyContract.minDepositAmount()).toString();
  const maxDepositAmount = (await PropertyContract.maxDepositAmount()).toString();
  const maxMintFeePercent = (await PropertyContract.maxMintFeePercent()).toString();
  const minVoteCount = (await PropertyContract.minVoteCount()).toString();
  const minStakerCountPercent = (await PropertyContract.minStakerCountPercent()).toString();
  const availableVABAmount = (await PropertyContract.availableVABAmount()).toString();
  const boardVotePeriod = (await PropertyContract.boardVotePeriod()).toString();
  const boardVoteWeight = (await PropertyContract.boardVoteWeight()).toString();
  const rewardVotePeriod = (await PropertyContract.rewardVotePeriod()).toString();
  const subscriptionAmount = (await PropertyContract.subscriptionAmount()).toString();
  const boardRewardRate = (await PropertyContract.boardRewardRate()).toString();
  
  console.log({
    filmVotePeriod, agentVotePeriod, disputeGracePeriod, propertyVotePeriod, 
    lockPeriod, rewardRate, filmRewardClaimPeriod, maxAllowPeriod, 
    proposalFeeAmount, fundFeePercent, minDepositAmount, maxDepositAmount, 
    maxMintFeePercent, minVoteCount, minStakerCountPercent, availableVABAmount, 
    boardVotePeriod, boardVoteWeight, rewardVotePeriod, subscriptionAmount, 
    boardRewardRate
  });

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
  