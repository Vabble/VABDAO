const { ethers } = require('hardhat');
const { expect } = require('chai');

const { CONFIG, getBigNumber, DISCOUNT } = require('../scripts/utils');
const { generateSignature, executeGnosisSafeTransaction } = require('../scripts/gnosis-safe');
// const {approveWithdrawFromStakePool} = require('../scripts/gnosis-approvePendingWithdraw');
const ERC20 = require('../data/ERC20.json');
const FERC20 = require('../data/FxERC20.json');

require('dotenv').config();

const GNOSIS_FLAG = true;

describe('SetFinalFilm', function () {
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

        this.studio1 = this.signers[2];    
        this.studio2 = this.signers[3];       
        this.studio3 = this.signers[4]; 
        this.customer1 = this.signers[5];
        this.customer2 = this.signers[6];
        this.customer3 = this.signers[7];
        this.customer4 = this.signers[8];
        this.customer5 = this.signers[9];
        this.customer6 = this.signers[10];
        this.customer7 = this.signers[11];       

        this.signer1 = new ethers.Wallet(process.env.PK1, ethers.provider);
        this.signer2 = new ethers.Wallet(process.env.PK2, ethers.provider);        
    });
    beforeEach(async function () {
        // load ERC20 tokens
        if (CONFIG.mumbai.vabToken == "0x5cBbA5484594598a660636eFb0A1AD953aFa4e32")
            this.vabToken = new ethers.Contract(CONFIG.mumbai.vabToken, JSON.stringify(ERC20), ethers.provider);
        else
            this.vabToken = new ethers.Contract(CONFIG.mumbai.vabToken, JSON.stringify(FERC20), ethers.provider);
        
        this.USDC = new ethers.Contract(CONFIG.mumbai.usdcAdress, JSON.stringify(ERC20), ethers.provider);
        this.EXM = new ethers.Contract(CONFIG.mumbai.exmAddress, JSON.stringify(ERC20), ethers.provider);
        
        // --------------- Deploy Contracts -------------------------------------------------------------------
        this.GnosisSafe = await (await this.GnosisSafeFactory.deploy()).deployed();
        this.auditor = GNOSIS_FLAG ? this.GnosisSafe : this.deployer;

        this.Ownablee = await (await this.OwnableFactory.deploy(
            CONFIG.daoWalletAddress, this.vabToken.address, this.USDC.address, this.auditor.address
        )).deployed();

        // Confirm auditor
        expect(await this.Ownablee.auditor()).to.be.equal(this.auditor.address);    
        expect(await this.Ownablee.deployer()).to.be.equal(this.deployer.address);

        this.UniHelper = await (await this.UniHelperFactory.deploy(
            CONFIG.mumbai.uniswap.factory, CONFIG.mumbai.uniswap.router, 
            CONFIG.mumbai.sushiswap.factory, CONFIG.mumbai.sushiswap.router, this.Ownablee.address
        )).deployed();

        this.StakingPool = await (await this.StakingPoolFactory.deploy(this.Ownablee.address)).deployed();                 
        this.Vote = await (await this.VoteFactory.deploy(this.Ownablee.address)).deployed();

        this.Property = await (
            await this.PropertyFactory.deploy(
              this.Ownablee.address,
              this.UniHelper.address,
              this.Vote.address,
              this.StakingPool.address
            )
        ).deployed();

        this.FilmNFT = await (
            await this.FactoryFilmNFTFactory.deploy(this.Ownablee.address)
        ).deployed();   
      
        this.SubNFT = await (
            await this.FactorySubNFTFactory.deploy(this.Ownablee.address, this.UniHelper.address)
        ).deployed();   
      
        this.VabbleFund = await (
            await this.VabbleFundFactory.deploy(
              this.Ownablee.address,
              this.UniHelper.address,
              this.StakingPool.address,
              this.Property.address,
              this.FilmNFT.address
            )
        ).deployed();   
      
        this.VabbleDAO = await (
            await this.VabbleDAOFactory.deploy(
              this.Ownablee.address,
              this.UniHelper.address,
              this.Vote.address,
              this.StakingPool.address,
              this.Property.address,
              this.VabbleFund.address
            )
        ).deployed();     
          
        this.TierNFT = await (
            await this.FactoryTierNFTFactory.deploy(
              this.Ownablee.address, 
              this.VabbleDAO.address,
              this.VabbleFund.address
            )
        ).deployed(); 
      
        this.Subscription = await (
            await this.SubscriptionFactory.deploy(
              this.Ownablee.address,
              this.UniHelper.address,
              this.Property.address,
              [DISCOUNT.month3, DISCOUNT.month6, DISCOUNT.month12]
            )
        ).deployed();    


        // ---------------- Setup/Initialize the contracts with the deployer ----------------------------------
        await this.GnosisSafe.connect(this.deployer).setup(
            [this.signer1.address, this.signer2.address], 
            2, 
            CONFIG.addressZero, 
            "0x", 
            CONFIG.addressZero, 
            CONFIG.addressZero, 
            0, 
            CONFIG.addressZero, 
            {from: this.deployer.address}
        );

        await this.FilmNFT.connect(this.deployer).initialize(
            this.VabbleDAO.address, 
            this.VabbleFund.address,
            {from: this.deployer.address}
        ); 
      
        await this.StakingPool.connect(this.deployer).initialize(
            this.VabbleDAO.address,
            this.Property.address,
            this.Vote.address,
            {from: this.deployer.address}
        )  
          
        await this.Vote.connect(this.deployer).initialize(
            this.VabbleDAO.address,
            this.StakingPool.address,
            this.Property.address,
            {from: this.deployer.address}
        )

        await this.VabbleFund.connect(this.deployer).initialize(
            this.VabbleDAO.address,
            {from: this.deployer.address}
        )
      
        await this.UniHelper.connect(this.deployer).setWhiteList(
            this.VabbleDAO.address,
            this.VabbleFund.address,
            this.Subscription.address,
            this.FilmNFT.address,
            this.SubNFT.address,
            {from: this.deployer.address}
        )
      
        await this.Ownablee.connect(this.deployer).setup(
            this.Vote.address, this.VabbleDAO.address, this.StakingPool.address, 
            {from: this.deployer.address}
        )       

        if (GNOSIS_FLAG) {
            let encodedCallData = this.Ownablee.interface.encodeFunctionData("addDepositAsset", 
                [[this.vabToken.address, this.USDC.address, this.EXM.address, CONFIG.addressZero]]);

            // Generate Signature and Transaction information
            const {signatureBytes, tx} = await generateSignature(this.GnosisSafe, encodedCallData, this.Ownablee.address, [this.signer1, this.signer2]);

            await executeGnosisSafeTransaction(this.GnosisSafe, this.signer2, signatureBytes, tx);
        } else {
            await this.Ownablee.connect(this.auditor).addDepositAsset(
                [this.vabToken.address, this.USDC.address, this.EXM.address, CONFIG.addressZero], {from: this.auditor.address}
            )
        }

        // Initialize the VAB/USDC/EXM token for customers, studio, contracts         
        const source = this.deployer; // set token source

        if (CONFIG.mumbai.vabToken != "0x5cBbA5484594598a660636eFb0A1AD953aFa4e32") {
            await this.vabToken.connect(source).faucet(getBigNumber(50000000), {from: source.address});
            await this.vabToken.connect(source).faucet(getBigNumber(50000000), {from: source.address});
            await this.vabToken.connect(source).faucet(getBigNumber(50000000), {from: source.address});
            await this.vabToken.connect(source).faucet(getBigNumber(50000000), {from: source.address});
            await this.vabToken.connect(source).faucet(getBigNumber(50000000), {from: source.address});
        }

        // Transfering VAB token to user1, 2, 3        
        await this.vabToken.connect(source).transfer(this.customer1.address, getBigNumber(50000000), {from: source.address});
        await this.vabToken.connect(source).transfer(this.customer2.address, getBigNumber(50000000), {from: source.address});
        await this.vabToken.connect(source).transfer(this.customer3.address, getBigNumber(500000), {from: source.address});
        await this.vabToken.connect(source).transfer(this.customer4.address, getBigNumber(500000), {from: source.address});
        await this.vabToken.connect(source).transfer(this.customer5.address, getBigNumber(500000), {from: source.address});
        await this.vabToken.connect(source).transfer(this.customer6.address, getBigNumber(500000), {from: source.address});

        // Transfering VAB token to studio1, 2, 3
        await this.vabToken.connect(source).transfer(this.studio1.address, getBigNumber(500000), {from: source.address});
        await this.vabToken.connect(source).transfer(this.studio2.address, getBigNumber(500000), {from: source.address});
        await this.vabToken.connect(source).transfer(this.studio3.address, getBigNumber(500000), {from: source.address});

        // Approve to transfer VAB token for each customer, studio to StudioPool, StakingPool, FilmNFT
        await this.vabToken.connect(this.deployer).approve(this.VabbleDAO.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer1).approve(this.VabbleDAO.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer2).approve(this.VabbleDAO.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer3).approve(this.VabbleDAO.address, getBigNumber(100000000));   
        
        await this.vabToken.connect(this.deployer).approve(this.StakingPool.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer1).approve(this.StakingPool.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer2).approve(this.StakingPool.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer3).approve(this.StakingPool.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer4).approve(this.StakingPool.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer5).approve(this.StakingPool.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer6).approve(this.StakingPool.address, getBigNumber(100000000));
        
        await this.vabToken.connect(this.deployer).approve(this.FilmNFT.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer1).approve(this.FilmNFT.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer2).approve(this.FilmNFT.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer3).approve(this.FilmNFT.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer4).approve(this.FilmNFT.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer5).approve(this.FilmNFT.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer6).approve(this.FilmNFT.address, getBigNumber(100000000));

        await this.vabToken.connect(this.deployer).approve(this.VabbleDAO.address, getBigNumber(100000000));
        await this.vabToken.connect(this.studio1).approve(this.VabbleDAO.address, getBigNumber(100000000));
        await this.vabToken.connect(this.studio2).approve(this.VabbleDAO.address, getBigNumber(100000000));
        await this.vabToken.connect(this.studio3).approve(this.VabbleDAO.address, getBigNumber(100000000));
        
        await this.vabToken.connect(this.deployer).approve(this.StakingPool.address, getBigNumber(100000000));
        await this.vabToken.connect(this.studio1).approve(this.StakingPool.address, getBigNumber(100000000));
        await this.vabToken.connect(this.studio2).approve(this.StakingPool.address, getBigNumber(100000000));
        await this.vabToken.connect(this.studio3).approve(this.StakingPool.address, getBigNumber(100000000));

        // ====== EXM
        // Transfering EXM token to customer1, 2, 3
        await this.EXM.connect(source).transfer(this.customer1.address, getBigNumber(5000), {from: source.address});
        await this.EXM.connect(source).transfer(this.customer2.address, getBigNumber(5000), {from: source.address});
        await this.EXM.connect(source).transfer(this.customer3.address, getBigNumber(5000), {from: source.address});

        // Transfering EXM token to studio1, 2, 3
        await this.EXM.connect(source).transfer(this.studio1.address, getBigNumber(5000), {from: source.address});
        await this.EXM.connect(source).transfer(this.studio2.address, getBigNumber(5000), {from: source.address});
        await this.EXM.connect(source).transfer(this.studio3.address, getBigNumber(5000), {from: source.address});

        // Approve to transfer EXM token for each customer, studio to StudioPool, StakingPool
        await this.EXM.connect(this.deployer).approve(this.VabbleDAO.address, getBigNumber(100000));
        await this.EXM.connect(this.customer1).approve(this.VabbleDAO.address, getBigNumber(100000));
        await this.EXM.connect(this.customer2).approve(this.VabbleDAO.address, getBigNumber(100000));
        await this.EXM.connect(this.customer3).approve(this.VabbleDAO.address, getBigNumber(100000));   

        await this.EXM.connect(this.deployer).approve(this.StakingPool.address, getBigNumber(100000));
        await this.EXM.connect(this.customer1).approve(this.StakingPool.address, getBigNumber(100000));
        await this.EXM.connect(this.customer2).approve(this.StakingPool.address, getBigNumber(100000));
        await this.EXM.connect(this.customer3).approve(this.StakingPool.address, getBigNumber(100000));

        await this.EXM.connect(this.deployer).approve(this.VabbleDAO.address, getBigNumber(100000));
        await this.EXM.connect(this.studio1).approve(this.VabbleDAO.address, getBigNumber(100000));
        await this.EXM.connect(this.studio2).approve(this.VabbleDAO.address, getBigNumber(100000));
        await this.EXM.connect(this.studio3).approve(this.VabbleDAO.address, getBigNumber(100000));

        // ====== USDC
        // Transfering USDC token to user1, 2, 3                                            897497 291258
        await this.USDC.connect(source).transfer(this.customer1.address, getBigNumber(50000, 6), {from: source.address});
        await this.USDC.connect(source).transfer(this.customer2.address, getBigNumber(50000, 6), {from: source.address});
        await this.USDC.connect(source).transfer(this.customer3.address, getBigNumber(50000, 6), {from: source.address});
        await this.USDC.connect(source).transfer(this.customer4.address, getBigNumber(50000, 6), {from: source.address});
        await this.USDC.connect(source).transfer(this.customer5.address, getBigNumber(50000, 6), {from: source.address});
        await this.USDC.connect(source).transfer(this.customer6.address, getBigNumber(50000, 6), {from: source.address});

        // Transfering USDC token to studio1, 2, 3
        await this.USDC.connect(source).transfer(this.studio1.address, getBigNumber(50000, 6), {from: source.address});
        await this.USDC.connect(source).transfer(this.studio2.address, getBigNumber(50000, 6), {from: source.address});
        await this.USDC.connect(source).transfer(this.studio3.address, getBigNumber(50000, 6), {from: source.address});

        // Approve to transfer USDC token for each user, studio to VabbleDAO, VabbleFund, StakingPool, FilmNFT
        await this.USDC.connect(this.deployer).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer1).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer2).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer3).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));   
        await this.USDC.connect(this.customer4).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer5).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer6).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
        
        await this.USDC.connect(this.deployer).approve(this.VabbleFund.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer1).approve(this.VabbleFund.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer2).approve(this.VabbleFund.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer3).approve(this.VabbleFund.address, getBigNumber(10000000, 6));   
        await this.USDC.connect(this.customer4).approve(this.VabbleFund.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer5).approve(this.VabbleFund.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer6).approve(this.VabbleFund.address, getBigNumber(10000000, 6));

        await this.USDC.connect(this.deployer).approve(this.StakingPool.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer1).approve(this.StakingPool.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer2).approve(this.StakingPool.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer3).approve(this.StakingPool.address, getBigNumber(10000000, 6));

        await this.USDC.connect(this.deployer).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.studio1).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.studio2).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.studio3).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.studio1).approve(this.FilmNFT.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.studio2).approve(this.FilmNFT.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.studio3).approve(this.FilmNFT.address, getBigNumber(10000000, 6));

       
    });

    
    it('Test-1', async function () {
        try {
            const title1 = 'film title - 1'
            const desc1 = 'film description - 1'
            const title2 = 'film title - 2'
            const desc2 = 'film description - 2'
            const title3 = 'film title - 3'
            const desc3 = 'film description - 3'
            const title4 = 'film title - 4'
            const desc4 = 'film description - 4'
            const sharePercents = [getBigNumber(40, 8), getBigNumber(30, 8), getBigNumber(20, 8), getBigNumber(10, 8)]
            const studioPayees = [this.customer1.address, this.customer2.address, this.customer3.address, this.deployer.address]
            const raiseAmount = getBigNumber(150, 6)
            const fundPeriod = getBigNumber(20, 0)
            const enableClaimer = getBigNumber(0, 0)
            const enableClaimer1 = getBigNumber(1, 0)
            const rewardPercent = getBigNumber(10, 8)
            const fId1 = getBigNumber(1, 0)
            const fId2 = getBigNumber(2, 0)
            const fId3 = getBigNumber(3, 0)
            const fId4 = getBigNumber(4, 0)
            const fId5 = getBigNumber(5, 0)

            let ethVal = ethers.utils.parseEther('1');

            let fundType = 0, nVote = 0;

            // Create proposal for a film by studio with USDC token
            fundType = 0, nVote = 0;
            await this.VabbleDAO.connect(this.deployer).proposalFilmCreate(0, 0, this.USDC.address, 
                {from: this.deployer.address})

            await this.VabbleDAO.connect(this.deployer).proposalFilmUpdate(
                fId1, 
                title1,
                desc1,
                sharePercents, 
                studioPayees,  
                raiseAmount, 
                fundPeriod, 
                0,
                enableClaimer1,
                {from: this.deployer.address}
            );

            // Create proposal for a film by studio with EXM token
            await this.VabbleDAO.connect(this.deployer).proposalFilmCreate(0, 0, this.EXM.address, 
                {from: this.deployer.address})
            await this.VabbleDAO.connect(this.deployer).proposalFilmUpdate(
                fId2, 
                title2,
                desc2,
                sharePercents, 
                studioPayees,  
                raiseAmount, 
                fundPeriod, 
                0,
                enableClaimer,
                {from: this.deployer.address}
            );

            // fundType=1 => approve fund by token
            await this.VabbleDAO.connect(this.deployer).proposalFilmCreate(1, 0, CONFIG.addressZero, 
                {from: this.deployer.address, value: ethVal});
            await this.VabbleDAO.connect(this.deployer).proposalFilmUpdate(
                fId3, 
                title3,
                desc3,
                sharePercents, 
                studioPayees,  
                raiseAmount, 
                fundPeriod, 
                rewardPercent,
                enableClaimer,
                {from: this.deployer.address}
            );

            // fundType=2 => approve fund by nft
            await this.VabbleDAO.connect(this.deployer).proposalFilmCreate(2, 0, CONFIG.addressZero, 
                {from: this.deployer.address, value: ethVal})
            await this.VabbleDAO.connect(this.deployer).proposalFilmUpdate(
                fId4, 
                title4,
                desc4,
                sharePercents, 
                studioPayees,  
                raiseAmount, 
                fundPeriod, 
                rewardPercent,
                enableClaimer,
                {from: this.deployer.address}
            )

            // fundType=3 => approve fund by token & nft
            await this.VabbleDAO.connect(this.deployer).proposalFilmCreate(3, 0, CONFIG.addressZero, 
                {from: this.deployer.address, value: ethVal});
            await this.VabbleDAO.connect(this.deployer).proposalFilmUpdate(
                fId5, 
                title4,
                desc4,
                sharePercents, 
                studioPayees,  
                raiseAmount, 
                fundPeriod, 
                rewardPercent,
                enableClaimer,
                {from: this.deployer.address}
            );

            // Vote to proposal films(1,2,3,4) from customer1, 2, 3
            const pIds = await this.VabbleDAO.getFilmIds(1); // 1, 2, 3, 4, 5
            
                    
        } catch (error) {
            console.error("Error:", error);
        } 
    });

});