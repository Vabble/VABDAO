const { expect, util } = require('chai');
const { ethers, network } = require('hardhat');
const { BigNumber } = require('ethers');
const { utils } = require('ethers');
const ERC20 = require('../data/ERC20.json');
const { CONFIG, getByteFilmUpdate, getFinalFilm, getBigNumber, getVoteData, getProposalFilm } = require('../scripts/utils');
  
describe('VabbleDAO', function () {
  before(async function () {
    this.VabbleDAOFactory = await ethers.getContractFactory('VabbleDAO');
    this.VoteFactory = await ethers.getContractFactory('Vote');
    this.UniHelperFactory = await ethers.getContractFactory('UniHelper');
    this.StakingPoolFactory = await ethers.getContractFactory('StakingPool');
    this.PropertyFactory = await ethers.getContractFactory('Property');
    this.OwnableFactory = await ethers.getContractFactory('Ownablee');

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

    expect(await this.ownableContract.auditor()).to.be.equal(this.auditor.address);
        
    // Auditor add studio1, studio3 in the studio whitelist, not studio2
    const studioList = [this.studio1.address, this.studio3.address]
    await this.ownableContract.connect(this.auditor).addStudio(studioList, {from: this.auditor.address})  
    // ====== VAB
    // Transfering VAB token to user1, 2, 3
    await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(500000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer2.address, getBigNumber(500000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer3.address, getBigNumber(500000), {from: this.auditor.address});
    // Transfering VAB token to studio1, 2, 3
    await this.vabToken.connect(this.auditor).transfer(this.studio1.address, getBigNumber(500000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio2.address, getBigNumber(500000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio3.address, getBigNumber(500000), {from: this.auditor.address});

    // Approve to transfer VAB token for each user, studio to DAO, StakingPool
    await this.vabToken.connect(this.customer1).approve(this.DAOContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.DAOContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.DAOContract.address, getBigNumber(100000000));   

    await this.vabToken.connect(this.customer1).approve(this.stakingContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.stakingContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.stakingContract.address, getBigNumber(100000000));

    await this.vabToken.connect(this.studio1).approve(this.DAOContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.DAOContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.DAOContract.address, getBigNumber(100000000));

    // ====== EXM
    // Transfering EXM token to user1, 2, 3
    await this.EXM.connect(this.auditor).transfer(this.customer1.address, getBigNumber(5000), {from: this.auditor.address});
    await this.EXM.connect(this.auditor).transfer(this.customer2.address, getBigNumber(5000), {from: this.auditor.address});
    await this.EXM.connect(this.auditor).transfer(this.customer3.address, getBigNumber(5000), {from: this.auditor.address});
    // Transfering EXM token to studio1, 2, 3
    await this.EXM.connect(this.auditor).transfer(this.studio1.address, getBigNumber(5000), {from: this.auditor.address});
    await this.EXM.connect(this.auditor).transfer(this.studio2.address, getBigNumber(5000), {from: this.auditor.address});
    await this.EXM.connect(this.auditor).transfer(this.studio3.address, getBigNumber(5000), {from: this.auditor.address});

    // Approve to transfer EXM token for each user, studio to DAO, StakingPool
    await this.EXM.connect(this.customer1).approve(this.DAOContract.address, getBigNumber(100000));
    await this.EXM.connect(this.customer2).approve(this.DAOContract.address, getBigNumber(100000));
    await this.EXM.connect(this.customer3).approve(this.DAOContract.address, getBigNumber(100000));   

    await this.EXM.connect(this.customer1).approve(this.stakingContract.address, getBigNumber(100000));
    await this.EXM.connect(this.customer2).approve(this.stakingContract.address, getBigNumber(100000));
    await this.EXM.connect(this.customer3).approve(this.stakingContract.address, getBigNumber(100000));

    await this.EXM.connect(this.studio1).approve(this.DAOContract.address, getBigNumber(100000));
    await this.EXM.connect(this.studio2).approve(this.DAOContract.address, getBigNumber(100000));
    await this.EXM.connect(this.studio3).approve(this.DAOContract.address, getBigNumber(100000));

    // Initialize StakingPool
    await this.stakingContract.connect(this.auditor).initializePool(
      this.DAOContract.address,
      this.voteContract.address,
      this.propertyContract.address,
      {from: this.auditor.address}
    )  
    // Staking VAB token
    await this.stakingContract.connect(this.customer1).stakeToken(getBigNumber(100), {from: this.customer1.address})
    await this.stakingContract.connect(this.customer2).stakeToken(getBigNumber(150), {from: this.customer2.address})
    await this.stakingContract.connect(this.customer3).stakeToken(getBigNumber(300), {from: this.customer3.address})
    expect(await this.stakingContract.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(100))
    expect(await this.stakingContract.getStakeAmount(this.customer2.address)).to.be.equal(getBigNumber(150))
    expect(await this.stakingContract.getStakeAmount(this.customer3.address)).to.be.equal(getBigNumber(300))
    
    this.rentPrices = [getBigNumber(100), getBigNumber(200), getBigNumber(300), getBigNumber(400)];
    this.fundPeriods = [getBigNumber(20 * 86400, 0), getBigNumber(30 * 86400, 0), getBigNumber(60 * 86400, 0), getBigNumber(10 * 86400, 0)];
    this.filmPropsoal = [];
    this.events = [];
  });

describe('VabbleDAO-test-1', function () {
  it('Should prospose films by studio', async function () {      
    const onlyAllowVABs = [true, true, false, false];
    const raiseAmounts = [getBigNumber(0), getBigNumber(0), getBigNumber(3000, 6), getBigNumber(3000, 6)];
    const film_1 = [this.rentPrices[0], raiseAmounts[0], this.fundPeriods[0], onlyAllowVABs[0]]
    const film_2 = [this.rentPrices[1], raiseAmounts[1], this.fundPeriods[1], onlyAllowVABs[1]]
    const film_3 = [this.rentPrices[2], raiseAmounts[2], this.fundPeriods[2], onlyAllowVABs[2]]
    const film_4 = [this.rentPrices[3], raiseAmounts[3], this.fundPeriods[3], onlyAllowVABs[3]]
    this.filmPropsoal = [getProposalFilm(film_1), getProposalFilm(film_2), getProposalFilm(film_3), getProposalFilm(film_4)]
    // console.log("====filmProposal", this.filmPropsoal)
    const studioBalance = await this.vabToken.balanceOf(this.studio1.address)
    // console.log('====studioBalance::', studioBalance.toString());
    // Only Studio1 can propose films because auditor added to studioList
    let tx = await this.DAOContract.connect(this.studio1).createProposalFilms(this.filmPropsoal, false, {from: this.studio1.address})   
    this.events = (await tx.wait()).events;
    expect(this.events[6].args[1]).to.be.equal(this.studio1.address)
    const proposalIds_1 = await this.DAOContract.getFilmIds(1);
    expect(proposalIds_1.length).to.be.equal(this.filmPropsoal.length)

    tx = await this.DAOContract.connect(this.studio1).createProposalFilms(this.filmPropsoal, false, {from: this.studio1.address})   
    this.events = (await tx.wait()).events;
    const proposalIds_2 = await this.DAOContract.getFilmIds(1);
    expect(proposalIds_2.length).to.be.equal(this.filmPropsoal.length + proposalIds_1.length)

    // Studio2 can not propose films because studio2 is not studio
    await expect(
      this.DAOContract.connect(this.studio2).createProposalFilms(this.filmPropsoal, true, {from: this.studio2.address})
    ).to.be.revertedWith('caller is not the studio');

    // Get A proposal film information with id
    const proposalFilm = await this.DAOContract.getFilmById(proposalIds_1[0])
    expect(proposalFilm.studioPayees_).to.have.lengthOf(0)
    expect(proposalFilm.sharePercents_).to.have.lengthOf(0)
    expect(proposalFilm.rentPrice_).to.be.equal(this.rentPrices[0])
    expect(proposalFilm.raiseAmount_).to.be.equal(raiseAmounts[0])
    expect(proposalFilm.fundPeriod_).to.be.equal(this.fundPeriods[0])
    expect(proposalFilm.fundStart_).to.be.equal(0)
    expect(proposalFilm.studio_).to.be.equal(this.studio1.address)
    expect(proposalFilm.onlyAllowVAB_).to.be.equal(onlyAllowVABs[0])
    expect(proposalFilm.status_).to.be.equal(0)

    // Update actors and percents by only Studio
    const updateData = [
      getByteFilmUpdate(proposalIds_1[0]), 
      getByteFilmUpdate(proposalIds_1[1]), 
      getByteFilmUpdate(proposalIds_1[2])
    ]
    await this.DAOContract.connect(this.studio3).updateMultiFilms(updateData, {from: this.studio3.address})
    const Ids_0 = await this.DAOContract.getFilmIds(2); // 0 ids
    expect(Ids_0.length).to.be.equal(0) // 0 because studio3 didn't submit proposal

    // console.log("====updateData", updateData)
    const up_tx = await this.DAOContract.connect(this.studio1).updateMultiFilms(updateData, {from: this.studio1.address})
    this.events = (await up_tx.wait()).events    
    
    const Ids_1 = await this.DAOContract.getFilmIds(2);//again getting after update = 3 ids
    // console.log('=====events::', this.events)
    expect(this.events[0].args[1]).to.be.equal(this.studio1.address)
    expect(Ids_1.length).to.be.equal(updateData.length)
  });  
})  

describe('VabbleDAO-test-2', function () {
  it('Should deposit and withdraw by customer', async function () {
    const customer1V = await this.vabToken.balanceOf(this.customer1.address)
    
    // // User balance is 1999800 and transfer amount is 2000000. Insufficient amount!
    // await expect(
    //   this.DAOContract.connect(this.customer1).depositVAB(getBigNumber(1000000), {from: this.customer1.address})
    // ).to.be.revertedWith('VabbleDAO::transferFrom: transferFrom failed');

    // Event - depositVAB
    await expect(
      this.DAOContract.connect(this.customer1).depositVAB(getBigNumber(100), {from: this.customer1.address})
    )
    .to.emit(this.DAOContract, 'VABDeposited')
    .withArgs(this.customer1.address, getBigNumber(100));    

    await this.DAOContract.connect(this.customer2).depositVAB(getBigNumber(200));
    await this.DAOContract.connect(this.customer3).depositVAB(getBigNumber(300));
  
    // Check user balance(amount) after deposit
    let user1Amount = await this.DAOContract.userRentInfo(this.customer1.address);
    expect(user1Amount.vabAmount).to.be.equal(getBigNumber(100))
    expect(user1Amount.withdrawAmount).to.be.equal(getBigNumber(0))

    // Event - WithdrawPending
    await expect(
      this.DAOContract.connect(this.customer1).pendingWithdraw(getBigNumber(50), {from: this.customer1.address})
    )
    .to.emit(this.DAOContract, 'WithdrawPending')
    .withArgs(this.customer1.address, this.vabToken.address, getBigNumber(50));  

    await expect(
      this.DAOContract.connect(this.customer1).pendingWithdraw(getBigNumber(150), {from: this.customer1.address})
    ).to.be.revertedWith('pendingWithdraw: Insufficient VAB amount');
    
    // Check withdraw amount after send withraw request
    user1Amount = await this.DAOContract.userRentInfo(this.customer1.address);
    expect(user1Amount.withdrawAmount).to.be.equal(getBigNumber(50))
  });
})

describe('VabbleDAO-test-3', function () {
  it('approve_listing logic with only VAB', async function () {
    const finalData_1 = [getFinalFilm("0xcbaa16FDE7799A68CB468a81e45CbCd557B8AfaA", [1, 2, 3])]    
    // console.log("====finalData_1", finalData_1)

    const raiseAmounts = [getBigNumber(0), getBigNumber(0), getBigNumber(3000, 6), getBigNumber(3000, 6)];
    const onlyAllowVABs = [true, true, false, false];
    const film_1 = [this.rentPrices[0], raiseAmounts[0], this.fundPeriods[0], onlyAllowVABs[0]]
    const film_2 = [this.rentPrices[1], raiseAmounts[1], this.fundPeriods[1], onlyAllowVABs[1]]
    const film_3 = [this.rentPrices[2], raiseAmounts[2], this.fundPeriods[2], onlyAllowVABs[2]]
    const film_4 = [this.rentPrices[3], raiseAmounts[3], this.fundPeriods[3], onlyAllowVABs[3]]
    this.filmPropsoal = [getProposalFilm(film_1), getProposalFilm(film_2), getProposalFilm(film_3), getProposalFilm(film_4)]
    
    // 1. Create proposal for four films by studio
    await this.DAOContract.connect(this.studio1).createProposalFilms(this.filmPropsoal, false, {from: this.studio1.address})
    // 2. Deposit to contract(VAB amount : 100, 200, 300)
    await this.DAOContract.connect(this.customer1).depositVAB(getBigNumber(100), {from: this.customer1.address})
    await this.DAOContract.connect(this.customer2).depositVAB(getBigNumber(200), {from: this.customer2.address})
    await this.DAOContract.connect(this.customer3).depositVAB(getBigNumber(300), {from: this.customer3.address})
    // 3. Auditor should initialize when vote contract deployed
    await this.voteContract.connect(this.auditor).initializeVote(
      this.DAOContract.address, 
      this.stakingContract.address, 
      this.propertyContract.address,
      {from: this.auditor.address}
    );
    expect(await this.voteContract.isInitialized()).to.be.true

    // 4. films approved by auditor
    // 4-1. initialize vote contract
    await expect(
      this.voteContract.connect(this.auditor).initializeVote(
        this.DAOContract.address, 
        this.stakingContract.address, 
        this.propertyContract.address,
        {from: this.auditor.address}
      )
    ).to.be.revertedWith('initializeVote: Already initialized vote');
    
    // 4-3. Vote to proposal films from customer1, 2, 3
    const proposalIds = await this.DAOContract.getFilmIds(1); // 1, 2, 3, 4
    const voteInfos = [1, 1, 2, 3];
    const voteData = getVoteData(proposalIds, voteInfos)
    // console.log("====voteData", voteData)
    //=> In order to call voteToFilms(), first should pass 4-1, 4-2
    await this.voteContract.connect(this.customer1).voteToFilms(voteData, {from: this.customer1.address}) //1,1,2,3
    await this.voteContract.connect(this.customer2).voteToFilms(voteData, {from: this.customer2.address}) //1,1,2,3
    await this.voteContract.connect(this.customer3).voteToFilms(voteData, {from: this.customer3.address}) //1,1,2,3

    // => Increase next block timestamp for only testing
    const period = 10 * 24 * 3600; // filmVotePeriod = 10 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');
    
    // => Change the minVoteCount from 5 ppl to 3 ppl for testing
    await this.propertyContract.connect(this.auditor).updatePropertyForTesting(3, 18, {from: this.auditor.address})

    // 4-4. Approve two films by calling the approveFilms() from Auditor
    const approveData = [proposalIds[0], proposalIds[1], proposalIds[2]]
    await this.voteContract.approveFilms(approveData);// filmId = 1, 2 ,3
    const ids = await this.voteContract.getApprovedFilmIds() // 1, 2
    expect(ids.length).to.be.equal(approveData.length-1)
    
    // 5 Withdraw request(40 VAB) from customer1, 2, 3
    await this.DAOContract.connect(this.customer1).pendingWithdraw(getBigNumber(40), {from: this.customer1.address});
    await this.DAOContract.connect(this.customer2).pendingWithdraw(getBigNumber(40), {from: this.customer2.address});
    await this.DAOContract.connect(this.customer3).pendingWithdraw(getBigNumber(40), {from: this.customer3.address});

    // 6. Auditor submit three audit actions(for customer1) with watched percent(20%, 15%, 30%) to VabbleDAO contract
    // only two film 1,2 approved in 4-4 so film3 watch(30%) ignored   
    const finalData = [getFinalFilm(this.customer1.address, approveData)]    
    let tx = await this.DAOContract.setFinalFilms(finalData);
    this.events = (await tx.wait()).events
    // console.log('======events::', this.events[0].args)
    expect(this.events[0].args.filmIds[0]).to.be.equal(proposalIds[0]) // id = 1
    expect(this.events[0].args.filmIds[1]).to.be.equal(proposalIds[1]) // id = 2    

    // 6-1 Approve pending-withdraw requests for customer1 and Deny for customer3 by Auditor, not customer2
    await this.DAOContract.approvePendingWithdraw([this.customer1.address])
    await this.DAOContract.denyPendingWithdraw([this.customer3.address])

    // 7. Check remain customer1,2,3 balance(amount, withdrawAmount) after submit audit actions
    let user1Amount = await this.DAOContract.userRentInfo(this.customer1.address);
    let user2Amount = await this.DAOContract.userRentInfo(this.customer2.address);
    let user3Amount = await this.DAOContract.userRentInfo(this.customer3.address);
    // For customer1, film1 :   100(user balance) - 20(watched %) * 100(rentPrice) = 80(remain amount)
    // For customer1, film2 :   80(remain amount) - 15(watched %) * 200(rentPrice) = 50(remain amount)
    // For customer1, withdraw: 50(remain amount) - 40(withdraw) = 10(remain amount)    
    
    expect(user1Amount.vabAmount).to.be.equal(getBigNumber(10));
    expect(user1Amount.withdrawAmount).to.be.equal(getBigNumber(0))
    expect(user2Amount.vabAmount).to.be.equal(getBigNumber(200)); // same deposit amount as auditor didn't submit actions
    expect(user2Amount.withdrawAmount).to.be.equal(getBigNumber(40)) // same withdraw amount as auditor didn't approve
    expect(user3Amount.vabAmount).to.be.equal(getBigNumber(300)); // same deposit amount as auditor didn't submit actions
    expect(user3Amount.withdrawAmount).to.be.equal(getBigNumber(0)) // 0 as auditor deny pending withdraw request
  });
})

describe('VabbleDAO-test-4', function () {
  it('approve_funding logic with only VAB', async function () {
    const raiseAmounts = [getBigNumber(150, 6), getBigNumber(1000, 6), getBigNumber(3000, 6), getBigNumber(3000, 6)];
    const onlyAllowVABs = [true, true, false, false];
    const film_1 = [this.rentPrices[0], raiseAmounts[0], this.fundPeriods[0], onlyAllowVABs[0]]
    const film_2 = [this.rentPrices[1], raiseAmounts[1], this.fundPeriods[1], onlyAllowVABs[1]]
    const film_3 = [this.rentPrices[2], raiseAmounts[2], this.fundPeriods[2], onlyAllowVABs[2]]
    const film_4 = [this.rentPrices[3], raiseAmounts[3], this.fundPeriods[3], onlyAllowVABs[3]]
    this.filmPropsoal = [getProposalFilm(film_1), getProposalFilm(film_2), getProposalFilm(film_3), getProposalFilm(film_4)]
    
    // 1. Create proposal for four films by studio
    await this.DAOContract.connect(this.studio1).createProposalFilms(this.filmPropsoal, false, {from: this.studio1.address})
    // 2. Deposit to contract(VAB amount : 100, 200, 300)
    await this.DAOContract.connect(this.customer1).depositVAB(getBigNumber(100), {from: this.customer1.address})
    await this.DAOContract.connect(this.customer2).depositVAB(getBigNumber(200), {from: this.customer2.address})
    await this.DAOContract.connect(this.customer3).depositVAB(getBigNumber(300), {from: this.customer3.address})
    // 3. Auditor should initialize when vote contract deployed
    await this.voteContract.connect(this.auditor).initializeVote(
      this.DAOContract.address, 
      this.stakingContract.address, 
      this.propertyContract.address,
      {from: this.auditor.address}
    );

    // 4. films approved by auditor        
    // 4-2. Vote to proposal films(1,2,3,4) from customer1, 2, 3
    const proposalIds = await this.DAOContract.getFilmIds(1); // 1, 2, 3, 4
    const voteInfos = [1, 1, 2, 3];
    const voteData = getVoteData(proposalIds, voteInfos)
    //=> In order to call voteToFilms(), first should pass 4-1, 4-2
    await this.voteContract.connect(this.customer1).voteToFilms(voteData, {from: this.customer1.address}) //1,1,2,3
    await this.voteContract.connect(this.customer2).voteToFilms(voteData, {from: this.customer2.address}) //1,1,2,3
    await this.voteContract.connect(this.customer3).voteToFilms(voteData, {from: this.customer3.address}) //1,1,2,3

    // => Increase next block timestamp for only testing
    const period = 10 * 24 * 3600; // filmVotePeriod = 10 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    // => Change the minVoteCount from 5 ppl to 3 ppl for testing
    await this.propertyContract.connect(this.auditor).updatePropertyForTesting(3, 18, {from: this.auditor.address})

    // 4-4. Approve two films by calling the approveFilms() from Auditor
    const approveData = [proposalIds[0], proposalIds[1], proposalIds[2]]
    await this.voteContract.approveFilms(approveData);// filmId = 1, 2 ,3
    const ids = await this.voteContract.getApprovedFilmIds() // 1, 2 : APPROVED_FUNDING
    expect(ids.length).to.be.equal(approveData.length-1)

    // 5. Deposit to film 
    // 5-1. Id(1) from customer1
    const customer1_0 = await this.vabToken.balanceOf(this.customer1.address)

    // Get current deposited amount to film
    const dAmount = await this.DAOContract.getUserFundAmountPerFilm(this.customer1.address, ids[0]);
    console.log('=====test-1', dAmount.toString())

    const depositAmount = getBigNumber(100000)
    let tx = await this.DAOContract.connect(this.customer1).depositToFilm(
      ids[0], this.vabToken.address, depositAmount, {from: this.customer1.address}
    )
    this.events = (await tx.wait()).events
    let args = this.events[2].args
    expect(args.customer).to.be.equal(this.customer1.address)
    expect(args.token).to.be.equal(this.vabToken.address)
    expect(args.amount).to.be.equal(depositAmount)
    expect(args.filmId).to.be.equal(ids[0])

    const customer1_1 = await this.vabToken.balanceOf(this.customer1.address)
    expect(BigNumber.from(customer1_0.toString()).sub(BigNumber.from(customer1_1.toString()))).to.be.equal(depositAmount)
    
    // 5-2. Id(1) from customer2
    tx = await this.DAOContract.connect(this.customer2).depositToFilm(
      ids[0], this.vabToken.address, depositAmount, {from: this.customer2.address}
    )
    const raiseAmount_1 = await this.DAOContract.getRaisedAmountPerFilm(ids[0])
    console.log("====raiseAmount_1::", raiseAmount_1.toString()) // 499248873

    // 6. Deposit to film Id(3) that not approved
    await expect(
      this.DAOContract.connect(this.customer3).depositToFilm(
        proposalIds[2], this.vabToken.address, depositAmount, {from: this.customer3.address}
      )
    ).to.be.revertedWith('depositToFilm: filmId not approved for funding');

    // 7. Deposit to film Id(1) after 40 days, fundPeriod is 20 days for film-1
    // => Increase next block timestamp
    const fundPeriod = 40 * 24 * 3600; // 40 days
    network.provider.send('evm_increaseTime', [fundPeriod]);
    await network.provider.send('evm_mine'); 

    await expect(
      this.DAOContract.connect(this.customer2).depositToFilm(
        proposalIds[1], this.vabToken.address, depositAmount, {from: this.customer2.address}
      )
    ).to.be.revertedWith('depositToFilm: passed funding period');
    
    // 8. fundProcess
    // 8-1. Get total reward amount in the StakingPool
    const totalRewardAmount_0 = await this.stakingContract.totalRewardAmount()
    // console.log("====totalRewardAmount_0::", totalRewardAmount_0.toString())
    const raiseAmount_2 = await this.DAOContract.getRaisedAmountPerFilm(ids[0])
    if(raiseAmount_2 < raiseAmounts[0]) {
      await this.DAOContract.connect(this.customer2).depositToFilm(
        ids[0], this.vabToken.address, depositAmount, {from: this.customer1.address}
      )
    }
    console.log("====raiseAmount_2::", raiseAmount_2.toString()) // 106855775
    
    // 8-2. Call the fundProcess() for film-1
    tx = await this.DAOContract.connect(this.studio1).fundProcess(ids[0], {from: this.studio1.address})
    this.events = (await tx.wait()).events
    // console.log("===events::", this.events)
    args = this.events[4].args
    expect(args.filmId).to.be.equal(ids[0])

    // 8-3. Check changed reward amount in the StakingPool
    const totalRewardAmount_1 = await this.stakingContract.totalRewardAmount()
    console.log("====totalRewardAmount_1::", totalRewardAmount_1.toString())
  });
})

describe('VabbleDAO-test-5', function () {
  it('approve_funding logic with other tokens(EXM)', async function () {    
    const raiseAmounts = [getBigNumber(5000, 6), getBigNumber(20000, 6), getBigNumber(30000, 6), getBigNumber(30000, 6)];
    const onlyAllowVABs = [false, false, false, true];
    const film_1 = [this.rentPrices[0], raiseAmounts[0], this.fundPeriods[0], onlyAllowVABs[0]]
    const film_2 = [this.rentPrices[1], raiseAmounts[1], this.fundPeriods[1], onlyAllowVABs[1]]
    const film_3 = [this.rentPrices[2], raiseAmounts[2], this.fundPeriods[2], onlyAllowVABs[2]]
    const film_4 = [this.rentPrices[3], raiseAmounts[3], this.fundPeriods[3], onlyAllowVABs[3]]
    this.filmPropsoal = [getProposalFilm(film_1), getProposalFilm(film_2), getProposalFilm(film_3), getProposalFilm(film_4)]
    
    // 1. Create proposal for four films by studio
    await this.DAOContract.connect(this.studio1).createProposalFilms(this.filmPropsoal, false, {from: this.studio1.address})
    
    // 3. Auditor should initialize when vote contract deployed
    await this.voteContract.connect(this.auditor).initializeVote(
      this.DAOContract.address, 
      this.stakingContract.address, 
      this.propertyContract.address,
      {from: this.auditor.address}
    );

    // 4. films approved by auditor        
    // 4-2. Vote to proposal films(1,2,3,4) from customer1, 2, 3
    const proposalIds = await this.DAOContract.getFilmIds(1); // 1, 2, 3, 4
    const voteInfos = [1, 1, 2, 3];
    const voteData = getVoteData(proposalIds, voteInfos)
    await this.voteContract.connect(this.customer1).voteToFilms(voteData, {from: this.customer1.address}) //1,1,2,3
    await this.voteContract.connect(this.customer2).voteToFilms(voteData, {from: this.customer2.address}) //1,1,2,3
    await this.voteContract.connect(this.customer3).voteToFilms(voteData, {from: this.customer3.address}) //1,1,2,3

    // => Increase next block timestamp for only testing
    const period = 10 * 24 * 3600; // filmVotePeriod = 10 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    // => Change the minVoteCount from 5 ppl to 3 ppl for testing
    await this.propertyContract.connect(this.auditor).updatePropertyForTesting(3, 18, {from: this.auditor.address})

    // 4-4. Approve two films by calling the approveFilms() from Auditor
    const approveData = [proposalIds[0], proposalIds[1], proposalIds[2], proposalIds[3]]
    await this.voteContract.approveFilms(approveData);// filmId = 1, 2 ,3, 4
    const ids = await this.voteContract.getApprovedFilmIds() // 1, 2 : APPROVED_FUNDING
    expect(ids.length).to.be.equal(approveData.length-2)


    // 5. Deposit to film 
    // 5-1. Id(1) from customer1
    const customer1_0 = await this.EXM.balanceOf(this.customer1.address)
    const depositAmount = getBigNumber(2000) //30 090270812437311936 600 
    await this.DAOContract.connect(this.customer1).depositToFilm(
      ids[0], this.EXM.address, depositAmount, {from: this.customer1.address}
    )

    const raiseAmount_0 = await this.DAOContract.getRaisedAmountPerFilm(ids[0])    
    console.log("====raiseAmount_0::", raiseAmount_0.toString())  

    const customer1_1 = await this.EXM.balanceOf(this.customer1.address) 
    console.log("====customer1_1::", customer1_0.toString(), customer1_1.toString())  
    expect(BigNumber.from(customer1_0.toString()).sub(BigNumber.from(customer1_1.toString()))).to.be.equal(depositAmount)
    
    // 5-2. Id(1) from customer2
    tx = await this.DAOContract.connect(this.customer2).depositToFilm(
      ids[0], this.EXM.address, depositAmount, {from: this.customer2.address}
    )
    const raiseAmount_1 = await this.DAOContract.getRaisedAmountPerFilm(ids[0])  
    console.log("====raiseAmount_1::", raiseAmount_1.toString())  

    // => Increase next block timestamp
    const fundPeriod = 40 * 24 * 3600; // 40 days
    network.provider.send('evm_increaseTime', [fundPeriod]);
    await network.provider.send('evm_mine'); 

    // 8. fundProcess
    // 8-1. Get total reward amount in the StakingPool
    const totalRewardAmount_0 = await this.stakingContract.totalRewardAmount()  
    console.log("====totalRewardAmount_0::", totalRewardAmount_0.toString())  
    

    // 8-2. Call the fundProcess() for film-1
    tx = await this.DAOContract.connect(this.studio1).fundProcess(ids[0], {from: this.studio1.address})
    this.events = (await tx.wait()).events
    // console.log("====events::", this.events)  
    args = this.events[13].args
    expect(args.filmId).to.be.equal(ids[0])

    // 8-3. Check changed reward amount in the StakingPool
    const totalRewardAmount_1 = await this.stakingContract.totalRewardAmount()
    console.log("====totalRewardAmount_1::", totalRewardAmount_1.toString())
  });
})
});
