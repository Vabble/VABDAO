const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');
const ERC20 = require('../data/ERC20.json');
const { CONFIG, getBigNumber, DISCOUNT, getVoteData, getConfig } = require('../scripts/utils');

const GNOSIS_FLAG = false;

describe('StakingPool', function () {
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
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;
    console.log("Chain ID: ", chainId);
    const config = getConfig(chainId);

    // load ERC20 tokens
    this.vabToken = new ethers.Contract(config.vabToken, JSON.stringify(ERC20), ethers.provider);

    this.USDC = new ethers.Contract(config.usdcAdress, JSON.stringify(ERC20), ethers.provider);
    this.USDT = new ethers.Contract(config.usdtAdress, JSON.stringify(ERC20), ethers.provider);

    this.GnosisSafe = await (await this.GnosisSafeFactory.deploy()).deployed();
    this.auditor = GNOSIS_FLAG ? this.GnosisSafe : this.deployer;

    this.Ownablee = await (await this.OwnableFactory.deploy(
      CONFIG.daoWalletAddress, this.vabToken.address, this.USDC.address, this.auditor.address
    )).deployed();

    this.UniHelper = await (await this.UniHelperFactory.deploy(
      config.uniswap.factory, config.uniswap.router,
      config.sushiswap.factory, config.sushiswap.router, this.Ownablee.address
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

    if (GNOSIS_FLAG) {
      let encodedCallData = this.Ownablee.interface.encodeFunctionData("addDepositAsset",
        [[this.vabToken.address, this.USDC.address, this.USDT.address, CONFIG.addressZero]]);

      // Generate Signature and Transaction information
      const { signatureBytes, tx } = await generateSignature(this.GnosisSafe, encodedCallData, this.Ownablee.address, [this.signer1, this.signer2]);

      await executeGnosisSafeTransaction(this.GnosisSafe, this.signer2, signatureBytes, tx);
    } else {
      await this.Ownablee.connect(this.auditor).addDepositAsset(
        [this.vabToken.address, this.USDC.address, this.USDT.address, CONFIG.addressZero], { from: this.auditor.address }
      )
    }

    await this.Ownablee.connect(this.deployer).addDepositAsset(
      [this.vabToken.address, this.USDC.address, this.USDT.address, CONFIG.addressZero],
      { from: this.deployer.address }
    )
    expect(await this.Ownablee.auditor()).to.be.equal(this.auditor.address);

    this.auditorBalance = await this.vabToken.balanceOf(this.auditor.address) // 145M
    console.log('======auditor balance::', this.auditorBalance.toString())

    // Initialize the VAB/USDC/USDT token for customers, studio, contracts         
    const source = this.deployer; // set token source

    // Transfering VAB token to user1, 2, 3        
    await this.vabToken.connect(source).transfer(this.customer1.address, getBigNumber(50000000), { from: source.address });
    await this.vabToken.connect(source).transfer(this.customer2.address, getBigNumber(50000000), { from: source.address });
    await this.vabToken.connect(source).transfer(this.customer3.address, getBigNumber(500000), { from: source.address });
    await this.vabToken.connect(source).transfer(this.customer4.address, getBigNumber(500000), { from: source.address });
    await this.vabToken.connect(source).transfer(this.customer5.address, getBigNumber(500000), { from: source.address });
    await this.vabToken.connect(source).transfer(this.customer6.address, getBigNumber(500000), { from: source.address });

    // Transfering VAB token to studio1, 2, 3
    await this.vabToken.connect(source).transfer(this.studio1.address, getBigNumber(500000), { from: source.address });
    await this.vabToken.connect(source).transfer(this.studio2.address, getBigNumber(500000), { from: source.address });
    await this.vabToken.connect(source).transfer(this.studio3.address, getBigNumber(500000), { from: source.address });

    // Approve to transfer VAB token for each customer, studio to StudioPool, StakingPool, FilmNFT
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

    await this.vabToken.connect(this.studio1).approve(this.VabbleDAO.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.VabbleDAO.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.VabbleDAO.address, getBigNumber(100000000));

    await this.vabToken.connect(this.studio1).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.StakingPool.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.StakingPool.address, getBigNumber(100000000));

    // ====== USDT
    // Transfering USDT token to customer1, 2, 3
    await this.USDT.connect(source).transfer(this.customer1.address, getBigNumber(5000, 6), { from: source.address });
    await this.USDT.connect(source).transfer(this.customer2.address, getBigNumber(5000, 6), { from: source.address });
    await this.USDT.connect(source).transfer(this.customer3.address, getBigNumber(5000, 6), { from: source.address });

    // Transfering USDT token to studio1, 2, 3
    await this.USDT.connect(source).transfer(this.studio1.address, getBigNumber(5000, 6), { from: source.address });
    await this.USDT.connect(source).transfer(this.studio2.address, getBigNumber(5000, 6), { from: source.address });
    await this.USDT.connect(source).transfer(this.studio3.address, getBigNumber(5000, 6), { from: source.address });

    // Approve to transfer USDT token for each customer, studio to StudioPool, StakingPool
    await this.USDT.connect(this.customer1).approve(this.VabbleDAO.address, getBigNumber(50000, 6));
    await this.USDT.connect(this.customer2).approve(this.VabbleDAO.address, getBigNumber(50000, 6));
    await this.USDT.connect(this.customer3).approve(this.VabbleDAO.address, getBigNumber(100000, 6));

    await this.USDT.connect(this.customer1).approve(this.StakingPool.address, getBigNumber(50000, 6));
    await this.USDT.connect(this.customer2).approve(this.StakingPool.address, getBigNumber(50000, 6));
    await this.USDT.connect(this.customer3).approve(this.StakingPool.address, getBigNumber(50000, 6));

    await this.USDT.connect(this.studio1).approve(this.VabbleDAO.address, getBigNumber(100000, 6));
    await this.USDT.connect(this.studio2).approve(this.VabbleDAO.address, getBigNumber(100000, 6));
    await this.USDT.connect(this.studio3).approve(this.VabbleDAO.address, getBigNumber(100000, 6));

    // ====== USDC
    // Transfering USDC token to user1, 2, 3                                            897497 291258
    await this.USDC.connect(source).transfer(this.customer1.address, getBigNumber(50000, 6), { from: source.address });
    await this.USDC.connect(source).transfer(this.customer2.address, getBigNumber(50000, 6), { from: source.address });
    await this.USDC.connect(source).transfer(this.customer3.address, getBigNumber(50000, 6), { from: source.address });
    await this.USDC.connect(source).transfer(this.customer4.address, getBigNumber(50000, 6), { from: source.address });
    await this.USDC.connect(source).transfer(this.customer5.address, getBigNumber(50000, 6), { from: source.address });
    await this.USDC.connect(source).transfer(this.customer6.address, getBigNumber(50000, 6), { from: source.address });

    // Transfering USDC token to studio1, 2, 3
    await this.USDC.connect(source).transfer(this.studio1.address, getBigNumber(50000, 6), { from: source.address });
    await this.USDC.connect(source).transfer(this.studio2.address, getBigNumber(50000, 6), { from: source.address });
    await this.USDC.connect(source).transfer(this.studio3.address, getBigNumber(50000, 6), { from: source.address });

    // Approve to transfer USDC token for each user, studio to VabbleDAO, VabbleFund, StakingPool, FilmNFT
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
    await this.USDC.connect(this.studio1).approve(this.FilmNFT.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.studio2).approve(this.FilmNFT.address, getBigNumber(10000000, 6));
    await this.USDC.connect(this.studio3).approve(this.FilmNFT.address, getBigNumber(10000000, 6));

    await this.Property.connect(this.deployer).updateForTesting({ from: this.deployer.address });

    this.events = [];
  });

  // it('Staking and unstaking, withdraw VAB token with two options', async function () {       
  //   // Add reward from auditor
  //   const rewardAmount = getBigNumber(50000000)
  //   await this.StakingPool.connect(this.auditor).addRewardToPool(rewardAmount, {from: this.auditor.address})
  //   expect(await this.StakingPool.totalRewardAmount()).to.be.equal(rewardAmount)


  //   const stakingAmount1 = getBigNumber(1000)
  //   const stakingAmount2 = getBigNumber(300)
  //   // const stakingAmount3 = getBigNumber(200)
  //   await this.StakingPool.connect(this.customer1).stakeVAB(stakingAmount1, {from: this.customer1.address})
  //   await this.StakingPool.connect(this.customer2).stakeVAB(stakingAmount2, {from: this.customer2.address})
  //   // await this.StakingPool.connect(this.customer3).stakeVAB(stakingAmount3, {from: this.customer3.address})
  //   expect(await this.StakingPool.getStakeAmount(this.customer1.address)).to.be.equal(stakingAmount1)

  //   let totalAmount = await this.StakingPool.totalStakingAmount()
  //   console.log('===totalStakingAmount1::', totalAmount.toString()) // 1000.000000000000000000

  //   // => Increase next block timestamp for only testing
  //   let period = 600; // 10 mins
  //   network.provider.send('evm_increaseTime', [period]);
  //   await network.provider.send('evm_mine');

  //   const stakingInfo1 = await this.StakingPool.stakeInfo(this.customer1.address)


  //   const tx1 = await this.StakingPool.connect(this.customer2).unstakeVAB(stakingAmount2, {from: this.customer2.address})
  //   this.events = (await tx1.wait()).events
  //   let args11 = this.events[1].args
  //   console.log('===events11::', args11.rewardAmount.toString())
  //   let args22 = this.events[3].args
  //   console.log('===events22::', args22.unStakeAmount.toString())

  //   // let userRewardAmount = await this.StakingPool.calcRewardAmount(this.customer1.address)
  //   // console.log('===userRewardAmount-start::', userRewardAmount.toString()) // 0.387500000000000000

  //   const tx = await this.StakingPool.connect(this.customer1).unstakeVAB(stakingAmount1, {from: this.customer1.address})
  //   this.events = (await tx.wait()).events
  //   let args1 = this.events[1].args
  //   console.log('===events1::', args1.rewardAmount.toString())
  //   let args2 = this.events[3].args
  //   console.log('===events2::', args2.unStakeAmount.toString())



  //   const stakingAmount4 = getBigNumber(1000)
  //   await this.StakingPool.connect(this.customer1).stakeVAB(stakingAmount1, {from: this.customer1.address})
  //   await this.StakingPool.connect(this.studio1).stakeVAB(stakingAmount4, {from: this.studio1.address})
  //   // => Increase next block timestamp for only testing
  //   period = 10 * 24 * 3600; // 10 days
  //   network.provider.send('evm_increaseTime', [period]);
  //   await network.provider.send('evm_mine');

  //   totalAmount = await this.StakingPool.totalStakingAmount()
  //   // console.log('===totalStakingAmount2::', totalAmount.toString()) // 2000.000000000000000000
  //   const studioRewardAmount = await this.StakingPool.calcRewardAmount(this.studio1.address)
  //   // console.log('===studioRewardAmount::', studioRewardAmount.toString()) // 0.125000000000000000
  //   const userRewardAmount2 = await this.StakingPool.calcRewardAmount(this.customer1.address)
  //   console.log('===userRewardAmount2::', userRewardAmount2.toString()) // 00.256250000000000000


  //   const stakingAmount5 = getBigNumber(1000)
  //   await this.StakingPool.connect(this.studio2).stakeVAB(stakingAmount5, {from: this.studio2.address})
  //   // => Increase next block timestamp for only testing
  //   period = 10 * 24 * 3600; // 10 days
  //   network.provider.send('evm_increaseTime', [period]);
  //   await network.provider.send('evm_mine');
  //   const userRewardAmount3 = await this.StakingPool.calcRewardAmount(this.customer1.address)
  //   console.log('===userRewardAmount3::', userRewardAmount3.toString()) // 00.212499660000000000

  //   await this.StakingPool.connect(this.studio1).unstakeVAB(getBigNumber(1000), {from: this.studio1.address})
  //   console.log('===sender::', this.studio1.address)

  //   // => Increase next block timestamp for only testing
  //   period = 10 * 24 * 3600; // 10 days
  //   network.provider.send('evm_increaseTime', [period]);
  //   await network.provider.send('evm_mine');
  //   const userRewardAmount4 = await this.StakingPool.calcRewardAmount(this.customer1.address)
  //   console.log('===userRewardAmount4::', userRewardAmount4.toString()) // 00.380614583587500000
  //   // return


  //   let aprAnyAmount = await this.StakingPool.calculateAPR(
  //     getBigNumber(365, 0), getBigNumber(20000), 10, 10, false
  //   )
  //   console.log('===aprAnyAmount-start::', aprAnyAmount.toString()) // 91.097916727500000000

  //   // =========== withdrawReward with option - 1
  //   let userRewardAmount = await this.StakingPool.calcRewardAmount(this.customer1.address)
  //   console.log('===userRewardAmount-1::', userRewardAmount.toString())

  //   let txx = await this.StakingPool.connect(this.customer1).withdrawReward(1, {from: this.customer1.address})
  //   this.events = (await txx.wait()).events
  //   let rargs = this.events[0].args
  //   expect(rargs.staker).to.be.equal(this.customer1.address)
  //   expect(rargs.isCompound).to.be.equal(1)

  //   const stakingInfo2 = await this.StakingPool.stakeInfo(this.customer1.address)
  //   expect(stakingInfo2.stakeAmount).to.be.equal(BigNumber.from(userRewardAmount).add(stakingInfo1.stakeAmount))
  //   expect(stakingInfo2.voteCount).to.be.equal(stakingInfo1.voteCount)

  //   // =========== withdrawReward with option - 0
  //   await expect(
  //     this.StakingPool.connect(this.customer1).withdrawReward(0, {from: this.customer1.address})
  //   ).to.be.revertedWith('withdrawReward: lock period yet');

  //   // => Increase next block timestamp for only testing
  //   period = 31 * 24 * 3600; // lockPeriod = 30 days
  //   network.provider.send('evm_increaseTime', [period]);
  //   await network.provider.send('evm_mine');

  //   userRewardAmount = await this.StakingPool.calcRewardAmount(this.customer1.address)
  //   txx = await this.StakingPool.connect(this.customer1).withdrawReward(0, {from: this.customer1.address})
  //   this.events = (await txx.wait()).events
  //   rargs = this.events[1].args
  //   expect(rargs.staker).to.be.equal(this.customer1.address)
  //   expect(rargs.rewardAmount).to.be.equal(userRewardAmount)

  //   const stakingInfo3 = await this.StakingPool.stakeInfo(this.customer1.address)
  //   expect(stakingInfo2.stakeAmount).to.be.equal(stakingInfo3.stakeAmount)

  //   // ============= calculate reward amount
  //   userRewardAmount = await this.StakingPool.calcRewardAmount(this.customer1.address)
  //   expect(userRewardAmount).to.be.equal(0) // because called withdrawReward just before.

  //   // => Increase next block timestamp for only testing
  //   period = 1 * 24 * 3600; // lockPeriod = 30 days
  //   network.provider.send('evm_increaseTime', [period]);
  //   await network.provider.send('evm_mine');

  //   userRewardAmount = await this.StakingPool.calcRewardAmount(this.customer1.address)
  //   console.log('===userRewardAmount-1::', userRewardAmount.toString())

  //   // => Increase next block timestamp for only testing
  //   period = 2 * 24 * 3600; // lockPeriod = 30 days
  //   network.provider.send('evm_increaseTime', [period]);
  //   await network.provider.send('evm_mine');

  //   userRewardAmount = await this.StakingPool.calcRewardAmount(this.customer1.address)
  //   console.log('===userRewardAmount-2::', userRewardAmount.toString())

  //   const nftRight = [getBigNumber(1,0), getBigNumber(2,0)]
  //   const sharePercents = [getBigNumber(60, 8), getBigNumber(15, 8), getBigNumber(25, 8)]
  //   const studioPayees = [this.customer1.address, this.customer2.address, this.customer3.address]
  //   const raiseAmount = getBigNumber(150, 6)
  //   const fundPeriod = getBigNumber(20, 0)
  //   const fundType = getBigNumber(3, 0)
  //   const title4 = 'film title - 4'
  //   const desc4 = 'film description - 4'
  //   const enableClaimer = 1;
  //   // Create proposal for a film by studio {from: this.studio1.address}
  //   let ethVal = ethers.utils.parseEther('1')
  //   await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(0, 0, CONFIG.addressZero, {from: this.studio1.address, value: ethVal})
  //   await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
  //     getBigNumber(1, 0), 
  //     title4,
  //     desc4,
  //     sharePercents, 
  //     studioPayees,  
  //     raiseAmount, 
  //     fundPeriod, 
  //     enableClaimer,
  //     {from: this.studio1.address}
  //   )

  //   await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(0, 0, CONFIG.addressZero, {from: this.studio1.address, value: ethVal})
  //   await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
  //     getBigNumber(2, 0), 
  //     title4,
  //     desc4,
  //     sharePercents, 
  //     studioPayees,  
  //     raiseAmount, 
  //     fundPeriod, 
  //     enableClaimer,
  //     {from: this.studio1.address}
  //   )

  //   await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(0, 0, CONFIG.addressZero, {from: this.studio1.address, value: ethVal})
  //   await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
  //     getBigNumber(3, 0), 
  //     title4,
  //     desc4,
  //     sharePercents, 
  //     studioPayees,  
  //     raiseAmount, 
  //     fundPeriod, 
  //     enableClaimer,
  //     {from: this.studio1.address}
  //   )

  //   userRewardAmount = await this.StakingPool.calcRewardAmount(this.customer1.address)
  //   console.log('===userRewardAmount-after create film proposal::', userRewardAmount.toString())

  //   /// Vote to Films 
  //   const proposalIds = await this.VabbleDAO.getFilmIds(1); // 1, 2
  //   console.log('=====proposalIds::', proposalIds.length)
  //   const voteInfos = [1, 1];
  //   // await this.Vote.connect(this.customer1).voteToFilms(proposalIds, voteInfos, {from: this.customer1.address})
  //   await this.Vote.connect(this.customer1).voteToFilms([1], [1], {from: this.customer1.address})

  //   userRewardAmount = await this.StakingPool.calcRewardAmount(this.customer1.address)
  //   console.log('===userRewardAmount-after vote::', userRewardAmount.toString()) // 240028800000000000

  //   // => Increase next block timestamp for only testing
  //   period = 28 * 24 * 3600; // lockPeriod = 30 days
  //   network.provider.send('evm_increaseTime', [period]);
  //   await network.provider.send('evm_mine');

  //   const list = await this.Vote.getListingFilmIdsPerUser(this.customer1.address)
  //   console.log('===list-before withdraw::', list.length)

  //   // await expect(
  //   //   this.StakingPool.connect(this.customer1).withdrawReward(0, {from: this.customer1.address})
  //   // ).to.emit(this.StakingPool, 'RewardWithdraw').withArgs(this.customer1.address, userRewardAmount);

  //   await this.vabToken.connect(this.auditor).approve(this.Ownablee.address, getBigNumber(100000000));
  //   await this.Ownablee.connect(this.auditor).depositVABToEdgePool(getBigNumber(2000))

  //   // let c2_balance = await this.vabToken.balanceOf(this.customer2.address)
  //   // console.log('=======c2_balance before::', c2_balance.toString())
  //   // const tx = await this.StakingPool.connect(this.auditor).withdrawAllFund(this.customer2.address)
  //   // this.events = (await tx.wait()).events
  //   // // console.log('=======events::', this.events)
  //   // const arg = this.events[2].args
  //   // const wAmount = arg.amount
  //   // console.log('=======wAmount::', wAmount.toString())
  //   // // 50000190000000000000000000
  //   // // 50000190000000000000000000
  //   // c2_balance = await this.vabToken.balanceOf(this.customer2.address)
  //   // console.log('=======c2_balance after::', c2_balance.toString())
  // });

  // it('check fund film', async function () {       
  //   // Add reward from auditor
  //   const rewardAmount = getBigNumber(50000000)
  //   await this.StakingPool.connect(this.auditor).addRewardToPool(rewardAmount, {from: this.auditor.address})
  //   expect(await this.StakingPool.totalRewardAmount()).to.be.equal(rewardAmount)


  //   const stakingAmount1 = getBigNumber(1000)
  //   const stakingAmount2 = getBigNumber(300)
  //   const stakingAmount3 = getBigNumber(200)
  //   const stakingAmount4 = getBigNumber(1000)
  //   await this.StakingPool.connect(this.customer1).stakeVAB(stakingAmount1, {from: this.customer1.address})
  //   await this.StakingPool.connect(this.customer2).stakeVAB(stakingAmount2, {from: this.customer2.address})
  //   await this.StakingPool.connect(this.customer3).stakeVAB(stakingAmount3, {from: this.customer3.address})
  //   await this.StakingPool.connect(this.studio1).stakeVAB(stakingAmount4, {from: this.studio1.address})


  //   const sharePercents = [getBigNumber(60, 8), getBigNumber(15, 8), getBigNumber(25, 8)]
  //   const studioPayees = [this.customer1.address, this.customer2.address, this.customer3.address]
  //   const raiseAmount = getBigNumber(150, 6)
  //   const fundPeriod = getBigNumber(20, 0)
  //   const fundType = 0 // getBigNumber(3, 0)
  //   const title4 = 'film title - 4'
  //   const desc4 = 'film description - 4'
  //   const enableClaimer = 1;
  //   // Create proposal for a film by studio {from: this.studio1.address}
  //   let ethVal = ethers.utils.parseEther('1')
  //   await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(fundType, 0, CONFIG.addressZero, {from: this.studio1.address, value: ethVal})
  //   await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
  //     getBigNumber(1, 0), 
  //     title4,
  //     desc4,
  //     sharePercents, 
  //     studioPayees,  
  //     raiseAmount, 
  //     fundPeriod, 
  //     enableClaimer,
  //     {from: this.studio1.address}
  //   )

  //   await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(fundType, 0, CONFIG.addressZero, {from: this.studio1.address, value: ethVal})
  //   await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
  //     getBigNumber(2, 0), 
  //     title4,
  //     desc4,
  //     sharePercents, 
  //     studioPayees,  
  //     raiseAmount, 
  //     fundPeriod, 
  //     enableClaimer,
  //     {from: this.studio1.address}
  //   )

  //   await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(fundType, 0, CONFIG.addressZero, {from: this.studio1.address, value: ethVal})
  //   await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
  //     getBigNumber(3, 0), 
  //     title4,
  //     desc4,
  //     sharePercents, 
  //     studioPayees,  
  //     raiseAmount, 
  //     fundPeriod, 
  //     enableClaimer,
  //     {from: this.studio1.address}
  //   )

  //   // let userRewardAmount = await this.StakingPool.calcRewardAmount(this.customer1.address)
  //   // console.log('===user1-RewardAmount-0::', userRewardAmount.toString()) // 0

  //   /// Vote to Films 
  //   const proposalIds = await this.VabbleDAO.getFilmIds(1); // 1, 2, 3
  //   console.log('=====proposalIds::', proposalIds.length)
  //   const voteInfos = [1, 1, 3];
  //   await this.Vote.connect(this.customer1).voteToFilms(proposalIds, voteInfos, {from: this.customer1.address})
  //   await this.Vote.connect(this.customer2).voteToFilms(proposalIds, voteInfos, {from: this.customer2.address})
  //   await this.Vote.connect(this.customer3).voteToFilms(proposalIds, voteInfos, {from: this.customer3.address})


  //   // => Increase next block timestamp for only testing
  //   let period = 600; // lockPeriod = 10 mins
  //   network.provider.send('evm_increaseTime', [period]);
  //   await network.provider.send('evm_mine');

  //   let userRewardAmount = await this.StakingPool.calcRewardAmount(this.customer1.address)
  //   console.log('===user1-RewardAmount-1::', userRewardAmount.toString()) // 36.361732105825869461 36.721749255388501831

  // });

  // it('Staking and unstaking, withdraw VAB token with min value', async function () {   
  //   const rAmount = getBigNumber(50000000)
  //   await this.StakingPool.connect(this.auditor).addRewardToPool(rAmount, {from: this.auditor.address})

  //   // Staking VAB token
  //   await expect(
  //     this.StakingPool.connect(this.customer1).stakeVAB(getBigNumber(1, 16), {from: this.customer1.address})
  //   ).to.be.revertedWith('stakeVAB: less amount than 0.01');

  //   await this.StakingPool.connect(this.customer1).stakeVAB(getBigNumber(2, 16), {from: this.customer1.address})
  //   expect(await this.StakingPool.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(2, 16))

  //   console.log('===isInitialized::', await this.StakingPool.isInitialized())
  //   // unstaking VAB token
  //   await expect(
  //     this.StakingPool.connect(this.customer1).unstakeVAB(getBigNumber(2, 16), {from: this.customer1.address})
  //   ).to.be.revertedWith('usVAB: lock');

  //   // => Increase next block timestamp for only testing
  //   const period = 31 * 24 * 3600; // lockPeriod = 30 days
  //   network.provider.send('evm_increaseTime', [period]);
  //   await network.provider.send('evm_mine');

  //   await this.StakingPool.connect(this.customer1).unstakeVAB(getBigNumber(2, 16), {from: this.customer1.address})
  //   expect(await this.StakingPool.getStakeAmount(this.customer1.address)).to.be.equal(0)

  //   //========= withdrawReward
  //   await this.StakingPool.connect(this.customer1).stakeVAB(getBigNumber(2, 16), {from: this.customer1.address})

  //   // => Increase next block timestamp for only testing
  //   network.provider.send('evm_increaseTime', [period]);
  //   await network.provider.send('evm_mine');

  //   const rewardA = await this.StakingPool.calcRewardAmount(this.customer1.address)
  //   let totalReward = await this.StakingPool.totalRewardAmount()
  //   console.log('===rewardAmount::', rewardA.toString(), totalReward.toString())

  //   await this.StakingPool.connect(this.customer1).withdrawReward(0, {from: this.customer1.address})

  //   totalReward = await this.StakingPool.totalRewardAmount()
  //   console.log('===rewardAmount::', rewardA.toString(), totalReward.toString())
  // });

  // it('Staking and unstaking VAB token', async function () {   
  //   // Staking VAB token
  //   await this.StakingPool.connect(this.customer1).stakeVAB(getBigNumber(100), {from: this.customer1.address})
  //   await this.StakingPool.connect(this.customer2).stakeVAB(getBigNumber(150), {from: this.customer2.address})
  //   await this.StakingPool.connect(this.customer3).stakeVAB(getBigNumber(300), {from: this.customer3.address})
  //   expect(await this.StakingPool.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(100))
  //   expect(await this.StakingPool.getStakeAmount(this.customer2.address)).to.be.equal(getBigNumber(150))
  //   expect(await this.StakingPool.getStakeAmount(this.customer3.address)).to.be.equal(getBigNumber(300))

  //   console.log('===isInitialized::', await this.StakingPool.isInitialized())
  //   // unstaking VAB token
  //   await expect(
  //     this.StakingPool.connect(this.customer1).unstakeVAB(getBigNumber(70), {from: this.customer1.address})
  //   ).to.be.revertedWith('usVAB: lock');

  //   console.log('===test::0')
  //   // => Increase next block timestamp for only testing
  //   const period = 31 * 24 * 3600; // lockPeriod = 30 days
  //   network.provider.send('evm_increaseTime', [period]);
  //   await network.provider.send('evm_mine');

  //   await this.StakingPool.connect(this.customer1).unstakeVAB(getBigNumber(70), {from: this.customer1.address})
  //   console.log('===isInitialized::', 'ok')
  //   expect(await this.StakingPool.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(30))
  // });

  it('Staking and unstaking VAB token when voting', async function () {
    // Staking VAB token
    const stakeAmount = getBigNumber(100)
    await this.StakingPool.connect(this.customer1).stakeVAB(stakeAmount, { from: this.customer1.address })
    await this.StakingPool.connect(this.customer2).stakeVAB(stakeAmount, { from: this.customer2.address })
    await this.StakingPool.connect(this.studio1).stakeVAB(stakeAmount, { from: this.studio1.address })
    expect(await this.StakingPool.getStakeAmount(this.customer1.address)).to.be.equal(stakeAmount)

    let w_t = await this.StakingPool.getWithdrawableTime(this.customer1.address);
    console.log("=====w-t after staking::", w_t.toString())

    // Create proposal for 2 films by studio        
    const nftRight = [getBigNumber(1, 0), getBigNumber(2, 0)]
    const sharePercents = [getBigNumber(60, 8), getBigNumber(15, 8), getBigNumber(25, 8)]
    const studioPayees = [this.customer1.address, this.customer2.address, this.customer3.address]
    const raiseAmount = getBigNumber(150, 6)
    const fundPeriod = getBigNumber(20, 0)
    const fundType = getBigNumber(3, 0)
    const title4 = 'film title - 4'
    const desc4 = 'film description - 4'
    const enableClaimer = 1;
    // Create proposal for a film by studio {from: this.studio1.address}
    let ethVal = ethers.utils.parseEther('1')
    await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(0, 0, CONFIG.addressZero, { from: this.studio1.address, value: ethVal })
    await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
      getBigNumber(1, 0),
      title4,
      desc4,
      sharePercents,
      studioPayees,
      raiseAmount,
      fundPeriod,
      0,
      enableClaimer,
      { from: this.studio1.address }
    )

    await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(0, 0, CONFIG.addressZero, { from: this.studio1.address, value: ethVal })
    await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
      getBigNumber(2, 0),
      title4,
      desc4,
      sharePercents,
      studioPayees,
      raiseAmount,
      fundPeriod,
      0,
      enableClaimer,
      { from: this.studio1.address }
    )

    // => Increase next block timestamp for only testing
    const period_1 = 180; // 3 mins
    network.provider.send('evm_increaseTime', [period_1]);
    await network.provider.send('evm_mine');

    await expect(
      this.StakingPool.connect(this.customer1).unstakeVAB(getBigNumber(70), { from: this.customer1.address })
    ).to.be.revertedWith('usVAB: lock');

    // customer1 vote to films
    const fCount = await this.VabbleDAO.filmCount(); // 1, 2
    const proposalIds = [1, 2]; // 1, 2
    console.log('=====test-0', fCount.toString())
    const voteInfos = [1, 1];
    await this.Vote.connect(this.customer1).voteToFilms(proposalIds, voteInfos, { from: this.customer1.address })
    await this.Vote.connect(this.customer2).voteToFilms(proposalIds, voteInfos, { from: this.customer2.address })

    // => Increase next block timestamp for only testing
    const period_2 = 60; // 1 mins
    network.provider.send('evm_increaseTime', [period_2]);
    await network.provider.send('evm_mine');

    // w_t = await this.StakingPool.getWithdrawableTime(this.customer1.address);
    // console.log("=====w-t after 34 days::", w_t.toString())
    await expect(
      this.StakingPool.connect(this.customer1).unstakeVAB(getBigNumber(70), { from: this.customer1.address })
    ).to.be.revertedWith('usVAB: lock');

    // => Increase next block timestamp
    const period_3 = 600; // 10 mins
    network.provider.send('evm_increaseTime', [period_3]);
    await network.provider.send('evm_mine');

    // const rewardRate = await this.Property.rewardRate()
    // const totalRewardAmount = await this.StakingPool.totalRewardAmount()
    // const totalStakingAmount = await this.StakingPool.totalStakingAmount()

    let userRewardAmount1 = await this.StakingPool.calcRewardAmount(this.customer1.address)
    let userRewardAmount2 = await this.StakingPool.calcRewardAmount(this.customer2.address)
    console.log('====userRewardAmount1,2::', userRewardAmount1.toString(), userRewardAmount2.toString())

    // ==== 1
    await this.StakingPool.connect(this.customer2).withdrawReward(0, { from: this.customer2.address })
    const userReceivedRewardAmount2 = await this.StakingPool.connect(this.customer2).receivedRewardAmount(this.customer2.address, { from: this.customer2.address })
    console.log('====userReceivedRewardAmount-2::', userReceivedRewardAmount2.toString())

    // ==== 2
    userRewardAmount1 = await this.StakingPool.calcRewardAmount(this.customer1.address)
    const tx = await this.StakingPool.connect(this.customer1).unstakeVAB(getBigNumber(70), { from: this.customer1.address })
    this.events = (await tx.wait()).events
    const arg_reward = this.events[1].args
    const arg_unstake = this.events[3].args
    expect(arg_reward.staker).to.be.equal(this.customer1.address)

    // 1303425169751284 
    // 1277093348140147

    expect(arg_reward.rewardAmount).to.be.equal(userRewardAmount1)
    expect(arg_unstake.unstaker).to.be.equal(this.customer1.address)
    expect(arg_unstake.unStakeAmount).to.be.equal(getBigNumber(70))
    expect(await this.StakingPool.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(30))



    const totalRewardIssuedAmount = await this.StakingPool.totalRewardIssuedAmount();
    console.log('====totalRewardIssuedAmount::', totalRewardIssuedAmount.toString())

    const userReceivedRewardAmount1 = await this.StakingPool.connect(this.customer1).receivedRewardAmount(this.customer1.address, { from: this.customer1.address })
    console.log('====userReceivedRewardAmount-1::', userReceivedRewardAmount1.toString())

    // getLimitCount()
    const val = await this.StakingPool.getLimitCount();
    console.log('====limitVal:', val.toString())
  });

  it('depositVAB and withdraw it and approve', async function () {
    expect(await this.StakingPool.checkAllocateToPool(
      [this.customer1.address, this.customer2.address, this.customer3.address],
      [getBigNumber(500), getBigNumber(1000), getBigNumber(1000)]
    )).to.be.false;

    expect(await this.StakingPool.checkApprovePendingWithdraw(
      [this.customer1.address, this.customer2.address, this.customer3.address]
    )).to.be.false;

    // Deposit VAB token for move from customer to staking pool using depositVAB
    await this.StakingPool.connect(this.customer1).depositVAB(getBigNumber(10000), { from: this.customer1.address })
    await this.StakingPool.connect(this.customer2).depositVAB(getBigNumber(15000), { from: this.customer2.address })
    await this.StakingPool.connect(this.customer3).depositVAB(getBigNumber(15000), { from: this.customer3.address })

    // check allocateToPool
    expect(await this.StakingPool.checkAllocateToPool(
      [this.customer1.address, this.customer2.address, this.customer3.address],
      [getBigNumber(20000), getBigNumber(1000), getBigNumber(1000)]
    )).to.be.false;

    expect(await this.StakingPool.checkAllocateToPool(
      [this.customer1.address, this.customer2.address, this.customer3.address],
      [getBigNumber(500), getBigNumber(1000), getBigNumber(1000)]
    )).to.be.true;

    expect(await this.StakingPool.checkApprovePendingWithdraw(
      [this.customer1.address, this.customer2.address, this.customer3.address]
    )).to.be.false;

    // request withdraw
    await this.StakingPool.connect(this.customer1).pendingWithdraw(getBigNumber(500), { from: this.customer1.address });
    await this.StakingPool.connect(this.customer2).pendingWithdraw(getBigNumber(1000), { from: this.customer2.address });

    // should be still false
    expect(await this.StakingPool.checkApprovePendingWithdraw(
      [this.customer1.address, this.customer2.address, this.customer3.address]
    )).to.be.false;

    await this.StakingPool.connect(this.customer3).pendingWithdraw(getBigNumber(1000), { from: this.customer3.address });

    // after all 3 customers request withdraw, should be true
    expect(await this.StakingPool.checkApprovePendingWithdraw(
      [this.customer1.address, this.customer2.address, this.customer3.address]
    )).to.be.true;

    // approve with draw
    await this.StakingPool.approvePendingWithdraw([this.customer1.address, this.customer2.address, this.customer3.address]);

    // after approve withdraw, it cannot be withdraw again until next request withdraw
    expect(await this.StakingPool.checkApprovePendingWithdraw(
      [this.customer1.address, this.customer2.address, this.customer3.address]
    )).to.be.false;
  });

  it('depositVAB and withdraw it and deny', async function () {
    expect(await this.StakingPool.checkDenyPendingWithDraw(
      [this.customer1.address, this.customer2.address, this.customer3.address]
    )).to.be.false;

    // Deposit VAB token for move from customer to staking pool using depositVAB
    await this.StakingPool.connect(this.customer1).depositVAB(getBigNumber(10000), { from: this.customer1.address })
    await this.StakingPool.connect(this.customer2).depositVAB(getBigNumber(15000), { from: this.customer2.address })
    await this.StakingPool.connect(this.customer3).depositVAB(getBigNumber(15000), { from: this.customer3.address })

    expect(await this.StakingPool.checkDenyPendingWithDraw(
      [this.customer1.address, this.customer2.address, this.customer3.address]
    )).to.be.false;

    // request withdraw
    await this.StakingPool.connect(this.customer1).pendingWithdraw(getBigNumber(500), { from: this.customer1.address });
    await this.StakingPool.connect(this.customer2).pendingWithdraw(getBigNumber(1000), { from: this.customer2.address });

    // should be still false
    expect(await this.StakingPool.checkDenyPendingWithDraw(
      [this.customer1.address, this.customer2.address, this.customer3.address]
    )).to.be.false;

    await this.StakingPool.connect(this.customer3).pendingWithdraw(getBigNumber(1000), { from: this.customer3.address });

    // after all 3 customers request withdraw, should be true
    expect(await this.StakingPool.checkDenyPendingWithDraw(
      [this.customer1.address, this.customer2.address, this.customer3.address]
    )).to.be.true;

    // approve with draw
    await this.StakingPool.denyPendingWithdraw([this.customer1.address, this.customer2.address, this.customer3.address]);

    // after deny withdraw, it cannot be denied again until next request withdraw
    expect(await this.StakingPool.checkDenyPendingWithDraw(
      [this.customer1.address, this.customer2.address, this.customer3.address]
    )).to.be.false;
  });
});
