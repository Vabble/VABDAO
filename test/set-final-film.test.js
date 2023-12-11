const { ethers } = require('hardhat');
const { expect } = require('chai');

const { CONFIG, getBigNumber, DISCOUNT } = require('../scripts/utils');
const { generateSignature, executeGnosisSafeTransaction } = require('../scripts/gnosis-safe');
// const {approveWithdrawFromStakePool} = require('../scripts/gnosis-approvePendingWithdraw');
const ERC20 = require('../data/ERC20.json');
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
        this.vabToken = new ethers.Contract(CONFIG.mumbai.vabToken, JSON.stringify(ERC20), ethers.provider);
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
              this.FilmNFT.address
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
        await this.vabToken.connect(this.customer1).approve(this.VabbleDAO.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer2).approve(this.VabbleDAO.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer3).approve(this.VabbleDAO.address, getBigNumber(100000000));   
        
        await this.vabToken.connect(this.customer1).approve(this.StakingPool.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer2).approve(this.StakingPool.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer3).approve(this.StakingPool.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer4).approve(this.StakingPool.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer5).approve(this.StakingPool.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer6).approve(this.StakingPool.address, getBigNumber(100000000));
        
        await this.vabToken.connect(this.customer1).approve(this.FilmNFT.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer2).approve(this.FilmNFT.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer3).approve(this.FilmNFT.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer4).approve(this.FilmNFT.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer5).approve(this.FilmNFT.address, getBigNumber(100000000));
        await this.vabToken.connect(this.customer6).approve(this.FilmNFT.address, getBigNumber(100000000));

        await this.vabToken.connect(this.studio1).approve(this.VabbleDAO.address, getBigNumber(100000000));
        await this.vabToken.connect(this.studio2).approve(this.VabbleDAO.address, getBigNumber(100000000));
        await this.vabToken.connect(this.studio3).approve(this.VabbleDAO.address, getBigNumber(100000000));
        
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
        await this.EXM.connect(this.customer1).approve(this.VabbleDAO.address, getBigNumber(100000));
        await this.EXM.connect(this.customer2).approve(this.VabbleDAO.address, getBigNumber(100000));
        await this.EXM.connect(this.customer3).approve(this.VabbleDAO.address, getBigNumber(100000));   

        await this.EXM.connect(this.customer1).approve(this.StakingPool.address, getBigNumber(100000));
        await this.EXM.connect(this.customer2).approve(this.StakingPool.address, getBigNumber(100000));
        await this.EXM.connect(this.customer3).approve(this.StakingPool.address, getBigNumber(100000));

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
        await this.USDC.connect(this.customer1).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer2).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer3).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));   
        await this.USDC.connect(this.customer4).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer5).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer6).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
        
        await this.USDC.connect(this.customer1).approve(this.VabbleFund.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer2).approve(this.VabbleFund.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer3).approve(this.VabbleFund.address, getBigNumber(10000000, 6));   
        await this.USDC.connect(this.customer4).approve(this.VabbleFund.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer5).approve(this.VabbleFund.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer6).approve(this.VabbleFund.address, getBigNumber(10000000, 6));

        await this.USDC.connect(this.customer1).approve(this.StakingPool.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer2).approve(this.StakingPool.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.customer3).approve(this.StakingPool.address, getBigNumber(10000000, 6));

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
            const sharePercents = [getBigNumber(50, 8), getBigNumber(15, 8), getBigNumber(35, 8)]
            const studioPayees = [this.customer1.address, this.customer2.address, this.customer3.address]
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
            await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(0, 0, this.USDC.address, 
                {from: this.studio1.address})
            await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
                fId1, 
                title1,
                desc1,
                sharePercents, 
                studioPayees,  
                raiseAmount, 
                fundPeriod, 
                0,
                enableClaimer1,
                {from: this.studio1.address}
            );

            // Create proposal for a film by studio with EXM token
            await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(0, 0, this.EXM.address, 
                {from: this.studio1.address})
            await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
                fId2, 
                title2,
                desc2,
                sharePercents, 
                studioPayees,  
                raiseAmount, 
                fundPeriod, 
                0,
                enableClaimer,
                {from: this.studio1.address}
            );

            // fundType=1 => approve fund by token
            await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(1, 0, CONFIG.addressZero, 
                {from: this.studio1.address, value: ethVal});
            await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
                fId3, 
                title3,
                desc3,
                sharePercents, 
                studioPayees,  
                raiseAmount, 
                fundPeriod, 
                rewardPercent,
                enableClaimer,
                {from: this.studio1.address}
            );

            // fundType=2 => approve fund by nft
            await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(2, 0, CONFIG.addressZero, 
                {from: this.studio1.address, value: ethVal})
            await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
                fId4, 
                title4,
                desc4,
                sharePercents, 
                studioPayees,  
                raiseAmount, 
                fundPeriod, 
                rewardPercent,
                enableClaimer,
                {from: this.studio1.address}
            )

            // fundType=3 => approve fund by token & nft
            await this.VabbleDAO.connect(this.studio1).proposalFilmCreate(3, 0, CONFIG.addressZero, 
                {from: this.studio1.address, value: ethVal});
            await this.VabbleDAO.connect(this.studio1).proposalFilmUpdate(
                fId5, 
                title4,
                desc4,
                sharePercents, 
                studioPayees,  
                raiseAmount, 
                fundPeriod, 
                rewardPercent,
                enableClaimer,
                {from: this.studio1.address}
            );

            // Vote to proposal films(1,2,3,4) from customer1, 2, 3
            const pIds = await this.VabbleDAO.getFilmIds(1); // 1, 2, 3, 4, 5

            // Staking VAB token from customrs 1, 2, 3 to Staking Pool for voting
            await this.StakingPool.connect(this.customer1).stakeVAB(getBigNumber(400), {from: this.customer1.address})
            await this.StakingPool.connect(this.customer2).stakeVAB(getBigNumber(400), {from: this.customer2.address})
            await this.StakingPool.connect(this.customer3).stakeVAB(getBigNumber(300), {from: this.customer3.address})  

            // Staking VAB token from studio 1, 2, 3 to Staking Pool for approve voting
            await this.StakingPool.connect(this.studio1).stakeVAB(getBigNumber(300), {from: this.studio1.address})
            await this.StakingPool.connect(this.studio2).stakeVAB(getBigNumber(300), {from: this.studio2.address})
            await this.StakingPool.connect(this.studio3).stakeVAB(getBigNumber(300), {from: this.studio3.address})
          
            const voteInfos = [1, 1, 1, 1, 1];            
            await this.Vote.connect(this.customer1).voteToFilms(pIds, voteInfos, {from: this.customer1.address}); 
            await this.Vote.connect(this.customer2).voteToFilms(pIds, voteInfos, {from: this.customer2.address}); 
            await this.Vote.connect(this.customer3).voteToFilms(pIds, voteInfos, {from: this.customer3.address}); 

            // => Increase next block timestamp for only testing
            let period = 10 * 24 * 3600; // filmVotePeriod = 10 days
            network.provider.send('evm_increaseTime', [period]);
            await network.provider.send('evm_mine');

            // => Change the minVoteCount from 5 ppl to 3 ppl for testing
            await this.Property.connect(this.deployer).updatePropertyForTesting(3, 18, {from: this.deployer.address})

            // Approve 5 films by calling the approveFilms() from Studio
            const approveData = [pIds[0], pIds[1], pIds[2], pIds[3], pIds[4]]
            await this.Vote.connect(this.studio2).approveFilms(approveData);// filmId = 1, 2 ,3, 4, 5

            // Each customers 1 ~ 6 Deposit to fund on film-3 by USDC token
            const flag1 = 1;
            const flag2 = 2;
            const dAmount = getBigNumber(50, 6)
            await this.VabbleFund.connect(this.customer1).depositToFilm(fId3, dAmount, flag1, this.USDC.address, {from: this.customer1.address})
            await this.VabbleFund.connect(this.customer2).depositToFilm(fId3, dAmount, flag1, this.USDC.address, {from: this.customer2.address})
            await this.VabbleFund.connect(this.customer3).depositToFilm(fId3, dAmount, flag1, this.USDC.address, {from: this.customer3.address})
            await this.VabbleFund.connect(this.customer4).depositToFilm(fId3, dAmount, flag1, this.USDC.address, {from: this.customer4.address})
            await this.VabbleFund.connect(this.customer5).depositToFilm(fId3, dAmount, flag1, this.USDC.address, {from: this.customer5.address})
            await this.VabbleFund.connect(this.customer6).depositToFilm(fId3, dAmount, flag1, this.USDC.address, {from: this.customer6.address})

            const usdc_balance_of_vabble_fund1 = await this.USDC.balanceOf(this.VabbleFund.address);
            expect(usdc_balance_of_vabble_fund1).to.be.equal(getBigNumber(300, 6)); // 50 * 6
            
            // Deploy NFT for film-4 and film-5
            const tier = getBigNumber(1, 0)
            const nAmount = getBigNumber(8000, 0)      // 8000
            const nPrice1 = getBigNumber(2, 6)          // 2 USDC
            const nPrice2 = getBigNumber(20, 6)
            if (GNOSIS_FLAG) {
                let encodedCallData = this.FilmNFT.interface.encodeFunctionData("setBaseURI", 
                        ["base_uri", "collection_uri"]);
                const {signatureBytes, tx} = await generateSignature(this.GnosisSafe, encodedCallData, this.FilmNFT.address, [this.signer1, this.signer2]);
                await executeGnosisSafeTransaction(this.GnosisSafe, this.signer2, signatureBytes, tx);
            } else {
                await this.FilmNFT.connect(this.auditor).setBaseURI("base_uri", "collection_uri")
            }

            await this.FilmNFT.connect(this.studio1).setMintInfo(fId4, tier, nAmount, nPrice1, {from: this.studio1.address})
            await this.FilmNFT.connect(this.studio1).setMintInfo(fId5, tier, nAmount, nPrice2, {from: this.studio1.address})
            await this.FilmNFT.connect(this.studio1).deployFilmNFTContract(fId4, "test4 nft", "t4nft", {from: this.studio1.address})
            await this.FilmNFT.connect(this.studio1).deployFilmNFTContract(fId5, "test5 nft", "t5nft", {from: this.studio1.address})

            // Deposit to fund film by nft
            const dAmount1 = 100 //(maxMintAmount = nAmount = 8000)
            await this.VabbleFund.connect(this.customer1).depositToFilm(fId4, 1, flag2, this.USDC.address, {from: this.customer1.address})
            await this.VabbleFund.connect(this.customer1).depositToFilm(fId5, dAmount1, flag2, this.USDC.address, {from: this.customer1.address})
            await this.VabbleFund.connect(this.customer2).depositToFilm(fId5, dAmount1, flag2, this.USDC.address, {from: this.customer2.address})

            const usdc_balance_of_vabble_fund3 = await this.USDC.balanceOf(this.VabbleFund.address);
            // fund 2 * 1 + 20 * 100 + 20 * 100 = 4002 with NFT
            // token = 50 * 6 = 300
            // total = 4002 + 300 = 4302            
            console.log("usdc_balance_of_vabble_fund3:(USDC)", usdc_balance_of_vabble_fund3.toString() / getBigNumber(1)); // 4302000000
            expect(usdc_balance_of_vabble_fund3).to.be.equal(getBigNumber(4302, 6));

            const isRaised3 = await this.VabbleFund.isRaisedFullAmount(fId3);
            const isRaised4 = await this.VabbleFund.isRaisedFullAmount(fId4);
            const isRaised5 = await this.VabbleFund.isRaisedFullAmount(fId5);    
            expect(isRaised3).to.be.true    // 300 > 150
            expect(isRaised4).to.be.false   // 2 < 150
            expect(isRaised5).to.be.true    // 4000 > 150

            const userNftCount51 = await this.VabbleFund.getAllowUserNftCount(fId5, this.customer1.address)
            const userNftCount52 = await this.VabbleFund.getAllowUserNftCount(fId5, this.customer2.address)
            const userNftCount53 = await this.VabbleFund.getAllowUserNftCount(fId5, this.customer3.address)    
            expect(userNftCount51).to.be.equal(dAmount1) // 100
            expect(userNftCount52).to.be.equal(dAmount1) // 100
            expect(userNftCount53).to.be.equal(0)

            // => Increase next block timestamp for only testing
            period = 21 * 24 * 3600; // 21 days
            network.provider.send('evm_increaseTime', [period]);
            await network.provider.send('evm_mine');

            await this.VabbleFund.connect(this.studio1).fundProcess(fId3, {from: this.studio1.address})
            const isProcessed = await this.VabbleFund.isFundProcessed(fId3);
            expect(isProcessed).to.be.true

            // Get Film Ids that have been approved (listing and funding)
            const approvedListIds = await this.VabbleDAO.getFilmIds(2); // 1, 2
            const approvedFundIds = await this.VabbleDAO.getFilmIds(3); // 3, 4, 5
            expect(approvedListIds.length).to.be.equal(2)
            expect(approvedFundIds.length).to.be.equal(3)

            let VABInStudioPool = await this.vabToken.balanceOf(this.VabbleDAO.address)
            let VABInEdgePool = await this.vabToken.balanceOf(this.Ownablee.address)
            expect(VABInEdgePool).to.be.equal(0)
            expect(VABInStudioPool).to.be.equal(0)

            // Staking VAB token for move from StakingPool to StudioPool using depositVAB
            await this.StakingPool.connect(this.customer1).depositVAB(getBigNumber(10000), {from: this.customer1.address})
            await this.StakingPool.connect(this.customer2).depositVAB(getBigNumber(15000), {from: this.customer2.address})
            await this.StakingPool.connect(this.customer3).depositVAB(getBigNumber(15000), {from: this.customer3.address})

            const VabbleDAO_balance1 = await this.vabToken.balanceOf(this.VabbleDAO.address)
            console.log('====VableDAO Balance1::', VabbleDAO_balance1 / getBigNumber(1));
            
            const StakingPool_balance1 = await this.vabToken.balanceOf(this.StakingPool.address)
            console.log('====StakingPool Balance1::', StakingPool_balance1 / getBigNumber(1));

            // Allocate to StudioPool (From Staking To Studio Pool)
            if (GNOSIS_FLAG) {
                let encodedCallData = this.VabbleDAO.interface.encodeFunctionData("allocateToPool", 
                    [
                        [this.customer1.address, this.customer2.address, this.customer3.address],
                        [getBigNumber(500), getBigNumber(1000), getBigNumber(1000)],
                        2
                    ]);

                // Generate Signature and Transaction information
                const {signatureBytes, tx} = await generateSignature(this.GnosisSafe, encodedCallData, this.VabbleDAO.address, [this.signer1, this.signer2]);
                await expect(  
                    executeGnosisSafeTransaction(this.GnosisSafe, this.signer2, signatureBytes, tx)
                ).to.emit(this.VabbleDAO, 'AllocatedToPool').withArgs(
                    [this.customer1.address, this.customer2.address, this.customer3.address],
                    [getBigNumber(500), getBigNumber(1000), getBigNumber(1000)],
                    2
                );
            } else {
                await expect(
                    this.VabbleDAO.connect(this.auditor).allocateToPool(
                    [this.customer1.address, this.customer2.address, this.customer3.address],
                    [getBigNumber(500), getBigNumber(1000), getBigNumber(1000)],
                    2,
                    {from: this.auditor.address})
                ).to.emit(this.VabbleDAO, 'AllocatedToPool').withArgs(
                    [this.customer1.address, this.customer2.address, this.customer3.address],
                    [getBigNumber(500), getBigNumber(1000), getBigNumber(1000)],
                    2
                );
            }

            const studioPool_balance2 = await this.vabToken.balanceOf(this.VabbleDAO.address)
            console.log('====VableDAO Balance2::', studioPool_balance2 / getBigNumber(1));
            expect(studioPool_balance2).to.be.equal(getBigNumber(2500));

            const StakingPool_balance2 = await this.vabToken.balanceOf(this.StakingPool.address)
            console.log('====StakingPool Balance2::', StakingPool_balance2 / getBigNumber(1));
            expect(StakingPool_balance1.sub(StakingPool_balance2)).to.be.equal(getBigNumber(2500));

            expect(await this.VabbleDAO.checkSetFinalFilms()).to.be.true;
          
            // ==================== setFinalFilms =====================================
            if (GNOSIS_FLAG) {
                let encodedCallData = this.VabbleDAO.interface.encodeFunctionData("setFinalFilms", 
                    [
                        [fId1, fId2, fId3, fId4, fId5], 
                        [getBigNumber(100), getBigNumber(100), getBigNumber(100), getBigNumber(100), getBigNumber(100)]
                    ]);

                // Generate Signature and Transaction information
                const {signatureBytes, tx} = await generateSignature(this.GnosisSafe, encodedCallData, this.VabbleDAO.address, [this.signer1, this.signer2]);

                await executeGnosisSafeTransaction(this.GnosisSafe, this.signer2, signatureBytes, tx);
            } else {
                await this.VabbleDAO.connect(this.auditor).setFinalFilms(
                    [fId1, fId2, fId3, fId4, fId5], 
                    [getBigNumber(100), getBigNumber(100), getBigNumber(100), getBigNumber(100), getBigNumber(100)]
                );    
            }

            expect(await this.VabbleDAO.checkSetFinalFilms()).to.be.false;

            // check each payeers finalized amount for each film
            let monthId = await this.VabbleDAO.monthId() // 1        
            const a31_1 = await this.VabbleDAO.finalizedAmount(monthId, fId3, this.customer1.address)
            const a32_1 = await this.VabbleDAO.finalizedAmount(monthId, fId3, this.customer2.address)
            const a33_1 = await this.VabbleDAO.finalizedAmount(monthId, fId3, this.customer3.address)

            const a41_1 = await this.VabbleDAO.finalizedAmount(monthId, fId4, this.customer1.address)
            const a42_1 = await this.VabbleDAO.finalizedAmount(monthId, fId4, this.customer2.address)
            const a43_1 = await this.VabbleDAO.finalizedAmount(monthId, fId4, this.customer3.address)
            
            const a51_1 = await this.VabbleDAO.finalizedAmount(monthId, fId5, this.customer1.address)
            const a52_1 = await this.VabbleDAO.finalizedAmount(monthId, fId5, this.customer2.address)
            const a53_1 = await this.VabbleDAO.finalizedAmount(monthId, fId5, this.customer3.address)
            console.log("====assignedAmount3::", a31_1 / getBigNumber(1), a32_1 / getBigNumber(1), a33_1 / getBigNumber(1))
            console.log("====assignedAmount4::", a41_1 / getBigNumber(1), a42_1 / getBigNumber(1), a43_1 / getBigNumber(1))
            console.log("====assignedAmount5::", a51_1 / getBigNumber(1), a52_1 / getBigNumber(1), a53_1 / getBigNumber(1))

            let finalFilmList = await this.VabbleDAO.getFinalizedFilmIds(monthId) // 1, 2, 3, 4, 5
            expect(finalFilmList.length).to.be.equal(5)

            const rewardAmount = await this.VabbleDAO.connect(this.customer1).getUserRewardAmount(fId3, monthId, {from: this.customer1.address});
            console.log("rewardAmount", rewardAmount / getBigNumber(1));

            const allRewardAmount1 = await this.VabbleDAO.connect(this.customer1).getAllAvailableRewards(1, {from: this.customer1.address});
            console.log("AllRewardAmount1", allRewardAmount1 / getBigNumber(1));

            const v_1 = await this.vabToken.balanceOf(this.customer1.address)
            await this.VabbleDAO.connect(this.customer1).claimReward([fId1], {from: this.customer1.address})
            const v_2 = await this.vabToken.balanceOf(this.customer1.address);

            const allRewardAmount2 = await this.VabbleDAO.connect(this.customer1).getAllAvailableRewards(1);
            console.log("AllRewardAmount2", allRewardAmount2 / getBigNumber(1));
            expect(allRewardAmount1.sub(allRewardAmount2)).to.be.equal(getBigNumber(50));

            // should be 50 (because sharePercents (50/15/35))
            console.log('====customer1 received reward from film-1::', v_2.sub(v_1) / getBigNumber(1)); 
            expect(v_2.sub(v_1)).to.be.equal(getBigNumber(50));

            // check VabbleDAO balance changes
            const studioPool_balance3 = await this.vabToken.balanceOf(this.VabbleDAO.address)
            console.log('====VableDAO Balance2::', studioPool_balance2.sub(studioPool_balance3) / getBigNumber(1)); // 50
            expect(studioPool_balance2.sub(studioPool_balance3)).to.be.equal(getBigNumber(50));


            // batch mint
            await expect(
                this.FilmNFT.connect(this.customer3).claimNft(fId4, {from: this.customer3.address})
            ).to.be.revertedWith('claimNft: zero count');
            await this.FilmNFT.connect(this.customer1).claimNft(fId5, {from: this.customer1.address})
            const totalSupply5 = await this.FilmNFT.getTotalSupply(fId5)
            console.log('====totalSupply5::', totalSupply5.toString()) // 100: 
            expect(totalSupply5).to.be.equal(100);

            //==================== setFinalFilms for funding(fundType = 2, nft)
            // => Increase next block timestamp for only testing
            period = 31 * 24 * 3600; // 31 days
            network.provider.send('evm_increaseTime', [period]);
            await network.provider.send('evm_mine');   

            const filmNFTTokenList4 = await this.FilmNFT.getFilmNFTTokenList(fId4); // tokenId 1, 2, 3 for film-4
            const filmNFTTokenList5 = await this.FilmNFT.getFilmNFTTokenList(fId5); // tokenId 1, 2, 3 for film-5
            console.log('====filmNFTTokenList::', filmNFTTokenList4.length, filmNFTTokenList5.length);
            expect(filmNFTTokenList4.length).to.be.equal(0);
            expect(filmNFTTokenList5.length).to.be.equal(100);

            await this.VabbleFund.connect(this.studio1).fundProcess(fId5, {from: this.studio1.address})
            const isProcessed1 = await this.VabbleFund.isFundProcessed(fId5);
            console.log("====isProcessed-1", isProcessed1) 
            expect(isProcessed1).to.be.equal(true); 

            expect(await this.VabbleDAO.checkSetFinalFilms()).to.be.true;
            if (GNOSIS_FLAG) {
                let encodedCallData = this.VabbleDAO.interface.encodeFunctionData("setFinalFilms", 
                    [
                        [fId4, fId5], 
                        [getBigNumber(300), getBigNumber(200)]
                    ]);

                // Generate Signature and Transaction information
                const {signatureBytes, tx} = await generateSignature(this.GnosisSafe, encodedCallData, this.VabbleDAO.address, [this.signer1, this.signer2]);

                await executeGnosisSafeTransaction(this.GnosisSafe, this.signer2, signatureBytes, tx);
            } else {
                await this.VabbleDAO.connect(this.auditor).setFinalFilms(
                    [fId4, fId5], 
                    [getBigNumber(300), getBigNumber(200)]
                );    
            }
            expect(await this.VabbleDAO.checkSetFinalFilms()).to.be.false;

            monthId = 2 
            
            // film-4 is not funded full, so even though customer 1 fund with nft, he can not get reward
            const a41 = await this.VabbleDAO.finalizedAmount(monthId, fId4, this.customer1.address)
            const a42 = await this.VabbleDAO.finalizedAmount(monthId, fId4, this.customer2.address)
            const a43 = await this.VabbleDAO.finalizedAmount(monthId, fId4, this.customer3.address)
            const a44 = await this.VabbleDAO.finalizedAmount(monthId, fId4, this.customer4.address)
            // film-4 reward: 300 -> 300 * 0.5 = 150, 300 * 0.15 = 45, 300 * 0.35 = 105, 0;
            console.log("====assignedAmount-Film-4::", a41 / getBigNumber(1), a42 / getBigNumber(1), a43 / getBigNumber(1), a44 / getBigNumber(1));
            expect([a41, a42, a43, a44]).to.be.deep.equal([getBigNumber(150), getBigNumber(45), getBigNumber(105), getBigNumber(0)]);

            // film-5 is funded full, so even though funded customers(1, 2) can get reward
            const a51 = await this.VabbleDAO.finalizedAmount(monthId, fId5, this.customer1.address)
            const a52 = await this.VabbleDAO.finalizedAmount(monthId, fId5, this.customer2.address)
            const a53 = await this.VabbleDAO.finalizedAmount(monthId, fId5, this.customer3.address)
            const a54 = await this.VabbleDAO.finalizedAmount(monthId, fId5, this.customer4.address)

            // 200 -> 180 + 20 (reward)
            // 180 -> 180 * 0.5 = 90, 180 * 0.15 = 27, 180 * 0.35 = 63, 0;
            // 20 -> 20 * 0.5 = 10, 20 * 0.5 = 10
            // result: 90 + 10 = 100, 27 + 10 = 37, 63 + 0 = 63;
            console.log("====assignedAmount-Film-5::", a51 / getBigNumber(1), a52 / getBigNumber(1), a53 / getBigNumber(1), a54 / getBigNumber(1));
            expect([a51, a52, a53, a54]).to.be.deep.equal([getBigNumber(100), getBigNumber(37), getBigNumber(63), getBigNumber(0)]);

            const a_1 = await this.vabToken.balanceOf(this.customer1.address)             
            await this.VabbleDAO.connect(this.customer1).claimReward([fId4], {from: this.customer1.address})
            const a_2 = await this.vabToken.balanceOf(this.customer1.address);
            console.log("====Customer 1 Film 4 claimReward::", a_2.sub(a_1) / getBigNumber(1));
            expect(a_2.sub(a_1)).to.be.equal(getBigNumber(200)); // 100 * 0.5 + 150 = 200

            await this.VabbleDAO.connect(this.customer1).claimReward([fId5], {from: this.customer1.address})
            const a_3 = await this.vabToken.balanceOf(this.customer1.address);
            console.log("====Customer 1 Film 5 claimReward::", a_3.sub(a_2) / getBigNumber(1));
            expect(a_3.sub(a_2)).to.be.equal(getBigNumber(150)); // 100 * 0.5 + 100 = 150

            const b_1 = await this.vabToken.balanceOf(this.customer3.address)
            await this.VabbleDAO.connect(this.customer3).claimReward([fId4], {from: this.customer3.address})
            const b_2 = await this.vabToken.balanceOf(this.customer3.address)
            console.log("====Customer 3 Film 4 claimReward::", b_2.sub(b_1) / getBigNumber(1));
            expect(b_2.sub(b_1)).to.be.equal(getBigNumber(140)); // 100 * 0.35 + 105 = 140
            
            const mId1 = await this.VabbleDAO.latestClaimMonthId(fId5, this.customer1.address) // 2
            const mId3 = await this.VabbleDAO.latestClaimMonthId(fId4, this.customer3.address) // 2
            const curMonthId = await this.VabbleDAO.monthId()    // 2
            expect(mId1).to.be.equal(curMonthId)
            expect(mId3).to.be.equal(curMonthId)

            await expect(
                this.VabbleDAO.connect(this.customer3).claimReward([fId4], {from: this.customer3.address})
            ).to.be.revertedWith('claimReward: zero amount');

            // => Increase next block timestamp for only testing
            period = 30 * 24 * 3600; // 31 days
            network.provider.send('evm_increaseTime', [period]);
            await network.provider.send('evm_mine');

            // Allocate to EdgePool
            if (GNOSIS_FLAG) {
                let encodedCallData = this.VabbleDAO.interface.encodeFunctionData("allocateToPool", 
                    [
                        [this.customer1.address, this.customer2.address, this.customer3.address],
                        [getBigNumber(500), getBigNumber(1000), getBigNumber(1000)],
                        1
                    ]);

                // Generate Signature and Transaction information
                const {signatureBytes, tx} = await generateSignature(this.GnosisSafe, encodedCallData, this.VabbleDAO.address, [this.signer1, this.signer2]);
                await expect(  
                    executeGnosisSafeTransaction(this.GnosisSafe, this.signer2, signatureBytes, tx)
                ).to.emit(this.VabbleDAO, 'AllocatedToPool').withArgs(
                    [this.customer1.address, this.customer2.address, this.customer3.address],
                    [getBigNumber(500), getBigNumber(1000), getBigNumber(1000)],
                    1
                );
            } else {
                await expect(
                    this.VabbleDAO.connect(this.auditor).allocateToPool(
                        [this.customer1.address, this.customer2.address, this.customer3.address],
                        [getBigNumber(500), getBigNumber(1000), getBigNumber(1000)],
                        1,
                        {from: this.auditor.address}
                    )
                ).to.emit(this.VabbleDAO, 'AllocatedToPool').withArgs(
                    [this.customer1.address, this.customer2.address, this.customer3.address],
                    [getBigNumber(500), getBigNumber(1000), getBigNumber(1000)],
                    1
                );
            }

            const VABInEdgePool_1 = await this.vabToken.balanceOf(this.Ownablee.address);
            const VABInStudioPool_1 = await this.vabToken.balanceOf(this.VabbleDAO.address);
            
            if (GNOSIS_FLAG) {
                let encodedCallData = this.VabbleDAO.interface.encodeFunctionData("allocateFromEdgePool", 
                    [
                        getBigNumber(1000)
                    ]);

                const {signatureBytes, tx} = await generateSignature(this.GnosisSafe, encodedCallData, this.VabbleDAO.address, [this.signer1, this.signer2]);

                await executeGnosisSafeTransaction(this.GnosisSafe, this.signer2, signatureBytes, tx);
            } else {
                await this.VabbleDAO.connect(this.auditor).allocateFromEdgePool(getBigNumber(1000), {from: this.auditor.address})
            }

            const VABInEdgePool_2 = await this.vabToken.balanceOf(this.Ownablee.address);
            const VABInStudioPool_2 = await this.vabToken.balanceOf(this.VabbleDAO.address);
            console.log("====After allocateFromEdgePool, EdgePool ::", VABInEdgePool_1.sub(VABInEdgePool_2) / getBigNumber(1));
            console.log("====After allocateFromEdgePool, StudioPool::", VABInStudioPool_2.sub(VABInStudioPool_1) / getBigNumber(1));
            expect(VABInEdgePool_1.sub(VABInEdgePool_2)).to.be.equal(getBigNumber(1000));
            expect(VABInStudioPool_2.sub(VABInStudioPool_1)).to.be.equal(getBigNumber(1000));

            //============= setFinalFilms for funding(fundType = 1, token)
            // => Increase next block timestamp for only testing
            period = 31 * 24 * 3600; // 31 days
            network.provider.send('evm_increaseTime', [period]);
            await network.provider.send('evm_mine');

            expect(await this.VabbleDAO.checkSetFinalFilms()).to.be.true;

            if (GNOSIS_FLAG) {
                let encodedCallData = this.VabbleDAO.interface.encodeFunctionData("setFinalFilms", 
                [
                    [fId3], 
                    [getBigNumber(200)]
                ]);

                // Generate Signature and Transaction information
                const {signatureBytes, tx} = await generateSignature(this.GnosisSafe, encodedCallData, this.VabbleDAO.address, [this.signer1, this.signer2]);

                await executeGnosisSafeTransaction(this.GnosisSafe, this.signer2, signatureBytes, tx);
            } else {
                await this.VabbleDAO.connect(this.auditor).setFinalFilms(
                    [fId3], 
                    [getBigNumber(200)]
                )  
            }

            expect(await this.VabbleDAO.checkSetFinalFilms()).to.be.false;
            
            const month = await this.VabbleDAO.monthId()
            const assignedAmount4 = await this.VabbleDAO.finalizedAmount(month, fId3, this.customer1.address)
            // 200 -> 180 + 20
            // customer1 shared = 180 / 2 = 90
            // customer1 reward = 20 / 6 (customers) = 3.3
            console.log("====assignedAmount4::", month.toString(), assignedAmount4 / getBigNumber(1)) ; 
           
            const d_1 = await this.vabToken.balanceOf(this.customer1.address)
            await this.VabbleDAO.connect(this.customer1).claimReward([fId3], {from: this.customer1.address})
            const d_2 = await this.vabToken.balanceOf(this.customer1.address)
            // shared = (200 + 100) * 0.9 / 2 = 135 // twice setFinalFilm
            // reward = 30 / 6 = 5
            // total = 140
            console.log('====Customer 1 Film 3 claimReward::', d_2.sub(d_1) / getBigNumber(1));                        
        } catch (error) {
            console.error("Error:", error);
        } 
    });

});