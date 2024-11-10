const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("VabbleKeyzAuction", function () {
    const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const price = ethers.utils.parseEther("1");

    async function deployContractsFixture() {
        const [owner, roomOwner, bidder1, bidder2, daoAddress, ipOwnerAddress] = await ethers.getSigners();

        // Deploy ETH receiver first
        const ETHReceiver = await ethers.getContractFactory("ETHReceiver");
        const vabbleReceiver = await ETHReceiver.deploy();
        await vabbleReceiver.deployed();

        // Deploy mock token with ETH receiver
        const MockVabbleToken = await ethers.getContractFactory("MockVabbleToken");
        const mockVabbleToken = await MockVabbleToken.deploy(vabbleReceiver.address);
        await mockVabbleToken.deployed();

        // Deploy UniswapRouter
        const MockUniswapRouter = await ethers.getContractFactory("MockUniswapRouter");
        const mockUniswapRouter = await MockUniswapRouter.deploy(
            mockVabbleToken.address,
            WETH_ADDRESS
        );
        await mockUniswapRouter.deployed();

        // Deploy UniHelper
        const MockUniHelper = await ethers.getContractFactory("MockUniHelper");
        const mockUniHelper = await MockUniHelper.deploy(
            mockVabbleToken.address,
            WETH_ADDRESS
        );
        await mockUniHelper.deployed();

        // Deploy staking pool
        const MockStakingPool = await ethers.getContractFactory("MockStakingPool");
        const mockStakingPool = await MockStakingPool.deploy(mockVabbleToken.address);
        await mockStakingPool.deployed();

        // Deploy main auction contract
        const VabbleKeyzAuction = await ethers.getContractFactory("VabbleKeyzAuction");
        const auction = await VabbleKeyzAuction.deploy(
            mockVabbleToken.address,
            daoAddress.address,
            ipOwnerAddress.address,
            mockUniHelper.address,
            mockStakingPool.address,
            mockUniswapRouter.address
        );
        await auction.deployed();

        // Fund contracts with ETH
        await owner.sendTransaction({
            to: vabbleReceiver.address,
            value: ethers.utils.parseEther("10")
        });

        await owner.sendTransaction({
            to: auction.address,
            value: ethers.utils.parseEther("10")
        });

        // Setup approvals and initial token balance
        await mockVabbleToken.connect(owner).approve(mockStakingPool.address, ethers.constants.MaxUint256);
        await mockVabbleToken.connect(owner).approve(auction.address, ethers.constants.MaxUint256);
        await mockVabbleToken.mint(mockUniswapRouter.address, ethers.utils.parseEther("1000000"));

        return {
            auction,
            mockVabbleToken,
            mockUniHelper,
            mockStakingPool,
            mockUniswapRouter,
            vabbleReceiver,
            owner,
            roomOwner,
            bidder1,
            bidder2,
            daoAddress,
            ipOwnerAddress
        };
    }

    describe("Deployment", function () {
        it("Should set the correct initial values", async function () {
            const {
                auction,
                mockVabbleToken,
                mockUniHelper,
                mockStakingPool,
                mockUniswapRouter,
                daoAddress,
                ipOwnerAddress
            } = await loadFixture(deployContractsFixture);

            expect(await auction.vabbleAddress()).to.equal(mockVabbleToken.address);
            expect(await auction.daoAddress()).to.equal(daoAddress.address);
            expect(await auction.ipOwnerAddress()).to.equal(ipOwnerAddress.address);
            expect(await auction.UNI_HELPER()).to.equal(mockUniHelper.address);
            expect(await auction.STAKING_POOL()).to.equal(mockStakingPool.address);
            expect(await auction.UNISWAP_ROUTER()).to.equal(mockUniswapRouter.address);

            expect((await auction.vabbleShare()).toNumber()).to.equal(15);
            expect((await auction.daoShare()).toNumber()).to.equal(10);
            expect((await auction.minIpOwnerShare()).toNumber()).to.equal(30);
            expect((await auction.percentagePrecision()).toNumber()).to.equal(1000);
            expect((await auction.maxDurationInMinutes()).toNumber()).to.equal(2880);
            expect((await auction.minBidIncrementAllowed()).toNumber()).to.equal(1);
            expect((await auction.maxBidIncrementAllowed()).toNumber()).to.equal(50000);
        });
    });

    describe("Sale Creation", function () {
        it("Should create an auction sale successfully", async function () {
            const { auction, roomOwner } = await loadFixture(deployContractsFixture);

            const tx = await auction.connect(roomOwner).createSale(
                1, // roomId
                0, // SaleType.Auction
                60, // durationInMinutes
                5, // totalKeys
                price,
                100, // minBidIncrement (10%)
                50 // ipOwnerShare (5%)
            );

            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === 'SaleCreated');
            expect(event).to.not.be.undefined;

            const sale = await auction.sales(1);
            expect(sale.roomOwner).to.equal(roomOwner.address);
            expect(sale.roomId).to.equal(1);
            expect(sale.saleType).to.equal(0);
            expect(sale.totalKeys).to.equal(5);
            expect(sale.price).to.equal(price);
            expect(sale.minBidIncrement).to.equal(100);
            expect(sale.ipOwnerShare).to.equal(50);
            expect(sale.settled).to.be.false;
        });

        it("Should fail if duration exceeds max limit", async function () {
            const { auction, roomOwner } = await loadFixture(deployContractsFixture);
            const maxDuration = await auction.maxDurationInMinutes();

            await expect(auction.connect(roomOwner).createSale(
                1,
                0,
                maxDuration.add(1),
                5,
                price,
                100,
                50
            )).to.be.revertedWith("Duration exceeds max limit");
        });

        it("Should fail if IP owner share is too low", async function () {
            const { auction, roomOwner } = await loadFixture(deployContractsFixture);
            const minShare = await auction.minIpOwnerShare();

            await expect(auction.connect(roomOwner).createSale(
                1,
                0,
                60,
                5,
                price,
                100,
                minShare.sub(1)
            )).to.be.revertedWith("IP Owner share too low");
        });
    });

    describe("Bidding", function () {
        let auction, roomOwner, bidder1, bidder2;
        let saleId = 1;

        beforeEach(async function () {
            const contracts = await loadFixture(deployContractsFixture);
            auction = contracts.auction;
            roomOwner = contracts.roomOwner;
            bidder1 = contracts.bidder1;
            bidder2 = contracts.bidder2;

            await auction.connect(roomOwner).createSale(
                1,
                0,
                60,
                5,
                price,
                100,
                50
            );
        });

        it("Should accept first bid at starting price", async function () {
            await expect(auction.connect(bidder1).placeBid(saleId, 0, { value: price }))
                .to.emit(auction, "BidPlaced")
                .withArgs(saleId, 0, bidder1.address, price);
        });

        it("Should require higher bid to outbid", async function () {
            await auction.connect(bidder1).placeBid(saleId, 0, { value: price });
            const minNextBid = price.mul(110).div(100); // 10% increase

            await expect(
                auction.connect(bidder2).placeBid(saleId, 0, { value: price })
            ).to.be.revertedWith("Bid too low");

            await expect(auction.connect(bidder2).placeBid(saleId, 0, { value: minNextBid }))
                .to.emit(auction, "BidPlaced")
                .withArgs(saleId, 0, bidder2.address, minNextBid);
        });

        it("Should refund previous bidder when outbid", async function () {
            await auction.connect(bidder1).placeBid(saleId, 0, { value: price });
            const bidder1BalanceBefore = await bidder1.getBalance();

            await auction.connect(bidder2).placeBid(saleId, 0, { value: price.mul(11).div(10) });

            const bidder1BalanceAfter = await bidder1.getBalance();
            expect(bidder1BalanceAfter.sub(bidder1BalanceBefore)).to.equal(price);
        });
    });

    describe("Instant Buy", function () {
        let auction, roomOwner, bidder1, bidder2;
        let saleId = 1;

        beforeEach(async function () {
            const contracts = await loadFixture(deployContractsFixture);
            auction = contracts.auction;
            roomOwner = contracts.roomOwner;
            bidder1 = contracts.bidder1;
            bidder2 = contracts.bidder2;

            await auction.connect(roomOwner).createSale(
                1,
                1, // SaleType.InstantBuy
                60,
                5,
                price,
                0,
                50
            );
        });

        it("Should allow instant buy at listing price", async function () {
            await expect(auction.connect(bidder1).buyNow(saleId, 0, { value: price }))
                .to.emit(auction, "InstantBuy")
                .withArgs(saleId, 0, bidder1.address, price);
        });

        it("Should mark key as unavailable after purchase", async function () {
            await auction.connect(bidder1).buyNow(saleId, 0, { value: price });
            expect(await auction.isKeyAvailable(saleId, 0)).to.be.false;
        });

        it("Should not allow buying unavailable key", async function () {
            await auction.connect(bidder1).buyNow(saleId, 0, { value: price });
            await expect(
                auction.connect(bidder2).buyNow(saleId, 0, { value: price })
            ).to.be.revertedWith("Key not available");
        });
    });

    describe("Sale Settlement", function () {
        let contracts;
        let saleId = 1;

        beforeEach(async function () {
            contracts = await loadFixture(deployContractsFixture);

            await contracts.auction.connect(contracts.roomOwner).createSale(
                1,
                0,
                60,
                2,
                price,
                100,
                50
            );

            await contracts.auction.connect(contracts.bidder1).placeBid(saleId, 0, { value: price.mul(2) });
            await contracts.auction.connect(contracts.bidder2).placeBid(saleId, 1, { value: price.mul(3) });
        });

        it("Should settle sale and distribute funds correctly", async function () {
            await time.increase(3600);

            const totalAmount = price.mul(5);
            const vabbleAmount = totalAmount.mul(15).div(1000);
            const daoAmount = totalAmount.mul(10).div(1000);
            const ipOwnerAmount = totalAmount.mul(50).div(1000);

            const vabbleBalanceBefore = await ethers.provider.getBalance(contracts.vabbleReceiver.address);
            const ipOwnerBalanceBefore = await ethers.provider.getBalance(contracts.ipOwnerAddress.address);
            const stakingPoolVabBalanceBefore = await contracts.mockVabbleToken.balanceOf(contracts.mockStakingPool.address);

            await contracts.auction.settleSale(saleId);

            const vabbleBalanceAfter = await ethers.provider.getBalance(contracts.vabbleReceiver.address);
            const ipOwnerBalanceAfter = await ethers.provider.getBalance(contracts.ipOwnerAddress.address);
            const stakingPoolVabBalanceAfter = await contracts.mockVabbleToken.balanceOf(contracts.mockStakingPool.address);

            expect(vabbleBalanceAfter.sub(vabbleBalanceBefore)).to.equal(vabbleAmount);
            expect(ipOwnerBalanceAfter.sub(ipOwnerBalanceBefore)).to.equal(ipOwnerAmount);

            const expectedVabIncrease = daoAmount.mul(2);
            expect(stakingPoolVabBalanceAfter.sub(stakingPoolVabBalanceBefore)).to.equal(expectedVabIncrease);

            const sale = await contracts.auction.sales(saleId);
            expect(sale.settled).to.be.true;
        });

        it("Should not allow settling before sale ends", async function () {
            await expect(
                contracts.auction.settleSale(saleId)
            ).to.be.revertedWith("Sale not ended");
        });

        it("Should not allow settling twice", async function () {
            await time.increase(3600);
            await contracts.auction.settleSale(saleId);
            await expect(
                contracts.auction.settleSale(saleId)
            ).to.be.revertedWith("Sale already settled");
        });
    });

    describe("Administrative Functions", function () {
        let auction, owner, nonOwner;
        let vabbleReceiver, daoAddress, ipOwnerReceiver;

        beforeEach(async function () {
            const contracts = await loadFixture(deployContractsFixture);
            auction = contracts.auction;
            owner = contracts.owner;
            nonOwner = contracts.bidder1;
            vabbleReceiver = contracts.vabbleReceiver;
            daoAddress = contracts.daoAddress;
            ipOwnerReceiver = contracts.ipOwnerReceiver;
        });

        describe("Share Management", function () {
            it("Should allow owner to update vabble share", async function () {
                const newShare = 20;
                await expect(auction.connect(owner).setVabbleShare(newShare))
                    .to.emit(auction, "VabbleShareUpdated")
                    .withArgs(newShare);
                expect(await auction.vabbleShare()).to.equal(newShare);
            });

            it("Should allow owner to update dao share", async function () {
                const newShare = 15;
                await expect(auction.connect(owner).setDaoShare(newShare))
                    .to.emit(auction, "DaoShareUpdated")
                    .withArgs(newShare);
                expect(await auction.daoShare()).to.equal(newShare);
            });

            it("Should allow owner to update minimum IP owner share", async function () {
                const newShare = 40;
                await expect(auction.connect(owner).setMinIpOwnerShare(newShare))
                    .to.emit(auction, "MinIpOwnerShareUpdated")
                    .withArgs(newShare);
                expect(await auction.minIpOwnerShare()).to.equal(newShare);
            });

            it("Should allow owner to update percentage precision", async function () {
                const newPrecision = 10000;
                await expect(auction.connect(owner).setPercentagePrecision(newPrecision))
                    .to.emit(auction, "PercentagePrecisionUpdated")
                    .withArgs(newPrecision);
                expect(await auction.percentagePrecision()).to.equal(newPrecision);
            });

            it("Should prevent non-owner from updating shares", async function () {
                await expect(
                    auction.connect(nonOwner).setVabbleShare(20)
                ).to.be.revertedWith("Ownable: caller is not the owner");

                await expect(
                    auction.connect(nonOwner).setDaoShare(15)
                ).to.be.revertedWith("Ownable: caller is not the owner");

                await expect(
                    auction.connect(nonOwner).setMinIpOwnerShare(40)
                ).to.be.revertedWith("Ownable: caller is not the owner");

                await expect(
                    auction.connect(nonOwner).setPercentagePrecision(10000)
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("Address Management", function () {
            it("Should allow owner to update vabble address", async function () {
                const newAddress = nonOwner.address;
                await expect(auction.connect(owner).setVabbleAddress(newAddress))
                    .to.emit(auction, "VabbleAddressUpdated")
                    .withArgs(newAddress);
                expect(await auction.vabbleAddress()).to.equal(newAddress);
            });

            it("Should allow owner to update dao address", async function () {
                const newAddress = nonOwner.address;
                await expect(auction.connect(owner).setDaoAddress(newAddress))
                    .to.emit(auction, "DaoAddressUpdated")
                    .withArgs(newAddress);
                expect(await auction.daoAddress()).to.equal(newAddress);
            });

            it("Should allow owner to update IP owner address", async function () {
                const newAddress = nonOwner.address;
                await expect(auction.connect(owner).setIpOwnerAddress(newAddress))
                    .to.emit(auction, "IpOwnerAddressUpdated")
                    .withArgs(newAddress);
                expect(await auction.ipOwnerAddress()).to.equal(newAddress);
            });

            it("Should prevent setting addresses to zero address", async function () {
                const zeroAddress = ethers.constants.AddressZero;
                await expect(
                    auction.connect(owner).setVabbleAddress(zeroAddress)
                ).to.be.revertedWith("Invalid address");

                await expect(
                    auction.connect(owner).setDaoAddress(zeroAddress)
                ).to.be.revertedWith("Invalid address");

                await expect(
                    auction.connect(owner).setIpOwnerAddress(zeroAddress)
                ).to.be.revertedWith("Invalid address");
            });

            it("Should prevent non-owner from updating addresses", async function () {
                const newAddress = nonOwner.address;
                await expect(
                    auction.connect(nonOwner).setVabbleAddress(newAddress)
                ).to.be.revertedWith("Ownable: caller is not the owner");

                await expect(
                    auction.connect(nonOwner).setDaoAddress(newAddress)
                ).to.be.revertedWith("Ownable: caller is not the owner");

                await expect(
                    auction.connect(nonOwner).setIpOwnerAddress(newAddress)
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("Duration and Bid Increment Management", function () {
            it("Should allow owner to update max duration in minutes", async function () {
                const newDuration = 4320; // 72 hours
                await expect(auction.connect(owner).setMaxDurationInMinutes(newDuration))
                    .to.emit(auction, "MaxDurationInMinutesUpdated")
                    .withArgs(newDuration);
                expect(await auction.maxDurationInMinutes()).to.equal(newDuration);
            });

            it("Should allow owner to update minimum bid increment allowed", async function () {
                const newIncrement = 5;
                await expect(auction.connect(owner).setMinBidIncrementAllowed(newIncrement))
                    .to.emit(auction, "MinBidIncrementAllowedUpdated")
                    .withArgs(newIncrement);
                expect(await auction.minBidIncrementAllowed()).to.equal(newIncrement);
            });

            it("Should allow owner to update maximum bid increment allowed", async function () {
                const newIncrement = 100000;
                await expect(auction.connect(owner).setMaxBidIncrementAllowed(newIncrement))
                    .to.emit(auction, "MaxBidIncrementAllowedUpdated")
                    .withArgs(newIncrement);
                expect(await auction.maxBidIncrementAllowed()).to.equal(newIncrement);
            });

            it("Should prevent setting max duration to zero", async function () {
                await expect(
                    auction.connect(owner).setMaxDurationInMinutes(0)
                ).to.be.revertedWith("Duration must be greater than 0");
            });

            it("Should prevent non-owner from updating duration and increments", async function () {
                await expect(
                    auction.connect(nonOwner).setMaxDurationInMinutes(4320)
                ).to.be.revertedWith("Ownable: caller is not the owner");

                await expect(
                    auction.connect(nonOwner).setMinBidIncrementAllowed(5)
                ).to.be.revertedWith("Ownable: caller is not the owner");

                await expect(
                    auction.connect(nonOwner).setMaxBidIncrementAllowed(100000)
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("Pause Functionality", function () {
            it("Should allow owner to pause", async function () {
                await expect(auction.connect(owner).pause())
                    .to.emit(auction, "Paused")
                    .withArgs(owner.address);
                expect(await auction.paused()).to.be.true;
            });

            it("Should allow owner to unpause", async function () {
                await auction.connect(owner).pause();
                await expect(auction.connect(owner).unpause())
                    .to.emit(auction, "Unpaused")
                    .withArgs(owner.address);
                expect(await auction.paused()).to.be.false;
            });

            it("Should prevent non-owner from pausing", async function () {
                await expect(
                    auction.connect(nonOwner).pause()
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("Should prevent non-owner from unpausing", async function () {
                await auction.connect(owner).pause();
                await expect(
                    auction.connect(nonOwner).unpause()
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("Should prevent pausing when already paused", async function () {
                await auction.connect(owner).pause();
                await expect(
                    auction.connect(owner).pause()
                ).to.be.revertedWith("Pausable: paused");
            });

            it("Should prevent unpausing when not paused", async function () {
                await expect(
                    auction.connect(owner).unpause()
                ).to.be.revertedWith("Pausable: not paused");
            });

            it("Should prevent actions when paused", async function () {
                await auction.connect(owner).pause();

                // Try to create a sale while paused
                await expect(
                    auction.connect(owner).createSale(
                        1,
                        0,
                        60,
                        5,
                        ethers.utils.parseEther("1"),
                        100,
                        50
                    )
                ).to.be.revertedWith("Pausable: paused");
            });
        });
    });
});