const { expect } = require('chai');
const { BigNumber } = require('ethers');
const { ethers, network } = require('hardhat');
const { 
  FILM,
  ZERO_ADDRESS,
  CONFIG,
  TOKEN_TYPE,
  STATUS,
  getByteFilm,
  getBigNumber,
  getSignatures } = require('../scripts/utils');
  
describe('RentFilm', function () {
  before(async function () {
    this.RentFilmFactory = await ethers.getContractFactory('RentFilm');
    this.MockERC20Factory = await ethers.getContractFactory('MockERC20');
    this.VoteFilmFactory = await ethers.getContractFactory('VoteFilm');

    this.signers = await ethers.getSigners();
    this.auditor = this.signers[0];
    this.newAuditor = this.signers[1];
    this.customer = this.signers[3];
  });

  beforeEach(async function () {
    
    this.vabContract = await (await this.MockERC20Factory.deploy('Mock Token', 'VAB')).deployed();
    this.voteConract = await (await this.VoteFilmFactory.deploy()).deployed();

    this.rentContract = await (
      await this.RentFilmFactory.deploy(
        CONFIG.daoFeeAddress,
        this.vabContract.address,
        this.voteContract.address
      )
    ).deployed();   
    
  });

  describe('RentFilm functions', function () {
    it('Should register films', async function () {

      const films = [getByteFilm(), getByteFilm(), getByteFilm()]  
      await this.rentContract.registerFilms(films);
      const registerFilmIds = await this.rentContract.getRegisteredFilmIds();    
      console.log('=====films::', registerFilmIds.length+"=="+films.length)
      expect(registerFilmIds.length).to.be.equal(films.length); 
    });
  });

});
