const { expect } = require('chai');
const { ethers } = require('hardhat');
const { CONFIG } = require('../scripts/utils');
const ERC20 = require('../data/ERC20.json');

describe('Ownablee', function () {
  before(async function () {
    this.OwnableFactory = await ethers.getContractFactory('Ownablee');
    this.VabbleDAOFactory = await ethers.getContractFactory('VabbleDAO');
    this.VoteFactory = await ethers.getContractFactory('Vote');
    this.UniHelperFactory = await ethers.getContractFactory('UniHelper');
    this.StakingPoolFactory = await ethers.getContractFactory('StakingPool');
    this.PropertyFactory = await ethers.getContractFactory('Property');

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
    this.USDC = new ethers.Contract(CONFIG.mumbai.usdcAdress, JSON.stringify(ERC20), ethers.provider);

    this.ownableContract = await (await this.OwnableFactory.deploy()).deployed(); 

    this.voteContract = await (await this.VoteFactory.deploy(
      this.vabToken.address, this.ownableContract.address
    )).deployed();

    this.uniHelperContract = await (await this.UniHelperFactory.deploy(
      CONFIG.mumbai.uniswap.factory, CONFIG.mumbai.uniswap.router, CONFIG.mumbai.sushiswap.factory, CONFIG.mumbai.sushiswap.router
    )).deployed();

    this.stakingContract = await (await this.StakingPoolFactory.deploy(
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
    
  });

  it('Transfer ownership and Add studio', async function () {
    // Auditor is contract deployer
    expect(await this.ownableContract.auditor()).to.be.equal(this.auditor.address);

    // Check if studio1 is studio
    expect(await this.ownableContract.isStudio(this.studio1.address)).to.be.false;  
    
    // Add studio1 address to studio list
    const studioList = [this.studio1.address, this.studio2.address]
    await this.ownableContract.addStudio(studioList);
    
    // Check if studio1 is studio after add studio1 to studiolist
    expect(await this.ownableContract.isStudio(this.studio1.address)).to.be.true;  

    // Transfer auditor to new address
    await this.ownableContract.transferAuditor(this.newAuditor.address);
    
    expect(await this.ownableContract.auditor()).to.be.equal(this.newAuditor.address);  
          
  });
});
