const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');
const ERC20 = require('../data/ERC20.json');
const {
  CONFIG,
  getBigNumber,
  DISCOUNT,
  increaseTime,
  getByteForSwap
} = require('../scripts/utils');

const GNOSIS_FLAG = false;

describe('UniHelper', function () {
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

    this.auditor = this.signers[0];
    this.studio1 = this.signers[2];
    this.studio2 = this.signers[3];
    this.studio3 = this.signers[4];
    this.customer1 = this.signers[5];
    this.customer2 = this.signers[6];
    this.customer3 = this.signers[7];
    this.auditorAgent1 = this.signers[8];
    this.reward = this.signers[9];
    this.auditorAgent2 = this.signers[10];
    this.customer4 = this.signers[11];
    this.customer5 = this.signers[12];
    this.customer6 = this.signers[13];
    this.customer7 = this.signers[14];
    this.sig1 = this.signers[15];
    this.sig2 = this.signers[16];
    this.sig3 = this.signers[17];

    this.signer1 = new ethers.Wallet(process.env.PK1, ethers.provider);
    this.signer2 = new ethers.Wallet(process.env.PK2, ethers.provider);
  });

  beforeEach(async function () {
    // load ERC20 tokens
    if (CONFIG.mumbai.vabToken == "0x5cBbA5484594598a660636eFb0A1AD953aFa4e32")
      this.vabToken = new ethers.Contract(CONFIG.mumbai.vabToken, JSON.stringify(ERC20), ethers.provider);
    else
      this.vabToken = new ethers.Contract(CONFIG.mumbai.vabToken, JSON.stringify(FERC20), ethers.provider);


    this.EXM = new ethers.Contract(CONFIG.mumbai.exmAddress, JSON.stringify(ERC20), ethers.provider);
    this.USDC = new ethers.Contract(CONFIG.mumbai.usdcAdress, JSON.stringify(ERC20), ethers.provider);

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
        this.StakingPool.address,
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
      { from: this.deployer.address }
    );

    await this.FilmNFT.connect(this.deployer).initialize(
      this.VabbleDAO.address,
      this.VabbleFund.address,
      { from: this.deployer.address }
    );

    await this.StakingPool.connect(this.deployer).initialize(
      this.VabbleDAO.address,
      this.Property.address,
      this.Vote.address,
      { from: this.deployer.address }
    )

    await this.Vote.connect(this.deployer).initialize(
      this.VabbleDAO.address,
      this.StakingPool.address,
      this.Property.address,
      this.UniHelper.address,
      { from: this.deployer.address }
    )

    await this.VabbleFund.connect(this.deployer).initialize(
      this.VabbleDAO.address,
      { from: this.deployer.address }
    )

    await this.UniHelper.connect(this.deployer).setWhiteList(
      this.VabbleDAO.address,
      this.VabbleFund.address,
      this.Subscription.address,
      this.FilmNFT.address,
      this.SubNFT.address,
      { from: this.deployer.address }
    )

    await this.Ownablee.connect(this.deployer).setup(
      this.Vote.address, this.VabbleDAO.address, this.StakingPool.address,
      { from: this.deployer.address }
    )

    // if (GNOSIS_FLAG) {
    //     let encodedCallData = this.Ownablee.interface.encodeFunctionData("addDepositAsset", 
    //         [[this.vabToken.address, this.USDC.address, this.EXM.address, CONFIG.addressZero]]);

    //     // Generate Signature and Transaction information
    //     const {signatureBytes, tx} = await generateSignature(this.GnosisSafe, encodedCallData, this.Ownablee.address, [this.signer1, this.signer2]);

    //     await executeGnosisSafeTransaction(this.GnosisSafe, this.signer2, signatureBytes, tx);
    // } else {
    //     await this.Ownablee.connect(this.auditor).addDepositAsset(
    //         [this.vabToken.address, this.USDC.address, this.EXM.address, CONFIG.addressZero], {from: this.auditor.address}
    //     )
    // }

    await this.Ownablee.connect(this.deployer).addDepositAsset(
      [this.vabToken.address, this.USDC.address, this.EXM.address, CONFIG.addressZero],
      { from: this.deployer.address }
    )
    expect(await this.Ownablee.auditor()).to.be.equal(this.auditor.address);

    this.auditorBalance = await this.vabToken.balanceOf(this.auditor.address) // 145M

    // ====== VAB
    await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(1000), { from: this.auditor.address });
    await this.vabToken.connect(this.customer1).approve(this.UniHelper.address, getBigNumber(10000));
    // ====== USDC
    await this.USDC.connect(this.auditor).transfer(this.customer1.address, getBigNumber(1000, 6), { from: this.auditor.address });
    await this.USDC.connect(this.customer1).approve(this.UniHelper.address, getBigNumber(10000, 6));

    this.events = [];
  });

  it('Expect Amount USDC -> VAB', async function () {
    const usdcAmount = getBigNumber(100, 6) // 100 usdc  
    const vabAmount1 = await this.UniHelper.connect(this.customer1).expectedAmount(
      usdcAmount,
      this.USDC.address,
      this.vabToken.address,
      { from: this.customer1.address }
    )
    console.log("vab amount new =====>", vabAmount1.toString())
    // 2075.818288540931184042


    const vabAmount2 = await this.UniHelper.connect(this.customer1).expectedAmountForTest(
      usdcAmount,
      this.USDC.address,
      this.vabToken.address,
      { from: this.customer1.address }
    )
    console.log("vab amount old =====>", vabAmount2.toString())

    const maticAmount = getBigNumber(10) // 10 WMATIC  
    const vabAmount3 = await this.UniHelper.connect(this.auditor).expectedAmount(
      maticAmount,
      CONFIG.addressZero,
      this.vabToken.address,
      { from: this.auditor.address }
    )
    console.log("vab amount from matic =====>", vabAmount3.toString())
  });

  // it('Swap USDC -> VAB', async function () { 
  //   const usdcAmount = getBigNumber(10, 6) // 10 usdc  
  //   const byteData = getByteForSwap(usdcAmount, this.USDC.address, this.vabToken.address)
  //   const vabAmount1 = await this.UniHelper.connect(this.customer1).swapAsset(
  //     byteData,
  //     {from: this.customer1.address}
  //   )
  //   console.log("vab amount swap =====>", vabAmount1)
  // });

  // it('Swap USDC -> VAB in proposalFilmCreate', async function () { 
  //   const sharePercents = [getBigNumber(60, 8), getBigNumber(15, 8), getBigNumber(25, 8)]
  //   const studioPayees = [this.customer1.address, this.customer2.address, this.customer3.address]
  //   const raiseAmount = getBigNumber(150, 6)
  //   const fundPeriod = getBigNumber(20, 0)
  //   const fundType = getBigNumber(3, 0)
  //   const title4 = 'film title - 4'
  //   const desc4 = 'film description - 4'
  //   const enableClaimer = 1;
  //   let ethVal = ethers.utils.parseEther('1')
  //   const pId1 = [1]; // 1, 2
  //   const pId2 = [2]; // 1, 2
  //   const vInfo = [1];

  //   //======= Feb 11: create p-1 
  //   increaseTime(86400 * 10); // 10 days    
  //   await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(0, 0, CONFIG.addressZero, {from: this.studio1.address, value: ethVal})
  //   await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
  //     getBigNumber(1, 0), 
  //     title4,
  //     desc4,
  //     sharePercents, 
  //     studioPayees,  
  //     raiseAmount, 
  //     fundPeriod, 
  //     0,
  //     enableClaimer,
  //     {from: this.studio1.address}
  //   )
  //   // 432.349022312428311958
  // });
});
