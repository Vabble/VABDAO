const { ethers } = require('hardhat');

require('dotenv').config();
const { CONFIG, getBigNumber, setupProvider, getConfig } = require('../scripts/utils');
const FERC20 = require('../data/FxERC20.json');
const UNISWAP2ROUTER_ABI = require('../data/Uniswap2Router.json');
const UNISWAP2FACTORY_ABI = require('../data/Uniswap2Factory.json');

async function addLiquidity() {
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
        const vabToken = new ethers.Contract(vabTokenAddress, JSON.stringify(FERC20), provider);
        const exmToken = new ethers.Contract(exmAddress, JSON.stringify(FERC20), provider);
        const uniswapFactory = new ethers.Contract(uniswapFactoryAddress, UNISWAP2FACTORY_ABI, provider);
        const uniswapRouter = new ethers.Contract(uniswapRouterAddress, UNISWAP2ROUTER_ABI, provider);

        const signers = await ethers.getSigners();
        const deployer = signers[0];

        // Approve Uniswap on 
        const totalSupply = await vabToken.totalSupply();
        console.log("totalSupply", totalSupply.toString());

        // await vabToken.connect(deployer).approve(
        //     uniswapRouterAddress,
        //     totalSupply,
        //     {from: deployer.address}
        // );

        // await vabToken.connect(deployer).approve(
        //     sushiswapRouterAddress,
        //     totalSupply,
        //     {from: deployer.address}
        // );

        // await exmToken.connect(deployer).approve(
        //     uniswapRouterAddress,
        //     totalSupply,
        //     {from: deployer.address}
        // );


        const deadline = Date.now() + 60 * 60 * 24 * 7;
        console.log("deadline", deadline);

        // let res;
        // // USDC:VAB   = 10000:1000000(1:100) => uniswap     
        // res = await uniswapFactory.getPair(usdcAddress, vabTokenAddress);   
        // console.log("USDC:VAB getPair", res);
        // if (res == CONFIG.addressZero) {
        //     res = await uniswapFactory.connect(deployer).createPair(
        //         usdcAddress,
        //         vabTokenAddress,
        //         {from: deployer.address}
        //     );
        // }

        
        // res = await uniswapRouter.connect(deployer).addLiquidity(
        //     usdcAddress,
        //     vabTokenAddress,
        //     getBigNumber(10000, 6),
        //     getBigNumber(1000000),
        //     1,
        //     1, 
        //     deployer.address,
        //     deadline,             
        //     {from: deployer.address}            
        // );
        // console.log("USDC:VAB", res);

        // // USDT:VAB   = 10000:1000000(1:100) => uniswap    
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

        // res = await uniswapRouter.connect(deployer).addLiquidity(
        //     usdtAddress,
        //     vabTokenAddress,
        //     getBigNumber(10000, 6),
        //     getBigNumber(1000000),
        //     1,
        //     1, 
        //     deployer.address,
        //     deadline,             
        //     {from: deployer.address}            
        // );
        // console.log("USDT:VAB", res);

        // // EXM:VAB   = 1000000:1000000(1:1) => uniswap
        console.log("EXM address", exmAddress);
        // res = await uniswapFactory.getPair(exmAddress, vabTokenAddress);   
        // console.log("EXM:VAB getPair", res); 
        // if (res == CONFIG.addressZero) {            
        //     res = await uniswapFactory.connect(deployer).createPair(
        //         exmAddress,
        //         vabTokenAddress,
        //         {from: deployer.address}
        //     );
        // }
        res = await uniswapRouter.connect(deployer).addLiquidity(
            exmAddress,
            vabTokenAddress,
            getBigNumber(1000000),
            getBigNumber(1000000),
            1,
            1, 
            deployer.address,
            deadline,             
            {from: deployer.address}            
        );
        console.log("EXM:VAB", res);

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

