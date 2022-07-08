const { expect } = require('chai');
const { ethers } = require('hardhat');
const { CONFIG } = require('../scripts/utils');

describe('Ownerable', function () {
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

    this.stakingContract = await (await this.StakingPoolFactory.deploy()).deployed(); 

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
