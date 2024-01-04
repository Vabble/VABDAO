const { ethers } = require('hardhat');

require('dotenv').config();
const { CONFIG, getBigNumber, setupProvider, getConfig } = require('../scripts/utils');
const ERC20 = require('../data/ERC20.json');
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
        const exmToken = new ethers.Contract(exmAddress, JSON.stringify(ERC20), provider);
        const uniswapRouter = new ethers.Contract(uniswapRouterAddress, UNISWAP2ROUTER_ABI, provider);
        const sushiswapRouter = new ethers.Contract(sushiswapRouterAddress, UNISWAP2ROUTER_ABI, provider);

        const WETH1 = await uniswapRouter.WETH();   
        const WETH2 = await sushiswapRouter.WETH();   
        const ether1Token = new ethers.Contract(WETH1, JSON.stringify(ERC20), provider);

        const signers = await ethers.getSigners();
        const deployer = signers[0];

        let totalSupply;
        // Approve Uniswap on 
        totalSupply = await vabToken.totalSupply();
        const targetSupply = getBigNumber(500000000);
        console.log("VAB totalSupply", totalSupply.toString());

        if (totalSupply < targetSupply) {
            await vabToken.connect(deployer).faucet(targetSupply.sub(totalSupply), {from: deployer.address});
            console.log("Please run again after 1 min");
            return;
        }
        totalSupply = await vabToken.totalSupply();
        console.log("VAB totalSupply", totalSupply.toString());

        await vabToken.connect(deployer).approve(
            uniswapRouterAddress,
            totalSupply,
            {from: deployer.address}
        );

        await vabToken.connect(deployer).approve(
            sushiswapRouterAddress,
            totalSupply,
            {from: deployer.address}
        );

        await exmToken.connect(deployer).approve(
            uniswapRouterAddress,
            totalSupply,
            {from: deployer.address}
        );

        const deadline = Date.now() + 60 * 60 * 24 * 7;
        console.log("deadline", deadline);

        let res;
        // USDC:VAB   = 10000:1000000(1:100) => uniswap     
        
        res = await uniswapRouter.connect(deployer).addLiquidity(
            usdcAddress,
            vabTokenAddress,
            getBigNumber(10000, 6),
            getBigNumber(1000000),
            1,
            1, 
            deployer.address,
            deadline,             
            {from: deployer.address}            
        );
        console.log("USDC:VAB", res);

        // USDT:VAB   = 10000:1000000(1:100) => uniswap    
        console.log("USDT address", usdtAddress);
        
        res = await uniswapRouter.connect(deployer).addLiquidity(
            usdtAddress,
            vabTokenAddress,
            getBigNumber(10000, 6),
            getBigNumber(1000000),
            1,
            1, 
            deployer.address,
            deadline,             
            {from: deployer.address}            
        );
        console.log("USDT:VAB", res);

        // EXM:VAB   = 1000000:1000000(1:1) => uniswap
        console.log("EXM address", exmAddress);
        res = await uniswapRouter.connect(deployer).addLiquidity(
            exmAddress,
            vabTokenAddress,
            getBigNumber(10000),
            getBigNumber(10000),
            1,
            1, 
            deployer.address,
            deadline,             
            {from: deployer.address}            
        );
        console.log("EXM:VAB", res);

        // VAB:MATIC   
        console.log("WETH1 address", WETH1);
        console.log("WETH2 address", WETH2);
        let ethVal = ethers.utils.parseEther('0.00001');
        console.log("ethVal", ethVal.toString());

        res = await sushiswapRouter.connect(deployer).addLiquidityETH(
            vabTokenAddress,            
            getBigNumber(250000),          
            getBigNumber(1),
            getBigNumber(1, 13), 
            deployer.address,
            deadline,             
            {from: deployer.address, value: ethVal}            
        );
        console.log("VAB:MATIC", res);

        // MATIC:VAB  = 5:250000(1:50000)    => sushiswap
        res = await sushiswapRouter.connect(deployer).addLiquidity(
            WETH2,
            vabTokenAddress,                        
            getBigNumber(1, 13),
            getBigNumber(250000),
            getBigNumber(1, 13),
            getBigNumber(1),
            deployer.address,
            deadline,             
            {from: deployer.address}                 
        );
        console.log("MATIC:VAB", res);

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

