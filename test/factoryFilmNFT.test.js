const { expect } = require('chai');
const { ethers } = require('hardhat');
const { CONFIG, getBigNumber, DISCOUNT, getProposalFilm } = require('../scripts/utils');
const ERC20 = require('../data/ERC20.json');
const { BigNumber } = require('ethers');
const GNOSIS_FLAG = false;

describe('FactoryFilmNFT', function () {
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
    this.deployer = this.signers[0];

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

    this.signer1 = new ethers.Wallet(process.env.PK1, ethers.provider);
    this.signer2 = new ethers.Wallet(process.env.PK2, ethers.provider);        
  });

  beforeEach(async function () {
    this.vabToken = new ethers.Contract(CONFIG.mumbai.vabToken, JSON.stringify(ERC20), ethers.provider);
    this.EXM = new ethers.Contract(CONFIG.mumbai.exmAddress, JSON.stringify(ERC20), ethers.provider);
    this.USDC = new ethers.Contract(CONFIG.mumbai.usdcAdress, JSON.stringify(ERC20), ethers.provider);

    this.GnosisSafe = await (await this.GnosisSafeFactory.deploy()).deployed();
    this.auditor = GNOSIS_FLAG ? this.GnosisSafe : this.deployer;

    this.Ownablee = await (await this.OwnableFactory.deploy(
      CONFIG.daoWalletAddress, this.vabToken.address, this.USDC.address, this.auditor.address
    )).deployed(); 

    this.UniHelper = await (await this.UniHelperFactory.deploy(
      CONFIG.mumbai.uniswap.factory, CONFIG.mumbai.uniswap.router, CONFIG.mumbai.sushiswap.factory, CONFIG.mumbai.sushiswap.router,
      this.Ownablee.address
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
        this.FilmNFT.address
      )
    ).deployed();     
        
    this.TierNFT = await (
      await this.FactoryTierNFTFactory.deploy(
        this.Ownablee.address,      // Ownablee contract
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
    
    // Initialize Vote contract
    await this.Vote.connect(this.deployer).initialize(
        this.VabbleDAO.address,
        this.StakingPool.address,
        this.Property.address,
        this.UniHelper.address,
        {from: this.deployer.address}
  )

    
    // Initialize StakingPool
    await this.StakingPool.connect(this.deployer).initialize(
      this.VabbleDAO.address,
      this.Property.address,
      this.Vote.address,
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


    

    // ====== VAB
    // Transfering VAB token to user1, 2, 3
    await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(50000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer2.address, getBigNumber(50000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer3.address, getBigNumber(500000), {from: this.auditor.address});
    // Transfering VAB token to studio1, 2, 3
    await this.vabToken.connect(this.auditor).transfer(this.studio1.address, getBigNumber(5000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio2.address, getBigNumber(5000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio3.address, getBigNumber(5000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer4.address, getBigNumber(500000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer5.address, getBigNumber(500000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer6.address, getBigNumber(500000), {from: this.auditor.address});


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
    

    await this.vabToken.connect(this.customer1).approve(this.FilmNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.FilmNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.FilmNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer4).approve(this.FilmNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer5).approve(this.FilmNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer6).approve(this.FilmNFT.address, getBigNumber(100000000));


    await this.vabToken.connect(this.customer1).approve(this.Subscription.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.Subscription.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.Subscription.address, getBigNumber(100000000));

    await this.vabToken.connect(this.studio1).approve(this.VabbleDAO.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.VabbleDAO.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.VabbleDAO.address, getBigNumber(100000000));    
    
    await this.vabToken.connect(this.studio1).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio1).approve(this.FilmNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.FilmNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.FilmNFT.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio1).approve(this.Subscription.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.Subscription.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.Subscription.address, getBigNumber(100000000));

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
    if (USDCBalance > getBigNumber(450000, 6)) {
      // Transfering USDC token to user1, 2, 3                                            897497 291258
      await this.USDC.connect(this.auditor).transfer(this.customer1.address, getBigNumber(50000, 6), {from: this.auditor.address});
      await this.USDC.connect(this.auditor).transfer(this.customer2.address, getBigNumber(50000, 6), {from: this.auditor.address});
      await this.USDC.connect(this.auditor).transfer(this.customer3.address, getBigNumber(50000, 6), {from: this.auditor.address});
      await this.USDC.connect(this.auditor).transfer(this.customer4.address, getBigNumber(50000, 6), {from: this.auditor.address});
      await this.USDC.connect(this.auditor).transfer(this.customer5.address, getBigNumber(50000, 6), {from: this.auditor.address});
      await this.USDC.connect(this.auditor).transfer(this.customer6.address, getBigNumber(50000, 6), {from: this.auditor.address});

      console.log('====Before2');

      // Transfering USDC token to studio1, 2, 3
      await this.USDC.connect(this.auditor).transfer(this.studio1.address, getBigNumber(50000, 6), {from: this.auditor.address});
      await this.USDC.connect(this.auditor).transfer(this.studio2.address, getBigNumber(50000, 6), {from: this.auditor.address});
      await this.USDC.connect(this.auditor).transfer(this.studio3.address, getBigNumber(50000, 6), {from: this.auditor.address});

      console.log('====Before3');
    }
    
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

    console.log('====Before4');
    // Staking VAB token
    await this.StakingPool.connect(this.customer1).stakeVAB(getBigNumber(40000000), {from: this.customer1.address})
    await this.StakingPool.connect(this.customer2).stakeVAB(getBigNumber(40000000), {from: this.customer2.address})
    await this.StakingPool.connect(this.customer3).stakeVAB(getBigNumber(300), {from: this.customer3.address})    
    await this.StakingPool.connect(this.studio1).stakeVAB(getBigNumber(300), {from: this.studio1.address})
    await this.StakingPool.connect(this.studio2).stakeVAB(getBigNumber(300), {from: this.studio2.address})
    await this.StakingPool.connect(this.studio3).stakeVAB(getBigNumber(300), {from: this.studio3.address})

    console.log('====Before5');

    // Confirm auditor
    expect(await this.Ownablee.auditor()).to.be.equal(this.auditor.address);    
    
    this.events = [];
    
    this.bUri = 'https://ipfs.io/ipfs/'
    this.cUri = 'https://commanda.xyz/api/collection-metadata'
  });

  it('film nft contract deploy and mint, batchmint ', async function () {
    console.log('=====t-0')
    await expect(
        this.FilmNFT.connect(this.studio1).setBaseURI(this.bUri, this.cUri, {from: this.studio1.address})
    ).to.be.revertedWith('caller is not the auditor');

    await this.FilmNFT.connect(this.auditor).setBaseURI(this.bUri, this.cUri, {from: this.auditor.address})
    await this.Ownablee.connect(this.auditor).addDepositAsset([this.vabToken.address], {from: this.auditor.address})

    const title = 'film title - 1'
    const desc = 'film description - 1'
    const sharePercents = [getBigNumber(50, 8), getBigNumber(15, 8), getBigNumber(35, 8)]
    const studioPayees = [this.customer1.address, this.customer2.address, this.customer3.address]
    const raiseAmount = getBigNumber(150, 6)
    const fundPeriod = getBigNumber(20, 0)
    const fundType1 = 2
    const fundType2 = 3
    const enableClaimer = getBigNumber(0, 0)
    const enableClaimer1 = getBigNumber(1, 0)
    const noVote = 1

    console.log('=====t-1')
    
    // Create proposal for a film by studio
    await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(fundType1, noVote, this.USDC.address, {from: this.studio1.address})
    await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
      getBigNumber(1, 0), 
      title,
      desc,
      sharePercents, 
      studioPayees,  
      raiseAmount, 
      fundPeriod, 
      0,
      enableClaimer1,
      {from: this.studio1.address}
    )
  
    await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(fundType2, 0, this.USDC.address, {from: this.studio1.address})
    await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
      getBigNumber(2, 0), 
      title,
      desc,
      sharePercents, 
      studioPayees,  
      raiseAmount, 
      fundPeriod, 
      0,
      enableClaimer,
      {from: this.studio1.address}
    )

    const nftName = 'test nft'
    const nftSymbol = 'TNFT'
    const tx = await this.FilmNFT.connect(this.studio1).deployFilmNFTContract(
      getBigNumber(1,0), nftName, nftSymbol, {from: this.studio1.address}
    )
    this.events = (await tx.wait()).events
    const args = this.events[0].args;

    const [name, symbol] = await this.FilmNFT.nftInfo(args.nftContract)
    expect(nftName).to.be.equal(name)
    expect(nftSymbol).to.be.equal(symbol)
    console.log('=====nft info::', name, symbol)    
    
    // await expect(
    //   this.FilmNFT.connect(this.studio2).mint(
    //     getBigNumber(1,0), this.auditor.address, this.vabToken.address, {from: this.studio2.address}
    //   )
    // ).to.be.revertedWith('mint: no mint info');

    // const mintData = [mintData1, mintData2]
    await this.FilmNFT.connect(this.studio1).setMintInfo(
      getBigNumber(1, 0), getBigNumber(1, 0), getBigNumber(8000, 0), getBigNumber(2, 6),
      {from: this.studio1.address}
    )
    await this.FilmNFT.connect(this.studio1).setMintInfo(
      getBigNumber(2, 0), getBigNumber(1, 0), getBigNumber(9000, 0), getBigNumber(3, 6), 
      {from: this.studio1.address}
    )

    const mInfo = await this.FilmNFT.getMintInfo(1)
    expect(mInfo.tier_).to.be.equal(1)
    expect(mInfo.maxMintAmount_).to.be.equal(getBigNumber(8000, 0))
    expect(mInfo.mintPrice_).to.be.equal(getBigNumber(2, 6))
    
      //===================== Vote to film
    const proposalIds = [2]
    const voteInfos = [1];    
    
    // Staking from customer1,2,3 for vote
    const stakeAmount = getBigNumber(200)
    await this.StakingPool.connect(this.customer1).stakeVAB(stakeAmount, {from: this.customer1.address})
    await this.StakingPool.connect(this.customer2).stakeVAB(stakeAmount, {from: this.customer2.address})
    await this.StakingPool.connect(this.customer3).stakeVAB(stakeAmount, {from: this.customer3.address})
    await this.StakingPool.connect(this.studio1).stakeVAB(stakeAmount, {from: this.studio1.address})
       
    // Deposit to contract(VAB amount : 100, 200, 300)
    await this.StakingPool.connect(this.customer1).depositVAB(getBigNumber(1000), {from: this.customer1.address})
    await this.StakingPool.connect(this.customer2).depositVAB(getBigNumber(2000), {from: this.customer2.address})
    await this.StakingPool.connect(this.customer3).depositVAB(getBigNumber(3000), {from: this.customer3.address})
    
    console.log('=====t-3')    
    await this.Vote.connect(this.customer1).voteToFilms(proposalIds, voteInfos, {from: this.customer1.address}) //1,1,2,3
    await this.Vote.connect(this.customer2).voteToFilms(proposalIds, voteInfos, {from: this.customer2.address}) //1,1,2,3
    await this.Vote.connect(this.customer3).voteToFilms(proposalIds, voteInfos, {from: this.customer3.address}) //1,1,2,3   
    
    // => Increase next block timestamp for only testing
    const period = 10 * 24 * 3600; // filmVotePeriod = 10 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    // => Change the minVoteCount from 5 ppl to 3 ppl for testing
    await this.Property.connect(this.auditor).updatePropertyForTesting(3, 18, {from: this.auditor.address})

    console.log('=====t-4')    
    const approveData = [getBigNumber(2, 0)]
    await this.Vote.connect(this.studio1).approveFilms(approveData, {from: this.studio1.address})

    const film1_status = await this.VabbleDAO.getFilmStatus(getBigNumber(1,0))
    const film2_status = await this.VabbleDAO.getFilmStatus(getBigNumber(2,0))
    console.log('=====test::', film1_status, film2_status)
    //================= vote end =========
  })

  it('Tier nft contract deploy and mint', async function () {
    await expect(
        this.TierNFT.connect(this.studio1).setBaseURI(this.bUri, this.cUri, {from: this.studio1.address})
    ).to.be.revertedWith('caller is not the auditor');

    await this.TierNFT.connect(this.auditor).setBaseURI(this.bUri, this.cUri, {from: this.auditor.address})

    const title = 'film title - 1'
    const desc = 'film description - 1'
    const sharePercents = [getBigNumber(50, 8), getBigNumber(15, 8), getBigNumber(35, 8)]
    const studioPayees = [this.customer1.address, this.customer2.address, this.customer3.address]
    const raiseAmount = getBigNumber(150, 6)
    const fundPeriod = getBigNumber(20, 0)
    const fundType1 = 2
    const fundType2 = 3
    const enableClaimer = getBigNumber(0, 0)
    const enableClaimer1 = getBigNumber(1, 0)
    const noVote = 1
    
    // Create proposal for a film by studio
    await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(fundType1, noVote, this.USDC.address, {from: this.studio1.address})
    await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
      getBigNumber(1, 0), 
      title,
      desc,
      sharePercents, 
      studioPayees,  
      raiseAmount, 
      fundPeriod, 
      0,
      enableClaimer,
      {from: this.studio1.address}
    )

    await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(fundType2, 0, this.USDC.address, {from: this.studio1.address})
    await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
      getBigNumber(2, 0), 
      title,
      desc,
      sharePercents, 
      studioPayees,  
      raiseAmount, 
      fundPeriod, 
      0,
      enableClaimer1,
      {from: this.studio1.address}
    )

    //===================== Vote to film
    const proposalId1 = 1 // approved because noVote=1
    const proposalId2 = 2 // not approve because noVote=0
    const voteInfos = [1];

    console.log("=====t-5");
    
    // Staking from customer1,2,3 for vote
    const stakeAmount = getBigNumber(200)
    await this.StakingPool.connect(this.customer1).stakeVAB(stakeAmount, {from: this.customer1.address})
    await this.StakingPool.connect(this.customer2).stakeVAB(stakeAmount, {from: this.customer2.address})
    await this.StakingPool.connect(this.customer3).stakeVAB(stakeAmount, {from: this.customer3.address})
    await this.StakingPool.connect(this.studio1).stakeVAB(stakeAmount, {from: this.studio1.address})
       
    // Deposit to contract(VAB amount : 100, 200, 300)
    await this.StakingPool.connect(this.customer1).depositVAB(getBigNumber(1000), {from: this.customer1.address})
    await this.StakingPool.connect(this.customer2).depositVAB(getBigNumber(2000), {from: this.customer2.address})
    await this.StakingPool.connect(this.customer3).depositVAB(getBigNumber(3000), {from: this.customer3.address})
    
    await this.Vote.connect(this.customer1).voteToFilms([proposalId2], voteInfos, {from: this.customer1.address}) //1,1,2,3
    await this.Vote.connect(this.customer2).voteToFilms([proposalId2], voteInfos, {from: this.customer2.address}) //1,1,2,3
    await this.Vote.connect(this.customer3).voteToFilms([proposalId2], voteInfos, {from: this.customer3.address}) //1,1,2,3   

    console.log("=====t-6");
    
    // => Increase next block timestamp for only testing
    const period = 10 * 24 * 3600; // filmVotePeriod = 10 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    // => Change the minVoteCount from 5 ppl to 3 ppl for testing
    await this.Property.connect(this.auditor).updatePropertyForTesting(3, 18, {from: this.auditor.address})

    await this.Vote.connect(this.studio1).approveFilms([proposalId2], {from: this.studio1.address})

    const film1_status = await this.VabbleDAO.getFilmStatus(proposalId1)
    const film2_status = await this.VabbleDAO.getFilmStatus(proposalId2)
    expect(film1_status).to.be.equal(getBigNumber(3,0)) // APPROVED_FUNDING
    expect(film2_status).to.be.equal(getBigNumber(3,0)) // APPROVED_FUNDING
    //================= vote end =========

    console.log("=====t-7");

    // uint256 _filmId,
    // uint256[] memory _minAmounts,
    // uint256[] memory _maxAmounts
    const flag1 = 1;
    const dAmount = getBigNumber(50, 6)
    await this.VabbleFund.connect(this.customer1).depositToFilm(proposalId2, dAmount, flag1, this.USDC.address, {from: this.customer1.address})
    await this.VabbleFund.connect(this.customer2).depositToFilm(proposalId2, dAmount, flag1, this.USDC.address, {from: this.customer2.address})
    await this.VabbleFund.connect(this.customer3).depositToFilm(proposalId2, dAmount, flag1, this.USDC.address, {from: this.customer3.address})
    await this.VabbleFund.connect(this.customer4).depositToFilm(proposalId2, dAmount, flag1, this.USDC.address, {from: this.customer4.address})
    await this.VabbleFund.connect(this.customer5).depositToFilm(proposalId2, dAmount, flag1, this.USDC.address, {from: this.customer5.address})
    await this.VabbleFund.connect(this.customer6).depositToFilm(proposalId2, dAmount, flag1, this.USDC.address, {from: this.customer6.address})

    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    const minAmounts = [getBigNumber(100, 6), getBigNumber(1000, 6), getBigNumber(5000, 6)]
    const maxAmounts = [getBigNumber(1000, 6), getBigNumber(5000, 6), getBigNumber(0, 6)]
    await this.TierNFT.connect(this.studio1).setTierInfo(proposalId2, minAmounts, maxAmounts, {from: this.studio1.address})

    console.log("=====t-8");

    const tx = await this.TierNFT.connect(this.studio1).deployTierNFTContract(
      proposalId2, getBigNumber(1, 0), "tier1 nft", "t1-nft", {from: this.studio1.address}
    )    
    this.events = (await tx.wait()).events
    const args = this.events[0].args;
    const [name, symbol] = await this.TierNFT.nftInfo(args.nftContract)
    console.log('=====nft info::', name, symbol)   

    await this.TierNFT.connect(this.studio1).deployTierNFTContract(
      proposalId2, getBigNumber(2, 0), "tier2 nft", "t2-nft", {from: this.studio1.address}
    )
    await this.TierNFT.connect(this.studio1).deployTierNFTContract(
      proposalId2, getBigNumber(3, 0), "tier3 nft", "t3-nft", {from: this.studio1.address}
    )
    
    console.log("=====t-9");

    await this.TierNFT.connect(this.customer1).mintTierNft(proposalId2, {from: this.customer1.address})
    await this.TierNFT.connect(this.customer2).mintTierNft(proposalId2, {from: this.customer2.address})
    await this.TierNFT.connect(this.customer3).mintTierNft(proposalId2, {from: this.customer3.address})
    
    const [maxA1, minA1] = await this.TierNFT.tierInfo(proposalId2, 1)
    console.log('=====tier-1::', maxA1.toString(), minA1.toString())  //=====tier:: 1000 100
    const [maxA2, minA2] = await this.TierNFT.tierInfo(proposalId2, 2)
    console.log('=====tier-2::', maxA2.toString(), minA2.toString())  //=====tier:: 1000 100
    const [maxA3, minA3] = await this.TierNFT.tierInfo(proposalId2, 3)
    console.log('=====tier-3::', maxA3.toString(), minA3.toString())  //=====tier:: 1000 100

    const tSupply1 = await this.TierNFT.getTotalSupply(proposalId2, 1)
    console.log('=====tier-1 total supply::', tSupply1.toString())
    const tSupply2 = await this.TierNFT.getTotalSupply(proposalId2, 2)
    console.log('=====tier-2 total supply::', tSupply2.toString())
    const tSupply3 = await this.TierNFT.getTotalSupply(proposalId2, 3)
    console.log('=====tier-3 total supply::', tSupply3.toString())

    const tier1NFTTokenList = await this.TierNFT.getTierTokenIdList(proposalId2, 1)
    console.log('=====tier1NFTTokenList::', tier1NFTTokenList)
    const tier2NFTTokenList = await this.TierNFT.getTierTokenIdList(proposalId2, 2)
    console.log('=====tier2NFTTokenList::', tier2NFTTokenList)
    const tier3NFTTokenList = await this.TierNFT.getTierTokenIdList(proposalId2, 3)
    console.log('=====tier3NFTTokenList::', tier3NFTTokenList)
    const nftOwner = await this.TierNFT.getNFTOwner(proposalId2, tier3NFTTokenList[0], 3)
    console.log('=====nftOwner::', nftOwner, this.customer1.address, this.customer2.address, this.customer3.address)
    // await expect(
    //   this.TierNFT.connect(this.customer1).mintTierNft(proposalIds[0], {from: this.customer1.address})
    // )
    // .to.emit(this.TierNFT, 'TierERC721Minted')
    // .withArgs();

  })
});