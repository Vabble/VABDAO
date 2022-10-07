const { expect } = require('chai');
const { ethers } = require('hardhat');
const ERC20 = require('../data/ERC20.json');
const { CONFIG, NFTs, getUploadGateContent, getBigNumber, getFinalFilm, getVoteData, getProposalFilm } = require('../scripts/utils');

describe('Subscription', function () {
  before(async function () {
    this.VabbleDAOFactory = await ethers.getContractFactory('VabbleDAO');
    this.VoteFactory = await ethers.getContractFactory('Vote');
    this.UniHelperFactory = await ethers.getContractFactory('UniHelper');
    this.StakingPoolFactory = await ethers.getContractFactory('StakingPool');
    this.PropertyFactory = await ethers.getContractFactory('Property');
    this.SubscriptionFactory = await ethers.getContractFactory('Subscription');
    this.OwnableFactory = await ethers.getContractFactory('Ownablee');

    this.signers = await ethers.getSigners();
    this.auditor = this.signers[0];
    this.newAuditor = this.signers[1];    
    this.studio1 = this.signers[2];    
    this.studio2 = this.signers[3];     
    this.customer1 = this.signers[4];
    this.customer2 = this.signers[5];
  });

  beforeEach(async function () {
    this.vabToken = new ethers.Contract(CONFIG.mumbai.vabToken, JSON.stringify(ERC20), ethers.provider);
    this.EXM = new ethers.Contract(CONFIG.mumbai.exmAddress, JSON.stringify(ERC20), ethers.provider);
    this.USDC = new ethers.Contract(CONFIG.mumbai.usdcAdress, JSON.stringify(ERC20), ethers.provider);

    this.ownableContract = await (await this.OwnableFactory.deploy()).deployed(); 

    this.uniHelperContract = await (await this.UniHelperFactory.deploy(
      CONFIG.mumbai.uniswap.factory, CONFIG.mumbai.uniswap.router, CONFIG.mumbai.sushiswap.factory, CONFIG.mumbai.sushiswap.router
    )).deployed();

    this.stakingContract = await (await this.StakingPoolFactory.deploy(
      this.vabToken.address, this.ownableContract.address
    )).deployed(); 

    this.voteContract = await (await this.VoteFactory.deploy(
      this.vabToken.address, this.ownableContract.address
    )).deployed();
    
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
        this.vabToken.address,
        this.ownableContract.address,
        this.voteContract.address,
        this.stakingContract.address,
        this.uniHelperContract.address,
        this.propertyContract.address,
        this.USDC.address 
      )
    ).deployed();    

    this.SubContract = await (
      await this.SubscriptionFactory.deploy(
        this.vabToken.address,
        this.ownableContract.address,
        this.uniHelperContract.address,
        this.propertyContract.address,
        this.DAOContract.address,
        this.USDC.address,
        CONFIG.daoWalletAddress
      )
    ).deployed();    

    expect(await this.ownableContract.auditor()).to.be.equal(this.auditor.address);
        
    // Auditor add studio1, studio2 in the studio whitelist
    await expect(
      this.ownableContract.addStudio(this.studio1.address)
    ).to.emit(this.ownableContract, 'StudioAdded').withArgs(this.auditor.address, this.studio1.address);    
    await this.ownableContract.connect(this.auditor).addStudio(this.studio2.address, {from: this.auditor.address})

    // ====== VAB
    // Transfering VAB token to user1, 2
    await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer2.address, getBigNumber(10000000), {from: this.auditor.address});
    // Transfering VAB token to studio1, 2
    await this.vabToken.connect(this.auditor).transfer(this.studio1.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio2.address, getBigNumber(10000000), {from: this.auditor.address});

    // Approve to transfer VAB token for each user, studio to Subscription
    await this.vabToken.connect(this.customer1).approve(this.SubContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.SubContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer1).approve(this.stakingContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.stakingContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer1).approve(this.DAOContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.DAOContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio1).approve(this.SubContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.SubContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio1).approve(this.DAOContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.DAOContract.address, getBigNumber(100000000));
    
    // ====== EXM
    // Transfering EXM token to user1, 2
    await this.EXM.connect(this.auditor).transfer(this.customer1.address, getBigNumber(50000), {from: this.auditor.address});
    await this.EXM.connect(this.auditor).transfer(this.customer2.address, getBigNumber(50000), {from: this.auditor.address});
    // Transfering EXM token to studio1, 2
    await this.EXM.connect(this.auditor).transfer(this.studio1.address, getBigNumber(50000), {from: this.auditor.address});
    await this.EXM.connect(this.auditor).transfer(this.studio2.address, getBigNumber(50000), {from: this.auditor.address});

    // Approve to transfer EXM token for each user, studio to Subscription
    await this.EXM.connect(this.customer1).approve(this.SubContract.address, getBigNumber(100000));
    await this.EXM.connect(this.customer2).approve(this.SubContract.address, getBigNumber(100000));   
    await this.EXM.connect(this.customer1).approve(this.stakingContract.address, getBigNumber(100000));
    await this.EXM.connect(this.customer2).approve(this.stakingContract.address, getBigNumber(100000));
    await this.EXM.connect(this.customer1).approve(this.DAOContract.address, getBigNumber(100000));
    await this.EXM.connect(this.customer2).approve(this.DAOContract.address, getBigNumber(100000));
    await this.EXM.connect(this.studio1).approve(this.SubContract.address, getBigNumber(100000));
    await this.EXM.connect(this.studio2).approve(this.SubContract.address, getBigNumber(100000));
    await this.EXM.connect(this.studio1).approve(this.DAOContract.address, getBigNumber(100000));
    await this.EXM.connect(this.studio2).approve(this.DAOContract.address, getBigNumber(100000));

    this.rentPrices = [getBigNumber(100), getBigNumber(200), getBigNumber(300), getBigNumber(400)];
    this.fundPeriods = [getBigNumber(20 * 86400, 0), getBigNumber(30 * 86400, 0), getBigNumber(60 * 86400, 0), getBigNumber(10 * 86400, 0)];
    this.filmPropsoal = [];
    this.events = [];

  });

  it('0. Subscription by token', async function () {
    const period = 1;
    //================= VAB token
    await expect(
      this.SubContract.connect(this.customer1).activeSubscription(this.vabToken.address, period, {from: this.customer1.address})
    ).to.emit(this.SubContract, 'SubscriptionActivated').withArgs(
      this.customer1.address, 
      this.vabToken.address, 
      period
    );    
    // const {time_, period_} = await this.SubContract.getSubscriptionInfo(this.customer1.address)
    // console.log('====time, period::', time_.toString(), period_.toString())

    const isActived = await this.SubContract.connect(this.customer1).isActivedSubscription({from: this.customer1.address})    
    expect(isActived).to.be.true;  
    console.log('====test-1')
    // => Increase next block timestamp for only testing
    const increseTime = 40 * 24 * 3600; // 40 days
    network.provider.send('evm_increaseTime', [increseTime]);
    await network.provider.send('evm_mine');
            
    expect(await this.SubContract.connect(this.customer1).isActivedSubscription({from: this.customer1.address})).to.be.false;  

    //================ EXM token
    await expect(
      this.SubContract.connect(this.customer2).activeSubscription(this.EXM.address, period, {from: this.customer2.address})
    ).to.emit(this.SubContract, 'SubscriptionActivated').withArgs(
      this.customer2.address, 
      this.EXM.address, 
      period
    );

    expect(await this.SubContract.connect(this.customer2).isActivedSubscription({from: this.customer2.address})).to.be.true;

    // => Increase next block timestamp for only testing
    network.provider.send('evm_increaseTime', [increseTime]);
    await network.provider.send('evm_mine');
            
    expect(await this.SubContract.connect(this.customer2).isActivedSubscription({from: this.customer2.address})).to.be.false;  

    console.log('====test-2')

    //================ ETH
    const period2 = 2
    const payEth = ethers.utils.parseEther('0.01')
    await expect(
      this.SubContract.connect(this.customer2).activeSubscription(CONFIG.addressZero, period2, {from: this.customer2.address, value: payEth})
    ).to.emit(this.SubContract, 'SubscriptionActivated').withArgs(
      this.customer2.address, 
      CONFIG.addressZero, 
      period2
    );

    console.log('====test-3')
    expect(await this.SubContract.connect(this.customer2).isActivedSubscription({from: this.customer2.address})).to.be.true;  
    
    // => Increase next block timestamp for only testing
    network.provider.send('evm_increaseTime', [increseTime]);
    await network.provider.send('evm_mine');
            
    expect(await this.SubContract.connect(this.customer2).isActivedSubscription({from: this.customer2.address})).to.be.true;  
  });

  // it('1. Subscription NFTs', async function () {

  //   expect(await this.SubContract.isRegisteredNFT(NFTs.mumbai.addressList[0])).to.be.false;  

  //   // Register NFT addresses by Auditor 
  //   await expect(
  //     this.SubContract.connect(this.auditor).registerNFTs(NFTs.mumbai.addressList, NFTs.mumbai.periodList, {from: this.auditor.address})
  //   ).to.emit(this.SubContract, 'NFTsRegistered').withArgs(NFTs.mumbai.addressList);   

  //   expect((await this.SubContract.getRegisteredNFTList()).length).to.be.equal(NFTs.mumbai.addressList.length)
  //   expect(await this.SubContract.connect(this.customer1).isActivedSubscription({from: this.customer1.address})).to.be.false; 

  //   // Active subscription by NFT for renting the films
  //   expect(await this.SubContract.isRegisteredNFT(NFTs.mumbai.addressList[1])).to.be.true;  
  //   await expect(
  //     this.SubContract.connect(this.customer1).activeNFTSubscription(
  //       NFTs.mumbai.addressList[1], 
  //       NFTs.mumbai.tokenIdList[1], 
  //       NFTs.mumbai.tokenTypeList[1], 
  //       {from: this.customer1.address}
  //     )
  //   ).to.be.revertedWith('NFTSubscription: No erc1155-nft balance');
    
  //   // Active with Auditor(because I(auditor) owned nft-NFTs.mumbai.addressList[0]=ERC721)
  //   expect(await this.SubContract.isRegisteredNFT(NFTs.mumbai.addressList[0])).to.be.true;  
  //   await expect(
  //     this.SubContract.connect(this.auditor).activeNFTSubscription(
  //       NFTs.mumbai.addressList[0], 
  //       NFTs.mumbai.tokenIdList[0], 
  //       NFTs.mumbai.tokenTypeList[0], 
  //       {from: this.auditor.address}
  //     )
  //   ).to.emit(this.SubContract, 'SubscriptionNFTActivated').withArgs(
  //     this.auditor.address, 
  //     NFTs.mumbai.addressList[0], 
  //     NFTs.mumbai.tokenIdList[0], 
  //     NFTs.mumbai.tokenTypeList[0]
  //   );      
  //   expect(await this.SubContract.connect(this.auditor).isActivedSubscription({from: this.auditor.address})).to.be.true; 

  //   // => Increase next block timestamp for only testing
  //   const increseTime = 40 * 24 * 3600; // 40 days
  //   network.provider.send('evm_increaseTime', [increseTime]);
  //   await network.provider.send('evm_mine');

  //   // Active with Auditor(because I(auditor) owned nft-NFTs.mumbai.addressList[1]=ERC1155)
  //   expect(await this.SubContract.isRegisteredNFT(NFTs.mumbai.addressList[1])).to.be.true;  
  //   await expect(
  //     this.SubContract.connect(this.auditor).activeNFTSubscription(
  //       NFTs.mumbai.addressList[1], 
  //       NFTs.mumbai.tokenIdList[1], 
  //       NFTs.mumbai.tokenTypeList[1], 
  //       {from: this.auditor.address}
  //     )
  //   ).to.emit(this.SubContract, 'SubscriptionNFTActivated').withArgs(
  //     this.auditor.address, 
  //     NFTs.mumbai.addressList[1], 
  //     NFTs.mumbai.tokenIdList[1], 
  //     NFTs.mumbai.tokenTypeList[1]
  //   );      
  //   expect(await this.SubContract.connect(this.auditor).isActivedSubscription({from: this.auditor.address})).to.be.true; 

  //   // activeNFTSubscription(address _nft, uint256 _tokenId, uint256 _tokenType)
  //   // SubscriptionNFTActivated(msg.sender, _nft, _tokenId, _tokenType)
  // });

  // it('2. NFT Gated Content', async function () {
  //   expect(await this.ownableContract.isStudio(this.studio1.address)).to.be.true;  

  //   // Initialize StakingPool
  //   await this.stakingContract.connect(this.auditor).initializePool(
  //     this.DAOContract.address,
  //     this.voteContract.address,
  //     this.propertyContract.address,
  //     {from: this.auditor.address}
  //   )  
  //   // Staking VAB token
  //   await this.stakingContract.connect(this.customer1).stakeToken(getBigNumber(100), {from: this.customer1.address})
  //   await this.stakingContract.connect(this.customer2).stakeToken(getBigNumber(150), {from: this.customer2.address})
  //   expect(await this.stakingContract.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(100))
  //   expect(await this.stakingContract.getStakeAmount(this.customer2.address)).to.be.equal(getBigNumber(150))
    
  //   const raiseAmounts = [getBigNumber(0), getBigNumber(0), getBigNumber(3000, 6), getBigNumber(3000, 6)];
  //   const onlyAllowVABs = [true, true, false, false];
  //   const film_1 = [this.rentPrices[0], raiseAmounts[0], this.fundPeriods[0], onlyAllowVABs[0]]
  //   const film_2 = [this.rentPrices[1], raiseAmounts[1], this.fundPeriods[1], onlyAllowVABs[1]]
  //   const film_3 = [this.rentPrices[2], raiseAmounts[2], this.fundPeriods[2], onlyAllowVABs[2]]
  //   const film_4 = [this.rentPrices[3], raiseAmounts[3], this.fundPeriods[3], onlyAllowVABs[3]]
  //   this.filmPropsoal = [getProposalFilm(film_1), getProposalFilm(film_2), getProposalFilm(film_3), getProposalFilm(film_4)]
    
  //   // 1. Create proposal for four films by studio
  //   await this.DAOContract.connect(this.studio1).createProposalFilms(this.filmPropsoal, false, {from: this.studio1.address})
    
  //   // 2. Deposit to contract(VAB amount : 100, 200)
  //   await this.DAOContract.connect(this.customer1).depositVAB(getBigNumber(100), {from: this.customer1.address})
  //   await this.DAOContract.connect(this.customer2).depositVAB(getBigNumber(200), {from: this.customer2.address})
    
  //   // 3. Auditor should initialize when vote contract deployed
  //   await this.voteContract.connect(this.auditor).initializeVote(
  //     this.DAOContract.address, 
  //     this.stakingContract.address, 
  //     this.propertyContract.address,
  //     {from: this.auditor.address}
  //   );
  //   expect(await this.voteContract.isInitialized()).to.be.true

  //   // 4. films approved by auditor    
  //   const proposalIds = await this.DAOContract.getProposalFilmIds(); // 1, 2, 3, 4
  //   const voteInfos = [1, 1, 1, 3];
  //   const voteData = getVoteData(proposalIds, voteInfos)
  //   await this.voteContract.connect(this.customer1).voteToFilms(voteData, {from: this.customer1.address}) //1,1,1,3
  //   await this.voteContract.connect(this.customer2).voteToFilms(voteData, {from: this.customer2.address}) //1,1,1,3

  //   // => Increase next block timestamp for only testing
  //   const period = 10 * 24 * 3600; // filmVotePeriod = 10 days
  //   network.provider.send('evm_increaseTime', [period]);
  //   await network.provider.send('evm_mine');

  //   // 5. Approve two films by calling the approveFilms() from Auditor
  //   const approveData = [proposalIds[0], proposalIds[1], proposalIds[2]]
  //   await this.voteContract.approveFilms(approveData);// filmId = 1, 2 ,3
  //   const approved_ids = await this.voteContract.getApprovedFilmIds() // 1, 2, 3
  //   expect(approved_ids.length).to.be.equal(approveData.length)

  //   // 6. Register gated content
  //   const contentData1 = getUploadGateContent(approved_ids[0], NFTs.mumbai.addressList, NFTs.mumbai.tokenIdList, NFTs.mumbai.tokenTypeList)
  //   const contentData2 = getUploadGateContent(approved_ids[1], NFTs.mumbai.addressList, NFTs.mumbai.tokenIdList, NFTs.mumbai.tokenTypeList)
  //   const contentData3 = getUploadGateContent(approved_ids[2], NFTs.mumbai.addressList, NFTs.mumbai.tokenIdList, NFTs.mumbai.tokenTypeList)
  //   const tx1 = await this.SubContract.connect(this.studio1).registerGatedContent(
  //     [contentData1, contentData2, contentData3]
  //   )
  //   const events = (await tx1.wait()).events
  //   let args = events[0].args
  //   const res_studio = args.studio
  //   const res_ids = args.filmIds
  //   console.log('===args::', res_studio, JSON.stringify(res_ids))

  //   const tx2 = await this.SubContract.connect(this.customer1).isActivatedGatedContent(1, {from: this.customer1.address})    
  //   console.log('===tx2::', tx2)
  //   const tx3 = await this.SubContract.connect(this.auditor).isActivatedGatedContent(1, {from: this.auditor.address})    
  //   console.log('===tx3::', tx3)
  // });
});
