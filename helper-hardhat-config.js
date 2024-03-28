const { parseEther, parseUnits } = require("ethers/lib/utils")

const networkConfig = {
    default: {
        name: "hardhat",
    },
    31337: {
        name: "localhost",
    },
}

const developmentChains = ["hardhat", "localhost"]
const VERIFICATION_BLOCK_CONFIRMATIONS = 6
const VAB_FAUCET_AMOUNT = parseEther("50000")
const USDC_FAUCET_AMOUNT = 1000000000 // 1000 USDC
const ONE_DAY_IN_SECONDS = 86400

module.exports = {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
    VAB_FAUCET_AMOUNT,
    ONE_DAY_IN_SECONDS,
    USDC_FAUCET_AMOUNT,
}
