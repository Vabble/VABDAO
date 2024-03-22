// we can't have these functions in our `helper-hardhat-config`
// since these use the hardhat library
// and it would be a circular dependency
const { parseEther } = require("ethers/lib/utils")
const { run, ethers } = require("hardhat")
const { DISCOUNT, CONFIG } = require("./scripts/utils")
const ERC20 = require("./data/ERC20.json")
const FxERC20 = require("./data/FxERC20.json")

//? Constants
const VAB_TOKEN_ADDRESS = CONFIG.mumbai.vabToken
const EXM_TOKEN_ADDRESS = CONFIG.mumbai.exmAddress
const USDC_TOKEN_ADDRESS = CONFIG.mumbai.usdcAdress
const UNISWAP_FACTORY_ADDRESS = CONFIG.mumbai.uniswap.factory
const UNISWAP_ROUTER_ADDRESS = CONFIG.mumbai.uniswap.router
const SUSHISWAP_FACTORY_ADDRESS = CONFIG.mumbai.sushiswap.factory
const SUSHISWAP_ROUTER_ADDRESS = CONFIG.mumbai.sushiswap.router

/**
 * Verify a contract by running verification with provided address and constructor arguments.
 *
 * @param {string} contractAddress - The address of the contract to verify
 * @param {Array} args - The constructor arguments of the contract
 * @return {Promise} A Promise that resolves when verification is completed
 */
const verify = async (contractAddress, args) => {
    console.log("Verifying contract...")
    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        })
    } catch (e) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Already verified!")
        } else {
            console.log(e)
        }
    }
}

/**
 * Funds and approves accounts with testnet VAB for the given contracts.
 *
 * @param {Array} accounts - An array of accounts to fund and approve.
 * @param {object} vabTokenContract - The VAB token contract.
 * @param {Array} contracts - An array of contracts to approve for each account.
 * @return {Promise<void>} A promise that resolves when all accounts have been funded and approved.
 */
const fundAndApproveAccounts = async (
    accounts,
    vabTokenContract,
    contracts,
    vabFaucetAmount = parseEther("50000")
) => {
    try {
        console.log("Funding and Approving accounts...")
        for (const account of accounts) {
            await vabTokenContract.connect(account).faucet(vabFaucetAmount)
            for (const contract of contracts) {
                await vabTokenContract.connect(account).approve(contract.address, vabFaucetAmount)
            }
        }
    } catch (e) {
        console.log("===== fundAndApproveAccounts error =====", e)
    }
}

/**
 * Deploys and initializes all the contracts needed for tests.
 *
 * @return {Promise<Object>} An object containing the deployed contracts and their associated properties.
 */
const deployAndInitAllContracts = async () => {
    try {
        //? contract factories
        const vabbleDAOFactory = await ethers.getContractFactory("VabbleDAO")
        const vabbleFundFactory = await ethers.getContractFactory("VabbleFund")
        const uniHelperFactory = await ethers.getContractFactory("UniHelper")
        const voteFactory = await ethers.getContractFactory("Vote")
        const propertyFactory = await ethers.getContractFactory("Property")
        const factoryFilmNFTFactory = await ethers.getContractFactory("FactoryFilmNFT")
        const factoryTierNFTFactory = await ethers.getContractFactory("FactoryTierNFT")
        const factorySubNFTFactory = await ethers.getContractFactory("FactorySubNFT")
        const ownableFactory = await ethers.getContractFactory("Ownablee")
        const subscriptionFactory = await ethers.getContractFactory("Subscription")
        const stakingPoolFactory = await ethers.getContractFactory("StakingPool")

        //? get accounts
        const [deployer, dev, auditor, staker1, staker2] = await ethers.getSigners()

        //? token contracts
        const vabTokenContract = new ethers.Contract(
            VAB_TOKEN_ADDRESS,
            JSON.stringify(FxERC20), // we use FxER20 to call the faucet in local network
            ethers.provider
        )
        const exmTokenContract = new ethers.Contract(
            EXM_TOKEN_ADDRESS,
            JSON.stringify(ERC20),
            ethers.provider
        )
        const usdcTokenContract = new ethers.Contract(
            USDC_TOKEN_ADDRESS,
            JSON.stringify(ERC20),
            ethers.provider
        )

        //? Deploy contracts
        const ownable = await ownableFactory.deploy(
            CONFIG.daoWalletAddress, // vabbleWallet
            vabTokenContract.address, // payoutToken
            usdcTokenContract.address, // usdcToken
            auditor.address // multiSigWallet
        )

        const uniHelper = await uniHelperFactory.deploy(
            UNISWAP_FACTORY_ADDRESS,
            UNISWAP_ROUTER_ADDRESS,
            SUSHISWAP_FACTORY_ADDRESS,
            SUSHISWAP_ROUTER_ADDRESS,
            ownable.address
        )

        const stakingPool = await stakingPoolFactory.deploy(ownable.address)

        const vote = await voteFactory.deploy(ownable.address)

        const property = await propertyFactory.deploy(
            ownable.address,
            uniHelper.address,
            vote.address,
            stakingPool.address
        )

        const filmNFT = await factoryFilmNFTFactory.deploy(ownable.address)

        const subNFT = await factorySubNFTFactory.deploy(ownable.address, uniHelper.address)

        const vabbleFund = await vabbleFundFactory.deploy(
            ownable.address,
            uniHelper.address,
            stakingPool.address,
            property.address,
            filmNFT.address
        )

        const vabbleDAO = await vabbleDAOFactory.deploy(
            ownable.address,
            uniHelper.address,
            vote.address,
            stakingPool.address,
            property.address,
            vabbleFund.address
        )

        const tierNFT = await factoryTierNFTFactory.deploy(
            ownable.address,
            vabbleDAO.address,
            vabbleFund.address
        )

        const subscription = await subscriptionFactory.deploy(
            ownable.address,
            uniHelper.address,
            property.address,
            [DISCOUNT.month3, DISCOUNT.month6, DISCOUNT.month12]
        )

        //? Initialize the contracts with the correct arguments
        await filmNFT.connect(deployer).initialize(vabbleDAO.address, vabbleFund.address)

        await stakingPool
            .connect(deployer)
            .initialize(vabbleDAO.address, property.address, vote.address)

        await vote
            .connect(deployer)
            .initialize(vabbleDAO.address, stakingPool.address, property.address, uniHelper.address)

        await vabbleFund.connect(deployer).initialize(vabbleDAO.address)

        await uniHelper
            .connect(deployer)
            .setWhiteList(
                vabbleDAO.address,
                vabbleFund.address,
                subscription.address,
                filmNFT.address,
                subNFT.address
            )

        await ownable.connect(deployer).setup(vote.address, vabbleDAO.address, stakingPool.address)

        await ownable
            .connect(deployer)
            .addDepositAsset([
                vabTokenContract.address,
                usdcTokenContract.address,
                exmTokenContract.address,
                CONFIG.addressZero,
            ])

        //? Get the properties from the property contract
        /**
         *
         * @dev lockPeriod = 2592000 seconds = 30 days
         */
        const lockPeriodInSeconds = Number(await property.lockPeriod())

        return {
            deployer,
            dev,
            auditor,
            staker1,
            staker2,
            stakingPool,
            ownable,
            vabTokenContract,
            vote,
            property,
            filmNFT,
            subNFT,
            vabbleFund,
            vabbleDAO,
            tierNFT,
            subscription,
            stakingPoolFactory,
            lockPeriodInSeconds,
        }
    } catch (error) {
        console.log("===== deployAndInitAllContracts error =====", error)
    }
}

module.exports = {
    verify,
    fundAndApproveAccounts,
    deployAndInitAllContracts,
}
