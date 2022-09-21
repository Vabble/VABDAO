const { expect } = require('chai');
const { ethers } = require('hardhat');
const { CONFIG } = require('../scripts/utils');
const ERC20 = require('../data/ERC20.json');

describe('Ownerable', function () {
  before(async function () {
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
    this.vabToken = new ethers.Contract(CONFIG.rinkeby.vabToken, JSON.stringify(ERC20), ethers.provider);
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
    
  });

  it('Transfer ownership and Add studio', async function () {
    // Auditor is contract deployer
    expect(await this.DAOContract.auditor()).to.be.equal(this.auditor.address);

    // Check if studio1 is studio
    expect(await this.DAOContract.isStudio(this.studio1.address)).to.be.false;  
    
    // Add studio1 address to studio list
    await this.DAOContract.addStudio(this.studio1.address);
    
    // Check if studio1 is studio after add studio1 to studiolist
    expect(await this.DAOContract.isStudio(this.studio1.address)).to.be.true;  

    // Transfer auditor to new address
    await this.DAOContract.transferAuditor(this.newAuditor.address);
    
    expect(await this.DAOContract.auditor()).to.be.equal(this.newAuditor.address);  
          
  });
});
