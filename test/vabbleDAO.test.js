const { expect, util } = require('chai');
const { ethers, network } = require('hardhat');
const { BigNumber } = require('ethers');
const { utils } = require('ethers');
const ERC20 = require('../data/ERC20.json');
const { CONFIG, DISCOUNT, getFinalFilm, getBigNumber, getVoteData, getProposalFilm, getOldProposalFilm } = require('../scripts/utils');
  
describe('VabbleDAO', function () {
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
    this.sig1 = this.signers[12];    
    this.sig2 = this.signers[13];       
    this.sig3 = this.signers[14];     
  });

  beforeEach(async function () {    
    this.vabToken = new ethers.Contract(CONFIG.mumbai.vabToken, JSON.stringify(ERC20), ethers.provider);
    this.EXM = new ethers.Contract(CONFIG.mumbai.exmAddress, JSON.stringify(ERC20), ethers.provider);
    this.USDC = new ethers.Contract(CONFIG.mumbai.usdcAdress, JSON.stringify(ERC20), ethers.provider);
    this.DAI = new ethers.Contract(CONFIG.mumbai.daiAddress, JSON.stringify(ERC20), ethers.provider);
    
    this.GnosisSafe = await (await this.GnosisSafeFactory.deploy()).deployed();  

    this.Ownablee = await (await this.OwnableFactory.deploy(
      CONFIG.daoWalletAddress, this.vabToken.address, this.USDC.address, this.GnosisSafe.address
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
        this.FilmNFT.address
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
    
    await this.FilmNFT.connect(this.auditor).initialize(
      this.VabbleDAO.address, 
      this.VabbleFund.address,
      {from: this.auditor.address}
    ); 

    // Initialize StakingPool
    await this.StakingPool.connect(this.auditor).initialize(
      this.VabbleDAO.address,
      this.Property.address,
      this.Vote.address,
      {from: this.auditor.address}
    )  
    
    // Initialize Vote contract
    await this.Vote.connect(this.auditor).initialize(
      this.VabbleDAO.address,
      this.StakingPool.address,
      this.Property.address,
      {from: this.auditor.address}
    )
    // Initialize VabbleFund contract
    await this.VabbleFund.connect(this.auditor).initialize(
      this.VabbleDAO.address,
      {from: this.auditor.address}
    )

    // set whitelist for swap asset in Unihelper contract
    await this.UniHelper.connect(this.auditor).setWhiteList(
      this.VabbleDAO.address,
      this.VabbleFund.address,
      this.Subscription.address,
      this.FilmNFT.address,
      this.SubNFT.address,
      {from: this.auditor.address}
    )

    await this.Ownablee.connect(this.auditor).addDepositAsset(
      [this.vabToken.address, this.USDC.address, this.EXM.address, CONFIG.addressZero], {from: this.auditor.address}
    )
    
    await this.Ownablee.connect(this.auditor).setup(
      this.Vote.address, this.VabbleDAO.address, this.StakingPool.address, {from: this.auditor.address}
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
    
    await this.vabToken.connect(this.customer1).approve(this.FilmNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.FilmNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.FilmNFT.address, getBigNumber(100000000));   

    await this.vabToken.connect(this.customer1).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer4).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer5).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer6).approve(this.StakingPool.address, getBigNumber(100000000));
    
    await this.vabToken.connect(this.customer1).approve(this.FilmNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.FilmNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.FilmNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer4).approve(this.FilmNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer5).approve(this.FilmNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer6).approve(this.FilmNFT.address, getBigNumber(100000000));

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
    // Transfering USDC token to user1, 2, 3                                            897497 291258
    await this.USDC.connect(this.auditor).transfer(this.customer1.address, getBigNumber(50000, 6), {from: this.auditor.address});
    await this.USDC.connect(this.auditor).transfer(this.customer2.address, getBigNumber(50000, 6), {from: this.auditor.address});
    await this.USDC.connect(this.auditor).transfer(this.customer3.address, getBigNumber(50000, 6), {from: this.auditor.address});
    await this.USDC.connect(this.auditor).transfer(this.customer4.address, getBigNumber(50000, 6), {from: this.auditor.address});
    await this.USDC.connect(this.auditor).transfer(this.customer5.address, getBigNumber(50000, 6), {from: this.auditor.address});
    await this.USDC.connect(this.auditor).transfer(this.customer6.address, getBigNumber(50000, 6), {from: this.auditor.address});
    // Transfering USDC token to studio1, 2, 3
    await this.USDC.connect(this.auditor).transfer(this.studio1.address, getBigNumber(50000, 6), {from: this.auditor.address});
    await this.USDC.connect(this.auditor).transfer(this.studio2.address, getBigNumber(50000, 6), {from: this.auditor.address});
    await this.USDC.connect(this.auditor).transfer(this.studio3.address, getBigNumber(50000, 6), {from: this.auditor.address});

    // Approve to transfer USDC token for each user, studio to DAO, StakingPool
    await this.USDC.connect(this.customer1).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.customer2).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.customer3).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));   
    await this.USDC.connect(this.customer4).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.customer5).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.customer6).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
    
    await this.USDC.connect(this.customer1).approve(this.VabbleFund.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.customer2).approve(this.VabbleFund.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.customer3).approve(this.VabbleFund.address, getBigNumber(10000000, 6));   
    await this.USDC.connect(this.customer4).approve(this.VabbleFund.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.customer5).approve(this.VabbleFund.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.customer6).approve(this.VabbleFund.address, getBigNumber(10000000, 6));

    await this.USDC.connect(this.customer1).approve(this.StakingPool.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.customer2).approve(this.StakingPool.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.customer3).approve(this.StakingPool.address, getBigNumber(10000000, 6));

    await this.USDC.connect(this.studio1).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.studio2).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.studio3).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.studio1).approve(this.FilmNFT.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.studio2).approve(this.FilmNFT.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.studio3).approve(this.FilmNFT.address, getBigNumber(10000000, 6));

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
    
//     // Get A proposal film information with id
//     const proposalFilm = await this.VabbleDAO.filmInfo(getBigNumber(1, 0))
//     // console.log('=====proposalFilm::', proposalFilm)
//     const proposalFilmShare = await this.VabbleDAO.getFilmShare(getBigNumber(1, 0))
//     // console.log('=====proposalFilmShare::', proposalFilmShare)
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
  it('approve_funding logic with other tokens(USDC)', async function () {  
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
    const rewardPercent = getBigNumber(10, 8)
    const fId1 = getBigNumber(1, 0)
    const fId2 = getBigNumber(2, 0)
    const fId3 = getBigNumber(3, 0)
    const fId4 = getBigNumber(4, 0)
    const fId5 = getBigNumber(5, 0)
    // *** fundType=0 => approve list,  fundType>0 => approve fund ***
    let ethVal = ethers.utils.parseEther('1')
    // await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(0, 0, CONFIG.addressZero, {from: this.studio1.address, value: ethVal})
    
    // Create proposal for a film by studio
    // fundType=0 => approve list
    await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(0, 0, this.USDC.address, {from: this.studio1.address})
    await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
      fId1, 
      title1,
      desc1,
      sharePercents, 
      studioPayees,  
      raiseAmount, 
      fundPeriod, 
      0,
      enableClaimer1,
      {from: this.studio1.address}
    )

    // fundType=0 => approve list
    await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(0, 0, this.EXM.address, {from: this.studio1.address})
    await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
      fId2, 
      title2,
      desc2,
      sharePercents, 
      studioPayees,  
      raiseAmount, 
      fundPeriod, 
      0,
      enableClaimer,
      {from: this.studio1.address}
    )
    
    // fundType=1 => approve fund by token
    await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(1, 0, CONFIG.addressZero, {from: this.studio1.address, value: ethVal})
    await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
      fId3, 
      title3,
      desc3,
      sharePercents, 
      studioPayees,  
      raiseAmount, 
      fundPeriod, 
      rewardPercent,
      enableClaimer,
      {from: this.studio1.address}
    )

    // fundType=2 => approve fund by nft
    await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(2, 0, CONFIG.addressZero, {from: this.studio1.address, value: ethVal})
    await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
      fId4, 
      title4,
      desc4,
      sharePercents, 
      studioPayees,  
      raiseAmount, 
      fundPeriod, 
      rewardPercent,
      enableClaimer,
      {from: this.studio1.address}
    )

    // fundType=3 => approve fund by token & nft
    await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(3, 0, CONFIG.addressZero, {from: this.studio1.address, value: ethVal})
    await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
      fId5, 
      title4,
      desc4,
      sharePercents, 
      studioPayees,  
      raiseAmount, 
      fundPeriod, 
      rewardPercent,
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
   
    // Vote to proposal films(1,2,3,4) from customer1, 2, 3
    const pIds = await this.VabbleDAO.getFilmIds(1); // 1, 2, 3, 4, 5
    const voteInfos = [1, 1, 1, 1, 1];
    // const voteData = getVoteData(proposalIds, voteInfos)
    await this.Vote.connect(this.customer1).voteToFilms(pIds, voteInfos, {from: this.customer1.address}) //1,1,2,3
    await this.Vote.connect(this.customer2).voteToFilms(pIds, voteInfos, {from: this.customer2.address}) //1,1,2,3
    await this.Vote.connect(this.customer3).voteToFilms(pIds, voteInfos, {from: this.customer3.address}) //1,1,2,3

    // => Increase next block timestamp for only testing
    let period = 10 * 24 * 3600; // filmVotePeriod = 10 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    // => Change the minVoteCount from 5 ppl to 3 ppl for testing
    await this.Property.connect(this.auditor).updatePropertyForTesting(3, 18, {from: this.auditor.address})

    // Approve 5 films by calling the approveFilms() from Auditor
    const approveData = [pIds[0], pIds[1], pIds[2], pIds[3], pIds[4]]
    await this.Vote.connect(this.studio2).approveFilms(approveData);// filmId = 1, 2 ,3, 4, 5

    // Deposit to fund film by token
    const flag1 = 1;
    const flag2 = 2;
    const dAmount = getBigNumber(50, 6)
    await this.VabbleFund.connect(this.customer1).depositToFilm(fId3, dAmount, flag1, this.USDC.address, {from: this.customer1.address})
    await this.VabbleFund.connect(this.customer2).depositToFilm(fId3, dAmount, flag1, this.USDC.address, {from: this.customer2.address})
    await this.VabbleFund.connect(this.customer3).depositToFilm(fId3, dAmount, flag1, this.USDC.address, {from: this.customer3.address})
    await this.VabbleFund.connect(this.customer4).depositToFilm(fId3, dAmount, flag1, this.USDC.address, {from: this.customer4.address})
    await this.VabbleFund.connect(this.customer5).depositToFilm(fId3, dAmount, flag1, this.USDC.address, {from: this.customer5.address})
    await this.VabbleFund.connect(this.customer6).depositToFilm(fId3, dAmount, flag1, this.USDC.address, {from: this.customer6.address})
    
    // Deploy NFT for film-4 and film-5
    const tier = getBigNumber(1, 0)
    const nAmount = getBigNumber(8000, 0)      // 8000
    const nPrice1 = getBigNumber(2, 6)          // 2 USDC
    const nPrice2 = getBigNumber(20, 6)
    await this.FilmNFT.connect(this.auditor).setBaseURI("base_uri", "collection_uri")
    await this.FilmNFT.connect(this.studio1).setMintInfo(fId4, tier, nAmount, nPrice1, {from: this.studio1.address})
    await this.FilmNFT.connect(this.studio1).setMintInfo(fId5, tier, nAmount, nPrice2, {from: this.studio1.address})
    await this.FilmNFT.connect(this.studio1).deployFilmNFTContract(fId4, "test4 nft", "t4nft", {from: this.studio1.address})
    await this.FilmNFT.connect(this.studio1).deployFilmNFTContract(fId5, "test5 nft", "t5nft", {from: this.studio1.address})
    
    // Deposit to fund film by nft
    const dAmount1 = 100 //(maxMintAmount = nAmount = 8000)
    await this.VabbleFund.connect(this.customer1).depositToFilm(fId4, 1, flag2, this.USDC.address, {from: this.customer1.address})
    await this.VabbleFund.connect(this.customer1).depositToFilm(fId5, dAmount1, flag2, this.USDC.address, {from: this.customer1.address})
    await this.VabbleFund.connect(this.customer2).depositToFilm(fId5, dAmount1, flag2, this.USDC.address, {from: this.customer2.address})

    const isRaised3 = await this.VabbleFund.isRaisedFullAmount(fId3);
    const isRaised4 = await this.VabbleFund.isRaisedFullAmount(fId4);
    const isRaised5 = await this.VabbleFund.isRaisedFullAmount(fId5);    
    expect(isRaised3).to.be.true
    expect(isRaised4).to.be.false
    expect(isRaised5).to.be.true

    const userNftCount51 = await this.VabbleFund.getAllowUserNftCount(fId5, this.customer1.address)
    const userNftCount52 = await this.VabbleFund.getAllowUserNftCount(fId5, this.customer2.address)
    const userNftCount53 = await this.VabbleFund.getAllowUserNftCount(fId5, this.customer3.address)    
    expect(userNftCount51).to.be.equal(dAmount1) // 100
    expect(userNftCount52).to.be.equal(dAmount1) // 100
    expect(userNftCount53).to.be.equal(0)

    // => Increase next block timestamp for only testing
    period = 21 * 24 * 3600; // 21 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    await this.VabbleFund.connect(this.studio1).fundProcess(fId3, {from: this.studio1.address})
    const isProcessed = await this.VabbleFund.isFundProcessed(fId3);
    expect(isProcessed).to.be.true

    // TODO test allocate, setFinalFilms
    await this.StakingPool.connect(this.customer1).depositVAB(getBigNumber(10000), {from: this.customer1.address})
    await this.StakingPool.connect(this.customer2).depositVAB(getBigNumber(15000), {from: this.customer2.address})
    await this.StakingPool.connect(this.customer3).depositVAB(getBigNumber(15000), {from: this.customer3.address})

    const approvedListIds = await this.VabbleDAO.getFilmIds(2); // 1, 2
    const approvedFundIds = await this.VabbleDAO.getFilmIds(3); // 3, 4, 5
    expect(approvedListIds.length).to.be.equal(2)
    expect(approvedFundIds.length).to.be.equal(3)

    let VABInStudioPool = await this.vabToken.balanceOf(this.VabbleDAO.address)
    let VABInEdgePool = await this.vabToken.balanceOf(this.Ownablee.address)
    expect(VABInEdgePool).to.be.equal(0)
    expect(VABInStudioPool).to.be.equal(0)

    // Allocate to EdgePool
    await expect(
      this.VabbleDAO.connect(this.auditor).allocateToPool(
        [this.customer1.address, this.customer2.address, this.customer3.address],
        [getBigNumber(500), getBigNumber(1000), getBigNumber(1000)],
        1,
        {from: this.auditor.address})
    ).to.emit(this.VabbleDAO, 'AllocatedToPool').withArgs(
      [this.customer1.address, this.customer2.address, this.customer3.address],
      [getBigNumber(500), getBigNumber(1000), getBigNumber(1000)],
      1
    );
    VABInEdgePool = await this.vabToken.balanceOf(this.Ownablee.address)
    expect(VABInEdgePool).to.be.equal(getBigNumber(2500))
    
    // Allocate to StudioPool
    await expect(
      this.VabbleDAO.connect(this.auditor).allocateToPool(
        [this.customer1.address, this.customer2.address, this.customer3.address],
        [getBigNumber(500), getBigNumber(1000), getBigNumber(1000)],
        2,
        {from: this.auditor.address})
    ).to.emit(this.VabbleDAO, 'AllocatedToPool').withArgs(
      [this.customer1.address, this.customer2.address, this.customer3.address],
      [getBigNumber(500), getBigNumber(1000), getBigNumber(1000)],
      2
    );
    
    let daoPool = await this.VabbleDAO.StudioPool()
    VABInStudioPool = await this.vabToken.balanceOf(this.VabbleDAO.address)
    expect(daoPool).to.be.equal(getBigNumber(2500))
    expect(VABInStudioPool).to.be.equal(getBigNumber(2500))

    await expect(
      this.VabbleDAO.connect(this.customer3).claimReward([fId1], {from: this.customer3.address})
    ).to.be.revertedWith('claimReward: zero amount');
    
    // withdrawFunding
    await expect(
      this.VabbleFund.connect(this.customer1).withdrawFunding(fId5, {from: this.customer1.address})
    ).to.be.revertedWith('withdrawFunding: full raised');

    const curUserBalance1 = await this.USDC.balanceOf(this.customer1.address) // 47948000000
    await this.VabbleFund.connect(this.customer1).withdrawFunding(fId4, {from: this.customer1.address})
    const aUserBalance1 = await this.USDC.balanceOf(this.customer1.address)   // 47950000000
    expect(aUserBalance1).to.be.equal(curUserBalance1.add(nPrice1))     // nPrice1 = 2000000

    //==================== setFinalFilms for listing(fundType = 0)
    await this.VabbleDAO.startNewMonth()
    await this.VabbleDAO.setFinalFilms(
      [fId1, fId2, fId3, fId4, fId5], 
      [getBigNumber(100), getBigNumber(100), getBigNumber(100), getBigNumber(100), getBigNumber(100)]
    )    
    let monthId = await this.VabbleDAO.monthId() // 1        
    const assAmount31 = await this.VabbleDAO.finalizedAmount(monthId, fId3, this.customer1.address)
    const assAmount32 = await this.VabbleDAO.finalizedAmount(monthId, fId3, this.customer2.address)
    const assAmount33 = await this.VabbleDAO.finalizedAmount(monthId, fId3, this.customer3.address)

    const assAmount41 = await this.VabbleDAO.finalizedAmount(monthId, fId4, this.customer1.address)
    const assAmount42 = await this.VabbleDAO.finalizedAmount(monthId, fId4, this.customer2.address)
    const assAmount43 = await this.VabbleDAO.finalizedAmount(monthId, fId4, this.customer3.address)
    
    const assAmount51 = await this.VabbleDAO.finalizedAmount(monthId, fId5, this.customer1.address)
    const assAmount52 = await this.VabbleDAO.finalizedAmount(monthId, fId5, this.customer2.address)
    const assAmount53 = await this.VabbleDAO.finalizedAmount(monthId, fId5, this.customer3.address)
    console.log("====assignedAmount3::", assAmount31.toString(), assAmount32.toString(), assAmount33.toString())
    console.log("====assignedAmount4::", assAmount41.toString(), assAmount42.toString(), assAmount43.toString())
    console.log("====assignedAmount5::", assAmount51.toString(), assAmount52.toString(), assAmount53.toString())
    

    let finalFilmList = await this.VabbleDAO.getFinalizedFilmIds(monthId) // 1, 2, 3, 4, 5
    expect(finalFilmList.length).to.be.equal(5)

    let finalFilmIds = await this.VabbleDAO.getUserFinalFilmIds(this.customer1.address);
    for (var i = 0; i < finalFilmIds.length; i++) {
      const rewardAmount = await this.VabbleDAO.connect(this.customer1).getUserRewardAmount(finalFilmIds[i], monthId, {from: this.customer1.address});
      console.log("rewardAmount", finalFilmIds[i].toString(), rewardAmount.toString());
    }

    const v_1 = await this.vabToken.balanceOf(this.customer1.address)
    await this.VabbleDAO.connect(this.customer1).claimAllReward({from: this.customer1.address})

    await expect(
      this.VabbleDAO.connect(this.customer1).claimReward([fId1], {from: this.customer1.address})
    ).to.be.revertedWith('claimReward: zero amount');

    const v_2 = await this.vabToken.balanceOf(this.customer1.address)
    const claimedAmount_1 = v_2.sub(v_1)
    // 9989678 045311936606546366 
    // 9989728 045311936606546366
    const daoPoolAfter = await this.VabbleDAO.StudioPool()
    const VABInStudioPoolAfter = await this.vabToken.balanceOf(this.VabbleDAO.address) // 2450 VAB
    expect(daoPoolAfter).to.be.equal(VABInStudioPoolAfter)
    expect(VABInStudioPoolAfter).to.be.equal(VABInStudioPool.sub(claimedAmount_1))

    // batch mint
    await expect(
      this.FilmNFT.connect(this.customer3).claimNft(fId4, {from: this.customer3.address})
    ).to.be.revertedWith('claimNft: zero count');
    await this.FilmNFT.connect(this.customer1).claimNft(fId5, {from: this.customer1.address})
    const totalSupply5 = await this.FilmNFT.getTotalSupply(fId5)
    expect(totalSupply5).to.be.equal(dAmount1)

    //==================== setFinalFilms for funding(fundType = 2, nft)
    // => Increase next block timestamp for only testing
    period = 31 * 24 * 3600; // 31 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');   

    const filmNFTTokenList4 = await this.FilmNFT.getFilmNFTTokenList(fId4); // 0 for film-4
    const filmNFTTokenList5 = await this.FilmNFT.getFilmNFTTokenList(fId5); // tokenId 1 ~ 100 for film-5
    expect(filmNFTTokenList4.length).to.be.equal(0)
    expect(filmNFTTokenList5.length).to.be.equal(dAmount1)

    await this.VabbleFund.connect(this.studio1).fundProcess(fId5, {from: this.studio1.address})
    const isProcessed1 = await this.VabbleFund.isFundProcessed(fId5);
    expect(isProcessed1).to.be.true

    await this.VabbleDAO.startNewMonth()
    await this.VabbleDAO.setFinalFilms(
      [fId4, fId5], 
      [getBigNumber(300), getBigNumber(200)]
    )
    
    monthId = 2
    // const assignedAmount41 = await this.VabbleDAO.finalizedAmount(monthId, fId4, this.customer1.address)
    // const assignedAmount43 = await this.VabbleDAO.finalizedAmount(monthId, fId4, this.customer3.address)
    // console.log("====assignedAmount-1::", assignedAmount41.toString(), assignedAmount43.toString())  
    const a51 = await this.VabbleDAO.finalizedAmount(monthId, fId5, this.customer1.address)
    const a52 = await this.VabbleDAO.finalizedAmount(monthId, fId5, this.customer2.address)
    const a53 = await this.VabbleDAO.finalizedAmount(monthId, fId5, this.customer3.address)
    const a54 = await this.VabbleDAO.finalizedAmount(monthId, fId5, this.customer4.address)
    console.log("====assignedAmount-51/52/53::", a51.toString(), a52.toString(), a53.toString(), a54.toString())  
    // 100000000000000000000 
    //  37000000000000000000 
    //  63000000000000000000 
    //                     0

    const a_1 = await this.vabToken.balanceOf(this.customer1.address) // 100000000000000000000
    await this.VabbleDAO.connect(this.customer1).claimReward([fId4, fId5], {from: this.customer1.address})

    // await this.VabbleDAO.connect(this.customer1).claimReward([fId4], {from: this.customer1.address})
    const a_2 = await this.vabToken.balanceOf(this.customer1.address)
    // await this.VabbleDAO.connect(this.customer1).claimReward([fId5], {from: this.customer1.address})
    const a_3 = await this.vabToken.balanceOf(this.customer1.address)
    console.log('====customer1 balance::', a_1.toString(), a_2.toString(), a_3.toString())    
    // 9989924 711978602606546366 
    // 9990074 711978602606546366 
    // 9990174 711978602606546366

    // 9989728 045311936606546366 
    // 9989928 045311936606546366 
    // 9990078 045311936606546366

    const b_1 = await this.vabToken.balanceOf(this.customer3.address)
    await this.VabbleDAO.connect(this.customer3).claimReward([fId4], {from: this.customer3.address})
    const b_2 = await this.vabToken.balanceOf(this.customer3.address)
    console.log('====customer3 balance::', b_1.toString(), b_2.toString())
    // 484 430000000000000000000 
    // 484 570000000000000000000

    const mId1 = await this.VabbleDAO.latestClaimMonthId(fId5, this.customer1.address) // 2
    const mId3 = await this.VabbleDAO.latestClaimMonthId(fId4, this.customer3.address) // 2
    const curMonthId = await this.VabbleDAO.monthId()    // 2
    expect(mId1).to.be.equal(curMonthId)
    expect(mId3).to.be.equal(curMonthId)

    await expect(
      this.VabbleDAO.connect(this.customer3).claimReward([fId4], {from: this.customer3.address})
    ).to.be.revertedWith('claimReward: zero amount');

    // => Increase next block timestamp for only testing
    period = 30 * 24 * 3600; // 31 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    await this.VabbleDAO.connect(this.auditor).allocateFromEdgePool(getBigNumber(1000), {from: this.auditor.address})
    VABInEdgePool = await this.vabToken.balanceOf(this.Ownablee.address)
    console.log('====VABInEdgePool after allocateFromEdgePool(1000)::', VABInEdgePool.toString())
    VABInStudioPool = await this.vabToken.balanceOf(this.VabbleDAO.address)
    console.log('====VABInStudioPool after allocateFromEdgePool(1000)::', VABInStudioPool.toString())

    const studioPoolUsers = await this.VabbleDAO.getPoolUsers(1);
    const edgePoolUsers = await this.VabbleDAO.getPoolUsers(2);
    expect(studioPoolUsers.length).to.be.equal(3) // customer-1, 2, 3
    expect(edgePoolUsers.length).to.be.equal(0)
    
    //============= setFinalFilms for funding(fundType = 1, token)
    // => Increase next block timestamp for only testing
    period = 31 * 24 * 3600; // 31 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    await this.VabbleDAO.startNewMonth()
    await this.VabbleDAO.setFinalFilms(
      [fId3], 
      [getBigNumber(200)]
    )  
    
    const month = await this.VabbleDAO.monthId() // 3
    const assignedAmount4 = await this.VabbleDAO.finalizedAmount(month, fId3, this.customer1.address)
    console.log("====assignedAmount4::", month.toString(), assignedAmount4.toString()) 

    const d_1 = await this.vabToken.balanceOf(this.customer1.address)
    await this.VabbleDAO.connect(this.customer1).claimReward([fId3], {from: this.customer1.address})
    const d_2 = await this.vabToken.balanceOf(this.customer1.address)
    console.log('====customer1 balance::', d_1.toString(), d_2.toString())
    // 9990  03211978603256546366 
    // 9990 103211978603256546366
    
    const list1 = await this.VabbleDAO.getUserFinalFilmIds(this.customer1.address); // 1 ~ 5
    const list2 = await this.VabbleDAO.getUserFinalFilmIds(this.customer2.address); // 1 ~ 5
    const list3 = await this.VabbleDAO.getUserFinalFilmIds(this.customer3.address); // 1 ~ 5
    const list4 = await this.VabbleDAO.getUserFinalFilmIds(this.customer4.address); // 3
    const list5 = await this.VabbleDAO.getUserFinalFilmIds(this.customer5.address); // 3
    const list6 = await this.VabbleDAO.getUserFinalFilmIds(this.customer6.address); // 3
    expect(list1.length).to.be.equal(5)
    expect(list2.length).to.be.equal(5)
    expect(list3.length).to.be.equal(5)
    expect(list4.length).to.be.equal(1)
    expect(list5.length).to.be.equal(1)
    expect(list6.length).to.be.equal(1)
    
    // ===== Withdraw all fund from stakingPool to rewardAddres passed in vote
    await this.Property.connect(this.auditor).updateDAOFundForTesting(this.sig1.address, {from: this.auditor.address})
    const totalRewardAmount = await this.StakingPool.totalRewardAmount()
    const curStakPoolBalance = await this.vabToken.balanceOf(this.StakingPool.address)
    const curEdgePoolBalance = await this.vabToken.balanceOf(this.Ownablee.address)
    const curStudioPoolBalance = await this.vabToken.balanceOf(this.VabbleDAO.address)

    await this.StakingPool.connect(this.auditor).withdrawAllFund({from: this.auditor.address})
        
    const aStakPoolBalance = await this.vabToken.balanceOf(this.StakingPool.address)
    const aEdgePoolBalance = await this.vabToken.balanceOf(this.Ownablee.address)
    const aStudioPoolBalance = await this.vabToken.balanceOf(this.VabbleDAO.address)
    expect(aStakPoolBalance).to.be.equal(curStakPoolBalance.sub(totalRewardAmount))
    expect(aEdgePoolBalance).to.be.equal(0)
    expect(aStudioPoolBalance).to.be.equal(0)

    console.log("====stakingPool", curStakPoolBalance.toString(), aStakPoolBalance.toString())
    console.log("====edgePool", curEdgePoolBalance.toString(), aEdgePoolBalance.toString())
    console.log("====studioPool", curStudioPoolBalance.toString(), aStudioPoolBalance.toString())

    const newAddrBalance = await this.vabToken.balanceOf(this.sig1.address)
    expect(newAddrBalance).to.be.equal(totalRewardAmount.add(curEdgePoolBalance).add(curStudioPoolBalance))

    const isGovWhitelist = await this.Property.checkGovWhitelist(2, this.auditor.address); // 0
    expect(isGovWhitelist).to.be.equal(0)
  });
})
});
