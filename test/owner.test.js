const { expect } = require('chai');
const { ethers } = require('hardhat');
const { CONFIG } = require('../scripts/utils');

describe('Owner', function () {
  before(async function () {
    this.VabbleDAOFactory = await ethers.getContractFactory('VabbleDAO');
    // this.MockERC20Factory = await ethers.getContractFactory('MockERC20');
    this.VoteFactory = await ethers.getContractFactory('Vote');

    this.signers = await ethers.getSigners();
    this.auditor = this.signers[0];
    this.newAuditor = this.signers[1];
  });

  beforeEach(async function () {
    
    this.vabContract = await (await this.MockERC20Factory.deploy('Mock Token', 'VAB')).deployed();
    this.voteConract = await (await this.VoteFactory.deploy()).deployed();

    this.DAOContract = await (
      await this.VabbleDAOFactory.deploy(
        CONFIG.daoFeeAddress,
        CONFIG.vabToken,
        this.voteConract.address
      )
    ).deployed();   
    
  });

  describe('Checking ownership', function () {
    it('Transfer ownership', async function () {
      expect(await this.DAOContract.auditor()).to.be.equal(this.auditor.address);

      await this.DAOContract.transferAuditor(this.newAuditor.address);
      
      expect(await this.DAOContract.auditor()).to.be.equal(this.newAuditor.address);  
    });
  });
});
