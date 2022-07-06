const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');
const ERC20 = require('../scripts/ERC20.json');
const { CONFIG, getBigNumber, getVoteData, getProposalFilm } = require('../scripts/utils');

describe('Vote', function () {
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

    // Add studio1, studio2 to studio list by Auditor
    await this.DAOContract.connect(this.auditor).addStudio(this.studio1.address, {from: this.auditor.address})  
    await this.DAOContract.connect(this.auditor).addStudio(this.studio2.address, {from: this.auditor.address})  
    
    this.vabToken = new ethers.Contract(CONFIG.vabToken, JSON.stringify(ERC20), ethers.provider);
    this.EXM = new ethers.Contract(CONFIG.exmAddress, JSON.stringify(ERC20), ethers.provider);

    
    this.auditorBalance = await this.vabToken.balanceOf(this.auditor.address)
    console.log("====auditorBalance::", this.auditorBalance.toString())
    // Approve to transfer VAB token for each user, studio to DAO, StakingPool
    await this.vabToken.connect(this.customer1).approve(this.DAOContract.address, this.auditorBalance);
    await this.vabToken.connect(this.customer2).approve(this.DAOContract.address, this.auditorBalance);
    await this.vabToken.connect(this.customer3).approve(this.DAOContract.address, this.auditorBalance);   
    await this.vabToken.connect(this.customer1).approve(this.stakingContract.address, this.auditorBalance);
    await this.vabToken.connect(this.customer2).approve(this.stakingContract.address, this.auditorBalance);
    await this.vabToken.connect(this.customer3).approve(this.stakingContract.address, this.auditorBalance);
    await this.vabToken.connect(this.studio1).approve(this.DAOContract.address, this.auditorBalance);
    await this.vabToken.connect(this.studio2).approve(this.DAOContract.address, this.auditorBalance);
    await this.vabToken.connect(this.studio3).approve(this.DAOContract.address, this.auditorBalance);

    this.rentPrices = [getBigNumber(100), getBigNumber(200), getBigNumber(300), getBigNumber(400)];
    this.fundPeriods = [getBigNumber(20 * 86400, 0), getBigNumber(30 * 86400, 0), getBigNumber(60 * 86400, 0), getBigNumber(10 * 86400, 0)];
    this.filmPropsoal = [];
    this.events = [];
  });


  it('VoteToFilms', async function () {    
    // Transfering VAB token to user1, 2, 3 and studio1,2,3
    await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(1000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer2.address, getBigNumber(1000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer3.address, getBigNumber(1000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio1.address, getBigNumber(1000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio2.address, getBigNumber(1000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio3.address, getBigNumber(1000000), {from: this.auditor.address});

    //=> voteToFilms()
    const proposalIds = [1, 2, 3, 4]
    const voteInfos = [1, 1, 2, 3];
    const voteData = getVoteData(proposalIds, voteInfos)
    await expect(
      this.voteContract.connect(this.customer1).voteToFilms(voteData, {from: this.customer1.address})
    ).to.be.revertedWith('function call to a non-contract account')

    // Initialize Vote contract
    await this.voteContract.connect(this.auditor).initializeVote(
      this.DAOContract.address,
      this.stakingContract.address,
      this.BoardContract.address,
      this.vabToken.address
    )

    await expect(
      this.voteContract.connect(this.customer1).voteToFilms(voteData, {from: this.customer1.address})
    ).to.be.revertedWith('Not staker')
    
    // Staking from customer1,2,3 for vote
    const stakeAmount = getBigNumber(200)
    await this.stakingContract.connect(this.customer1).stakeToken(stakeAmount, {from: this.customer1.address})
    await this.stakingContract.connect(this.customer2).stakeToken(stakeAmount, {from: this.customer2.address})
    await this.stakingContract.connect(this.customer3).stakeToken(stakeAmount, {from: this.customer3.address})
       
    // Deposit to contract(VAB amount : 100, 200, 300)
    await this.DAOContract.connect(this.customer1).depositVAB(getBigNumber(100), {from: this.customer1.address})
    await this.DAOContract.connect(this.customer2).depositVAB(getBigNumber(200), {from: this.customer2.address})
    await this.DAOContract.connect(this.customer3).depositVAB(getBigNumber(300), {from: this.customer3.address})

    // Create proposal for four films by studio
    const raiseAmounts = [getBigNumber(0), getBigNumber(0), getBigNumber(3000, 6), getBigNumber(3000, 6)];
    const onlyAllowVABs = [true, true, false, false];
    const film_1 = [this.rentPrices[0], raiseAmounts[0], this.fundPeriods[0], onlyAllowVABs[0]]
    const film_2 = [this.rentPrices[1], raiseAmounts[1], this.fundPeriods[1], onlyAllowVABs[1]]
    const film_3 = [this.rentPrices[2], raiseAmounts[2], this.fundPeriods[2], onlyAllowVABs[2]]
    const film_4 = [this.rentPrices[3], raiseAmounts[3], this.fundPeriods[3], onlyAllowVABs[3]]
    this.filmPropsoal = [getProposalFilm(film_1), getProposalFilm(film_2), getProposalFilm(film_3), getProposalFilm(film_4)]
    await this.DAOContract.connect(this.studio1).createProposalFilms(this.filmPropsoal, false, {from: this.studio1.address})
    
    await this.voteContract.connect(this.customer1).voteToFilms(voteData, {from: this.customer1.address}) //1,1,2,3
    await this.voteContract.connect(this.customer2).voteToFilms(voteData, {from: this.customer2.address}) //1,1,2,3
    await this.voteContract.connect(this.customer3).voteToFilms(voteData, {from: this.customer3.address}) //1,1,2,3    
  });

  it('VoteToAgent', async function () {    
    // Initialize Vote contract
    await this.voteContract.connect(this.auditor).initializeVote(
      this.DAOContract.address,
      this.stakingContract.address,
      this.BoardContract.address,
      this.vabToken.address
    )

    const voteInfo = [1, 2, 3] // yes, no, abstain
    await expect(
      this.voteContract.connect(this.customer1).voteToAgent(voteInfo[0], {from: this.customer1.address})
    ).to.be.revertedWith('Not available staker')

    await this.vabToken.connect(this.auditor).transfer(this.customer1.address, this.auditorBalance, {from: this.auditor.address});

    const customer1Balance = await this.vabToken.balanceOf(this.customer1.address)
    console.log("====customer1Balance::", customer1Balance.toString())

    await this.stakingContract.connect(this.customer1).stakeToken(this.auditorBalance, {from: this.customer1.address})
    const tx = await this.voteContract.connect(this.customer1).voteToAgent(voteInfo[0], {from: this.customer1.address})
    this.events = (await tx.wait()).events
    // console.log("====events::", this.events)
    const arg = this.events[0].args
    expect(this.customer1.address).to.be.equal(arg.voter)
    expect(voteInfo[0]).to.be.equal(arg.voteInfo)
  });
});
