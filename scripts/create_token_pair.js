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
        const exmAddress = networkConfig.exmAddress;
      

        const provider = await setupProvider(chainId);
        const uniswapFactory = new ethers.Contract(uniswapFactoryAddress, UNISWAP2FACTORY_ABI, provider);
        const uniswapRouter = new ethers.Contract(uniswapRouterAddress, UNISWAP2ROUTER_ABI, provider);
        const sushiswapFactory = new ethers.Contract(sushiswapFactoryAddress, SUSHISWAP2FACTORY_ABI, provider);
        const sushiswapRouter = new ethers.Contract(sushiswapRouterAddress, SUSHISWAP2ROUTER_ABI, provider);
        
        const signers = await ethers.getSigners();
        const deployer = signers[0];

        const WETH1 = await uniswapRouter.WETH();        
        const WETH2 = await sushiswapRouter.WETH();        

        console.log("Uniswap WETH", WETH1);
        console.log("Sushiswap WETH", WETH2);


        let res;
        // USDC:VAB
        // res = await uniswapFactory.getPair(usdcAddress, vabTokenAddress);   
        // console.log("USDC:VAB getPair", res);
        // if (res == CONFIG.addressZero) {
        //     res = await uniswapFactory.connect(deployer).createPair(
        //         usdcAddress,
        //         vabTokenAddress,
        //         {from: deployer.address}
        //     );
        // }



        
        // // USDT:VAB 
        // console.log("USDT address", usdtAddress);
        // res = await uniswapFactory.getPair(usdtAddress, vabTokenAddress);   
        // console.log("USDT:VAB getPair", res); 
        // if (res == CONFIG.addressZero) {
        //     res = await uniswapFactory.connect(deployer).createPair(
        //         usdtAddress,
        //         vabTokenAddress,
        //         {from: deployer.address}
        //     );
        // }

        // // EXM:VAB 
        // console.log("EXM address", exmAddress);
        // res = await uniswapFactory.getPair(exmAddress, vabTokenAddress);   
        // console.log("EXM:VAB getPair", res); 
        // if (res == CONFIG.addressZero) {            
        //     res = await uniswapFactory.connect(deployer).createPair(
        //         exmAddress,
        //         vabTokenAddress,
        //         {from: deployer.address}
        //     );
        // }

        // // Zero:VAB 
        // res = await sushiswapFactory.getPair(WETH2, vabTokenAddress);
        // console.log("MATIC:VAB getPair", res, WETH2); 
        
        // if (res == CONFIG.addressZero) {            
        //     res = await sushiswapFactory.connect(deployer).createPair(
        //         WETH2,
        //         vabTokenAddress,
        //         {from: deployer.address}
        //     );
        // }

        // res = await sushiswapFactory.getPair(vabTokenAddress, WETH2);
        // console.log("VAB:MATIC getPair", res, WETH2); 
        
        // if (res == CONFIG.addressZero) {            
        //     res = await sushiswapFactory.connect(deployer).createPair(
        //         vabTokenAddress,
        //         WETH2,
        //         {from: deployer.address}
        //     );
        // }

        console.log("USDC address", usdcAddress);

        // USDC:MATIC in uniswawp
        res = await uniswapFactory.getPair(usdcAddress, WETH1);   
        console.log("USDC:MATIC getPair in Uniswap", res); 
       
        // USDC:MATIC in sushiswap
        res = await sushiswapFactory.getPair(usdcAddress, WETH2);   
        console.log("USDC:MATIC getPair in Sushiswap", res); 

        res = await sushiswapRouter.getAmountsOut(1, [usdcAddress, WETH2]);        
        console.log("USDC:MATIC getAmountsOut in Sushiswap", res[0].toString(), res[1].toString());

        console.log("USDT address", usdtAddress);

        // USDT:MATIC in uniswawp
        res = await uniswapFactory.getPair(usdtAddress, WETH1);   
        console.log("USDT:MATIC getPair in Uniswap", res); 
       
        // USDT:MATIC in sushiswap
        res = await sushiswapFactory.getPair(usdtAddress, WETH2);   
        console.log("USDT:MATIC getPair in Sushiswap", res); 

        if (res == CONFIG.addressZero) {            
            res = await sushiswapFactory.connect(deployer).createPair(
                usdtAddress,
                WETH2,
                {from: deployer.address}
            );
        }

        res = await sushiswapRouter.getAmountsOut(1, [usdtAddress, WETH2]);        
        console.log("USDT:MATIC getAmountsOut in Sushiswap", res[0].toString(), res[1].toString()); 
       
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

