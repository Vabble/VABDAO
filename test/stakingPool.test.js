const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');
const ERC20 = require('../scripts/ERC20.json');
const { CONFIG, getBigNumber, getProposalFilm, getVoteData } = require('../scripts/utils');

describe('StakingPool', function () {
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
    this.DAI = new ethers.Contract(CONFIG.daiAddress, JSON.stringify(ERC20), ethers.provider);
    this.EXM = new ethers.Contract(CONFIG.exmAddress, JSON.stringify(ERC20), ethers.provider);

    // Transfering VAB token to user1, 2, 3
    await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(1000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer2.address, getBigNumber(1000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer3.address, getBigNumber(1000000), {from: this.auditor.address});
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

    this.rentPrices = [getBigNumber(100), getBigNumber(200)];
    this.fundPeriods = [getBigNumber(20 * 86400, 0), getBigNumber(30 * 86400, 0)];
    this.filmPropsoal = [];
    this.events = [];
  });


  // it('Staking and unstaking VAB token', async function () {        
  //   // Staking VAB token
  //   await this.stakingContract.connect(this.customer1).stakeToken(getBigNumber(100), {from: this.customer1.address})
  //   await this.stakingContract.connect(this.customer2).stakeToken(getBigNumber(150), {from: this.customer2.address})
  //   await this.stakingContract.connect(this.customer3).stakeToken(getBigNumber(300), {from: this.customer3.address})
  //   expect(await this.stakingContract.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(100))
  //   expect(await this.stakingContract.getStakeAmount(this.customer2.address)).to.be.equal(getBigNumber(150))
  //   expect(await this.stakingContract.getStakeAmount(this.customer3.address)).to.be.equal(getBigNumber(300))

  //   // unstaking VAB token
  //   await expect(
  //     this.stakingContract.connect(this.customer1).unstakeToken(getBigNumber(70), {from: this.customer1.address})
  //   ).to.be.revertedWith('unstakeToken: Token locked yet');
    
  //   // => Increase next block timestamp for only testing
  //   const period = 31 * 24 * 3600; // lockPeriod = 30 days
  //   network.provider.send('evm_increaseTime', [period]);
  //   await network.provider.send('evm_mine');

  //   await this.stakingContract.connect(this.customer1).unstakeToken(getBigNumber(70), {from: this.customer1.address})
  //   expect(await this.stakingContract.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(30))
  // });

  it('Staking and unstaking VAB token when voting', async function () {        
    // Staking VAB token
    await this.stakingContract.connect(this.customer1).stakeToken(getBigNumber(100), {from: this.customer1.address})
    expect(await this.stakingContract.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(100))

    let w_t = await this.stakingContract.getWithdrawableTime(this.customer1.address);
    console.log("=====w-t after staking::", w_t.toString())
    // Create proposal for 2 films by studio    
    const raiseAmounts = [getBigNumber(0), getBigNumber(3000, 6)];
    const onlyAllowVABs = [true, false];
    const film_1 = [this.rentPrices[0], raiseAmounts[0], this.fundPeriods[0], onlyAllowVABs[0]]
    const film_2 = [this.rentPrices[1], raiseAmounts[1], this.fundPeriods[1], onlyAllowVABs[1]]
    this.filmPropsoal = [getProposalFilm(film_1), getProposalFilm(film_2)]    
    await this.DAOContract.connect(this.studio1).createProposalFilms(this.filmPropsoal, false, {from: this.studio1.address})
    
    // initialize vote contract
    await this.voteContract.connect(this.auditor).initializeVote(
      this.DAOContract.address, 
      this.stakingContract.address, 
      this.BoardContract.address,
      CONFIG.vabToken,
      {from: this.auditor.address}
    );
    expect(await this.voteContract.isInitialized()).to.be.true
    
    // => Increase next block timestamp for only testing
    let period = 25 * 24 * 3600; // 25 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    await expect(
      this.stakingContract.connect(this.customer1).unstakeToken(getBigNumber(70), {from: this.customer1.address})
    ).to.be.revertedWith('unstakeToken: Token locked yet');
    
    // customer1 vote to films
    const proposalIds = await this.DAOContract.getProposalFilmIds(); // 1, 2
    const voteInfos = [1, 1];
    const voteData = getVoteData(proposalIds, voteInfos)
    await this.voteContract.connect(this.customer1).voteToFilms(voteData, {from: this.customer1.address})

    // => Increase next block timestamp for only testing
    period = 9 * 24 * 3600; // 9 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    
    w_t = await this.stakingContract.getWithdrawableTime(this.customer1.address);
    console.log("=====w-t after 31 days::", w_t.toString())

    await expect(
      this.stakingContract.connect(this.customer1).unstakeToken(getBigNumber(70), {from: this.customer1.address})
    ).to.be.revertedWith('unstakeToken: Token locked yet');

    // => Increase next block timestamp for only testing
    period = 2 * 24 * 3600; // 2 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    await this.stakingContract.connect(this.customer1).unstakeToken(getBigNumber(70), {from: this.customer1.address})
    expect(await this.stakingContract.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(30))
  });
});
