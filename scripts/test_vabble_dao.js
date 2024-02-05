const { ethers } = require('hardhat');

require('dotenv').config();
const { CONFIG, getBigNumber, setupProvider, getConfig } = require('../scripts/utils');
const ERC20 = require('../data/ERC20.json');
const FERC20 = require('../data/FxERC20.json');
const VabbleDAO_ABI = require('../data/VabbleDAO.json');

async function tsetVabbleDAO() {
    try {
        // Connect to the existing contracts
        const network = await ethers.provider.getNetwork();
        const chainId = network.chainId;
        console.log("chainId", chainId);

        const networkConfig = getConfig(chainId);

        const provider = await setupProvider(chainId);
        const VabbleDAO = new ethers.Contract("0x4590D083Ef54ECA594891A35ec7817B3521724f7", VabbleDAO_ABI, provider);
        
        const signers = await ethers.getSigners();
        const deployer = signers[0];

        const prevUser1 = await VabbleDAO.connect(deployer).getPrevMonthAndUser(1, {from: deployer.address});
        const prevUser2 = await VabbleDAO.getPrevMonthAndUser(1);

        console.log("With Wallet", prevUser1);
        console.log("Without Wallet", prevUser2);


    } catch (error) {
        console.error('Error in addLiquidity:', error);
    }
}

if (require.main === module) {
    tsetVabbleDAO()
        .then(() => {
            // process.exit(0)
        }
        )
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

