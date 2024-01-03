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
        
        // const GnosisSafe = new ethers.Contract(networkConfig.GnosisSafeL2, GNOSIS_ABI, provider);
        const Ownablee = new ethers.Contract(OwnableeAddress, OWNABLEE_ABI, provider);

        let vab_balance_of_Ownablee = await vabToken.balanceOf(OwnableeAddress);        
        console.log("vab_balance_of_Ownablee before", vab_balance_of_Ownablee.toString());

        let targetAmount = getBigNumber(10, 24);
        console.log("targetAmount", targetAmount.toString());
        let diff = targetAmount.sub(vab_balance_of_Ownablee);
        console.log("diff", diff.toString());

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

