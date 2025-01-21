const { expect } = require("chai")
const { ethers } = require("hardhat")
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers")

const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
const price = ethers.utils.parseEther("1")
const durationInMinutes = 1

async function deployContractsFixture() {
    const [
        owner,
        roomOwner,
        bidder1,
        bidder2,
        bidder3,
        bidder4,
        daoAddress,
        ipOwner1,
        ipOwner2,
        auditor,
    ] = await ethers.getSigners()

    // Deploy ETH receiver for Vabble payments
    const ETHReceiver = await ethers.getContractFactory("ETHReceiver")
    const vabbleReceiver = await ETHReceiver.deploy()
    await vabbleReceiver.deployed()

    // Deploy VAB token
    const MockVabbleToken = await ethers.getContractFactory("MockVabbleToken")
    const mockVabToken = await MockVabbleToken.deploy()
    await mockVabToken.deployed()

    // Deploy UniswapRouter
    const MockUniswapRouter = await ethers.getContractFactory("MockUniswapRouter")
    const mockUniswapRouter = await MockUniswapRouter.deploy(
        mockVabToken.address, // VAB token for swaps
        WETH_ADDRESS
    )
    await mockUniswapRouter.deployed()

    // Deploy UniHelper
    const MockUniHelper = await ethers.getContractFactory("MockUniHelper")
    const mockUniHelper = await MockUniHelper.deploy(mockVabToken.address, WETH_ADDRESS)
    await mockUniHelper.deployed()

    // Deploy staking pool
    const MockStakingPool = await ethers.getContractFactory("MockStakingPool")
    const mockStakingPool = await MockStakingPool.deploy(mockVabToken.address)
    await mockStakingPool.deployed()

    // Deploy main auction contract
    const VabbleKeyzAuction = await ethers.getContractFactory("VabbleKeyzAuction")
    const auction = await VabbleKeyzAuction.deploy(
        vabbleReceiver.address, // ETH payment receiver
        mockVabToken.address, // VAB token for swaps
        daoAddress.address,
        mockUniHelper.address,
        mockStakingPool.address,
        mockUniswapRouter.address,
        auditor.address // Auditor address
    )
    await auction.deployed()

    // Fund contracts
    await owner.sendTransaction({
        to: vabbleReceiver.address,
        value: ethers.utils.parseEther("10"),
    })

    await owner.sendTransaction({
        to: auction.address,
        value: ethers.utils.parseEther("10"),
    })

    // Setup approvals and initial token balance
    await mockVabToken
        .connect(owner)
        .approve(mockStakingPool.address, ethers.constants.MaxUint256)
    await mockVabToken.connect(owner).approve(auction.address, ethers.constants.MaxUint256)
    await mockVabToken.mint(mockUniswapRouter.address, ethers.utils.parseEther("1000000"))

    return {
        auction,
        mockVabToken,
        mockUniHelper,
        mockStakingPool,
        mockUniswapRouter,
        vabbleReceiver,
        owner,
        roomOwner,
        bidder1,
        bidder2,
        bidder3,
        bidder4,
        daoAddress,
        ipOwner1,
        ipOwner2,
        auditor,
    }
}

describe("VabbleKeyzAuction", function () {
    describe("Deployment", function () {
        it("Should set the correct initial values", async function () {
            const {
                auction,
                mockVabToken,
                mockUniHelper,
                mockStakingPool,
                mockUniswapRouter,
                vabbleReceiver,
                daoAddress,
                auditor,
            } = await loadFixture(deployContractsFixture)

            expect(await auction.vabbleAddress()).to.equal(vabbleReceiver.address)
            expect(await auction.getVabTokenAddress()).to.equal(mockVabToken.address)
            expect(await auction.daoAddress()).to.equal(daoAddress.address)
            expect(await auction.UNI_HELPER()).to.equal(mockUniHelper.address)
            expect(await auction.STAKING_POOL()).to.equal(mockStakingPool.address)
            expect(await auction.UNISWAP_ROUTER()).to.equal(mockUniswapRouter.address)
            expect(await auction.auditorAddress()).to.equal(auditor.address)

            expect((await auction.vabbleShare()).toNumber()).to.equal(150)
            expect((await auction.daoShare()).toNumber()).to.equal(100)
            expect((await auction.minIpOwnerShare()).toNumber()).to.equal(300)
            expect((await auction.percentagePrecision()).toNumber()).to.equal(10000)
            expect((await auction.maxDurationInMinutes()).toNumber()).to.equal(2880)
            expect((await auction.minBidIncrementAllowed()).toNumber()).to.equal(1)
            expect((await auction.maxBidIncrementAllowed()).toNumber()).to.equal(500000)
            expect((await auction.maxRoomKeys()).toNumber()).to.equal(5)
        })
    })

    describe("Room Verification", function () {
        let auction, roomOwner, bidder1, bidder2, auditor, ipOwner1
        let saleId = 1

        beforeEach(async function () {
            const contracts = await loadFixture(deployContractsFixture)
            auction = contracts.auction
            roomOwner = contracts.roomOwner
            bidder1 = contracts.bidder1
            bidder2 = contracts.bidder2
            auditor = contracts.auditor
            ipOwner1 = contracts.ipOwner1

            // Create a sale
            await auction
                .connect(roomOwner)
                .createSale(1, 0, durationInMinutes, 5, price, 100, 500, ipOwner1.address)
        })

        it("Should allow auditor to verify a sale", async function () {
            await auction.connect(auditor).setRoomVerification(saleId, true)
            expect(await auction.saleVerification(saleId)).to.equal(1) // VerificationStatus.Verified
        })

        it("Should allow auditor to fail a sale verification", async function () {
            await auction.connect(auditor).setRoomVerification(saleId, false)
            expect(await auction.saleVerification(saleId)).to.equal(2) // VerificationStatus.Failed
        })

        it("Should prevent non-auditor from verifying sales", async function () {
            await expect(auction.connect(roomOwner).setRoomVerification(saleId, true))
                .to.be.revertedWith("Only verifier can call")

            await expect(auction.connect(bidder1).setRoomVerification(saleId, true))
                .to.be.revertedWith("Only verifier can call")
        })

        it("Should prevent settlement of unverified sale", async function () {
            // Place a bid
            await auction.connect(bidder1).placeBid(saleId, 0, { value: price })

            // Advance time
            await time.increase(3600)

            // Try to settle before verification
            await expect(auction.settleSale(saleId))
                .to.be.revertedWith("Sale not verified")
        })

        it("Should prevent settlement of failed verification sale", async function () {
            // Place a bid
            await auction.connect(bidder1).placeBid(saleId, 0, { value: price })

            // Fail the sale verification
            await auction.connect(auditor).setRoomVerification(saleId, false)

            // Advance time
            await time.increase(3600)

            // Try to settle
            await expect(auction.settleSale(saleId))
                .to.be.revertedWith("Sale verification failed")
        })

        it("Should allow settlement after successful verification", async function () {
            // Place a bid
            await auction.connect(bidder1).placeBid(saleId, 0, { value: price })

            // Verify the sale
            await auction.connect(auditor).setRoomVerification(saleId, true)

            // Advance time
            await time.increase(3600)

            // Settlement should succeed
            await expect(auction.settleSale(saleId))
                .to.emit(auction, "SaleSettled")
        })

        it("Should allow refund claims for failed verification", async function () {
            // Place bids
            await auction.connect(bidder1).placeBid(saleId, 0, { value: price })
            await auction.connect(bidder2).placeBid(saleId, 1, { value: price })

            // Fail the sale verification
            await auction.connect(auditor).setRoomVerification(saleId, false)

            // Advance time
            await time.increase(3600)

            // Bidders should be able to claim refunds
            await expect(auction.connect(bidder1).claimRefund(saleId, 0))
                .to.emit(auction, "RefundClaimed")
                .withArgs(saleId, 0, bidder1.address, price)

            await expect(auction.connect(bidder2).claimRefund(saleId, 1))
                .to.emit(auction, "RefundClaimed")
                .withArgs(saleId, 1, bidder2.address, price)
        })

        it("Should prevent refund claims for verified sales unless outbid", async function () {
            // Place bid
            await auction.connect(bidder1).placeBid(saleId, 0, { value: price })

            // Verify the sale
            await auction.connect(auditor).setRoomVerification(saleId, true)

            // Advance time
            await time.increase(3600)

            // Should not allow refund claim for winning bid
            await expect(auction.connect(bidder1).claimRefund(saleId, 0))
                .to.be.revertedWith("Not eligible for refund")
        })
    })

    describe("Sale Creation", function () {
        it("Should create an auction sale successfully", async function () {
            const { auction, roomOwner, ipOwner1 } = await loadFixture(deployContractsFixture)

            const tx = await auction.connect(roomOwner).createSale(
                1, // roomNumber
                0, // SaleType.Auction
                durationInMinutes,
                5, // totalKeys
                price,
                100, // minBidIncrement (10%)
                500, // ipOwnerShare (5%)
                ipOwner1.address
            )

            const receipt = await tx.wait()
            const event = receipt.events.find((e) => e.event === "SaleCreated")
            expect(event).to.not.be.undefined

            const sale = await auction.sales(1)
            expect(sale.roomOwner).to.equal(roomOwner.address)
            expect(sale.roomNumber).to.equal(1)
            expect(sale.saleType).to.equal(0)
            expect(sale.totalKeys).to.equal(5)
            expect(sale.price).to.equal(price)
            expect(sale.minBidIncrement).to.equal(100)
            expect(sale.ipOwnerShare).to.equal(500)
            expect(sale.settled).to.be.false
        })

        it("Should fail if duration exceeds max limit", async function () {
            const { auction, roomOwner, ipOwner1 } = await loadFixture(deployContractsFixture)
            const maxDuration = await auction.maxDurationInMinutes()

            await expect(
                auction
                    .connect(roomOwner)
                    .createSale(1, 0, maxDuration.add(1), 5, price, 100, 50, ipOwner1.address)
            ).to.be.revertedWith("Duration exceeds max limit")
        })

        it("Should fail if IP owner share is too low", async function () {
            const { auction, roomOwner, ipOwner1 } = await loadFixture(deployContractsFixture)
            const minShare = await auction.minIpOwnerShare()

            await expect(
                auction
                    .connect(roomOwner)
                    .createSale(1, 0, 60, 5, price, 100, minShare.sub(1), ipOwner1.address)
            ).to.be.revertedWith("IP Owner share too low")
        })

        it("Should fail when creating sale with zero IP owner address", async function () {
            const { auction, roomOwner } = await loadFixture(deployContractsFixture)

            await expect(
                auction
                    .connect(roomOwner)
                    .createSale(1, 0, 60, 5, price, 100, 500, ethers.constants.AddressZero)
            ).to.be.revertedWith("Invalid IP owner address")
        })

        it("Should fail when creating sale with more then max keys allowed", async function () {
            const { auction, roomOwner } = await loadFixture(deployContractsFixture)

            await expect(
                auction
                    .connect(roomOwner)
                    .createSale(1, 0, 60, 6, price, 100, 500, ethers.constants.AddressZero)
            ).to.be.revertedWith("Total keys exceed max limit")
        })
    })

    describe("Bidding", function () {
        let auction, roomOwner, bidder1, bidder2, bidder3, bidder4, ipOwner1, auditor
        let saleId = 1

        beforeEach(async function () {
            const contracts = await loadFixture(deployContractsFixture)
            auction = contracts.auction
            roomOwner = contracts.roomOwner
            bidder1 = contracts.bidder1
            bidder2 = contracts.bidder2
            bidder3 = contracts.bidder3
            bidder4 = contracts.bidder4
            ipOwner1 = contracts.ipOwner1
            auditor = contracts.auditor

            await auction
                .connect(roomOwner)
                .createSale(1, 0, durationInMinutes, 5, price, 100, 500, ipOwner1.address)
        })

        it("Should accept first bid at starting price", async function () {
            await expect(auction.connect(bidder1).placeBid(saleId, 0, { value: price }))
                .to.emit(auction, "BidPlaced")
                .withArgs(saleId, 0, bidder1.address, price)
        })

        it("Should require higher bid to outbid", async function () {
            await auction.connect(bidder1).placeBid(saleId, 0, { value: price })
            const minNextBid = price.mul(110).div(100) // 10% increase

            await expect(
                auction.connect(bidder2).placeBid(saleId, 0, { value: price })
            ).to.be.revertedWith("Bid too low")

            await expect(auction.connect(bidder2).placeBid(saleId, 0, { value: minNextBid }))
                .to.emit(auction, "BidPlaced")
                .withArgs(saleId, 0, bidder2.address, minNextBid)
        })

        it("Should allow previous bidder to withdraw when outbid", async function () {
            // Place initial bid
            await auction.connect(bidder1).placeBid(saleId, 0, { value: price })

            const bidder1BalanceBefore = await bidder1.getBalance()

            // Higher bid from bidder2
            await auction.connect(bidder2).placeBid(saleId, 0, { value: price.mul(11).div(10) })

            // Get gas cost for withdrawal transaction
            const withdrawTx = await auction.connect(bidder1).withdrawPendingReturns()
            const receipt = await withdrawTx.wait()
            const gasUsed = receipt.gasUsed
            const gasPrice = withdrawTx.gasPrice
            const gasCost = gasUsed.mul(gasPrice)

            const bidder1BalanceAfter = await bidder1.getBalance()

            // Account for gas costs in the balance comparison
            expect(bidder1BalanceAfter.sub(bidder1BalanceBefore)).to.equal(price.sub(gasCost))
        })

        it("should handle multiple bids from different bidders correctly", async function () {
            const bidAmount = price.mul(2)

            // Place bids sequentially but verify they can all exist together
            await auction.connect(bidder1).placeBid(saleId, 0, { value: bidAmount })
            await auction.connect(bidder2).placeBid(saleId, 1, { value: bidAmount })
            await auction.connect(bidder3).placeBid(saleId, 2, { value: bidAmount })

            // Verify all bids are recorded correctly
            const [amount0, bidder0] = await auction.getKeyBid(saleId, 0)
            const [amount1, bidder1Address] = await auction.getKeyBid(saleId, 1)
            const [amount2, bidder2Address] = await auction.getKeyBid(saleId, 2)

            expect(amount0).to.equal(bidAmount)
            expect(amount1).to.equal(bidAmount)
            expect(amount2).to.equal(bidAmount)
            expect(bidder0).to.equal(bidder1.address)
            expect(bidder1Address).to.equal(bidder2.address)
            expect(bidder2Address).to.equal(bidder3.address)

            // Add verification before any potential settlement
            await auction.connect(auditor).setRoomVerification(saleId, true)
        })

        it("should handle rapid sequential bids correctly", async function () {
            const bidAmount = price.mul(2)
            const bidAmountHigher = price.mul(3)

            // Test rapid sequential bidding on the same key
            await auction.connect(bidder1).placeBid(saleId, 0, { value: bidAmount })

            // Immediately followed by another bid
            await auction.connect(bidder2).placeBid(saleId, 0, { value: bidAmountHigher })

            const [finalAmount, finalBidder] = await auction.getKeyBid(saleId, 0)
            expect(finalAmount).to.equal(bidAmountHigher)
            expect(finalBidder).to.equal(bidder2.address)
        })

        it("should handle multiple bids on different keys with interwoven timing", async function () {
            // Place bids on different keys with varying amounts
            await auction.connect(bidder1).placeBid(saleId, 0, { value: price })
            await auction.connect(bidder2).placeBid(saleId, 1, { value: price.mul(2) })
            await auction.connect(bidder1).placeBid(saleId, 2, { value: price.mul(3) })
            await auction.connect(bidder2).placeBid(saleId, 0, { value: price.mul(4) }) // Outbid on key 0

            const [amount0, bidder0] = await auction.getKeyBid(saleId, 0)
            const [amount1, bidder1Address] = await auction.getKeyBid(saleId, 1)
            const [amount2, bidder2Address] = await auction.getKeyBid(saleId, 2)

            expect(amount0).to.equal(price.mul(4))
            expect(amount1).to.equal(price.mul(2))
            expect(amount2).to.equal(price.mul(3))
            expect(bidder0).to.equal(bidder2.address)
            expect(bidder1Address).to.equal(bidder2.address)
            expect(bidder2Address).to.equal(bidder1.address)
        })

        it("should maintain correct state during high-frequency bidding", async function () {
            // Series of rapid bids on the same key with increasing values
            const bids = [
                { bidder: bidder1, amount: price.mul(1) },
                { bidder: bidder2, amount: price.mul(2) },
                { bidder: bidder3, amount: price.mul(3) },
                { bidder: bidder1, amount: price.mul(4) },
                { bidder: bidder2, amount: price.mul(5) },
            ]

            // Place bids in quick succession
            for (const bid of bids) {
                await auction.connect(bid.bidder).placeBid(saleId, 0, { value: bid.amount })

                // Verify immediate state after each bid
                const [currentAmount, currentBidder] = await auction.getKeyBid(saleId, 0)
                expect(currentAmount).to.equal(bid.amount)
                expect(currentBidder).to.equal(bid.bidder.address)
            }

            // Verify final state
            const [finalAmount, finalBidder] = await auction.getKeyBid(saleId, 0)
            expect(finalAmount).to.equal(price.mul(5))
            expect(finalBidder).to.equal(bidder2.address)
        })

        it("should handle edge case of multiple keys being bid on simultaneously", async function () {
            // Place bids on all available keys
            const totalKeys = 5 // from sale creation
            const bidPromises = []

            for (let i = 0; i < totalKeys; i++) {
                const bidder = [bidder1, bidder2, bidder3, bidder4][i % 4]
                const bidAmount = price.mul(i + 1)
                await auction.connect(bidder).placeBid(saleId, i, { value: bidAmount })
            }

            // Verify all keys have correct bids
            for (let i = 0; i < totalKeys; i++) {
                const [amount, bidder] = await auction.getKeyBid(saleId, i)
                expect(amount).to.equal(price.mul(i + 1))
                const expectedBidder = [bidder1, bidder2, bidder3, bidder4][i % 4]
                expect(bidder).to.equal(expectedBidder.address)
            }
        })
    })

    describe("Instant Buy Core Functionality", function () {
        let auction, roomOwner, bidder1, bidder2, bidder3, bidder4, owner, ipOwner1, auditor
        const saleId = 1

        beforeEach(async function () {
            const contracts = await loadFixture(deployContractsFixture)
            auction = contracts.auction
            roomOwner = contracts.roomOwner
            bidder1 = contracts.bidder1
            bidder2 = contracts.bidder2
            bidder3 = contracts.bidder3
            bidder4 = contracts.bidder4
            owner = contracts.owner
            ipOwner1 = contracts.ipOwner1
            auditor = contracts.auditor

            // Create instant buy sale
            await auction.connect(roomOwner).createSale(
                1, // roomNumber
                1, // SaleType.InstantBuy
                durationInMinutes,
                5, // totalKeys
                price, // fixed price
                0, // minBidIncrement (not used)
                500, // ipOwnerShare (5%)
                ipOwner1.address
            )
        })

        describe("Basic Purchase Scenarios", function () {
            it("should process a basic instant buy correctly", async function () {
                await expect(auction.connect(bidder1).buyNow(saleId, 0, { value: price }))
                    .to.emit(auction, "InstantBuy")
                    .withArgs(saleId, 0, bidder1.address, price)

                const [amount, buyer, claimed] = await auction.getKeyBid(saleId, 0)
                expect(amount).to.equal(price)
                expect(buyer).to.equal(bidder1.address)
                expect(claimed).to.be.false
                expect(await auction.isKeyAvailable(saleId, 0)).to.be.false
            })

            it("should allow purchase of all available keys", async function () {
                for (let i = 0; i < 5; i++) {
                    const buyer = [bidder1, bidder2, bidder3, bidder4][i % 4]
                    await auction.connect(buyer).buyNow(saleId, i, { value: price })

                    const [amount, buyerAddr] = await auction.getKeyBid(saleId, i)
                    expect(amount).to.equal(price)
                    expect(buyerAddr).to.equal(buyer.address)
                    expect(await auction.isKeyAvailable(saleId, i)).to.be.false
                }
            })

            it("should handle multiple purchases from the same buyer", async function () {
                const keysToBuy = [0, 2, 4] // Non-sequential keys

                for (const keyId of keysToBuy) {
                    await auction.connect(bidder1).buyNow(saleId, keyId, { value: price })

                    const [amount, buyer] = await auction.getKeyBid(saleId, keyId)
                    expect(amount).to.equal(price)
                    expect(buyer).to.equal(bidder1.address)
                    expect(await auction.isKeyAvailable(saleId, keyId)).to.be.false
                }

                // Verify other keys are still available
                expect(await auction.isKeyAvailable(saleId, 1)).to.be.true
                expect(await auction.isKeyAvailable(saleId, 3)).to.be.true
            })

            it("should process purchases with exact amount correctly", async function () {
                const exactPrice = price
                await auction.connect(bidder1).buyNow(saleId, 0, { value: exactPrice })

                const [recordedAmount] = await auction.getKeyBid(saleId, 0)
                expect(recordedAmount).to.equal(exactPrice)
            })
        })

        describe("Edge Cases and Special Scenarios", function () {
            it("should handle overpayment correctly", async function () {
                const overpayAmount = price.mul(2)
                const initialBalance = await bidder1.getBalance()

                const tx = await auction
                    .connect(bidder1)
                    .buyNow(saleId, 0, { value: overpayAmount })
                const receipt = await tx.wait()
                const gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice)

                const [recordedAmount] = await auction.getKeyBid(saleId, 0)
                expect(recordedAmount).to.equal(overpayAmount)

                const finalBalance = await bidder1.getBalance()
                expect(initialBalance.sub(finalBalance).sub(gasCost)).to.equal(overpayAmount)
            })

            it("should handle minimum payment edge case", async function () {
                const exactPrice = price
                await auction.connect(bidder1).buyNow(saleId, 0, { value: exactPrice })

                // Try with 1 wei less than price
                await expect(
                    auction.connect(bidder2).buyNow(saleId, 1, { value: exactPrice.sub(1) })
                ).to.be.revertedWith("Insufficient payment")
            })

            it("should handle rapid sequential purchases correctly", async function () {
                // Simulate rapid purchases of different keys
                const purchases = [
                    { buyer: bidder1, keyId: 0 },
                    { buyer: bidder2, keyId: 1 },
                    { buyer: bidder3, keyId: 2 },
                    { buyer: bidder4, keyId: 3 },
                ]

                for (const purchase of purchases) {
                    await auction
                        .connect(purchase.buyer)
                        .buyNow(saleId, purchase.keyId, { value: price })

                    // Verify immediate state after each purchase
                    const [amount, buyer] = await auction.getKeyBid(saleId, purchase.keyId)
                    expect(amount).to.equal(price)
                    expect(buyer).to.equal(purchase.buyer.address)
                    expect(await auction.isKeyAvailable(saleId, purchase.keyId)).to.be.false
                }
            })

            it("should handle zero key ID edge case", async function () {
                await auction.connect(bidder1).buyNow(saleId, 0, { value: price })

                const [amount, buyer] = await auction.getKeyBid(saleId, 0)
                expect(amount).to.equal(price)
                expect(buyer).to.equal(bidder1.address)
            })

            it("should handle maximum key ID edge case", async function () {
                const maxKeyId = 4 // totalKeys - 1
                await auction.connect(bidder1).buyNow(saleId, maxKeyId, { value: price })

                const [amount, buyer] = await auction.getKeyBid(saleId, maxKeyId)
                expect(amount).to.equal(price)
                expect(buyer).to.equal(bidder1.address)
            })
        })

        describe("Failure Scenarios", function () {
            it("should fail when trying to buy an already purchased key", async function () {
                await auction.connect(bidder1).buyNow(saleId, 0, { value: price })

                await expect(
                    auction.connect(bidder2).buyNow(saleId, 0, { value: price })
                ).to.be.revertedWith("Key not available")
            })

            it("should fail when trying to buy after sale end", async function () {
                await time.increase(3601) // 60 minutes + 1 second

                await expect(
                    auction.connect(bidder1).buyNow(saleId, 0, { value: price })
                ).to.be.revertedWith("Sale ended")
            })

            it("should fail when trying to buy from non-existent sale", async function () {
                const nonExistentSaleId = 999

                await expect(
                    auction.connect(bidder1).buyNow(nonExistentSaleId, 0, { value: price })
                ).to.be.revertedWith("Sale does not exist")
            })

            it("should fail when trying to buy invalid key ID", async function () {
                const invalidKeyId = 99

                await expect(
                    auction.connect(bidder1).buyNow(saleId, invalidKeyId, { value: price })
                ).to.be.revertedWith("Invalid key ID")
            })

            it("should fail when trying to buy with insufficient payment", async function () {
                const insufficientAmount = price.sub(1)

                await expect(
                    auction.connect(bidder1).buyNow(saleId, 0, { value: insufficientAmount })
                ).to.be.revertedWith("Insufficient payment")
            })

            it("should fail when contract is paused", async function () {
                await auction.connect(owner).pause()

                await expect(
                    auction.connect(bidder1).buyNow(saleId, 0, { value: price })
                ).to.be.revertedWith("Pausable: paused")
            })

            it("should fail when contract is paused", async function () {
                // Use the contract owner to pause the contract, not the room owner
                await auction.connect(owner).pause()

                await expect(
                    auction.connect(bidder1).buyNow(saleId, 0, { value: price })
                ).to.be.revertedWith("Pausable: paused")

                // Cleanup: unpause for other tests
                await auction.connect(owner).unpause()
            })

            // Add more comprehensive pause-related tests
            it("should handle pause/unpause state transitions correctly", async function () {
                // Initial purchase should work
                await auction.connect(bidder1).buyNow(saleId, 0, { value: price })

                // Pause contract
                await auction.connect(owner).pause()

                // Purchases should fail while paused
                await expect(
                    auction.connect(bidder2).buyNow(saleId, 1, { value: price })
                ).to.be.revertedWith("Pausable: paused")

                // Unpause contract
                await auction.connect(owner).unpause()

                // Purchases should work again after unpause
                await expect(auction.connect(bidder2).buyNow(saleId, 1, { value: price })).to.not.be
                    .reverted
            })

            it("should prevent non-owners from pausing", async function () {
                await expect(auction.connect(bidder1).pause()).to.be.revertedWith(
                    "Ownable: caller is not the owner"
                )

                await expect(auction.connect(roomOwner).pause()).to.be.revertedWith(
                    "Ownable: caller is not the owner"
                )
            })

            it("should prevent non-owners from unpausing", async function () {
                // Owner pauses first
                await auction.connect(owner).pause()

                await expect(auction.connect(bidder1).unpause()).to.be.revertedWith(
                    "Ownable: caller is not the owner"
                )

                await expect(auction.connect(roomOwner).unpause()).to.be.revertedWith(
                    "Ownable: caller is not the owner"
                )

                // Cleanup: unpause for other tests
                await auction.connect(owner).unpause()
            })

            it("should prevent pausing when already paused", async function () {
                await auction.connect(owner).pause()
                await expect(auction.connect(owner).pause()).to.be.revertedWith("Pausable: paused")
            })

            it("should prevent unpausing when not paused", async function () {
                await expect(auction.connect(owner).unpause()).to.be.revertedWith(
                    "Pausable: not paused"
                )
            })

            it("should prevent actions when paused", async function () {
                const { ipOwner1 } = await loadFixture(deployContractsFixture)
                await auction.connect(owner).pause()

                // Try to create a sale while paused
                await expect(
                    auction
                        .connect(owner)
                        .createSale(
                            1,
                            0,
                            durationInMinutes,
                            5,
                            ethers.utils.parseEther("1"),
                            100,
                            50,
                            ipOwner1.address
                        )
                ).to.be.revertedWith("Pausable: paused")
            })

            it("should maintain key state correctly through pause/unpause cycles", async function () {
                // Make initial purchase
                await auction.connect(bidder1).buyNow(saleId, 0, { value: price })

                // Pause contract
                await auction.connect(owner).pause()

                // Verify key state persists during pause
                expect(await auction.isKeyAvailable(saleId, 0)).to.be.false
                const [amount, buyer] = await auction.getKeyBid(saleId, 0)
                expect(amount).to.equal(price)
                expect(buyer).to.equal(bidder1.address)

                // Unpause contract
                await auction.connect(owner).unpause()

                // Verify key state remains correct after unpause
                expect(await auction.isKeyAvailable(saleId, 0)).to.be.false
                const [amountAfter, buyerAfter] = await auction.getKeyBid(saleId, 0)
                expect(amountAfter).to.equal(price)
                expect(buyerAfter).to.equal(bidder1.address)
            })
        })
    })

    describe("Sale State Verification", function () {
        let auction, bidder1, bidder2, bidder3, roomOwner, ipOwner1, saleId, price

        beforeEach(async function () {
            const contracts = await loadFixture(deployContractsFixture)
            auction = contracts.auction
            bidder1 = contracts.bidder1
            bidder2 = contracts.bidder2
            bidder3 = contracts.bidder3
            roomOwner = contracts.roomOwner
            ipOwner1 = contracts.ipOwner1
            saleId = 1
            price = ethers.utils.parseEther("1")

            // Create a sale for testing
            await auction
                .connect(roomOwner)
                .createSale(1, 1, durationInMinutes, 5, price, 0, 500, ipOwner1.address)
        })

        it("should maintain correct availability state after multiple purchases", async function () {
            // Buy some keys in non-sequential order
            await auction.connect(bidder1).buyNow(saleId, 0, { value: price })
            await auction.connect(bidder2).buyNow(saleId, 2, { value: price })
            await auction.connect(bidder3).buyNow(saleId, 4, { value: price })

            // Verify availability of all keys
            expect(await auction.isKeyAvailable(saleId, 0)).to.be.false
            expect(await auction.isKeyAvailable(saleId, 1)).to.be.true
            expect(await auction.isKeyAvailable(saleId, 2)).to.be.false
            expect(await auction.isKeyAvailable(saleId, 3)).to.be.true
            expect(await auction.isKeyAvailable(saleId, 4)).to.be.false
        })

        it("should maintain correct state after sale is filled", async function () {
            // Buy all available keys
            for (let i = 0; i < 5; i++) {
                await auction.connect(bidder1).buyNow(saleId, i, { value: price })
            }

            // Verify all keys are unavailable
            for (let i = 0; i < 5; i++) {
                expect(await auction.isKeyAvailable(saleId, i)).to.be.false
                const [amount, buyer] = await auction.getKeyBid(saleId, i)
                expect(amount).to.equal(price)
                expect(buyer).to.equal(bidder1.address)
            }

            // Verify cannot buy any more keys
            await expect(
                auction.connect(bidder2).buyNow(saleId, 0, { value: price })
            ).to.be.revertedWith("Key not available")
        })
    })

    describe("Settlement Interaction", function () {
        let auction, bidder1, bidder2, auditor, roomOwner, ipOwner1, saleId, price

        beforeEach(async function () {
            const contracts = await loadFixture(deployContractsFixture)
            auction = contracts.auction
            bidder1 = contracts.bidder1
            bidder2 = contracts.bidder2
            auditor = contracts.auditor
            roomOwner = contracts.roomOwner
            ipOwner1 = contracts.ipOwner1
            saleId = 1
            price = ethers.utils.parseEther("1")

            // Create a sale for testing
            await auction
                .connect(roomOwner)
                .createSale(1, 1, durationInMinutes, 5, price, 0, 500, ipOwner1.address)
        })

        it("should allow settlement after all keys are purchased", async function () {
            // Buy all keys
            for (let i = 0; i < 5; i++) {
                await auction.connect(bidder1).buyNow(saleId, i, { value: price })
            }

            // Advance time
            await time.increase(3601)

            // Verify the sale
            await auction.connect(auditor).setRoomVerification(saleId, true)

            // Settlement should succeed
            await expect(auction.settleSale(saleId)).to.emit(auction, "SaleSettled")
        })

        it("should allow settlement with partial key sales", async function () {
            // Buy only some keys
            await auction.connect(bidder1).buyNow(saleId, 0, { value: price })
            await auction.connect(bidder2).buyNow(saleId, 2, { value: price })

            // Advance time
            await time.increase(3601)

            // Verify the sale
            await auction.connect(auditor).setRoomVerification(saleId, true)

            // Settlement should succeed
            await expect(auction.settleSale(saleId)).to.emit(auction, "SaleSettled")
        })
    })

    describe("Settlement Edge Cases", function () {
        let auction, owner, roomOwner, bidder1, auditor, ipOwner1, saleId, price

        beforeEach(async function () {
            const contracts = await loadFixture(deployContractsFixture)
            auction = contracts.auction
            owner = contracts.owner
            roomOwner = contracts.roomOwner
            bidder1 = contracts.bidder1
            auditor = contracts.auditor
            ipOwner1 = contracts.ipOwner1
            saleId = 1
            price = ethers.utils.parseEther("1")
        })

        it("Should prevent settling non-existent sale", async function () {
            await expect(auction.settleSale(999)).to.be.revertedWith(
                "Sale does not exist"
            )
        })

        it("Should prevent settling before end time", async function () {
            await auction
                .connect(roomOwner)
                .createSale(1, 0, 60, 2, price, 100, 500, ipOwner1.address)

            await expect(auction.settleSale(saleId)).to.be.revertedWith(
                "Sale not ended"
            )
        })

        it("Should prevent settling already settled sale", async function () {
            await auction
                .connect(roomOwner)
                .createSale(1, 0, 60, 2, price, 100, 500, ipOwner1.address)

            await auction
                .connect(bidder1)
                .placeBid(saleId, 0, { value: price })

            await time.increase(3600)

            await auction.connect(auditor).setRoomVerification(saleId, true)

            await auction.settleSale(saleId)

            await expect(auction.settleSale(saleId)).to.be.revertedWith(
                "Sale already settled"
            )
        })

        it("Should prevent settlement when paused", async function () {
            await auction
                .connect(roomOwner)
                .createSale(1, 0, 60, 1, price, 100, 500, ipOwner1.address)

            await auction
                .connect(bidder1)
                .placeBid(saleId, 0, { value: price.mul(2) })

            await time.increase(3600)

            await auction.connect(owner).pause()

            await expect(auction.settleSale(saleId)).to.be.revertedWith(
                "Pausable: paused"
            )
        })

        it("Should prevent settlement when share total exceeds 100%", async function () {
            const PERCENTAGE_PRECISION = 10000
            const invalidShare = (PERCENTAGE_PRECISION * 40) / 100

            await auction.connect(owner).setVabbleShare(invalidShare)
            await auction.connect(owner).setDaoShare(invalidShare)

            await auction.connect(roomOwner).createSale(
                1,
                0,
                60,
                1,
                price,
                100,
                invalidShare,
                ipOwner1.address
            )

            await auction
                .connect(bidder1)
                .placeBid(saleId, 0, { value: price.mul(2) })

            await time.increase(3600)

            await expect(auction.settleSale(saleId)).to.be.revertedWith(
                "Total shares exceed 100%"
            )
        })
    })

    describe("Duration and Increment Management", function () {
        let auction, owner, nonOwner

        beforeEach(async function () {
            const contracts = await loadFixture(deployContractsFixture)
            auction = contracts.auction
            owner = contracts.owner
            nonOwner = contracts.bidder1
        })

        it("Should prevent setting max duration to zero", async function () {
            await expect(auction.connect(owner).setMaxDurationInMinutes(0)).to.be.revertedWith(
                "Duration must be greater than 0"
            )
        })

        it("Should prevent non-owner from updating duration and increments", async function () {
            await expect(
                auction.connect(nonOwner).setMaxDurationInMinutes(4320)
            ).to.be.revertedWith("Ownable: caller is not the owner")

            await expect(
                auction.connect(nonOwner).setMinBidIncrementAllowed(5)
            ).to.be.revertedWith("Ownable: caller is not the owner")

            await expect(
                auction.connect(nonOwner).setMaxBidIncrementAllowed(100000)
            ).to.be.revertedWith("Ownable: caller is not the owner")
        })
    })
})

describe("Administrative Functions", function () {
    let auction, owner, nonOwner, vabbleReceiver, daoAddress, ipOwner1;

    beforeEach(async function () {
        const contracts = await loadFixture(deployContractsFixture);
        auction = contracts.auction;
        owner = contracts.owner;
        nonOwner = contracts.bidder1;
        vabbleReceiver = contracts.vabbleReceiver;
        daoAddress = contracts.daoAddress;
        ipOwner1 = contracts.ipOwner1;
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
            await expect(auction.connect(nonOwner).setVabbleShare(20))
                .to.be.revertedWith("Ownable: caller is not the owner");

            await expect(auction.connect(nonOwner).setDaoShare(15))
                .to.be.revertedWith("Ownable: caller is not the owner");

            await expect(auction.connect(nonOwner).setMinIpOwnerShare(40))
                .to.be.revertedWith("Ownable: caller is not the owner");

            await expect(auction.connect(nonOwner).setPercentagePrecision(10000))
                .to.be.revertedWith("Ownable: caller is not the owner");
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
    });

    describe("Duration, Bid Increment Management and Max Keys Update", function () {
        it("Should allow owner to update max allowed room keys", async function () {
            const newMaxRoomKeys = 6;
            await expect(auction.connect(owner).setMaxRoomKeys(newMaxRoomKeys))
                .to.emit(auction, "MaxRoomKeysUpdated")
                .withArgs(newMaxRoomKeys);
            expect(await auction.maxRoomKeys()).to.equal(newMaxRoomKeys);
        });

        it("Should allow owner to update max duration in minutes", async function () {
            const newDuration = 4320 // 72 hours
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
    });
});

describe("Pause Functionality", function () {
    let auction, owner, nonOwner, roomOwner;

    beforeEach(async function () {
        const contracts = await loadFixture(deployContractsFixture);
        auction = contracts.auction;
        owner = contracts.owner;
        nonOwner = contracts.bidder1;
        roomOwner = contracts.roomOwner;
    });

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
        await expect(auction.connect(nonOwner).pause())
            .to.be.revertedWith("Ownable: caller is not the owner");

        await expect(auction.connect(roomOwner).pause())
            .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent non-owner from unpausing", async function () {
        await auction.connect(owner).pause();

        await expect(auction.connect(nonOwner).unpause())
            .to.be.revertedWith("Ownable: caller is not the owner");

        await expect(auction.connect(roomOwner).unpause())
            .to.be.revertedWith("Ownable: caller is not the owner");

        // Cleanup: unpause for other tests
        await auction.connect(owner).unpause();
    });

    it("Should prevent pausing when already paused", async function () {
        await auction.connect(owner).pause();
        await expect(auction.connect(owner).pause())
            .to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent unpausing when not paused", async function () {
        await expect(auction.connect(owner).unpause())
            .to.be.revertedWith("Pausable: not paused");
    });

    it("Should prevent actions when paused", async function () {
        const { ipOwner1 } = await loadFixture(deployContractsFixture);
        await auction.connect(owner).pause();

        // Try to create a sale while paused
        await expect(
            auction
                .connect(owner)
                .createSale(
                    1,
                    0,
                    durationInMinutes,
                    5,
                    ethers.utils.parseEther("1"),
                    100,
                    50,
                    ipOwner1.address
                )
        ).to.be.revertedWith("Pausable: paused");
    });
});

describe("Final Keys Retrieval", function () {
    let auction, roomOwner, bidder1, bidder2, bidder3, ipOwner1, auditor;
    const price = ethers.utils.parseEther("1");
    let saleId = 1;

    beforeEach(async function () {
        const contracts = await loadFixture(deployContractsFixture);
        auction = contracts.auction;
        roomOwner = contracts.roomOwner;
        bidder1 = contracts.bidder1;
        bidder2 = contracts.bidder2;
        bidder3 = contracts.bidder3;
        ipOwner1 = contracts.ipOwner1;
        auditor = contracts.auditor;
    });

    it("Should return correct final keys for auction sale", async function () {
        // Create auction sale
        await auction.connect(roomOwner).createSale(
            1, // roomNumber
            0, // SaleType.Auction
            durationInMinutes,
            3, // totalKeys
            price,
            100, // minBidIncrement
            500, // ipOwnerShare
            ipOwner1.address
        );

        // Place bids on different keys
        await auction.connect(bidder1).placeBid(saleId, 0, { value: price.mul(2) });
        await auction.connect(bidder2).placeBid(saleId, 1, { value: price.mul(3) });
        // Leave key 2 without a bid

        // Advance time past sale end
        await time.increase(3600);

        // Get final keys
        const [keyIds, winners, amounts, claimedStatus] = await auction.getFinalKeys(saleId);

        // Verify arrays length
        expect(keyIds.length).to.equal(2);
        expect(winners.length).to.equal(2);
        expect(amounts.length).to.equal(2);
        expect(claimedStatus.length).to.equal(2);

        // Verify key 0 data
        expect(keyIds[0]).to.equal(0);
        expect(winners[0]).to.equal(bidder1.address);
        expect(amounts[0]).to.equal(price.mul(2));
        expect(claimedStatus[0]).to.be.false;

        // Verify key 1 data
        expect(keyIds[1]).to.equal(1);
        expect(winners[1]).to.equal(bidder2.address);
        expect(amounts[1]).to.equal(price.mul(3));
        expect(claimedStatus[1]).to.be.false;
    });

    it("Should return correct final keys for instant buy sale", async function () {
        // Create instant buy sale
        await auction.connect(roomOwner).createSale(
            1,
            1, // SaleType.InstantBuy
            durationInMinutes,
            3,
            price,
            0,
            500,
            ipOwner1.address
        );

        // Make purchases
        await auction.connect(bidder1).buyNow(saleId, 0, { value: price });
        await auction.connect(bidder2).buyNow(saleId, 2, { value: price }); // Skip key 1

        // Advance time
        await time.increase(3600);

        // Get final keys
        const [keyIds, winners, amounts, claimedStatus] = await auction.getFinalKeys(saleId);

        // Verify arrays length
        expect(keyIds.length).to.equal(2);
        expect(winners.length).to.equal(2);
        expect(amounts.length).to.equal(2);
        expect(claimedStatus.length).to.equal(2);

        // Verify correct order and data
        expect(keyIds[0]).to.equal(0);
        expect(keyIds[1]).to.equal(2);
        expect(winners[0]).to.equal(bidder1.address);
        expect(winners[1]).to.equal(bidder2.address);
        expect(amounts[0]).to.equal(price);
        expect(amounts[1]).to.equal(price);
        expect(claimedStatus[0]).to.be.false;
        expect(claimedStatus[1]).to.be.false;
    });

    it("Should return empty arrays for sale with no bids", async function () {
        // Create sale
        await auction.connect(roomOwner).createSale(
            1,
            0,
            durationInMinutes,
            3,
            price,
            100,
            500,
            ipOwner1.address
        );

        // Advance time
        await time.increase(3600);

        // Get final keys
        const [keyIds, winners, amounts, claimedStatus] = await auction.getFinalKeys(saleId);

        // Verify all arrays are empty
        expect(keyIds.length).to.equal(0);
        expect(winners.length).to.equal(0);
        expect(amounts.length).to.equal(0);
        expect(claimedStatus.length).to.equal(0);
    });

    it("Should reflect claimed status correctly", async function () {
        // Create auction sale
        await auction.connect(roomOwner).createSale(
            1,
            0,
            durationInMinutes,
            2,
            price,
            100,
            500,
            ipOwner1.address
        );

        // Place bids
        await auction.connect(bidder1).placeBid(saleId, 0, { value: price });
        await auction.connect(bidder2).placeBid(saleId, 1, { value: price });

        // Advance time
        await time.increase(3600);

        // Verify sale and fail it to allow refunds
        await auction.connect(auditor).setRoomVerification(saleId, false);

        // Claim refund for first key
        await auction.connect(bidder1).claimRefund(saleId, 0);

        // Get final keys
        const [keyIds, winners, amounts, claimedStatus] = await auction.getFinalKeys(saleId);

        // Verify claimed status
        expect(claimedStatus[0]).to.be.true; // First key claimed
        expect(claimedStatus[1]).to.be.false; // Second key not claimed
    });

    it("Should revert when trying to get keys before sale end", async function () {
        // Create sale
        await auction.connect(roomOwner).createSale(
            1,
            0,
            durationInMinutes,
            2,
            price,
            100,
            500,
            ipOwner1.address
        );

        // Try to get final keys before sale ends
        await expect(auction.getFinalKeys(saleId))
            .to.be.revertedWith("Sale not ended");
    });
});
