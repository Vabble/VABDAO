const { ethers } = require('hardhat');

require('dotenv').config();
const { CONFIG, getBigNumber, setupProvider, getConfig } = require('../scripts/utils');
const FERC20 = require('../data/FxERC20.json');
const UNISWAP2ROUTER_ABI = require('../data/Uniswap2Router.json');
const UNISWAP2FACTORY_ABI = require('../data/Uniswap2Factory.json');

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
        const exmAddress = networkConfig.exmAddress;
      

        const provider = await setupProvider(chainId);
        const uniswapFactory = new ethers.Contract(uniswapFactoryAddress, UNISWAP2FACTORY_ABI, provider);
        const uniswapRouter = new ethers.Contract(uniswapRouterAddress, UNISWAP2ROUTER_ABI, provider);
        const sushiswapRouter = new ethers.Contract(sushiswapRouterAddress, UNISWAP2ROUTER_ABI, provider);
        
        const signers = await ethers.getSigners();
        const deployer = signers[0];

        let res;
        // USDC:VAB
        res = await uniswapFactory.getPair(usdcAddress, vabTokenAddress);   
        console.log("USDC:VAB getPair", res);
        if (res == CONFIG.addressZero) {
            res = await uniswapFactory.connect(deployer).createPair(
                usdcAddress,
                vabTokenAddress,
                {from: deployer.address}
            );
        }

        
        // USDT:VAB 
        console.log("USDT address", usdtAddress);
        res = await uniswapFactory.getPair(usdtAddress, vabTokenAddress);   
        console.log("USDT:VAB getPair", res); 
        if (res == CONFIG.addressZero) {
            res = await uniswapFactory.connect(deployer).createPair(
                usdtAddress,
                vabTokenAddress,
                {from: deployer.address}
            );
        }

        // EXM:VAB 
        console.log("EXM address", exmAddress);
        res = await uniswapFactory.getPair(exmAddress, vabTokenAddress);   
        console.log("EXM:VAB getPair", res); 
        if (res == CONFIG.addressZero) {            
            res = await uniswapFactory.connect(deployer).createPair(
                exmAddress,
                vabTokenAddress,
                {from: deployer.address}
            );
        }

        // Zero:VAB 
        // const WETH2 = await sushiswapRouter.WETH();        
        // res = await sushiswapRouter.getPair(vabTokenAddress, WETH2);           
        // console.log("Zero:VAB getPair", res, WETH2); 
        
        // if (res == CONFIG.addressZero) {            
        //     res = await uniswapFactory.connect(deployer).createPair(
        //         vabTokenAddress,
        //         WETH2,
        //         {from: deployer.address}
        //     );
        // }

    } catch (error) {
        console.error('Error in addLiquidity:', error);
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

