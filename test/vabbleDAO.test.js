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

    await this.Ownablee.connect(this.auditor).addDepositAsset(
      [this.vabToken.address, this.USDC.address, this.EXM.address, CONFIG.addressZero], {from: this.auditor.address}
    )
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

// describe('VabbleDAO-test-1', function () {
//   it('Should prospose films by studio', async function () {  
//     const noVote1 = 0
//     const noVote2 = 1
//     // Create proposal for 2 films by studio    
//     const title = 'film title - 1'
//     const desc = 'film description - 1'
//     const sharePercents = [getBigNumber(50, 8), getBigNumber(15, 8), getBigNumber(35, 8)]
//     const studioPayees = [this.customer1.address, this.customer2.address, this.customer3.address]
//     const raiseAmount = getBigNumber(150, 6)
//     const fundPeriod = getBigNumber(20, 0)
//     const fundType = getBigNumber(3, 0)
//     const enableClaimer = getBigNumber(0, 0)
//     const enableClaimer1 = getBigNumber(1, 0)

//     // Create proposal for a film by studio
//     await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(0, 0, this.USDC.address, {from: this.studio1.address})
//     await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
//       getBigNumber(1, 0), 
//       title,
//       desc,
//       sharePercents, 
//       studioPayees,  
//       raiseAmount, 
//       fundPeriod, 
//       enableClaimer1,
//       {from: this.studio1.address}
//     )

//     await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(1, 0, this.EXM.address, {from: this.studio1.address})
//     await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
//       getBigNumber(2, 0), 
//       title,
//       desc,
//       sharePercents, 
//       studioPayees,  
//       raiseAmount, 
//       fundPeriod, 
//       enableClaimer,
//       {from: this.studio1.address}
//     )
    
//     const ethVal = ethers.utils.parseEther('1')
//     await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(2, 0, CONFIG.addressZero, {from: this.studio1.address, value: ethVal})
//     await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
//       getBigNumber(3, 0), 
//       title,
//       desc,
//       sharePercents, 
//       studioPayees,  
//       raiseAmount, 
//       fundPeriod, 
//       enableClaimer,
//       {from: this.studio1.address}
//     )

//     console.log('=====test-10')
    
//     // Get A proposal film information with id
//     const proposalFilm = await this.VabbleDAO.filmInfo(getBigNumber(1, 0))
//     console.log('=====proposalFilm::', proposalFilm)
//     const proposalFilmShare = await this.VabbleDAO.getFilmShare(getBigNumber(1, 0))
//     console.log('=====proposalFilmShare::', proposalFilmShare)
//     const isEnableClaim = await this.VabbleDAO.isEnabledClaimer(getBigNumber(1, 0))
//     console.log('=====isEnableClaim::', isEnableClaim)
//   });  
// })  

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


describe('VabbleDAO-test-5', function () {
  it('approve_funding logic with other tokens(EXM)', async function () {    
    // Create proposal for 2 films by studio    
    const title1 = 'film title - 1'
    const desc1 = 'film description - 1'
    const title2 = 'film title - 2'
    const desc2 = 'film description - 2'
    const title3 = 'film title - 3'
    const desc3 = 'film description - 3'
    const title4 = 'film title - 4'
    const desc4 = 'film description - 4'
    const sharePercents = [getBigNumber(50, 8), getBigNumber(15, 8), getBigNumber(35, 8)]
    const studioPayees = [this.customer1.address, this.customer2.address, this.customer3.address]
    const raiseAmount = getBigNumber(150, 6)
    const fundPeriod = getBigNumber(20, 0)
    const fundType = getBigNumber(3, 0)
    const enableClaimer = getBigNumber(0, 0)
    const enableClaimer1 = getBigNumber(1, 0)

    // *** fundType=0 => approve list,  fundType>0 => approve fund ***

    // Create proposal for a film by studio
    // fundType=0 => approve list
    await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(0, 0, this.USDC.address, {from: this.studio1.address})
    await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
      getBigNumber(1, 0), 
      title1,
      desc1,
      sharePercents, 
      studioPayees,  
      raiseAmount, 
      fundPeriod, 
      enableClaimer1,
      {from: this.studio1.address}
    )

    // fundType=0 => approve list
    await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(0, 0, this.EXM.address, {from: this.studio1.address})
    await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
      getBigNumber(2, 0), 
      title2,
      desc2,
      sharePercents, 
      studioPayees,  
      raiseAmount, 
      fundPeriod, 
      enableClaimer,
      {from: this.studio1.address}
    )
    
    // fundType=1 => approve fund
    let ethVal = ethers.utils.parseEther('1')
    await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(1, 0, CONFIG.addressZero, {from: this.studio1.address, value: ethVal})
    await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
      getBigNumber(3, 0), 
      title3,
      desc3,
      sharePercents, 
      studioPayees,  
      raiseAmount, 
      fundPeriod, 
      enableClaimer,
      {from: this.studio1.address}
    )

    // fundType=2 => approve fund
    await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(2, 0, CONFIG.addressZero, {from: this.studio1.address, value: ethVal})
    await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
      getBigNumber(4, 0), 
      title4,
      desc4,
      sharePercents, 
      studioPayees,  
      raiseAmount, 
      fundPeriod, 
      enableClaimer,
      {from: this.studio1.address}
    )
    
    // Staking VAB token
    await this.StakingPool.connect(this.customer1).stakeVAB(getBigNumber(400), {from: this.customer1.address})
    await this.StakingPool.connect(this.customer2).stakeVAB(getBigNumber(400), {from: this.customer2.address})
    await this.StakingPool.connect(this.customer3).stakeVAB(getBigNumber(300), {from: this.customer3.address})    
    await this.StakingPool.connect(this.studio1).stakeVAB(getBigNumber(300), {from: this.studio1.address})
    await this.StakingPool.connect(this.studio2).stakeVAB(getBigNumber(300), {from: this.studio2.address})
    await this.StakingPool.connect(this.studio3).stakeVAB(getBigNumber(300), {from: this.studio3.address})

    // 4. films approved by auditor        
    // 4-2. Vote to proposal films(1,2,3,4) from customer1, 2, 3
    const proposalIds = await this.VabbleDAO.getFilmIds(1); // 1, 2, 3, 4
    const voteInfos = [1, 1, 2, 3];
    // const voteData = getVoteData(proposalIds, voteInfos)
    await this.Vote.connect(this.customer1).voteToFilms(proposalIds, voteInfos, {from: this.customer1.address}) //1,1,2,3
    await this.Vote.connect(this.customer2).voteToFilms(proposalIds, voteInfos, {from: this.customer2.address}) //1,1,2,3
    await this.Vote.connect(this.customer3).voteToFilms(proposalIds, voteInfos, {from: this.customer3.address}) //1,1,2,3

    // => Increase next block timestamp for only testing
    let period = 10 * 24 * 3600; // filmVotePeriod = 10 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    // => Change the minVoteCount from 5 ppl to 3 ppl for testing
    await this.Property.connect(this.auditor).updatePropertyForTesting(3, 18, {from: this.auditor.address})

    // 4-4. Approve two films by calling the approveFilms() from Auditor
    const approveData = [proposalIds[0], proposalIds[1], proposalIds[2], proposalIds[3]]
    const ap = await this.Vote.connect(this.studio2).approveFilms(approveData);// filmId = 1, 2 ,3, 4
    this.events = (await ap.wait()).events
    const a_0 = this.events[0].args
    const a_1 = this.events[1].args
    const a_2 = this.events[2].args
    const a_3 = this.events[3].args
    // console.log("====event-0::", a_0.filmId.toString(), a_0.reason.toString())  
    // console.log("====event-1::", a_1.filmId.toString(), a_1.reason.toString())  
    // console.log("====event-2::", a_2.filmId.toString(), a_2.reason.toString())  
    // console.log("====event-3::", a_3.filmId.toString(), a_3.reason.toString())  

    const filmData = await this.VabbleDAO.getUserFilmListForMigrate(this.studio1.address)
    // console.log("====filmData::", JSON.stringify(filmData))  


    // TODO test keccak
    console.log("=============================================")  
    await this.StakingPool.connect(this.customer1).depositVAB(getBigNumber(10000), {from: this.customer1.address})
    await this.StakingPool.connect(this.customer2).depositVAB(getBigNumber(15000), {from: this.customer2.address})

    const approvedListIds = await this.VabbleDAO.getFilmIds(2); // 
    console.log("====approvedListIds::", approvedListIds)  

    const kData11 = ethers.utils.solidityKeccak256(["uint256", "address"], [1, this.customer1.address])
    const kData12 = ethers.utils.solidityKeccak256(["uint256", "address"], [1, this.customer2.address])
    const kData21 = ethers.utils.solidityKeccak256(["uint256", "address"], [2, this.customer1.address])
    const kData22 = ethers.utils.solidityKeccak256(["uint256", "address"], [2, this.customer2.address])
    
    const tx = await this.VabbleDAO.setFinalFilms(
      [this.customer1.address, this.customer2.address, this.customer1.address, this.customer2.address], 
      [kData11, kData12, kData21, kData22], 
      [getBigNumber(200), getBigNumber(500), getBigNumber(800), getBigNumber(500)]
    )

    const cur_user1VAB = await this.StakingPool.getRentVABAmount(this.customer1.address)
    const cur_user2VAB = await this.StakingPool.getRentVABAmount(this.customer2.address)
    console.log("====tx::", cur_user1VAB.toString(), cur_user2VAB.toString())  

    const VABBalance = await this.vabToken.balanceOf(this.VabbleDAO.address)
    console.log('====VABBalance::', VABBalance.toString())

    // => Increase next block timestamp for only testing
    period = 31 * 24 * 3600; // 31 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    const tx1 = await this.VabbleDAO.setFinalFilms(
      [this.customer1.address, this.customer2.address], 
      [kData11, kData22], 
      [getBigNumber(200), getBigNumber(500)]
    )
  });
})
});
