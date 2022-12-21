const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');
const ERC20 = require('../data/ERC20.json');
const { CONFIG, getBigNumber, getProposalFilm, getVoteData } = require('../scripts/utils');

describe('StakingPool', function () {
  before(async function () {
    this.VabbleDAOFactory = await ethers.getContractFactory('VabbleDAO');
    this.VoteFactory = await ethers.getContractFactory('Vote');
    this.UniHelperFactory = await ethers.getContractFactory('UniHelper');
    this.StakingPoolFactory = await ethers.getContractFactory('StakingPool');
    this.PropertyFactory = await ethers.getContractFactory('Property');
    this.OwnableFactory = await ethers.getContractFactory('Ownablee');
    this.NFTFilmFactory = await ethers.getContractFactory('FactoryFilmNFT');

    this.signers = await ethers.getSigners();
    this.auditor = this.signers[0];
    this.newAuditor = this.signers[1];    
    this.studio1 = this.signers[2];    
    this.studio2 = this.signers[3];       
    this.studio3 = this.signers[4]; 
    this.customer1 = this.signers[5];
    this.customer2 = this.signers[6];
    this.customer3 = this.signers[7]; // investor
  });

  beforeEach(async function () {
    this.vabToken = new ethers.Contract(CONFIG.mumbai.vabToken, JSON.stringify(ERC20), ethers.provider);
    this.DAI = new ethers.Contract(CONFIG.mumbai.daiAddress, JSON.stringify(ERC20), ethers.provider);
    this.EXM = new ethers.Contract(CONFIG.mumbai.exmAddress, JSON.stringify(ERC20), ethers.provider);
    this.USDC = new ethers.Contract(CONFIG.mumbai.usdcAdress, JSON.stringify(ERC20), ethers.provider);

    this.ownableContract = await (await this.OwnableFactory.deploy(CONFIG.daoWalletAddress)).deployed(); 

    this.voteContract = await (await this.VoteFactory.deploy(this.ownableContract.address)).deployed();

    this.uniHelperContract = await (await this.UniHelperFactory.deploy(
      CONFIG.mumbai.uniswap.factory, CONFIG.mumbai.uniswap.router, CONFIG.mumbai.sushiswap.factory, CONFIG.mumbai.sushiswap.router
    )).deployed();

    this.stakingContract = await (await this.StakingPoolFactory.deploy(this.ownableContract.address)).deployed(); 
        
    this.propertyContract = await (
      await this.PropertyFactory.deploy(
        this.vabToken.address,
        this.ownableContract.address,
        this.voteContract.address,
        this.stakingContract.address,
        this.uniHelperContract.address,
        this.USDC.address
      )
    ).deployed();

    this.NFTFilmContract = await (
      await this.NFTFilmFactory.deploy(this.ownableContract.address)
    ).deployed();  

    this.DAOContract = await (
      await this.VabbleDAOFactory.deploy(
        this.ownableContract.address,
        this.voteContract.address,
        this.stakingContract.address,
        this.uniHelperContract.address,
        this.propertyContract.address,
        this.NFTFilmContract.address
      )
    ).deployed();    

    // Transfering VAB token to user1, 2, 3
    await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(100000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer2.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer3.address, getBigNumber(10000000), {from: this.auditor.address});
    // Transfering VAB token to studio1, 2, 3
    await this.vabToken.connect(this.auditor).transfer(this.studio1.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio2.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio3.address, getBigNumber(10000000), {from: this.auditor.address});

    // Approve to transfer VAB token for each user, studio to DAO, StakingPool
    await this.vabToken.connect(this.customer1).approve(this.DAOContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.DAOContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.DAOContract.address, getBigNumber(100000000));   

    await this.vabToken.connect(this.customer1).approve(this.stakingContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.stakingContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.stakingContract.address, getBigNumber(100000000));

    await this.vabToken.connect(this.customer1).approve(this.propertyContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.propertyContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.propertyContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio1).approve(this.propertyContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.propertyContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.propertyContract.address, getBigNumber(100000000));

    await this.vabToken.connect(this.studio1).approve(this.DAOContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.DAOContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.DAOContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio1).approve(this.stakingContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.stakingContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.stakingContract.address, getBigNumber(100000000));

    await this.vabToken.connect(this.auditor).approve(this.stakingContract.address, getBigNumber(100000000));      

    this.rentPrices = [getBigNumber(100,6), getBigNumber(200,6), getBigNumber(300,6), getBigNumber(400,6)];
    this.fundPeriods = [getBigNumber(20 * 86400, 0), getBigNumber(30 * 86400, 0), getBigNumber(60 * 86400, 0), getBigNumber(10 * 86400, 0)];
    this.events = [];

    const assetList = [CONFIG.addressZero, CONFIG.mumbai.usdcAdress, CONFIG.mumbai.vabToken, CONFIG.mumbai.daiAddress, CONFIG.mumbai.exmAddress]
    await this.ownableContract.connect(this.auditor).addDepositAsset(assetList, {from: this.auditor.address});
  });

  // it('Staking and unstaking VAB token', async function () {      
  //   // Initialize StakingPool
  //   await this.stakingContract.connect(this.auditor).initializePool(
  //     this.DAOContract.address,
  //     this.voteContract.address,
  //     this.propertyContract.address,
  //     {from: this.auditor.address}
  //   )
  //   // Staking VAB token
  //   await this.stakingContract.connect(this.customer1).stakeVAB(getBigNumber(100), {from: this.customer1.address})
  //   await this.stakingContract.connect(this.customer2).stakeVAB(getBigNumber(150), {from: this.customer2.address})
  //   await this.stakingContract.connect(this.customer3).stakeVAB(getBigNumber(300), {from: this.customer3.address})
  //   expect(await this.stakingContract.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(100))
  //   expect(await this.stakingContract.getStakeAmount(this.customer2.address)).to.be.equal(getBigNumber(150))
  //   expect(await this.stakingContract.getStakeAmount(this.customer3.address)).to.be.equal(getBigNumber(300))
    
  //   console.log('===isInitialized::', await this.stakingContract.isInitialized())
  //   // unstaking VAB token
  //   await expect(
  //     this.stakingContract.connect(this.customer1).unstakeVAB(getBigNumber(70), {from: this.customer1.address})
  //   ).to.be.revertedWith('unstakeVAB: lock period yet');
        
  //   console.log('===test::0')
  //   // => Increase next block timestamp for only testing
  //   const period = 31 * 24 * 3600; // lockPeriod = 30 days
  //   network.provider.send('evm_increaseTime', [period]);
  //   await network.provider.send('evm_mine');

  //   await this.stakingContract.connect(this.customer1).unstakeVAB(getBigNumber(70), {from: this.customer1.address})
  //   console.log('===isInitialized::', 'ok')
  //   expect(await this.stakingContract.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(30))
  // });

  // it('Staking and unstaking VAB token when voting', async function () {  
  //   // Initialize StakingPool
  //   await this.stakingContract.connect(this.auditor).initializePool(
  //     this.DAOContract.address,
  //     this.voteContract.address,      
  //     this.propertyContract.address,
  //     {from: this.auditor.address}
  //   )          
  //   // Staking VAB token
  //   const stakeAmount = getBigNumber(100)
  //   await this.stakingContract.connect(this.customer1).stakeVAB(stakeAmount, {from: this.customer1.address})
  //   await this.stakingContract.connect(this.customer2).stakeVAB(stakeAmount, {from: this.customer2.address})
  //   await this.stakingContract.connect(this.studio1).stakeVAB(stakeAmount, {from: this.studio1.address})
  //   expect(await this.stakingContract.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(100))

  //   let w_t = await this.stakingContract.getWithdrawableTime(this.customer1.address);
  //   console.log("=====w-t after staking::", w_t.toString())
  //   // Create proposal for 2 films by studio    
  //   const raiseAmounts = [getBigNumber(0), getBigNumber(3000, 6)];
  //   const onlyAllowVABs = [true, false];
  //   const film_1 = [this.rentPrices[0], raiseAmounts[0], this.fundPeriods[0], onlyAllowVABs[0], false]
  //   const film_2 = [this.rentPrices[1], raiseAmounts[1], this.fundPeriods[1], onlyAllowVABs[1], false]
  //   this.filmPropsoal = [getProposalFilm(film_1), getProposalFilm(film_2)]    
  //   await this.DAOContract.connect(this.studio1).proposalMultiFilms(this.filmPropsoal, {from: this.studio1.address})
    
  //   // initialize vote contract
  //   await this.voteContract.connect(this.auditor).initializeVote(
  //     this.DAOContract.address, 
  //     this.stakingContract.address, 
  //     this.propertyContract.address,
  //     {from: this.auditor.address}
  //   );
  //   expect(await this.voteContract.isInitialized()).to.be.true
    
  //   // => Increase next block timestamp for only testing
  //   const period_1 = 5 * 24 * 3600; // 5 days
  //   network.provider.send('evm_increaseTime', [period_1]);
  //   await network.provider.send('evm_mine');

  //   await expect(
  //     this.stakingContract.connect(this.customer1).unstakeVAB(getBigNumber(70), {from: this.customer1.address})
  //   ).to.be.revertedWith('unstakeVAB: lock period yet');
  //   console.log('=====test-0')
  //   // customer1 vote to films
  //   const proposalIds = await this.DAOContract.getFilmIds(1); // 1, 2
  //   const voteInfos = [1, 1];
  //   const voteData1 = getVoteData(proposalIds, voteInfos)    
  //   await this.voteContract.connect(this.customer2).voteToFilms(voteData1, {from: this.customer2.address})
  //   console.log('=====test-1')
  //   const voteData = getVoteData([1], [1])
  //   await this.voteContract.connect(this.customer1).voteToFilms(voteData, {from: this.customer1.address})

  //   // => Increase next block timestamp for only testing
  //   const period_2 = 9 * 24 * 3600; // 9 days
  //   network.provider.send('evm_increaseTime', [period_2]);
  //   await network.provider.send('evm_mine');

  //   // w_t = await this.stakingContract.getWithdrawableTime(this.customer1.address);
  //   // console.log("=====w-t after 34 days::", w_t.toString())
  //   await expect(
  //     this.stakingContract.connect(this.customer1).unstakeVAB(getBigNumber(70), {from: this.customer1.address})
  //   ).to.be.revertedWith('unstakeVAB: lock period yet');

  //   // => Increase next block timestamp
  //   const period_3 = 20 * 24 * 3600; // 20 days
  //   network.provider.send('evm_increaseTime', [period_3]);
  //   await network.provider.send('evm_mine');

  //   const rewardRate = await this.propertyContract.rewardRate()
  //   const lockPeriod = await this.propertyContract.lockPeriod()
  //   const timePercent = (BigNumber.from(period_1).add(period_2).add(period_3)).mul(10000).div(lockPeriod);
  //   const expectRewardAmount = BigNumber.from(stakeAmount).mul(timePercent).mul(rewardRate).div(getBigNumber(1,10)).div(10000).div(2);

  //   const tx = await this.stakingContract.connect(this.customer1).unstakeVAB(getBigNumber(70), {from: this.customer1.address})
  //   this.events = (await tx.wait()).events
  //   const arg_reward = this.events[1].args
  //   const arg_unstake = this.events[3].args    
  //   expect(arg_reward.staker).to.be.equal(this.customer1.address)
  //   console.log('====arg_reward.rewardAmount::', arg_reward.rewardAmount.toString(), expectRewardAmount.toString())//0.018000000000000000
  //   expect(arg_reward.rewardAmount).to.be.equal(expectRewardAmount)//0.00036000 0000000000
  //   expect(arg_unstake.unstaker).to.be.equal(this.customer1.address)
  //   expect(arg_unstake.unStakeAmount).to.be.equal(getBigNumber(70))
  //   expect(await this.stakingContract.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(30))
  // });

  it('AddReward and WithdrawReward with VAB token', async function() {
    // Initialize StakingPool
    await this.stakingContract.connect(this.auditor).initializePool(
      this.DAOContract.address,
      this.voteContract.address,
      this.propertyContract.address,
      {from: this.auditor.address}
    )   
    // Initialize Vote
    await this.voteContract.connect(this.auditor).initializeVote(
      this.DAOContract.address,
      this.stakingContract.address,
      this.propertyContract.address,
      {from: this.auditor.address}
    )    

    const stakeAmount = getBigNumber(100)
    await this.stakingContract.connect(this.customer1).stakeVAB(stakeAmount, {from: this.customer1.address})
    await this.stakingContract.connect(this.customer2).stakeVAB(stakeAmount, {from: this.customer2.address})

    // Add reward from auditor
    const rewardAmount = getBigNumber(1000)
    await this.stakingContract.connect(this.auditor).addRewardToPool(rewardAmount, {from: this.auditor.address})
    expect(await this.stakingContract.totalRewardAmount()).to.be.equal(rewardAmount)
    
    // deposit VAB token
    await this.stakingContract.connect(this.studio1).depositVAB(rewardAmount, {from: this.studio1.address})
    
    // proposalFilmBoard
    const VABBalance = await this.vabToken.balanceOf(this.customer1.address)
    await this.propertyContract.connect(this.customer1).proposalFilmBoard(this.customer2.address, 'test-1', 'desc-1', {from: this.customer1.address})
    
    const total = await this.stakingContract.totalRewardAmount()
    expect(total).to.be.above(rewardAmount.mul(2))
    
    // Withdraw reward
    let w_t = await this.stakingContract.getWithdrawableTime(this.customer1.address);
    console.log("=====w-t after staking::", w_t.toString())
    await expect(
      this.stakingContract.connect(this.customer1).withdrawReward({from: this.customer1.address})
    ).to.be.revertedWith('withdrawReward: lock period yet');
    
    // vote to voteToFilmBoard for getting rewards
    await this.voteContract.connect(this.customer1).voteToFilmBoard(this.customer2.address, 1, {from:this.customer1.address})

    const period = 30 * 24 * 3600; // lockPeriod = 30 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    let rewardRate = await this.propertyContract.rewardRate()
    console.log('=====rewards compare')
    const tx = await this.stakingContract.connect(this.customer1).withdrawReward({from: this.customer1.address})
    this.events = (await tx.wait()).events
    const arg = this.events[1].args
    console.log('====arg::', arg.rewardAmount.toString(), rewardRate.toString())
    expect(arg.staker).to.be.equal(this.customer1.address)
    expect(arg.rewardAmount).to.be.equal(stakeAmount.mul(rewardRate).div(getBigNumber(1,10)))//0.01 VAB

    const period_2 = 30 * 24 * 3600; // lockPeriod = 30 days
    network.provider.send('evm_increaseTime', [period_2]);
    await network.provider.send('evm_mine');

    rewardRate = await this.propertyContract.rewardRate()
    const lockPeriod = await this.propertyContract.lockPeriod()
    const timePercent = BigNumber.from(period_2).mul(10000).div(lockPeriod);
    const expectRewardAmount = BigNumber.from(stakeAmount).mul(timePercent).mul(rewardRate).div(getBigNumber(1,10)).div(10000);

    const tx_new = await this.stakingContract.connect(this.customer1).withdrawReward({from: this.customer1.address})
    this.events = (await tx_new.wait()).events
    const arg_new = this.events[1].args
    expect(arg_new.staker).to.be.equal(this.customer1.address)
    expect(arg_new.rewardAmount).to.be.equal(expectRewardAmount)//0.01 VAB
  });

  it('withdraw rewards VAB token when voting for funding films', async function () {  
    // Initialize StakingPool
    await this.stakingContract.connect(this.auditor).initializePool(
      this.DAOContract.address,
      this.voteContract.address,
      this.propertyContract.address,
      {from: this.auditor.address}
    )          
    // initialize vote contract
    await this.voteContract.connect(this.auditor).initializeVote(
      this.DAOContract.address, 
      this.stakingContract.address, 
      this.propertyContract.address,
      {from: this.auditor.address}
    );
    expect(await this.voteContract.isInitialized()).to.be.true

    // Staking VAB token
    // lockPeriod = 30 days as default
    const stakeAmount = getBigNumber(1000)
    const stakeAmount1 = getBigNumber(80000000)
    await this.stakingContract.connect(this.customer1).stakeVAB(stakeAmount1, {from: this.customer1.address})
    await this.stakingContract.connect(this.customer2).stakeVAB(stakeAmount, {from: this.customer2.address})
    await this.stakingContract.connect(this.studio1).stakeVAB(stakeAmount, {from: this.studio1.address})
    expect(await this.stakingContract.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(80000000))

    // WithdrawableTime after staking
    let w_t = await this.stakingContract.getWithdrawableTime(this.customer1.address);
    let _t = BigNumber.from(w_t).div(86400)
    console.log("=====WithdrawableTime after staking::", _t.toString())

    // Create proposal for 2 funding films by studio    
    const nftRight = [getBigNumber(1,0), getBigNumber(2,0)]
    const sharePercents = [getBigNumber(10, 8), getBigNumber(15, 8), getBigNumber(25, 8)]
    const choiceAuditor = [getBigNumber(1, 0)]
    const studioPayees = [this.customer1.address, this.customer2.address, this.customer3.address]
    const gatingType = getBigNumber(2, 0)
    const rentPrice = getBigNumber(20000, 6)
    const raiseAmount = getBigNumber(100, 6)
    const fundPeriod = getBigNumber(120, 0)
    const fundStage = getBigNumber(2, 0)
    const fundType = getBigNumber(2, 0)
    // 1. Create proposal for four films by staker(studio)
    this.filmPropsoal = getProposalFilm(nftRight, sharePercents, choiceAuditor, studioPayees, gatingType, rentPrice, raiseAmount, fundPeriod, fundStage, fundType)    
    await this.DAOContract.connect(this.studio1).proposalFilm(this.filmPropsoal, false, {from: this.studio1.address})
    this.filmPropsoal = getProposalFilm(nftRight, sharePercents, choiceAuditor, studioPayees, gatingType, rentPrice, raiseAmount, fundPeriod, fundStage, fundType)    
    await this.DAOContract.connect(this.studio1).proposalFilm(this.filmPropsoal, false, {from: this.studio1.address})

    // => Increase next block timestamp
    const period_0 = 5 * 24 * 3600; // 5 days
    network.provider.send('evm_increaseTime', [period_0]);
    await network.provider.send('evm_mine');

    // customer1,2 vote to films after 5 days 
    // filmVotePeriod = 10 days as default
    // Example: withdrawTime is 6/15 and voteStartTime is 6/10, votePeriod is 10 days => withdrawTime is sum(6/20)
    // so, staker cannot unstake his amount till 6/20
    const proposalIds = await this.DAOContract.getFilmIds(1); // 1, 2
    const voteInfos = [1, 1];
    const voteData = getVoteData(proposalIds, voteInfos)
    await this.voteContract.connect(this.customer1).voteToFilms(voteData, {from: this.customer1.address})
    await this.voteContract.connect(this.customer2).voteToFilms(voteData, {from: this.customer2.address})
    
    // WithdrawableTime after vote
    w_t = await this.stakingContract.getWithdrawableTime(this.customer1.address);
    _t = BigNumber.from(w_t).div(86400)
    console.log("=====WithdrawableTime after vote::", _t.toString())

    // => Increase next block timestamp
    const period_1 = 25 * 24 * 3600; // 25 days
    network.provider.send('evm_increaseTime', [period_1]);
    await network.provider.send('evm_mine');

    // => Change the minVoteCount from 5 ppl to 3 ppl for testing
    await this.propertyContract.connect(this.auditor).updatePropertyForTesting(2, 18, {from: this.auditor.address})

    // Approve films 1,2
    const approveData = [proposalIds[0], proposalIds[1]]
    await expect(
      this.voteContract.connect(this.customer1).approveFilms(approveData, {from: this.customer1.address})
    )
    .to.emit(this.voteContract, 'FilmsApproved')
    .withArgs([getBigNumber(1,0), getBigNumber(2,0)]);

    // Deposit to funding films from customer3(investor)
    const depositAmount = getBigNumber(100000)
    await this.DAOContract.connect(this.customer3).depositToFilm(
      proposalIds[0], this.vabToken.address, depositAmount, {from: this.customer3.address}
    )

    // => Increase next block timestamp
    const period_3 = 20 * 24 * 3600; // 20 days
    network.provider.send('evm_increaseTime', [period_3]);
    await network.provider.send('evm_mine');

    const rewardRate = await this.propertyContract.rewardRate()
    const lockPeriod = await this.propertyContract.lockPeriod()
    const timePercent = (BigNumber.from(period_1).add(period_0).add(period_3)).mul(10000).div(lockPeriod);
    const expectRewardAmount = BigNumber.from(stakeAmount1).mul(timePercent).mul(rewardRate).div(getBigNumber(1,10)).div(10000);

    const totalRewardAmount = await this.stakingContract.totalRewardAmount()
    const extraRewardRate = await this.propertyContract.extraRewardRate();  
    const extraExpectRewardAmount = BigNumber.from(totalRewardAmount).mul(extraRewardRate).div(getBigNumber(1,10));
    
    const raisingAmount = await this.DAOContract.getRaisedAmountPerFilm(proposalIds[0])
    const {
      nftRight_,
      sharePercents_,
      choiceAuditor_,
      studioPayees_,
      gatingType_,
      rentPrice_,
    } = await this.DAOContract.getFilmById(proposalIds[0])
    const isRaised = await this.DAOContract.isRaisedFullAmount(proposalIds[0])

    // Check user balance before withdrawReward    
    let customer1V_1 = await this.vabToken.balanceOf(this.customer1.address)
    console.log('===customer1V before withdraw::', customer1V_1.toString())

    const tx = await this.stakingContract.connect(this.customer1).withdrawReward({from: this.customer1.address})
    this.events = (await tx.wait()).events
    const arg_reward = this.events[1].args
    console.log('test-1', arg_reward)

    expect(arg_reward.staker).to.be.equal(this.customer1.address)
    
    console.log('====arg_reward=reward, expect, total, isRaise, raiseAmount, raisedAmount::', 
      arg_reward.rewardAmount.toString(), //      7271109466218059
      expectRewardAmount.toString(),      //      6666400000000000 
      extraExpectRewardAmount.toString(), //       604709466218059
      totalRewardAmount.toString(),       //9066108938801491315813
      isRaised,                           // true
      raisingAmount.toString()            //499248873
    )
    
    expect(arg_reward.rewardAmount).to.be.equal(BigNumber.from(expectRewardAmount).add(extraExpectRewardAmount))
    expect(arg_reward.staker).to.be.equal(this.customer1.address)

    // Check user balance before withdrawReward    
    const customer1V_2 = await this.vabToken.balanceOf(this.customer1.address)
    console.log('===customer1V after withdraw::', customer1V_2.toString())
    expect(customer1V_2).to.be.equal(BigNumber.from(customer1V_1).add(arg_reward.rewardAmount))
    
    // =========== check filmIdsPerUser
    const ids_arr = await this.voteContract.getFundingFilmIdsPerUser(this.customer1.address)
    console.log('===ids_arr::', ids_arr.length)
  });
});
