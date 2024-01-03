const { ethers } = require('hardhat');

require('dotenv').config();
const { CONFIG, getBigNumber, setupProvider, getConfig } = require('../scripts/utils');
const ERC20 = require('../data/ERC20.json');
const OWNABLEE_ABI = require('../data/Ownablee.json');

async function addVABToEdgePool() {
    try {
        // Connect to the existing contracts
        const network = await ethers.provider.getNetwork();
        const chainId = network.chainId;
        console.log("chainId", chainId);

        const provider = await setupProvider(chainId);
        const networkConfig = getConfig(chainId);

        const vabTokenAddress = networkConfig.vabToken;
        const OwnableeAddress = networkConfig.Ownablee;
        

        const signers = await ethers.getSigners();
        const deployer = signers[0];

        const vabToken = new ethers.Contract(vabTokenAddress, JSON.stringify(ERC20), provider);       

        console.log("getBigNumber", getBigNumber(1, 24).toString());
        
        let vab_balance_of_Ownablee = await vabToken.balanceOf(OwnableeAddress);        
        console.log("vab_balance_of_Ownablee before", vab_balance_of_Ownablee.toString());

        let targetAmount = getBigNumber(1, 25); // 10M VAB to Edge Pool
        console.log("targetAmount", targetAmount.toString());
        let diff = targetAmount.sub(vab_balance_of_Ownablee);
        
        await vabToken.connect(deployer).transfer(
            OwnableeAddress, diff, {from: deployer.address}
        );
    } catch (error) {
        console.error('Error in addVABToEdgePool:', error);
    }
}

if (require.main === module) {
    addVABToEdgePool()
        .then(() => {
            // process.exit(0)
        }
        )
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

