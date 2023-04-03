const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');
const ERC20 = require('../data/ERC20.json');
const { CONFIG, getBigNumber, getVoteData, getProposalFilm } = require('../scripts/utils');

describe('Vote', function () {
  before(async function () {
    this.VabbleDAOFactory = await ethers.getContractFactory('VabbleDAO');
    this.VabbleFundingFactory = await ethers.getContractFactory('VabbleFunding');
    this.VoteFactory = await ethers.getContractFactory('Vote');
    this.UniHelperFactory = await ethers.getContractFactory('UniHelper');
    this.StakingPoolFactory = await ethers.getContractFactory('StakingPool');
    this.PropertyFactory = await ethers.getContractFactory('Property');
    this.OwnableFactory = await ethers.getContractFactory('Ownablee');
    this.NFTFilmFactory = await ethers.getContractFactory('FactoryFilmNFT');

    this.signers = await ethers.getSigners();
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
  });

  beforeEach(async function () {
    this.vabToken = new ethers.Contract(CONFIG.mumbai.vabToken, JSON.stringify(ERC20), ethers.provider);
    this.EXM = new ethers.Contract(CONFIG.mumbai.exmAddress, JSON.stringify(ERC20), ethers.provider);
    this.USDC = new ethers.Contract(CONFIG.mumbai.usdcAdress, JSON.stringify(ERC20), ethers.provider);

    this.ownableContract = await (await this.OwnableFactory.deploy(
      CONFIG.daoWalletAddress, this.vabToken.address, this.USDC.address
    )).deployed();

    this.uniHelperContract = await (await this.UniHelperFactory.deploy(
      CONFIG.mumbai.uniswap.factory, CONFIG.mumbai.uniswap.router, CONFIG.mumbai.sushiswap.factory, CONFIG.mumbai.sushiswap.router
    )).deployed();

    this.stakingContract = await (await this.StakingPoolFactory.deploy(this.ownableContract.address)).deployed(); 

    this.voteContract = await (await this.VoteFactory.deploy(this.ownableContract.address)).deployed();
    
    this.propertyContract = await (
      await this.PropertyFactory.deploy(
        this.ownableContract.address,
        this.uniHelperContract.address,
        this.voteContract.address,
        this.stakingContract.address
      )
    ).deployed();

    this.NFTFilmContract = await (
      await this.NFTFilmFactory.deploy(this.ownableContract.address, this.uniHelperContract.address)
    ).deployed();  

    this.DAOContract = await (
      await this.VabbleDAOFactory.deploy(
        this.ownableContract.address,
        this.uniHelperContract.address,
        this.voteContract.address,
        this.stakingContract.address,
        this.propertyContract.address,
        this.NFTFilmContract.address
      )
    ).deployed();    

    this.VabbleFunding = await (
      await this.VabbleFundingFactory.deploy(
        this.ownableContract.address,      // Ownablee contract
        this.uniHelperContract.address,     // UniHelper contract
        this.stakingContract.address,   // StakingPool contract
        this.propertyContract.address,      // Property contract
        this.NFTFilmContract.address,// film NFT Factory contract
        this.DAOContract.address 
      )
    ).deployed(); 

    await this.ownableContract.connect(this.auditor).setupVote(this.voteContract.address, {from: this.auditor.address})  
    
    this.auditorBalance = await this.vabToken.balanceOf(this.auditor.address) // 145M
    // console.log("====auditorBalance::", this.auditorBalance.toString())    

    // Approve to transfer VAB token for each user, studio to DAO, StakingPool
    await this.vabToken.connect(this.customer1).approve(this.DAOContract.address, this.auditorBalance);
    await this.vabToken.connect(this.customer2).approve(this.DAOContract.address, this.auditorBalance);
    await this.vabToken.connect(this.customer3).approve(this.DAOContract.address, this.auditorBalance);  

    await this.vabToken.connect(this.customer1).approve(this.stakingContract.address, this.auditorBalance);
    await this.vabToken.connect(this.customer2).approve(this.stakingContract.address, this.auditorBalance);
    await this.vabToken.connect(this.customer3).approve(this.stakingContract.address, this.auditorBalance);
    await this.vabToken.connect(this.customer4).approve(this.stakingContract.address, this.auditorBalance);
    await this.vabToken.connect(this.customer5).approve(this.stakingContract.address, this.auditorBalance);
    await this.vabToken.connect(this.customer6).approve(this.stakingContract.address, this.auditorBalance);
    await this.vabToken.connect(this.customer7).approve(this.stakingContract.address, this.auditorBalance);

    await this.vabToken.connect(this.customer1).approve(this.propertyContract.address, this.auditorBalance);
    await this.vabToken.connect(this.customer2).approve(this.propertyContract.address, this.auditorBalance);
    await this.vabToken.connect(this.customer3).approve(this.propertyContract.address, this.auditorBalance);

    await this.vabToken.connect(this.studio1).approve(this.DAOContract.address, this.auditorBalance);
    await this.vabToken.connect(this.studio2).approve(this.DAOContract.address, this.auditorBalance);
    await this.vabToken.connect(this.studio3).approve(this.DAOContract.address, this.auditorBalance);
    await this.vabToken.connect(this.studio1).approve(this.stakingContract.address, this.auditorBalance);
    await this.vabToken.connect(this.studio2).approve(this.stakingContract.address, this.auditorBalance);
    await this.vabToken.connect(this.studio3).approve(this.stakingContract.address, this.auditorBalance);

    this.rentPrices = [getBigNumber(100), getBigNumber(200), getBigNumber(300), getBigNumber(400)];
    this.fundPeriods = [getBigNumber(20 * 86400, 0), getBigNumber(30 * 86400, 0), getBigNumber(60 * 86400, 0), getBigNumber(10 * 86400, 0)];
    this.filmPropsoal = [];
    this.events = [];
    this.voteInfo = [1, 2, 3] // yes, no, abstain
  });

  // it('VoteToFilms', async function () {    
  //   // Transfering VAB token to user1, 2, 3 and studio1,2,3
  //   await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(10000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.customer2.address, getBigNumber(10000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.customer3.address, getBigNumber(10000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.studio1.address, getBigNumber(10000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.studio2.address, getBigNumber(10000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.studio3.address, getBigNumber(10000000), {from: this.auditor.address});

  //   //=> voteToFilms()
  //   const proposalIds = [1, 2, 3, 4]
  //   const voteInfos = [1, 1, 2, 3];
  //   const voteData = getVoteData(proposalIds, voteInfos)
  //   await expect(
  //     this.voteContract.connect(this.customer1).voteToFilms(voteData, {from: this.customer1.address})
  //   ).to.be.revertedWith('function call to a non-contract account')

  //   // Initialize Vote contract
  //   await this.voteContract.connect(this.auditor).initializeVote(
  //     this.DAOContract.address,
  //     this.stakingContract.address,
  //     this.propertyContract.address,
  //   )

  //   await expect(
  //     this.voteContract.connect(this.customer1).voteToFilms(voteData, {from: this.customer1.address})
  //   ).to.be.revertedWith('Not staker')
    
  //   // Initialize StakingPool
  //   await this.stakingContract.connect(this.auditor).initializePool(
  //     this.DAOContract.address,
  //     this.voteContract.address,
  //     this.propertyContract.address,
  //     {from: this.auditor.address}
  //   )
  //   // Staking from customer1,2,3 for vote
  //   const stakeAmount = getBigNumber(200)
  //   await this.stakingContract.connect(this.customer1).stakeVAB(stakeAmount, {from: this.customer1.address})
  //   await this.stakingContract.connect(this.customer2).stakeVAB(stakeAmount, {from: this.customer2.address})
  //   await this.stakingContract.connect(this.customer3).stakeVAB(stakeAmount, {from: this.customer3.address})
  //   await this.stakingContract.connect(this.studio1).stakeVAB(stakeAmount, {from: this.studio1.address})
       
  //   // Deposit to contract(VAB amount : 100, 200, 300)
  //   await this.stakingContract.connect(this.customer1).depositVAB(getBigNumber(100), {from: this.customer1.address})
  //   await this.stakingContract.connect(this.customer2).depositVAB(getBigNumber(200), {from: this.customer2.address})
  //   await this.stakingContract.connect(this.customer3).depositVAB(getBigNumber(300), {from: this.customer3.address})

  //   // Create proposal for four films by studio
  //   const raiseAmounts = [getBigNumber(0), getBigNumber(0), getBigNumber(3000, 6), getBigNumber(3000, 6)];
  //   const onlyAllowVABs = [true, true, false, false];
  //   const film_1 = [this.rentPrices[0], raiseAmounts[0], this.fundPeriods[0], onlyAllowVABs[0], false]
  //   const film_2 = [this.rentPrices[1], raiseAmounts[1], this.fundPeriods[1], onlyAllowVABs[1], false]
  //   const film_3 = [this.rentPrices[2], raiseAmounts[2], this.fundPeriods[2], onlyAllowVABs[2], false]
  //   const film_4 = [this.rentPrices[3], raiseAmounts[3], this.fundPeriods[3], onlyAllowVABs[3], false]
  //   this.filmPropsoal = [getProposalFilm(film_1), getProposalFilm(film_2), getProposalFilm(film_3), getProposalFilm(film_4)]
  //   await this.DAOContract.connect(this.studio1).proposalMultiFilms(this.filmPropsoal, {from: this.studio1.address})
    
  //   await this.voteContract.connect(this.customer1).voteToFilms(voteData, {from: this.customer1.address}) //1,1,2,3
  //   await this.voteContract.connect(this.customer2).voteToFilms(voteData, {from: this.customer2.address}) //1,1,2,3
  //   await this.voteContract.connect(this.customer3).voteToFilms(voteData, {from: this.customer3.address}) //1,1,2,3    
  // });

  // it('VoteToAgent', async function () {    
  //   // Initialize StakingPool
  //   await this.stakingContract.connect(this.auditor).initializePool(
  //     this.DAOContract.address,
  //     this.voteContract.address,
  //     this.propertyContract.address,
  //     {from: this.auditor.address}
  //   )    
  //   await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(100000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.customer2.address, getBigNumber(100000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.customer3.address, getBigNumber(100000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.customer4.address, getBigNumber(100000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.customer5.address, getBigNumber(100000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.customer6.address, getBigNumber(100000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.customer7.address, getBigNumber(100000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.studio1.address, getBigNumber(100000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.studio2.address, getBigNumber(100000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.studio3.address, getBigNumber(100000000), {from: this.auditor.address});
        
  //   const stakeAmount = getBigNumber(200)
  //   await this.stakingContract.connect(this.customer1).stakeVAB(getBigNumber(75000000), {from: this.customer1.address})
  //   await this.stakingContract.connect(this.customer2).stakeVAB(stakeAmount, {from: this.customer2.address})
  //   await this.stakingContract.connect(this.customer3).stakeVAB(stakeAmount, {from: this.customer3.address})
  //   await this.stakingContract.connect(this.customer4).stakeVAB(stakeAmount, {from: this.customer4.address})
  //   await this.stakingContract.connect(this.customer5).stakeVAB(stakeAmount, {from: this.customer5.address})
  //   await this.stakingContract.connect(this.customer6).stakeVAB(stakeAmount, {from: this.customer6.address})
  //   await this.stakingContract.connect(this.customer7).stakeVAB(stakeAmount, {from: this.customer7.address})
    
  //   // Initialize Vote contract
  //   await this.voteContract.connect(this.auditor).initializeVote(
  //     this.DAOContract.address,
  //     this.stakingContract.address,
  //     this.propertyContract.address,
  //   )
    
  //   // Call voteToAgent before create the proposal
  //   await expect(
  //     this.voteContract.connect(this.customer2).voteToAgent(this.auditorAgent1.address, this.voteInfo[0], 0, {from: this.customer2.address})
  //   ).to.be.revertedWith('agent elapsed vote period')

  //   // Create proposal for Auditor
  //   await this.propertyContract.connect(this.customer1).proposalAuditor(this.auditorAgent1.address, "test-1", "desc-1", {from: this.customer1.address});
  //   await this.propertyContract.connect(this.customer2).proposalAuditor(this.auditorAgent2.address, "test-2", "desc-2", {from: this.customer2.address});

  //   const customer1Balance = await this.vabToken.balanceOf(this.customer1.address)
  //   console.log("====customer1Balance::", customer1Balance.toString())
       
  //   // Call voteToAgent with index=3(avaliable index: 0, 1)
  //   await expect(
  //     this.voteContract.connect(this.customer2).voteToAgent(this.auditor.address, this.voteInfo[0], 0, {from: this.customer2.address})
  //   ).to.be.revertedWith('voteToAgent: invalid index or no proposal')

  //   await this.voteContract.connect(this.customer2).voteToAgent(this.auditorAgent1.address, this.voteInfo[0], 0, {from: this.customer2.address});
  //   await this.voteContract.connect(this.customer3).voteToAgent(this.auditorAgent1.address, this.voteInfo[0], 0, {from: this.customer3.address});
  //   await this.voteContract.connect(this.customer4).voteToAgent(this.auditorAgent1.address, this.voteInfo[1], 0, {from: this.customer4.address});
  //   await this.voteContract.connect(this.customer5).voteToAgent(this.auditorAgent1.address, this.voteInfo[1], 0, {from: this.customer5.address});
  //   await this.voteContract.connect(this.customer6).voteToAgent(this.auditorAgent1.address, this.voteInfo[2], 0, {from: this.customer6.address});
  //   await this.voteContract.connect(this.customer7).voteToAgent(this.auditorAgent1.address, this.voteInfo[2], 0, {from: this.customer7.address});

  //   let tx = await this.voteContract.connect(this.customer1).voteToAgent(this.auditorAgent1.address, this.voteInfo[0], 0, {from: this.customer1.address})
  //   this.events = (await tx.wait()).events
  //   // console.log("====events::", this.events)
  //   const arg = this.events[0].args
  //   expect(this.customer1.address).to.be.equal(arg.voter)
  //   expect(this.voteInfo[0]).to.be.equal(arg.voteInfo)

  //   // Call voteToAgent again
  //   await expect(
  //     this.voteContract.connect(this.customer2).voteToAgent(this.auditorAgent1.address, this.voteInfo[1], 0, {from: this.customer2.address})
  //   ).to.be.revertedWith('voteToAgent: Already voted')

  //   // replaceAuditor
  //   await expect(
  //     this.voteContract.connect(this.customer2).replaceAuditor(this.auditorAgent1.address, {from: this.customer2.address})
  //   ).to.be.revertedWith('auditor vote period yet')
    
  //   const defaultAgentVotePeriod = 10 * 86400; // 10 days
  //   expect(await this.propertyContract.agentVotePeriod()).to.be.equal(defaultAgentVotePeriod)
    
  //   const defaultDisputeGracePeriod = 30 * 86400; // 30 days
  //   expect(await this.propertyContract.disputeGracePeriod()).to.be.equal(defaultDisputeGracePeriod)
    
  //   // => Increase next block timestamp
  //   network.provider.send('evm_increaseTime', [defaultDisputeGracePeriod]);
  //   await network.provider.send('evm_mine');

  //   await expect(
  //     this.voteContract.connect(this.customer2).replaceAuditor(this.auditorAgent1.address, {from: this.customer2.address})
  //   ).to.be.revertedWith('auditor dispute vote period yet')
    
  //   // => Increase next block timestamp
  //   network.provider.send('evm_increaseTime', [11 * 86400]); // 11 day
  //   await network.provider.send('evm_mine');

  //   await this.voteContract.connect(this.customer2).replaceAuditor(this.auditorAgent1.address, {from: this.customer2.address})

  //   const agentArr = await this.propertyContract.getGovProposalList(1);
  //   const agent1 = agentArr[0]; 
  //   const agent2 = agentArr[1];    
  //   console.log("====test-00", agent1, agent2)
  //   expect(agent1).to.be.equal(this.auditorAgent1.address)
  //   expect(agent2).to.be.equal(this.auditorAgent2.address) 

  //   // Transfer staking amount(over 75m)
  //   const transferAmount = getBigNumber(80000000) // 80m
  //   await this.vabToken.connect(this.auditor).transfer(this.customer1.address, transferAmount, {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.customer2.address, transferAmount, {from: this.auditor.address});

  //   // Staking
  //   await this.stakingContract.connect(this.customer1).stakeVAB(transferAmount, {from: this.customer1.address})
  //   await this.stakingContract.connect(this.customer2).stakeVAB(transferAmount, {from: this.customer2.address})

  //   const aud = await this.ownableContract.auditor(); 
  //   console.log("====new_aud", aud)
  // });

  it('voteToProperty', async function () {    
    // Initialize StakingPool
    await this.stakingContract.connect(this.auditor).initializePool(
      this.DAOContract.address,
      this.VabbleFunding.address,
      this.propertyContract.address,
      this.voteContract.address,
      {from: this.auditor.address}
    )    

    await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(90000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer2.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer3.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer4.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer5.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer6.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer7.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio1.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio2.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.studio3.address, getBigNumber(10000000), {from: this.auditor.address});
        
    const stakeAmount = getBigNumber(200)
    await this.stakingContract.connect(this.customer1).stakeVAB(getBigNumber(50000000), {from: this.customer1.address})
    await this.stakingContract.connect(this.customer2).stakeVAB(stakeAmount, {from: this.customer2.address})
    await this.stakingContract.connect(this.customer3).stakeVAB(stakeAmount, {from: this.customer3.address})
    await this.stakingContract.connect(this.customer4).stakeVAB(stakeAmount, {from: this.customer4.address})
    await this.stakingContract.connect(this.customer5).stakeVAB(stakeAmount, {from: this.customer5.address})
    await this.stakingContract.connect(this.customer6).stakeVAB(stakeAmount, {from: this.customer6.address})
    await this.stakingContract.connect(this.customer7).stakeVAB(stakeAmount, {from: this.customer7.address})

    // Initialize Vote contract
    await this.voteContract.connect(this.auditor).initializeVote(
      this.DAOContract.address,
      this.stakingContract.address,
      this.propertyContract.address,
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
    await this.propertyContract.connect(this.customer1).proposalProperty(property1, flag, 'test-1', 'desc-1', {from: this.customer1.address})
    await this.propertyContract.connect(this.customer2).proposalProperty(property2, flag, 'test-1', 'desc-1', {from: this.customer2.address})
    expect(await this.propertyContract.getProperty(0, flag)).to.be.equal(property1)
    expect(await this.propertyContract.getProperty(1, flag)).to.be.equal(property2)

    // voteToProperty
    await this.voteContract.connect(this.customer1).voteToProperty(this.voteInfo[0], indx, flag, {from: this.customer1.address})
    await this.voteContract.connect(this.customer2).voteToProperty(this.voteInfo[0], indx, flag, {from: this.customer2.address})
    await this.voteContract.connect(this.customer3).voteToProperty(this.voteInfo[0], indx, flag, {from: this.customer3.address})
    await this.voteContract.connect(this.customer4).voteToProperty(this.voteInfo[1], indx, flag, {from: this.customer4.address})
    await this.voteContract.connect(this.customer5).voteToProperty(this.voteInfo[2], indx, flag, {from: this.customer5.address})
    await this.voteContract.connect(this.customer6).voteToProperty(this.voteInfo[2], indx, flag, {from: this.customer6.address})
    console.log("====test-2")
    // => Increase next block timestamp
    network.provider.send('evm_increaseTime', [period_8]);
    await network.provider.send('evm_mine');

    // Call updateProperty() before vote period
    await expect(
      this.voteContract.connect(this.customer1).updateProperty(indx, flag, {from: this.customer1.address})
    ).to.be.revertedWith('property vote period yet')
    
    // => Increase next block timestamp
    network.provider.send('evm_increaseTime', [period_3]);
    await network.provider.send('evm_mine');

    let timeVal = await this.propertyContract.getPropertyProposalTime(property1, flag)
    console.log('=====timeVal before::', timeVal.cTime_.toString(), timeVal.aTime_.toString())

    // updateProperty
    await this.voteContract.connect(this.customer1).updateProperty(indx, flag, {from: this.customer1.address})
    const propertyVal = await this.propertyContract.getProperty(0, flag)
    timeVal = await this.propertyContract.getPropertyProposalTime(propertyVal, flag)
    console.log('=====timeVal after::', timeVal.cTime_.toString(), timeVal.aTime_.toString())
    // expect(await this.propertyContract.filmVotePeriod()).to.be.equal(property1)
    expect(await this.propertyContract.getProperty(0, flag)).to.be.equal(property1)

    const proposalInfo = await this.propertyContract.propertyProposalInfo(flag, propertyVal)
    console.log('=====proposalInfo::', proposalInfo)
    
    // TODO
    const voteResult = await this.voteContract.propertyVoting(flag, propertyVal);
    console.log('=====voteResult-0::', voteResult[0].toString())
    console.log('=====voteResult-1::', voteResult[1].toString())
    console.log('=====voteResult-2::', voteResult[2].toString())
    console.log('=====voteResult-3::', voteResult[3].toString())
    console.log('=====voteResult-4::', voteResult[4].toString())
    console.log('=====voteResult-5::', voteResult[5].toString())

    // 2 =================== proposalProperty(rewardRate) ======================
    await this.stakingContract.connect(this.customer1).stakeVAB(getBigNumber(30000000), {from: this.customer1.address})
    let rewardRate = await this.propertyContract.rewardRate();
    console.log('====defaultPropertyVal::', rewardRate.toString())
    let totalRewardAmount = await this.stakingContract.totalRewardAmount();
    console.log('====totalRewardAmount::', totalRewardAmount.toString())

    flag = 5;
    property1 = 50000; // 0.0005% (1% = 1e8, 100%=1e10)
    property2 = 80000; // 0.0008% (1% = 1e8, 100%=1e10)
    await this.propertyContract.connect(this.customer1).proposalProperty(property1, flag, 'test-1', 'desc-1', {from: this.customer1.address})
    await this.propertyContract.connect(this.customer2).proposalProperty(property2, flag, 'test-1', 'desc-1', {from: this.customer2.address})
    expect(await this.propertyContract.getProperty(0, flag)).to.be.equal(property1)
    expect(await this.propertyContract.getProperty(1, flag)).to.be.equal(property2)
    totalRewardAmount = await this.stakingContract.totalRewardAmount();
    console.log('====totalRewardAmount::', totalRewardAmount.toString())

    // voteToProperty
    await this.voteContract.connect(this.customer1).voteToProperty(this.voteInfo[0], indx, flag, {from: this.customer1.address})
    await this.voteContract.connect(this.customer2).voteToProperty(this.voteInfo[0], indx, flag, {from: this.customer2.address})
    await this.voteContract.connect(this.customer3).voteToProperty(this.voteInfo[2], indx, flag, {from: this.customer3.address})
    await this.voteContract.connect(this.customer4).voteToProperty(this.voteInfo[1], indx, flag, {from: this.customer4.address})
    await this.voteContract.connect(this.customer5).voteToProperty(this.voteInfo[2], indx, flag, {from: this.customer5.address})
    await this.voteContract.connect(this.customer6).voteToProperty(this.voteInfo[2], indx, flag, {from: this.customer6.address})
    console.log("====test-3")
    // => Increase next block timestamp
    network.provider.send('evm_increaseTime', [period_8]);
    await network.provider.send('evm_mine');
    
    // Call updateProperty() before vote period
    await expect(
      this.voteContract.connect(this.customer1).updateProperty(indx, flag, {from: this.customer1.address})
    ).to.be.revertedWith('property vote period yet')

    // => Increase next block timestamp
    network.provider.send('evm_increaseTime', [period_3]);
    await network.provider.send('evm_mine');

    // updateProperty
    await this.voteContract.connect(this.customer1).updateProperty(indx, flag, {from: this.customer1.address})
    rewardRate = await this.propertyContract.rewardRate()
    expect(rewardRate).to.be.equal(property1)
    expect(await this.propertyContract.getProperty(0, flag)).to.be.equal(property1)
    console.log('====rewardRate::', rewardRate.toString())

    const list = await this.propertyContract.getPropertyProposalList(flag)
    console.log('====list::', list[0].toString())
  });

  // it('voteToRewardAddress', async function () { 
  //   // Initialize StakingPool
  //   await this.stakingContract.connect(this.auditor).initializePool(
  //     this.DAOContract.address,
  //     this.voteContract.address,
  //     this.propertyContract.address,
  //     {from: this.auditor.address}
  //   )    

  //   await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(60000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.customer2.address, getBigNumber(60000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.customer3.address, getBigNumber(10000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.customer4.address, getBigNumber(10000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.customer5.address, getBigNumber(10000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.customer6.address, getBigNumber(10000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.customer7.address, getBigNumber(10000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.studio1.address, getBigNumber(10000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.studio2.address, getBigNumber(10000000), {from: this.auditor.address});
  //   await this.vabToken.connect(this.auditor).transfer(this.studio3.address, getBigNumber(10000000), {from: this.auditor.address});
        
  //   const stakeAmount = getBigNumber(200)
  //   await this.stakingContract.connect(this.customer1).stakeVAB(getBigNumber(50000000), {from: this.customer1.address})
  //   await this.stakingContract.connect(this.customer2).stakeVAB(getBigNumber(40000000), {from: this.customer2.address})
  //   await this.stakingContract.connect(this.customer3).stakeVAB(stakeAmount, {from: this.customer3.address})
  //   await this.stakingContract.connect(this.customer4).stakeVAB(stakeAmount, {from: this.customer4.address})
  //   await this.stakingContract.connect(this.customer5).stakeVAB(stakeAmount, {from: this.customer5.address})
  //   await this.stakingContract.connect(this.customer6).stakeVAB(stakeAmount, {from: this.customer6.address})
  //   await this.stakingContract.connect(this.customer7).stakeVAB(stakeAmount, {from: this.customer7.address})

  //   // Initialize Vote contract
  //   await this.voteContract.connect(this.auditor).initializeVote(
  //     this.DAOContract.address,
  //     this.stakingContract.address,
  //     this.propertyContract.address,
  //   )
    
  //   // Call voteToRewardAddress before create the proposal
  //   await expect(
  //     this.voteContract.connect(this.customer2).voteToRewardAddress(this.reward.address, this.voteInfo[0], {from: this.customer2.address})
  //   ).to.be.revertedWith('voteToRewardAddress: Not candidate')

  //   // Create proposal
  //   const title = "new reward fund address"
  //   const desc = "here description"
  //   await this.propertyContract.connect(this.customer1).proposalRewardFund(
  //     this.reward.address, 
  //     title,
  //     desc,
  //     {from: this.customer1.address}
  //   );

  //   const customer1Balance = await this.vabToken.balanceOf(this.customer1.address)
  //   console.log("====customer1Balance::", customer1Balance.toString())
       
  //   await this.voteContract.connect(this.customer2).voteToRewardAddress(
  //     this.reward.address, this.voteInfo[0], {from: this.customer2.address}
  //   );
  //   await this.voteContract.connect(this.customer3).voteToRewardAddress(
  //     this.reward.address, this.voteInfo[2], {from: this.customer3.address}
  //   );
  //   await this.voteContract.connect(this.customer4).voteToRewardAddress(
  //     this.reward.address, this.voteInfo[2], {from: this.customer4.address}
  //   );
  //   await this.voteContract.connect(this.customer5).voteToRewardAddress(
  //     this.reward.address, this.voteInfo[2], {from: this.customer5.address}
  //   );
  //   await this.voteContract.connect(this.customer6).voteToRewardAddress(
  //     this.reward.address, this.voteInfo[2], {from: this.customer6.address}
  //   );

  //   let tx = await this.voteContract.connect(this.customer1).voteToRewardAddress(
  //     this.reward.address, this.voteInfo[0], {from: this.customer1.address}
  //   );
  //   this.events = (await tx.wait()).events
  //   // console.log("====events::", this.events)
  //   const arg = this.events[0].args
  //   expect(this.customer1.address).to.be.equal(arg.voter)
  //   expect(this.reward.address).to.be.equal(arg.rewardAddress)
  //   expect(this.voteInfo[0]).to.be.equal(arg.voteInfo)
    
  //   // Call voteToRewardAddress again
  //   await expect(
  //     this.voteContract.connect(this.customer2).voteToRewardAddress(
  //       this.reward.address, this.voteInfo[0], {from: this.customer2.address}
  //     )
  //   ).to.be.revertedWith('voteToRewardAddress: Already voted')

  //   // => Change the minVoteCount from 5 ppl to 3 ppl for testing
  //   await this.propertyContract.connect(this.auditor).updatePropertyForTesting(3, 18, {from: this.auditor.address})
    
  //   // setDAORewardAddress
  //   await expect(
  //     this.voteContract.connect(this.customer2).setDAORewardAddress(this.reward.address, {from: this.customer2.address})
  //   ).to.be.revertedWith('reward vote period yet')

  //   // => Increase next block timestamp
  //   const defaultAgentVotePeriod = 31 * 86400; // 31 days
  //   network.provider.send('evm_increaseTime', [defaultAgentVotePeriod]);
  //   await network.provider.send('evm_mine');

  //   let rewardAddress = await this.propertyContract.DAO_FUND_REWARD(); 
  //   console.log("====rewardAddress-before::", rewardAddress)
  //   await this.voteContract.connect(this.customer2).setDAORewardAddress(this.reward.address, {from: this.customer2.address})

  //   rewardAddress = await this.propertyContract.DAO_FUND_REWARD(); 
  //   console.log("====rewardAddress-after::", rewardAddress)
  //   // 90092844245613213346606185
  //   // 90091944245613213346606185
  //   //      900000000000000000000
  //   expect(rewardAddress).to.be.equal(this.reward.address)

  //   let stakeContractVAB = await this.vabToken.balanceOf(this.stakingContract.address)
  //   let totalRewardAmountBefore = await this.stakingContract.totalRewardAmount()
  //   console.log("====totalRewardAmount-1::", totalRewardAmountBefore.toString(), stakeContractVAB.toString())
  //     // 9900 695134061569016881
  //     //10500 695134061569016881
  //   const item = await this.propertyContract.getRewardProposalInfo(this.reward.address)
  //   console.log("====item.title::", item)
  //   expect(title).to.be.equal(item[0])
  //   expect(desc).to.be.equal(item[1])

  //   // ===== Withdraw all fund from stakingPool to rewardAddres passed in vote
  //   const currentBalance = await this.vabToken.balanceOf(this.stakingContract.address)
  //   await expect(
  //     this.stakingContract.connect(this.auditor).withdrawAllFund({from: this.auditor.address})
  //   ).to.emit(this.stakingContract, 'RewardWithdraw').withArgs(rewardAddress, currentBalance); 
    
  //   remainBalance = await this.vabToken.balanceOf(this.stakingContract.address)
  //   newAddrBalance = await this.vabToken.balanceOf(rewardAddress)
  //   const daoVABBalance = await this.vabToken.balanceOf(this.DAOContract.address)
  //   console.log("====test-4", daoVABBalance.toString(), currentBalance.toString())
  //   expect(remainBalance).to.be.equal(0)
  //   expect(newAddrBalance).to.be.equal(currentBalance.add(daoVABBalance))
  // });
});
