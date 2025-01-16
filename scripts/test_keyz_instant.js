const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
    // Replace with your actual deployed contract address
    const contractAddress = "0xab797A39BbDB921BfDc5fBC81cEd02620738c365";

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
    const roomNumber = parseInt(saleCounter.toString()) + 1; // Use next available ID
    const saleType = 1; // 1 for InstantBuy
    const durationInSeconds = 60; // Duration in seconds
    const totalKeys = 1;
    const price = ethers.utils.parseEther("0.00000001"); // Price per key
    const minBidIncrement = 0; // Not used for InstantBuy
    const ipOwnerShare = 300; // 3% (300 basis points)
    const ipOwnerAddress = owner.address; // For testing, set to owner's address

    try {
        // Owner creates a new sale
        console.log("Creating a new sale with parameters:");
        console.log({
            roomNumber,
            saleType,
            durationInSeconds,
            totalKeys,
            price: price.toString(),
            minBidIncrement,
            ipOwnerShare,
            ipOwnerAddress
        });

        // Get current gas price
        const gasPrice = await ethers.provider.getGasPrice();
        console.log("Current gas price:", ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");

        // Use a higher gas price to ensure transaction goes through
        const adjustedGasPrice = gasPrice.mul(120).div(100); // 120% of current gas price
        console.log("Using gas price:", ethers.utils.formatUnits(adjustedGasPrice, "gwei"), "gwei");

        const createSaleTx = await contract.createSale(
            roomNumber,
            saleType,
            durationInSeconds,
            totalKeys,
            price,
            minBidIncrement,
            ipOwnerShare,
            ipOwnerAddress,
            { gasPrice: adjustedGasPrice }
        );
        console.log("Transaction hash:", createSaleTx.hash);
        console.log("Waiting for transaction confirmation...");

        const receipt = await createSaleTx.wait();
        console.log("Transaction confirmed in block:", receipt.blockNumber);

        // Get the new sale ID (it should be the same as roomNumber)
        const saleId = roomNumber;
        console.log("Sale created with ID:", saleId.toString());

        // Add a small delay to ensure the sale is active
        console.log("Waiting 2 seconds before attempting purchase...");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Buyer buys a key
        console.log("Buyer is buying a key...");
        const keyId = 0; // Since totalKeys is 1, keyId is 0
        const buyNowTx = await contract
            .connect(buyer)
            .buyNow(saleId, keyId, { value: price, gasPrice: adjustedGasPrice });
        console.log("Buy transaction hash:", buyNowTx.hash);
        await buyNowTx.wait();
        console.log("Buyer has bought the key.");

        // Wait for the sale to end
        console.log("Waiting for the sale to end...");
        await new Promise((resolve) => setTimeout(resolve, durationInSeconds * 1000));

        // Call settleSale
        console.log("Settling the sale...");
        const settleSaleTx = await contract.settleSale(saleId, { gasPrice: adjustedGasPrice });
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
