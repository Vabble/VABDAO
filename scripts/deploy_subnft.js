const { ethers } = require('hardhat');
const { setupProvider, getNetworkConfig } = require('./utils');
const {runAuditFunction } = require('./gnosis-safe');
const GNOSIS_ABI = require('../data/GnosisSafe.json');
const SUBNFT_ABI = require('../data/FactorySubNFT.json');

require('dotenv').config();

/**
 * Submits DeploySubNFT incrementes the month ID using Gnosis Safe.
 */
async function DeploySubNFT() {
	try {
		const provider = await setupProvider();
		const networkConfig = await getNetworkConfig();

		// Connect to the existing contracts
		const GnosisSafe = new ethers.Contract(networkConfig.GnosisSafeL2, GNOSIS_ABI, provider);
		const FactorySubNFT = new ethers.Contract(networkConfig.FactorySubNFT, SUBNFT_ABI, provider);

		const signer1 = new ethers.Wallet(process.env.PK1, provider);
		const signer2 = new ethers.Wallet(process.env.PK2, provider);

        // Prepare setBaseURI call data
        const bUri = 'https://ipfs.io/ipfs/'
        const cUri = 'https://commanda.xyz/api/collection-metadata'
		result = await runAuditFunction(FactorySubNFT, GnosisSafe, 'setBaseURI', [bUri, cUri], signer1, signer2);

	} catch (error) {
		console.error('Error in DeploySubNFT:', error);
	}
}

if (require.main === module) {
	DeploySubNFT()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error(error);
			process.exit(1);
		});
}
