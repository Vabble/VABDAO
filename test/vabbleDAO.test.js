const { expect, util } = require('chai');
const { ethers, network } = require('hardhat');
const { utils } = require('ethers');
const ERC20 = require('../scripts/ERC20.json');
const { CONFIG, getByteFilmUpdate, getFinalFilm, getBigNumber, getVoteData, getProposalFilm } = require('../scripts/utils');
  
describe('VabbleDAO', function () {
  before(async function () {
    this.VabbleDAOFactory = await ethers.getContractFactory('VabbleDAO');
    this.VoteFactory = await ethers.getContractFactory('Vote');
    this.UniHelperFactory = await ethers.getContractFactory('UniHelper');
    this.StakingPoolFactory = await ethers.getContractFactory('StakingPool');
    this.BoardFactory = await ethers.getContractFactory('FilmBoard');

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
    this.vabToken = new ethers.Contract(CONFIG.vabToken, JSON.stringify(ERC20), ethers.provider);

    this.voteContract = await (await this.VoteFactory.deploy()).deployed();

    this.uniHelperContract = await (await this.UniHelperFactory.deploy(
      CONFIG.uniswap.factory, CONFIG.uniswap.router
    )).deployed();

    this.stakingContract = await (await this.StakingPoolFactory.deploy(
      CONFIG.vabToken, this.voteContract.address
    )).deployed(); 
    
    this.DAOContract = await (
      await this.VabbleDAOFactory.deploy(
        CONFIG.daoFeeAddress,
        CONFIG.vabToken,   
        this.voteContract.address,
        this.stakingContract.address,
        this.uniHelperContract.address,
        CONFIG.usdcAdress 
      )
    ).deployed();   

    this.BoardContract = await (
      await this.BoardFactory.deploy(
        CONFIG.vabToken,   
        this.DAOContract.address,
        this.voteContract.address,
        this.stakingContract.address,
        this.uniHelperContract.address,
        CONFIG.usdcAdress 
      )
    ).deployed(); 

    expect(await this.DAOContract.auditor()).to.be.equal(this.auditor.address);
        
    // Auditor add studio1, studio3 in the studio whitelist, not studio2
    await expect(
      this.DAOContract.addStudio(this.studio1.address)
    ).to.emit(this.DAOContract, 'StudioAdded').withArgs(this.auditor.address, this.studio1.address);    
    await this.DAOContract.connect(this.auditor).addStudio(this.studio3.address, {from: this.auditor.address})    

    // Transfering VAB token to user1, 2, 3
    await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(1000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer2.address, getBigNumber(1000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer3.address, getBigNumber(1000), {from: this.auditor.address});
    // Transfering VAB token to studio1, 2, 3
    await this.vabToken.connect(this.auditor).transfer(this.studio1.address, getBigNumber(1000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio2.address, getBigNumber(1000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio3.address, getBigNumber(1000000), {from: this.auditor.address});

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
    
    this.rentPrices = [getBigNumber(100), getBigNumber(200), getBigNumber(300), getBigNumber(400)];
    this.raiseAmounts = [getBigNumber(0), getBigNumber(0), getBigNumber(30000), getBigNumber(30000)];
    this.fundPeriods = [getBigNumber(30 * 86400, 0), getBigNumber(30 * 86400, 0), getBigNumber(60 * 86400, 0), getBigNumber(10 * 86400, 0)];
    this.onlyAllowVABs = [true, true, false, false];
    const film_1 = [this.rentPrices[0], this.raiseAmounts[0], this.fundPeriods[0], this.onlyAllowVABs[0]]
    const film_2 = [this.rentPrices[1], this.raiseAmounts[1], this.fundPeriods[1], this.onlyAllowVABs[1]]
    const film_3 = [this.rentPrices[2], this.raiseAmounts[2], this.fundPeriods[2], this.onlyAllowVABs[2]]
    const film_4 = [this.rentPrices[3], this.raiseAmounts[3], this.fundPeriods[3], this.onlyAllowVABs[3]]

    this.filmPropsoal = [getProposalFilm(film_1), getProposalFilm(film_2), getProposalFilm(film_3), getProposalFilm(film_4)]
    this.events = [];
  });

  describe('Films functions - 1', function () {
    it('Should prospose films by studio', async function () {      
      
      const studioBalance = await this.vabToken.balanceOf(this.studio1.address)
      // console.log('====studioBalance::', studioBalance.toString());
      // Only Studio1 can propose films because auditor added to studioList
      let tx = await this.DAOContract.connect(this.studio1).createProposalFilms(this.filmPropsoal, false, {from: this.studio1.address})   
      this.events = (await tx.wait()).events;
      expect(this.events[6].args[1]).to.be.equal(this.studio1.address)
      const proposalIds_1 = await this.DAOContract.getProposalFilmIds();
      expect(proposalIds_1.length).to.be.equal(this.filmPropsoal.length)

      tx = await this.DAOContract.connect(this.studio1).createProposalFilms(this.filmPropsoal, false, {from: this.studio1.address})   
      this.events = (await tx.wait()).events;
      const proposalIds_2 = await this.DAOContract.getProposalFilmIds();
      expect(proposalIds_2.length).to.be.equal(this.filmPropsoal.length + proposalIds_1.length)

      // Studio2 can not propose films because studio2 is not studio
      await expect(
        this.DAOContract.connect(this.studio2).createProposalFilms(this.filmPropsoal, true, {from: this.studio2.address})
      ).to.be.revertedWith('Ownable: caller is not the studio');

      // Get A proposal film information with id
      const proposalFilm = await this.DAOContract.getFilmById(proposalIds_1[0])
      expect(proposalFilm.studioPayees_).to.have.lengthOf(0)
      expect(proposalFilm.sharePercents_).to.have.lengthOf(0)
      expect(proposalFilm.rentPrice_).to.be.equal(this.rentPrices[0])
      expect(proposalFilm.rentStartTime_).to.be.equal(0)
      expect(proposalFilm.raiseAmount_).to.be.equal(this.raiseAmounts[0])
      expect(proposalFilm.fundPeriod_).to.be.equal(this.fundPeriods[0])
      expect(proposalFilm.fundStart_).to.be.equal(0)
      expect(proposalFilm.studio_).to.be.equal(this.studio1.address)
      expect(proposalFilm.onlyAllowVAB_).to.be.equal(this.onlyAllowVABs[0])
      expect(proposalFilm.status_).to.be.equal(0)

      // Update actors and percents by only Studio
      const updateData = [
        getByteFilmUpdate(proposalIds_1[0]), 
        getByteFilmUpdate(proposalIds_1[1]), 
        getByteFilmUpdate(proposalIds_1[2])
      ]
      await this.DAOContract.connect(this.studio3).updateMultiFilms(updateData, {from: this.studio3.address})
      const Ids_0 = await this.DAOContract.getUpdatedFilmIds(); // 0 ids
      expect(Ids_0.length).to.be.equal(0) // 0 because studio3 didn't submit proposal

      const up_tx = await this.DAOContract.connect(this.studio1).updateMultiFilms(updateData, {from: this.studio1.address})
      this.events = (await up_tx.wait()).events    
      
      const Ids_1 = await this.DAOContract.getUpdatedFilmIds();//again getting after update = 3 ids
      // console.log('=====events::', this.events)
      expect(this.events[0].args[1]).to.be.equal(this.studio1.address)
      expect(Ids_1.length).to.be.equal(updateData.length)
    });    
  });
  describe('Films functions - 2', function () {
    it('Should deposit and withdraw by customer', async function () {
      // User balance is 1000 and transfer amount is 5000. Insufficient amount!
      await expect(
        this.DAOContract.connect(this.customer1).depositVAB(getBigNumber(5000))
      ).to.be.revertedWith('VabbleDAO::transferFrom: transferFrom failed');
      
      // Event - depositVAB
      await expect(
        this.DAOContract.connect(this.customer1).depositVAB(getBigNumber(100), {from: this.customer1.address})
      )
      .to.emit(this.DAOContract, 'VABDeposited')
      .withArgs(this.customer1.address, getBigNumber(100));    
  
      await this.DAOContract.connect(this.customer2).depositVAB(getBigNumber(200));
      await this.DAOContract.connect(this.customer3).depositVAB(getBigNumber(300));
   
      // Check user balance(amount) after deposit
      let user1Amount = await this.DAOContract.getUserRentInfo(this.customer1.address);
      expect(user1Amount.vabAmount_).to.be.equal(getBigNumber(100))
      expect(user1Amount.withdrawAmount_).to.be.equal(getBigNumber(0))
  
      // Event - CustomerWithdrawRequested
      await expect(
        this.DAOContract.connect(this.customer1).customerRequestWithdraw(getBigNumber(50), {from: this.customer1.address})
      )
      .to.emit(this.DAOContract, 'CustomerWithdrawRequested')
      .withArgs(this.customer1.address, this.vabToken.address, getBigNumber(50));  
  
      await expect(
        this.DAOContract.connect(this.customer1).customerRequestWithdraw(getBigNumber(150), {from: this.customer1.address})
      ).to.be.revertedWith('customerRequestWithdraw: Insufficient VAB amount');
      
      // Check withdraw amount after send withraw request
      user1Amount = await this.DAOContract.getUserRentInfo(this.customer1.address);
      expect(user1Amount.withdrawAmount_).to.be.equal(getBigNumber(50))
    });
  });
  describe('Films functions - 3', function () {
    it('approve_listing logic with only VAB', async function () {
      // console.log('====voteContract::', this.voteContract.address);
      // console.log('====uniHelperContract::', this.uniHelperContract.address);
      // console.log('====stakingContract::', this.stakingContract.address);    
      // console.log('====DAOContract::', this.DAOContract.address);
      // console.log('====factory::', CONFIG.uniswap.factory);
      // console.log('====router::', CONFIG.uniswap.router);
      // console.log('====usdcAdress::', CONFIG.usdcAdress);
      // console.log('====vabToken::', this.vabToken.address);
      // console.log('====deployer::', this.auditor.address);
      
      const rentPrices = [getBigNumber(100), getBigNumber(200), getBigNumber(300), getBigNumber(400)];
      const raiseAmounts = [getBigNumber(0), getBigNumber(0), getBigNumber(30000), getBigNumber(30000)];
      const fundPeriods = [getBigNumber(30 * 86400, 0), getBigNumber(30 * 86400, 0), getBigNumber(60 * 86400, 0), getBigNumber(10 * 86400, 0)];
      const onlyAllowVABs = [true, true, false, false];
      const film_1 = [rentPrices[0], raiseAmounts[0], fundPeriods[0], onlyAllowVABs[0]]
      const film_2 = [rentPrices[1], raiseAmounts[1], fundPeriods[1], onlyAllowVABs[1]]
      const film_3 = [rentPrices[2], raiseAmounts[2], fundPeriods[2], onlyAllowVABs[2]]
      const film_4 = [rentPrices[3], raiseAmounts[3], fundPeriods[3], onlyAllowVABs[3]]

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
        this.BoardContract.address,
        CONFIG.vabToken,
        {from: this.auditor.address}
      );
      expect(await this.voteContract.VABBLE_DAO()).to.be.equal(this.DAOContract.address)
      expect(await this.voteContract.isInitialized()).to.be.true

      // 4. films approved by auditor
      // 4-1. initialize vote contract
      await expect(
        this.voteContract.connect(this.auditor).initializeVote(
          this.DAOContract.address, 
          this.stakingContract.address, 
          this.BoardContract.address,
          CONFIG.vabToken,
          {from: this.auditor.address}
        )
      ).to.be.revertedWith('initializeVote: Already initialized vote');
  
      // 4-2. staking by customer1, 2, 3
      await this.stakingContract.connect(this.customer1).stakeToken(getBigNumber(100), {from: this.customer1.address})
      await this.stakingContract.connect(this.customer2).stakeToken(getBigNumber(150), {from: this.customer2.address})
      await this.stakingContract.connect(this.customer3).stakeToken(getBigNumber(300), {from: this.customer3.address})
      expect(await this.stakingContract.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(100))
      expect(await this.stakingContract.getStakeAmount(this.customer2.address)).to.be.equal(getBigNumber(150))
      expect(await this.stakingContract.getStakeAmount(this.customer3.address)).to.be.equal(getBigNumber(300))
      
      // 4-3. Vote to proposal films from customer1, 2, 3
      const proposalIds = await this.DAOContract.getProposalFilmIds(); // 1, 2, 3, 4
      const voteData = getVoteData(proposalIds)
      //=> In order to call voteToFilms(), first should pass 4-1, 4-2
      await this.voteContract.connect(this.customer1).voteToFilms(voteData, {from: this.customer1.address}) //1,1,2,3
      await this.voteContract.connect(this.customer2).voteToFilms(voteData, {from: this.customer2.address}) //1,1,2,3
      await this.voteContract.connect(this.customer3).voteToFilms(voteData, {from: this.customer3.address}) //1,1,2,3
  
      // => Increase next block timestamp for only testing
      const period = 10 * 24 * 3600; // filmVotePeriod = 10 days
      network.provider.send('evm_increaseTime', [period]);
      await network.provider.send('evm_mine');
  
      // 4-4. Approve two films by calling the approveFilms() from Auditor
      const approveData = [proposalIds[0], proposalIds[1], proposalIds[2]]
      await this.voteContract.approveFilms(approveData);// filmId = 1, 2 ,3
      const ids = await this.voteContract.getApprovedFilmIds() // 1, 2
      expect(ids.length).to.be.equal(approveData.length-1)
      
      // 5 Withdraw request(40 VAB) from customer1, 2, 3
      await this.DAOContract.connect(this.customer1).customerRequestWithdraw(getBigNumber(40), {from: this.customer1.address});
      await this.DAOContract.connect(this.customer2).customerRequestWithdraw(getBigNumber(40), {from: this.customer2.address});
      await this.DAOContract.connect(this.customer3).customerRequestWithdraw(getBigNumber(40), {from: this.customer3.address});
  
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
      let user1Amount = await this.DAOContract.getUserRentInfo(this.customer1.address);
      let user2Amount = await this.DAOContract.getUserRentInfo(this.customer2.address);
      let user3Amount = await this.DAOContract.getUserRentInfo(this.customer3.address);
      // console.log('====last amount-1::', user1Amount.amount_+"=="+user1Amount.withdrawAmount_);
      // console.log('====last amount-2::', user2Amount.amount_+"=="+user2Amount.withdrawAmount_);
      // console.log('====last amount-3::', user3Amount.amount_+"=="+user3Amount.withdrawAmount_);
      // For customer1, film1 :   100(user balance) - 20(watched %) * 100(rentPrice) = 80(remain amount)
      // For customer1, film2 :   80(remain amount) - 15(watched %) * 200(rentPrice) = 50(remain amount)
      // For customer1, withdraw: 50(remain amount) - 40(withdraw) = 10(remain amount)
      expect(user1Amount.vabAmount_).to.be.equal(getBigNumber(10));
      expect(user1Amount.withdrawAmount_).to.be.equal(getBigNumber(0))
      expect(user2Amount.vabAmount_).to.be.equal(getBigNumber(200)); // same deposit amount as auditor didn't submit actions
      expect(user2Amount.withdrawAmount_).to.be.equal(getBigNumber(40)) // same withdraw amount as auditor didn't approve
      expect(user3Amount.vabAmount_).to.be.equal(getBigNumber(300)); // same deposit amount as auditor didn't submit actions
      expect(user3Amount.withdrawAmount_).to.be.equal(getBigNumber(0)) // 0 as auditor deny pending withdraw request
    });

    it('approve_funding logic with only VAB', async function () {
    });
  });
});
