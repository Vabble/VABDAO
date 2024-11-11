const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
    // Replace with your actual deployed contract address
    const contractAddress = "0xA9a702d30dC22699189740cd2d2140f9534271a5";

    // Get signers
    const [owner, buyer, ...others] = await ethers.getSigners();

    console.log("Owner address:", owner.address);
    console.log("Buyer address:", buyer.address);

    // Get the contract factory and ABI
    const VabbleKeyzAuction = await ethers.getContractFactory("VabbleKeyzAuction");
    const contract = VabbleKeyzAuction.attach(contractAddress);

    // Parameters for createSale
    const roomId = 1;
    const saleType = 1; // 1 for InstantBuy
    const durationInMinutes = 1; // 1 minute for quick testing
    const totalKeys = 1;
    const price = ethers.utils.parseEther("0.00000001"); // Price per key
    const minBidIncrement = 0; // Not used for InstantBuy
    const ipOwnerShare = 30; // 3%
    const ipOwnerAddress = owner.address; // For testing, set to owner's address

    // Owner creates a new sale
    console.log("Creating a new sale...");
    const createSaleTx = await contract.createSale(
        roomId,
        saleType,
        durationInMinutes,
        totalKeys,
        price,
        minBidIncrement,
        ipOwnerShare,
        ipOwnerAddress
    );
    const receipt = await createSaleTx.wait();
    const saleId = receipt.events.find((e) => e.event === "SaleCreated").args.saleId;
    console.log("Sale created with ID:", saleId.toString());

    // Buyer buys a key
    console.log("Buyer is buying a key...");
    const keyId = 0; // Since totalKeys is 1, keyId is 0
    const buyNowTx = await contract
        .connect(buyer)
        .buyNow(saleId, keyId, { value: price });
    await buyNowTx.wait();
    console.log("Buyer has bought the key.");

    // Wait for the sale to end
    console.log("Waiting for the sale to end...");
    await new Promise((resolve) => setTimeout(resolve, durationInMinutes * 60 * 1000));

    // Call settleSale
    console.log("Settling the sale...");
    const settleSaleTx = await contract.settleSale(saleId);
    await settleSaleTx.wait();
    console.log("Sale settled.");

    // Check balances
    console.log("Checking balances...");
    const ownerBalance = await ethers.provider.getBalance(owner.address);
    const buyerBalance = await ethers.provider.getBalance(buyer.address);
    console.log("Owner balance:", ethers.utils.formatEther(ownerBalance));
    console.log("Buyer balance:", ethers.utils.formatEther(buyerBalance));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error in script:", error);
        process.exit(1);
    });
