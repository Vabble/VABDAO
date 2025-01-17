const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
    // Replace with your actual deployed contract address
    const contractAddress = "0x320c761f0AdEEf28B00D9F664e8BdC6685dF3130";

    // Get signers
    const [owner, buyer, ...others] = await ethers.getSigners();

    // Get auditor private key from environment variables
    const auditorPrivateKey = process.env.AUDITOR_PRIVATE_KEY;
    if (!auditorPrivateKey) {
        throw new Error("Please set AUDITOR_PRIVATE_KEY in your .env file");
    }

    // Create auditor wallet instance
    const auditor = new ethers.Wallet(auditorPrivateKey, ethers.provider);

    console.log("Owner address:", owner.address);
    console.log("Buyer address:", buyer.address);
    console.log("Auditor address:", auditor.address);

    // Get the contract factory and ABI
    const VabbleKeyzAuction = await ethers.getContractFactory("VabbleKeyzAuction");
    const contract = VabbleKeyzAuction.attach(contractAddress);

    // Get the current sale counter
    const saleCounter = await contract.saleCounter();
    console.log("Current sale counter:", saleCounter.toString());

    // Parameters for createSale
    const roomNumber = parseInt(saleCounter.toString()) + 1; // Use next available ID
    const saleType = 1; // 1 for InstantBuy
    const durationInMinutes = 1; // Duration in minutes
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
            durationInMinutes,
            totalKeys,
            price: price.toString(),
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

        // Estimate gas with a safety buffer
        const estimatedGas = await contract.estimateGas.createSale(
            roomNumber,
            saleType,
            durationInMinutes,
            totalKeys,
            price,
            0, // minBidIncrement not used for instant buy
            ipOwnerShare,
            ipOwnerAddress
        );
        const gasLimit = estimatedGas.mul(120).div(100); // Add 20% buffer
        console.log("Estimated gas:", estimatedGas.toString());
        console.log("Gas limit with buffer:", gasLimit.toString());

        const createSaleTx = await contract.createSale(
            roomNumber,
            saleType,
            durationInMinutes,
            totalKeys,
            price,
            minBidIncrement,
            ipOwnerShare,
            ipOwnerAddress,
            { gasPrice: maxFeePerGas }
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

        // Estimate gas for purchase with safety buffer
        const estimatedPurchaseGas = await contract.connect(buyer).estimateGas.buyNow(saleId, 0, {
            value: price
        });
        const purchaseGasLimit = estimatedPurchaseGas.mul(120).div(100); // Add 20% buffer
        console.log("Estimated purchase gas:", estimatedPurchaseGas.toString());
        console.log("Purchase gas limit with buffer:", purchaseGasLimit.toString());

        const purchaseTx = await contract
            .connect(buyer)
            .buyNow(saleId, 0, {
                value: price,
                maxFeePerGas,
                maxPriorityFeePerGas,
                gasLimit: purchaseGasLimit
            });
        console.log("Buy transaction hash:", purchaseTx.hash);
        await purchaseTx.wait();
        console.log("Buyer has bought the key.");

        // Wait for the sale to end
        console.log("Waiting for the sale to end...");
        await new Promise((resolve) => setTimeout(resolve, durationInMinutes * 60 * 1000));

        // Verify the room using auditor
        console.log("Verifying the room...");
        const verifyTx = await contract
            .connect(auditor)
            .setRoomVerification(roomNumber, true, { gasPrice: maxFeePerGas });
        await verifyTx.wait();
        console.log("Room verified successfully");

        // Call settleSale
        console.log("Settling the sale...");
        const settleSaleTx = await contract.settleSale(saleId, { gasPrice: maxFeePerGas });
        await settleSaleTx.wait();
        console.log("Sale settled and funds distributed.");

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
