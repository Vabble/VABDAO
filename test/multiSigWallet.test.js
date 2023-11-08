const { expect } = require('chai');
const { ethers } = require('hardhat');
const { CONFIG, DISCOUNT, getBigNumber } = require('../scripts/utils');
const ERC20 = require('../data/ERC20.json');

describe('MultiSigWallet', function () {
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
    
    // Confirm auditor
    expect(await this.Ownablee.auditor()).to.be.equal(this.MultiSigWallet.address);    
    expect(await this.Ownablee.deployer()).to.be.equal(this.deployer.address);  
    
    this.txIdx = 0
    this.events = [];
  });

  // it('addSigner/removeSigner/changeConfirmcount', async function () {    
  //   await expect(
  //     this.Ownablee.connect(this.deployer).addDepositAsset([this.USDC.address, this.EXM.address], {from: this.deployer.address})
  //   ).to.be.revertedWith('caller is not the auditor');

  //   let signerList = await this.MultiSigWallet.getSigners();
  //   let confirmCount = await this.MultiSigWallet.confirmCount()
  //   let txCount = await this.MultiSigWallet.getTransactionCount()
  //   console.log('start-signers::', txCount.toString(), confirmCount.toString(), JSON.stringify(signerList))


  //   //================ addSigner
  //   let sigSingerArr = [this.sig1, this.sig2, this.sig3]
  //   let encodedCallData = this.MultiSigWallet.interface.encodeFunctionData("addSigner", [this.newSig.address]);
  //   await expect(this.MultiSigWallet.connect(sigSingerArr[0]).submitTransaction(
  //     this.MultiSigWallet.address, 0, encodedCallData, {from: sigSingerArr[0].address}
  //   )).to.emit(this.MultiSigWallet, "SubmitTransaction")
  //     .withArgs(sigSingerArr[0].address, txCount, this.MultiSigWallet.address, 0, encodedCallData)

  //   for(let i = 0; i < confirmCount; i++) {
  //     await expect(this.MultiSigWallet.connect(sigSingerArr[i]).confirmTransaction(txCount, {from: sigSingerArr[i].address}))
  //       .to.emit(this.MultiSigWallet, "ConfirmTransaction")
  //       .withArgs(sigSingerArr[i].address, txCount)  
  //   }

  //   signerList = await this.MultiSigWallet.getSigners();
  //   confirmCount = await this.MultiSigWallet.confirmCount()
  //   txCount = await this.MultiSigWallet.getTransactionCount()
  //   console.log('=============')
  //   console.log('add-signers::', txCount.toString(), confirmCount.toString(), JSON.stringify(signerList))


  //   //================ removeSigner
  //   sigSingerArr = [this.sig1, this.sig2, this.sig3, this.newSig]
  //   encodedCallData = this.MultiSigWallet.interface.encodeFunctionData("removeSigner", [sigSingerArr[0].address]);
  //   await expect(this.MultiSigWallet.connect(sigSingerArr[0]).submitTransaction(
  //     this.MultiSigWallet.address, 0, encodedCallData, {from: sigSingerArr[0].address}
  //   )).to.emit(this.MultiSigWallet, "SubmitTransaction")
  //     .withArgs(sigSingerArr[0].address, txCount, this.MultiSigWallet.address, 0, encodedCallData)
      
  //   for(let i = 0; i < confirmCount; i++) {
  //     await expect(this.MultiSigWallet.connect(sigSingerArr[i]).confirmTransaction(txCount, {from: sigSingerArr[i].address}))
  //       .to.emit(this.MultiSigWallet, "ConfirmTransaction")
  //       .withArgs(sigSingerArr[i].address, txCount)  
  //   }
      
  //   signerList = await this.MultiSigWallet.getSigners();
  //   confirmCount = await this.MultiSigWallet.confirmCount()
  //   txCount = await this.MultiSigWallet.getTransactionCount()
  //   console.log('=============')
  //   console.log('remove-signers::', txCount.toString(), confirmCount.toString(), JSON.stringify(signerList))


  //   //================ changeConfirmCount
  //   sigSingerArr = [this.sig2, this.sig3, this.newSig]
  //   encodedCallData = this.MultiSigWallet.interface.encodeFunctionData("changeConfirmCount", [3]);
  //   await expect(this.MultiSigWallet.connect(sigSingerArr[0]).submitTransaction(
  //     this.MultiSigWallet.address, 0, encodedCallData, {from: sigSingerArr[0].address}
  //   )).to.emit(this.MultiSigWallet, "SubmitTransaction")
  //     .withArgs(sigSingerArr[0].address, txCount, this.MultiSigWallet.address, 0, encodedCallData)
      
  //   for(let i = 0; i < confirmCount; i++) {
  //     await expect(this.MultiSigWallet.connect(sigSingerArr[i]).confirmTransaction(txCount, {from: sigSingerArr[i].address}))
  //       .to.emit(this.MultiSigWallet, "ConfirmTransaction")
  //       .withArgs(sigSingerArr[i].address, txCount)  
  //   }
    
  //   confirmCount = await this.MultiSigWallet.confirmCount()
  //   txCount = await this.MultiSigWallet.getTransactionCount()
  //   console.log('=============')
  //   console.log('change::', txCount.toString(), confirmCount.toString())
  // });

  it('Check Gas fee with addDepositAsset', async function () {    
    let assets = await this.Ownablee.getDepositAssetList()
    console.log('====assets-before::', assets)

    const b1 = await ethers.provider.getBalance(this.sig1.address) // 10000 ETH
    const b2 = await ethers.provider.getBalance(this.sig2.address) // 10000 ETH

    //================ addDepositAsset
    let confirmCount = await this.MultiSigWallet.confirmCount()
    let txCount = await this.MultiSigWallet.getTransactionCount()
    let sigSingerArr = [this.sig1, this.sig2, this.sig3]
    let encodedCallData = this.Ownablee.interface.encodeFunctionData("addDepositAsset", [[this.USDC.address, this.EXM.address]]);

    await expect(this.MultiSigWallet.connect(sigSingerArr[0]).submitTransaction(
      this.Ownablee.address, 0, encodedCallData, {from: sigSingerArr[0].address}
    )).to.emit(this.MultiSigWallet, "SubmitTransaction")
      .withArgs(sigSingerArr[0].address, txCount, this.Ownablee.address, 0, encodedCallData)
      
    for(let i = 0; i < confirmCount; i++) {
      await expect(this.MultiSigWallet.connect(sigSingerArr[i]).confirmTransaction(txCount, {from: sigSingerArr[i].address}))
        .to.emit(this.MultiSigWallet, "ConfirmTransaction")
        .withArgs(sigSingerArr[i].address, txCount)  
    }

    assets = await this.Ownablee.getDepositAssetList()
    console.log('====assets-after::', assets)
    
    const a1 = await ethers.provider.getBalance(this.sig1.address)
    const a2 = await ethers.provider.getBalance(this.sig2.address)

    const d1 = b1.sub(a1)
    const d2 = b2.sub(a2)
    console.log('====gas-SubmitTransaction::', d1.sub(d2).toString()) // 0.000136122002009262 ETH
    console.log('====gas-ConfirmTransaction::', d2.toString())        // 0.000158244001740684 ETH
  });

});
