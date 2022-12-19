const { expect } = require('chai');
const { ethers } = require('hardhat');
const { CONFIG, getBigNumber, createMintData, getProposalFilm } = require('../scripts/utils');
const ERC20 = require('../data/ERC20.json');
const { BigNumber } = require('ethers');

describe('FactoryFilmNFT', function () {
  before(async function () {        
    this.VabbleDAOFactory = await ethers.getContractFactory('VabbleDAO');
    this.UniHelperFactory = await ethers.getContractFactory('UniHelper');
    this.StakingPoolFactory = await ethers.getContractFactory('StakingPool');
    this.VoteFactory = await ethers.getContractFactory('Vote');
    this.PropertyFactory = await ethers.getContractFactory('Property');
    this.NFTFactory = await ethers.getContractFactory('FactoryFilmNFT');
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

    this.ownableContract = await (await this.OwnableFactory.deploy()).deployed(); 

    this.uniHelperContract = await (await this.UniHelperFactory.deploy(
      CONFIG.mumbai.uniswap.factory, CONFIG.mumbai.uniswap.router, CONFIG.mumbai.sushiswap.factory, CONFIG.mumbai.sushiswap.router
    )).deployed();

    this.stakingContract = await (await this.StakingPoolFactory.deploy(this.ownableContract.address)).deployed(); 

    this.voteContract = await (await this.VoteFactory.deploy(this.ownableContract.address)).deployed();
      
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

    this.DAOContract = await (
      await this.VabbleDAOFactory.deploy(
        this.ownableContract.address,
        this.voteContract.address,
        this.stakingContract.address,
        this.uniHelperContract.address,
        this.propertyContract.address
      )
    ).deployed();   
    
    this.NFTContract = await (
      await this.NFTFactory.deploy(this.ownableContract.address)
    ).deployed();   

    this.subContract = await (
      await this.SubscriptionFactory.deploy(
        this.ownableContract.address,
        this.uniHelperContract.address,
        this.propertyContract.address,
        this.DAOContract.address,
        this.NFTContract.address,
        CONFIG.daoWalletAddress
      )
    ).deployed();    
     
 
    await this.NFTContract.connect(this.auditor).initializeFactory(
      this.stakingContract.address,
      this.uniHelperContract.address,
      this.propertyContract.address,
      this.DAOContract.address, 
      this.subContract.address,  
      CONFIG.daoWalletAddress,
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
    await this.vabToken.connect(this.customer1).approve(this.DAOContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.DAOContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.DAOContract.address, getBigNumber(100000000));   
    await this.vabToken.connect(this.customer1).approve(this.stakingContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.stakingContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.stakingContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer1).approve(this.NFTContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.NFTContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.NFTContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer1).approve(this.subContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.subContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.subContract.address, getBigNumber(100000000));

    await this.vabToken.connect(this.studio1).approve(this.DAOContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.DAOContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.DAOContract.address, getBigNumber(100000000));    
    await this.vabToken.connect(this.studio1).approve(this.stakingContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.stakingContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.stakingContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio1).approve(this.NFTContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.NFTContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.NFTContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio1).approve(this.subContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.subContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.subContract.address, getBigNumber(100000000));

    // Initialize StakingPool
    await this.stakingContract.connect(this.auditor).initializePool(
      this.DAOContract.address,
      this.voteContract.address,
      this.propertyContract.address,
      {from: this.auditor.address}
    )  
    // Staking VAB token
    await this.stakingContract.connect(this.customer1).stakeToken(getBigNumber(40000000), {from: this.customer1.address})
    await this.stakingContract.connect(this.customer2).stakeToken(getBigNumber(40000000), {from: this.customer2.address})
    await this.stakingContract.connect(this.customer3).stakeToken(getBigNumber(300), {from: this.customer3.address})    
    await this.stakingContract.connect(this.studio1).stakeToken(getBigNumber(300), {from: this.studio1.address})
    await this.stakingContract.connect(this.studio2).stakeToken(getBigNumber(300), {from: this.studio2.address})
    await this.stakingContract.connect(this.studio3).stakeToken(getBigNumber(300), {from: this.studio3.address})
    // Confirm auditor
    expect(await this.ownableContract.auditor()).to.be.equal(this.auditor.address);    
    
    this.events = [];
  });

  it('film nft contract deploy and mint, batchmint ', async function () {
    await expect(
        this.NFTContract.connect(this.studio1).setBaseURI('https://ipfs.io/ipfs/', {from: this.studio1.address})
    ).to.be.revertedWith('caller is not the auditor');

    await this.NFTContract.connect(this.auditor).setBaseURI('https://ipfs.io/ipfs/', {from: this.auditor.address})
    await this.ownableContract.connect(this.auditor).addDepositAsset([this.vabToken.address], {from: this.auditor.address})

    const nftRight = [getBigNumber(1,0), getBigNumber(2,0)]
    const sharePercents = [getBigNumber(10, 8), getBigNumber(15, 8), getBigNumber(25, 8)]
    const choiceAuditor = [getBigNumber(1, 0)]
    const studioPayees = [this.customer1.address, this.customer2.address, this.customer3.address]
    const gatingType = getBigNumber(2, 0)
    const rentPrice = getBigNumber(20, 6)
    const raiseAmount = getBigNumber(15000, 6)
    const fundPeriod = getBigNumber(120, 0)
    const fundStage = getBigNumber(2, 0)
    const fundType = getBigNumber(2, 0)
    this.filmPropsoal = getProposalFilm(nftRight, sharePercents, choiceAuditor, studioPayees, gatingType, rentPrice, raiseAmount, fundPeriod, fundStage, fundType)
    // Create proposal for a film by studio
    await this.DAOContract.connect(this.studio1).proposalFilm(this.filmPropsoal, false, {from: this.studio1.address})
    this.filmPropsoal = getProposalFilm(nftRight, sharePercents, choiceAuditor, studioPayees, gatingType, rentPrice, raiseAmount, fundPeriod, fundStage, fundType)
    // Create proposal for a film by studio
    await this.DAOContract.connect(this.studio1).proposalFilm(this.filmPropsoal, false, {from: this.studio1.address});

    const tx = await this.NFTContract.connect(this.studio1).deployFilmNFTContract(
      getBigNumber(1,0), "test nft", "t-nft", {from: this.studio1.address}
    )
    this.events = (await tx.wait()).events
    const args = this.events[0].args;

    const [name, symbol] = await this.NFTContract.getNFTInfo(args.nftContract)
    console.log('=====nft info::', name, symbol)    
    
    await expect(
      this.NFTContract.connect(this.studio2).mint(
        getBigNumber(0,0), getBigNumber(1,0), this.auditor.address, this.vabToken.address, {from: this.studio2.address}
      )
    ).to.be.revertedWith('mint: no mint info');

    // _amount * _price * (1 - _feePercent / 1e10) > raiseAmount
    // 500 * 2*10**6 * (1 - 2*10**8 / 10**10) = 8000 * 20*10**6 * 0.98 //15000 000000 10000 000000
    // _filmId, _tier, _amount, _price, _feePercent, _revenuePercent
    const mintData1 = createMintData(
      getBigNumber(1, 0), getBigNumber(1, 0), getBigNumber(8000, 0), getBigNumber(2, 6), getBigNumber(2, 8), getBigNumber(1, 8)
    )
    const mintData2 = createMintData(
      getBigNumber(2, 0), getBigNumber(1, 0), getBigNumber(9000, 0), getBigNumber(3, 6), getBigNumber(5, 8), getBigNumber(1, 8)
    )
    const mintData = [mintData1, mintData2]
    await this.NFTContract.connect(this.studio1).setMintInfo(mintData, {from: this.studio1.address})

    const mInfo = await this.NFTContract.getMintInfo(1)
    expect(mInfo.tier_).to.be.equal(1)
    expect(mInfo.maxMintAmount_).to.be.equal(getBigNumber(8000, 0))
    expect(mInfo.mintPrice_).to.be.equal(getBigNumber(2, 6))
    expect(mInfo.feePercent_).to.be.equal(getBigNumber(2, 8))
    expect(mInfo.revenuePercent_).to.be.equal(getBigNumber(1, 8))
    
    console.log('=====mintInfo::', mInfo.studio_, mInfo.nft_)
    const ttx = await this.NFTContract.connect(this.customer1).mint(
      getBigNumber(0,0), getBigNumber(1,0), this.auditor.address, this.vabToken.address, {from: this.customer1.address}
    )    
    this.events = (await ttx.wait()).events
    const argss = this.events[9].args;
    console.log('====argss::', argss.nftContract, argss.tokenId)
    expect(mInfo.nft_).to.be.equal(argss.nftContract)

    const userTokenIdList = await this.NFTContract.getUserTokenIdList(getBigNumber(0,0), this.auditor.address)
    console.log('====userTokenIdList::', userTokenIdList[0].toString())
    expect(userTokenIdList[0]).to.be.equal(argss.tokenId)

    // batch mint
    const txx = await this.NFTContract.connect(this.customer1).mintToBatch(
      getBigNumber(0,0), 
      [getBigNumber(1,0), getBigNumber(1,0), getBigNumber(1,0)], 
      [this.customer1.address, this.customer2.address, this.customer3.address], 
      this.vabToken.address,
      {from: this.customer1.address}
    )
    this.events = (await txx.wait()).events
    const ar1 = this.events[7].args
    const ar2 = this.events[15].args
    const ar3 = this.events[23].args

    console.log('====events::', ar1.tokenId.toString(), ar2.tokenId.toString(), ar3.tokenId.toString())
  })
});