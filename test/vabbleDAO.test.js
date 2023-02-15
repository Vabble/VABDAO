const { expect, util } = require('chai');
const { ethers, network } = require('hardhat');
const { BigNumber } = require('ethers');
const { utils } = require('ethers');
const ERC20 = require('../data/ERC20.json');
const { CONFIG, getByteFilmUpdate, getFinalFilm, getBigNumber, getVoteData, getProposalFilm, getOldProposalFilm } = require('../scripts/utils');
  
describe('VabbleDAO', function () {
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
    this.customer4 = this.signers[8];
    this.customer5 = this.signers[9];
    this.customer6 = this.signers[10];
    this.customer7 = this.signers[11]; 
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

    await this.Ownablee.connect(this.auditor).addDepositAsset([this.vabToken.address, this.USDC.address, this.EXM.address], {from: this.auditor.address})
    expect(await this.Ownablee.auditor()).to.be.equal(this.auditor.address);
        
    // ====== VAB
    // Transfering VAB token to user1, 2, 3
    await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(50000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer2.address, getBigNumber(50000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer3.address, getBigNumber(500000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer4.address, getBigNumber(500000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer5.address, getBigNumber(500000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer6.address, getBigNumber(500000), {from: this.auditor.address});
    // Transfering VAB token to studio1, 2, 3
    await this.vabToken.connect(this.auditor).transfer(this.studio1.address, getBigNumber(500000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio2.address, getBigNumber(500000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio3.address, getBigNumber(500000), {from: this.auditor.address});

    // Approve to transfer VAB token for each user, studio to DAO, StakingPool
    await this.vabToken.connect(this.customer1).approve(this.VabbleDAO.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.VabbleDAO.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.VabbleDAO.address, getBigNumber(100000000));   

    await this.vabToken.connect(this.customer1).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer4).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer5).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer6).approve(this.StakingPool.address, getBigNumber(100000000));

    await this.vabToken.connect(this.studio1).approve(this.VabbleDAO.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.VabbleDAO.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.VabbleDAO.address, getBigNumber(100000000));
    
    await this.vabToken.connect(this.studio1).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.StakingPool.address, getBigNumber(100000000));

    // ====== EXM
    // Transfering EXM token to user1, 2, 3
    await this.EXM.connect(this.auditor).transfer(this.customer1.address, getBigNumber(5000), {from: this.auditor.address});
    await this.EXM.connect(this.auditor).transfer(this.customer2.address, getBigNumber(5000), {from: this.auditor.address});
    await this.EXM.connect(this.auditor).transfer(this.customer3.address, getBigNumber(5000), {from: this.auditor.address});
    // Transfering EXM token to studio1, 2, 3
    await this.EXM.connect(this.auditor).transfer(this.studio1.address, getBigNumber(5000), {from: this.auditor.address});
    await this.EXM.connect(this.auditor).transfer(this.studio2.address, getBigNumber(5000), {from: this.auditor.address});
    await this.EXM.connect(this.auditor).transfer(this.studio3.address, getBigNumber(5000), {from: this.auditor.address});

    // Approve to transfer EXM token for each user, studio to DAO, StakingPool
    await this.EXM.connect(this.customer1).approve(this.VabbleDAO.address, getBigNumber(100000));
    await this.EXM.connect(this.customer2).approve(this.VabbleDAO.address, getBigNumber(100000));
    await this.EXM.connect(this.customer3).approve(this.VabbleDAO.address, getBigNumber(100000));   

    await this.EXM.connect(this.customer1).approve(this.StakingPool.address, getBigNumber(100000));
    await this.EXM.connect(this.customer2).approve(this.StakingPool.address, getBigNumber(100000));
    await this.EXM.connect(this.customer3).approve(this.StakingPool.address, getBigNumber(100000));

    await this.EXM.connect(this.studio1).approve(this.VabbleDAO.address, getBigNumber(100000));
    await this.EXM.connect(this.studio2).approve(this.VabbleDAO.address, getBigNumber(100000));
    await this.EXM.connect(this.studio3).approve(this.VabbleDAO.address, getBigNumber(100000));

    // ====== USDC
    const USDCBalance = await this.USDC.balanceOf(this.auditor.address)
    console.log('====usdcBalance::', USDCBalance.toString())
    // Transfering USDC token to user1, 2, 3                                            897497 291258
    await this.USDC.connect(this.auditor).transfer(this.customer1.address, getBigNumber(50000, 6), {from: this.auditor.address});
    await this.USDC.connect(this.auditor).transfer(this.customer2.address, getBigNumber(50000, 6), {from: this.auditor.address});
    await this.USDC.connect(this.auditor).transfer(this.customer3.address, getBigNumber(50000, 6), {from: this.auditor.address});
    // Transfering USDC token to studio1, 2, 3
    await this.USDC.connect(this.auditor).transfer(this.studio1.address, getBigNumber(50000, 6), {from: this.auditor.address});
    await this.USDC.connect(this.auditor).transfer(this.studio2.address, getBigNumber(50000, 6), {from: this.auditor.address});
    await this.USDC.connect(this.auditor).transfer(this.studio3.address, getBigNumber(50000, 6), {from: this.auditor.address});

    // Approve to transfer USDC token for each user, studio to DAO, StakingPool
    await this.USDC.connect(this.customer1).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.customer2).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.customer3).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));   

    await this.USDC.connect(this.customer1).approve(this.StakingPool.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.customer2).approve(this.StakingPool.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.customer3).approve(this.StakingPool.address, getBigNumber(10000000, 6));

    await this.USDC.connect(this.studio1).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.studio2).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.studio3).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));

    // Staking VAB token
    await this.StakingPool.connect(this.customer1).stakeVAB(getBigNumber(40000000), {from: this.customer1.address})
    await this.StakingPool.connect(this.customer2).stakeVAB(getBigNumber(40000000), {from: this.customer2.address})
    await this.StakingPool.connect(this.customer3).stakeVAB(getBigNumber(300), {from: this.customer3.address})
    await this.StakingPool.connect(this.customer4).stakeVAB(getBigNumber(300), {from: this.customer4.address})
    await this.StakingPool.connect(this.customer5).stakeVAB(getBigNumber(300), {from: this.customer5.address})
    await this.StakingPool.connect(this.customer6).stakeVAB(getBigNumber(300), {from: this.customer6.address})
    
    await this.StakingPool.connect(this.studio1).stakeVAB(getBigNumber(300), {from: this.studio1.address})
    await this.StakingPool.connect(this.studio2).stakeVAB(getBigNumber(300), {from: this.studio2.address})
    await this.StakingPool.connect(this.studio3).stakeVAB(getBigNumber(300), {from: this.studio3.address})

    expect(await this.StakingPool.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(40000000))
    expect(await this.StakingPool.getStakeAmount(this.customer2.address)).to.be.equal(getBigNumber(40000000))
    expect(await this.StakingPool.getStakeAmount(this.customer3.address)).to.be.equal(getBigNumber(300))
        
    this.events = [];
  });

describe('VabbleDAO-test-1', function () {
  it('Should prospose films by studio', async function () {  
    const noVote1 = 0
    const noVote2 = 1
    // Create proposal for 2 films by studio    
    const nftRight = [getBigNumber(1,0), getBigNumber(2,0)]
    const sharePercents = [getBigNumber(10, 8), getBigNumber(15, 8), getBigNumber(25, 8)]
    const choiceAuditor = [this.auditor.address]
    const studioPayees = [this.customer1.address, this.customer2.address, this.customer3.address]
    const raiseAmount = getBigNumber(150, 6)
    const fundPeriod = getBigNumber(20, 0)
    const fundType = getBigNumber(3, 0)
    
    // Create proposal for a film by studio
    let tx = await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(
      nftRight, 
      sharePercents, 
      choiceAuditor, 
      studioPayees, 
      raiseAmount, 
      fundPeriod, 
      fundType,
      noVote1, 
      this.USDC.address, 
      {from: this.studio1.address}
    )
    this.events = (await tx.wait()).events;
    console.log('=====events-0::', this.events)
    expect(this.events[15].args[2]).to.be.equal(this.studio1.address)
    const proposalIds_1 = await this.VabbleDAO.getFilmIds(1);
    expect(proposalIds_1[0]).to.be.equal(this.events[15].args[0])

    console.log('=====test-10')
    
    // Get A proposal film information with id
    const proposalFilm = await this.VabbleDAO.getFilmById(proposalIds_1[0])
    // console.log('=====proposalFilm::', proposalFilm)
    expect(proposalFilm.nftRight_.length).to.be.equal(nftRight.length)
    const userFilmProposalIds = await this.VabbleDAO.getUserFilmIds(2, this.studio1.address)
    console.log('=====userFilmProposalIds::', userFilmProposalIds)
  });  
})  

// describe('VabbleDAO-test-2', function () {
//   it('Should deposit and withdraw by customer', async function () {
//     const customer1V = await this.vabToken.balanceOf(this.customer1.address)
    
//     // Event - depositVAB
//     await expect(
//       this.StakingPool.connect(this.customer1).depositVAB(getBigNumber(100), {from: this.customer1.address})
//     )
//     .to.emit(this.VabbleDAO, 'VABDeposited')
//     .withArgs(this.customer1.address, getBigNumber(100));    

//     await this.StakingPool.connect(this.customer2).depositVAB(getBigNumber(200));
//     await this.StakingPool.connect(this.customer3).depositVAB(getBigNumber(300));
  
//     // Check user balance(amount) after deposit
//     let user1Amount = await this.StakingPool.userRentInfo(this.customer1.address);
//     expect(user1Amount.vabAmount).to.be.equal(getBigNumber(100))
//     expect(user1Amount.withdrawAmount).to.be.equal(getBigNumber(0))

//     // Event - WithdrawPending
//     await expect(
//       this.StakingPool.connect(this.customer1).pendingWithdraw(getBigNumber(50), {from: this.customer1.address})
//     )
//     .to.emit(this.StakingPool, 'WithdrawPending')
//     .withArgs(this.customer1.address, this.vabToken.address, getBigNumber(50));  

//     await expect(
//       this.StakingPool.connect(this.customer1).pendingWithdraw(getBigNumber(150), {from: this.customer1.address})
//     ).to.be.revertedWith('pendingWithdraw: Insufficient VAB amount');
    
//     // Check withdraw amount after send withraw request
//     user1Amount = await this.StakingPool.userRentInfo(this.customer1.address);
//     expect(user1Amount.withdrawAmount).to.be.equal(getBigNumber(50))
//   });
// })

//   it('approve_listing logic with only VAB', async function () {
//     const nftRight = [getBigNumber(1,0), getBigNumber(2,0)]
//     const sharePercents = [getBigNumber(10, 8), getBigNumber(15, 8), getBigNumber(25, 8)]
//     const choiceAuditor = [getBigNumber(1, 0)]
//     const studioPayees = [this.customer1.address, this.customer2.address, this.customer3.address]
//     const gatingType = getBigNumber(2, 0)
//     const rentPrice = getBigNumber(100, 6)
//     const raiseAmount = getBigNumber(20000, 6)
//     const fundPeriod = getBigNumber(120, 0)
//     const fundStage = getBigNumber(2, 0)
//     const fundType = getBigNumber(2, 0)
//     // 1. Create proposal for four films by staker(studio)
//     this.filmPropsoal = getProposalFilm(nftRight, sharePercents, choiceAuditor, studioPayees, gatingType, rentPrice, raiseAmount, fundPeriod, fundStage, getBigNumber(0,0))    
//     await this.VabbleDAO.connect(this.studio1).proposalFilm(this.filmPropsoal, false, {from: this.studio1.address})
//     this.filmPropsoal = getProposalFilm(nftRight, sharePercents, choiceAuditor, studioPayees, gatingType, rentPrice, raiseAmount, fundPeriod, fundStage, fundType)    
//     await this.VabbleDAO.connect(this.studio1).proposalFilm(this.filmPropsoal, false, {from: this.studio1.address})
//     this.filmPropsoal = getProposalFilm(nftRight, sharePercents, choiceAuditor, studioPayees, gatingType, rentPrice, raiseAmount, fundPeriod, fundStage, fundType)    
//     await this.VabbleDAO.connect(this.studio1).proposalFilm(this.filmPropsoal, false, {from: this.studio1.address})
//     this.filmPropsoal = getProposalFilm(nftRight, sharePercents, choiceAuditor, studioPayees, gatingType, rentPrice, raiseAmount, fundPeriod, fundStage, fundType)    
//     await this.VabbleDAO.connect(this.studio1).proposalFilm(this.filmPropsoal, false, {from: this.studio1.address})
    
//     // 2. Deposit to contract(VAB amount : 100, 200, 300)
//     await this.StakingPool.connect(this.customer1).depositVAB(getBigNumber(100000), {from: this.customer1.address})
//     await this.StakingPool.connect(this.customer2).depositVAB(getBigNumber(200000), {from: this.customer2.address})
//     await this.StakingPool.connect(this.customer3).depositVAB(getBigNumber(300000), {from: this.customer3.address})
    
//     expect(await this.Vote.isInitialized()).to.be.true

//     // 4. films approved by auditor
//     // 4-3. Vote to proposal films from customer1, 2, 3
//     const proposalIds = await this.VabbleDAO.getFilmIds(1); // 1, 2, 3, 4
//     console.log('=====filmIds::', proposalIds[0], proposalIds[3])
//     const voteInfos = [1, 1, 2, 3];
//     const voteInfo2 = [2, 2, 2, 2];
//     const voteData = getVoteData(proposalIds, voteInfos)
//     const voteData1 = getVoteData(proposalIds, [2, 2, 2, 2])
    
//     // console.log("====voteData", voteData)
//     //=> In order to call voteToFilms(), first should pass 4-1, 4-2
//     await this.Vote.connect(this.customer1).voteToFilms(proposalIds, voteInfos, {from: this.customer1.address}) //1,1,2,3
//     await this.Vote.connect(this.customer2).voteToFilms(proposalIds, voteInfos, {from: this.customer2.address}) //1,1,2,3
//     await this.Vote.connect(this.customer3).voteToFilms(proposalIds, voteInfos, {from: this.customer3.address}) //1,1,2,3
//     await this.Vote.connect(this.customer4).voteToFilms(proposalIds, voteInfo2, {from: this.customer4.address}) //2,2,2,2
//     await this.Vote.connect(this.customer5).voteToFilms(proposalIds, voteInfo2, {from: this.customer5.address}) //2,2,2,2
//     await this.Vote.connect(this.customer6).voteToFilms(proposalIds, voteInfo2, {from: this.customer6.address}) //2,2,2,2
    
//     // => Increase next block timestamp for only testing
//     const period = 10 * 24 * 3600; // filmVotePeriod = 10 days
//     network.provider.send('evm_increaseTime', [period]);
//     await network.provider.send('evm_mine');
    
//     // => Change the minVoteCount from 5 ppl to 3 ppl for testing
//     await this.Property.connect(this.auditor).updatePropertyForTesting(3, 18, {from: this.auditor.address})
//     console.log('=====test-0')
//     // 4-4. Approve two films by calling the approveFilms() from anyone
//     const approveData = [proposalIds[0], proposalIds[1], proposalIds[2]]
//     await expect(
//       this.Vote.connect(this.customer1).approveFilms(approveData, {from: this.customer1.address})
//     )
//     .to.emit(this.Vote, 'FilmsApproved')
//     .withArgs([getBigNumber(1,0), getBigNumber(2,0), getBigNumber(0,0)]);
//     console.log('=====test-1')
//     // 5 Withdraw request(40 VAB) from customer1, 2, 3
//     await this.StakingPool.connect(this.customer1).pendingWithdraw(getBigNumber(400), {from: this.customer1.address});
//     await this.StakingPool.connect(this.customer2).pendingWithdraw(getBigNumber(400), {from: this.customer2.address});
//     await this.StakingPool.connect(this.customer3).pendingWithdraw(getBigNumber(400), {from: this.customer3.address});
    
//     console.log('=====test-2')
//     // 6. Auditor submit three audit actions(for customer1) with watched percent(20%, 15%, 30%) to VabbleDAO contract
//     // only two film 1,2 approved in 4-4 so film3 watch(30%) ignored   
//     const finalData = getFinalFilm(this.customer1.address, getBigNumber(1,0), getBigNumber(20,8))
//     let tx = await this.VabbleDAO.setFinalFilm(finalData);
//     this.events = (await tx.wait()).events
//     // console.log('======events::', this.events)
//     expect(this.events[4].args.filmId).to.be.equal(proposalIds[0]) // id = 1    
    
//     console.log('=====test-3')
//     // 6-1 Approve pending-withdraw requests for customer1 and Deny for customer3 by Auditor, not customer2
//     await this.StakingPool.denyPendingWithdraw([this.customer1.address])
//     await this.StakingPool.approvePendingWithdraw([this.customer2.address])
//     await this.StakingPool.denyPendingWithdraw([this.customer3.address])

//     // 7. Check remain customer1,2,3 balance(amount, withdrawAmount) after submit audit actions
//     let user1Amount = await this.StakingPool.userRentInfo(this.customer1.address);
//     let user2Amount = await this.StakingPool.userRentInfo(this.customer2.address);
//     let user3Amount = await this.StakingPool.userRentInfo(this.customer3.address);
//     console.log('=====user1, user2, user3 amounts::', user1Amount, user2Amount, user3Amount)
//     // For customer1, film1 :   1000000(user vab balance) - 20(watched %) * 100(rentPrice in usdc)
//     // expect(user1Amount.vabAmount).to.be.equal(98003463893907280885219);
//     // expect(user1Amount.withdrawAmount).to.be.equal(getBigNumber(0))
//     // expect(user2Amount.vabAmount).to.be.equal(getBigNumber(200)); // same deposit amount as auditor didn't submit actions
//     // expect(user2Amount.withdrawAmount).to.be.equal(getBigNumber(40)) // same withdraw amount as auditor didn't approve
//     // expect(user3Amount.vabAmount).to.be.equal(getBigNumber(300)); // same deposit amount as auditor didn't submit actions
//     // expect(user3Amount.withdrawAmount).to.be.equal(getBigNumber(0)) // 0 as auditor deny pending withdraw request
//   });

//   it('approve_funding logic with only VAB', async function () {
//     const raiseAmounts = [getBigNumber(150, 6), getBigNumber(1000, 6), getBigNumber(3000, 6), getBigNumber(3000, 6)];
//     const onlyAllowVABs = [true, true, false, false];
//     const film_1 = [this.rentPrices[0], raiseAmounts[0], this.fundPeriods[0], onlyAllowVABs[0], false]
//     const film_2 = [this.rentPrices[1], raiseAmounts[1], this.fundPeriods[1], onlyAllowVABs[1], false]
//     const film_3 = [this.rentPrices[2], raiseAmounts[2], this.fundPeriods[2], onlyAllowVABs[2], false]
//     const film_4 = [this.rentPrices[3], raiseAmounts[3], this.fundPeriods[3], onlyAllowVABs[3], false]
//     this.filmPropsoal = [getOldProposalFilm(film_1), getOldProposalFilm(film_2), getOldProposalFilm(film_3), getOldProposalFilm(film_4)]
//     console.log('======getOldProposalFilm::', this.filmPropsoal)
//     //['0x0000000000000000000000000000000000000000000000056bc75e2d631000000000000000000000000000000000000000000000000000000000000008f0d18000000000000000000000000000000000000000000000000000000000001a5e0000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000','0x00000000000000000000000000000000000000000000000ad78ebc5ac6200000000000000000000000000000000000000000000000000000000000003b9aca000000000000000000000000000000000000000000000000000000000000278d0000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000','0x00000000000000000000000000000000000000000000001043561a882930000000000000000000000000000000000000000000000000000000000000b2d05e0000000000000000000000000000000000000000000000000000000000004f1a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000','0x000000000000000000000000000000000000000000000015af1d78b58c40000000000000000000000000000000000000000000000000000000000000b2d05e0000000000000000000000000000000000000000000000000000000000000d2f0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000']
//     // // 1. Create proposal for four films by studio
//     await this.VabbleDAO.connect(this.studio1).proposalMultiFilms(this.filmPropsoal, {from: this.studio1.address})
//     // 2. Deposit to contract(VAB amount : 100, 200, 300)    
//     await this.StakingPool.connect(this.customer1).depositVAB(getBigNumber(100), {from: this.customer1.address})
//     await this.StakingPool.connect(this.customer2).depositVAB(getBigNumber(200), {from: this.customer2.address})
//     await this.StakingPool.connect(this.customer3).depositVAB(getBigNumber(300), {from: this.customer3.address})

//     // 4. films approved by auditor        
//     // 4-2. Vote to proposal films(1,2,3,4) from customer1, 2, 3
//     const proposalIds = await this.VabbleDAO.getFilmIds(1); // 1, 2, 3, 4
//     const voteInfos = [1, 1, 2, 3];
//     const voteData = getVoteData(proposalIds, voteInfos)
//     //=> In order to call voteToFilms(), first should pass 4-1, 4-2
//     await this.Vote.connect(this.customer1).voteToFilms(proposalIds, voteInfos, {from: this.customer1.address}) //1,1,2,3
//     await this.Vote.connect(this.customer2).voteToFilms(proposalIds, voteInfos, {from: this.customer2.address}) //1,1,2,3
//     await this.Vote.connect(this.customer3).voteToFilms(proposalIds, voteInfos, {from: this.customer3.address}) //1,1,2,3

//     // => Increase next block timestamp for only testing
//     const period = 10 * 24 * 3600; // filmVotePeriod = 10 days
//     network.provider.send('evm_increaseTime', [period]);
//     await network.provider.send('evm_mine');

//     // => Change the minVoteCount from 5 ppl to 3 ppl for testing
//     await this.Property.connect(this.auditor).updatePropertyForTesting(3, 18, {from: this.auditor.address})

//     // 4-4. Approve two films by calling the approveFilms() from anyone
//     const approveData = [proposalIds[0], proposalIds[1], proposalIds[2]]
//     await expect(
//       this.Vote.connect(this.studio1).approveFilms(approveData, {from: this.studio1.address})
//     )
//     .to.emit(this.Vote, 'FilmsApproved')
//     .withArgs([getBigNumber(1,0), getBigNumber(2,0), getBigNumber(0,0)]);

//     // 5. Deposit to film 
//     // 5-1. Id(1) from customer1
//     const customer1_0 = await this.vabToken.balanceOf(this.customer1.address)

//     // Get current deposited amount to film
//     const dAmount = await this.VabbleDAO.getUserFundAmountPerFilm(this.customer1.address, proposalIds[0]);
//     console.log('=====test-1', dAmount.toString())
//     // this.Property.connect(this.auditor).updateAddressForTesting(CONFIG.mumbai.daiAddress, 2, {from: this.auditor.address})
    
//     // Add deposit tokens as Auditor
//     const assetList = [CONFIG.addressZero, CONFIG.mumbai.usdcAdress, CONFIG.mumbai.vabToken, CONFIG.mumbai.daiAddress, CONFIG.mumbai.exmAddress]
//     await this.Ownablee.connect(this.auditor).addDepositAsset(assetList, {from: this.auditor.address});

//     const depositAmount = getBigNumber(100000)
//     let tx = await this.VabbleDAO.connect(this.customer1).depositToFilm(
//       proposalIds[0], depositAmount, this.vabToken.address, {from: this.customer1.address}
//     )
//     this.events = (await tx.wait()).events
//     let args = this.events[2].args
//     expect(args.customer).to.be.equal(this.customer1.address)
//     expect(args.token).to.be.equal(this.vabToken.address)
//     expect(args.amount).to.be.equal(depositAmount)
//     expect(args.filmId).to.be.equal(proposalIds[0])
    
//     const customer1_1 = await this.vabToken.balanceOf(this.customer1.address)
//     expect(BigNumber.from(customer1_0.toString()).sub(BigNumber.from(customer1_1.toString()))).to.be.equal(depositAmount)
    
//     // 5-2. Id(1) from customer2
//     tx = await this.VabbleDAO.connect(this.customer2).depositToFilm(
//       proposalIds[0], depositAmount, this.vabToken.address, {from: this.customer2.address}
//     )
//     const raiseAmount_1 = await this.VabbleFunding.getRaisedAmountByToken(proposalIds[0])
//     console.log("====raiseAmount_1::", raiseAmount_1.toString()) // 499248873

//     // 6. Deposit to film Id(3) that not approved
//     await expect(
//       this.VabbleDAO.connect(this.customer3).depositToFilm(
//         proposalIds[2], depositAmount, this.vabToken.address, {from: this.customer3.address}
//       )
//     ).to.be.revertedWith('depositToFilm: filmId not approved for funding');

//     // 7. Deposit to film Id(1) after 40 days, fundPeriod is 20 days for film-1
//     // => Increase next block timestamp
//     const fundPeriod = 40 * 24 * 3600; // 40 days
//     network.provider.send('evm_increaseTime', [fundPeriod]);
//     await network.provider.send('evm_mine'); 

//     await expect(
//       this.VabbleDAO.connect(this.customer2).depositToFilm(
//         proposalIds[1], depositAmount, this.vabToken.address, {from: this.customer2.address}
//       )
//     ).to.be.revertedWith('depositToFilm: passed funding period');
    
//     // 8. fundProcess
//     // 8-1. Get total reward amount in the StakingPool
//     const totalRewardAmount_0 = await this.StakingPool.totalRewardAmount()
//     // console.log("====totalRewardAmount_0::", totalRewardAmount_0.toString())
//     const raiseAmount_2 = await this.VabbleFunding.getRaisedAmountByToken(proposalIds[0])
//     if(raiseAmount_2 < raiseAmounts[0]) {
//       await this.VabbleDAO.connect(this.customer2).depositToFilm(
//         proposalIds[0], depositAmount, this.vabToken.address, {from: this.customer1.address}
//       )
//     }
//     console.log("====raiseAmount_2::", raiseAmount_2.toString()) // 106855775
    
//     // 8-2. Call the fundProcess() for film-1
//     tx = await this.VabbleDAO.connect(this.studio1).fundProcess(proposalIds[0], {from: this.studio1.address})
//     this.events = (await tx.wait()).events
//     // console.log("===events::", this.events)
//     args = this.events[4].args
//     expect(args.filmId).to.be.equal(proposalIds[0])

//     // 8-3. Check changed reward amount in the StakingPool
//     const totalRewardAmount_1 = await this.StakingPool.totalRewardAmount()
//     console.log("====totalRewardAmount_1::", totalRewardAmount_1.toString())
//   });

// describe('VabbleDAO-test-5', function () {
//   it('approve_funding logic with other tokens(EXM)', async function () {    
//     const raiseAmounts = [getBigNumber(5000, 6), getBigNumber(20000, 6), getBigNumber(30000, 6), getBigNumber(30000, 6)];
//     const onlyAllowVABs = [false, false, false, true];
//     const film_1 = [this.rentPrices[0], raiseAmounts[0], this.fundPeriods[0], onlyAllowVABs[0], false]
//     const film_2 = [this.rentPrices[1], raiseAmounts[1], this.fundPeriods[1], onlyAllowVABs[1], false]
//     const film_3 = [this.rentPrices[2], raiseAmounts[2], this.fundPeriods[2], onlyAllowVABs[2], false]
//     const film_4 = [this.rentPrices[3], raiseAmounts[3], this.fundPeriods[3], onlyAllowVABs[3], false]
//     this.filmPropsoal = [getProposalFilm(film_1), getProposalFilm(film_2), getProposalFilm(film_3), getProposalFilm(film_4)]
    
//     // 1. Create proposal for four films by studio
//     await this.VabbleDAO.connect(this.studio1).proposalMultiFilms(this.filmPropsoal, {from: this.studio1.address})
    
//     // 4. films approved by auditor        
//     // 4-2. Vote to proposal films(1,2,3,4) from customer1, 2, 3
//     const proposalIds = await this.VabbleDAO.getFilmIds(1); // 1, 2, 3, 4
//     const voteInfos = [1, 1, 2, 3];
//     // const voteData = getVoteData(proposalIds, voteInfos)
//     await this.Vote.connect(this.customer1).voteToFilms(proposalIds, voteInfos, {from: this.customer1.address}) //1,1,2,3
//     await this.Vote.connect(this.customer2).voteToFilms(proposalIds, voteInfos, {from: this.customer2.address}) //1,1,2,3
//     await this.Vote.connect(this.customer3).voteToFilms(proposalIds, voteInfos, {from: this.customer3.address}) //1,1,2,3

//     // => Increase next block timestamp for only testing
//     const period = 10 * 24 * 3600; // filmVotePeriod = 10 days
//     network.provider.send('evm_increaseTime', [period]);
//     await network.provider.send('evm_mine');

//     // => Change the minVoteCount from 5 ppl to 3 ppl for testing
//     await this.Property.connect(this.auditor).updatePropertyForTesting(3, 18, {from: this.auditor.address})

//     // 4-4. Approve two films by calling the approveFilms() from Auditor
//     const approveData = [proposalIds[0], proposalIds[1], proposalIds[2], proposalIds[3]]
//     await expect(
//       this.Vote.connect(this.studio1).approveFilms(approveData, {from: this.studio1.address})
//     )
//     .to.emit(this.Vote, 'FilmsApproved')
//     .withArgs([getBigNumber(1,0), getBigNumber(2,0), getBigNumber(0,0), getBigNumber(0,0)]);
//     // const ap = await this.Vote.approveFilms(approveData);// filmId = 1, 2 ,3, 4
//     // this.events = (await ap.wait()).events
//     // console.log("====events::", this.events[2].args)  

//     // Add deposit assets by Auditor
//     // const assetList = [CONFIG.addressZero, CONFIG.mumbai.usdcAdress, CONFIG.mumbai.vabToken, CONFIG.mumbai.daiAddress, CONFIG.mumbai.exmAddress]
//     const assetList = [this.EXM.address, this.vabToken.address, this.USDC.address]
//     await this.Ownablee.connect(this.auditor).addDepositAsset(assetList, {from: this.auditor.address})
//     expect(await this.Ownablee.isDepositAsset(assetList[0])).to.be.true
//     expect(await this.Ownablee.isDepositAsset(assetList[1])).to.be.true
//     expect(await this.Ownablee.isDepositAsset(assetList[2])).to.be.true

//     // 5. Deposit to film 
//     // 5-1. Id(1) from customer1
//     const customer1_0 = await this.EXM.balanceOf(this.customer1.address)
//     const depositAmount = getBigNumber(2000) //30 090270812437311936 600 
//     await this.VabbleDAO.connect(this.customer1).depositToFilm(
//       proposalIds[0], depositAmount, this.EXM.address, {from: this.customer1.address}
//     )

//     const raiseAmount_0 = await this.VabbleFunding.getRaisedAmountByToken(proposalIds[0])    
//     console.log("====raiseAmount_0::", raiseAmount_0.toString())  

//     const customer1_1 = await this.EXM.balanceOf(this.customer1.address) 
//     console.log("====customer1_1::", customer1_0.toString(), customer1_1.toString())  
//     expect(BigNumber.from(customer1_0.toString()).sub(BigNumber.from(customer1_1.toString()))).to.be.equal(depositAmount)
    
//     // 5-2. Id(1) from customer2
//     tx = await this.VabbleDAO.connect(this.customer2).depositToFilm(
//       proposalIds[0], depositAmount, this.EXM.address, {from: this.customer2.address}
//     )
//     const raiseAmount_1 = await this.VabbleFunding.getRaisedAmountByToken(proposalIds[0])  
//     console.log("====raiseAmount_1::", raiseAmount_1.toString())  

//     // => Increase next block timestamp
//     const fundPeriod = 40 * 24 * 3600; // 40 days
//     network.provider.send('evm_increaseTime', [fundPeriod]);
//     await network.provider.send('evm_mine'); 

//     // 8. fundProcess
//     // 8-1. Get total reward amount in the StakingPool
//     const totalRewardAmount_0 = await this.StakingPool.totalRewardAmount()  
//     console.log("====totalRewardAmount_0::", totalRewardAmount_0.toString())  
    

//     // 8-2. Call the fundProcess() for film-1
//     tx = await this.VabbleDAO.connect(this.studio1).fundProcess(proposalIds[0], {from: this.studio1.address})
//     this.events = (await tx.wait()).events
//     // console.log("====events::", this.events)  
//     args = this.events[13].args
//     expect(args.filmId).to.be.equal(proposalIds[0])

//     // 8-3. Check changed reward amount in the StakingPool
//     const totalRewardAmount_1 = await this.StakingPool.totalRewardAmount()
//     console.log("====totalRewardAmount_1::", totalRewardAmount_1.toString())
//   });
// })
});
