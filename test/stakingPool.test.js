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

    await this.vabToken.connect(this.customer1).approve(this.BoardContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.BoardContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.BoardContract.address, getBigNumber(100000000));

    await this.vabToken.connect(this.studio1).approve(this.DAOContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio2).approve(this.DAOContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.studio3).approve(this.DAOContract.address, getBigNumber(100000000));

    await this.vabToken.connect(this.auditor).approve(this.stakingContract.address, getBigNumber(100000000));

    this.rentPrices = [getBigNumber(100), getBigNumber(200), getBigNumber(300), getBigNumber(400)];
    this.fundPeriods = [getBigNumber(20 * 86400, 0), getBigNumber(30 * 86400, 0), getBigNumber(60 * 86400, 0), getBigNumber(10 * 86400, 0)];
    this.events = [];
  });

  it('Staking and unstaking VAB token', async function () {        
    // Staking VAB token
    await this.stakingContract.connect(this.customer1).stakeToken(getBigNumber(100), {from: this.customer1.address})
    await this.stakingContract.connect(this.customer2).stakeToken(getBigNumber(150), {from: this.customer2.address})
    await this.stakingContract.connect(this.customer3).stakeToken(getBigNumber(300), {from: this.customer3.address})
    expect(await this.stakingContract.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(100))
    expect(await this.stakingContract.getStakeAmount(this.customer2.address)).to.be.equal(getBigNumber(150))
    expect(await this.stakingContract.getStakeAmount(this.customer3.address)).to.be.equal(getBigNumber(300))

    // unstaking VAB token
    await expect(
      this.stakingContract.connect(this.customer1).unstakeToken(getBigNumber(70), {from: this.customer1.address})
    ).to.be.revertedWith('unstakeToken: Token locked yet');
    
    // => Increase next block timestamp for only testing
    const period = 31 * 24 * 3600; // lockPeriod = 30 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    await this.stakingContract.connect(this.customer1).unstakeToken(getBigNumber(70), {from: this.customer1.address})
    expect(await this.stakingContract.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(30))
  });

  it('Staking and unstaking VAB token when voting', async function () {        
    // Staking VAB token
    const stakeAmount = getBigNumber(100)
    await this.stakingContract.connect(this.customer1).stakeToken(stakeAmount, {from: this.customer1.address})
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
    const period_1 = 25 * 24 * 3600; // 25 days
    network.provider.send('evm_increaseTime', [period_1]);
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
    const period_2 = 9 * 24 * 3600; // 9 days
    network.provider.send('evm_increaseTime', [period_2]);
    await network.provider.send('evm_mine');

    
    // w_t = await this.stakingContract.getWithdrawableTime(this.customer1.address);
    // console.log("=====w-t after 34 days::", w_t.toString())

    await expect(
      this.stakingContract.connect(this.customer1).unstakeToken(getBigNumber(70), {from: this.customer1.address})
    ).to.be.revertedWith('unstakeToken: Token locked yet');

    // => Increase next block timestamp
    const period_3 = 20 * 24 * 3600; // 20 days
    network.provider.send('evm_increaseTime', [period_3]);
    await network.provider.send('evm_mine');

    const rewardRate = await this.stakingContract.rewardRate()
    const lockPeriod = await this.stakingContract.lockPeriod()
    const timePercent = (BigNumber.from(period_1).add(period_2).add(period_3)).mul(10000).div(lockPeriod);
    const expectRewardAmount = BigNumber.from(stakeAmount).mul(timePercent).mul(rewardRate).div(1000000).div(10000);

    const tx = await this.stakingContract.connect(this.customer1).unstakeToken(getBigNumber(70), {from: this.customer1.address})
    this.events = (await tx.wait()).events
    const arg_reward = this.events[1].args
    const arg_unstake = this.events[3].args    
    expect(arg_reward.staker).to.be.equal(this.customer1.address)
    console.log('====arg_reward.rewardAmount::', arg_reward.rewardAmount.toString(), expectRewardAmount.toString())//0.018000000000000000
    expect(arg_reward.rewardAmount).to.be.equal(expectRewardAmount)
    expect(arg_unstake.unstaker).to.be.equal(this.customer1.address)
    expect(arg_unstake.unStakeAmount).to.be.equal(getBigNumber(70))
    expect(await this.stakingContract.getStakeAmount(this.customer1.address)).to.be.equal(getBigNumber(30))
  });


  it('AddReward and WithdrawReward with VAB token', async function() {
    // Add reward from auditor
    const rewardAmount = getBigNumber(1000)
    await this.stakingContract.connect(this.auditor).addRewardToPool(rewardAmount, {from: this.auditor.address})
    expect(await this.stakingContract.totalRewardAmount()).to.be.equal(rewardAmount)

    // Add reward from VabbleDAO contract
    await this.DAOContract.connect(this.studio1).depositVAB(rewardAmount, {from: this.studio1.address})
    await this.DAOContract.connect(this.studio1).addReward(rewardAmount, {from: this.studio1.address})
    expect(await this.stakingContract.totalRewardAmount()).to.be.equal(rewardAmount.mul(2))

    // Add reward from FilmBoard contract
    const VABBalance = await this.vabToken.balanceOf(this.customer1.address)
    await this.BoardContract.connect(this.customer1).createProposalFilmBoard(this.customer1.address, {from: this.customer1.address})

    const total = await this.stakingContract.totalRewardAmount()
    console.log('====totalRewardAmount::', total.toString()) //11066.108938801491315813
    expect(total).to.be.above(rewardAmount.mul(3))

    // Withdraw reward
    let w_t = await this.stakingContract.getWithdrawableTime(this.customer1.address);
    console.log("=====w-t after staking::", w_t.toString())
    await expect(
      this.stakingContract.connect(this.customer1).withdrawReward({from: this.customer1.address})
    ).to.be.revertedWith('withdrawReward: Zero staking amount');

    const stakeAmount = getBigNumber(100)
    await this.stakingContract.connect(this.customer1).stakeToken(stakeAmount, {from: this.customer1.address})

    await expect(
      this.stakingContract.connect(this.customer1).withdrawReward({from: this.customer1.address})
    ).to.be.revertedWith('withdrawReward: lock period yet');

    const period = 30 * 24 * 3600; // lockPeriod = 30 days
    network.provider.send('evm_increaseTime', [period]);
    await network.provider.send('evm_mine');

    let rewardRate = await this.stakingContract.rewardRate()
    const tx = await this.stakingContract.connect(this.customer1).withdrawReward({from: this.customer1.address})
    this.events = (await tx.wait()).events
    const arg = this.events[1].args
    console.log('====arg::', arg.rewardAmount.toString(), rewardRate.toString())
    expect(arg.staker).to.be.equal(this.customer1.address)
    expect(arg.rewardAmount).to.be.equal(stakeAmount.mul(rewardRate).div(1000000))//0.01 VAB

    // Update rewardRate and Withdraw reward with new Rate
    const newRate = 10 // 1%=100, 0.1%=10
    await expect(
      this.stakingContract.connect(this.studio1).updateRewardRate(newRate, {from: this.studio1.address})
    ).to.be.revertedWith('Ownable: caller is not the auditor');

    await this.stakingContract.connect(this.auditor).updateRewardRate(newRate, {from: this.auditor.address})
    rewardRate = await this.stakingContract.rewardRate()
    expect(rewardRate).to.be.equal(newRate)

    const period_2 = 30 * 24 * 3600; // lockPeriod = 30 days
    network.provider.send('evm_increaseTime', [period_2]);
    await network.provider.send('evm_mine');

    rewardRate = await this.stakingContract.rewardRate()
    const lockPeriod = await this.stakingContract.lockPeriod()
    const timePercent = BigNumber.from(period_2).mul(10000).div(lockPeriod);
    const expectRewardAmount = BigNumber.from(stakeAmount).mul(timePercent).mul(rewardRate).div(1000000).div(10000);

    const tx_new = await this.stakingContract.connect(this.customer1).withdrawReward({from: this.customer1.address})
    this.events = (await tx_new.wait()).events
    const arg_new = this.events[1].args
    expect(arg_new.staker).to.be.equal(this.customer1.address)
    expect(arg_new.rewardAmount).to.be.equal(expectRewardAmount)//0.01 VAB

    // Update lockPeriod
    const newPeriod = 5 * 24 * 3600 // 5 days
    await expect(
      this.stakingContract.connect(this.customer1).updateLockPeriod(newPeriod, {from: this.customer1.address})
    ).to.be.revertedWith('Ownable: caller is not the auditor');

    await this.stakingContract.connect(this.auditor).updateLockPeriod(newPeriod, {from: this.auditor.address})
    expect(await this.stakingContract.lockPeriod()).to.be.equal(newPeriod)
  });
});
