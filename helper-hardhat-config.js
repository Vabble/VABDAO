const { parseEther, parseUnits } = require("ethers/lib/utils")

const networkConfig = {
    default: {
        name: "hardhat",
    },
    31337: {
        name: "localhost",
    },
    84532: {
        name: "baseSepolia",
        localRpcUrl: `https://sepolia.base.org/`,
    },
}

const developmentChains = ["hardhat", "localhost"]
const VERIFICATION_BLOCK_CONFIRMATIONS = 6
const VAB_FAUCET_AMOUNT = parseEther("50000")
const USDC_FAUCET_AMOUNT = 1000000000 // 1000 USDC
const ONE_DAY_IN_SECONDS = 86400

function getMinPropertyList() {
    return [
        7 * 24 * 3600, // FILM_VOTE_PERIOD: 7 days
        7 * 24 * 3600, // AGENT_VOTE_PERIOD: 7 days
        7 * 24 * 3600, // DISPUTE_GRACE_PERIOD: 7 days
        7 * 24 * 3600, // PROPERTY_VOTE_PERIOD: 7 days
        7 * 24 * 3600, // LOCK_PERIOD: 7 days
        parseUnits("2", 5), // REWARD_RATE: 0.002%
        1 * 24 * 3600, // FILM_REWARD_CLAIM_PERIOD: 1 day
        7 * 24 * 3600, // MAX_ALLOW_PERIOD: 7 days
        parseUnits("20", 6), // PROPOSAL_FEE_AMOUNT: $20
        parseUnits("2", 8), // FUND_FEE_PERCENT: 2%
        parseUnits("5", 6), // MIN_DEPOSIT_AMOUNT: $5
        parseUnits("5", 6), // MAX_DEPOSIT_AMOUNT: $5
        parseUnits("1", 8), // MAX_MINT_FEE_PERCENT: 1%
        1, // MIN_VOTE_COUNT: 1
        parseUnits("3", 8), // MIN_STAKER_COUNT_PERCENT: 3%
        parseUnits("50000000", 18), // AVAILABLE_VAB_AMOUNT: 50M
        7 * 24 * 3600, // BOARD_VOTE_PERIOD: 7 days
        parseUnits("5", 8), // BOARD_VOTE_WEIGHT: 5%
        7 * 24 * 3600, // REWARD_VOTE_PERIOD: 7 days
        parseUnits("2.99", 6), // SUBSCRIPTION_AMOUNT: $2.99
        parseUnits("1", 8), // BOARD_REWARD_RATE: 1%
    ]
}

function getMaxPropertyList() {
    return [
        90 * 24 * 3600, // FILM_VOTE_PERIOD: 90 days
        90 * 24 * 3600, // AGENT_VOTE_PERIOD: 90 days
        90 * 24 * 3600, // DISPUTE_GRACE_PERIOD: 90 days
        90 * 24 * 3600, // PROPERTY_VOTE_PERIOD: 90 days
        90 * 24 * 3600, // LOCK_PERIOD: 90 days
        parseUnits("58", 5), // REWARD_RATE: 0.058%
        90 * 24 * 3600, // FILM_REWARD_CLAIM_PERIOD: 90 days
        90 * 24 * 3600, // MAX_ALLOW_PERIOD: 90 days
        parseUnits("500", 6), // PROPOSAL_FEE_AMOUNT: $500
        parseUnits("10", 8), // FUND_FEE_PERCENT: 10%
        parseUnits("10000000", 6), // MIN_DEPOSIT_AMOUNT: $10,000,000
        parseUnits("10000000", 6), // MAX_DEPOSIT_AMOUNT: $10,000,000
        parseUnits("10", 8), // MAX_MINT_FEE_PERCENT: 10%
        10, // MIN_VOTE_COUNT: 10
        parseUnits("10", 8), // MIN_STAKER_COUNT_PERCENT: 10%
        parseUnits("200000000", 18), // AVAILABLE_VAB_AMOUNT: 200M
        90 * 24 * 3600, // BOARD_VOTE_PERIOD: 90 days
        parseUnits("30", 8), // BOARD_VOTE_WEIGHT: 30%
        90 * 24 * 3600, // REWARD_VOTE_PERIOD: 90 days
        parseUnits("99.99", 6), // SUBSCRIPTION_AMOUNT: $99.99
        parseUnits("20", 8), // BOARD_REWARD_RATE: 20%
    ]
}

const propertyContractConfig = {
    // for now we use the same config for both because we only use this in our unit tests
    84532: {
        timePeriods: {
            filmVotePeriod: 10 * 24 * 3600, // 10 days
            boardVotePeriod: 14 * 24 * 3600, // 14 days
            agentVotePeriod: 10 * 24 * 3600,
            disputeGracePeriod: 30 * 24 * 3600,
            propertyVotePeriod: 10 * 24 * 3600,
            rewardVotePeriod: 7 * 24 * 3600,
            lockPeriod: 30 * 24 * 3600,
            maxAllowPeriod: 90 * 24 * 3600,
            filmRewardClaimPeriod: 30 * 24 * 3600,
        },
        rates: {
            rewardRate: parseUnits("25", 5), // 0.025%
            boardRewardRate: parseUnits("25", 8), // 25%
            fundFeePercent: parseUnits("2", 8), // 2%
            boardVoteWeight: parseUnits("30", 8), // 30%
            minStakerCountPercent: parseUnits("5", 8), // 5%
            maxMintFeePercent: parseUnits("10", 8), // 10%
        },
        amounts: {
            proposalFeeAmount: parseUnits("20", 6),
            minDepositAmount: parseUnits("50", 6),
            maxDepositAmount: parseUnits("5000", 6),
            availableVABAmount: parseUnits("50000000", 18),
            subscriptionAmount: parseUnits("2.99", 6),
            minVoteCount: 1,
        },
        propertyMinMaxListConfig: {
            minPropertyList: getMinPropertyList(),
            maxPropertyList: getMaxPropertyList(),
        },
    },
    8453: {
        timePeriods: {
            filmVotePeriod: 10 * 24 * 3600, // 10 days
            boardVotePeriod: 14 * 24 * 3600, // 14 days
            agentVotePeriod: 10 * 24 * 3600,
            disputeGracePeriod: 30 * 24 * 3600,
            propertyVotePeriod: 10 * 24 * 3600,
            rewardVotePeriod: 7 * 24 * 3600,
            lockPeriod: 30 * 24 * 3600,
            maxAllowPeriod: 90 * 24 * 3600,
            filmRewardClaimPeriod: 30 * 24 * 3600,
        },
        rates: {
            rewardRate: parseUnits("25", 5), // 0.025%
            boardRewardRate: parseUnits("25", 8), // 25%
            fundFeePercent: parseUnits("2", 8), // 2%
            boardVoteWeight: parseUnits("30", 8), // 30%
            minStakerCountPercent: parseUnits("5", 8), // 5%
            maxMintFeePercent: parseUnits("10", 8), // 10%
        },
        amounts: {
            proposalFeeAmount: parseUnits("20", 6),
            minDepositAmount: parseUnits("50", 6),
            maxDepositAmount: parseUnits("5000", 6),
            availableVABAmount: parseUnits("50000000", 18),
            subscriptionAmount: parseUnits("2.99", 6),
            minVoteCount: 1,
        },
        propertyMinMaxListConfig: {
            minPropertyList: getMinPropertyList(),
            maxPropertyList: getMaxPropertyList(),
        },
    },
}

module.exports = {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
    VAB_FAUCET_AMOUNT,
    ONE_DAY_IN_SECONDS,
    USDC_FAUCET_AMOUNT,
    propertyContractConfig,
}
