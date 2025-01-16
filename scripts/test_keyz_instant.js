const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
    // Replace with your actual deployed contract address
    const contractAddress = "0x9B401040e045C261DA4FdEe4eaa293BeCaf25D8B";

    // Get signers
    const [owner, buyer, ...others] = await ethers.getSigners();

    console.log("Owner address:", owner.address);
    console.log("Buyer address:", buyer.address);

    // Get the contract factory and ABI
    const VabbleKeyzAuction = await ethers.getContractFactory("VabbleKeyzAuction");
    const contract = VabbleKeyzAuction.attach(contractAddress);

    // Get the current sale counter
    const saleCounter = await contract.saleCounter();
    console.log("Current sale counter:", saleCounter.toString());

    // Parameters for createSale
    const roomId = parseInt(saleCounter.toString()) + 1; // Use next available ID
    const saleType = 1; // 1 for InstantBuy
    const durationInMinutes = 1; // 1 minute
    const totalKeys = 1;
    const price = ethers.utils.parseEther("0.00000001"); // Price per key
    const minBidIncrement = 0; // Not used for InstantBuy
    const ipOwnerShare = 300; // 3% (300 basis points)
    const ipOwnerAddress = owner.address; // For testing, set to owner's address

    try {
        // Owner creates a new sale
        console.log("Creating a new sale with parameters:");
        console.log({
            roomId,
            saleType,
            durationInMinutes,
            totalKeys,
            price: price.toString(),
            minBidIncrement,
            ipOwnerShare,
            ipOwnerAddress
        });

        // Get current gas price
        const gasPrice = await ethers.provider.getGasPrice();
        console.log("Current gas price:", ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");

        // Use a lower gas price
        const lowerGasPrice = gasPrice.mul(80).div(100); // 80% of current gas price
        console.log("Using gas price:", ethers.utils.formatUnits(lowerGasPrice, "gwei"), "gwei");

        const createSaleTx = await contract.createSale(
            roomId,
            saleType,
            durationInMinutes,
            totalKeys,
            price,
            minBidIncrement,
            ipOwnerShare,
            ipOwnerAddress,
            { gasPrice: lowerGasPrice }
        );
        console.log("Transaction hash:", createSaleTx.hash);
        console.log("Waiting for transaction confirmation...");

        const receipt = await createSaleTx.wait();
        console.log("Transaction confirmed in block:", receipt.blockNumber);

        // Get the new sale ID (it should be the same as roomId)
        const saleId = roomId;
        console.log("Sale created with ID:", saleId.toString());

        // Add a small delay to ensure the sale is active
        console.log("Waiting 5 seconds before attempting purchase...");
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Buyer buys a key
        console.log("Buyer is buying a key...");
        const keyId = 0; // Since totalKeys is 1, keyId is 0
        const buyNowTx = await contract
            .connect(buyer)
            .buyNow(saleId, keyId, { value: price, gasPrice: lowerGasPrice });
        console.log("Buy transaction hash:", buyNowTx.hash);
        await buyNowTx.wait();
        console.log("Buyer has bought the key.");

        // Wait for the sale to end
        console.log("Waiting for the sale to end...");
        await new Promise((resolve) => setTimeout(resolve, durationInMinutes * 60 * 1000));

        // Call settleSale
        console.log("Settling the sale...");
        const settleSaleTx = await contract.settleSale(saleId, { gasPrice: lowerGasPrice });
        await settleSaleTx.wait();
        console.log("Sale settled.");

        // Check balances
        console.log("Checking balances...");
        const ownerBalance = await ethers.provider.getBalance(owner.address);
        const buyerBalance = await ethers.provider.getBalance(buyer.address);
        console.log("Owner balance:", ethers.utils.formatEther(ownerBalance));
        console.log("Buyer balance:", ethers.utils.formatEther(buyerBalance));
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
