const { expect, util } = require('chai');
const { ethers, network } = require('hardhat');
const { 
  CONFIG,
  getByteFilmUpdate,
  getFinalFilm,
  getByteFilm,
  getBigNumber,
  getSignatures } = require('../scripts/utils');
  
describe('RentFilm', function () {
  before(async function () {
    this.RentFilmFactory = await ethers.getContractFactory('RentFilm');
    this.MockERC20Factory = await ethers.getContractFactory('MockERC20');
    this.VoteFilmFactory = await ethers.getContractFactory('VoteFilm');

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
    
    this.vabToken = await (await this.MockERC20Factory.deploy('Mock Token', 'VAB')).deployed();
    this.voteContract = await (await this.VoteFilmFactory.deploy()).deployed();
   
    this.rentContract = await (
      await this.RentFilmFactory.deploy(
        CONFIG.daoFeeAddress,
        this.vabToken.address,
        this.voteContract.address
      )
    ).deployed();   
        
    expect(await this.rentContract.auditor()).to.be.equal(this.auditor.address);

    // Auditor add studio1 in the studio whitelist
    await expect(
      this.rentContract.addStudio(this.studio1.address)
    ).to.emit(this.rentContract, 'StudioAdded').withArgs(this.auditor.address, this.studio1.address);        

    // Transfering collateralCurrency (USDC) to users
    await this.vabToken.transfer(this.customer1.address, getBigNumber(1000, 0));
    await this.vabToken.transfer(this.customer2.address, getBigNumber(1000, 0));
    await this.vabToken.transfer(this.customer3.address, getBigNumber(1000, 0));

    // Approve to transfer VAB token for each user
    await this.vabToken.connect(this.customer1).approve(this.rentContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.rentContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.rentContract.address, getBigNumber(100000000));
    
    // Film infos with rentPrice
    this.films = [getBigNumber(100, 0), getBigNumber(200, 0), getBigNumber(300, 0)];
    this.events = [];
  });

  describe('Films functions', function () {
    it('Should prospose films by studio', async function () {      
         
      // Only Studio1 can propose films because auditor added to studioList
      let tx = await this.rentContract.connect(this.studio1).createProposalFilms(this.films, {from: this.studio1.address})   
      this.events = (await tx.wait()).events;
      expect(this.events[0].args[1]).to.be.equal(this.studio1.address)
      const proposalIds = await this.rentContract.getProposalFilmIds();
      expect(proposalIds.length).to.be.equal(this.films.length)

      // Studio2 can not propose films because studio2 is not studio
      await expect(
        this.rentContract.connect(this.studio2).createProposalFilms(this.films, {from: this.studio2.address})
      ).to.be.revertedWith('Ownable: caller is not the studio');

      // Get A proposal film information with id
      const proposalFilm = await this.rentContract.getFilmById(proposalIds[0])
      expect(proposalFilm.studioActors_).to.have.lengthOf(0)
      expect(proposalFilm.sharePercents_).to.have.lengthOf(0)
      expect(proposalFilm.rentPrice_).to.be.equal(this.films[0])
      expect(proposalFilm.startTime_).to.be.equal(0)
      expect(proposalFilm.studio_).to.be.equal(this.studio1.address)
      expect(proposalFilm.status_).to.be.equal(0)

      // Update actors and percents by only Studio
      const Ids_0 = await this.rentContract.getUpdatedFilmIds();
      const updateData = [
        getByteFilmUpdate(proposalIds[0]), 
        getByteFilmUpdate(proposalIds[1]), 
        getByteFilmUpdate(proposalIds[2])
      ]
      const up_tx = await this.rentContract.connect(this.studio1).updateFilmsByStudio(updateData, {from: this.studio1.address})
      this.events = (await up_tx.wait()).events            
      const Ids_1 = await this.rentContract.getUpdatedFilmIds();//again getting after update
      // console.log('=====Ids-1::', Ids_1)
      // console.log('=====events::', this.events[0].args[1])
      expect(this.events[0].args[1]).to.be.equal(this.studio1.address)
      expect(Ids_1.length).to.be.equal(Ids_0.length + this.films.length)
    });
  });

  it('Should deposit and withdraw by customer', async function () {
    // User balance is 1000 and transfer amount is 5000. Insufficient amount!
    await expect(
      this.rentContract.connect(this.customer1).customerDeopsit(getBigNumber(5000, 0))
    ).to.be.revertedWith('customerDeopsit: Insufficient amount');
    
    // Event - CustomerDeposited
    await expect(
      this.rentContract.connect(this.customer1).customerDeopsit(getBigNumber(100, 0), {from: this.customer1.address})
    )
    .to.emit(this.rentContract, 'CustomerDeposited')
    .withArgs(this.customer1.address, this.vabToken.address, getBigNumber(100, 0));    

    await this.rentContract.connect(this.customer2).customerDeopsit(getBigNumber(200, 0));
    await this.rentContract.connect(this.customer3).customerDeopsit(getBigNumber(300, 0));
    
    // Check user balance(amount) after deposit
    let user1Amount = await this.rentContract.getUserAmount(this.customer1.address);
    expect(user1Amount.amount_).to.be.equal(getBigNumber(100, 0))

    // Event - CustomerRequestWithdrawed
    await expect(
      this.rentContract.connect(this.customer1).customerRequestWithdraw(getBigNumber(50, 0), {from: this.customer1.address})
    )
    .to.emit(this.rentContract, 'CustomerRequestWithdrawed')
    .withArgs(this.customer1.address, this.vabToken.address, getBigNumber(50, 0));  

    await expect(
      this.rentContract.connect(this.customer1).customerRequestWithdraw(getBigNumber(150, 0), {from: this.customer1.address})
    ).to.be.revertedWith('customerRequestWithdraw: Insufficient amount');
    
    // Check withdraw amount after send withraw request
    user1Amount = await this.rentContract.getUserAmount(this.customer1.address);
    expect(user1Amount.withdrawAmount_).to.be.equal(getBigNumber(50, 0))
  });

  it('Should be approved films by vote contract and Test audit service logic', async function () {
    // 1. Create proposal for three films by studio
    await this.rentContract.connect(this.studio1).createProposalFilms(this.films, {from: this.studio1.address})

    // 2. Get proposal film Ids from rentFilm contract and Charge user balance in contract
    const proposalIds = await this.rentContract.getProposalFilmIds(); // 1, 2, 3
    await this.rentContract.connect(this.customer1).customerDeopsit(getBigNumber(100, 0), {from: this.customer1.address}) // 100 VAB

    // 3. Auditor setup rentFilm contract address to vote contract as soon as vote contract deployed
    await this.voteContract.setting(this.rentContract.address);
    expect(await this.voteContract.rentFilmContract()).to.be.equal(this.rentContract.address)

    // 4. films approved automatically based on vote logic
    //    => for now, Approve two films by calling the "approveProposalFilm" of vote contract
    await this.voteContract.approveProposalFilm(proposalIds[0]);// filmId = 1
    await this.voteContract.approveProposalFilm(proposalIds[1]);// filmId = 2

    // 5 Withdraw request(40 VAB) from customer
    await this.rentContract.connect(this.customer1).customerRequestWithdraw(getBigNumber(40, 0));

    // 6. Auditor submit three audit actions with watched percent(20%, 15%, 30%) to rentFilm contract
    const finalData = [getFinalFilm(this.customer1.address, proposalIds)]
    let tx = await this.rentContract.setFinalFilms(finalData);
    this.events = (await tx.wait()).events
    // console.log('======events::', this.customer1.address+", "+this.events)
    expect(this.events[1].args.customer).to.be.equal(this.customer1.address)
    expect(this.events[1].args.token).to.be.equal(this.vabToken.address)
    expect(this.events[1].args.withdrawAmount).to.be.equal(getBigNumber(40, 0))
    expect(this.events[2].args.filmIds[0]).to.be.equal(proposalIds[0]) // id = 1
    expect(this.events[2].args.filmIds[1]).to.be.equal(proposalIds[1]) // id = 2    

    // 7. Check remain customer1 balance(amount, withdrawAmount) after submit audit actions
    let user1Amount = await this.rentContract.getUserAmount(this.customer1.address);
    expect(user1Amount.amount_).to.be.equal(getBigNumber(10, 0))
    expect(user1Amount.withdrawAmount_).to.be.equal(getBigNumber(0, 0))
  });
  
});
