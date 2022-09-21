const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');
const ERC20 = require('../data/ERC20.json');
const { CONFIG, getBigNumber, getVoteData, getProposalFilm } = require('../scripts/utils');

describe('Vote', function () {
  before(async function () {
    this.VabbleDAOFactory = await ethers.getContractFactory('VabbleDAO');
    this.VoteFactory = await ethers.getContractFactory('Vote');
    this.UniHelperFactory = await ethers.getContractFactory('UniHelper');
    this.StakingPoolFactory = await ethers.getContractFactory('StakingPool');
    this.PropertyFactory = await ethers.getContractFactory('Property');

    this.signers = await ethers.getSigners();
    this.auditor = this.signers[0];
    this.studio1 = this.signers[2];    
    this.studio2 = this.signers[3];       
    this.studio3 = this.signers[4]; 
    this.customer1 = this.signers[5];
    this.customer2 = this.signers[6];
    this.customer3 = this.signers[7];
    this.auditorAgent1 = this.signers[8];   
    this.auditorAgent2 = this.signers[9];   
  });

  beforeEach(async function () {
    this.vabToken = new ethers.Contract(CONFIG.rinkeby.vabToken, JSON.stringify(ERC20), ethers.provider);
    this.EXM = new ethers.Contract(CONFIG.rinkeby.exmAddress, JSON.stringify(ERC20), ethers.provider);
    this.USDC = new ethers.Contract(CONFIG.rinkeby.usdcAdress, JSON.stringify(ERC20), ethers.provider);

    this.voteContract = await (await this.VoteFactory.deploy()).deployed();

    this.uniHelperContract = await (await this.UniHelperFactory.deploy(
      CONFIG.rinkeby.uniswap.factory, CONFIG.rinkeby.uniswap.router, CONFIG.rinkeby.sushiswap.factory, CONFIG.rinkeby.sushiswap.router
    )).deployed();

    this.stakingContract = await (await this.StakingPoolFactory.deploy()).deployed(); 
    
    this.propertyContract = await (
      await this.PropertyFactory.deploy(
        this.vabToken.address,
        this.voteContract.address,
        this.stakingContract.address,
        this.uniHelperContract.address,
        this.USDC.address
      )
    ).deployed();

    this.DAOContract = await (
      await this.VabbleDAOFactory.deploy(
        this.vabToken.address,
        this.voteContract.address,
        this.stakingContract.address,
        this.uniHelperContract.address,
        this.propertyContract.address,
        this.USDC.address
      )
    ).deployed();    

    // Add studio1, studio2 to studio list by Auditor
    await this.DAOContract.connect(this.auditor).addStudio(this.studio1.address, {from: this.auditor.address})  
    await this.DAOContract.connect(this.auditor).addStudio(this.studio2.address, {from: this.auditor.address})  
    
    this.auditorBalance = await this.vabToken.balanceOf(this.auditor.address) // 145M
    // console.log("====auditorBalance::", this.auditorBalance.toString())    

    // Approve to transfer VAB token for each user, studio to DAO, StakingPool
    await this.vabToken.connect(this.customer1).approve(this.DAOContract.address, this.auditorBalance);
    await this.vabToken.connect(this.customer2).approve(this.DAOContract.address, this.auditorBalance);
    await this.vabToken.connect(this.customer3).approve(this.DAOContract.address, this.auditorBalance);  

    await this.vabToken.connect(this.customer1).approve(this.stakingContract.address, this.auditorBalance);
    await this.vabToken.connect(this.customer2).approve(this.stakingContract.address, this.auditorBalance);
    await this.vabToken.connect(this.customer3).approve(this.stakingContract.address, this.auditorBalance);

    await this.vabToken.connect(this.customer1).approve(this.propertyContract.address, this.auditorBalance);
    await this.vabToken.connect(this.customer2).approve(this.propertyContract.address, this.auditorBalance);
    await this.vabToken.connect(this.customer3).approve(this.propertyContract.address, this.auditorBalance);

    await this.vabToken.connect(this.studio1).approve(this.DAOContract.address, this.auditorBalance);
    await this.vabToken.connect(this.studio2).approve(this.DAOContract.address, this.auditorBalance);
    await this.vabToken.connect(this.studio3).approve(this.DAOContract.address, this.auditorBalance);

    this.rentPrices = [getBigNumber(100), getBigNumber(200), getBigNumber(300), getBigNumber(400)];
    this.fundPeriods = [getBigNumber(20 * 86400, 0), getBigNumber(30 * 86400, 0), getBigNumber(60 * 86400, 0), getBigNumber(10 * 86400, 0)];
    this.filmPropsoal = [];
    this.events = [];
    this.voteInfo = [1, 2, 3] // yes, no, abstain
  });

  it('VoteToFilms', async function () {    
    // Transfering VAB token to user1, 2, 3 and studio1,2,3
    await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer2.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer3.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio1.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio2.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio3.address, getBigNumber(10000000), {from: this.auditor.address});

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
      this.propertyContract.address,
      this.vabToken.address
    )

    await expect(
      this.voteContract.connect(this.customer1).voteToFilms(voteData, {from: this.customer1.address})
    ).to.be.revertedWith('Not staker')
    
    // Initialize StakingPool
    await this.stakingContract.connect(this.auditor).initializePool(
      this.DAOContract.address,
      this.voteContract.address,
      this.propertyContract.address,
      this.vabToken.address,
      {from: this.auditor.address}
    )
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
    // Initialize StakingPool
    await this.stakingContract.connect(this.auditor).initializePool(
      this.DAOContract.address,
      this.voteContract.address,
      this.propertyContract.address,
      this.vabToken.address,
      {from: this.auditor.address}
    )    
    const stakeAmount = getBigNumber(200)
    await this.stakingContract.connect(this.customer1).stakeToken(stakeAmount, {from: this.customer1.address})
    await this.stakingContract.connect(this.customer2).stakeToken(stakeAmount, {from: this.customer2.address})
    await this.stakingContract.connect(this.customer3).stakeToken(stakeAmount, {from: this.customer3.address})

    // Initialize Vote contract
    await this.voteContract.connect(this.auditor).initializeVote(
      this.DAOContract.address,
      this.stakingContract.address,
      this.propertyContract.address,
      this.vabToken.address
    )
    
    // Call voteToAgent before create the proposal
    await expect(
      this.voteContract.connect(this.customer2).voteToAgent(this.voteInfo[0], 3, {from: this.customer2.address})
    ).to.be.revertedWith('voteToAgent: invalid index or no proposal')

    // Create proposal for Auditor
    await this.propertyContract.connect(this.customer1).proposalAuditor(this.auditorAgent1.address, {from: this.customer1.address});
    await this.propertyContract.connect(this.customer2).proposalAuditor(this.auditorAgent2.address, {from: this.customer2.address});

    const customer1Balance = await this.vabToken.balanceOf(this.customer1.address)
    console.log("====customer1Balance::", customer1Balance.toString())
       
    // Call voteToAgent with index=3(avaliable index: 0, 1)
    await expect(
      this.voteContract.connect(this.customer2).voteToAgent(this.voteInfo[0], 3, {from: this.customer2.address})
    ).to.be.revertedWith('voteToAgent: invalid index or no proposal')

    await this.voteContract.connect(this.customer2).voteToAgent(this.voteInfo[0], 0, {from: this.customer2.address});
    await this.voteContract.connect(this.customer3).voteToAgent(this.voteInfo[0], 0, {from: this.customer3.address});

    let tx = await this.voteContract.connect(this.customer1).voteToAgent(this.voteInfo[0], 0, {from: this.customer1.address})
    this.events = (await tx.wait()).events
    // console.log("====events::", this.events)
    const arg = this.events[0].args
    expect(this.customer1.address).to.be.equal(arg.voter)
    expect(this.voteInfo[0]).to.be.equal(arg.voteInfo)
    
    // Call voteToAgent again
    await expect(
      this.voteContract.connect(this.customer2).voteToAgent(this.voteInfo[1], 0, {from: this.customer2.address})
    ).to.be.revertedWith('voteToAgent: Already voted')

    // replaceAuditor
    await expect(
      this.voteContract.connect(this.customer2).replaceAuditor(0, {from: this.customer2.address})
    ).to.be.revertedWith('replaceAuditor: vote period yet')

    const defaultAgentVotePeriod = 10 * 86400; // 10 days
    const agentVotePeriod = await this.propertyContract.agentVotePeriod();
    expect(agentVotePeriod).to.be.equal(defaultAgentVotePeriod)

    const defaultDisputeGracePeriod = 30 * 86400; // 30 days
    const disputeGracePeriod = await this.propertyContract.disputeGracePeriod();
    expect(disputeGracePeriod).to.be.equal(defaultDisputeGracePeriod)

    // => Increase next block timestamp
    network.provider.send('evm_increaseTime', [defaultAgentVotePeriod]);
    await network.provider.send('evm_mine');

    await expect(
      this.voteContract.connect(this.customer2).replaceAuditor(0, {from: this.customer2.address})
    ).to.be.revertedWith('replaceAuditor: dispute grace period yet')

    // => Increase next block timestamp
    network.provider.send('evm_increaseTime', [defaultDisputeGracePeriod]);
    await network.provider.send('evm_mine');

    await this.voteContract.connect(this.customer2).replaceAuditor(0, {from: this.customer2.address})

    const agent1 = await this.propertyContract.getAgent(0); 
    expect(agent1).to.be.equal(this.auditorAgent2.address)
    const agent2 = await this.propertyContract.getAgent(1);    
    expect(agent2).to.be.equal(CONFIG.addressZero) 



    // Transfer staking amount(over 75m)
    const transferAmount = getBigNumber(500000000) // 50m
    await this.vabToken.connect(this.auditor).transfer(this.customer1.address, transferAmount, {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer2.address, transferAmount, {from: this.auditor.address});

    // Staking
    await this.stakingContract.connect(this.customer1).stakeToken(transferAmount, {from: this.customer1.address})
    await this.stakingContract.connect(this.customer2).stakeToken(transferAmount, {from: this.customer2.address})

    // Vote to auditorAgent2 address(index=0)
    await this.voteContract.connect(this.customer1).voteToAgent(this.voteInfo[0], 0, {from: this.customer1.address});
    await this.voteContract.connect(this.customer2).voteToAgent(this.voteInfo[0], 0, {from: this.customer2.address});
    await this.voteContract.connect(this.customer3).voteToAgent(this.voteInfo[0], 0, {from: this.customer3.address});

    // => Increase next block timestamp
    network.provider.send('evm_increaseTime', [defaultDisputeGracePeriod]);
    await network.provider.send('evm_mine');

    // replaceAuditor
    await this.voteContract.connect(this.customer2).replaceAuditor(0, {from: this.customer2.address})

    const agent1_1 = await this.propertyContract.getAgent(0); 
    console.log("====agent1_1", agent1_1)
    
    const new_auditor = await this.voteContract.auditor(); 
    console.log("====new_auditor", new_auditor, this.auditorAgent2.address)
  });

  it('voteToProperty', async function () {    
    // Transfering VAB token to user1, 2, 3 and studio1,2,3
    await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer2.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer3.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio1.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio2.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio3.address, getBigNumber(10000000), {from: this.auditor.address});

    // Initialize StakingPool
    await this.stakingContract.connect(this.auditor).initializePool(
      this.DAOContract.address,
      this.voteContract.address,
      this.propertyContract.address,
      this.vabToken.address,
      {from: this.auditor.address}
    )    

    const stakeAmount = getBigNumber(200)
    await this.stakingContract.connect(this.customer1).stakeToken(stakeAmount, {from: this.customer1.address})
    await this.stakingContract.connect(this.customer2).stakeToken(stakeAmount, {from: this.customer2.address})
    await this.stakingContract.connect(this.customer3).stakeToken(stakeAmount, {from: this.customer3.address})

    // Initialize Vote contract
    await this.voteContract.connect(this.auditor).initializeVote(
      this.DAOContract.address,
      this.stakingContract.address,
      this.propertyContract.address,
      this.vabToken.address
    )
        
    let flag = 0;
    let indx = 0;
    let property1 = 15 * 86400; // 15 days
    let property2 = 20 * 86400; // 20 days
    let defaultVal = 10 * 86400; // 10 days    
    let period_8 = 8 * 86400; // 8 days      
    let period_3 = 3 * 86400; // 3 days    

    // Call voteToProperty() before create a proposal
    await expect(
      this.voteContract.connect(this.customer1).voteToProperty(this.voteInfo[0], indx, flag, {from: this.customer1.address})
    ).to.be.revertedWith('voteToProperty: no proposal')

    // 1 ====================== proposalProperty(filmVotePeriod) ======================
    await this.propertyContract.connect(this.customer1).proposalProperty(property1, flag, {from: this.customer1.address})
    await this.propertyContract.connect(this.customer2).proposalProperty(property2, flag, {from: this.customer2.address})
    expect(await this.propertyContract.getProperty(0, flag)).to.be.equal(property1)
    expect(await this.propertyContract.getProperty(1, flag)).to.be.equal(property2)

    // voteToProperty
    await this.voteContract.connect(this.customer1).voteToProperty(this.voteInfo[0], indx, flag, {from: this.customer1.address})
    await this.voteContract.connect(this.customer2).voteToProperty(this.voteInfo[0], indx, flag, {from: this.customer2.address})
    await this.voteContract.connect(this.customer3).voteToProperty(this.voteInfo[2], indx, flag, {from: this.customer3.address})

    // => Increase next block timestamp
    network.provider.send('evm_increaseTime', [period_8]);
    await network.provider.send('evm_mine');

    // Call updateProperty() before vote period
    await expect(
      this.voteContract.connect(this.customer1).updateProperty(indx, flag, {from: this.customer1.address})
    ).to.be.revertedWith('updateProperty: vote period yet')

    // => Increase next block timestamp
    network.provider.send('evm_increaseTime', [period_3]);
    await network.provider.send('evm_mine');

    // updateProperty
    await this.voteContract.connect(this.customer1).updateProperty(indx, flag, {from: this.customer1.address})
    expect(await this.propertyContract.filmVotePeriod()).to.be.equal(property1)
    expect(await this.propertyContract.getProperty(0, flag)).to.be.equal(property2)


    // 2 =================== proposalProperty(rewardRate) ======================
    let rewardRate = await this.propertyContract.rewardRate();
    console.log('====defaultPropertyVal::', rewardRate.toString())
    let totalRewardAmount = await this.stakingContract.totalRewardAmount();
    console.log('====totalRewardAmount::', totalRewardAmount.toString())

    flag = 7;
    property1 = 50000; // 0.0005% (1% = 1e8, 100%=1e10)
    property2 = 80000; // 0.0008% (1% = 1e8, 100%=1e10)
    await this.propertyContract.connect(this.customer1).proposalProperty(property1, flag, {from: this.customer1.address})
    await this.propertyContract.connect(this.customer2).proposalProperty(property2, flag, {from: this.customer2.address})
    expect(await this.propertyContract.getProperty(0, flag)).to.be.equal(property1)
    expect(await this.propertyContract.getProperty(1, flag)).to.be.equal(property2)
    totalRewardAmount = await this.stakingContract.totalRewardAmount();
    console.log('====totalRewardAmount::', totalRewardAmount.toString())

    // voteToProperty
    await this.voteContract.connect(this.customer1).voteToProperty(this.voteInfo[0], indx, flag, {from: this.customer1.address})
    await this.voteContract.connect(this.customer2).voteToProperty(this.voteInfo[0], indx, flag, {from: this.customer2.address})
    await this.voteContract.connect(this.customer3).voteToProperty(this.voteInfo[2], indx, flag, {from: this.customer3.address})

    // => Increase next block timestamp
    network.provider.send('evm_increaseTime', [period_8]);
    await network.provider.send('evm_mine');

    // Call updateProperty() before vote period
    await expect(
      this.voteContract.connect(this.customer1).updateProperty(indx, flag, {from: this.customer1.address})
    ).to.be.revertedWith('updateProperty: vote period yet')

    // => Increase next block timestamp
    network.provider.send('evm_increaseTime', [period_3]);
    await network.provider.send('evm_mine');

    // updateProperty
    await this.voteContract.connect(this.customer1).updateProperty(indx, flag, {from: this.customer1.address})
    rewardRate = await this.propertyContract.rewardRate()
    expect(rewardRate).to.be.equal(property1)
    expect(await this.propertyContract.getProperty(0, flag)).to.be.equal(property2)
    console.log('====rewardRate::', rewardRate.toString())

    const list = await this.propertyContract.getPeriodList(flag)
    console.log('====list::', list[0].toString())
  });
});
