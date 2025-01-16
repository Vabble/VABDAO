// deploy/deploy-keyz-auction.js

const { ethers, network, run } = require("hardhat");

const CONFIG = {
    baseSepolia: {
        WETH: "0x4200000000000000000000000000000000000006",
        vabbleAddress: "0x6fD89350A94A02B003E638c889b54DAB0E251655",
        vabTokenAddress: "0x811401d4b7d8EAa0333Ada5c955cbA1fd8B09eda",
        daoAddress: "0x368980Cc885DF672A168bDF873B19c1eEB10D5c2",
        uniHelper: "0x0CAc3092DCFf7a5194aD79AFbE5fF52dD767e4e9",
        staking: "0xdE758e55f5D3a94311137f8665417800f0d94747",
        uniswapRouter: "0x1689E7B1F10000AE47eBfE339a4f69dECd19F602"
    },
    base: {
        WETH: "0x4200000000000000000000000000000000000006",
        vabbleAddress: "0x6fD89350A94A02B003E638c889b54DAB0E251655",
        vabTokenAddress: "0x2C9ab600D71967fF259c491aD51F517886740cbc",
        daoAddress: "0x368980Cc885DF672A168bDF873B19c1eEB10D5c2",
        uniHelper: "0x0CAc3092DCFf7a5194aD79AFbE5fF52dD767e4e9",
        staking: "0xdE758e55f5D3a94311137f8665417800f0d94747",
        uniswapRouter: "0x1689E7B1F10000AE47eBfE339a4f69dECd19F602"
    }
};

async function main() {
    const networkName = network.name;
    console.log(`Deploying to ${networkName}...`);

    const config = CONFIG[networkName];
    if (!config) {
        throw new Error(`No configuration found for network: ${networkName}`);
    }

    const [deployer] = await ethers.getSigners();
    console.log(`Deploying contracts with account: ${deployer.address}`);
    console.log(`Account balance: ${(await deployer.getBalance()).toString()}`);

    try {
        // Get current gas price and calculate optimized gas price
        const gasPrice = await ethers.provider.getGasPrice();
        console.log("Current gas price:", ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");

        // Use 120% of current gas price to ensure we're above base fee
        const optimizedGasPrice = gasPrice.mul(120).div(100);
        console.log("Using optimized gas price:", ethers.utils.formatUnits(optimizedGasPrice, "gwei"), "gwei");

        console.log("Deploying VabbleKeyzAuction...");
        const VabbleKeyzAuction = await ethers.getContractFactory("VabbleKeyzAuction");
        const auction = await VabbleKeyzAuction.deploy(
            config.vabbleAddress,      // ETH receiver address
            config.vabTokenAddress,    // VAB token address
            config.daoAddress,
            config.uniHelper,
            config.staking,
            config.uniswapRouter,
            { gasPrice: optimizedGasPrice }
        );

        console.log("Deployment transaction hash:", auction.deployTransaction.hash);
        await auction.deployed();
        console.log("VabbleKeyzAuction deployed to:", auction.address);

        // Wait for confirmations
        console.log("Waiting for block confirmations...");
        await auction.deployTransaction.wait(5);

        // Verify contract
        if (networkName !== "localhost" && networkName !== "hardhat") {
            console.log("Verifying contract...");
            try {
                await run("verify:verify", {
                    address: auction.address,
                    constructorArguments: [
                        config.vabbleAddress,
                        config.vabTokenAddress,
                        config.daoAddress,
                        config.uniHelper,
                        config.staking,
                        config.uniswapRouter
                    ],
                });
                console.log("Contract verified successfully");
            } catch (error) {
                console.log("Verification failed:", error);
            }
        }

        // Log deployment info
        console.log("\nDeployment Summary:");
        console.log("--------------------");
        console.log("Network:", networkName);
        console.log("VabbleKeyzAuction:", auction.address);
        console.log("Vabble Address (ETH):", config.vabbleAddress);
        console.log("VAB Token Address:", config.vabTokenAddress);
        console.log("DAO Address:", config.daoAddress);
        console.log("UniHelper:", config.uniHelper);
        console.log("Staking Pool:", config.staking);
        console.log("Uniswap Router:", config.uniswapRouter);

        // Save deployment info
        const deploymentInfo = {
            network: networkName,
            contracts: {
                VabbleKeyzAuction: auction.address,
            },
            config: config
        };

        const fs = require('fs');
        const deploymentPath = `./deployments/${networkName}.json`;
        fs.mkdirSync('./deployments', { recursive: true });
        fs.writeFileSync(
            deploymentPath,
            JSON.stringify(deploymentInfo, null, 2)
        );
        console.log(`\nDeployment info saved to ${deploymentPath}`);

    } catch (error) {
        console.error("Deployment failed:", error);
        if (error.transaction) {
            console.error("Transaction hash:", error.transaction.hash);
            console.error("Gas used:", error.transaction.gasLimit?.toString());
            console.error("Gas price:", error.transaction.gasPrice?.toString());
        }
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });