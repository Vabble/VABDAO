const { expect, util } = require('chai');
const { ethers, network } = require('hardhat');
const { utils } = require('ethers');
const ERC20 = require('../scripts/ERC20.json');

const { 
  CONFIG,
  getByteFilmUpdate,
  getFinalFilm,
  getByteFilm,
  getBigNumber,
  getVoteData,
  getSignatures } = require('../scripts/utils');
  
describe('VabbleDAO', function () {
  before(async function () {
    this.VabbleDAOFactory = await ethers.getContractFactory('VabbleDAO');
    // this.MockERC20Factory = await ethers.getContractFactory('MockERC20');
    this.VoteFilmFactory = await ethers.getContractFactory('VoteFilm');
    this.UniHelperFactory = await ethers.getContractFactory('UniHelper');
    this.StakingPoolFactory = await ethers.getContractFactory('StakingPool');
    this.FilmBoardFactory = await ethers.getContractFactory('FilmBoard');

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
    // this.vabToken = await (await this.MockERC20Factory.deploy('Mock Token', 'VAB')).deployed();
    this.vabToken = new ethers.Contract(CONFIG.vabToken, JSON.stringify(ERC20), ethers.provider);

    this.voteContract = await (await this.VoteFilmFactory.deploy()).deployed();

    this.uniHelperContract = await (await this.UniHelperFactory.deploy(
      CONFIG.uniswap.factory, CONFIG.uniswap.router, CONFIG.usdcAdress
    )).deployed();

    this.stakingContract = await (await this.StakingPoolFactory.deploy(
      CONFIG.vabToken, this.voteContract.address
    )).deployed(); 
    
    this.filmBoardContract = await (await this.FilmBoardFactory.deploy()).deployed(); 

    this.DAOContract = await (
      await this.VabbleDAOFactory.deploy(
        CONFIG.daoFeeAddress,
        this.vabToken.address,   
        this.voteContract.address,
        this.stakingContract.address,
        this.uniHelperContract.address,
        CONFIG.usdcAdress 
      )
    ).deployed();   

    expect(await this.DAOContract.auditor()).to.be.equal(this.auditor.address);
        
    // Auditor add studio1 in the studio whitelist
    await expect(
      this.DAOContract.addStudio(this.studio1.address)
    ).to.emit(this.DAOContract, 'StudioAdded').withArgs(this.auditor.address, this.studio1.address);        

    // Transfering VAB token to users
    await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(1000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer2.address, getBigNumber(1000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer3.address, getBigNumber(1000), {from: this.auditor.address});
    // Transfering VAB token to studio1
    await this.vabToken.connect(this.auditor).transfer(this.studio1.address, getBigNumber(1000000), {from: this.auditor.address});

    // Approve to transfer VAB token for each user
    await this.vabToken.connect(this.customer1).approve(this.DAOContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.DAOContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.DAOContract.address, getBigNumber(100000000));    
    await this.vabToken.connect(this.customer1).approve(this.stakingContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.stakingContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.stakingContract.address, getBigNumber(100000000));
    // Approve to transfer VAB token for studio1
    await this.vabToken.connect(this.studio1).approve(this.DAOContract.address, getBigNumber(100000000));
    
    // Film infos with rentPrice
    this.films = [getBigNumber(100), getBigNumber(200), getBigNumber(300)];
    this.events = [];
  });

  describe('Films functions', function () {
    it('Should prospose films by studio', async function () {      
      
      const studioBalance = await this.vabToken.balanceOf(this.studio1.address)
      // console.log('====studioBalance::', studioBalance.toString());
      // Only Studio1 can propose films because auditor added to studioList
      let tx = await this.DAOContract.connect(this.studio1).createProposalFilms(this.films, false, {from: this.studio1.address})   
      this.events = (await tx.wait()).events;
      // console.log('====events::', this.events);

      expect(this.events[6].args[1]).to.be.equal(this.studio1.address)
      const proposalIds = await this.DAOContract.getProposalFilmIds();
      expect(proposalIds.length).to.be.equal(this.films.length)

      // Studio2 can not propose films because studio2 is not studio
      await expect(
        this.DAOContract.connect(this.studio2).createProposalFilms(this.films, true, {from: this.studio2.address})
      ).to.be.revertedWith('Ownable: caller is not the studio');

      // Get A proposal film information with id
      const proposalFilm = await this.DAOContract.getFilmById(proposalIds[0])
      expect(proposalFilm.studioPayees_).to.have.lengthOf(0)
      expect(proposalFilm.sharePercents_).to.have.lengthOf(0)
      expect(proposalFilm.rentPrice_).to.be.equal(this.films[0])
      expect(proposalFilm.startTime_).to.be.equal(0)
      expect(proposalFilm.studio_).to.be.equal(this.studio1.address)
      expect(proposalFilm.status_).to.be.equal(0)

      // Update actors and percents by only Studio
      const Ids_0 = await this.DAOContract.getUpdatedFilmIds();
      const updateData = [
        getByteFilmUpdate(proposalIds[0]), 
        getByteFilmUpdate(proposalIds[1]), 
        getByteFilmUpdate(proposalIds[2])
      ]
      const up_tx = await this.DAOContract.connect(this.studio1).updateMultiFilms(updateData, {from: this.studio1.address})
      this.events = (await up_tx.wait()).events            
      const Ids_1 = await this.DAOContract.getUpdatedFilmIds();//again getting after update
      // console.log('=====Ids-1::', Ids_1)
      // console.log('=====events::', this.events)
      expect(this.events[0].args[1]).to.be.equal(this.studio1.address)
      expect(Ids_1.length).to.be.equal(Ids_0.length + this.films.length)
    });
  });

  it('Should deposit and withdraw by customer', async function () {
    // User balance is 1000 and transfer amount is 5000. Insufficient amount!
    await expect(
      this.DAOContract.connect(this.customer1).customerDeposit(getBigNumber(5000))
    ).to.be.revertedWith('customerDeposit: Insufficient amount');
    
    // Event - CustomerDeposited
    await expect(
      this.DAOContract.connect(this.customer1).customerDeposit(getBigNumber(100), {from: this.customer1.address})
    )
    .to.emit(this.DAOContract, 'CustomerDeposited')
    .withArgs(this.customer1.address, this.vabToken.address, getBigNumber(100));    

    await this.DAOContract.connect(this.customer2).customerDeposit(getBigNumber(200));
    await this.DAOContract.connect(this.customer3).customerDeposit(getBigNumber(300));
    
    // Check user balance(amount) after deposit
    let user1Amount = await this.DAOContract.getUserAmount(this.customer1.address);
    expect(user1Amount.amount_).to.be.equal(getBigNumber(100))

    // Event - CustomerRequestWithdrawed
    await expect(
      this.DAOContract.connect(this.customer1).customerRequestWithdraw(getBigNumber(50), {from: this.customer1.address})
    )
    .to.emit(this.DAOContract, 'CustomerRequestWithdrawed')
    .withArgs(this.customer1.address, this.vabToken.address, getBigNumber(50));  

    await expect(
      this.DAOContract.connect(this.customer1).customerRequestWithdraw(getBigNumber(150), {from: this.customer1.address})
    ).to.be.revertedWith('customerRequestWithdraw: Insufficient amount');
    
    // Check withdraw amount after send withraw request
    user1Amount = await this.DAOContract.getUserAmount(this.customer1.address);
    expect(user1Amount.withdrawAmount_).to.be.equal(getBigNumber(50))
  });

  it('Should be approved films by vote contract and Test audit service logic', async function () {
    // console.log('====voteContract::', this.voteContract.address);
    // console.log('====uniHelperContract::', this.uniHelperContract.address);
    // console.log('====stakingContract::', this.stakingContract.address);    
    // console.log('====DAOContract::', this.DAOContract.address);
    // console.log('====factory::', CONFIG.uniswap.factory);
    // console.log('====router::', CONFIG.uniswap.router);
    // console.log('====usdcAdress::', CONFIG.usdcAdress);
    // console.log('====vabToken::', this.vabToken.address);
    // console.log('====deployer::', this.auditor.address);

    // 1. Create proposal for three films by studio
    await this.DAOContract.connect(this.studio1).createProposalFilms(this.films, false, {from: this.studio1.address})

    // 2. Deposit to contract(VAB amount : 100, 200, 300)
    await this.DAOContract.connect(this.customer1).customerDeposit(getBigNumber(100), {from: this.customer1.address})
    await this.DAOContract.connect(this.customer2).customerDeposit(getBigNumber(200), {from: this.customer2.address})
    await this.DAOContract.connect(this.customer3).customerDeposit(getBigNumber(300), {from: this.customer3.address})

    // 3. Auditor should setup VabbleDAO, stakingPool contract address to vote contract as soon as vote contract deployed
    await this.voteContract.initializeVote(
      this.DAOContract.address, 
      this.stakingContract.address, 
      this.filmBoardContract.address
    );
    expect(await this.voteContract.FILM_DAO()).to.be.equal(this.DAOContract.address)

    // 4. films approved by auditor
    // 4-1. initialize vote contract
    await this.voteContract.initializeVote(
      this.DAOContract.address, 
      this.stakingContract.address, 
      this.filmBoardContract.address
    )
    expect(await this.voteContract.isInitialized()).to.be.true

    // 4-2. staking by customer1, 2, 3
    await this.stakingContract.connect(this.customer1).stakeToken(getBigNumber(100), {from: this.customer1.address})
    await this.stakingContract.connect(this.customer2).stakeToken(getBigNumber(150), {from: this.customer2.address})
    await this.stakingContract.connect(this.customer3).stakeToken(getBigNumber(300), {from: this.customer3.address})
    expect(await this.stakingContract.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(100))
    expect(await this.stakingContract.getStakeAmount(this.customer2.address)).to.be.equal(getBigNumber(150))
    expect(await this.stakingContract.getStakeAmount(this.customer3.address)).to.be.equal(getBigNumber(300))
    
    // 4-3. Vote to proposal films from customer1, 2, 3
    const proposalIds = await this.DAOContract.getProposalFilmIds(); // 1, 2, 3
    const voteData = getVoteData(proposalIds)
    //=> In order to call voteToFilms(), first should pass 4-1, 4-2
    await this.voteContract.connect(this.customer1).voteToFilms(voteData, {from: this.customer1.address}) 
    await this.voteContract.connect(this.customer2).voteToFilms(voteData, {from: this.customer2.address}) 
    await this.voteContract.connect(this.customer3).voteToFilms(voteData, {from: this.customer3.address}) 

    // => Increase next block timestamp for only testing
    const period = 10 * 24 * 3600;
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    // 4-4. Approve two films by calling the approveFilms() from Auditor
    const approveData = [proposalIds[0], proposalIds[1]]
    await this.voteContract.approveFilms(approveData, false);// filmId = 1, 2
    // console.log('=====approvedIDs', await this.voteContract.getApprovedFilmIds())
    const ids = await this.voteContract.getApprovedFilmIds()
    expect(ids.length).to.be.equal(approveData.length)
    
    // 5 Withdraw request(40 VAB) from customer1, 2, 3
    await this.DAOContract.connect(this.customer1).customerRequestWithdraw(getBigNumber(40), {from: this.customer1.address});
    await this.DAOContract.connect(this.customer2).customerRequestWithdraw(getBigNumber(40), {from: this.customer2.address});
    await this.DAOContract.connect(this.customer3).customerRequestWithdraw(getBigNumber(40), {from: this.customer3.address});

    // 6. Auditor submit three audit actions(for customer1) with watched percent(20%, 15%, 30%) to VabbleDAO contract
    // only two film 1,2 approved in 4-4 so film3 watch(30%) ignored
    const finalData = [getFinalFilm(this.customer1.address, proposalIds)]
    let tx = await this.DAOContract.setFinalFilms(finalData);
    this.events = (await tx.wait()).events
    // console.log('======events::', this.events[0].args)
    expect(this.events[0].args.filmIds[0]).to.be.equal(proposalIds[0]) // id = 1
    expect(this.events[0].args.filmIds[1]).to.be.equal(proposalIds[1]) // id = 2    

    // 6-1 Approve pending-withdraw requests for customer1 and Deny for customer3 by Auditor, not customer2
    await this.DAOContract.approvePendingWithdraw([this.customer1.address])
    await this.DAOContract.denyPendingWithdraw([this.customer3.address])

    // 7. Check remain customer1,2,3 balance(amount, withdrawAmount) after submit audit actions
    let user1Amount = await this.DAOContract.getUserAmount(this.customer1.address);
    let user2Amount = await this.DAOContract.getUserAmount(this.customer2.address);
    let user3Amount = await this.DAOContract.getUserAmount(this.customer3.address);
    // console.log('====last amount-1::', user1Amount.amount_+"=="+user1Amount.withdrawAmount_);
    // console.log('====last amount-2::', user2Amount.amount_+"=="+user2Amount.withdrawAmount_);
    // console.log('====last amount-3::', user3Amount.amount_+"=="+user3Amount.withdrawAmount_);
    // For customer1, film1 :   100(user balance) - 20(watched %) * 100(rentPrice) = 80(remain amount)
    // For customer1, film2 :   80(remain amount) - 15(watched %) * 200(rentPrice) = 50(remain amount)
    // For customer1, withdraw: 50(remain amount) - 40(withdraw) = 10(remain amount)
    expect(user1Amount.amount_).to.be.equal(getBigNumber(10));
    expect(user1Amount.withdrawAmount_).to.be.equal(getBigNumber(0))
    expect(user2Amount.amount_).to.be.equal(getBigNumber(200)); // same deposit amount as auditor didn't submit actions
    expect(user2Amount.withdrawAmount_).to.be.equal(getBigNumber(40)) // same withdraw amount as auditor didn't approve
    expect(user3Amount.amount_).to.be.equal(getBigNumber(300)); // same deposit amount as auditor didn't submit actions
    expect(user3Amount.withdrawAmount_).to.be.equal(getBigNumber(0)) // 0 as auditor deny pending withdraw request
  });
  
});
