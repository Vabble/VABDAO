const { expect } = require('chai');
const { ethers, waffle } = require('hardhat');
const ERC20 = require('../data/ERC20.json');
const { CONFIG, getBigNumber, getProposalFilm } = require('../scripts/utils');
  
// ** TX sender's ETH/Matic amount > gasPrice * blockGasLimit

describe('VabbleDAO', function () {
  before(async function () {
    this.VabbleDAOFactory = await ethers.getContractFactory('VabbleDAO');
    this.VoteFactory = await ethers.getContractFactory('Vote');
    this.UniHelperFactory = await ethers.getContractFactory('UniHelper');
    this.StakingPoolFactory = await ethers.getContractFactory('StakingPool');
    this.PropertyFactory = await ethers.getContractFactory('Property');
    this.OwnableFactory = await ethers.getContractFactory('Ownablee');

    this.signers = await ethers.getSigners();
    this.auditor = this.signers[0];
    this.newAuditor = this.signers[1];    
    this.studio1 = this.signers[2];   
  });

  beforeEach(async function () {    
    this.vabToken = new ethers.Contract(CONFIG.mumbai.vabToken, JSON.stringify(ERC20), ethers.provider);
    this.USDC = new ethers.Contract(CONFIG.mumbai.usdcAdress, JSON.stringify(ERC20), ethers.provider);

    this.ownableContract = await (await this.OwnableFactory.deploy()).deployed(); 

    this.uniHelperContract = await (await this.UniHelperFactory.deploy(
      CONFIG.mumbai.uniswap.factory, CONFIG.mumbai.uniswap.router, CONFIG.mumbai.sushiswap.factory, CONFIG.mumbai.sushiswap.router
    )).deployed();

    this.stakingContract = await (await this.StakingPoolFactory.deploy(this.ownableContract.address)).deployed(); 

    this.voteContract = await (await this.VoteFactory.deploy(this.ownableContract.address)).deployed();
    
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
        this.ownableContract.address,
        this.voteContract.address,
        this.stakingContract.address,
        this.uniHelperContract.address,
        this.propertyContract.address
      )
    ).deployed();

    // Transfering VAB token to studio1, 2, 3
    await this.vabToken.connect(this.auditor).transfer(this.studio1.address, getBigNumber(50000000), {from: this.auditor.address});
    await this.vabToken.connect(this.studio1).approve(this.DAOContract.address, getBigNumber(100000000));

    expect(await this.ownableContract.auditor()).to.be.equal(this.auditor.address);
        
    const provider = waffle.provider
    const balance = await provider.getBalance(this.studio1.address)
    console.log('====studio1::', balance.toString());
    const balance1 = await provider.getBalance(this.auditor.address)
    console.log('====auditor::', balance1.toString());//9999984891174771500281
                                                      //100000001452399989048000
    // Auditor add studio1 in the studio whitelist
    await expect(
      this.ownableContract.addStudio([this.studio1.address])
    ).to.emit(this.ownableContract, 'StudioAdded').withArgs(this.auditor.address, this.studio1.address);    
      

    // Initialize StakingPool
    await this.stakingContract.connect(this.auditor).initializePool(
      this.DAOContract.address,
      this.voteContract.address,
      this.propertyContract.address,
      {from: this.auditor.address}
    )      
  });

  it('Should prospose films by studio', async function () {   

    let filmPropsoal = [];
    const arrSize = 250; // in test script
    // const arrSize = 200; // in mumbai polygonscan
    for(let i = 0; i < arrSize; i++) {
      // random integer between 0 and 9
      const rn = Math.floor(Math.random() * 9)
      let allowVab = false;
      if(rn > 5) allowVab = true;

      const film = [getBigNumber(rn * 100), getBigNumber(rn * 1000, 6), getBigNumber(rn * 864000, 0), allowVab]
      const byteData = getProposalFilm(film)
      filmPropsoal.push(byteData)        
    }
    
    // console.log('=====param data::', filmPropsoal)

    const tx = await this.DAOContract.connect(this.studio1).createProposalFilms(filmPropsoal, false, {from: this.studio1.address})   
    const events = (await tx.wait()).events;
    expect(events[6].args[1]).to.be.equal(this.studio1.address)
    const proposalIds = await this.DAOContract.getFilmIds(1);
    expect(proposalIds.length).to.be.equal(filmPropsoal.length)

  });  
});
