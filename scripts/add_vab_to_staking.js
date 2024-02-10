const { ethers } = require('hardhat');

require('dotenv').config();
const { CONFIG, getBigNumber, setupProvider, getConfig } = require('../scripts/utils');
const ERC20 = require('../data/ERC20.json');
const STAKINGPOOL_ABI = require('../data/StakingPool.json');

async function addVABToRewardPool() {
    try {
        // Connect to the existing contracts
        const network = await ethers.provider.getNetwork();
        const chainId = network.chainId;
        console.log("chainId", chainId);

        const provider = await setupProvider(chainId);
        const networkConfig = getConfig(chainId);

        const vabTokenAddress = networkConfig.vabToken;
        const StakingPoolAddress = networkConfig.StakingPool;

        const vabTokenContract = new ethers.Contract(vabTokenAddress, JSON.stringify(ERC20), provider);
        const StakingPoolContract = new ethers.Contract(StakingPoolAddress, STAKINGPOOL_ABI, provider);
        
        const signers = await ethers.getSigners();
        const deployer = signers[0];
        
        // add 50M VAB to Edge Pool
        let totalRewardAmount = await StakingPoolContract.connect(deployer).totalRewardAmount();        
        console.log("vab_balance_of_totalRewardAmount before", totalRewardAmount.toString());

        let targetAmount = getBigNumber(5, 25); // 50M VAB to Staking Pool
        if (chainId == 137) // polygon 2 VAB
            targetAmount = getBigNumber(2, 0);

        let diff = targetAmount.sub(totalRewardAmount);

        if (diff > 0) {
            await vabTokenContract.connect(deployer).approve(StakingPoolContract.address, targetAmount);
            await StakingPoolContract.connect(deployer).addRewardToPool(
                diff, {from: deployer.address}
            );  
        } 
    } catch (error) {
        console.error('Error in addVABToRewardPool:', error);
    }
}

if (require.main === module) {
    addVABToRewardPool()
        .then(() => {
            // process.exit(0)
        }
        )
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

