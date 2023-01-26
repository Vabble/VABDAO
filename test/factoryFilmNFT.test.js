const { expect } = require('chai');
const { ethers } = require('hardhat');
const { CONFIG, getBigNumber, getVoteData, getProposalFilm } = require('../scripts/utils');
const ERC20 = require('../data/ERC20.json');
const { BigNumber } = require('ethers');

describe('FactoryFilmNFT', function () {
  before(async function () {        
    this.VabbleDAOFactory = await ethers.getContractFactory('VabbleDAO');
    this.VabbleFundingFactory = await ethers.getContractFactory('VabbleFunding');
    this.UniHelperFactory = await ethers.getContractFactory('UniHelper');
    this.StakingPoolFactory = await ethers.getContractFactory('StakingPool');
    this.VoteFactory = await ethers.getContractFactory('Vote');
    this.PropertyFactory = await ethers.getContractFactory('Property');
    this.FactoryFilmNFTFactory = await ethers.getContractFactory('FactoryFilmNFT');
    this.FactoryTierNFTFactory = await ethers.getContractFactory('FactoryTierNFT');
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
    // Transfering VAB token to user1, 2, 3
    await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(50000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer2.address, getBigNumber(50000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer3.address, getBigNumber(500000), {from: this.auditor.address});
    // Transfering VAB token to studio1, 2, 3
    await this.vabToken.connect(this.auditor).transfer(this.studio1.address, getBigNumber(5000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio2.address, getBigNumber(5000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio3.address, getBigNumber(5000000), {from: this.auditor.address});

    // Approve to transfer VAB token for each user, studio to DAO, StakingPool
    await this.vabToken.connect(this.customer1).approve(this.VabbleDAO.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.VabbleDAO.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.VabbleDAO.address, getBigNumber(100000000));   
    
    await this.vabToken.connect(this.customer1).approve(this.VabbleFunding.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.VabbleFunding.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.VabbleFunding.address, getBigNumber(100000000));   

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
    // Staking VAB token
    await this.StakingPool.connect(this.customer1).stakeVAB(getBigNumber(40000000), {from: this.customer1.address})
    await this.StakingPool.connect(this.customer2).stakeVAB(getBigNumber(40000000), {from: this.customer2.address})
    await this.StakingPool.connect(this.customer3).stakeVAB(getBigNumber(300), {from: this.customer3.address})    
    await this.StakingPool.connect(this.studio1).stakeVAB(getBigNumber(300), {from: this.studio1.address})
    await this.StakingPool.connect(this.studio2).stakeVAB(getBigNumber(300), {from: this.studio2.address})
    await this.StakingPool.connect(this.studio3).stakeVAB(getBigNumber(300), {from: this.studio3.address})
    // Confirm auditor
    expect(await this.Ownablee.auditor()).to.be.equal(this.auditor.address);    
    
    this.events = [];
  });

  // it('film nft contract deploy and mint, batchmint ', async function () {
  //   await expect(
  //       this.FilmNFT.connect(this.studio1).setBaseURI('https://ipfs.io/ipfs/', {from: this.studio1.address})
  //   ).to.be.revertedWith('caller is not the auditor');

  //   await this.FilmNFT.connect(this.auditor).setBaseURI('https://ipfs.io/ipfs/', {from: this.auditor.address})
  //   await this.Ownablee.connect(this.auditor).addDepositAsset([this.vabToken.address], {from: this.auditor.address})

  //   const nftRight = [getBigNumber(1,0), getBigNumber(2,0)]
  //   const sharePercents = [getBigNumber(10, 8), getBigNumber(15, 8), getBigNumber(25, 8)]
  //   const choiceAuditor = [this.auditor.address]
  //   const studioPayees = [this.customer1.address, this.customer2.address, this.customer3.address]
  //   const raiseAmount = getBigNumber(15000, 6)
  //   const fundPeriod = getBigNumber(120, 0)
  //   const fundType = getBigNumber(0, 0)
  //   // Create proposal for a film by studio
  //   await this.VabbleDAO.connect(this.studio1).proposalFilmCreate([0], this.vabToken.address, {from: this.studio1.address})
  //   console.log('=======test-0', this.studio1.address)
  //   const studioFilmId = await this.VabbleDAO.userFilmProposalIds(this.studio1.address, getBigNumber(0, 0))
  //   console.log('=======test-1', studioFilmId)
  //   await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
  //     studioFilmId, 
  //     nftRight, 
  //     sharePercents, 
  //     choiceAuditor, 
  //     studioPayees, 
  //     raiseAmount, 
  //     fundPeriod, 
  //     fundType,
  //     {from: this.studio1.address}
  //   )
  //   console.log('=======test-2')

  //   // Create proposal for a film by studio
  //   await this.VabbleDAO.connect(this.studio1).proposalFilmCreate([0], this.vabToken.address, {from: this.studio1.address})
  //   await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
  //     2, 
  //     nftRight, 
  //     sharePercents, 
  //     choiceAuditor, 
  //     studioPayees, 
  //     raiseAmount, 
  //     fundPeriod, 
  //     fundType,
  //     {from: this.studio1.address}
  //   )

  //   const tx = await this.FilmNFT.connect(this.studio1).deployFilmNFTContract(
  //     getBigNumber(1,0), "test nft", "t-nft", {from: this.studio1.address}
  //   )
  //   this.events = (await tx.wait()).events
  //   const args = this.events[0].args;

  //   const [name, symbol] = await this.FilmNFT.nftInfo(args.nftContract)
  //   console.log('=====nft info::', name, symbol)    
    
  //   await expect(
  //     this.FilmNFT.connect(this.studio2).mint(
  //       getBigNumber(1,0), this.auditor.address, this.vabToken.address, {from: this.studio2.address}
  //     )
  //   ).to.be.revertedWith('mint: no mint info');

  //   // _amount * _price * (1 - _feePercent / 1e10) > raiseAmount
  //   // 500 * 2*10**6 * (1 - 2*10**8 / 10**10) = 8000 * 20*10**6 * 0.98 //15000 000000 10000 000000
  //   // _filmId, _tier, _amount, _price, _feePercent, _revenuePercent
  //   // const mintData1 = createMintData(
  //   //   getBigNumber(1, 0), getBigNumber(1, 0), getBigNumber(8000, 0), getBigNumber(2, 6), getBigNumber(2, 8), getBigNumber(1, 8)
  //   // )
  //   // const mintData2 = createMintData(
  //   //   getBigNumber(2, 0), getBigNumber(1, 0), getBigNumber(9000, 0), getBigNumber(3, 6), getBigNumber(5, 8), getBigNumber(1, 8)
  //   // )
  //   // const mintData = [mintData1, mintData2]
  //   await this.FilmNFT.connect(this.studio1).setMintInfo(
  //     getBigNumber(1, 0), getBigNumber(1, 0), getBigNumber(8000, 0), getBigNumber(2, 6), getBigNumber(2, 8), getBigNumber(1, 8), 
  //     {from: this.studio1.address}
  //   )
  //   await this.FilmNFT.connect(this.studio1).setMintInfo(
  //     getBigNumber(2, 0), getBigNumber(1, 0), getBigNumber(9000, 0), getBigNumber(3, 6), getBigNumber(5, 8), getBigNumber(1, 8), 
  //     {from: this.studio1.address}
  //   )

  //   const mInfo = await this.FilmNFT.getMintInfo(1)
  //   expect(mInfo.tier_).to.be.equal(1)
  //   expect(mInfo.maxMintAmount_).to.be.equal(getBigNumber(8000, 0))
  //   expect(mInfo.mintPrice_).to.be.equal(getBigNumber(2, 6))
  //   expect(mInfo.feePercent_).to.be.equal(getBigNumber(2, 8))
  //   expect(mInfo.revenuePercent_).to.be.equal(getBigNumber(1, 8))
    
  //   console.log('=====mintInfo::', mInfo.studio_, mInfo.nft_)
  //   const ttx = await this.FilmNFT.connect(this.customer1).mint(
  //     getBigNumber(1,0), this.auditor.address, this.vabToken.address, {from: this.customer1.address}
  //   )    
  //   this.events = (await ttx.wait()).events
  //   const argss = this.events[9].args;
  //   console.log('====argss::', argss.nftContract, argss.tokenId)
  //   expect(mInfo.nft_).to.be.equal(argss.nftContract)

  //   const userTokenIdList = await this.FilmNFT.getUserTokenIdList(getBigNumber(1,0), this.auditor.address)
  //   console.log('====userTokenIdList::', userTokenIdList[0].toString())
  //   expect(userTokenIdList[0]).to.be.equal(argss.tokenId)

  //   // batch mint
  //   const txx = await this.FilmNFT.connect(this.customer1).mintToBatch(
  //     [getBigNumber(1,0), getBigNumber(1,0), getBigNumber(1,0)], 
  //     [this.customer1.address, this.customer2.address, this.customer3.address], 
  //     this.vabToken.address,
  //     {from: this.customer1.address}
  //   )
  //   this.events = (await txx.wait()).events
  //   const ar1 = this.events[7].args
  //   const ar2 = this.events[15].args
  //   const ar3 = this.events[23].args

  //   console.log('====events::', ar1.tokenId.toString(), ar2.tokenId.toString(), ar3.tokenId.toString())
  // })

  it('Tier nft contract deploy and mint', async function () {
    await expect(
        this.TierNFT.connect(this.studio1).setBaseURI('https://ipfs.io/ipfs/', {from: this.studio1.address})
    ).to.be.revertedWith('caller is not the auditor');

    await this.TierNFT.connect(this.auditor).setBaseURI('https://ipfs.io/ipfs/', {from: this.auditor.address})

    const nftRight = [getBigNumber(1,0), getBigNumber(2,0)]
    const sharePercents = [getBigNumber(10, 8), getBigNumber(15, 8), getBigNumber(25, 8)]
    const choiceAuditor = [this.auditor.address]
    const studioPayees = [this.customer1.address, this.customer2.address, this.customer3.address]
    const raiseAmount = getBigNumber(150, 6)
    const fundPeriod = getBigNumber(20, 0)
    const fundType = getBigNumber(3, 0)
    
    // Create proposal for a film by studio
    await this.VabbleDAO.connect(this.studio1).proposalFilmCreate([0, 0], this.vabToken.address, {from: this.studio1.address})
    await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
      getBigNumber(1, 0), 
      nftRight, 
      sharePercents, 
      choiceAuditor, 
      studioPayees, 
      raiseAmount, 
      fundPeriod, 
      fundType,
      {from: this.studio1.address}
    )
    await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
      getBigNumber(2, 0), 
      nftRight, 
      sharePercents, 
      choiceAuditor, 
      studioPayees, 
      raiseAmount, 
      fundPeriod, 
      fundType,
      {from: this.studio1.address}
    )

    //===================== Vote to film
    const proposalIds = [1, 2]
    const voteInfos = [1, 1];
    
    // Initialize Vote contract
    await this.Vote.connect(this.auditor).initializeVote(
      this.VabbleDAO.address,
      this.StakingPool.address,
      this.Property.address,
    )
    
    // Initialize StakingPool
    await this.StakingPool.connect(this.auditor).initializePool(
      this.VabbleDAO.address,
      this.VabbleFunding.address,
      this.Property.address,
      this.Vote.address,
      {from: this.auditor.address}
    )
    
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
    
    await this.Vote.connect(this.customer1).voteToFilms(proposalIds, voteInfos, {from: this.customer1.address}) //1,1,2,3
    await this.Vote.connect(this.customer2).voteToFilms(proposalIds, voteInfos, {from: this.customer2.address}) //1,1,2,3
    await this.Vote.connect(this.customer3).voteToFilms(proposalIds, voteInfos, {from: this.customer3.address}) //1,1,2,3   
    
    // => Increase next block timestamp for only testing
    const period = 10 * 24 * 3600; // filmVotePeriod = 10 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    // => Change the minVoteCount from 5 ppl to 3 ppl for testing
    await this.Property.connect(this.auditor).updatePropertyForTesting(3, 18, {from: this.auditor.address})

    const approveData = [getBigNumber(1, 0), getBigNumber(2, 0)]
    await this.Vote.connect(this.studio1).approveFilms(approveData, {from: this.studio1.address})

    const film1_status = await this.VabbleDAO.getFilmStatus(getBigNumber(1,0))
    const film2_status = await this.VabbleDAO.getFilmStatus(getBigNumber(2,0))
    console.log('=====test::', film1_status, film2_status)
    //================= vote end =========

    const depositAmount = getBigNumber(100000)
    const depositAmount1 = getBigNumber(10000)
    await this.VabbleFunding.connect(this.customer1).depositToFilm(
      proposalIds[0], depositAmount1, this.vabToken.address, {from: this.customer1.address}
    )
    await this.VabbleFunding.connect(this.customer2).depositToFilm(
      proposalIds[0], depositAmount, this.vabToken.address, {from: this.customer2.address}
    )
    await this.VabbleFunding.connect(this.customer3).depositToFilm(
      proposalIds[0], depositAmount, this.vabToken.address, {from: this.customer3.address}
    )

    // => Increase next block timestamp for only testing
    const period1 = 40 * 24 * 3600; // filmVotePeriod = 40 days
    network.provider.send('evm_increaseTime', [period1]);
    await network.provider.send('evm_mine');

    // uint256 _filmId,
    // uint256[] memory _minAmounts,
    // uint256[] memory _maxAmounts
    const minAmounts = [getBigNumber(100, 6), getBigNumber(1000, 6), getBigNumber(5000, 6)]
    const maxAmounts = [getBigNumber(1000, 6), getBigNumber(5000, 6), getBigNumber(0, 6)]
    await this.TierNFT.connect(this.studio1).setTierInfo(proposalIds[0], minAmounts, maxAmounts, {from: this.studio1.address})

    const tx = await this.TierNFT.connect(this.studio1).deployTierNFTContract(
      getBigNumber(1,0), getBigNumber(1, 0), "tier1 nft", "t1-nft", {from: this.studio1.address}
    )    
    this.events = (await tx.wait()).events
    const args = this.events[0].args;
    const [name, symbol] = await this.TierNFT.nftInfo(args.nftContract)
    console.log('=====nft info::', name, symbol)   

    await this.TierNFT.connect(this.studio1).deployTierNFTContract(
      getBigNumber(1,0), getBigNumber(2, 0), "tier2 nft", "t2-nft", {from: this.studio1.address}
    )
    await this.TierNFT.connect(this.studio1).deployTierNFTContract(
      getBigNumber(1,0), getBigNumber(3, 0), "tier3 nft", "t3-nft", {from: this.studio1.address}
    )
    await this.TierNFT.connect(this.customer1).mintTierNft(proposalIds[0], {from: this.customer1.address})
    await this.TierNFT.connect(this.customer2).mintTierNft(proposalIds[0], {from: this.customer2.address})
    await this.TierNFT.connect(this.customer3).mintTierNft(proposalIds[0], {from: this.customer3.address})

    const [maxA1, minA1] = await this.TierNFT.tierInfo(proposalIds[0], 1)
    console.log('=====tier-1::', maxA1.toString(), minA1.toString())  //=====tier:: 1000 100
    const [maxA2, minA2] = await this.TierNFT.tierInfo(proposalIds[0], 2)
    console.log('=====tier-2::', maxA2.toString(), minA2.toString())  //=====tier:: 1000 100
    const [maxA3, minA3] = await this.TierNFT.tierInfo(proposalIds[0], 3)
    console.log('=====tier-3::', maxA3.toString(), minA3.toString())  //=====tier:: 1000 100

    const tSupply1 = await this.TierNFT.getTotalSupply(proposalIds[0], 1)
    console.log('=====tier-1 total supply::', tSupply1.toString())
    const tSupply2 = await this.TierNFT.getTotalSupply(proposalIds[0], 2)
    console.log('=====tier-2 total supply::', tSupply2.toString())
    const tSupply3 = await this.TierNFT.getTotalSupply(proposalIds[0], 3)
    console.log('=====tier-3 total supply::', tSupply3.toString())

    const tier1NFTTokenList = await this.TierNFT.getTierTokenIdList(proposalIds[0], 1)
    console.log('=====tier1NFTTokenList::', tier1NFTTokenList)
    const tier2NFTTokenList = await this.TierNFT.getTierTokenIdList(proposalIds[0], 2)
    console.log('=====tier2NFTTokenList::', tier2NFTTokenList)
    const tier3NFTTokenList = await this.TierNFT.getTierTokenIdList(proposalIds[0], 3)
    console.log('=====tier3NFTTokenList::', tier3NFTTokenList)
    const nftOwner = await this.TierNFT.getNFTOwner(proposalIds[0], tier1NFTTokenList[0], 1)
    console.log('=====nftOwner::', nftOwner, this.customer1.address, this.customer2.address, this.customer3.address)
    // await expect(
    //   this.TierNFT.connect(this.customer1).mintTierNft(proposalIds[0], {from: this.customer1.address})
    // )
    // .to.emit(this.TierNFT, 'TierERC721Minted')
    // .withArgs();

  })
});