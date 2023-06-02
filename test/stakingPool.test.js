const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');
const ERC20 = require('../data/ERC20.json');
const { CONFIG, getBigNumber, getProposalFilm, getVoteData } = require('../scripts/utils');

describe('StakingPool', function () {
  before(async function () {        
    this.VabbleDAOFactory = await ethers.getContractFactory('VabbleDAO');
    this.VabbleFundingFactory = await ethers.getContractFactory('VabbleFunding');
    this.UniHelperFactory = await ethers.getContractFactory('UniHelper');
    this.StakingPoolFactory = await ethers.getContractFactory('StakingPool');
    this.VoteFactory = await ethers.getContractFactory('Vote');
    this.PropertyFactory = await ethers.getContractFactory('Property');
    this.FactoryFilmNFTFactory = await ethers.getContractFactory('FactoryFilmNFT');
    this.FactoryTierNFTFactory = await ethers.getContractFactory('FactoryTierNFT');
    this.FactorySubNFTFactory = await ethers.getContractFactory('FactorySubNFT');
    this.OwnableFactory = await ethers.getContractFactory('Ownablee');
    this.SubscriptionFactory = await ethers.getContractFactory('Subscription');

    this.signers = await ethers.getSigners();
    this.auditor = this.signers[0];
    this.newAuditor = this.signers[1];    
    this.studio1 = this.signers[2];    
    this.studio2 = this.signers[3];       
    this.studio3 = this.signers[4]; 
    this.customer1 = this.signers[5];
    this.customer2 = this.signers[6];
    this.customer3 = this.signers[7];
  });

  beforeEach(async function () {
    this.vabToken = new ethers.Contract(CONFIG.mumbai.vabToken, JSON.stringify(ERC20), ethers.provider);
    this.EXM = new ethers.Contract(CONFIG.mumbai.exmAddress, JSON.stringify(ERC20), ethers.provider);
    this.USDC = new ethers.Contract(CONFIG.mumbai.usdcAdress, JSON.stringify(ERC20), ethers.provider);
    this.DAI = new ethers.Contract(CONFIG.mumbai.daiAddress, JSON.stringify(ERC20), ethers.provider);

    this.Ownablee = await (await this.OwnableFactory.deploy(
      CONFIG.daoWalletAddress, this.vabToken.address, this.USDC.address
    )).deployed(); 

    this.UniHelper = await (await this.UniHelperFactory.deploy(
      CONFIG.mumbai.uniswap.factory, CONFIG.mumbai.uniswap.router, CONFIG.mumbai.sushiswap.factory, CONFIG.mumbai.sushiswap.router
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
      await this.FactoryFilmNFTFactory.deploy(this.Ownablee.address, this.UniHelper.address)
    ).deployed();   

    this.SubNFT = await (
      await this.FactorySubNFTFactory.deploy(this.Ownablee.address, this.UniHelper.address)
    ).deployed();   

    this.VabbleDAO = await (
      await this.VabbleDAOFactory.deploy(
        this.Ownablee.address,
        this.UniHelper.address,
        this.Vote.address,
        this.StakingPool.address,
        this.Property.address,
        this.FilmNFT.address
      )
    ).deployed();     
    
    this.VabbleFunding = await (
      await this.VabbleFundingFactory.deploy(
        this.Ownablee.address,      // Ownablee contract
        this.UniHelper.address,     // UniHelper contract
        this.StakingPool.address,   // StakingPool contract
        this.Property.address,      // Property contract
        this.FilmNFT.address,// film NFT Factory contract
        this.VabbleDAO.address 
      )
    ).deployed(); 
    
    this.TierNFT = await (
      await this.FactoryTierNFTFactory.deploy(
        this.Ownablee.address,      // Ownablee contract
        this.VabbleDAO.address,
        this.VabbleFunding.address
      )
    ).deployed(); 

    this.Subscription = await (
      await this.SubscriptionFactory.deploy(
        this.Ownablee.address,
        this.UniHelper.address,
        this.Property.address
      )
    ).deployed();    
    
    await this.FilmNFT.connect(this.auditor).initializeFactory(
      this.VabbleDAO.address, 
      this.VabbleFunding.address,
      this.StakingPool.address,
      this.Property.address,
      {from: this.auditor.address}
    );    
    

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
    
    await this.vabToken.connect(this.customer1).approve(this.VabbleFunding.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.VabbleFunding.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.VabbleFunding.address, getBigNumber(100000000)); 

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
    await this.vabToken.connect(this.studio1).approve(this.VabbleFunding.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.VabbleFunding.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.VabbleFunding.address, getBigNumber(100000000));       
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

    // Initialize StakingPool
    await this.StakingPool.connect(this.auditor).initializePool(
      this.VabbleDAO.address,
      this.VabbleFunding.address,
      this.Property.address,
      this.Vote.address,
      {from: this.auditor.address}
    )  
    // Initialize Vote contract
    await this.Vote.connect(this.auditor).initializeVote(
      this.VabbleDAO.address,
      this.StakingPool.address,
      this.Property.address,
    )
    // Initialize Ownablee contract
    await this.Ownablee.connect(this.auditor).setup(
      this.Vote.address,
      this.VabbleDAO.address,
      this.StakingPool.address,
    )
    
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

  it('Staking and unstaking, withdraw VAB token with two options', async function () {   
    const stakingAmount = getBigNumber(2000)
    await this.StakingPool.connect(this.customer1).stakeVAB(stakingAmount, {from: this.customer1.address})
    expect(await this.StakingPool.getStakeAmount(this.customer1.address)).to.be.equal(stakingAmount)
            
    // => Increase next block timestamp for only testing
    let period = 31 * 24 * 3600; // lockPeriod = 30 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');
    
    // Add reward from auditor
    const rewardAmount = getBigNumber(100)
    await this.StakingPool.connect(this.auditor).addRewardToPool(rewardAmount, {from: this.auditor.address})
    expect(await this.StakingPool.totalRewardAmount()).to.be.equal(rewardAmount)

    const stakingInfo1 = await this.StakingPool.stakeInfo(this.customer1.address)
    let userRewardAmount = await this.StakingPool.calcRewardAmount(this.customer1.address)

    let aprAnyAmount = await this.StakingPool.calculateAPR(
      getBigNumber(365, 0), getBigNumber(20000), 10, 10, 2, false
    )

    console.log('===userRewardAmount-start::', aprAnyAmount.toString())
    // 0.248000000000000000 => 2000 staked
    // 2.920000000000000000 => 2000 staked
    // 29.200000000000000000 => 20000 staked

    // 21.900000000000000000 => 20000 staked


    // =========== withdrawReward with option - 1
    let txx = await this.StakingPool.connect(this.customer1).withdrawReward(1, {from: this.customer1.address})
    this.events = (await txx.wait()).events
    let rargs = this.events[0].args
    expect(rargs.staker).to.be.equal(this.customer1.address)
    expect(rargs.isCompound).to.be.equal(1)
    // console.log('====withdraw ragrs::', rargs.conTime.toString())
    
    const stakingInfo2 = await this.StakingPool.stakeInfo(this.customer1.address)
    expect(stakingInfo2.stakeAmount).to.be.equal(BigNumber.from(userRewardAmount).add(stakingInfo1.stakeAmount))
    expect(stakingInfo2.voteCount).to.be.equal(stakingInfo1.voteCount)

    // =========== withdrawReward with option - 0
    await expect(
      this.StakingPool.connect(this.customer1).withdrawReward(0, {from: this.customer1.address})
    ).to.be.revertedWith('withdrawReward: lock period yet');

    // => Increase next block timestamp for only testing
    period = 31 * 24 * 3600; // lockPeriod = 30 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    userRewardAmount = await this.StakingPool.calcRewardAmount(this.customer1.address)
    txx = await this.StakingPool.connect(this.customer1).withdrawReward(0, {from: this.customer1.address})
    this.events = (await txx.wait()).events
    rargs = this.events[1].args
    expect(rargs.staker).to.be.equal(this.customer1.address)
    expect(rargs.rewardAmount).to.be.equal(userRewardAmount)

    const stakingInfo3 = await this.StakingPool.stakeInfo(this.customer1.address)
    expect(stakingInfo2.stakeAmount).to.be.equal(stakingInfo3.stakeAmount)


    // ============= calculate reward amount
    userRewardAmount = await this.StakingPool.calcRewardAmount(this.customer1.address)
    console.log('===userRewardAmount-0::', userRewardAmount.toString())

    // => Increase next block timestamp for only testing
    period = 1 * 24 * 3600; // lockPeriod = 30 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    userRewardAmount = await this.StakingPool.calcRewardAmount(this.customer1.address)
    console.log('===userRewardAmount-1::', userRewardAmount.toString())

    // => Increase next block timestamp for only testing
    period = 2 * 24 * 3600; // lockPeriod = 30 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    userRewardAmount = await this.StakingPool.calcRewardAmount(this.customer1.address)
    console.log('===userRewardAmount-2::', userRewardAmount.toString())

    const nftRight = [getBigNumber(1,0), getBigNumber(2,0)]
    const sharePercents = [getBigNumber(60, 8), getBigNumber(15, 8), getBigNumber(25, 8)]
    const studioPayees = [this.customer1.address, this.customer2.address, this.customer3.address]
    const raiseAmount = getBigNumber(150, 6)
    const fundPeriod = getBigNumber(20, 0)
    const fundType = getBigNumber(3, 0)
    const title4 = 'film title - 4'
    const desc4 = 'film description - 4'
    const enableClaimer = 1;
    // Create proposal for a film by studio {from: this.studio1.address}
    let ethVal = ethers.utils.parseEther('1')
    await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(0, 0, CONFIG.addressZero, {from: this.studio1.address, value: ethVal})
    await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
      getBigNumber(1, 0), 
      title4,
      desc4,
      sharePercents, 
      studioPayees,  
      raiseAmount, 
      fundPeriod, 
      enableClaimer,
      {from: this.studio1.address}
    )
    
    await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(0, 0, CONFIG.addressZero, {from: this.studio1.address, value: ethVal})
    await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
      getBigNumber(2, 0), 
      title4,
      desc4,
      sharePercents, 
      studioPayees,  
      raiseAmount, 
      fundPeriod, 
      enableClaimer,
      {from: this.studio1.address}
    )
    
    await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(0, 0, CONFIG.addressZero, {from: this.studio1.address, value: ethVal})
    await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
      getBigNumber(3, 0), 
      title4,
      desc4,
      sharePercents, 
      studioPayees,  
      raiseAmount, 
      fundPeriod, 
      enableClaimer,
      {from: this.studio1.address}
    )
    
    userRewardAmount = await this.StakingPool.calcRewardAmount(this.customer1.address)
    console.log('===userRewardAmount-after create film proposal::', userRewardAmount.toString())

    /// Vote to Films 
    const proposalIds = await this.VabbleDAO.getFilmIds(1); // 1, 2
    console.log('=====proposalIds::', proposalIds.length)
    const voteInfos = [1, 1];
    // await this.Vote.connect(this.customer1).voteToFilms(proposalIds, voteInfos, {from: this.customer1.address})
    await this.Vote.connect(this.customer1).voteToFilms([1], [1], {from: this.customer1.address})
    
    userRewardAmount = await this.StakingPool.calcRewardAmount(this.customer1.address)
    console.log('===userRewardAmount-after vote::', userRewardAmount.toString()) // 240028800000000000

    // => Increase next block timestamp for only testing
    period = 28 * 24 * 3600; // lockPeriod = 30 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    const list = await this.Vote.getFundingFilmIdsPerUser(this.customer1.address)
    console.log('===list-before withdraw::', list.length)

    // await expect(
    //   this.StakingPool.connect(this.customer1).withdrawReward(0, {from: this.customer1.address})
    // ).to.emit(this.StakingPool, 'RewardWithdraw').withArgs(this.customer1.address, userRewardAmount);

    await this.vabToken.connect(this.auditor).approve(this.Ownablee.address, getBigNumber(100000000));
    await this.Ownablee.connect(this.auditor).depositVABToEdgePool(getBigNumber(2000))

    let c2_balance = await this.vabToken.balanceOf(this.customer2.address)
    console.log('=======c2_balance before::', c2_balance.toString())
    const tx = await this.StakingPool.connect(this.auditor).withdrawAllFund(this.customer2.address)
    this.events = (await tx.wait()).events
    // console.log('=======events::', this.events)
    const arg = this.events[2].args
    const wAmount = arg.amount
    console.log('=======wAmount::', wAmount.toString())
    // 50000190000000000000000000
    // 50000190000000000000000000
    c2_balance = await this.vabToken.balanceOf(this.customer2.address)
    console.log('=======c2_balance after::', c2_balance.toString())
  });

  // it('Staking and unstaking, withdraw VAB token with min value', async function () {   
  //   // Staking VAB token
  //   await expect(
  //     this.StakingPool.connect(this.customer1).stakeVAB(getBigNumber(1, 16), {from: this.customer1.address})
  //   ).to.be.revertedWith('stakeVAB: less amount than 0.01');

  //   await this.StakingPool.connect(this.customer1).stakeVAB(getBigNumber(2, 16), {from: this.customer1.address})
  //   expect(await this.StakingPool.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(2, 16))
    
  //   console.log('===isInitialized::', await this.StakingPool.isInitialized())
  //   // unstaking VAB token
  //   await expect(
  //     this.StakingPool.connect(this.customer1).unstakeVAB(getBigNumber(2, 16), {from: this.customer1.address})
  //   ).to.be.revertedWith('unstakeVAB: lock period yet');
        
  //   // => Increase next block timestamp for only testing
  //   const period = 31 * 24 * 3600; // lockPeriod = 30 days
  //   network.provider.send('evm_increaseTime', [period]);
  //   await network.provider.send('evm_mine');

  //   await this.StakingPool.connect(this.customer1).unstakeVAB(getBigNumber(2, 16), {from: this.customer1.address})
  //   expect(await this.StakingPool.getStakeAmount(this.customer1.address)).to.be.equal(0)

  //   //========= withdrawReward
  //   await this.StakingPool.connect(this.customer1).stakeVAB(getBigNumber(2, 16), {from: this.customer1.address})

  //   // => Increase next block timestamp for only testing
  //   network.provider.send('evm_increaseTime', [period]);
  //   await network.provider.send('evm_mine');

  //   const rewardA = await this.StakingPool.calcRewardAmount(this.customer1.address)
  //   let totalReward = await this.StakingPool.totalRewardAmount()
  //   console.log('===rewardAmount::', rewardA.toString(), totalReward.toString())
  //   await expect(
  //     this.StakingPool.connect(this.customer1).withdrawReward(0, {from: this.customer1.address})
  //   ).to.be.revertedWith('withdrawReward: Insufficient total reward amount');

    
  //   // Add reward from auditor
  //   const rewardAmount = getBigNumber(100)
  //   await this.StakingPool.connect(this.auditor).addRewardToPool(rewardAmount, {from: this.auditor.address})
  //   expect(await this.StakingPool.totalRewardAmount()).to.be.equal(rewardAmount)

  //   await expect(
  //     this.StakingPool.connect(this.customer1).withdrawReward(0, {from: this.customer1.address})
  //   ).to.emit(this.StakingPool, 'RewardWithdraw').withArgs(this.customer1.address, rewardA);

  //   totalReward = await this.StakingPool.totalRewardAmount()
  //   console.log('===rewardAmount::', rewardA.toString(), totalReward.toString())
  // });

  // it('Staking and unstaking VAB token', async function () {   
  //   // Staking VAB token
  //   await this.StakingPool.connect(this.customer1).stakeVAB(getBigNumber(100), {from: this.customer1.address})
  //   await this.StakingPool.connect(this.customer2).stakeVAB(getBigNumber(150), {from: this.customer2.address})
  //   await this.StakingPool.connect(this.customer3).stakeVAB(getBigNumber(300), {from: this.customer3.address})
  //   expect(await this.StakingPool.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(100))
  //   expect(await this.StakingPool.getStakeAmount(this.customer2.address)).to.be.equal(getBigNumber(150))
  //   expect(await this.StakingPool.getStakeAmount(this.customer3.address)).to.be.equal(getBigNumber(300))
    
  //   console.log('===isInitialized::', await this.StakingPool.isInitialized())
  //   // unstaking VAB token
  //   await expect(
  //     this.StakingPool.connect(this.customer1).unstakeVAB(getBigNumber(70), {from: this.customer1.address})
  //   ).to.be.revertedWith('unstakeVAB: lock period yet');
        
  //   console.log('===test::0')
  //   // => Increase next block timestamp for only testing
  //   const period = 31 * 24 * 3600; // lockPeriod = 30 days
  //   network.provider.send('evm_increaseTime', [period]);
  //   await network.provider.send('evm_mine');

  //   await this.StakingPool.connect(this.customer1).unstakeVAB(getBigNumber(70), {from: this.customer1.address})
  //   console.log('===isInitialized::', 'ok')
  //   expect(await this.StakingPool.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(30))
  // });

  // it('Staking and unstaking VAB token when voting', async function () { 
  //   // Staking VAB token
  //   const stakeAmount = getBigNumber(100)
  //   await this.StakingPool.connect(this.customer1).stakeVAB(stakeAmount, {from: this.customer1.address})
  //   await this.StakingPool.connect(this.customer2).stakeVAB(stakeAmount, {from: this.customer2.address})
  //   await this.StakingPool.connect(this.studio1).stakeVAB(stakeAmount, {from: this.studio1.address})
  //   expect(await this.StakingPool.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(100))

  //   let w_t = await this.StakingPool.getWithdrawableTime(this.customer1.address);
  //   console.log("=====w-t after staking::", w_t.toString())

  //   // Create proposal for 2 films by studio    
  //   const nftRight = [getBigNumber(1,0), getBigNumber(2,0)]
  //   const sharePercents = [getBigNumber(10, 8), getBigNumber(15, 8), getBigNumber(25, 8)]
  //   const studioPayees = [this.customer1.address, this.customer2.address, this.customer3.address]
  //   const raiseAmount = getBigNumber(150, 6)
  //   const fundPeriod = getBigNumber(20, 0)
  //   const fundType = getBigNumber(3, 0)
    
  //   // Create proposal for a film by studio
  //   await this.VabbleDAO.connect(this.studio1).proposalFilmCreate([0, 0], this.vabToken.address, {from: this.studio1.address})
  //   await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
  //     getBigNumber(1, 0), 
  //     nftRight, 
  //     sharePercents, 
  //     studioPayees, 
  //     raiseAmount, 
  //     fundPeriod, 
  //     fundType,
  //     {from: this.studio1.address}
  //   )
  //   await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
  //     getBigNumber(2, 0), 
  //     nftRight, 
  //     sharePercents, 
  //     studioPayees, 
  //     raiseAmount, 
  //     fundPeriod, 
  //     fundType,
  //     {from: this.studio1.address}
  //   )
    
  //   // initialize vote contract
  //   await this.Vote.connect(this.auditor).initializeVote(
  //     this.VabbleDAO.address, 
  //     this.StakingPool.address, 
  //     this.Property.address,
  //     {from: this.auditor.address}
  //   );
  //   expect(await this.Vote.isInitialized()).to.be.true
    
  //   // => Increase next block timestamp for only testing
  //   const period_1 = 5 * 24 * 3600; // 5 days
  //   network.provider.send('evm_increaseTime', [period_1]);
  //   await network.provider.send('evm_mine');

  //   await expect(
  //     this.StakingPool.connect(this.customer1).unstakeVAB(getBigNumber(70), {from: this.customer1.address})
  //   ).to.be.revertedWith('unstakeVAB: lock period yet');
  //   console.log('=====test-0')
  //   // customer1 vote to films
  //   const proposalIds = await this.VabbleDAO.getFilmIds(1); // 1, 2
  //   const voteInfos = [1, 1];
  //   // const voteData1 = getVoteData(proposalIds, voteInfos)    
  //   await this.Vote.connect(this.customer2).voteToFilms(proposalIds, voteInfos, {from: this.customer2.address})
  //   console.log('=====test-1')
  //   // const voteData = getVoteData([1], [1])
  //   await this.Vote.connect(this.customer1).voteToFilms(proposalIds, voteInfos, {from: this.customer1.address})

  //   // => Increase next block timestamp for only testing
  //   const period_2 = 9 * 24 * 3600; // 9 days
  //   network.provider.send('evm_increaseTime', [period_2]);
  //   await network.provider.send('evm_mine');

  //   // w_t = await this.StakingPool.getWithdrawableTime(this.customer1.address);
  //   // console.log("=====w-t after 34 days::", w_t.toString())
  //   await expect(
  //     this.StakingPool.connect(this.customer1).unstakeVAB(getBigNumber(70), {from: this.customer1.address})
  //   ).to.be.revertedWith('unstakeVAB: lock period yet');

  //   // => Increase next block timestamp
  //   const period_3 = 20 * 24 * 3600; // 20 days
  //   network.provider.send('evm_increaseTime', [period_3]);
  //   await network.provider.send('evm_mine');

  //   const rewardRate = await this.Property.rewardRate()
  //   const lockPeriod = await this.Property.lockPeriod()
  //   const timePercent = (BigNumber.from(period_1).add(period_2).add(period_3)).mul(10000).div(lockPeriod);
  //   const expectRewardAmount = BigNumber.from(stakeAmount).mul(timePercent).mul(rewardRate).div(getBigNumber(1,10)).div(10000);

  //   const tx = await this.StakingPool.connect(this.customer1).unstakeVAB(getBigNumber(70), {from: this.customer1.address})
  //   this.events = (await tx.wait()).events
  //   const arg_reward = this.events[1].args
  //   const arg_unstake = this.events[3].args    
  //   expect(arg_reward.staker).to.be.equal(this.customer1.address)
  //   console.log(
  //     '====arg_reward.rewardAmount::', 
  //     arg_unstake.unStakeAmount.toString(), 
  //     await this.StakingPool.getStakeAmount(this.customer1.address).toString()
  //   )
  //   expect(arg_reward.rewardAmount).to.be.equal(expectRewardAmount)//0.00036000 0000000000
  //   expect(arg_unstake.unstaker).to.be.equal(this.customer1.address)
  //   expect(arg_unstake.unStakeAmount).to.be.equal(getBigNumber(70))
  //   expect(await this.StakingPool.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(30))
  // });

  // it('AddReward and WithdrawReward with VAB token', async function() {
  //   const stakeAmount = getBigNumber(100)
  //   await this.StakingPool.connect(this.customer1).stakeVAB(stakeAmount, {from: this.customer1.address})
  //   await this.StakingPool.connect(this.customer2).stakeVAB(stakeAmount, {from: this.customer2.address})

  //   // Add reward from auditor
  //   const rewardAmount = getBigNumber(1000)
  //   await this.StakingPool.connect(this.auditor).addRewardToPool(rewardAmount, {from: this.auditor.address})
  //   expect(await this.StakingPool.totalRewardAmount()).to.be.equal(rewardAmount)
    
  //   console.log('======test-1')
  //   // deposit VAB token
  //   await this.StakingPool.connect(this.studio1).depositVAB(rewardAmount, {from: this.studio1.address})
    
  //   // proposalFilmBoard
  //   const VABBalance = await this.vabToken.balanceOf(this.customer1.address)
  //   await this.Property.connect(this.customer1).proposalFilmBoard(this.customer2.address, 'test-1', 'desc-1', {from: this.customer1.address})
    
  //   console.log('======test-2')
  //   const total = await this.StakingPool.totalRewardAmount()
  //   expect(total).to.be.above(rewardAmount.mul(2))
    
  //   // Withdraw reward
  //   let w_t = await this.StakingPool.getWithdrawableTime(this.customer1.address);
  //   console.log("=====w-t after staking::", w_t.toString())
  //   await expect(
  //     this.StakingPool.connect(this.customer1).withdrawReward(0, {from: this.customer1.address})
  //   ).to.be.revertedWith('withdrawReward: lock period yet');
    
  //   // vote to voteToFilmBoard for getting rewards
  //   await this.Vote.connect(this.customer1).voteToFilmBoard(this.customer2.address, 1, {from:this.customer1.address})

  //   const period = 30 * 24 * 3600; // lockPeriod = 30 days
  //   network.provider.send('evm_increaseTime', [period]);
  //   await network.provider.send('evm_mine');

  //   let rewardRate = await this.Property.rewardRate()
  //   console.log('=====rewards compare')
  //   const tx = await this.StakingPool.connect(this.customer1).withdrawReward(0, {from: this.customer1.address})
  //   this.events = (await tx.wait()).events
  //   const arg = this.events[1].args
  //   console.log('====arg::', arg.rewardAmount.toString(), rewardRate.toString())
  //   expect(arg.staker).to.be.equal(this.customer1.address)
  //   expect(arg.rewardAmount).to.be.equal(stakeAmount.mul(rewardRate).div(getBigNumber(1,10)))//0.01 VAB

  //   const period_2 = 30 * 24 * 3600; // lockPeriod = 30 days
  //   network.provider.send('evm_increaseTime', [period_2]);
  //   await network.provider.send('evm_mine');

  //   rewardRate = await this.Property.rewardRate()
  //   const lockPeriod = await this.Property.lockPeriod()
  //   const timePercent = BigNumber.from(period_2).mul(10000).div(lockPeriod);
  //   const expectRewardAmount = BigNumber.from(stakeAmount).mul(timePercent).mul(rewardRate).div(getBigNumber(1,10)).div(10000);

  //   const tx_new = await this.StakingPool.connect(this.customer1).withdrawReward(0, {from: this.customer1.address})
  //   this.events = (await tx_new.wait()).events
  //   const arg_new = this.events[1].args
  //   expect(arg_new.staker).to.be.equal(this.customer1.address)
  //   expect(arg_new.rewardAmount).to.be.equal(expectRewardAmount)//0.01 VAB
  // });

  // it('withdraw rewards VAB token when voting for funding films', async function () {  
  //   expect(await this.Vote.isInitialized()).to.be.true
    
  //   // Staking VAB token
  //   // lockPeriod = 30 days as default
  //   const stakeAmount = getBigNumber(1000)
  //   const stakeAmount1 = getBigNumber(80000000)
  //   await this.StakingPool.connect(this.customer1).stakeVAB(stakeAmount1, {from: this.customer1.address})
  //   await this.StakingPool.connect(this.customer2).stakeVAB(stakeAmount, {from: this.customer2.address})
  //   await this.StakingPool.connect(this.studio1).stakeVAB(stakeAmount, {from: this.studio1.address})
  //   expect(await this.StakingPool.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(80000000))

  //   // WithdrawableTime after staking
  //   let w_t = await this.StakingPool.getWithdrawableTime(this.customer1.address);
  //   let _t = BigNumber.from(w_t).div(86400)
  //   console.log("=====WithdrawableTime after staking::", _t.toString())

  //   // Create proposal for 2 funding films by studio    
  //   const nftRight = [getBigNumber(1,0), getBigNumber(2,0)]
  //   const sharePercents = [getBigNumber(10, 8), getBigNumber(15, 8), getBigNumber(25, 8)]
  //   const studioPayees = [this.customer1.address, this.customer2.address, this.customer3.address]
  //   const raiseAmount = getBigNumber(150, 6)
  //   const fundPeriod = getBigNumber(20, 0)
  //   const fundType = getBigNumber(3, 0)
    
  //   // Create proposal for a film by studio
  //   await this.VabbleDAO.connect(this.studio1).proposalFilmCreate([0, 0], this.vabToken.address, {from: this.studio1.address})
  //   await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
  //     getBigNumber(1, 0), 
  //     nftRight, 
  //     sharePercents, 
  //     studioPayees, 
  //     raiseAmount, 
  //     fundPeriod, 
  //     fundType,
  //     {from: this.studio1.address}
  //   )
  //   await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
  //     getBigNumber(2, 0), 
  //     nftRight, 
  //     sharePercents, 
  //     studioPayees, 
  //     raiseAmount, 
  //     fundPeriod, 
  //     fundType,
  //     {from: this.studio1.address}
  //   )
    
  //   // => Increase next block timestamp
  //   const period_0 = 5 * 24 * 3600; // 5 days
  //   network.provider.send('evm_increaseTime', [period_0]);
  //   await network.provider.send('evm_mine');

  //   // customer1,2 vote to films after 5 days 
  //   // filmVotePeriod = 10 days as default
  //   // Example: withdrawTime is 6/15 and voteStartTime is 6/10, votePeriod is 10 days => withdrawTime is sum(6/20)
  //   // so, staker cannot unstake his amount till 6/20
  //   const proposalIds = await this.VabbleDAO.getFilmIds(1); // 1, 2
  //   const voteInfos = [1, 1];
  //   // const voteData = getVoteData(proposalIds, voteInfos)
  //   await this.Vote.connect(this.customer1).voteToFilms(proposalIds, voteInfos, {from: this.customer1.address})
  //   await this.Vote.connect(this.customer2).voteToFilms(proposalIds, voteInfos, {from: this.customer2.address})
    
  //   // WithdrawableTime after vote
  //   w_t = await this.StakingPool.getWithdrawableTime(this.customer1.address);
  //   _t = BigNumber.from(w_t).div(86400)
  //   console.log("=====WithdrawableTime after vote::", _t.toString())

  //   // => Increase next block timestamp
  //   const period_1 = 25 * 24 * 3600; // 25 days
  //   network.provider.send('evm_increaseTime', [period_1]);
  //   await network.provider.send('evm_mine');

  //   // => Change the minVoteCount from 5 ppl to 3 ppl for testing
  //   await this.Property.connect(this.auditor).updatePropertyForTesting(2, 18, {from: this.auditor.address})

  //   // Approve films 1,2
  //   const approveData = [proposalIds[0], proposalIds[1]]
  //   await expect(
  //     this.Vote.connect(this.customer1).approveFilms(approveData, {from: this.customer1.address})
  //   )
  //   .to.emit(this.Vote, 'FilmsApproved')
  //   .withArgs([getBigNumber(1,0), getBigNumber(2,0)]);

  //   // Deposit to funding films from customer3(investor)
  //   const depositAmount = getBigNumber(100000)
  //   await this.VabbleFunding.connect(this.customer3).depositToFilm(
  //     proposalIds[0], depositAmount, this.vabToken.address, {from: this.customer3.address}
  //   )

  //   console.log('=====1')
  //   // => Increase next block timestamp
  //   const period_3 = 20 * 24 * 3600; // 20 days
  //   network.provider.send('evm_increaseTime', [period_3]);
  //   await network.provider.send('evm_mine');

  //   const rewardRate = await this.Property.rewardRate()
  //   const lockPeriod = await this.Property.lockPeriod()
  //   const timePercent = (BigNumber.from(period_1).add(period_0).add(period_3)).mul(10000).div(lockPeriod);
  //   const expectRewardAmount = BigNumber.from(stakeAmount1).mul(timePercent).mul(rewardRate).div(getBigNumber(1,10)).div(10000);

  //   console.log('=====2')
  //   const totalRewardAmount = await this.StakingPool.totalRewardAmount()
  //   const extraRewardRate = await this.Property.extraRewardRate();  
  //   const extraExpectRewardAmount = BigNumber.from(totalRewardAmount).mul(extraRewardRate).div(getBigNumber(1,10));
    
  //   const raisingAmount = await this.VabbleFunding.getRaisedAmountByToken(proposalIds[0])
  //   const {
  //     nftRight_,
  //     sharePercents_,
  //     studioPayees_,
  //     gatingType_,
  //     rentPrice_,
  //   } = await this.VabbleDAO.getFilmById(proposalIds[0])
  //   const isRaised = await this.VabbleFunding.isRaisedFullAmount(proposalIds[0])

  //   // Check user balance before withdrawReward    
  //   let customer1V_1 = await this.vabToken.balanceOf(this.customer1.address)
  //   console.log('===customer1V before withdraw::', customer1V_1.toString())

  //   const tx = await this.StakingPool.connect(this.customer1).withdrawReward(0, {from: this.customer1.address})
  //   this.events = (await tx.wait()).events
  //   const arg_reward = this.events[1].args
  //   console.log('test-1', arg_reward)

  //   expect(arg_reward.staker).to.be.equal(this.customer1.address)
    
  //   console.log('====arg_reward=reward, expect, total, isRaise, raiseAmount, raisedAmount::', 
  //     arg_reward.rewardAmount.toString(), //      7271109466218059
  //     expectRewardAmount.toString(),      //      6666400000000000 
  //     extraExpectRewardAmount.toString(), //       604709466218059
  //     totalRewardAmount.toString(),       //9066108938801491315813
  //     isRaised,                           // true
  //     raisingAmount.toString()            //499248873
  //   )
    
  //   expect(arg_reward.rewardAmount).to.be.equal(BigNumber.from(expectRewardAmount).add(extraExpectRewardAmount))
  //   expect(arg_reward.staker).to.be.equal(this.customer1.address)

  //   // Check user balance before withdrawReward    
  //   const customer1V_2 = await this.vabToken.balanceOf(this.customer1.address)
  //   console.log('===customer1V after withdraw::', customer1V_2.toString())
  //   expect(customer1V_2).to.be.equal(BigNumber.from(customer1V_1).add(arg_reward.rewardAmount))
    
  //   // =========== check filmIdsPerUser
  //   const ids_arr = await this.Vote.getFundingFilmIdsPerUser(this.customer1.address)
  //   console.log('===ids_arr::', ids_arr.length)
  // });
});
