const { expect } = require('chai');
const { ethers } = require('hardhat');
const { CONFIG, DISCOUNT, getBigNumber } = require('../scripts/utils');
const ERC20 = require('../data/ERC20.json');

describe('MultiSigWallet', function () {
  before(async function () {        
    this.VabbleDAOFactory = await ethers.getContractFactory('VabbleDAO');
    this.UniHelperFactory = await ethers.getContractFactory('UniHelper');
    this.StakingPoolFactory = await ethers.getContractFactory('StakingPool');
    this.VoteFactory = await ethers.getContractFactory('Vote');
    this.PropertyFactory = await ethers.getContractFactory('Property');
    this.FactoryFilmNFTFactory = await ethers.getContractFactory('FactoryFilmNFT');
    this.FactoryTierNFTFactory = await ethers.getContractFactory('FactoryTierNFT');
    this.FactorySubNFTFactory = await ethers.getContractFactory('FactorySubNFT');
    this.OwnableFactory = await ethers.getContractFactory('Ownablee');
    this.SubscriptionFactory = await ethers.getContractFactory('Subscription');
    this.MultiSigFactory = await ethers.getContractFactory('MultiSigWallet');

    this.signers = await ethers.getSigners();
    this.deployer = this.signers[0];
    this.newAuditor = this.signers[1];    
    this.sig1 = this.signers[2];    
    this.sig2 = this.signers[3];       
    this.sig3 = this.signers[4];     
    this.newSig = this.signers[5]; 
  });

  beforeEach(async function () {
    this.vabToken = new ethers.Contract(CONFIG.mumbai.vabToken, JSON.stringify(ERC20), ethers.provider);
    this.USDC = new ethers.Contract(CONFIG.mumbai.usdcAdress, JSON.stringify(ERC20), ethers.provider);
    this.EXM = new ethers.Contract(CONFIG.mumbai.exmAddress, JSON.stringify(ERC20), ethers.provider);
    
    this.MultiSigWallet = await (await this.MultiSigFactory.deploy(
      [this.sig1.address, this.sig2.address, this.sig3.address], 2
    )).deployed();       

    this.Ownablee = await (await this.OwnableFactory.deploy(
      CONFIG.daoWalletAddress, this.vabToken.address, this.USDC.address, this.MultiSigWallet.address
    )).deployed(); 

    this.UniHelper = await (await this.UniHelperFactory.deploy(
      CONFIG.mumbai.uniswap.factory, CONFIG.mumbai.uniswap.router, CONFIG.mumbai.sushiswap.factory, 
      CONFIG.mumbai.sushiswap.router, this.Ownablee.address
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
        
    this.TierNFT = await (
      await this.FactoryTierNFTFactory.deploy(
        this.Ownablee.address,      // Ownablee contract
        this.VabbleDAO.address
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

    await this.FilmNFT.connect(this.deployer).initializeFactory(
      this.VabbleDAO.address, 
      this.StakingPool.address,
      this.Property.address,
      {from: this.deployer.address}
    );

    // Initialize StakingPool
    await this.StakingPool.connect(this.deployer).initializePool(
      this.VabbleDAO.address,
      this.Property.address,
      this.Vote.address,
      {from: this.deployer.address}
    )  
    // Initialize Vote contract
    await this.Vote.connect(this.deployer).initializeVote(
      this.VabbleDAO.address,
      this.StakingPool.address,
      this.Property.address,
      {from: this.deployer.address}
    )
    // Initialize Ownablee contract
    await this.Ownablee.connect(this.deployer).setup(
      this.Vote.address,
      this.VabbleDAO.address,
      this.StakingPool.address,
    )  
    // Initialize UniHelper contract
    await this.UniHelper.connect(this.deployer).setWhiteList(
      this.VabbleDAO.address,
      this.Subscription.address,
      this.FilmNFT.address,
      this.SubNFT.address
    )
    
    // Confirm auditor
    expect(await this.Ownablee.auditor()).to.be.equal(this.MultiSigWallet.address);    
    expect(await this.Ownablee.deployer()).to.be.equal(this.deployer.address);  
    
    this.txIdx = 0
    this.events = [];
  });

  // it('Ownablee - onlyAuditor', async function () {
  //   //====== addDepositAsset
  //   let encodedCallData = this.Ownablee.interface.encodeFunctionData("addDepositAsset", [[this.USDC.address, this.EXM.address]]);
  //   // const tx = await this.MultiSigWallet.connect(this.sig1).submitTransaction(this.Ownablee.address, 0, encodedCallData, {from: this.sig1.address})
  //   // this.events = (await tx.wait()).events
  //   // const args = this.events[0].args

  //   await expect(this.MultiSigWallet.connect(this.sig2).submitTransaction(this.Ownablee.address, 0, encodedCallData, {from: this.sig2.address}))
  //     .to.emit(this.MultiSigWallet, "SubmitTransaction")
  //     .withArgs(this.sig2.address, this.txIdx, this.Ownablee.address, 0, encodedCallData)
  //   await expect(this.MultiSigWallet.connect(this.sig1).confirmTransaction(this.txIdx, {from: this.sig1.address}))
  //     .to.emit(this.MultiSigWallet, "ConfirmTransaction")
  //     .withArgs(this.sig1.address, this.txIdx)
  //   await expect(this.MultiSigWallet.connect(this.sig2).confirmTransaction(this.txIdx, {from: this.sig2.address}))
  //     .to.emit(this.MultiSigWallet, "ConfirmTransaction")
  //     .withArgs(this.sig2.address, this.txIdx)
  //   await expect(this.MultiSigWallet.connect(this.sig3).confirmTransaction(this.txIdx, {from: this.sig3.address}))
  //     .to.emit(this.MultiSigWallet, "ConfirmTransaction")
  //     .withArgs(this.sig3.address, this.txIdx)
      
  //   this.txIdx++;
  //   expect(await this.Ownablee.isDepositAsset(this.EXM.address)).to.be.true;  
  //   expect(await this.MultiSigWallet.getTransactionCount()).to.be.equal(1); 

  //   //====== transferAuditor
  //   encodedCallData = this.Ownablee.interface.encodeFunctionData("transferAuditor", [this.newAuditor.address]);
  //   await expect(this.MultiSigWallet.connect(this.sig1).submitTransaction(this.Ownablee.address, 0, encodedCallData, {from: this.sig1.address}))
  //     .to.emit(this.MultiSigWallet, "SubmitTransaction")
  //     .withArgs(this.sig1.address, this.txIdx, this.Ownablee.address, 0, encodedCallData)

  //   expect(await this.MultiSigWallet.getTransactionCount()).to.be.equal(2); 

  //   await expect(this.MultiSigWallet.connect(this.sig1).confirmTransaction(this.txIdx, {from: this.sig1.address}))
  //     .to.emit(this.MultiSigWallet, "ConfirmTransaction")
  //     .withArgs(this.sig1.address, this.txIdx)
  //   await expect(this.MultiSigWallet.connect(this.sig2).confirmTransaction(this.txIdx, {from: this.sig2.address}))
  //     .to.emit(this.MultiSigWallet, "ConfirmTransaction")
  //     .withArgs(this.sig2.address, this.txIdx)

  //   expect(await this.Ownablee.auditor()).to.be.equal(this.MultiSigWallet.address); 
    
  //   await expect(this.MultiSigWallet.connect(this.sig2).revokeConfirmation(this.txIdx, {from: this.sig2.address}))
  //     .to.emit(this.MultiSigWallet, "RevokeConfirmation")
  //     .withArgs(this.sig2.address, this.txIdx)

  //   expect(await this.Ownablee.auditor()).to.be.equal(this.MultiSigWallet.address); 

  //   await expect(this.MultiSigWallet.connect(this.sig2).confirmTransaction(this.txIdx, {from: this.sig2.address}))
  //     .to.emit(this.MultiSigWallet, "ConfirmTransaction")
  //     .withArgs(this.sig2.address, this.txIdx)
  //   await expect(this.MultiSigWallet.connect(this.sig3).confirmTransaction(this.txIdx, {from: this.sig3.address}))
  //     .to.emit(this.MultiSigWallet, "ConfirmTransaction")
  //     .withArgs(this.sig3.address, this.txIdx)

  //   this.txIdx++;    
  //   expect(await this.Ownablee.auditor()).to.be.equal(this.newAuditor.address); 

  //   const tx = await this.MultiSigWallet.getTransaction(this.txIdx - 1)
  //   // console.log('=====tx::', tx)
  // });

  it('addSigner/removeSigner/changeConfirmcount', async function () {    
    await expect(
      this.Ownablee.connect(this.deployer).addDepositAsset([this.USDC.address, this.EXM.address], {from: this.deployer.address})
    ).to.be.revertedWith('caller is not the auditor');

    let signerList = await this.MultiSigWallet.getSigners();
    let confirmCount = await this.MultiSigWallet.confirmCount()
    let txCount = await this.MultiSigWallet.getTransactionCount()
    console.log('start-signers::', txCount.toString(), confirmCount.toString(), JSON.stringify(signerList))


    //================ addSigner
    let sigSingerArr = [this.sig1, this.sig2, this.sig3]
    let encodedCallData = this.MultiSigWallet.interface.encodeFunctionData("addSigner", [this.newSig.address]);
    await expect(this.MultiSigWallet.connect(sigSingerArr[0]).submitTransaction(
      this.MultiSigWallet.address, 0, encodedCallData, {from: sigSingerArr[0].address}
    )).to.emit(this.MultiSigWallet, "SubmitTransaction")
      .withArgs(sigSingerArr[0].address, txCount, this.MultiSigWallet.address, 0, encodedCallData)

    for(let i = 0; i < confirmCount; i++) {
      await expect(this.MultiSigWallet.connect(sigSingerArr[i]).confirmTransaction(txCount, {from: sigSingerArr[i].address}))
        .to.emit(this.MultiSigWallet, "ConfirmTransaction")
        .withArgs(sigSingerArr[i].address, txCount)  
    }

    signerList = await this.MultiSigWallet.getSigners();
    confirmCount = await this.MultiSigWallet.confirmCount()
    txCount = await this.MultiSigWallet.getTransactionCount()
    console.log('=============')
    console.log('add-signers::', txCount.toString(), confirmCount.toString(), JSON.stringify(signerList))


    //================ removeSigner
    sigSingerArr = [this.sig1, this.sig2, this.sig3, this.newSig]
    encodedCallData = this.MultiSigWallet.interface.encodeFunctionData("removeSigner", [sigSingerArr[0].address]);
    await expect(this.MultiSigWallet.connect(sigSingerArr[0]).submitTransaction(
      this.MultiSigWallet.address, 0, encodedCallData, {from: sigSingerArr[0].address}
    )).to.emit(this.MultiSigWallet, "SubmitTransaction")
      .withArgs(sigSingerArr[0].address, txCount, this.MultiSigWallet.address, 0, encodedCallData)
      
    for(let i = 0; i < confirmCount; i++) {
      await expect(this.MultiSigWallet.connect(sigSingerArr[i]).confirmTransaction(txCount, {from: sigSingerArr[i].address}))
        .to.emit(this.MultiSigWallet, "ConfirmTransaction")
        .withArgs(sigSingerArr[i].address, txCount)  
    }
      
    signerList = await this.MultiSigWallet.getSigners();
    confirmCount = await this.MultiSigWallet.confirmCount()
    txCount = await this.MultiSigWallet.getTransactionCount()
    console.log('=============')
    console.log('remove-signers::', txCount.toString(), confirmCount.toString(), JSON.stringify(signerList))


    //================ changeConfirmCount
    sigSingerArr = [this.sig2, this.sig3, this.newSig]
    encodedCallData = this.MultiSigWallet.interface.encodeFunctionData("changeConfirmCount", [3]);
    await expect(this.MultiSigWallet.connect(sigSingerArr[0]).submitTransaction(
      this.MultiSigWallet.address, 0, encodedCallData, {from: sigSingerArr[0].address}
    )).to.emit(this.MultiSigWallet, "SubmitTransaction")
      .withArgs(sigSingerArr[0].address, txCount, this.MultiSigWallet.address, 0, encodedCallData)
      
    for(let i = 0; i < confirmCount; i++) {
      await expect(this.MultiSigWallet.connect(sigSingerArr[i]).confirmTransaction(txCount, {from: sigSingerArr[i].address}))
        .to.emit(this.MultiSigWallet, "ConfirmTransaction")
        .withArgs(sigSingerArr[i].address, txCount)  
    }
    
    confirmCount = await this.MultiSigWallet.confirmCount()
    txCount = await this.MultiSigWallet.getTransactionCount()
    console.log('=============')
    console.log('change::', txCount.toString(), confirmCount.toString())
  });

});
