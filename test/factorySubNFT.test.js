const { expect } = require('chai');
const { ethers } = require('hardhat');
const { CONFIG, getBigNumber, createMintData, getProposalFilm } = require('../scripts/utils');
const ERC20 = require('../data/ERC20.json');
const ERC721 = require('../data/ERC721.json');
const { BigNumber } = require('ethers');

describe('FactorySubscriptionNFT', function () {
  before(async function () {        
    this.VabbleDAOFactory = await ethers.getContractFactory('VabbleDAO');
    this.UniHelperFactory = await ethers.getContractFactory('UniHelper');
    this.StakingPoolFactory = await ethers.getContractFactory('StakingPool');
    this.VoteFactory = await ethers.getContractFactory('Vote');
    this.PropertyFactory = await ethers.getContractFactory('Property');
    this.NFTFactory = await ethers.getContractFactory('FactorySubNFT');
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

  // it('nft deploy and mint ', async function () {
  //   const baseUri = 'https://ipfs.io/ipfs/'
  //   await this.NFTContract.connect(this.auditor).setBaseURI(baseUri, {from: this.auditor.address})
  //   await this.ownableContract.connect(this.auditor).addDepositAsset([this.vabToken.address], {from: this.auditor.address})

  //   // subscription NFT contract deploy
  //   await expect(
  //     this.NFTContract.connect(this.studio2).deploySubNFTContract(
  //       "sub test", "s-nft", {from: this.studio2.address}
  //     )
  //   ).to.be.revertedWith('caller is not the auditor');

  //   const trx = await this.NFTContract.connect(this.auditor).deploySubNFTContract("sub test", "s-nft", {from: this.auditor.address})
  //   this.events = (await trx.wait()).events
  //   const ars = this.events[0].args;
  //   expect(ars.nftCreator).to.be.equal(this.auditor.address)
  //   expect(ars.nftContract).to.be.equal(await this.NFTContract.subNFTAddress())
  //   console.log('====deployed subscription nft::', ars.nftContract, ars.nftCreator)

  //   // subscription NFT mint
  //   await expect(
  //     this.NFTContract.connect(this.customer1).mint(
  //       this.vabToken.address, this.customer1.address, getBigNumber(2,0), getBigNumber(1,0), {from: this.customer1.address}
  //     )
  //   ).to.be.revertedWith('mint: no admin mint info');

  //   // set admin mint info for each category => (mintAmount, mintPrice, lockPeriod, category)
  //   await this.NFTContract.connect(this.auditor).setMintInfo(
  //     getBigNumber(100, 0), getBigNumber(2, 0), getBigNumber(15*86400, 0), getBigNumber(1, 0), {from: this.auditor.address}
  //   )

  //   const mintInfo = await this.NFTContract.getMintInfo(getBigNumber(1,0));
  //   console.log('=====mint info::', mintInfo.mintAmount_, mintInfo.mintPrice_);

  //   // _token, _to, _period, _category
  //   const t = await this.NFTContract.connect(this.customer1).mint(
  //     this.vabToken.address, this.customer1.address, getBigNumber(2,0), getBigNumber(1,0), {from: this.customer1.address}
  //   )    
  //   this.events = (await t.wait()).events
  //   const ar13 = this.events[13].args
  //   expect(ar13.receiver).to.be.equal(this.NFTContract.address)
  //   expect(ar13.period).to.be.equal(getBigNumber(2,0))
  //   expect(ar13.tokenId).to.be.equal(getBigNumber(1,0))

  //   let tokenIdList = await this.NFTContract.getUserTokenIdList(this.NFTContract.address)    
  //   expect(tokenIdList.length).to.be.equal(getBigNumber(1,0))
  //   let tokenUri = await this.NFTContract.getTokenUri(tokenIdList[0])  
  //   expect(tokenUri).to.be.equal(baseUri + '1.json')
  // })

  it('nft lock and unlock ', async function () {
    const baseUri = 'https://ipfs.io/ipfs/'
    await this.NFTContract.connect(this.auditor).setBaseURI(baseUri, {from: this.auditor.address})
    await this.ownableContract.connect(this.auditor).addDepositAsset([this.vabToken.address], {from: this.auditor.address})
    await this.NFTContract.connect(this.auditor).deploySubNFTContract("sub test", "s-nft", {from: this.auditor.address})
    const deployedAddress = await this.NFTContract.subNFTAddress();
    const deployContract = new ethers.Contract(deployedAddress, JSON.stringify(ERC721), ethers.provider);

    // set admin mint info for each category => (mintAmount, mintPrice, lockPeriod, category)
    await this.NFTContract.connect(this.auditor).setMintInfo(
      getBigNumber(100, 0), getBigNumber(2, 0), getBigNumber(0, 0), getBigNumber(1, 0), {from: this.auditor.address}
    )

    const mintInfo = await this.NFTContract.getMintInfo(getBigNumber(1,0));
    console.log('=====mint info::', mintInfo.mintAmount_.toString(), mintInfo.mintPrice_.toString(), mintInfo.lockPeriod_.toString());

    // _token, _to, _period, _category
    await this.NFTContract.connect(this.customer1).mint(
      this.vabToken.address, this.customer1.address, getBigNumber(2,0), getBigNumber(1,0), {from: this.customer1.address}
    )

    let tokenIdList = await this.NFTContract.getUserTokenIdList(this.customer1.address)    
    console.log('====tokenId::', tokenIdList[0])

    //========= NFT lock =========
    await expect(
      this.NFTContract.connect(this.customer2).lockNFT(tokenIdList[0], {from: this.customer2.address})
    ).to.be.revertedWith('lock: not token owner');

    // set admin mint info for each category => (mintAmount, mintPrice, lockPeriod, category)
    const lockPeriod = 15 * 86400;
    await this.NFTContract.connect(this.auditor).setMintInfo(
      getBigNumber(100, 0), getBigNumber(2, 0), getBigNumber(lockPeriod, 0), getBigNumber(1, 0), {from: this.auditor.address}
    )
    console.log('=====again set mint info')

    // Approve nft from msg.sender to operator
    await deployContract.connect(this.customer1).setApprovalForAll(this.NFTContract.address, true, {from: this.customer1.address})

    // Lock
    await this.NFTContract.connect(this.customer1).lockNFT(tokenIdList[0], {from: this.customer1.address})
    console.log('=====locked::', tokenIdList[0].toString())

    let lockInfo = await this.NFTContract.getLockInfo(tokenIdList[0]);
    console.log('=====info after locked::', 
      lockInfo.subPeriod_.toString(), 
      lockInfo.lockPeriod_.toString(),
      lockInfo.lockTime_.toString(), 
      lockInfo.category_.toString(), 
      lockInfo.minter_.toString()
    )
    //========= NFT unlock =========
    // => Increase next block timestamp for only testing
    let period = 24 * 3600 // 1 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');
    
    await expect(
      this.NFTContract.connect(this.customer2).unlockNFT(tokenIdList[0], {from: this.customer2.address})
    ).to.be.revertedWith('unlock: not token minter');

    await expect(
      this.NFTContract.connect(this.customer1).unlockNFT(tokenIdList[0], {from: this.customer1.address})
    ).to.be.revertedWith('unlock: locked yet');

    period = lockPeriod + 24 * 3600 // 16 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    await this.NFTContract.connect(this.customer1).unlockNFT(tokenIdList[0], {from: this.customer1.address})

    lockInfo = await this.NFTContract.getLockInfo(tokenIdList[0]);
    console.log('=====info after unlocked::', 
      lockInfo.subPeriod_.toString(), 
      lockInfo.lockPeriod_.toString(),
      lockInfo.lockTime_.toString(), 
      lockInfo.category_.toString(), 
      lockInfo.minter_.toString()
    )

    // ========= NFT lock again ======
    await this.NFTContract.connect(this.customer1).lockNFT(tokenIdList[0], {from: this.customer1.address})
    lockInfo = await this.NFTContract.getLockInfo(tokenIdList[0]);
    console.log('=====info after locked again::', 
      lockInfo.subPeriod_.toString(), 
      lockInfo.lockPeriod_.toString(),
      lockInfo.lockTime_.toString(), 
      lockInfo.category_.toString(), 
      lockInfo.minter_.toString()
    )
  })
  
});