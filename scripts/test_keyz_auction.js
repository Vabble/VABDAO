const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
    // Replace with your actual deployed contract address
    const contractAddress = "0xdb7A8AFFE18881687064A803Ee8DBb173EFe768B";

    // Get private keys from environment variables
    const ownerPrivateKey = process.env.OWNER_PRIVATE_KEY;
    const bidder1PrivateKey = process.env.BIDDER1_PRIVATE_KEY;
    const bidder2PrivateKey = process.env.BIDDER2_PRIVATE_KEY;
    const bidder3PrivateKey = process.env.BIDDER3_PRIVATE_KEY;

    if (!ownerPrivateKey || !bidder1PrivateKey || !bidder2PrivateKey || !bidder3PrivateKey) {
        throw new Error("Please set OWNER_PRIVATE_KEY, BIDDER1_PRIVATE_KEY, BIDDER2_PRIVATE_KEY, and BIDDER3_PRIVATE_KEY in your .env file");
    }

    // Create wallet instances
    const provider = ethers.provider;
    const owner = new ethers.Wallet(ownerPrivateKey, provider);
    const bidder1 = new ethers.Wallet(bidder1PrivateKey, provider);
    const bidder2 = new ethers.Wallet(bidder2PrivateKey, provider);
    const bidder3 = new ethers.Wallet(bidder3PrivateKey, provider);

    console.log("Owner address:", owner.address);
    console.log("Bidder 1 address:", bidder1.address);
    console.log("Bidder 2 address:", bidder2.address);
    console.log("Bidder 3 address:", bidder3.address);

    // Get the contract factory and ABI
    const VabbleKeyzAuction = await ethers.getContractFactory("VabbleKeyzAuction", owner);
    const contract = VabbleKeyzAuction.attach(contractAddress);

    // Get the current sale counter
    const saleCounter = await contract.saleCounter();
    console.log("Current sale counter:", saleCounter.toString());

    // Parameters for createSale
    const roomId = parseInt(saleCounter.toString()) + 1; // Use next available ID
    const saleType = 0; // 0 for Auction
    const durationInSeconds = 60; // 1 minute duration
    const totalKeys = 2; // Testing with 2 keys
    const startingPrice = ethers.utils.parseEther("0.0001"); // Starting price per key
    const minBidIncrement = 1000; // 10% minimum bid increment (10000 = 100%)
    const ipOwnerShare = 300; // 3% (300 basis points)
    const ipOwnerAddress = owner.address; // For testing, set to owner's address

    try {
        // Owner creates a new auction sale
        console.log("Creating a new auction sale with parameters:");
        console.log({
            roomId,
            saleType,
            durationInSeconds,
            totalKeys,
            price: startingPrice.toString(),
            minBidIncrement,
            ipOwnerShare,
            ipOwnerAddress
        });

        // Get latest block
        const block = await ethers.provider.getBlock("latest");
        const baseFeePerGas = block.baseFeePerGas;
        const maxPriorityFeePerGas = ethers.utils.parseUnits("1.5", "gwei");
        const maxFeePerGas = baseFeePerGas.mul(2).add(maxPriorityFeePerGas);

        console.log("Gas settings:");
        console.log("Base fee:", ethers.utils.formatUnits(baseFeePerGas, "gwei"), "gwei");
        console.log("Max priority fee:", ethers.utils.formatUnits(maxPriorityFeePerGas, "gwei"), "gwei");
        console.log("Max fee:", ethers.utils.formatUnits(maxFeePerGas, "gwei"), "gwei");

        const createSaleTx = await contract.createSale(
            roomId,
            saleType,
            durationInSeconds,
            totalKeys,
            startingPrice,
            minBidIncrement,
            ipOwnerShare,
            ipOwnerAddress,
            {
                maxFeePerGas,
                maxPriorityFeePerGas
            }
        );
        console.log("Transaction hash:", createSaleTx.hash);
        console.log("Waiting for transaction confirmation...");

        const receipt = await createSaleTx.wait();
        console.log("Transaction confirmed in block:", receipt.blockNumber);

        // Get the new sale ID (it should be the same as roomId)
        const saleId = roomId;
        console.log("Auction sale created with ID:", saleId.toString());

        // Add a small delay to ensure the sale is active
        console.log("Waiting 5 seconds before starting bidding...");
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Check if sale is active
        const currentBlock = await ethers.provider.getBlock("latest");
        const sale = await contract.sales(saleId);
        console.log("Sale start time:", sale.startTime.toString());
        console.log("Sale end time:", sale.endTime.toString());
        console.log("Current block timestamp:", currentBlock.timestamp);

        if (currentBlock.timestamp >= sale.endTime) {
            throw new Error("Sale has already ended. Block time moved too fast.");
        }

        // Bidder 1 places first bid on key 0
        console.log("Bidder 1 placing first bid on key 0...");
        const firstBidTx = await contract
            .connect(bidder1)
            .placeBid(saleId, 0, {
                value: startingPrice,
                maxFeePerGas,
                maxPriorityFeePerGas
            });
        await firstBidTx.wait();
        console.log("Bidder 1's bid confirmed");

        // Check if sale is still active
        const blockAfterFirstBid = await ethers.provider.getBlock("latest");
        if (blockAfterFirstBid.timestamp >= sale.endTime) {
            console.log("Sale ended after first bid. Proceeding to settlement...");
        } else {
            // Continue with more bids
            // Bidder 2 places higher bid on key 0
            const higherBid = startingPrice.mul(11).div(10); // 10% higher than starting price
            console.log("Bidder 2 placing higher bid on key 0...");
            const secondBidTx = await contract
                .connect(bidder2)
                .placeBid(saleId, 0, {
                    value: higherBid,
                    maxFeePerGas,
                    maxPriorityFeePerGas
                });
            await secondBidTx.wait();
            console.log("Bidder 2's bid confirmed");

            // Bidder 3 bids on key 1
            console.log("Bidder 3 placing bid on key 1...");
            const thirdBidTx = await contract
                .connect(bidder3)
                .placeBid(saleId, 1, {
                    value: startingPrice,
                    maxFeePerGas,
                    maxPriorityFeePerGas
                });
            await thirdBidTx.wait();
            console.log("Bidder 3's bid confirmed");

            // Bidder 1 claims refund after being outbid
            console.log("Bidder 1 claiming refund...");
            const claimRefundTx = await contract
                .connect(bidder1)
                .withdrawPendingReturns({
                    maxFeePerGas,
                    maxPriorityFeePerGas
                });
            await claimRefundTx.wait();
            console.log("Bidder 1's refund claimed");
        }

        // Wait for the auction to end if it hasn't already
        const finalBlock = await ethers.provider.getBlock("latest");
        if (finalBlock.timestamp < sale.endTime) {
            const timeToWait = (sale.endTime - finalBlock.timestamp) + 15; // Add 15 seconds buffer
            console.log(`Waiting ${timeToWait} seconds for the auction to end (including buffer)...`);
            await new Promise((resolve) => setTimeout(resolve, timeToWait * 1000));
        } else {
            // Add a small buffer even if we think it's ended
            console.log("Adding 15 seconds buffer before settlement...");
            await new Promise((resolve) => setTimeout(resolve, 15000));
        }

        // Double check the sale has ended
        const checkBlock = await ethers.provider.getBlock("latest");
        if (checkBlock.timestamp <= sale.endTime) {
            throw new Error("Sale has not ended yet. Waiting longer...");
        }

        // Call settleSale
        console.log("Settling the auction...");
        const settleSaleTx = await contract.settleSale(saleId, {
            maxFeePerGas,
            maxPriorityFeePerGas
        });
        await settleSaleTx.wait();
        console.log("Auction settled.");

        // Check final state
        console.log("Checking final auction state...");
        const key0Bid = await contract.getKeyBid(saleId, 0);
        const key1Bid = await contract.getKeyBid(saleId, 1);
        console.log("Key 0 winning bid:", ethers.utils.formatEther(key0Bid.amount), "ETH by", key0Bid.bidder);
        console.log("Key 1 winning bid:", ethers.utils.formatEther(key1Bid.amount), "ETH by", key1Bid.bidder);

    } catch (error) {
        console.error("Detailed error:", {
            message: error.message,
            data: error.data,
            transaction: error.transaction,
            receipt: error.receipt
        });
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error in script:", error);
        process.exit(1);
    });
