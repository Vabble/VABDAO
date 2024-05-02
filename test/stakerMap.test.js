const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');
const ERC20 = require('../data/ERC20.json');
const { CONFIG, getBigNumber, DISCOUNT, getVoteData, getConfig } = require('../scripts/utils');

const GNOSIS_FLAG = false;

describe('StakerMap', function () {
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
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;
    console.log("Chain ID: ", chainId);
    const config = getConfig(chainId);
    
    // load ERC20 tokens
    this.vabToken = new ethers.Contract(config.vabToken, JSON.stringify(ERC20), ethers.provider);
    
    this.USDC = new ethers.Contract(config.usdcAdress, JSON.stringify(ERC20), ethers.provider);
    this.USDT = new ethers.Contract(config.usdtAdress, JSON.stringify(ERC20), ethers.provider);

    this.GnosisSafe = await (await this.GnosisSafeFactory.deploy()).deployed();
    this.auditor = GNOSIS_FLAG ? this.GnosisSafe : this.deployer;
        
    this.Ownablee = await (await this.OwnableFactory.deploy(
        CONFIG.daoWalletAddress, this.vabToken.address, this.USDC.address, this.auditor.address
    )).deployed();

    this.UniHelper = await (await this.UniHelperFactory.deploy(
        config.uniswap.factory, config.uniswap.router, 
        config.sushiswap.factory, config.sushiswap.router, this.Ownablee.address
    )).deployed();

    this.StakingPool = await (await this.StakingPoolFactory.deploy(this.Ownablee.address)).deployed();                     
  });

  
  it('stakerMap function test', async function () { 
    console.log("====stakerMap====");
    console.log([
      this.customer1.address, this.customer2.address, this.customer3.address, this.customer4.address
    ]);

    let stakerList = await this.StakingPool.getStakerList();
    expect(stakerList).to.be.deep.equal([]);
    
    await this.StakingPool.connect(this.customer1).stakerSet(this.customer1.address, 0, {from: this.customer1.address})
    stakerList = await this.StakingPool.getStakerList();
    expect(stakerList).to.be.deep.equal([this.customer1.address]);

    await this.StakingPool.connect(this.customer1).stakerSet(this.customer2.address, 1, {from: this.customer1.address})
    stakerList = await this.StakingPool.getStakerList();
    expect(stakerList).to.be.deep.equal([this.customer1.address, this.customer2.address]);    

    await this.StakingPool.connect(this.customer1).stakerSet(this.customer3.address, 2, {from: this.customer1.address})
    stakerList = await this.StakingPool.getStakerList();
    expect(stakerList).to.be.deep.equal([this.customer1.address, this.customer2.address, this.customer3.address]);    

    await this.StakingPool.connect(this.customer1).stakerSet(this.customer4.address, 3, {from: this.customer1.address})
    stakerList = await this.StakingPool.getStakerList();
    expect(stakerList).to.be.deep.equal([this.customer1.address, this.customer2.address, this.customer3.address, this.customer4.address]);    

    // add duplicated address
    await this.StakingPool.connect(this.customer1).stakerSet(this.customer1.address, 0, {from: this.customer1.address})
    stakerList = await this.StakingPool.getStakerList();
    expect(stakerList).to.be.deep.equal([this.customer1.address, this.customer2.address, this.customer3.address, this.customer4.address]);    

    await this.StakingPool.connect(this.customer1).stakerSet(this.customer2.address, 1, {from: this.customer1.address})
    stakerList = await this.StakingPool.getStakerList();
    expect(stakerList).to.be.deep.equal([this.customer1.address, this.customer2.address, this.customer3.address, this.customer4.address]);    

    await this.StakingPool.connect(this.customer1).stakerSet(this.customer3.address, 2, {from: this.customer1.address})
    stakerList = await this.StakingPool.getStakerList();
    expect(stakerList).to.be.deep.equal([this.customer1.address, this.customer2.address, this.customer3.address, this.customer4.address]);    

    await this.StakingPool.connect(this.customer1).stakerSet(this.customer4.address, 3, {from: this.customer1.address})
    stakerList = await this.StakingPool.getStakerList();
    expect(stakerList).to.be.deep.equal([this.customer1.address, this.customer2.address, this.customer3.address, this.customer4.address]);    

    // remove last address
    await this.StakingPool.connect(this.customer1).stakerRemove(this.customer4.address, {from: this.customer1.address})
    stakerList = await this.StakingPool.getStakerList();
    expect(stakerList).to.be.deep.equal([this.customer1.address, this.customer2.address, this.customer3.address]);

    // remove middle address
    await this.StakingPool.connect(this.customer1).stakerRemove(this.customer2.address, {from: this.customer1.address})
    stakerList = await this.StakingPool.getStakerList();
    expect(stakerList).to.be.deep.equal([this.customer1.address, this.customer3.address]);

    // remove first address
    await this.StakingPool.connect(this.customer1).stakerRemove(this.customer1.address, {from: this.customer1.address})
    stakerList = await this.StakingPool.getStakerList();
    expect(stakerList).to.be.deep.equal([this.customer3.address]);

    // remove non exist address
    await this.StakingPool.connect(this.customer1).stakerRemove(this.customer1.address, {from: this.customer1.address})
    stakerList = await this.StakingPool.getStakerList();
    expect(stakerList).to.be.deep.equal([this.customer3.address]);

    // remove 1 address
    await this.StakingPool.connect(this.customer1).stakerRemove(this.customer3.address, {from: this.customer1.address})
    stakerList = await this.StakingPool.getStakerList();
    expect(stakerList).to.be.deep.equal([]);

    // add again
    await this.StakingPool.connect(this.customer1).stakerSet(this.customer1.address, 0, {from: this.customer1.address})
    stakerList = await this.StakingPool.getStakerList();
    expect(stakerList).to.be.deep.equal([this.customer1.address]);

    await this.StakingPool.connect(this.customer1).stakerSet(this.customer2.address, 1, {from: this.customer1.address})
    stakerList = await this.StakingPool.getStakerList();
    expect(stakerList).to.be.deep.equal([this.customer1.address, this.customer2.address]);    

    await this.StakingPool.connect(this.customer1).stakerSet(this.customer3.address, 2, {from: this.customer1.address})
    stakerList = await this.StakingPool.getStakerList();
    expect(stakerList).to.be.deep.equal([this.customer1.address, this.customer2.address, this.customer3.address]);    

    await this.StakingPool.connect(this.customer1).stakerSet(this.customer4.address, 3, {from: this.customer1.address})
    stakerList = await this.StakingPool.getStakerList();
    expect(stakerList).to.be.deep.equal([this.customer1.address, this.customer2.address, this.customer3.address, this.customer4.address]);    

    // remove 2nd address
    await this.StakingPool.connect(this.customer1).stakerRemove(this.customer2.address, {from: this.customer1.address})
    stakerList = await this.StakingPool.getStakerList();    
    expect(stakerList).to.be.deep.equal([this.customer1.address, this.customer4.address, this.customer3.address]);

    // remove 2nd address
    await this.StakingPool.connect(this.customer1).stakerRemove(this.customer4.address, {from: this.customer1.address})
    stakerList = await this.StakingPool.getStakerList();
    expect(stakerList).to.be.deep.equal([this.customer1.address, this.customer3.address]);

    // remove 2nd address
    await this.StakingPool.connect(this.customer1).stakerRemove(this.customer3.address, {from: this.customer1.address})
    stakerList = await this.StakingPool.getStakerList();
    expect(stakerList).to.be.deep.equal([this.customer1.address]);

    // remove 1 address
    await this.StakingPool.connect(this.customer1).stakerRemove(this.customer1.address, {from: this.customer1.address})
    stakerList = await this.StakingPool.getStakerList();
    expect(stakerList).to.be.deep.equal([]);
  });
});
