const { expect } = require('chai');
const { ethers } = require('hardhat');
const { CONFIG, getBigNumber } = require('../scripts/utils');
const ERC20 = require('../data/ERC20.json');
const { BigNumber } = require('ethers');

describe('FactoryNFT', function () {
  before(async function () {        
    this.UniHelperFactory = await ethers.getContractFactory('UniHelper');
    this.StakingPoolFactory = await ethers.getContractFactory('StakingPool');
    this.NFTFactory = await ethers.getContractFactory('FactoryNFT');

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
    this.vabToken = new ethers.Contract(CONFIG.vabToken, JSON.stringify(ERC20), ethers.provider);
    this.DAI = new ethers.Contract(CONFIG.daiAddress, JSON.stringify(ERC20), ethers.provider);
    this.EXM = new ethers.Contract(CONFIG.exmAddress, JSON.stringify(ERC20), ethers.provider);

    this.uniHelperContract = await (await this.UniHelperFactory.deploy(
      CONFIG.uniswap.factory, CONFIG.uniswap.router
    )).deployed();

    this.stakingContract = await (await this.StakingPoolFactory.deploy()).deployed(); 

    this.NFTContract = await (
      await this.NFTFactory.deploy(
        CONFIG.vabToken,
        this.stakingContract.address,
        this.uniHelperContract.address,
        CONFIG.usdcAdress, 
        "Vabble NFT",
        "vnft"
      )
    ).deployed();    
    
    // ====== VAB
    // Transfering VAB token to user1, 2, 3
    await this.vabToken.connect(this.auditor).transfer(this.customer1.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer2.address, getBigNumber(10000000), {from: this.auditor.address});
    await this.vabToken.connect(this.auditor).transfer(this.customer3.address, getBigNumber(10000000), {from: this.auditor.address});
    // Approve to transfer VAB token for each user, studio to DAO, StakingPool
    await this.vabToken.connect(this.customer1).approve(this.NFTContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer2).approve(this.NFTContract.address, getBigNumber(100000000));
    await this.vabToken.connect(this.customer3).approve(this.NFTContract.address, getBigNumber(100000000));   
   

    // Confirm auditor
    expect(await this.NFTContract.auditor()).to.be.equal(this.auditor.address);
        
    // Auditor add studio1, 2 in the studio whitelist
    await expect(
      this.NFTContract.addStudio(this.studio1.address)
    ).to.emit(this.NFTContract, 'StudioAdded').withArgs(this.auditor.address, this.studio1.address); 
    await this.NFTContract.connect(this.auditor).addStudio(this.studio2.address, {from: this.auditor.address})
  });

  it("Should has the correct name and symbol ", async function () {
    expect(await this.NFTContract.name()).to.equal("Vabble NFT");
    expect(await this.NFTContract.symbol()).to.equal("vnft");
  });

  it('Should be setup baseURI by Auditor and mintInfo by studio ', async function () {
    await expect(
        this.NFTContract.connect(this.studio1).setBaseURI('https://ipfs.io/ipfs/', {from: this.studio1.address})
    ).to.be.revertedWith('Ownable: caller is not the auditor');

    await this.NFTContract.setBaseURI('https://ipfs.io/ipfs/')

    const maxMintAmount = getBigNumber(10000, 0) // 10000
    const mintPrice = getBigNumber(5, 6)         // 5 usdc(5 * 1e6)
    const feePercent = getBigNumber(2, 8)        // 2%(2 * 1e8) 100% = 1e10
    const mintAmount = getBigNumber(10, 0)       // 10
    await expect(
        this.NFTContract.connect(this.customer1).batchMintTo(
            this.customer3.address,
            this.studio1.address,
            this.vabToken.address,
            mintAmount,
            "studio1/a.json",
            {from: this.customer1.address}
        )
    ).to.be.revertedWith('batchMintTo: should set mint info by studio');

    await this.NFTContract.connect(this.studio1).setMintInfo(maxMintAmount, mintPrice, feePercent, {from: this.studio1.address})
    const mintInfo = await this.NFTContract.getMintInfo(this.studio1.address)
    expect(mintInfo.maxMintAmount_).to.be.equal(maxMintAmount)
    expect(mintInfo.mintPrice_).to.be.equal(mintPrice)
    expect(mintInfo.feePercent_).to.be.equal(feePercent)
  });

  it('Should mint a token with token ID 1~10 to customer2, 11~15 customer3 from customer1 with VAB token', async function () {
    const base_uri = 'https://ipfs.io/ipfs/'
    await this.NFTContract.setBaseURI(base_uri)

    // Set mint info
    const maxMintAmount = getBigNumber(10000, 0) // 10000
    const mintPrice = getBigNumber(5, 6)         // 5 usdc(5 * 1e6)
    const feePercent = getBigNumber(2, 8)        // 2%(2 * 1e8) 100% = 1e10
    await this.NFTContract.connect(this.studio1).setMintInfo(maxMintAmount, mintPrice, feePercent, {from: this.studio1.address})
    
    // Check studio1 balance before mint
    const studio1_v1 = await this.vabToken.balanceOf(this.studio1.address)
    console.log('===studio1_v::', studio1_v1.toString())

    //=>  Mint multiple NFT to customer3 from customer1
    const mintAmount_1 = getBigNumber(10, 0) // 10
    const token_uri_1 = "studio1/a.json"
    await this.NFTContract.connect(this.customer1).batchMintTo(
        this.customer3.address,
        this.studio1.address,
        this.vabToken.address,
        mintAmount_1,
        token_uri_1,
        {from: this.customer1.address}
    )
    expect(await this.NFTContract.ownerOf(1)).to.be.equal(this.customer3.address)
    expect(await this.NFTContract.ownerOf(5)).to.be.equal(this.customer3.address)
    expect(await this.NFTContract.ownerOf(10)).to.be.equal(this.customer3.address)
    expect(await this.NFTContract.balanceOf(this.customer3.address)).to.be.equal(mintAmount_1) // 10

    // Check studio1 balance after mint
    const studio1_v2 = await this.vabToken.balanceOf(this.studio1.address)
    console.log('===studio1_v2::', studio1_v2.toString()) // 32601267934601269934601

    //=>  Mint multiple NFT to customer2 from customer1
    const mintAmount_2 = getBigNumber(5, 0)
    const token_uri_2 = "studio2/abc.json"
    await this.NFTContract.connect(this.customer1).batchMintTo(
        this.customer2.address,
        this.studio1.address,
        this.vabToken.address,
        mintAmount_2,
        token_uri_2,
        {from: this.customer1.address}
    )
    expect(await this.NFTContract.ownerOf(11)).to.be.equal(this.customer2.address)
    expect(await this.NFTContract.ownerOf(12)).to.be.equal(this.customer2.address)
    expect(await this.NFTContract.ownerOf(15)).to.be.equal(this.customer2.address)
    expect(await this.NFTContract.balanceOf(this.customer2.address)).to.be.equal(mintAmount_2) // 5
    
    // Check totalSupply
    const totalMinted = BigNumber.from(mintAmount_1).add(mintAmount_2) 
    expect(await this.NFTContract.totalSupply()).to.be.equal(totalMinted) // 15
    
    // Check baseURI    
    expect(await this.NFTContract.baseUri()).to.be.equal(base_uri) // https://ipfs.io/ipfs/

    // Check tokenURI
    expect(await this.NFTContract.tokenURI(1)).to.be.equal(base_uri + token_uri_1) // https://ipfs.io/ipfs/studio1/a.json
    expect(await this.NFTContract.tokenURI(11)).to.be.equal(base_uri + token_uri_2)// https://ipfs.io/ipfs/studio2/abc.json
  });

  it('Should mint a token with token ID 1, 2 to customer3 from customer1 with other token', async function () {
    // ====== EXM
    // Transfering VAB token to user1, 2, 3
    await this.EXM.connect(this.auditor).transfer(this.customer1.address, getBigNumber(100000), {from: this.auditor.address});
    await this.EXM.connect(this.auditor).transfer(this.customer2.address, getBigNumber(100000), {from: this.auditor.address});
    await this.EXM.connect(this.auditor).transfer(this.customer3.address, getBigNumber(100000), {from: this.auditor.address});
    // Approve to transfer VAB token for each user, studio to DAO, StakingPool
    await this.EXM.connect(this.customer1).approve(this.NFTContract.address, getBigNumber(1000000));
    await this.EXM.connect(this.customer2).approve(this.NFTContract.address, getBigNumber(1000000));
    await this.EXM.connect(this.customer3).approve(this.NFTContract.address, getBigNumber(1000000));   
    
    const base_uri = 'https://ipfs.io/ipfs/'
    await this.NFTContract.setBaseURI(base_uri)

    // Set mint info
    const maxMintAmount = getBigNumber(100000, 0) // 100000
    const mintPrice = getBigNumber(2, 6)         // 2 usdc(2 * 1e6)
    const feePercent = getBigNumber(1, 8)        // 1%(1e8) 100% = 1e10
    await this.NFTContract.connect(this.studio2).setMintInfo(maxMintAmount, mintPrice, feePercent, {from: this.studio2.address})
    
    // Check studio1 EXM balance before mint
    const studio1_v1 = await this.EXM.balanceOf(this.studio2.address) // 0
    console.log('===studio1_v::', studio1_v1.toString())

    //=>  Mint multiple NFT to customer3 from customer1
    const mintAmount_1 = getBigNumber(2, 0)
    const token_uri_1 = "studio2/a.json"
    await this.NFTContract.connect(this.customer1).batchMintTo(
        this.customer3.address,
        this.studio2.address,
        this.EXM.address,
        mintAmount_1,
        token_uri_1,
        {from: this.customer1.address}
    )
    expect(await this.NFTContract.ownerOf(1)).to.be.equal(this.customer3.address)
    expect(await this.NFTContract.ownerOf(2)).to.be.equal(this.customer3.address)
    expect(await this.NFTContract.balanceOf(this.customer3.address)).to.be.equal(mintAmount_1) // 1, 2

    // Check studio1 balance after mint
    const studio1_v2 = await this.EXM.balanceOf(this.studio2.address)
    console.log('===studio1_v2::', studio1_v2.toString()) //
  });
});
