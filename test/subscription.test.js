const { expect } = require('chai');
const { ethers } = require('hardhat');
const ERC20 = require('../data/ERC20.json');
const { CONFIG, DISCOUNT, ZERO_ADDRESS, getBigNumber } = require('../scripts/utils');

const GNOSIS_FLAG = false;

describe('Subscription', function () {
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
    this.deployer = this.signers[0];    
    this.newAuditor = this.signers[1];    
    this.studio1 = this.signers[2];    
    this.studio2 = this.signers[3];     
    this.customer1 = this.signers[4];
    this.customer2 = this.signers[5];
    
    this.signer1 = new ethers.Wallet(process.env.PK1, ethers.provider);
    this.signer2 = new ethers.Wallet(process.env.PK2, ethers.provider); 
  });

  beforeEach(async function () {
    this.USDT = new ethers.Contract(CONFIG.mumbai.usdtAdress, JSON.stringify(ERC20), ethers.provider);
    this.USDC = new ethers.Contract(CONFIG.mumbai.usdcAdress, JSON.stringify(ERC20), ethers.provider);

    if (CONFIG.mumbai.vabToken == "0x5cBbA5484594598a660636eFb0A1AD953aFa4e32")
      this.vabToken = new ethers.Contract(CONFIG.mumbai.vabToken, JSON.stringify(ERC20), ethers.provider);
    else
      this.vabToken = new ethers.Contract(CONFIG.mumbai.vabToken, JSON.stringify(FERC20), ethers.provider);


    this.GnosisSafe = await (await this.GnosisSafeFactory.deploy()).deployed();
    this.auditor = GNOSIS_FLAG ? this.GnosisSafe : this.deployer;
        
    this.Ownablee = await (await this.OwnableFactory.deploy(
        CONFIG.daoWalletAddress, this.vabToken.address, this.USDC.address, this.auditor.address
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

    await this.StakingPool.connect(this.deployer).initialize(
        this.VabbleDAO.address,
        this.Property.address,
        this.Vote.address,
        {from: this.deployer.address}
    )  
      
    await this.Vote.connect(this.deployer).initialize(
        this.VabbleDAO.address,
        this.StakingPool.address,
        this.Property.address,
        this.UniHelper.address,
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

    await this.Ownablee.connect(this.deployer).setup(
        this.Vote.address, this.VabbleDAO.address, this.StakingPool.address, 
        {from: this.deployer.address}
    )       

    // if (GNOSIS_FLAG) {
    //     let encodedCallData = this.Ownablee.interface.encodeFunctionData("addDepositAsset", 
    //         [[this.vabToken.address, this.USDC.address, this.USDT.address, CONFIG.addressZero]]);

    //     // Generate Signature and Transaction information
    //     const {signatureBytes, tx} = await generateSignature(this.GnosisSafe, encodedCallData, this.Ownablee.address, [this.signer1, this.signer2]);

    //     await executeGnosisSafeTransaction(this.GnosisSafe, this.signer2, signatureBytes, tx);
    // } else {
    //     await this.Ownablee.connect(this.auditor).addDepositAsset(
    //         [this.vabToken.address, this.USDC.address, this.USDT.address, CONFIG.addressZero], {from: this.auditor.address}
    //     )
    // }

    await this.Ownablee.connect(this.deployer).addDepositAsset(
        [this.vabToken.address, this.USDC.address, this.USDT.address, CONFIG.addressZero], 
        {from: this.deployer.address}
    )  

    expect(await this.Ownablee.auditor()).to.be.equal(this.auditor.address);
        
    // ====== VAB
    // Transfering VAB token to user1, 2
    await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(100000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer2.address, getBigNumber(10000000), {from: this.auditor.address});

    // Transfering VAB token to studio1, 2
    await this.vabToken.connect(this.auditor).transfer(this.studio1.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio2.address, getBigNumber(10000000), {from: this.auditor.address});

    // Approve to transfer VAB token for each user, studio to Subscription
    await this.vabToken.connect(this.customer1).approve(this.Subscription.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.Subscription.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer1).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer1).approve(this.VabbleDAO.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.VabbleDAO.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio1).approve(this.Subscription.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.Subscription.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio1).approve(this.Subscription.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.Subscription.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio1).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.StakingPool.address, getBigNumber(100000000));
    
    // ====== USDT
    // Transfering USDT token to user1, 2
    await this.USDT.connect(this.auditor).transfer(this.customer1.address, getBigNumber(5000, 6), {from: this.auditor.address});
    await this.USDT.connect(this.auditor).transfer(this.customer2.address, getBigNumber(5000, 6), {from: this.auditor.address});
    
    // Transfering USDT token to studio1, 2    
    await this.USDT.connect(this.auditor).transfer(this.studio1.address, getBigNumber(5000, 6), {from: this.auditor.address});
    await this.USDT.connect(this.auditor).transfer(this.studio2.address, getBigNumber(5000, 6), {from: this.auditor.address});

    // Approve to transfer USDT token for each user, studio to Subscription
    await this.USDT.connect(this.customer1).approve(this.Subscription.address, getBigNumber(100000));
    await this.USDT.connect(this.customer2).approve(this.Subscription.address, getBigNumber(100000));   
    await this.USDT.connect(this.customer1).approve(this.StakingPool.address, getBigNumber(100000));
    await this.USDT.connect(this.customer2).approve(this.StakingPool.address, getBigNumber(100000));
    await this.USDT.connect(this.customer1).approve(this.VabbleDAO.address, getBigNumber(100000));
    await this.USDT.connect(this.customer2).approve(this.VabbleDAO.address, getBigNumber(100000));
    await this.USDT.connect(this.studio1).approve(this.Subscription.address, getBigNumber(100000));
    await this.USDT.connect(this.studio2).approve(this.Subscription.address, getBigNumber(100000));
    await this.USDT.connect(this.studio1).approve(this.Subscription.address, getBigNumber(100000));
    await this.USDT.connect(this.studio2).approve(this.Subscription.address, getBigNumber(100000));

    this.rentPrices = [getBigNumber(100), getBigNumber(200), getBigNumber(300), getBigNumber(400)];
    this.fundPeriods = [getBigNumber(20 * 86400, 0), getBigNumber(30 * 86400, 0), getBigNumber(60 * 86400, 0), getBigNumber(10 * 86400, 0)];
    this.filmPropsoal = [];
    this.events = [];
  });

  // it('0. Subscription by token', async function () {
  //   const periodVal = 1;
  //   //================= VAB token
  //   const tx = await this.Subscription.connect(this.customer1).activeSubscription(this.vabToken.address, periodVal, {from: this.customer1.address})
  //   this.events = (await tx.wait()).events
  //   // await expect(
  //   //   this.Subscription.connect(this.customer1).activeSubscription(this.vabToken.address, periodVal, {from: this.customer1.address})
  //   // ).to.emit(this.Subscription, 'SubscriptionActivated').withArgs(
  //   //   this.customer1.address, 
  //   //   this.vabToken.address, 
  //   //   periodVal,
  //   //   new Date().getTime()
  //   // );    
  //   const {activeTime, period, expireTime} = await this.Subscription.subscriptionInfo(this.customer1.address)
  //   console.log('====time, period::', activeTime.toString(), period.toString(), expireTime.toString())

  //   const isActived = await this.Subscription.connect(this.customer1).isActivedSubscription(this.customer1.address, {from: this.customer1.address})    
  //   expect(isActived).to.be.true;  

  //   // => Increase next block timestamp for only testing
  //   const incresTime = 4 * 86400; // 4 days
  //   network.provider.send('evm_increaseTime', [incresTime]);
  //   await network.provider.send('evm_mine');

  //   await this.Subscription.connect(this.customer1).activeSubscription(this.vabToken.address, 2, {from: this.customer1.address})
    
  //   // => Increase next block timestamp for only testing
  //   const increseTime = 40 * 86400; // 40 days
  //   network.provider.send('evm_increaseTime', [increseTime]);
  //   await network.provider.send('evm_mine');
            
  //   expect(await this.Subscription.connect(this.customer1).isActivedSubscription(this.customer1.address, {from: this.customer1.address})).to.be.true;  

  //   // => Increase next block timestamp for only testing
  //   const increseTim = 60 * 86400; // 60 days
  //   network.provider.send('evm_increaseTime', [increseTim]);
  //   await network.provider.send('evm_mine');
            
  //   expect(await this.Subscription.connect(this.customer1).isActivedSubscription(this.customer1.address, {from: this.customer1.address})).to.be.false;  

  //   //================ USDT token
  //   await  this.Subscription.connect(this.customer2).activeSubscription(this.USDT.address, period, {from: this.customer2.address})

  //   expect(await this.Subscription.connect(this.customer2).isActivedSubscription(this.customer2.address, {from: this.customer2.address})).to.be.true;

  //   // => Increase next block timestamp for only testing
  //   network.provider.send('evm_increaseTime', [increseTime]);
  //   await network.provider.send('evm_mine');
            
  //   expect(await this.Subscription.connect(this.customer2).isActivedSubscription(this.customer2.address, {from: this.customer2.address})).to.be.false;  

  //   //================ ETH
  //   const period2 = 2
  //   const payEth = ethers.utils.parseEther('1')
  //   await this.Subscription.connect(this.customer2).activeSubscription(CONFIG.addressZero, period2, {from: this.customer2.address, value: payEth})

  //   expect(await this.Subscription.connect(this.customer2).isActivedSubscription(this.customer2.address, {from: this.customer2.address})).to.be.true;  
    
  //   // => Increase next block timestamp for only testing
  //   network.provider.send('evm_increaseTime', [increseTime]);
  //   await network.provider.send('evm_mine');
            
  //   expect(await this.Subscription.connect(this.customer2).isActivedSubscription(this.customer2.address, {from: this.customer2.address})).to.be.true;  
  // });

  it('1. Subscription by token based on Period', async function () {
    let discountVal = await this.Subscription.getDiscountPercentList();
    console.log('====discountVal::', discountVal[0].toString(), discountVal[1].toString(), discountVal[2].toString())

    // const discountPercentList = [0, 0 ,0]
    // await this.Subscription.connect(this.auditor).addDiscountPercent(discountPercentList)
    // discountVal = await this.Subscription.getDiscountPercentList();
    // console.log('====discountVal-1::', discountVal[0].toString(), discountVal[1].toString(), discountVal[2].toString())

    const periodVal = 3;
    let subAmount_vab = await this.Subscription.getExpectedSubscriptionAmount(this.vabToken.address, periodVal)
    console.log('====subAmount_vab::', subAmount_vab.toString())
    let subAmount_usdc = await this.Subscription.getExpectedSubscriptionAmount(this.USDC.address, periodVal)
    console.log('====subAmount_usdc::', subAmount_usdc.toString())
    let subAmount_usdt = await this.Subscription.getExpectedSubscriptionAmount(this.USDT.address, periodVal)
    console.log('====subAmount_usdt::', subAmount_usdt.toString())
    let subAmount_eth = await this.Subscription.getExpectedSubscriptionAmount(ZERO_ADDRESS, periodVal)
    console.log('====subAmount_eth::', subAmount_eth.toString()) // 0.005362450175362902
    
    //================= VAB token    
    const tx = await this.Subscription.connect(this.customer1).activeSubscription(this.vabToken.address, periodVal, {from: this.customer1.address})
    this.events = (await tx.wait()).events
    // console.log('====events::', this.events[12].args)
    const {activeTime, period, expireTime} = await this.Subscription.subscriptionInfo(this.customer1.address)
    console.log('====time, period::', activeTime.toString(), period.toString(), expireTime.toString())

    const isActived = await this.Subscription.connect(this.customer1).isActivedSubscription(this.customer1.address, {from: this.customer1.address})    
    expect(isActived).to.be.true;  
    
    // => Increase next block timestamp for only testing
    const incresTime = 4 * 86400; // 4 days
    network.provider.send('evm_increaseTime', [incresTime]);
    await network.provider.send('evm_mine');

    await this.Subscription.connect(this.customer1).activeSubscription(this.vabToken.address, 2, {from: this.customer1.address})
    
    // => Increase next block timestamp for only testing
    const increseTime = 40 * 86400; // 40 days
    network.provider.send('evm_increaseTime', [increseTime]);
    await network.provider.send('evm_mine');
            
    expect(await this.Subscription.connect(this.customer1).isActivedSubscription(this.customer1.address, {from: this.customer1.address})).to.be.true;  

    // => Increase next block timestamp for only testing
    const increseTim = 200 * 86400; // 200 days
    network.provider.send('evm_increaseTime', [increseTim]);
    await network.provider.send('evm_mine');
            
    expect(await this.Subscription.connect(this.customer1).isActivedSubscription(this.customer1.address, {from: this.customer1.address})).to.be.false;  

    // //================ USDT token
    // await  this.Subscription.connect(this.customer2).activeSubscription(this.USDT.address, period, {from: this.customer2.address})

    // expect(await this.Subscription.connect(this.customer2).isActivedSubscription(this.customer2.address, {from: this.customer2.address})).to.be.true;

    // // => Increase next block timestamp for only testing
    // network.provider.send('evm_increaseTime', [increseTime]);
    // await network.provider.send('evm_mine');
            
    // expect(await this.Subscription.connect(this.customer2).isActivedSubscription(this.customer2.address, {from: this.customer2.address})).to.be.false;  

    // //================ ETH
    // const period2 = 6
    // const payEth = ethers.utils.parseEther('1')
    // await this.Subscription.connect(this.customer2).activeSubscription(CONFIG.addressZero, period2, {from: this.customer2.address, value: payEth})

    // expect(await this.Subscription.connect(this.customer2).isActivedSubscription(this.customer2.address, {from: this.customer2.address})).to.be.true;  
    
    // // => Increase next block timestamp for only testing
    // network.provider.send('evm_increaseTime', [increseTime]);
    // await network.provider.send('evm_mine');
            
    // expect(await this.Subscription.connect(this.customer2).isActivedSubscription(this.customer2.address, {from: this.customer2.address})).to.be.true;  
  });

  it('test subscription with VAB, MATIC, USDC, USDT', async function () {
    console.log("=======auditor address:", this.auditor.address)
    const usdt_balance = await this.USDT.balanceOf(this.auditor.address);
    console.log("=======auditor usdt balance:", usdt_balance.toString())

    const periodVal = 1;
    const subscriptionAmount = await this.Property.subscriptionAmount();
    console.log('====subscriptionAmount::', subscriptionAmount.toString())

    // ============== VAB
    let subAmount_vab = await this.Subscription.getExpectedSubscriptionAmount(this.vabToken.address, periodVal)
    console.log('====vab::', subAmount_vab.toString()) // 22.294681444783410962
    
    
    // ============== USDC
    let subAmount_usdc = await this.Subscription.getExpectedSubscriptionAmount(this.USDC.address, periodVal)
    console.log('====usdc::', subAmount_usdc.toString()) // 2.990000

    
    // ============== MATIC
    let subAmount_matic = await this.Subscription.getExpectedSubscriptionAmount(CONFIG.addressZero, periodVal)
    console.log('====matic::', subAmount_matic.toString()) // 0.005821452249380643

    
    // ============== USDT
    let subAmount_usdt = await this.Subscription.getExpectedSubscriptionAmount(this.USDT.address, periodVal)
    console.log('====usdt::', subAmount_usdt.toString()) // 0.011574    
    // "eA: no pool weth/iA"
  });
});
