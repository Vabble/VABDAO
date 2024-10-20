// test/VabbleKeyzAuction.test.js

const chai = require("chai");
const { expect } = chai;
const { ethers } = require("hardhat");
const { solidity } = require("ethereum-waffle");

chai.use(solidity);

describe("VabbleKeyzAuction Contract Tests", function () {
    let VabbleKeyzAuction, auctionContract;
    let owner, addr1, addr2, addr3, addr4;
    let vabbleAddress, daoAddress, ipOwnerAddress;
    const SaleType = { Auction: 0, InstantBuy: 1 };

    beforeEach(async function () {
        // Get the ContractFactory and Signers here.
        VabbleKeyzAuction = await ethers.getContractFactory("VabbleKeyzAuction");
        [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();

        // Deploy the contract
        vabbleAddress = addr1;
        daoAddress = addr2;
        ipOwnerAddress = addr3;

        auctionContract = await VabbleKeyzAuction.deploy(
            vabbleAddress.address,
            daoAddress.address,
            ipOwnerAddress.address
        );
        await auctionContract.deployed();
    });


    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await auctionContract.owner()).to.equal(owner.address);
        });

        it("Should set initial parameters correctly", async function () {
            expect(await auctionContract.vabbleAddress()).to.equal(vabbleAddress.address);
            expect(await auctionContract.daoAddress()).to.equal(daoAddress.address);
            expect(await auctionContract.ipOwnerAddress()).to.equal(ipOwnerAddress.address);

            expect(await auctionContract.vabbleShare()).to.equal(ethers.BigNumber.from(15));
            expect(await auctionContract.daoShare()).to.equal(10);
            expect(await auctionContract.minIpOwnerShare()).to.equal(30);
            expect(await auctionContract.percentagePrecision()).to.equal(1000);

            expect(await auctionContract.maxDurationInMinutes()).to.equal(2880);
            expect(await auctionContract.minBidIncrementAllowed()).to.equal(1);
            expect(await auctionContract.maxBidIncrementAllowed()).to.equal(50000);
        });
    });

    describe("Administrative Functions", function () {
        it("Should allow the owner to update parameters", async function () {
            await auctionContract.setVabbleShare(20);
            expect(await auctionContract.vabbleShare()).to.equal(20);

            await auctionContract.setDaoShare(15);
            expect(await auctionContract.daoShare()).to.equal(15);

            await auctionContract.setMinIpOwnerShare(50);
            expect(await auctionContract.minIpOwnerShare()).to.equal(50);

            await auctionContract.setPercentagePrecision(10000);
            expect(await auctionContract.percentagePrecision()).to.equal(10000);

            await auctionContract.setMaxDurationInMinutes(1440); // 24 hours
            expect(await auctionContract.maxDurationInMinutes()).to.equal(1440);

            await auctionContract.setMinBidIncrementAllowed(5); // 0.5%
            expect(await auctionContract.minBidIncrementAllowed()).to.equal(5);

            await auctionContract.setMaxBidIncrementAllowed(10000); // 1000%
            expect(await auctionContract.maxBidIncrementAllowed()).to.equal(10000);

            await auctionContract.setVabbleAddress(addr4.address);
            expect(await auctionContract.vabbleAddress()).to.equal(addr4.address);

            await auctionContract.setDaoAddress(addr4.address);
            expect(await auctionContract.daoAddress()).to.equal(addr4.address);

            await auctionContract.setIpOwnerAddress(addr4.address);
            expect(await auctionContract.ipOwnerAddress()).to.equal(addr4.address);
        });

        it("Should not allow non-owner to update parameters", async function () {
            await expect(
                auctionContract.connect(addr1).setVabbleShare(20)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should allow the owner to pause and unpause the contract", async function () {
            await auctionContract.pause();
            expect(await auctionContract.paused()).to.be.true;

            await auctionContract.unpause();
            expect(await auctionContract.paused()).to.be.false;
        });

        it("Should not allow non-owner to pause or unpause", async function () {
            await expect(auctionContract.connect(addr1).pause()).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });
    });

    describe("Creating Sales", function () {
        it("Should allow creating a sale with valid parameters", async function () {
            const tx = await auctionContract.createSale(
                1, // roomId
                SaleType.Auction,
                60, // duration in minutes
                10, // keysForSale
                ethers.utils.parseEther("1"), // price
                100, // minBidIncrement (10%)
                50 // ipOwnerShare (5%)
            );
            await tx.wait();

            const sale = await auctionContract.sales(1);
            expect(sale.roomOwner).to.equal(owner.address);
            expect(sale.roomId).to.equal(1);
            expect(sale.saleType).to.equal(SaleType.Auction);
            expect(sale.keysForSale).to.equal(10);
            expect(sale.price).to.equal(ethers.utils.parseEther("1"));
            expect(sale.minBidIncrement).to.equal(100);
            expect(sale.ipOwnerShare).to.equal(50);
        });

        it("Should revert if duration exceeds max limit", async function () {
            await expect(
                auctionContract.createSale(
                    1,
                    SaleType.Auction,
                    3000, // exceeds maxDurationInMinutes
                    10,
                    ethers.utils.parseEther("1"),
                    100,
                    50
                )
            ).to.be.revertedWith("Duration exceeds max limit");
        });

        it("Should revert if IP Owner share is below minimum", async function () {
            await expect(
                auctionContract.createSale(
                    1,
                    SaleType.Auction,
                    60,
                    10,
                    ethers.utils.parseEther("1"),
                    100,
                    20 // below minIpOwnerShare
                )
            ).to.be.revertedWith("IP Owner share too low");
        });

        it("Should revert if bid increment is invalid", async function () {
            await expect(
                auctionContract.createSale(
                    1,
                    SaleType.Auction,
                    60,
                    10,
                    ethers.utils.parseEther("1"),
                    0, // below minBidIncrementAllowed
                    50
                )
            ).to.be.revertedWith("Invalid bid increment");

            await expect(
                auctionContract.createSale(
                    1,
                    SaleType.Auction,
                    60,
                    10,
                    ethers.utils.parseEther("1"),
                    60000, // exceeds maxBidIncrementAllowed
                    50
                )
            ).to.be.revertedWith("Invalid bid increment");
        });
    });

    describe("Placing Bids", function () {
        beforeEach(async function () {
            // Create an auction sale
            await auctionContract.createSale(
                1,
                SaleType.Auction,
                60,
                10,
                ethers.utils.parseEther("1"),
                100, // 10%
                50
            );
        });

        it("Should allow placing a valid bid", async function () {
            // First bid
            await auctionContract.connect(addr1).placeBid(1, { value: ethers.utils.parseEther("1") });

            let sale = await auctionContract.sales(1);
            expect(sale.highestBid).to.equal(ethers.utils.parseEther("1"));
            expect(sale.highestBidder).to.equal(addr1.address);

            // Second bid with minimum increment
            const minIncrement = sale.highestBid.mul(sale.minBidIncrement).div(await auctionContract.percentagePrecision());
            const newBid = sale.highestBid.add(minIncrement);

            await auctionContract.connect(addr2).placeBid(1, { value: newBid });

            sale = await auctionContract.sales(1);
            expect(sale.highestBid).to.equal(newBid);
            expect(sale.highestBidder).to.equal(addr2.address);
        });

        it("Should refund the previous highest bidder", async function () {
            // Place initial bid
            const initialBalance = await addr1.getBalance();
            const tx1 = await auctionContract.connect(addr1).placeBid(1, { value: ethers.utils.parseEther("1") });
            const receipt1 = await tx1.wait();
            const gasUsed1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            // Calculate balance after placing the initial bid
            const balanceAfterFirstBid = initialBalance.sub(ethers.utils.parseEther("1")).sub(gasUsed1);

            // Place higher bid
            const tx2 = await auctionContract.connect(addr2).placeBid(1, { value: ethers.utils.parseEther("1.1") });
            await tx2.wait();  // We don't need gasUsed2 for addr2's transaction in this context

            // Capture final balance of the initial bidder
            const finalBalance = await addr1.getBalance();

            // Calculate the expected balance after the refund
            const expectedBalance = balanceAfterFirstBid.add(ethers.utils.parseEther("1"));

            // Log values to debug
            // console.log("Initial Balance:", initialBalance.toString());
            // console.log("Gas Used for Bid 1:", gasUsed1.toString());
            // console.log("Balance After First Bid:", balanceAfterFirstBid.toString());
            // console.log("Final Balance:", finalBalance.toString());
            // console.log("Expected Balance:", expectedBalance.toString());

            // Assert the balances are exactly equal
            expect(finalBalance).to.equal(expectedBalance);
        });

        it("Should revert if bid is too low", async function () {
            await auctionContract.connect(addr1).placeBid(1, { value: ethers.utils.parseEther("1") });

            // Try placing a lower bid
            await expect(
                auctionContract.connect(addr2).placeBid(1, { value: ethers.utils.parseEther("1.05") })
            ).to.be.revertedWith("Bid too low");
        });

        it("Should revert if sale is not active", async function () {
            // Increase time to after sale end
            await ethers.provider.send("evm_increaseTime", [3600]); // Increase by 1 hour
            await ethers.provider.send("evm_mine", []);

            await expect(
                auctionContract.connect(addr1).placeBid(1, { value: ethers.utils.parseEther("1") })
            ).to.be.revertedWith("Sale ended");
        });
    });

    describe("Instant Buy", function () {
        beforeEach(async function () {
            // Create an instant buy sale
            await auctionContract.createSale(
                2,
                SaleType.InstantBuy,
                60,
                10,
                ethers.utils.parseEther("2"), // price
                0,
                50
            );
        });

        it("Should allow buying instantly", async function () {
            // Create an instant buy sale
            const createSaleTx = await auctionContract.createSale(
                1, // roomId
                SaleType.InstantBuy,
                60, // Duration in minutes
                10, // Keys for sale
                ethers.utils.parseEther("1"), // Price
                0, // Min bid increment (not needed for instant buy)
                50 // IP Owner share (>= minIpOwnerShare)
            );
            await createSaleTx.wait();

            // Retrieve sale ID to make sure it was created successfully
            const saleId = await auctionContract.saleCounter();
            console.log("Sale ID:", saleId.toString());

            // Ensure that the sale was created correctly
            const sale = await auctionContract.sales(saleId);
            expect(sale.roomOwner).to.equal(owner.address); // Sale should exist and be owned by the correct address

            // Now attempt to buy the keys instantly
            await auctionContract.connect(addr1).buyNow(saleId, { value: ethers.utils.parseEther("1") });

            // Verify that the sale has been settled
            const updatedSale = await auctionContract.sales(saleId);
            expect(updatedSale.settled).to.be.true;
        });


        it("Should revert if payment is insufficient", async function () {
            // Step 1: Create an instant buy sale
            const createSaleTx = await auctionContract.createSale(
                1, // roomId
                SaleType.InstantBuy,
                60, // Duration in minutes
                10, // Keys for sale
                ethers.utils.parseEther("2"), // Price (2 ether)
                0, // Min bid increment (not needed for instant buy)
                50 // IP Owner share (>= minIpOwnerShare)
            );
            await createSaleTx.wait();

            // Step 2: Retrieve the sale ID
            const saleId = await auctionContract.saleCounter(); // Since saleCounter is incremented, this will be the ID of the sale we just created

            // Step 3: Attempt to buy instantly with insufficient payment
            await expect(
                auctionContract.connect(addr1).buyNow(saleId, { value: ethers.utils.parseEther("1") }) // Insufficient payment (less than 2 ether)
            ).to.be.revertedWith("Insufficient payment");
        });


        it("Should revert if sale is already settled", async function () {
            // Step 1: Create an instant buy sale
            const createSaleTx = await auctionContract.createSale(
                1, // roomId
                SaleType.InstantBuy,
                60, // Duration in minutes
                10, // Keys for sale
                ethers.utils.parseEther("2"), // Price (2 ether)
                0, // Min bid increment (not needed for instant buy)
                50 // IP Owner share (>= minIpOwnerShare)
            );
            await createSaleTx.wait();

            // Step 2: Retrieve the sale ID
            const saleId = await auctionContract.saleCounter(); // Retrieve the saleId after creating the sale

            // Step 3: Buy the sale to settle it
            await auctionContract.connect(addr1).buyNow(saleId, { value: ethers.utils.parseEther("2") });

            // Step 4: Attempt to buy again, which should revert because the sale is already settled
            await expect(
                auctionContract.connect(addr2).buyNow(saleId, { value: ethers.utils.parseEther("2") })
            ).to.be.revertedWith("Sale already settled");
        });

    });

    describe("Settling Sales", function () {
        beforeEach(async function () {
            // Create an auction sale
            await auctionContract.createSale(
                1,
                SaleType.Auction,
                60, // 1 hour
                10,
                ethers.utils.parseEther("1"),
                100, // 10%
                50
            );

            // Place a bid
            await auctionContract.connect(addr1).placeBid(1, { value: ethers.utils.parseEther("1") });
        });

        it("Should distribute funds correctly on settlement", async function () {
            // Fast forward time to after sale end
            await ethers.provider.send("evm_increaseTime", [3600]); // Increase by 1 hour
            await ethers.provider.send("evm_mine", []);

            const vabbleInitial = await ethers.provider.getBalance(vabbleAddress.address);
            const daoInitial = await ethers.provider.getBalance(daoAddress.address);
            const ipOwnerInitial = await ethers.provider.getBalance(ipOwnerAddress.address);
            const roomOwnerInitial = await ethers.provider.getBalance(owner.address);

            const tx = await auctionContract.settleSale(1);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            const sale = await auctionContract.sales(1);
            expect(sale.fundsClaimed).to.be.true;

            const totalAmount = ethers.utils.parseEther("1");
            const percentagePrecision = await auctionContract.percentagePrecision();

            const vabbleShare = totalAmount.mul(await auctionContract.vabbleShare()).div(percentagePrecision);
            const daoShare = totalAmount.mul(await auctionContract.daoShare()).div(percentagePrecision);
            const ipOwnerShare = totalAmount.mul(sale.ipOwnerShare).div(percentagePrecision);
            const roomOwnerShare = totalAmount.sub(vabbleShare).sub(daoShare).sub(ipOwnerShare);

            const vabbleFinal = await ethers.provider.getBalance(vabbleAddress.address);
            const daoFinal = await ethers.provider.getBalance(daoAddress.address);
            const ipOwnerFinal = await ethers.provider.getBalance(ipOwnerAddress.address);
            const roomOwnerFinal = await ethers.provider.getBalance(owner.address);

            expect(vabbleFinal.sub(vabbleInitial)).to.equal(vabbleShare);
            expect(daoFinal.sub(daoInitial)).to.equal(daoShare);
            expect(ipOwnerFinal.sub(ipOwnerInitial)).to.equal(ipOwnerShare);
            expect(roomOwnerFinal.sub(roomOwnerInitial).add(gasUsed)).to.equal(roomOwnerShare);
        });

        it("Should revert if sale is not ended", async function () {
            await expect(auctionContract.settleSale(1)).to.be.revertedWith("Sale not ended or already settled");
        });

        it("Should revert if funds already claimed", async function () {
            // Fast forward time to after sale end
            await ethers.provider.send("evm_increaseTime", [3600]); // Increase by 1 hour
            await ethers.provider.send("evm_mine", []);

            await auctionContract.settleSale(1);

            await expect(auctionContract.settleSale(1)).to.be.revertedWith("Funds already claimed");
        });
    });

    describe("Claiming Refunds", function () {
        beforeEach(async function () {
            // Create an auction sale
            await auctionContract.createSale(
                1,
                SaleType.Auction,
                60, // 1 hour
                10,
                ethers.utils.parseEther("1"),
                100, // 10%
                50
            );

            // No bids placed
        });

        it("Should allow claiming a refund if room owner doesn't show up", async function () {
            // Step 1: Create an auction sale
            const createSaleTx = await auctionContract.createSale(
                1, // roomId
                SaleType.Auction,
                60, // Duration in minutes (1 hour)
                10, // Keys for sale
                ethers.utils.parseEther("1"), // Starting price
                100, // Min bid increment (10%)
                50 // IP Owner share (>= minIpOwnerShare)
            );
            await createSaleTx.wait();

            // Step 2: Retrieve the sale ID
            const saleId = await auctionContract.saleCounter(); // Retrieve the saleId after creating the sale

            // Step 3: Place a bid (to ensure there's a bidder for refund)
            await auctionContract.connect(addr1).placeBid(saleId, { value: ethers.utils.parseEther("1") });

            // Step 4: Fast-forward time to after the sale ends
            await ethers.provider.send("evm_increaseTime", [3600]); // Fast forward by 1 hour
            await ethers.provider.send("evm_mine", []); // Mine a new block

            // Step 5: Attempt to claim refund (the bidder should get their funds back)
            await expect(
                auctionContract.connect(addr1).claimRefund(saleId)
            ).to.emit(auctionContract, "RefundClaimed"); // Verify that the refund is emitted
        });

        it("Should revert if sale is not ended", async function () {
            await expect(auctionContract.connect(addr1).claimRefund(1)).to.be.revertedWith("Sale not ended");
        });

        it("Should revert if funds already claimed", async function () {
            // Step 1: Create an auction sale
            const createSaleTx = await auctionContract.createSale(
                1, // roomId
                SaleType.Auction,
                60, // Duration in minutes (1 hour)
                10, // Keys for sale
                ethers.utils.parseEther("1"), // Starting price
                100, // Min bid increment (10%)
                50 // IP Owner share (>= minIpOwnerShare)
            );
            await createSaleTx.wait();

            // Step 2: Retrieve the sale ID
            const saleId = await auctionContract.saleCounter(); // Retrieve the saleId after creating the sale

            // Step 3: Place a bid to ensure there is a bidder
            await auctionContract.connect(addr1).placeBid(saleId, { value: ethers.utils.parseEther("1") });

            // Step 4: Fast-forward time to after the sale ends
            await ethers.provider.send("evm_increaseTime", [3600]); // Fast forward by 1 hour
            await ethers.provider.send("evm_mine", []); // Mine a new block to apply the time increase

            // Step 5: Claim the refund successfully the first time
            await auctionContract.connect(addr1).claimRefund(saleId);

            // Step 6: Attempt to claim the refund again, which should revert with "Funds already claimed"
            await expect(
                auctionContract.connect(addr1).claimRefund(saleId)
            ).to.be.revertedWith("Funds already claimed");
        });

        it("Should revert if sale is settled", async function () {
            // Step 1: Create an auction sale
            const createSaleTx = await auctionContract.createSale(
                1, // roomId
                SaleType.Auction,
                60, // Duration in minutes (1 hour)
                10, // Keys for sale
                ethers.utils.parseEther("1"), // Starting price
                100, // Min bid increment (10%)
                50 // IP Owner share (>= minIpOwnerShare)
            );
            await createSaleTx.wait();

            // Step 2: Retrieve the sale ID
            const saleId = await auctionContract.saleCounter(); // Retrieve the saleId after creating the sale

            // Step 3: Place a bid to ensure there are funds to distribute
            await auctionContract.connect(addr1).placeBid(saleId, { value: ethers.utils.parseEther("1") });

            // Step 4: Fast-forward time to after the sale ends
            await ethers.provider.send("evm_increaseTime", [3600]); // Fast forward by 1 hour
            await ethers.provider.send("evm_mine", []); // Mine a new block to apply the time increase

            // Step 5: Settle the sale successfully the first time
            await auctionContract.settleSale(saleId);

            // Step 6: Attempt to settle the sale again, which should revert with "Sale settled"
            await expect(
                auctionContract.settleSale(saleId)
            ).to.be.revertedWith("Funds already claimed");
        });

    });
});
