const { ethers } = require('hardhat');
const { expect } = require('chai');

const { CONFIG, getBigNumber, DISCOUNT, getConfig } = require('../scripts/utils');
const { generateSignature, executeGnosisSafeTransaction } = require('../scripts/gnosis-safe');
// const {approveWithdrawFromStakePool} = require('../scripts/gnosis-approvePendingWithdraw');
const ERC20 = require('../data/ERC20.json');
const FERC20 = require('../data/FxERC20.json');

require('dotenv').config();

const GNOSIS_FLAG = false;

describe('ChangeFilmOwner', function () {
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
        const network = await ethers.provider.getNetwork();
        const chainId = network.chainId;
        console.log("Chain ID: ", chainId);
        const config = getConfig(chainId);

        // load ERC20 tokens
        this.vabToken = new ethers.Contract(config.vabToken, JSON.stringify(ERC20), ethers.provider);

        this.USDC = new ethers.Contract(config.usdcAdress, JSON.stringify(ERC20), ethers.provider);
        this.USDT = new ethers.Contract(config.usdtAdress, JSON.stringify(ERC20), ethers.provider);

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
            config.uniswap.factory, config.uniswap.router,
            config.sushiswap.factory, config.sushiswap.router, this.Ownablee.address
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
                this.StakingPool.address,
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
            { from: this.deployer.address }
        );

        await this.FilmNFT.connect(this.deployer).initialize(
            this.VabbleDAO.address,
            this.VabbleFund.address,
            { from: this.deployer.address }
        );

        await this.StakingPool.connect(this.deployer).initialize(
            this.VabbleDAO.address,
            this.Property.address,
            this.Vote.address,
            { from: this.deployer.address }
        )

        await this.Vote.connect(this.deployer).initialize(
            this.VabbleDAO.address,
            this.StakingPool.address,
            this.Property.address,
            this.UniHelper.address,
            { from: this.deployer.address }
        )

        await this.VabbleFund.connect(this.deployer).initialize(
            this.VabbleDAO.address,
            { from: this.deployer.address }
        )

        await this.UniHelper.connect(this.deployer).setWhiteList(
            this.VabbleDAO.address,
            this.VabbleFund.address,
            this.Subscription.address,
            this.FilmNFT.address,
            this.SubNFT.address,
            { from: this.deployer.address }
        )

        await this.Ownablee.connect(this.deployer).setup(
            this.Vote.address, this.VabbleDAO.address, this.StakingPool.address,
            { from: this.deployer.address }
        )

        if (GNOSIS_FLAG) {
            let encodedCallData = this.Ownablee.interface.encodeFunctionData("addDepositAsset",
                [[this.vabToken.address, this.USDC.address, this.USDT.address, CONFIG.addressZero]]);

            // Generate Signature and Transaction information
            const { signatureBytes, tx } = await generateSignature(this.GnosisSafe, encodedCallData, this.Ownablee.address, [this.signer1, this.signer2]);

            await executeGnosisSafeTransaction(this.GnosisSafe, this.signer2, signatureBytes, tx);
        } else {
            await this.Ownablee.connect(this.auditor).addDepositAsset(
                [this.vabToken.address, this.USDC.address, this.USDT.address, CONFIG.addressZero], { from: this.auditor.address }
            )
        }

        // Initialize the VAB/USDC/USDT token for customers, studio, contracts         
        const source = this.deployer; // set token source

        // Transfering VAB token to user1, 2, 3        
        await this.vabToken.connect(source).transfer(this.customer1.address, getBigNumber(50000000), { from: source.address });
        await this.vabToken.connect(source).transfer(this.customer2.address, getBigNumber(50000000), { from: source.address });
        await this.vabToken.connect(source).transfer(this.customer3.address, getBigNumber(500000), { from: source.address });
        await this.vabToken.connect(source).transfer(this.customer4.address, getBigNumber(500000), { from: source.address });
        await this.vabToken.connect(source).transfer(this.customer5.address, getBigNumber(500000), { from: source.address });
        await this.vabToken.connect(source).transfer(this.customer6.address, getBigNumber(500000), { from: source.address });

        // Transfering VAB token to studio1, 2, 3
        await this.vabToken.connect(source).transfer(this.studio1.address, getBigNumber(500000), { from: source.address });
        await this.vabToken.connect(source).transfer(this.studio2.address, getBigNumber(500000), { from: source.address });
        await this.vabToken.connect(source).transfer(this.studio3.address, getBigNumber(500000), { from: source.address });

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
        await this.vabToken.connect(this.deployer).approve(this.VabbleDAO.address, getBigNumber(100000000));

        await this.vabToken.connect(this.studio1).approve(this.StakingPool.address, getBigNumber(100000000));
        await this.vabToken.connect(this.studio2).approve(this.StakingPool.address, getBigNumber(100000000));
        await this.vabToken.connect(this.studio3).approve(this.StakingPool.address, getBigNumber(100000000));
        await this.vabToken.connect(this.deployer).approve(this.StakingPool.address, getBigNumber(100000000));

        // ====== USDT
        // Transfering USDT token to customer1, 2, 3
        await this.USDT.connect(source).transfer(this.customer1.address, getBigNumber(5000, 6), { from: source.address });
        await this.USDT.connect(source).transfer(this.customer2.address, getBigNumber(5000, 6), { from: source.address });
        await this.USDT.connect(source).transfer(this.customer3.address, getBigNumber(5000, 6), { from: source.address });

        // Transfering USDT token to studio1, 2, 3
        await this.USDT.connect(source).transfer(this.studio1.address, getBigNumber(5000, 6), { from: source.address });
        await this.USDT.connect(source).transfer(this.studio2.address, getBigNumber(5000, 6), { from: source.address });
        await this.USDT.connect(source).transfer(this.studio3.address, getBigNumber(5000, 6), { from: source.address });

        // Approve to transfer USDT token for each customer, studio to StudioPool, StakingPool
        await this.USDT.connect(this.customer1).approve(this.VabbleDAO.address, getBigNumber(50000, 6));
        await this.USDT.connect(this.customer2).approve(this.VabbleDAO.address, getBigNumber(50000, 6));
        await this.USDT.connect(this.customer3).approve(this.VabbleDAO.address, getBigNumber(100000, 6));

        await this.USDT.connect(this.customer1).approve(this.StakingPool.address, getBigNumber(50000, 6));
        await this.USDT.connect(this.customer2).approve(this.StakingPool.address, getBigNumber(50000, 6));
        await this.USDT.connect(this.customer3).approve(this.StakingPool.address, getBigNumber(50000, 6));

        await this.USDT.connect(this.studio1).approve(this.VabbleDAO.address, getBigNumber(100000, 6));
        await this.USDT.connect(this.studio2).approve(this.VabbleDAO.address, getBigNumber(100000, 6));
        await this.USDT.connect(this.studio3).approve(this.VabbleDAO.address, getBigNumber(100000, 6));
        await this.USDT.connect(this.deployer).approve(this.VabbleDAO.address, getBigNumber(100000, 6));

        // ====== USDC
        // Transfering USDC token to user1, 2, 3                                            897497 291258
        await this.USDC.connect(source).transfer(this.customer1.address, getBigNumber(50000, 6), { from: source.address });
        await this.USDC.connect(source).transfer(this.customer2.address, getBigNumber(50000, 6), { from: source.address });
        await this.USDC.connect(source).transfer(this.customer3.address, getBigNumber(50000, 6), { from: source.address });
        await this.USDC.connect(source).transfer(this.customer4.address, getBigNumber(50000, 6), { from: source.address });
        await this.USDC.connect(source).transfer(this.customer5.address, getBigNumber(50000, 6), { from: source.address });
        await this.USDC.connect(source).transfer(this.customer6.address, getBigNumber(50000, 6), { from: source.address });

        // Transfering USDC token to studio1, 2, 3
        await this.USDC.connect(source).transfer(this.studio1.address, getBigNumber(50000, 6), { from: source.address });
        await this.USDC.connect(source).transfer(this.studio2.address, getBigNumber(50000, 6), { from: source.address });
        await this.USDC.connect(source).transfer(this.studio3.address, getBigNumber(50000, 6), { from: source.address });

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
        await this.USDC.connect(this.deployer).approve(this.VabbleDAO.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.studio1).approve(this.FilmNFT.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.studio2).approve(this.FilmNFT.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.studio3).approve(this.FilmNFT.address, getBigNumber(10000000, 6));
        await this.USDC.connect(this.deployer).approve(this.FilmNFT.address, getBigNumber(10000000, 6));


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
                { from: this.deployer.address })

            // Change film owner in LISTING Status
            await expect(
                this.VabbleDAO.connect(this.deployer).changeOwner(fId1, this.studio1.address, { from: this.deployer.address })
            ).to.emit(this.VabbleDAO, 'ChangeFilmOwner').withArgs(
                fId1, this.deployer.address, this.studio1.address
            );

            await expect(
                this.VabbleDAO.connect(this.deployer).proposalFilmUpdate(
                    fId1,
                    title1,
                    desc1,
                    sharePercents,
                    studioPayees,
                    raiseAmount,
                    fundPeriod,
                    0,
                    enableClaimer1,
                    { from: this.deployer.address }
                )
            ).to.be.revertedWith('pU: NFO');  // proposalUpdate: not film owner

            // change owner back to again
            this.VabbleDAO.connect(this.studio1).changeOwner(fId1, this.deployer.address, { from: this.studio1.address })

            this.VabbleDAO.connect(this.deployer).proposalFilmUpdate(
                fId1,
                title1,
                desc1,
                sharePercents,
                studioPayees,
                raiseAmount,
                fundPeriod,
                0,
                enableClaimer1,
                { from: this.deployer.address }
            );

            // Change film owner in UDPATE Status
            await expect(
                this.VabbleDAO.connect(this.deployer).changeOwner(fId1, this.studio1.address, { from: this.deployer.address })
            ).to.emit(this.VabbleDAO, 'ChangeFilmOwner').withArgs(
                fId1, this.deployer.address, this.studio1.address
            );

            // change owner back to again
            this.VabbleDAO.connect(this.studio1).changeOwner(fId1, this.deployer.address, { from: this.studio1.address })

            // Create proposal for a film by studio with EXM token
            await this.VabbleDAO.connect(this.deployer).proposalFilmCreate(0, 0, this.USDC.address,
                { from: this.deployer.address })
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
                { from: this.deployer.address }
            );

            // fundType=1 => approve fund by token
            await this.VabbleDAO.connect(this.deployer).proposalFilmCreate(1, 0, CONFIG.addressZero,
                { from: this.deployer.address, value: ethVal });
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
                { from: this.deployer.address }
            );

            // fundType=2 => approve fund by nft
            await this.VabbleDAO.connect(this.deployer).proposalFilmCreate(2, 0, CONFIG.addressZero,
                { from: this.deployer.address, value: ethVal })
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
                { from: this.deployer.address }
            )

            // fundType=3 => approve fund by token & nft
            await this.VabbleDAO.connect(this.deployer).proposalFilmCreate(3, 0, CONFIG.addressZero,
                { from: this.deployer.address, value: ethVal });
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
                { from: this.deployer.address }
            );

            // Vote to proposal films(1,2,3,4) from customer1, 2, 3
            const pIds = await this.VabbleDAO.getFilmIds(1); // 1, 2, 3, 4, 5

            // Staking VAB token from customrs 1, 2, 3 to Staking Pool for voting
            await this.StakingPool.connect(this.customer1).stakeVAB(getBigNumber(400), { from: this.customer1.address })
            await this.StakingPool.connect(this.customer2).stakeVAB(getBigNumber(400), { from: this.customer2.address })
            await this.StakingPool.connect(this.customer3).stakeVAB(getBigNumber(300), { from: this.customer3.address })

            // Staking VAB token from studio 1, 2, 3 to Staking Pool for approve voting
            await this.StakingPool.connect(this.studio1).stakeVAB(getBigNumber(300), { from: this.studio1.address })
            await this.StakingPool.connect(this.studio2).stakeVAB(getBigNumber(300), { from: this.studio2.address })
            await this.StakingPool.connect(this.studio3).stakeVAB(getBigNumber(300), { from: this.studio3.address })

            const voteInfos = [1, 1, 1, 1, 1];
            await this.Vote.connect(this.customer1).voteToFilms(pIds, voteInfos, { from: this.customer1.address });
            await this.Vote.connect(this.customer2).voteToFilms(pIds, voteInfos, { from: this.customer2.address });
            await this.Vote.connect(this.customer3).voteToFilms(pIds, voteInfos, { from: this.customer3.address });

            // Change film owner in UDPATE Status (During Vote)
            await expect(
                this.VabbleDAO.connect(this.deployer).changeOwner(fId1, this.studio1.address, { from: this.deployer.address })
            ).to.emit(this.VabbleDAO, 'ChangeFilmOwner').withArgs(
                fId1, this.deployer.address, this.studio1.address
            );

            // change owner back to again
            this.VabbleDAO.connect(this.studio1).changeOwner(fId1, this.deployer.address, { from: this.studio1.address })

            // => Increase next block timestamp for only testing
            let period = 10 * 24 * 3600; // filmVotePeriod = 10 days
            network.provider.send('evm_increaseTime', [period]);
            await network.provider.send('evm_mine');

            // => Change the minVoteCount from 5 ppl to 3 ppl for testing
            await this.Property.connect(this.deployer).updatePropertyForTesting(3, 18, { from: this.deployer.address })

            // Approve 5 films by calling the approveFilms() from Studio
            const approveData = [pIds[0], pIds[1], pIds[2], pIds[3], pIds[4]]
            await this.Vote.connect(this.studio2).approveFilms(approveData);// filmId = 1, 2 ,3, 4, 5

            // Change film owner in APPROVED Status
            await expect(
                this.VabbleDAO.connect(this.deployer).changeOwner(fId1, this.studio1.address, { from: this.deployer.address })
            ).to.emit(this.VabbleDAO, 'ChangeFilmOwner').withArgs(
                fId1, this.deployer.address, this.studio1.address
            );

            // change owner back to again
            this.VabbleDAO.connect(this.studio1).changeOwner(fId1, this.deployer.address, { from: this.studio1.address })

            // Each customers 1 ~ 6 Deposit to fund on film-3 by USDC token
            const flag1 = 1;
            const flag2 = 2;
            const dAmount = getBigNumber(50, 6)
            await this.VabbleFund.connect(this.customer1).depositToFilm(fId3, dAmount, flag1, this.USDC.address, { from: this.customer1.address })
            await this.VabbleFund.connect(this.customer2).depositToFilm(fId3, dAmount, flag1, this.USDC.address, { from: this.customer2.address })
            await this.VabbleFund.connect(this.customer3).depositToFilm(fId3, dAmount, flag1, this.USDC.address, { from: this.customer3.address })
            await this.VabbleFund.connect(this.customer4).depositToFilm(fId3, dAmount, flag1, this.USDC.address, { from: this.customer4.address })
            await this.VabbleFund.connect(this.customer5).depositToFilm(fId3, dAmount, flag1, this.USDC.address, { from: this.customer5.address })
            await this.VabbleFund.connect(this.customer6).depositToFilm(fId3, dAmount, flag1, this.USDC.address, { from: this.customer6.address })

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
                const { signatureBytes, tx } = await generateSignature(this.GnosisSafe, encodedCallData, this.FilmNFT.address, [this.signer1, this.signer2]);
                await executeGnosisSafeTransaction(this.GnosisSafe, this.signer2, signatureBytes, tx);
            } else {
                await this.FilmNFT.connect(this.auditor).setBaseURI("base_uri", "collection_uri")
            }

            await this.FilmNFT.connect(this.deployer).setMintInfo(fId4, tier, nAmount, nPrice1, { from: this.deployer.address })
            await this.FilmNFT.connect(this.deployer).setMintInfo(fId5, tier, nAmount, nPrice2, { from: this.deployer.address })
            await this.FilmNFT.connect(this.deployer).deployFilmNFTContract(fId4, "test4 nft", "t4nft", { from: this.deployer.address })
            await this.FilmNFT.connect(this.deployer).deployFilmNFTContract(fId5, "test5 nft", "t5nft", { from: this.deployer.address })

            // Deposit to fund film by nft
            const dAmount1 = 100 //(maxMintAmount = nAmount = 8000)
            await this.VabbleFund.connect(this.customer1).depositToFilm(fId4, 1, flag2, this.USDC.address, { from: this.customer1.address })
            const investorList4 = await this.VabbleFund.getFilmInvestorList(fId4);
            console.log("Film4 Investor List", investorList4);

            await this.VabbleFund.connect(this.customer1).depositToFilm(fId5, dAmount1, flag2, this.USDC.address, { from: this.customer1.address })
            await this.VabbleFund.connect(this.customer2).depositToFilm(fId5, dAmount1, flag2, this.USDC.address, { from: this.customer2.address })

            const investorList5 = await this.VabbleFund.getFilmInvestorList(fId5);
            console.log("Film5 Investor List", investorList5);

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

            await this.VabbleFund.connect(this.deployer).fundProcess(fId3, { from: this.deployer.address })
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

            // Deposit VAB token for move from customer to staking pool using depositVAB
            await this.StakingPool.connect(this.customer1).depositVAB(getBigNumber(10000), { from: this.customer1.address })
            await this.StakingPool.connect(this.customer2).depositVAB(getBigNumber(15000), { from: this.customer2.address })
            await this.StakingPool.connect(this.customer3).depositVAB(getBigNumber(15000), { from: this.customer3.address })

            const VabbleDAO_balance1 = await this.vabToken.balanceOf(this.VabbleDAO.address)
            console.log('====VableDAO Balance1::', VabbleDAO_balance1 / getBigNumber(1));

            const StakingPool_balance1 = await this.vabToken.balanceOf(this.StakingPool.address)
            console.log('====StakingPool Balance1::', StakingPool_balance1 / getBigNumber(1));

            // Allocate to StudioPool (From Staking To Studio Pool)
            expect(await this.StakingPool.checkAllocateToPool(
                [this.customer1.address, this.customer2.address, this.customer3.address],
                [getBigNumber(500), getBigNumber(1000), getBigNumber(1000)]
            )).to.be.true;

            expect(await this.StakingPool.checkAllocateToPool(
                [this.customer1.address, this.customer2.address, this.customer3.address],
                [getBigNumber(20000), getBigNumber(1000), getBigNumber(1000)]
            )).to.be.false;

            if (GNOSIS_FLAG) {
                let encodedCallData = this.VabbleDAO.interface.encodeFunctionData("allocateToPool",
                    [
                        [this.customer1.address, this.customer2.address, this.customer3.address],
                        [getBigNumber(500), getBigNumber(1000), getBigNumber(1000)],
                        2
                    ]);

                // Generate Signature and Transaction information
                const { signatureBytes, tx } = await generateSignature(this.GnosisSafe, encodedCallData, this.VabbleDAO.address, [this.signer1, this.signer2]);
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
                        { from: this.auditor.address })
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

            period = 31 * 24 * 3600; // 31 days
            network.provider.send('evm_increaseTime', [period]);
            await network.provider.send('evm_mine');

            // ==================== setFinalFilms =====================================
            const filmIds = [fId1, fId2, fId3, fId4, fId5];
            expect(await this.VabbleDAO.checkSetFinalFilms(filmIds)).to.be.deep.equals([true, true, true, true, true]);

            if (GNOSIS_FLAG) {
                // => Increase next block timestamp for only testing
                let encodedCallData = this.VabbleDAO.interface.encodeFunctionData("startNewMonth", []);
                const { signatureBytes, tx } = await generateSignature(this.GnosisSafe, encodedCallData, this.VabbleDAO.address, [this.signer1, this.signer2]);
                await executeGnosisSafeTransaction(this.GnosisSafe, this.signer2, signatureBytes, tx);
            } else {
                await this.VabbleDAO.connect(this.auditor).startNewMonth();
            }

            if (GNOSIS_FLAG) {
                let encodedCallData = this.VabbleDAO.interface.encodeFunctionData("setFinalFilms",
                    [
                        filmIds,
                        [getBigNumber(100), getBigNumber(100), getBigNumber(100), getBigNumber(100), getBigNumber(100)]
                    ]);

                // Generate Signature and Transaction information
                const { signatureBytes, tx } = await generateSignature(this.GnosisSafe, encodedCallData, this.VabbleDAO.address, [this.signer1, this.signer2]);

                await executeGnosisSafeTransaction(this.GnosisSafe, this.signer2, signatureBytes, tx);
            } else {
                await this.VabbleDAO.connect(this.auditor).setFinalFilms(
                    filmIds,
                    [getBigNumber(100), getBigNumber(100), getBigNumber(100), getBigNumber(100), getBigNumber(100)]
                );
            }

            expect(await this.VabbleDAO.checkSetFinalFilms(filmIds)).to.be.deep.equals([false, false, false, false, false]);

            let monthId = await this.VabbleDAO.monthId() // 1 

            let finalFilmList = await this.VabbleDAO.getFinalizedFilmIds(monthId) // 1, 2, 3, 4, 5
            expect(finalFilmList.length).to.be.equal(5)

            // check each payeers finalized amount for each film
            monthId = await this.VabbleDAO.monthId() // 1 

            let users = [this.customer1, this.customer2, this.customer3, this.deployer, this.studio1];

            for (let i = 0; i < filmIds.length; i++) {
                const filmId = filmIds[i];

                let fa_list = [];

                for (let j = 0; j < users.length; j++) {
                    const user = users[j];

                    let fa = await this.VabbleDAO.finalizedAmount(monthId, filmId, user.address)
                    fa = fa / getBigNumber(1);

                    fa_list.push(fa);
                }

                console.log(`====finalizedAmount${i + 1}::`, fa_list);
            }

            const rewardAmount_Old = await this.VabbleDAO.connect(this.deployer).getUserRewardAmountForUser(fId3, monthId, this.deployer.address, { from: this.deployer.address });
            console.log("rewardAmount_Old", rewardAmount_Old / getBigNumber(1));

            const userFinaFilmIds_Old = await this.VabbleDAO.getUserFilmIds(this.deployer.address, 4);
            console.log("userFinaFilmIds_Old", userFinaFilmIds_Old);

            const allRewardAmount1_Old = await this.VabbleDAO.getAllAvailableRewards(monthId, this.deployer.address, { from: this.deployer.address });
            console.log("AllRewardAmount1_Old", allRewardAmount1_Old / getBigNumber(1));

            // Change Film Owner for film 1, 2, 3 and check finalized amount
            for (let i = 0; i < 3; i++) {
                const filmId = filmIds[i];
                await expect(
                    this.VabbleDAO.connect(this.deployer).changeOwner(filmId, this.studio1.address, { from: this.deployer.address })
                ).to.emit(this.VabbleDAO, 'ChangeFilmOwner').withArgs(
                    filmId, this.deployer.address, this.studio1.address
                );
            }

            for (let i = 0; i < filmIds.length; i++) {
                const filmId = filmIds[i];

                let fa_list = [];

                for (let j = 0; j < users.length; j++) {
                    const user = users[j];

                    let fa = await this.VabbleDAO.finalizedAmount(monthId, filmId, user.address)
                    fa = fa / getBigNumber(1);

                    fa_list.push(fa);
                }

                console.log(`====finalizedAmount2_${i + 1}::`, fa_list);
            }

            const userFinaFilmIds_New = await this.VabbleDAO.getUserFilmIds(this.studio1.address, 4);
            console.log("userFinaFilmIds_New", userFinaFilmIds_New);

            const rewardAmount_New_1 = await this.VabbleDAO.connect(this.studio1).getUserRewardAmountForUser(fId1, monthId, this.studio1.address, { from: this.studio1.address });
            console.log("rewardAmount_New_1", rewardAmount_New_1 / getBigNumber(1));

            const rewardAmount_New_3 = await this.VabbleDAO.connect(this.studio1).getUserRewardAmountForUser(fId3, monthId, this.studio1.address, { from: this.studio1.address });
            console.log("rewardAmount_New_3", rewardAmount_New_3 / getBigNumber(1));

            const allRewardAmount1_New = await this.VabbleDAO.connect(this.studio1).getAllAvailableRewards(monthId, this.studio1.address, { from: this.studio1.address });
            console.log("AllRewardAmount1_New", allRewardAmount1_New / getBigNumber(1));

            expect(rewardAmount_Old).to.be.equal(rewardAmount_New_3)
            // expect(allRewardAmount1_Old).to.be.equal(allRewardAmount1_New)

            const mId_1 = await this.VabbleDAO.latestClaimMonthId(fId1, this.studio1.address) // 1

            const v_1 = await this.vabToken.balanceOf(this.studio1.address)
            await this.VabbleDAO.connect(this.studio1).claimReward([fId1], { from: this.studio1.address })
            const v_2 = await this.vabToken.balanceOf(this.studio1.address);

            const rewardAmount_New_AfterClaim_1 = await this.VabbleDAO.connect(this.studio1).getUserRewardAmountForUser(fId1, monthId, this.studio1.address, { from: this.studio1.address });
            console.log("rewardAmount_New_AfterClaim_1", rewardAmount_New_AfterClaim_1 / getBigNumber(1));

            // should be 10 (because sharePercents (40/30/20/10))
            console.log('====studio1 (from deployer) received reward from film-1::', v_2.sub(v_1) / getBigNumber(1));
            expect(v_2.sub(v_1)).to.be.equal(getBigNumber(10));

            const mId_2 = await this.VabbleDAO.latestClaimMonthId(fId1, this.studio1.address) // 1

            console.log("====mId_1", mId_1.toString());
            console.log("====mId_2", mId_2.toString());

            const allRewardAmount2_New = await this.VabbleDAO.connect(this.studio1).getAllAvailableRewards(monthId, this.studio1.address, { from: this.studio1.address });
            console.log("allRewardAmount2_New", allRewardAmount2_New / getBigNumber(1));
            expect(allRewardAmount1_New.sub(allRewardAmount2_New)).to.be.equal(getBigNumber(10));


            // check VabbleDAO balance changes
            const studioPool_balance3 = await this.vabToken.balanceOf(this.VabbleDAO.address)
            console.log('====VableDAO Balance Changes::', studioPool_balance2.sub(studioPool_balance3) / getBigNumber(1)); // 50
            expect(studioPool_balance2.sub(studioPool_balance3)).to.be.equal(getBigNumber(10));

            // batch mint
            console.log("---------------------- NFT Film Change Owner ----------------------");
            await expect(
                this.FilmNFT.connect(this.customer3).claimNft(fId4, { from: this.customer3.address })
            ).to.be.revertedWith('claimNft: zero count');
            await this.FilmNFT.connect(this.customer1).claimNft(fId5, { from: this.customer1.address })
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

            await this.VabbleFund.connect(this.deployer).fundProcess(fId5, { from: this.deployer.address })
            const isProcessed1 = await this.VabbleFund.isFundProcessed(fId5);
            console.log("====isProcessed-1", isProcessed1)
            expect(isProcessed1).to.be.equal(true);

            // ==================== setFinalFilms =====================================
            expect(await this.VabbleDAO.checkSetFinalFilms([fId1, fId2, fId3, fId4, fId5])).to.be.deep.equals([true, true, true, true, true]);
            if (GNOSIS_FLAG) {
                let encodedCallData = this.VabbleDAO.interface.encodeFunctionData("startNewMonth", []);
                const { signatureBytes, tx } = await generateSignature(this.GnosisSafe, encodedCallData, this.VabbleDAO.address, [this.signer1, this.signer2]);
                await executeGnosisSafeTransaction(this.GnosisSafe, this.signer2, signatureBytes, tx);
            } else {
                await this.VabbleDAO.connect(this.auditor).startNewMonth();
            }

            if (GNOSIS_FLAG) {
                let encodedCallData = this.VabbleDAO.interface.encodeFunctionData("setFinalFilms",
                    [
                        [fId4, fId5],
                        [getBigNumber(300), getBigNumber(200)]
                    ]);

                // Generate Signature and Transaction information
                const { signatureBytes, tx } = await generateSignature(this.GnosisSafe, encodedCallData, this.VabbleDAO.address, [this.signer1, this.signer2]);

                await executeGnosisSafeTransaction(this.GnosisSafe, this.signer2, signatureBytes, tx);
            } else {
                await this.VabbleDAO.connect(this.auditor).setFinalFilms(
                    [fId4, fId5],
                    [getBigNumber(300), getBigNumber(200)]
                );
            }
            expect(await this.VabbleDAO.checkSetFinalFilms([fId1, fId2, fId3, fId4, fId5])).to.be.deep.equals([true, true, true, false, false]);

            monthId = await this.VabbleDAO.monthId() // 2 

            // film-4 reward: 
            // 300 -> 40/30/20/10 -> [120, 90, 60, 30]

            // film-5 reward: 200 -> 180 + 20
            // 180 -> 40/30/20/10 -> [72, 54, 36, 18]
            // 20 -> 50/50 -> [10, 10, 0, 0]
            // Result -> [82, 64, 36, 18]
            for (let i = 0; i < filmIds.length; i++) {
                const filmId = filmIds[i];

                let fa_list = [];

                for (let j = 0; j < users.length; j++) {
                    const user = users[j];

                    let fa = await this.VabbleDAO.finalizedAmount(monthId, filmId, user.address)
                    fa = fa / getBigNumber(1);

                    fa_list.push(fa);
                }

                if (i < 3)
                    expect(fa_list).to.be.deep.equal([0, 0, 0, 0, 0]);

                if (i == 3) // film 4
                    expect(fa_list).to.be.deep.equal([120, 90, 60, 30, 0]);

                if (i == 4) // film 5
                    expect(fa_list).to.be.deep.equal([82, 64, 36, 18, 0]);


                console.log(`====finalizedAmount${i + 1}::`, fa_list);
            }

            // Change Film Owner for film 4, 5 and check finalized amount
            for (let i = 3; i < filmIds.length; i++) {
                const filmId = filmIds[i];
                await expect(
                    this.VabbleDAO.connect(this.deployer).changeOwner(filmId, this.studio1.address, { from: this.deployer.address })
                ).to.emit(this.VabbleDAO, 'ChangeFilmOwner').withArgs(
                    filmId, this.deployer.address, this.studio1.address
                );
            }

            console.log("===== After change film 4, 5's owner, check finalized amount ======");

            for (let i = 0; i < filmIds.length; i++) {
                const filmId = filmIds[i];

                let fa_list = [];

                for (let j = 0; j < users.length; j++) {
                    const user = users[j];

                    let fa = await this.VabbleDAO.finalizedAmount(monthId, filmId, user.address)
                    fa = fa / getBigNumber(1);

                    fa_list.push(fa);
                }

                if (i < 3)
                    expect(fa_list).to.be.deep.equal([0, 0, 0, 0, 0]);

                if (i == 3) // film 4
                    expect(fa_list).to.be.deep.equal([120, 90, 60, 0, 30]);

                if (i == 4) // film 5
                    expect(fa_list).to.be.deep.equal([82, 64, 36, 0, 18]);

                console.log(`====finalizedAmount2_${i + 1}::`, fa_list);
            }

            const allRewardAmount4_1_New = await this.VabbleDAO.connect(this.studio1).getAllAvailableRewards(monthId, this.studio1.address, { from: this.studio1.address });
            console.log("allRewardAmount4_1_New", allRewardAmount4_1_New / getBigNumber(1));

            const v_4_1 = await this.vabToken.balanceOf(this.studio1.address)
            await this.VabbleDAO.connect(this.studio1).claimReward([fId4], { from: this.studio1.address })
            const v_4_2 = await this.vabToken.balanceOf(this.studio1.address);

            // month 1 - 10, month 2, 30 -> 10 + 30 = 40
            console.log("====Studio 1 Film 4 claimReward::", v_4_2.sub(v_4_1) / getBigNumber(1));
            expect(v_4_2.sub(v_4_1)).to.be.equal(getBigNumber(40));

            const allRewardAmount4_2_New = await this.VabbleDAO.connect(this.studio1).getAllAvailableRewards(monthId, this.studio1.address, { from: this.studio1.address });
            console.log("allRewardAmount4_2_New", allRewardAmount4_2_New / getBigNumber(1));
            expect(allRewardAmount4_1_New.sub(allRewardAmount4_2_New)).to.be.equal(getBigNumber(40));

            const allRewardAmount5_1_New = await this.VabbleDAO.connect(this.studio1).getAllAvailableRewards(monthId, this.studio1.address, { from: this.studio1.address });
            console.log("allRewardAmount5_1_New", allRewardAmount5_1_New / getBigNumber(1));

            const v_5_1 = await this.vabToken.balanceOf(this.studio1.address)
            await this.VabbleDAO.connect(this.studio1).claimReward([fId5], { from: this.studio1.address })
            const v_5_2 = await this.vabToken.balanceOf(this.studio1.address);

            // month 1 - 9, month 2, 18 -> 9 + 18 = 27
            console.log("====Studio 1 Film 5 claimReward::", v_5_2.sub(v_5_1) / getBigNumber(1));
            expect(v_5_2.sub(v_5_1)).to.be.equal(getBigNumber(27));

            const allRewardAmount5_2_New = await this.VabbleDAO.connect(this.studio1).getAllAvailableRewards(monthId, this.studio1.address, { from: this.studio1.address });
            console.log("allRewardAmount5_2_New", allRewardAmount5_2_New / getBigNumber(1));
            expect(allRewardAmount5_1_New.sub(allRewardAmount5_2_New)).to.be.equal(getBigNumber(27));

            // claim film 1 at month 1, claim film 4, 5 at month 2
            const lastClaimMonthIds = [1, 0, 0, 2, 2];
            for (let i = 0; i < filmIds.length; i++) {
                const filmId = filmIds[i];
                const mId1 = await this.VabbleDAO.latestClaimMonthId(filmId, this.studio1.address) // 1

                expect(mId1).to.be.equal(lastClaimMonthIds[i])
            }

            await expect(
                this.VabbleDAO.connect(this.studio1).claimReward([fId4], { from: this.studio1.address })
            ).to.be.revertedWith('cAR: zero amount');

        } catch (error) {
            console.error("Error:", error);
        }
    });

});