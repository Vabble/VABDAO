const { expect } = require('chai');
const { ethers } = require('hardhat');
const { CONFIG } = require('../scripts/utils');

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
    
  });


  it('Testing', async function () {
  });
});
