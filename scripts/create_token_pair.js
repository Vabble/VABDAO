const { ethers } = require('hardhat');

require('dotenv').config();
const { CONFIG, getBigNumber, setupProvider, getConfig } = require('../scripts/utils');
const FERC20 = require('../data/FxERC20.json');
const UNISWAP2ROUTER_ABI = require('../data/Uniswap2Router.json');
const UNISWAP2FACTORY_ABI = require('../data/Uniswap2Factory.json');
const SUSHISWAP2ROUTER_ABI = require('../data/Sushiswap2Router.json');
const SUSHISWAP2FACTORY_ABI = require('../data/Sushiswap2Factory.json');

async function createTokenPair() {
    try {
        // Connect to the existing contracts
        const network = await ethers.provider.getNetwork();
        const chainId = network.chainId;
        console.log("chainId", chainId);

        const networkConfig = getConfig(chainId);

        const vabTokenAddress = networkConfig.vabToken;
        const uniswapRouterAddress = networkConfig.uniswap.router;
        const uniswapFactoryAddress = networkConfig.uniswap.factory;
        const sushiswapRouterAddress = networkConfig.sushiswap.router;
        const sushiswapFactoryAddress = networkConfig.sushiswap.factory;
        const usdcAddress = networkConfig.usdcAdress;
        const usdtAddress = networkConfig.usdtAdress;      

        const provider = await setupProvider(chainId);
        const uniswapFactory = new ethers.Contract(uniswapFactoryAddress, UNISWAP2FACTORY_ABI, provider);
        const uniswapRouter = new ethers.Contract(uniswapRouterAddress, UNISWAP2ROUTER_ABI, provider);
        const sushiswapFactory = new ethers.Contract(sushiswapFactoryAddress, SUSHISWAP2FACTORY_ABI, provider);
        const sushiswapRouter = new ethers.Contract(sushiswapRouterAddress, SUSHISWAP2ROUTER_ABI, provider);
        
        const signers = await ethers.getSigners();
        const deployer = signers[0];

        const WETH1 = await uniswapRouter.WETH();        
        const WETH2 = await sushiswapRouter.WETH(); 


        let res;

        // USDC:MATIC
        res = await uniswapFactory.getPair(usdcAddress, WETH1);   
        console.log("USDC:MATIC getPair", res);
        if (res == CONFIG.addressZero) {
            res = await uniswapFactory.connect(deployer).createPair(
                usdcAddress,
                WETH1,
                {from: deployer.address}
            );
        }

        // USDT:MATIC
        res = await uniswapFactory.getPair(usdtAddress, WETH1);   
        console.log("USDT:MATIC getPair", res);
        if (res == CONFIG.addressZero) {
            res = await uniswapFactory.connect(deployer).createPair(
                usdtAddress,
                WETH1,
                {from: deployer.address}
            );
        }


        
        // VAB:MATIC
        res = await uniswapFactory.getPair(vabTokenAddress, WETH1);   
        console.log("VAB:MATIC getPair", res); 
        if (res == CONFIG.addressZero) {
            res = await uniswapFactory.connect(deployer).createPair(
                vabTokenAddress,
                WETH1,
                {from: deployer.address}
            );
        }

        // VAB:USDC
        res = await uniswapFactory.getPair(vabTokenAddress, usdcAddress);   
        console.log("VAB:USDC getPair", res); 
        if (res == CONFIG.addressZero) {
            res = await uniswapFactory.connect(deployer).createPair(
                vabTokenAddress,
                usdcAddress,
                {from: deployer.address}
            );
        }

        // VAB:USDT
        res = await uniswapFactory.getPair(vabTokenAddress, usdtAddress);   
        console.log("VAB:USDT getPair", res); 
        if (res == CONFIG.addressZero) {
            res = await uniswapFactory.connect(deployer).createPair(
                vabTokenAddress,
                usdtAddress,
                {from: deployer.address}
            );
        }

        // USDT:USDC
        res = await uniswapFactory.getPair(usdtAddress, usdcAddress);   
        console.log("USDT:USDC getPair", res); 
        if (res == CONFIG.addressZero) {
            res = await uniswapFactory.connect(deployer).createPair(
                usdtAddress,
                usdcAddress,
                {from: deployer.address}
            );
        }


        // //====== Check Pool Amount
        // res = await uniswapRouter.getAmountsOut(1, [usdtAddress, WETH1]);        
        // console.log(`${res[0].toString()} MATIC swap to ${res[1].toString()} USDT in Uniswap `); 
        
        // res = await uniswapRouter.getAmountsOut(1, [usdcAddress, WETH1]);        
        // console.log(`${res[0].toString()} MATIC swap to ${res[1].toString()} USDC in Uniswap `); 
        
        // res = await uniswapRouter.getAmountsOut(1, [vabTokenAddress, WETH1]);        
        // console.log(`${res[0].toString()} MATIC swap to ${res[1].toString()} VAB in Uniswap `); 
       
    } catch (error) {
        console.error('Error in createTokenPair:', error);
    }
}

if (require.main === module) {
    createTokenPair()
        .then(() => {
            // process.exit(0)
        }
        )
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

