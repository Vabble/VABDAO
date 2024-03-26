// we can't have these functions in our `helper-hardhat-config`
// since these use the hardhat library
// and it would be a circular dependency
const { run, ethers, network } = require("hardhat")
const { DISCOUNT, CONFIG } = require("./scripts/utils")
const ERC20 = require("./data/ERC20.json")
const FxERC20 = require("./data/FxERC20.json")
const {
    VAB_FAUCET_AMOUNT,
    USDC_FAUCET_AMOUNT,
    ONE_DAY_IN_SECONDS,
} = require("./helper-hardhat-config")
const { parseUnits } = require("ethers/lib/utils")

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
const fundAndApproveAccounts = async ({
    accounts,
    vabTokenContract,
    contracts,
    usdcTokenContract,
}) => {
    try {
        console.log("Funding and Approving accounts...")
        for (const account of accounts) {
            await vabTokenContract.connect(account).faucet(VAB_FAUCET_AMOUNT)
            await usdcTokenContract.connect(account).faucet(USDC_FAUCET_AMOUNT)
            for (const contract of contracts) {
                await vabTokenContract.connect(account).approve(contract.address, VAB_FAUCET_AMOUNT)
                await usdcTokenContract
                    .connect(account)
                    .approve(contract.address, USDC_FAUCET_AMOUNT)
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
            JSON.stringify(FxERC20),
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
        const lockPeriodInSeconds = Number(await property.lockPeriod())
        const propertyVotePeriod = Number(await property.propertyVotePeriod())
        const boardRewardRate = await property.boardRewardRate()
        const rewardRate = await property.rewardRate()

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
            propertyVotePeriod,
            boardRewardRate,
            rewardRate,
            usdcTokenContract,
        }
    } catch (error) {
        console.log("===== deployAndInitAllContracts error =====", error)
    }
}

/**
 * Creates and updates a dummy film proposal.
 *
 * @param {Object} options - The options for creating and updating the dummy film proposal.
 * @param {Contract} options.vabbleDAO - The instance of the vabbleDAO contract.
 * @param {Signer} options.proposalCreator - The signer of the proposal creator.
 * @return {Promise<Object>} - A promise that resolves to an object containing the transaction details and proposal information.
 */
const createAndUpdateDummyFilmProposal = async ({ vabbleDAO, proposalCreator }) => {
    try {
        const fundType = 0 // Distribution proposal
        const noVote = 0 // if 0 => false
        const feeTokenAddress = USDC_TOKEN_ADDRESS
        const proposalId = 1
        const studioRoyalty = "100"
        const sharePercents = [parseUnits(studioRoyalty, 8)]
        const studioPayees = [proposalCreator.address]
        const raiseAmount = 0
        const fundPeriod = 0
        const rewardPercent = 0
        const enableClaimer = 0
        const title = "Test Title"
        const description = "Test Description"

        const vabbleDaoContract = vabbleDAO.connect(proposalCreator)

        const proposalFilmCreateTx = await vabbleDaoContract.proposalFilmCreate(
            fundType,
            noVote,
            feeTokenAddress
        )

        const proposalFilmUpdateTx = await vabbleDaoContract.proposalFilmUpdate(
            proposalId,
            title,
            description,
            sharePercents,
            studioPayees,
            raiseAmount,
            fundPeriod,
            rewardPercent,
            enableClaimer
        )

        return { proposalFilmCreateTx, proposalFilmUpdateTx, proposalId, noVote, fundType }
    } catch (error) {
        console.log("===== createAndUpdateDummyFilmProposal error =====", error)
    }
}

/**
 * Generates a dummy governance property proposal.
 *
 * @param {Object} property - The property object.
 * @param {Object} proposalCreator - The user creating the proposal.
 * @return {Object} An object containing the created governance proposal transaction, property change, flag, title, description, and proposal index.
 */
const createDummyGovernancePropertyProposal = async ({ property, proposalCreator }) => {
    const flag = 7 // Film Board Removal Period
    const title = "Test Proposal"
    const description = "Test Proposal Description"
    const propertyChange = ONE_DAY_IN_SECONDS * 7
    const proposalIndex = 0

    try {
        const createGovernanceProposalTx = await property
            .connect(proposalCreator)
            .proposalProperty(propertyChange, flag, title, description)

        const governanceProposalTimestamp = await getTimestampFromTx(createGovernanceProposalTx)

        return {
            createGovernanceProposalTx,
            propertyChange,
            flag,
            title,
            description,
            proposalIndex,
            governanceProposalTimestamp,
        }
    } catch (error) {
        console.log("===== createDummyGovernancePropertyProposal error =====", error)
    }
}

/**
 * Retrieves the timestamp from a transaction.
 *
 * @param {Object} tx - The transaction object.
 * @return {Promise<number>} The timestamp of the transaction.
 */
const getTimestampFromTx = async (tx) => {
    const block = await ethers.provider.getBlock(tx.blockNumber)
    return block.timestamp
}

module.exports = {
    verify,
    fundAndApproveAccounts,
    deployAndInitAllContracts,
    createAndUpdateDummyFilmProposal,
    createDummyGovernancePropertyProposal,
    getTimestampFromTx,
}
