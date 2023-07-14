const { expect } = require('chai');
const { ethers } = require('hardhat');
const ERC20 = require('../data/ERC20.json');
const { CONFIG, DISCOUNT, ZERO_ADDRESS, getBigNumber } = require('../scripts/utils');

describe('Subscription', function () {
  before(async function () {
    this.VabbleDAOFactory = await ethers.getContractFactory('VabbleDAO');
    this.VoteFactory = await ethers.getContractFactory('Vote');
    this.UniHelperFactory = await ethers.getContractFactory('UniHelper');
    this.StakingPoolFactory = await ethers.getContractFactory('StakingPool');
    this.PropertyFactory = await ethers.getContractFactory('Property');
    this.SubscriptionFactory = await ethers.getContractFactory('Subscription');
    this.OwnableFactory = await ethers.getContractFactory('Ownablee');
    this.NFTFilmFactory = await ethers.getContractFactory('FactoryFilmNFT');

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

    this.ownableContract = await (await this.OwnableFactory.deploy(
      CONFIG.daoWalletAddress, this.vabToken.address, this.USDC.address
    )).deployed(); 

    this.uniHelperContract = await (await this.UniHelperFactory.deploy(
      CONFIG.mumbai.uniswap.factory, CONFIG.mumbai.uniswap.router, CONFIG.mumbai.sushiswap.factory, CONFIG.mumbai.sushiswap.router
    )).deployed();

    this.stakingContract = await (await this.StakingPoolFactory.deploy(this.ownableContract.address)).deployed(); 

    this.voteContract = await (await this.VoteFactory.deploy(this.ownableContract.address)).deployed();
    
    this.propertyContract = await (
      await this.PropertyFactory.deploy(
        this.ownableContract.address,
        this.uniHelperContract.address,
        this.voteContract.address,
        this.stakingContract.address
      )
    ).deployed();

    this.NFTFilmContract = await (
      await this.NFTFilmFactory.deploy(this.ownableContract.address, this.uniHelperContract.address)
    ).deployed();  

    this.DAOContract = await (
      await this.VabbleDAOFactory.deploy(
        this.ownableContract.address,
        this.uniHelperContract.address,
        this.voteContract.address,
        this.stakingContract.address,
        this.propertyContract.address,
        this.NFTFilmContract.address
      )
    ).deployed(); 

    this.SubContract = await (
      await this.SubscriptionFactory.deploy(
        this.ownableContract.address,
        this.uniHelperContract.address,
        this.propertyContract.address,
        [DISCOUNT.month3, DISCOUNT.month6, DISCOUNT.month12]
      )
    ).deployed();    

    expect(await this.ownableContract.auditor()).to.be.equal(this.auditor.address);
        
    // ====== VAB
    // Transfering VAB token to user1, 2
    await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(100000000), {from: this.auditor.address});
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
    await this.vabToken.connect(this.studio1).approve(this.stakingContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.stakingContract.address, getBigNumber(100000000));
    
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

    const assetList = [CONFIG.addressZero, CONFIG.mumbai.usdcAdress, CONFIG.mumbai.vabToken, CONFIG.mumbai.daiAddress, CONFIG.mumbai.exmAddress]
    await this.ownableContract.connect(this.auditor).addDepositAsset(assetList, {from: this.auditor.address});
  });

  // it('0. Subscription by token', async function () {
  //   const periodVal = 1;
  //   //================= VAB token
  //   const tx = await this.SubContract.connect(this.customer1).activeSubscription(this.vabToken.address, periodVal, {from: this.customer1.address})
  //   this.events = (await tx.wait()).events
  //   // await expect(
  //   //   this.SubContract.connect(this.customer1).activeSubscription(this.vabToken.address, periodVal, {from: this.customer1.address})
  //   // ).to.emit(this.SubContract, 'SubscriptionActivated').withArgs(
  //   //   this.customer1.address, 
  //   //   this.vabToken.address, 
  //   //   periodVal,
  //   //   new Date().getTime()
  //   // );    
  //   const {activeTime, period, expireTime} = await this.SubContract.subscriptionInfo(this.customer1.address)
  //   console.log('====time, period::', activeTime.toString(), period.toString(), expireTime.toString())

  //   const isActived = await this.SubContract.connect(this.customer1).isActivedSubscription(this.customer1.address, {from: this.customer1.address})    
  //   expect(isActived).to.be.true;  

  //   // => Increase next block timestamp for only testing
  //   const incresTime = 4 * 86400; // 4 days
  //   network.provider.send('evm_increaseTime', [incresTime]);
  //   await network.provider.send('evm_mine');

  //   await this.SubContract.connect(this.customer1).activeSubscription(this.vabToken.address, 2, {from: this.customer1.address})
    
  //   // => Increase next block timestamp for only testing
  //   const increseTime = 40 * 86400; // 40 days
  //   network.provider.send('evm_increaseTime', [increseTime]);
  //   await network.provider.send('evm_mine');
            
  //   expect(await this.SubContract.connect(this.customer1).isActivedSubscription(this.customer1.address, {from: this.customer1.address})).to.be.true;  

  //   // => Increase next block timestamp for only testing
  //   const increseTim = 60 * 86400; // 60 days
  //   network.provider.send('evm_increaseTime', [increseTim]);
  //   await network.provider.send('evm_mine');
            
  //   expect(await this.SubContract.connect(this.customer1).isActivedSubscription(this.customer1.address, {from: this.customer1.address})).to.be.false;  

  //   //================ EXM token
  //   await  this.SubContract.connect(this.customer2).activeSubscription(this.EXM.address, period, {from: this.customer2.address})

  //   expect(await this.SubContract.connect(this.customer2).isActivedSubscription(this.customer2.address, {from: this.customer2.address})).to.be.true;

  //   // => Increase next block timestamp for only testing
  //   network.provider.send('evm_increaseTime', [increseTime]);
  //   await network.provider.send('evm_mine');
            
  //   expect(await this.SubContract.connect(this.customer2).isActivedSubscription(this.customer2.address, {from: this.customer2.address})).to.be.false;  

  //   //================ ETH
  //   const period2 = 2
  //   const payEth = ethers.utils.parseEther('1')
  //   await this.SubContract.connect(this.customer2).activeSubscription(CONFIG.addressZero, period2, {from: this.customer2.address, value: payEth})

  //   expect(await this.SubContract.connect(this.customer2).isActivedSubscription(this.customer2.address, {from: this.customer2.address})).to.be.true;  
    
  //   // => Increase next block timestamp for only testing
  //   network.provider.send('evm_increaseTime', [increseTime]);
  //   await network.provider.send('evm_mine');
            
  //   expect(await this.SubContract.connect(this.customer2).isActivedSubscription(this.customer2.address, {from: this.customer2.address})).to.be.true;  
  // });

  it('1. Subscription by token based on Period', async function () {
    let discountVal = await this.SubContract.getDiscountPercentList();
    console.log('====discountVal::', discountVal[0].toString(), discountVal[1].toString(), discountVal[2].toString())

    // const discountPercentList = [0, 0 ,0]
    // await this.SubContract.connect(this.auditor).addDiscountPercent(discountPercentList)
    // discountVal = await this.SubContract.getDiscountPercentList();
    // console.log('====discountVal-1::', discountVal[0].toString(), discountVal[1].toString(), discountVal[2].toString())

    const periodVal = 3;
    let subAmount_vab = await this.SubContract.getExpectedSubscriptionAmount(this.vabToken.address, periodVal)
    console.log('====subAmount_vab::', subAmount_vab.toString())
    let subAmount_usdc = await this.SubContract.getExpectedSubscriptionAmount(this.USDC.address, periodVal)
    console.log('====subAmount_usdc::', subAmount_usdc.toString())
    let subAmount_exm = await this.SubContract.getExpectedSubscriptionAmount(this.EXM.address, periodVal)
    console.log('====subAmount_exm::', subAmount_exm.toString())
    let subAmount_eth = await this.SubContract.getExpectedSubscriptionAmount(ZERO_ADDRESS, periodVal)
    console.log('====subAmount_eth::', subAmount_eth.toString()) // 0.005362450175362902
    
    //================= VAB token    
    const tx = await this.SubContract.connect(this.customer1).activeSubscription(this.vabToken.address, periodVal, {from: this.customer1.address})
    this.events = (await tx.wait()).events
    // console.log('====events::', this.events[12].args)
    const {activeTime, period, expireTime} = await this.SubContract.subscriptionInfo(this.customer1.address)
    console.log('====time, period::', activeTime.toString(), period.toString(), expireTime.toString())

    const isActived = await this.SubContract.connect(this.customer1).isActivedSubscription(this.customer1.address, {from: this.customer1.address})    
    expect(isActived).to.be.true;  
    
    // => Increase next block timestamp for only testing
    const incresTime = 4 * 86400; // 4 days
    network.provider.send('evm_increaseTime', [incresTime]);
    await network.provider.send('evm_mine');

    await this.SubContract.connect(this.customer1).activeSubscription(this.vabToken.address, 2, {from: this.customer1.address})
    
    // => Increase next block timestamp for only testing
    const increseTime = 40 * 86400; // 40 days
    network.provider.send('evm_increaseTime', [increseTime]);
    await network.provider.send('evm_mine');
            
    expect(await this.SubContract.connect(this.customer1).isActivedSubscription(this.customer1.address, {from: this.customer1.address})).to.be.true;  

    // => Increase next block timestamp for only testing
    const increseTim = 200 * 86400; // 200 days
    network.provider.send('evm_increaseTime', [increseTim]);
    await network.provider.send('evm_mine');
            
    expect(await this.SubContract.connect(this.customer1).isActivedSubscription(this.customer1.address, {from: this.customer1.address})).to.be.false;  

    // //================ EXM token
    // await  this.SubContract.connect(this.customer2).activeSubscription(this.EXM.address, period, {from: this.customer2.address})

    // expect(await this.SubContract.connect(this.customer2).isActivedSubscription(this.customer2.address, {from: this.customer2.address})).to.be.true;

    // // => Increase next block timestamp for only testing
    // network.provider.send('evm_increaseTime', [increseTime]);
    // await network.provider.send('evm_mine');
            
    // expect(await this.SubContract.connect(this.customer2).isActivedSubscription(this.customer2.address, {from: this.customer2.address})).to.be.false;  

    // //================ ETH
    // const period2 = 6
    // const payEth = ethers.utils.parseEther('1')
    // await this.SubContract.connect(this.customer2).activeSubscription(CONFIG.addressZero, period2, {from: this.customer2.address, value: payEth})

    // expect(await this.SubContract.connect(this.customer2).isActivedSubscription(this.customer2.address, {from: this.customer2.address})).to.be.true;  
    
    // // => Increase next block timestamp for only testing
    // network.provider.send('evm_increaseTime', [increseTime]);
    // await network.provider.send('evm_mine');
            
    // expect(await this.SubContract.connect(this.customer2).isActivedSubscription(this.customer2.address, {from: this.customer2.address})).to.be.true;  
  });
});
