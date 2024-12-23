const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');
const { generateSignature, executeGnosisSafeTransaction } = require('../scripts/gnosis-safe');
const ERC20 = require('../data/ERC20.json');
const FERC20 = require('../data/FxERC20.json');
const { CONFIG, DISCOUNT, getBigNumber, increaseTime } = require('../scripts/utils');

const GNOSIS_FLAG = true;

describe('Vote', function () {
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

    this.auditorBalance = await this.vabToken.balanceOf(this.deployer.address) // 145M

    // Approve to transfer VAB token for each user, studio to DAO, StakingPool
    await this.vabToken.connect(this.customer1).approve(this.VabbleDAO.address, this.auditorBalance);
    await this.vabToken.connect(this.customer2).approve(this.VabbleDAO.address, this.auditorBalance);
    await this.vabToken.connect(this.customer3).approve(this.VabbleDAO.address, this.auditorBalance);

    await this.vabToken.connect(this.customer1).approve(this.StakingPool.address, this.auditorBalance);
    await this.vabToken.connect(this.customer2).approve(this.StakingPool.address, this.auditorBalance);
    await this.vabToken.connect(this.customer3).approve(this.StakingPool.address, this.auditorBalance);
    await this.vabToken.connect(this.customer4).approve(this.StakingPool.address, this.auditorBalance);
    await this.vabToken.connect(this.customer5).approve(this.StakingPool.address, this.auditorBalance);
    await this.vabToken.connect(this.customer6).approve(this.StakingPool.address, this.auditorBalance);
    await this.vabToken.connect(this.customer7).approve(this.StakingPool.address, this.auditorBalance);

    await this.vabToken.connect(this.customer1).approve(this.Vote.address, this.auditorBalance);
    await this.vabToken.connect(this.customer2).approve(this.Vote.address, this.auditorBalance);
    await this.vabToken.connect(this.customer3).approve(this.Vote.address, this.auditorBalance);
    await this.vabToken.connect(this.customer4).approve(this.Vote.address, this.auditorBalance);
    await this.vabToken.connect(this.customer5).approve(this.Vote.address, this.auditorBalance);
    await this.vabToken.connect(this.customer6).approve(this.Vote.address, this.auditorBalance);
    await this.vabToken.connect(this.customer7).approve(this.Vote.address, this.auditorBalance);

    await this.vabToken.connect(this.customer1).approve(this.Property.address, this.auditorBalance);
    await this.vabToken.connect(this.customer2).approve(this.Property.address, this.auditorBalance);
    await this.vabToken.connect(this.customer3).approve(this.Property.address, this.auditorBalance);
    await this.vabToken.connect(this.customer4).approve(this.Property.address, this.auditorBalance);
    await this.vabToken.connect(this.customer5).approve(this.Property.address, this.auditorBalance);
    await this.vabToken.connect(this.customer6).approve(this.Property.address, this.auditorBalance);
    await this.vabToken.connect(this.customer7).approve(this.Property.address, this.auditorBalance);

    await this.vabToken.connect(this.studio1).approve(this.VabbleDAO.address, this.auditorBalance);
    await this.vabToken.connect(this.studio2).approve(this.VabbleDAO.address, this.auditorBalance);
    await this.vabToken.connect(this.studio3).approve(this.VabbleDAO.address, this.auditorBalance);
    await this.vabToken.connect(this.studio1).approve(this.StakingPool.address, this.auditorBalance);
    await this.vabToken.connect(this.studio2).approve(this.StakingPool.address, this.auditorBalance);
    await this.vabToken.connect(this.studio3).approve(this.StakingPool.address, this.auditorBalance);

    this.rentPrices = [getBigNumber(100), getBigNumber(200), getBigNumber(300), getBigNumber(400)];
    this.fundPeriods = [getBigNumber(20 * 86400, 0), getBigNumber(30 * 86400, 0), getBigNumber(60 * 86400, 0), getBigNumber(10 * 86400, 0)];
    this.filmPropsoal = [];
    this.events = [];
    this.voteInfo = [1, 2, 1] // yes, no
  });

  // it('VoteToFilms', async function () {    
  //   // Transfering VAB token to user1, 2, 3 and studio1,2,3
  //   await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(10000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.customer2.address, getBigNumber(10000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.customer3.address, getBigNumber(10000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.studio1.address, getBigNumber(10000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.studio2.address, getBigNumber(10000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.studio3.address, getBigNumber(10000), {from: this.auditor.address});

  //   //=> voteToFilms()
  //   const proposalIds = [1, 2, 3, 4]
  //   const voteInfos = [1, 1, 2, 3];
  //   const voteData = getVoteData(proposalIds, voteInfos)
  //   await expect(
  //     this.Vote.connect(this.customer1).voteToFilms(voteData, {from: this.customer1.address})
  //   ).to.be.revertedWith('function call to a non-contract account')

  //   // Initialize Vote contract
  //   await this.Vote.connect(this.auditor).initializeVote(
  //     this.VabbleDAO.address,
  //     this.StakingPool.address,
  //     this.Property.address,
  //   )

  //   await expect(
  //     this.Vote.connect(this.customer1).voteToFilms(voteData, {from: this.customer1.address})
  //   ).to.be.revertedWith('Not staker')

  //   // Staking from customer1,2,3 for vote
  //   const stakeAmount = getBigNumber(200)
  //   await this.StakingPool.connect(this.customer1).stakeVAB(stakeAmount, {from: this.customer1.address})
  //   await this.StakingPool.connect(this.customer2).stakeVAB(stakeAmount, {from: this.customer2.address})
  //   await this.StakingPool.connect(this.customer3).stakeVAB(stakeAmount, {from: this.customer3.address})
  //   await this.StakingPool.connect(this.studio1).stakeVAB(stakeAmount, {from: this.studio1.address})

  //   // Deposit to contract(VAB amount : 100, 200, 300)
  //   await this.StakingPool.connect(this.customer1).depositVAB(getBigNumber(100), {from: this.customer1.address})
  //   await this.StakingPool.connect(this.customer2).depositVAB(getBigNumber(200), {from: this.customer2.address})
  //   await this.StakingPool.connect(this.customer3).depositVAB(getBigNumber(300), {from: this.customer3.address})

  //   // Create proposal for four films by studio
  //   const raiseAmounts = [getBigNumber(0), getBigNumber(0), getBigNumber(3000, 6), getBigNumber(3000, 6)];
  //   const onlyAllowVABs = [true, true, false, false];
  //   const film_1 = [this.rentPrices[0], raiseAmounts[0], this.fundPeriods[0], onlyAllowVABs[0], false]
  //   const film_2 = [this.rentPrices[1], raiseAmounts[1], this.fundPeriods[1], onlyAllowVABs[1], false]
  //   const film_3 = [this.rentPrices[2], raiseAmounts[2], this.fundPeriods[2], onlyAllowVABs[2], false]
  //   const film_4 = [this.rentPrices[3], raiseAmounts[3], this.fundPeriods[3], onlyAllowVABs[3], false]
  //   this.filmPropsoal = [getProposalFilm(film_1), getProposalFilm(film_2), getProposalFilm(film_3), getProposalFilm(film_4)]
  //   await this.VabbleDAO.connect(this.studio1).proposalMultiFilms(this.filmPropsoal, {from: this.studio1.address})

  //   await this.Vote.connect(this.customer1).voteToFilms(voteData, {from: this.customer1.address}) //1,1,2,3
  //   await this.Vote.connect(this.customer2).voteToFilms(voteData, {from: this.customer2.address}) //1,1,2,3
  //   await this.Vote.connect(this.customer3).voteToFilms(voteData, {from: this.customer3.address}) //1,1,2,3    
  // });

  it('VoteToAgent-Dispute', async function () {
    await this.vabToken.connect(this.deployer).transfer(this.customer1.address, getBigNumber(9000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer2.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer3.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer4.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer5.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer6.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer7.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.studio1.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.studio2.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.studio3.address, getBigNumber(10000), { from: this.deployer.address });

    const stakeAmount = getBigNumber(200)
    await this.StakingPool.connect(this.customer1).stakeVAB(getBigNumber(150), { from: this.customer1.address })
    await this.StakingPool.connect(this.customer2).stakeVAB(stakeAmount, { from: this.customer2.address })
    await this.StakingPool.connect(this.customer3).stakeVAB(stakeAmount, { from: this.customer3.address })
    await this.StakingPool.connect(this.customer4).stakeVAB(stakeAmount, { from: this.customer4.address })
    await this.StakingPool.connect(this.customer5).stakeVAB(stakeAmount, { from: this.customer5.address })
    await this.StakingPool.connect(this.customer6).stakeVAB(stakeAmount, { from: this.customer6.address })
    await this.StakingPool.connect(this.customer7).stakeVAB(getBigNumber(450), { from: this.customer7.address })

    const index = [0, 1, 2];
    const flag = 1;
    // ======== voteToAgent before create proposal
    await expect(
      this.Vote.connect(this.customer2).voteToAgent(flag, index[0], { from: this.customer2.address })
    ).to.be.revertedWith('vA: no proposal')

    await this.Property.connect(this.deployer).updateAvailableVABForTesting(getBigNumber(150), { from: this.deployer.address });

    // ======== proposalAuditor
    await this.Property.connect(this.customer1).proposalAuditor(this.auditorAgent1.address, "test-1", "desc-1", { from: this.customer1.address });
    await this.Property.connect(this.customer2).proposalAuditor(this.auditorAgent2.address, "test-2", "desc-2", { from: this.customer2.address });

    // ======== voteToAgent after create proposal
    await expect(
      this.Vote.connect(this.customer1).voteToAgent(flag, index[0], { from: this.customer1.address })
    ).to.be.revertedWith('vA: self voted')

    await expect(
      this.Vote.connect(this.customer2).voteToAgent(flag, index[1], { from: this.customer2.address })
    ).to.be.revertedWith('vA: self voted')

    // index=2(avaliable index: 0, 1)    
    await expect(
      this.Vote.connect(this.customer2).voteToAgent(flag, index[2], { from: this.customer2.address })
    ).to.be.revertedWith('vA: no proposal')

    await this.Vote.connect(this.customer3).voteToAgent(flag, index[0], { from: this.customer3.address });
    await this.Vote.connect(this.customer4).voteToAgent(flag, index[0], { from: this.customer4.address });
    await this.Vote.connect(this.customer5).voteToAgent(flag, index[0], { from: this.customer5.address });
    await this.Vote.connect(this.customer6).voteToAgent(flag, index[0], { from: this.customer6.address });
    await this.Vote.connect(this.customer7).voteToAgent(flag, index[0], { from: this.customer7.address });

    // voteToAgent again
    await expect(
      this.Vote.connect(this.customer3).voteToAgent(flag, index[0], { from: this.customer3.address })
    ).to.be.revertedWith('vA: already voted')

    // ======== updateAgentStats
    await expect(
      this.Vote.connect(this.customer3).updateAgentStats(index[0], { from: this.customer3.address })
    ).to.be.revertedWith('uAS: vote period yet')

    const agentVotePeriod = await this.Property.agentVotePeriod()
    const defaultAgentVotePeriod = 10 * 86400; // 10 days
    expect(agentVotePeriod).to.be.equal(defaultAgentVotePeriod)
    increaseTime(defaultAgentVotePeriod); // 10 days    
    increaseTime(86400); // 1 days    

    await this.Vote.connect(this.customer3).updateAgentStats(index[0], { from: this.customer3.address });

    let pData = await this.Property.getGovProposalInfo(index[0], flag);
    expect(pData[5]).to.be.equal(1) // should be updated to dispute stats

    // ======== disputeToAgent

    // const disputeGracePeriod = await this.Property.disputeGracePeriod();
    // const defaultDisputeGracePeriod = 30 * 86400; // 30 days
    // expect(disputeGracePeriod).to.be.equal(defaultDisputeGracePeriod)
    // increaseTime(defaultDisputeGracePeriod); // 30 days    
    // increaseTime(86400); // 1 days   

    // await expect(
    //   this.Vote.connect(this.customer4).disputeToAgent(index[0], false, {from: this.customer4.address})
    // ).to.be.revertedWith('dTA: elapsed dispute period')

    //========== 1: we must stake more
    const isMore7 = await this.Vote.isDoubleStaked(index[0], this.customer7.address);
    console.log("=========more7?:", isMore7)
    const isMore4 = await this.Vote.isDoubleStaked(index[0], this.customer4.address);
    console.log("=========more4?:", isMore4)

    await expect(
      this.Vote.connect(this.customer4).disputeToAgent(index[0], false, { from: this.customer4.address })
    ).to.be.revertedWith('dTA: stake more')
    await this.StakingPool.connect(this.customer4).stakeVAB(stakeAmount, { from: this.customer4.address })

    await this.Vote.connect(this.customer4).disputeToAgent(index[0], false, { from: this.customer4.address })
    pData = await this.Property.getGovProposalInfo(index[0], flag);
    expect(pData[5]).to.be.equal(4) // should be rejected to dispute stats

    await expect(
      this.Vote.connect(this.customer5).disputeToAgent(index[0], false, { from: this.customer5.address })
    ).to.be.revertedWith('dTA: reject or not pass vote')

    // ======== replaceAuditor
    await expect(
      this.Vote.connect(this.customer1).replaceAuditor(index[0], { from: this.customer1.address })
    ).to.be.revertedWith('rA: reject or not pass vote')
  });

  it('VoteToAgent-Replace Auditor', async function () {
    await this.vabToken.connect(this.deployer).transfer(this.customer1.address, getBigNumber(9000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer2.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer3.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer4.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer5.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer6.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer7.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.studio1.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.studio2.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.studio3.address, getBigNumber(10000), { from: this.deployer.address });

    const stakeAmount = getBigNumber(200)
    await this.StakingPool.connect(this.customer1).stakeVAB(getBigNumber(150), { from: this.customer1.address })
    await this.StakingPool.connect(this.customer2).stakeVAB(stakeAmount, { from: this.customer2.address })
    await this.StakingPool.connect(this.customer3).stakeVAB(stakeAmount, { from: this.customer3.address })
    await this.StakingPool.connect(this.customer4).stakeVAB(stakeAmount, { from: this.customer4.address })
    await this.StakingPool.connect(this.customer5).stakeVAB(stakeAmount, { from: this.customer5.address })
    await this.StakingPool.connect(this.customer6).stakeVAB(stakeAmount, { from: this.customer6.address })
    await this.StakingPool.connect(this.customer7).stakeVAB(getBigNumber(450), { from: this.customer7.address })

    const index = [0, 1, 2];
    const flag = 1;
    // ======== voteToAgent before create proposal
    await expect(
      this.Vote.connect(this.customer2).voteToAgent(flag, index[0], { from: this.customer2.address })
    ).to.be.revertedWith('vA: no proposal')

    await this.Property.connect(this.deployer).updateAvailableVABForTesting(getBigNumber(150), { from: this.deployer.address });

    // ======== proposalAuditor
    await this.Property.connect(this.customer1).proposalAuditor(this.auditorAgent1.address, "test-1", "desc-1", { from: this.customer1.address });
    await this.Property.connect(this.customer2).proposalAuditor(this.auditorAgent2.address, "test-2", "desc-2", { from: this.customer2.address });

    // ======== voteToAgent after create proposal
    await expect(
      this.Vote.connect(this.customer1).voteToAgent(flag, index[0], { from: this.customer1.address })
    ).to.be.revertedWith('vA: self voted')

    await expect(
      this.Vote.connect(this.customer2).voteToAgent(flag, index[1], { from: this.customer2.address })
    ).to.be.revertedWith('vA: self voted')

    // index=2(avaliable index: 0, 1)    
    await expect(
      this.Vote.connect(this.customer2).voteToAgent(flag, index[2], { from: this.customer2.address })
    ).to.be.revertedWith('vA: no proposal')

    await this.Vote.connect(this.customer3).voteToAgent(flag, index[0], { from: this.customer3.address });
    await this.Vote.connect(this.customer4).voteToAgent(flag, index[0], { from: this.customer4.address });
    await this.Vote.connect(this.customer5).voteToAgent(flag, index[0], { from: this.customer5.address });
    await this.Vote.connect(this.customer6).voteToAgent(flag, index[0], { from: this.customer6.address });
    await this.Vote.connect(this.customer7).voteToAgent(flag, index[0], { from: this.customer7.address });

    // voteToAgent again
    await expect(
      this.Vote.connect(this.customer3).voteToAgent(flag, index[0], { from: this.customer3.address })
    ).to.be.revertedWith('vA: already voted')

    // ======== updateAgentStats
    await expect(
      this.Vote.connect(this.customer3).updateAgentStats(index[0], { from: this.customer3.address })
    ).to.be.revertedWith('uAS: vote period yet')

    const agentVotePeriod = await this.Property.agentVotePeriod()
    const defaultAgentVotePeriod = 10 * 86400; // 10 days
    expect(agentVotePeriod).to.be.equal(defaultAgentVotePeriod)
    increaseTime(defaultAgentVotePeriod); // 10 days    
    increaseTime(86400); // 1 days    

    await this.Vote.connect(this.customer3).updateAgentStats(index[0], { from: this.customer3.address });

    let pData = await this.Property.getGovProposalInfo(index[0], flag);
    expect(pData[5]).to.be.equal(1) // should be updated to dispute stats

    // ======== disputeToAgent

    // const disputeGracePeriod = await this.Property.disputeGracePeriod();
    // const defaultDisputeGracePeriod = 30 * 86400; // 30 days
    // expect(disputeGracePeriod).to.be.equal(defaultDisputeGracePeriod)
    // increaseTime(defaultDisputeGracePeriod); // 30 days    
    // increaseTime(86400); // 1 days   

    // await expect(
    //   this.Vote.connect(this.customer4).disputeToAgent(index[0], false, {from: this.customer4.address})
    // ).to.be.revertedWith('dTA: elapsed dispute period')

    //========== 1: we must stake more
    const isMore7 = await this.Vote.isDoubleStaked(index[0], this.customer7.address);
    console.log("=========more7?:", isMore7)
    const isMore4 = await this.Vote.isDoubleStaked(index[0], this.customer4.address);
    console.log("=========more4?:", isMore4)

    await expect(
      this.Vote.connect(this.customer4).disputeToAgent(index[0], false, { from: this.customer4.address })
    ).to.be.revertedWith('dTA: stake more')
    await this.StakingPool.connect(this.customer4).stakeVAB(stakeAmount, { from: this.customer4.address })

    const disputeGracePeriod = await this.Property.disputeGracePeriod();
    const defaultDisputeGracePeriod = 30 * 86400; // 30 days
    expect(disputeGracePeriod).to.be.equal(defaultDisputeGracePeriod)
    increaseTime(defaultDisputeGracePeriod); // 30 days    
    increaseTime(86400); // 1 days   

    let aud = await this.Ownablee.auditor();
    console.log("====old_aud", aud)

    await this.Vote.connect(this.customer1).replaceAuditor(index[0], { from: this.customer1.address })
    aud = await this.Ownablee.auditor();
    console.log("====new_aud", aud)

    await expect(
      this.Vote.connect(this.customer1).replaceAuditor(index[0], { from: this.customer1.address })
    ).to.be.revertedWith('rA: reject or not pass vote')
  });

  it('voteToProperty', async function () {
    await this.vabToken.connect(this.deployer).transfer(this.customer1.address, getBigNumber(90000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer2.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer3.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer4.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer5.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer6.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer7.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.studio1.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.studio2.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.studio3.address, getBigNumber(10000), { from: this.deployer.address });

    const stakeAmount = getBigNumber(200)
    await this.StakingPool.connect(this.customer1).stakeVAB(stakeAmount, { from: this.customer1.address })
    await this.StakingPool.connect(this.customer2).stakeVAB(stakeAmount, { from: this.customer2.address })
    await this.StakingPool.connect(this.customer3).stakeVAB(stakeAmount, { from: this.customer3.address })
    await this.StakingPool.connect(this.customer4).stakeVAB(stakeAmount, { from: this.customer4.address })
    await this.StakingPool.connect(this.customer5).stakeVAB(stakeAmount, { from: this.customer5.address })
    await this.StakingPool.connect(this.customer6).stakeVAB(stakeAmount, { from: this.customer6.address })
    await this.StakingPool.connect(this.customer7).stakeVAB(stakeAmount, { from: this.customer7.address })

    let flag = 0;
    let indx = 0;
    let property1 = 15 * 86400; // 15 days
    let property2 = 20 * 86400; // 20 days
    let defaultVal = 10 * 86400; // 10 days    
    let period_8 = 8 * 86400; // 8 days      
    let period_3 = 14 * 86400; // 3 days    

    // Call voteToProperty() before create a proposal
    await expect(
      this.Vote.connect(this.customer1).voteToProperty(this.voteInfo[0], indx, flag, { from: this.customer1.address })
    ).to.be.revertedWith('vP: no proposal')

    // call proposalProperty with extreme values
    await expect(
      this.Property.connect(this.customer6).proposalProperty(101 * 86400, flag, 'test-1', 'desc-1', { from: this.customer6.address })
    ).to.be.revertedWith('pP: invalid')

    // 1 ====================== proposalProperty(filmVotePeriod) ======================
    await this.Property.connect(this.customer6).proposalProperty(property1, flag, 'test-1', 'desc-1', { from: this.customer6.address })
    await this.Property.connect(this.customer7).proposalProperty(property2, flag, 'test-1', 'desc-1', { from: this.customer7.address })
    let proposal1 = await this.Property.getPropertyProposalInfo(0, flag);
    let proposal2 = await this.Property.getPropertyProposalInfo(1, flag);
    // console.log('====proposal1', proposal1)
    // console.log('====proposal2', proposal2)

    expect(proposal1[1]).to.be.equal(0)
    expect(proposal1[3]).to.be.equal(property1)
    expect(proposal1[4]).to.be.equal(this.customer6.address)
    expect(proposal1[5]).to.be.equal(0)

    expect(proposal2[1]).to.be.equal(0)
    expect(proposal2[3]).to.be.equal(property2)
    expect(proposal2[4]).to.be.equal(this.customer7.address)
    expect(proposal2[5]).to.be.equal(0)

    // // voteToProperty
    await this.Vote.connect(this.customer1).voteToProperty(this.voteInfo[0], indx, flag, { from: this.customer1.address })
    await this.Vote.connect(this.customer2).voteToProperty(this.voteInfo[0], indx, flag, { from: this.customer2.address })
    await this.Vote.connect(this.customer3).voteToProperty(this.voteInfo[0], indx, flag, { from: this.customer3.address })
    await this.Vote.connect(this.customer4).voteToProperty(this.voteInfo[1], indx, flag, { from: this.customer4.address })
    await this.Vote.connect(this.customer5).voteToProperty(this.voteInfo[2], indx, flag, { from: this.customer5.address })
    await expect(
      this.Vote.connect(this.customer6).voteToProperty(this.voteInfo[2], indx, flag, { from: this.customer6.address })
    ).to.be.revertedWith('vP: self voted')

    // => Increase next block timestamp
    network.provider.send('evm_increaseTime', [period_8]);
    await network.provider.send('evm_mine');

    // Call updateProperty() before vote period
    await expect(
      this.Vote.connect(this.customer1).updateProperty(indx, flag, { from: this.customer1.address })
    ).to.be.revertedWith('pV: vote period yet')

    // => Increase next block timestamp
    network.provider.send('evm_increaseTime', [period_3]);
    await network.provider.send('evm_mine');

    // updateProperty
    await this.Vote.connect(this.customer1).updateProperty(indx, flag, { from: this.customer1.address })
    proposal1 = await this.Property.getPropertyProposalInfo(indx, flag)

    let propertyVal = proposal1[3];

    expect(proposal1[1] > 0).to.be.true
    expect(propertyVal).to.be.equal(property1)
    expect(proposal1[4]).to.be.equal(this.customer6.address)
    expect(proposal1[5]).to.be.equal(1) // approved

    // expect(await this.Property.filmVotePeriod()).to.be.equal(property1)
    expect(await this.Property.filmVotePeriod()).to.be.equal(property1)

    // TODO
    const voteResult = await this.Vote.propertyVoting(flag, propertyVal);
    console.log('=====voteResult-0::', voteResult[0].toString())
    console.log('=====voteResult-1::', voteResult[1].toString())
    console.log('=====voteResult-2::', voteResult[2].toString())
    console.log('=====voteResult-3::', voteResult[3].toString())

    // 2 =================== proposalProperty(rewardRate) ======================
    console.log("\n\n=================== proposalProperty(rewardRate) ======================\n")
    // await this.StakingPool.connect(this.customer1).stakeVAB(getBigNumber(30000000), {from: this.customer1.address})
    let rewardRate = await this.Property.rewardRate();
    console.log('====defaultPropertyVal::', rewardRate.toString())
    let totalRewardAmount = await this.StakingPool.totalRewardAmount();
    console.log('====totalRewardAmount::', totalRewardAmount.toString())

    flag = 5;
    property1 = 200000; // 0.0005% (1% = 1e8, 100%=1e10)
    property2 = 300000; // 0.0008% (1% = 1e8, 100%=1e10)
    await this.Property.connect(this.customer6).proposalProperty(property1, flag, 'test-1', 'desc-1', { from: this.customer6.address })
    await this.Property.connect(this.customer7).proposalProperty(property2, flag, 'test-1', 'desc-1', { from: this.customer7.address })

    proposal1 = await this.Property.getPropertyProposalInfo(0, flag);
    proposal2 = await this.Property.getPropertyProposalInfo(1, flag);

    expect(proposal1[1]).to.be.equal(0)
    expect(proposal1[3]).to.be.equal(property1)
    expect(proposal1[4]).to.be.equal(this.customer6.address)
    expect(proposal1[5]).to.be.equal(0)

    expect(proposal2[1]).to.be.equal(0)
    expect(proposal2[3]).to.be.equal(property2)
    expect(proposal2[4]).to.be.equal(this.customer7.address)
    expect(proposal2[5]).to.be.equal(0)

    totalRewardAmount = await this.StakingPool.totalRewardAmount();
    console.log('====totalRewardAmount::', totalRewardAmount.toString())

    // voteToProperty
    await this.Vote.connect(this.customer1).voteToProperty(this.voteInfo[0], indx, flag, { from: this.customer1.address })
    await this.Vote.connect(this.customer2).voteToProperty(this.voteInfo[0], indx, flag, { from: this.customer2.address })
    await this.Vote.connect(this.customer3).voteToProperty(this.voteInfo[2], indx, flag, { from: this.customer3.address })
    await this.Vote.connect(this.customer4).voteToProperty(this.voteInfo[1], indx, flag, { from: this.customer4.address })
    await this.Vote.connect(this.customer5).voteToProperty(this.voteInfo[2], indx, flag, { from: this.customer5.address })

    // => Increase next block timestamp
    network.provider.send('evm_increaseTime', [period_8]);
    await network.provider.send('evm_mine');

    // Call updateProperty() before vote period
    await expect(
      this.Vote.connect(this.customer1).updateProperty(indx, flag, { from: this.customer1.address })
    ).to.be.revertedWith('pV: vote period yet')

    // => Increase next block timestamp
    network.provider.send('evm_increaseTime', [period_3]);
    await network.provider.send('evm_mine');

    // updateProperty
    await this.Vote.connect(this.customer1).updateProperty(indx, flag, { from: this.customer1.address })
    rewardRate = await this.Property.rewardRate()
    expect(rewardRate).to.be.equal(property1)
    console.log('====rewardRate::', rewardRate.toString())

    proposal1 = await this.Property.getPropertyProposalInfo(0, flag);
    propertyVal = proposal1[3];

    expect(proposal1[1] > 0).to.be.true
    expect(propertyVal).to.be.equal(property1)
    expect(proposal1[4]).to.be.equal(this.customer6.address)
    expect(proposal1[5]).to.be.equal(1) // approved

    const list = await this.Property.getPropertyProposalList(flag)
    expect(list.length).to.be.equal(2)
  });

  it('voteToRewardAddress', async function () {
    await this.vabToken.connect(this.deployer).transfer(this.customer1.address, getBigNumber(6000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer2.address, getBigNumber(6000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer3.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer4.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer5.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer6.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.customer7.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.studio1.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.studio2.address, getBigNumber(10000), { from: this.deployer.address });
    await this.vabToken.connect(this.deployer).transfer(this.studio3.address, getBigNumber(10000), { from: this.deployer.address });

    const stakeAmount = getBigNumber(200)
    await this.StakingPool.connect(this.customer1).stakeVAB(getBigNumber(5000), { from: this.customer1.address })
    await this.StakingPool.connect(this.customer2).stakeVAB(getBigNumber(4000), { from: this.customer2.address })
    await this.StakingPool.connect(this.customer3).stakeVAB(stakeAmount, { from: this.customer3.address })
    await this.StakingPool.connect(this.customer4).stakeVAB(stakeAmount, { from: this.customer4.address })
    await this.StakingPool.connect(this.customer5).stakeVAB(stakeAmount, { from: this.customer5.address })
    await this.StakingPool.connect(this.customer6).stakeVAB(stakeAmount, { from: this.customer6.address })
    await this.StakingPool.connect(this.customer7).stakeVAB(stakeAmount, { from: this.customer7.address })

    await this.Property.connect(this.deployer).updateAvailableVABForTesting(getBigNumber(150), { from: this.deployer.address });

    let indx = 0;

    const info = await this.StakingPool.stakeInfo(this.customer6.address);
    console.log("Customer6 StakeAmount", info[0] / getBigNumber(1));

    console.log('====t-1')
    // Create proposal
    const title = "new reward fund address"
    const desc = "here description"
    await this.Property.connect(this.customer6).proposalRewardFund(
      this.reward.address,
      title,
      desc,
      { from: this.customer6.address }
    );

    const customer1Balance = await this.vabToken.balanceOf(this.customer1.address)
    console.log("====customer1Balance::", customer1Balance.toString())


    await this.Vote.connect(this.customer2).voteToRewardAddress(
      indx, this.voteInfo[0], { from: this.customer2.address }
    );
    await this.Vote.connect(this.customer3).voteToRewardAddress(
      indx, this.voteInfo[2], { from: this.customer3.address }
    );
    await this.Vote.connect(this.customer4).voteToRewardAddress(
      indx, this.voteInfo[2], { from: this.customer4.address }
    );
    await this.Vote.connect(this.customer5).voteToRewardAddress(
      indx, this.voteInfo[2], { from: this.customer5.address }
    );
    await expect(
      this.Vote.connect(this.customer6).voteToRewardAddress(
        indx, this.voteInfo[2], { from: this.customer6.address }
      )
    ).to.be.revertedWith('vRA: self voted')

    let tx = await this.Vote.connect(this.customer1).voteToRewardAddress(
      indx, this.voteInfo[0], { from: this.customer1.address }
    );
    this.events = (await tx.wait()).events
    // console.log("====events::", this.events)
    const arg = this.events[0].args
    expect(this.customer1.address).to.be.equal(arg.voter)
    expect(this.reward.address).to.be.equal(arg.rewardAddress)
    expect(this.voteInfo[0]).to.be.equal(arg.voteInfo)

    // Call voteToRewardAddress again
    await expect(
      this.Vote.connect(this.customer2).voteToRewardAddress(
        indx, this.voteInfo[0], { from: this.customer2.address }
      )
    ).to.be.revertedWith('vRA: already voted')

    // => Change the minVoteCount from 5 ppl to 3 ppl for testing
    await this.Property.connect(this.deployer).updatePropertyForTesting(3, 18, { from: this.deployer.address })

    // setDAORewardAddress
    await expect(
      this.Vote.connect(this.customer2).setDAORewardAddress(indx, { from: this.customer2.address })
    ).to.be.revertedWith('sRA: vote period yet')

    // => Increase next block timestamp
    const defaultAgentVotePeriod = 31 * 86400; // 31 days
    network.provider.send('evm_increaseTime', [defaultAgentVotePeriod]);
    await network.provider.send('evm_mine');

    var users = [
      this.customer1,
      this.customer2,
      this.customer3,
      this.customer4,
      this.customer5,
      this.customer6,
      this.customer7
    ]

    var rewardList = [];
    var sumOfReward = getBigNumber(0);
    for (let i = 0; i < users.length; i++) {
      const balance1 = await this.StakingPool.calcRewardAmount(users[i].address);

      sumOfReward = sumOfReward.add(balance1);
      rewardList.push(balance1 / getBigNumber(1));
    }

    console.log("rewardList", rewardList);
    console.log("sumOfReward", sumOfReward / getBigNumber(1));

    for (let i = 0; i < 3; i++) {
      await this.StakingPool.connect(users[i]).stakeVAB(stakeAmount, { from: users[i].address })
    }

    var rewardList1 = [];
    var sumOfReward1 = getBigNumber(0);
    for (let i = 0; i < users.length; i++) {
      const balance1 = await this.StakingPool.calcRewardAmount(users[i].address);

      sumOfReward1 = sumOfReward1.add(balance1);
      rewardList1.push(balance1 / getBigNumber(1));
    }

    console.log("After StakeVAB rewardList", rewardList1);
    console.log("sumOfReward1", sumOfReward1 / getBigNumber(1));

    // expect(sumOfReward).to.be.equal(sumOfReward1);

    let rewardAddress = await this.Property.DAO_FUND_REWARD();
    console.log("====rewardAddress-before::", rewardAddress)
    await this.Vote.connect(this.customer2).setDAORewardAddress(indx, { from: this.customer2.address })

    rewardAddress = await this.Property.DAO_FUND_REWARD();
    console.log("====rewardAddress-after::", rewardAddress)
    // 90092844245613213346606185
    // 90091944245613213346606185
    //      900000000000000000000
    expect(rewardAddress).to.be.equal(this.reward.address)

    const item = await this.Property.getGovProposalStr(indx, 3)
    console.log("====item.title::", item)
    expect(title).to.be.equal(item[0])
    expect(desc).to.be.equal(item[1])

    // ===== Withdraw all fund from stakingPool to rewardAddres passed in vote
    const totalRewardAmount = await this.StakingPool.totalRewardAmount()
    const curStakPoolBalance = await this.vabToken.balanceOf(this.StakingPool.address)
    const curEdgePoolBalance = await this.vabToken.balanceOf(this.Ownablee.address)
    const curStudioPoolBalance = await this.vabToken.balanceOf(this.VabbleDAO.address)
    const totalMigrationVAB = await this.StakingPool.totalMigrationVAB()

    console.log("====totalRewardAmount", totalRewardAmount / getBigNumber(1))
    console.log("====totalMigrationVAB", totalMigrationVAB / getBigNumber(1))
    // expect(totalMigrationVAB).to.be.equal(totalRewardAmount.sub(sumOfReward));



    if (GNOSIS_FLAG) {
      // => Increase next block timestamp for only testing
      let encodedCallData = this.StakingPool.interface.encodeFunctionData("withdrawAllFund", []);
      const { signatureBytes, tx } = await generateSignature(this.GnosisSafe, encodedCallData, this.StakingPool.address, [this.signer1, this.signer2]);
      await executeGnosisSafeTransaction(this.GnosisSafe, this.signer2, signatureBytes, tx);
    } else {
      await this.StakingPool.connect(this.auditor).withdrawAllFund({ from: this.auditor.address })
    }

    const aStakPoolBalance = await this.vabToken.balanceOf(this.StakingPool.address)
    const aEdgePoolBalance = await this.vabToken.balanceOf(this.Ownablee.address)
    const aStudioPoolBalance = await this.vabToken.balanceOf(this.VabbleDAO.address)

    console.log("====stakingPool", curStakPoolBalance.toString(), aStakPoolBalance.toString())
    console.log("====edgePool", curEdgePoolBalance.toString(), aEdgePoolBalance.toString())
    console.log("====studioPool", curStudioPoolBalance.toString(), aStudioPoolBalance.toString())

    expect(aStakPoolBalance).to.be.equal(curStakPoolBalance.sub(totalMigrationVAB))
    expect(aEdgePoolBalance).to.be.equal(0)
    expect(aStudioPoolBalance).to.be.equal(0)

    newAddrBalance = await this.vabToken.balanceOf(rewardAddress)
    expect(newAddrBalance).to.be.equal(totalMigrationVAB.add(curEdgePoolBalance).add(curStudioPoolBalance))



    var balanceList1 = [];
    var sumOfBalance1 = getBigNumber(0);
    for (let i = 0; i < users.length; i++) {
      const balance1 = await this.vabToken.balanceOf(users[i].address);

      sumOfBalance1 = sumOfBalance1.add(balance1);
      balanceList1.push(balance1 / getBigNumber(1));
    }

    console.log("Before unstakeVAB", balanceList1);

    var rewardList1 = [];
    for (let i = 0; i < users.length; i++) {
      const balance1 = await this.StakingPool.calcRewardAmount(users[i].address);
      rewardList1.push(balance1 / getBigNumber(1));
      if (balance1 == 0)
        continue;

      await this.StakingPool.connect(users[i]).withdrawReward(0, { from: users[i].address });
    }

    console.log("rewardList1", rewardList1);

    var rewardList2 = [];
    for (let i = 0; i < users.length; i++) {
      const balance1 = await this.StakingPool.calcRewardAmount(users[i].address);
      rewardList2.push(balance1 / getBigNumber(1));
      expect(balance1).to.be.equal(0);
    }

    console.log("After withdrawReward", rewardList2);


    var balanceList2 = [];
    var sumOfBalance2 = getBigNumber(0);

    for (let i = 0; i < users.length; i++) {
      const balance1 = await this.vabToken.balanceOf(users[i].address);

      sumOfBalance2 = sumOfBalance2.add(balance1);
      balanceList2.push(balance1 / getBigNumber(1));
    }

    console.log("After withdraw Reward", balanceList2);
    expect(sumOfBalance2.sub(sumOfBalance1)).to.be.equal(totalRewardAmount.sub(totalMigrationVAB));

    // await this.StakingPool.connect(this.deployer).withdrawToOwner(this.deployer.address, {from: this.deployer.address});

    // const balanceOfStakingPool = await this.vabToken.balanceOf(this.StakingPool.address);
    // const balanceOfEdgePool = await this.vabToken.balanceOf(this.Ownablee.address);
    // const balanceOfVabbleDAO = await this.vabToken.balanceOf(this.VabbleDAO.address);

    // expect(balanceOfStakingPool).to.be.equal(0);
    // expect(balanceOfEdgePool).to.be.equal(0);
    // expect(balanceOfVabbleDAO).to.be.equal(0);    
  });

});
