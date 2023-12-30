const { ethers } = require('hardhat');

require('dotenv').config();
const { CONFIG, getBigNumber, DISCOUNT } = require('../scripts/utils');
const FERC20 = require('../data/FxERC20.json');
const UNISWAP2ROUTER_ABI = require('../data/Uniswap2Router.json');

async function addLiquidity() {
    try {
        // Connect to the existing contracts
        const vabToken = new ethers.Contract(CONFIG.mumbai.vabToken, JSON.stringify(FERC20), ethers.provider);
        const uniswapRouter = new ethers.Contract(CONFIG.mumbai.uniswap.router, UNISWAP2ROUTER_ABI, ethers.provider);

        const signers = await ethers.getSigners();
        const deployer = signers[0];

        // Approve Uniswap on 
        const totalSupply = await vabToken.totalSupply();

        await vabToken.connect(deployer).approve(
            CONFIG.mumbai.uniswap.router,
            totalSupply,
            {from: deployer.address}
        );

        await vabToken.connect(deployer).approve(
            CONFIG.mumbai.sushiswap.router,
            totalSupply,
            {from: deployer.address}
        );

        // USDC:VAB   = 10000:1000000(1:100) => uniswap
        const res = await uniswapRouter.connect(deployer).addLiquidity(
            CONFIG.mumbai.usdcAdress,
            CONFIG.mumbai.vabToken,
            getBigNumber(10000, 6),
            getBigNumber(1000000),
            1,
            1, 
            deployer.address,
            Date.now() + 60 * 60 * 24 * 7,             
            {from: deployer.address}            
        );

        console.log("res", res);
    } catch (error) {
        console.error('Error in addLiquidity:', error);
    }
}

if (require.main === module) {
    addLiquidity()
        .then(() => {
            // process.exit(0)
        }
        )
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

