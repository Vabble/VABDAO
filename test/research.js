const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');
const ERC20 = require('../data/ERC20.json');
const { CONFIG, getBigNumber, DISCOUNT, increaseTime } = require('../scripts/utils');

const GNOSIS_FLAG = false;

describe('StakingPool', function () {
  before(async function () {        
    this.VabbleDAOFactory = await ethers.getContractFactory('VabbleDAO');
    this.VabbleFundFactory = await ethers.getContractFactory('VabbleFund');
    this.UniHelperFactory = await ethers.getContractFactory('UniHelper');
    this.StakingPoolFactory = await ethers.getContractFactory('StakingPool');
    this.VoteFactory = await ethers.getContractFactory('Vote');
    this.PropertyFactory = await ethers.getContractFactory('Property');
    this.FactoryFilmNFTFactory = await ethers.getContractFactory('FactoryFilmNFT');
    this.FactoryTierNFTFactory = await ethers.getContractFactory('FactoryTierNFT');
    this.FactorySubNFTFactory = await ethers.getContractFactory('FactorySubNFT');
    this.OwnableFactory = await ethers.getContractFactory('Ownablee');
    this.SubscriptionFactory = await ethers.getContractFactory('Subscription');
    this.GnosisSafeFactory = await ethers.getContractFactory('GnosisSafeL2');

    this.signers = await ethers.getSigners();
    this.deployer = this.signers[0];

    this.auditor = this.signers[0];
    this.studio1 = this.signers[2];    
    this.studio2 = this.signers[3];       
    this.studio3 = this.signers[4]; 
    this.customer1 = this.signers[5];
    this.customer2 = this.signers[6];
    this.customer3 = this.signers[7];
    this.auditorAgent1 = this.signers[8];   
    this.reward = this.signers[9];   
    this.auditorAgent2 = this.signers[10]; 
    this.customer4 = this.signers[11];
    this.customer5 = this.signers[12];
    this.customer6 = this.signers[13];
    this.customer7 = this.signers[14]; 
    this.sig1 = this.signers[15];    
    this.sig2 = this.signers[16];       
    this.sig3 = this.signers[17]; 

    this.signer1 = new ethers.Wallet(process.env.PK1, ethers.provider);
    this.signer2 = new ethers.Wallet(process.env.PK2, ethers.provider); 
  });

  beforeEach(async function () {
    // load ERC20 tokens
    if (CONFIG.mumbai.vabToken == "0x5cBbA5484594598a660636eFb0A1AD953aFa4e32")
      this.vabToken = new ethers.Contract(CONFIG.mumbai.vabToken, JSON.stringify(ERC20), ethers.provider);
    else
      this.vabToken = new ethers.Contract(CONFIG.mumbai.vabToken, JSON.stringify(FERC20), ethers.provider);


    this.EXM = new ethers.Contract(CONFIG.mumbai.exmAddress, JSON.stringify(ERC20), ethers.provider);
    this.USDC = new ethers.Contract(CONFIG.mumbai.usdcAdress, JSON.stringify(ERC20), ethers.provider);

    this.GnosisSafe = await (await this.GnosisSafeFactory.deploy()).deployed();
    this.auditor = GNOSIS_FLAG ? this.GnosisSafe : this.deployer;
        
    this.Ownablee = await (await this.OwnableFactory.deploy(
        CONFIG.daoWalletAddress, this.vabToken.address, this.USDC.address, this.auditor.address
    )).deployed();

    this.UniHelper = await (await this.UniHelperFactory.deploy(
        CONFIG.mumbai.uniswap.factory, CONFIG.mumbai.uniswap.router, 
        CONFIG.mumbai.sushiswap.factory, CONFIG.mumbai.sushiswap.router, this.Ownablee.address
    )).deployed();


    this.StakingPool = await (await this.StakingPoolFactory.deploy(this.Ownablee.address)).deployed();                 
    this.Vote = await (await this.VoteFactory.deploy(this.Ownablee.address)).deployed();
  
    this.Property = await (
        await this.PropertyFactory.deploy(
          this.Ownablee.address,
          this.UniHelper.address,
          this.Vote.address,
          this.StakingPool.address
        )
    ).deployed();

    this.FilmNFT = await (
        await this.FactoryFilmNFTFactory.deploy(this.Ownablee.address)
    ).deployed();   

    this.SubNFT = await (
        await this.FactorySubNFTFactory.deploy(this.Ownablee.address, this.UniHelper.address)
    ).deployed();   

    this.VabbleFund = await (
        await this.VabbleFundFactory.deploy(
          this.Ownablee.address,
          this.UniHelper.address,
          this.StakingPool.address,
          this.Property.address,
          this.FilmNFT.address
        )
    ).deployed();   

    this.VabbleDAO = await (
        await this.VabbleDAOFactory.deploy(
          this.Ownablee.address,
          this.UniHelper.address,
          this.Vote.address,
          this.StakingPool.address,
          this.Property.address,
          this.VabbleFund.address
        )
    ).deployed();     
      
    this.TierNFT = await (
        await this.FactoryTierNFTFactory.deploy(
          this.Ownablee.address, 
          this.VabbleDAO.address,
          this.VabbleFund.address
        )
    ).deployed(); 

    this.Subscription = await (
        await this.SubscriptionFactory.deploy(
          this.Ownablee.address,
          this.UniHelper.address,
          this.Property.address,
          [DISCOUNT.month3, DISCOUNT.month6, DISCOUNT.month12]
        )
    ).deployed();    

    // ---------------- Setup/Initialize the contracts with the deployer ----------------------------------
    await this.GnosisSafe.connect(this.deployer).setup(
        [this.signer1.address, this.signer2.address], 
        2, 
        CONFIG.addressZero, 
        "0x", 
        CONFIG.addressZero, 
        CONFIG.addressZero, 
        0, 
        CONFIG.addressZero, 
        {from: this.deployer.address}
    );

    await this.FilmNFT.connect(this.deployer).initialize(
        this.VabbleDAO.address, 
        this.VabbleFund.address,
        {from: this.deployer.address}
    ); 

    await this.StakingPool.connect(this.deployer).initialize(
        this.VabbleDAO.address,
        this.Property.address,
        this.Vote.address,
        {from: this.deployer.address}
    )  
      
    await this.Vote.connect(this.deployer).initialize(
        this.VabbleDAO.address,
        this.StakingPool.address,
        this.Property.address,
        {from: this.deployer.address}
    )

    await this.VabbleFund.connect(this.deployer).initialize(
        this.VabbleDAO.address,
        {from: this.deployer.address}
    )

    await this.UniHelper.connect(this.deployer).setWhiteList(
        this.VabbleDAO.address,
        this.VabbleFund.address,
        this.Subscription.address,
        this.FilmNFT.address,
        this.SubNFT.address,
        {from: this.deployer.address}
    )

    await this.Ownablee.connect(this.deployer).setup(
        this.Vote.address, this.VabbleDAO.address, this.StakingPool.address, 
        {from: this.deployer.address}
    )       

    // if (GNOSIS_FLAG) {
    //     let encodedCallData = this.Ownablee.interface.encodeFunctionData("addDepositAsset", 
    //         [[this.vabToken.address, this.USDC.address, this.EXM.address, CONFIG.addressZero]]);

    //     // Generate Signature and Transaction information
    //     const {signatureBytes, tx} = await generateSignature(this.GnosisSafe, encodedCallData, this.Ownablee.address, [this.signer1, this.signer2]);

    //     await executeGnosisSafeTransaction(this.GnosisSafe, this.signer2, signatureBytes, tx);
    // } else {
    //     await this.Ownablee.connect(this.auditor).addDepositAsset(
    //         [this.vabToken.address, this.USDC.address, this.EXM.address, CONFIG.addressZero], {from: this.auditor.address}
    //     )
    // }

    await this.Ownablee.connect(this.deployer).addDepositAsset(
        [this.vabToken.address, this.USDC.address, this.EXM.address, CONFIG.addressZero], 
        {from: this.deployer.address}
    )  
    expect(await this.Ownablee.auditor()).to.be.equal(this.auditor.address);   

    this.auditorBalance = await this.vabToken.balanceOf(this.auditor.address) // 145M

    // ====== VAB
    // Transfering VAB token to user1, 2, 3 80000000
    await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(90000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer2.address, getBigNumber(50000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer3.address, getBigNumber(500000), {from: this.auditor.address});
    // Transfering VAB token to studio1, 2, 3
    await this.vabToken.connect(this.auditor).transfer(this.studio1.address, getBigNumber(5000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio2.address, getBigNumber(5000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio3.address, getBigNumber(5000000), {from: this.auditor.address});

    // Approve to transfer VAB token for each user, studio to DAO, StakingPool
    await this.vabToken.connect(this.auditor).approve(this.StakingPool.address, getBigNumber(100000000));  

    await this.vabToken.connect(this.customer1).approve(this.VabbleDAO.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.VabbleDAO.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.VabbleDAO.address, getBigNumber(100000000));   
    
    await this.vabToken.connect(this.customer1).approve(this.Property.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.Property.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.Property.address, getBigNumber(100000000));

    await this.vabToken.connect(this.customer1).approve(this.SubNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.SubNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.SubNFT.address, getBigNumber(100000000));   

    await this.vabToken.connect(this.customer1).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer1).approve(this.FilmNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.FilmNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.FilmNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer1).approve(this.Subscription.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.Subscription.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.Subscription.address, getBigNumber(100000000));

    await this.vabToken.connect(this.studio1).approve(this.VabbleDAO.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.VabbleDAO.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.VabbleDAO.address, getBigNumber(100000000));       
    await this.vabToken.connect(this.studio1).approve(this.SubNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.SubNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.SubNFT.address, getBigNumber(100000000));

    await this.vabToken.connect(this.studio1).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.StakingPool.address, getBigNumber(100000000));

    await this.vabToken.connect(this.studio1).approve(this.FilmNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.FilmNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.FilmNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio1).approve(this.Subscription.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.Subscription.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.Subscription.address, getBigNumber(100000000));
    
    // console.log('======t-1')
    // // Staking VAB token
    // await this.StakingPool.connect(this.customer1).stakeVAB(getBigNumber(40000000), {from: this.customer1.address})
    // await this.StakingPool.connect(this.customer2).stakeVAB(getBigNumber(40000000), {from: this.customer2.address})
    // await this.StakingPool.connect(this.customer3).stakeVAB(getBigNumber(300), {from: this.customer3.address})    
    // await this.StakingPool.connect(this.studio1).stakeVAB(getBigNumber(300), {from: this.studio1.address})
    // await this.StakingPool.connect(this.studio2).stakeVAB(getBigNumber(300), {from: this.studio2.address})
    // await this.StakingPool.connect(this.studio3).stakeVAB(getBigNumber(300), {from: this.studio3.address})
    
    // Confirm auditor
    expect(await this.Ownablee.auditor()).to.be.equal(this.auditor.address);    
    
    this.events = [];
  });

  it('Staking and unstaking VAB token when voting', async function () { 
    // vote film vote peroid = 10 days
    // stakeVAB at Feb 1
    // stakeVAB at Feb 15
    // p-1: create at Feb 11, vote Feb 16
    // p-2: create at Feb 18, vote Feb 25
    // withdraw rewards at March 16

    
    const stakeAmount = getBigNumber(100)
    await this.StakingPool.connect(this.customer1).stakeVAB(stakeAmount, {from: this.customer1.address})
    
    let stakeInfo = await this.StakingPool.stakeInfo(this.customer1.address)
    let outstandRewards = stakeInfo.outstandingReward
    let stakeTime = stakeInfo.stakeTime;
    let stakingRewards = await this.StakingPool.calcRealizedRewards(this.customer1.address)
    let pendingRewards = await this.StakingPool.calcPendingRewards(this.customer1.address)
    let rewards = await this.StakingPool.calcRewardAmount(this.customer1.address)
    console.log('staking==========::', stakingRewards.toString())
    console.log('pending==========::', pendingRewards.toString())
    console.log('rewards==========::', rewards.toString())
    console.log('outstandRewards-1::', outstandRewards.toString())

    let sum = BigNumber.from(outstandRewards).add(stakingRewards).add(pendingRewards)
    console.log('sum    ==========::', sum.toString()) // 7.112710993736291126
    console.log('==============================')
    expect(rewards).to.be.equal(sum) 


    const sharePercents = [getBigNumber(60, 8), getBigNumber(15, 8), getBigNumber(25, 8)]
    const studioPayees = [this.customer1.address, this.customer2.address, this.customer3.address]
    const raiseAmount = getBigNumber(150, 6)
    const fundPeriod = getBigNumber(20, 0)
    const fundType = getBigNumber(3, 0)
    const title4 = 'film title - 4'
    const desc4 = 'film description - 4'
    const enableClaimer = 1;
    let ethVal = ethers.utils.parseEther('1')
    const pId1 = [1]; // 1, 2
    const pId2 = [2]; // 1, 2
    const vInfo = [1];
        
    //======= Feb 11: create p-1 
    increaseTime(86400 * 10); // 10 days    
    await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(0, 0, CONFIG.addressZero, {from: this.studio1.address, value: ethVal})
    await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
      getBigNumber(1, 0), 
      title4,
      desc4,
      sharePercents, 
      studioPayees,  
      raiseAmount, 
      fundPeriod, 
      0,
      enableClaimer,
      {from: this.studio1.address}
    )

    let proposalTimeIntervals = await this.StakingPool.__calcProposalTimeIntervals(this.customer1.address, stakeTime);
    
    expect(proposalTimeIntervals.count_).to.be.equal(1);
    expect(proposalTimeIntervals.times_.length).to.be.equal(4);
    console.log("proposalTimeIntervals", proposalTimeIntervals.times_)

    // //======= Feb 15: stake VAB
    // increaseTime(86400 * 4); // 4 days    
    // await this.StakingPool.connect(this.customer1).stakeVAB(stakeAmount, {from: this.customer1.address})
    
    // stakeInfo = await this.StakingPool.stakeInfo(this.customer1.address)
    // outstandRewards = stakeInfo.outstandingReward
    // stakingRewards = await this.StakingPool.calcRealizedRewards(this.customer1.address)
    // pendingRewards = await this.StakingPool.calcPendingRewards(this.customer1.address)
    // rewards = await this.StakingPool.calcRewardAmount(this.customer1.address)
    // sum = BigNumber.from(outstandRewards).add(stakingRewards).add(pendingRewards)
    // console.log('staking==========::', stakingRewards.toString())
    // console.log('pending==========::', pendingRewards.toString())
    // console.log('rewards==========::', rewards.toString())
    // console.log('outstandRewards-2::', outstandRewards.toString())
    // console.log('==============================')
    // expect(rewards).to.be.equal(sum) 


    // //======= Feb 16: vote to p-1 
    // increaseTime(86400 * 1); // 1 days    
    // await network.provider.send('evm_mine');
    // // await this.Vote.connect(this.customer1).voteToFilms(pId1, vInfo, {from: this.customer1.address})

    // //======= Feb 18: create p-2
    // increaseTime(86400 * 2); // 2 days    
    // await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(0, 0, CONFIG.addressZero, {from: this.studio1.address, value: ethVal})
    // await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
    //   getBigNumber(2, 0), 
    //   title4,
    //   desc4,
    //   sharePercents, 
    //   studioPayees,  
    //   raiseAmount, 
    //   fundPeriod, 
    //   0,
    //   enableClaimer,
    //   {from: this.studio1.address}
    // )
    
    // //======= Feb 25: vote to p-2    
    // increaseTime(86400 * 7); // 7 days    
    // // await this.Vote.connect(this.customer1).voteToFilms(pId2, vInfo, {from: this.customer1.address})
    
    // const rewardRate = await this.Property.rewardRate()
    // const totalRewardAmount = await this.StakingPool.totalRewardAmount()
    // const totalStakingAmount = await this.StakingPool.totalStakingAmount()
    // console.log('rewardRate==========::', rewardRate.toString())
    // console.log('totalRewardAmount===::', totalRewardAmount.toString()) // 861.458247218036034477
    // console.log('totalStakingAmount==::', totalStakingAmount.toString())// 200.000000000000000000
    // console.log('==============================')


    // //======= Feb 28: checking . . .
    // increaseTime(86400 * 3); // 3 days    
    // stakingRewards = await this.StakingPool.calcRealizedRewards(this.customer1.address)
    // pendingRewards = await this.StakingPool.calcPendingRewards(this.customer1.address)
    // rewards = await this.StakingPool.calcRewardAmount(this.customer1.address)
    // sum = BigNumber.from(outstandRewards).add(stakingRewards).add(pendingRewards)
    // console.log('staking==========::', stakingRewards.toString())
    // console.log('pending==========::', pendingRewards.toString())
    // console.log('rewards==========::', rewards.toString())
    // console.log('==============================')
    // expect(rewards).to.be.equal(sum) 
    
    // //======= March 16: withdraw rewards
    // increaseTime(86400 * 17); // 17 days        
    // outstandRewards = stakeInfo.outstandingReward
    // stakingRewards = await this.StakingPool.calcRealizedRewards(this.customer1.address)
    // pendingRewards = await this.StakingPool.calcPendingRewards(this.customer1.address)
    // rewards = await this.StakingPool.calcRewardAmount(this.customer1.address)
    // sum = BigNumber.from(outstandRewards).add(stakingRewards).add(pendingRewards)
    // console.log('staking==========::', stakingRewards.toString())
    // console.log('pending==========::', pendingRewards.toString())
    // console.log('rewards==========::', rewards.toString())

    // await this.StakingPool.connect(this.customer1).withdrawReward(0, {from: this.customer1.address})
    // const receivedRewards = await this.StakingPool.connect(this.customer1).receivedRewardAmount(this.customer1.address, {from: this.customer1.address})
    // console.log('receivedRewards==::', receivedRewards.toString())
    // expect(receivedRewards).to.be.equal(rewards) 
    // expect(receivedRewards).to.be.equal(sum) 

    
    // userRewardAmount1 = await this.StakingPool.calcRewardAmount(this.customer1.address)
    // const tx = await this.StakingPool.connect(this.customer1).unstakeVAB(getBigNumber(70), {from: this.customer1.address})
    // this.events = (await tx.wait()).events
    // const arg_reward = this.events[1].args
    // const arg_unstake = this.events[3].args    
    // expect(arg_reward.staker).to.be.equal(this.customer1.address)    
    // expect(arg_reward.rewardAmount).to.be.equal(userRewardAmount1)
    // expect(arg_unstake.unstaker).to.be.equal(this.customer1.address)
    // expect(arg_unstake.unStakeAmount).to.be.equal(getBigNumber(70))
    // expect(await this.StakingPool.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(30))

    

    // const totalRewardIssuedAmount = await this.StakingPool.totalRewardIssuedAmount();
    // console.log('====totalRewardIssuedAmount::', totalRewardIssuedAmount.toString())
    
    // const userReceivedRewardAmount1 = await this.StakingPool.connect(this.customer1).receivedRewardAmount(this.customer1.address, {from: this.customer1.address})
    // console.log('====userReceivedRewardAmount-1::', userReceivedRewardAmount1.toString())

    // // getLimitCount()
    // const val = await this.StakingPool.getLimitCount();
    // console.log('====limitVal:', val.toString())
  });  
});
