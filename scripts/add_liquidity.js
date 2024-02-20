const { ethers } = require('hardhat');

require('dotenv').config();
const { CONFIG, getBigNumber, setupProvider, getConfig } = require('../scripts/utils');
const ERC20 = require('../data/ERC20.json');
const FERC20 = require('../data/FxERC20.json');
const UNISWAP2ROUTER_ABI = require('../data/Uniswap2Router.json');
const UNISWAP2FACTORY_ABI = require('../data/Uniswap2Factory.json');
const SUSHISWAP2ROUTER_ABI = require('../data/Sushiswap2Router.json');
const SUSHISWAP2FACTORY_ABI = require('../data/Sushiswap2Factory.json');

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
        const vabToken = new ethers.Contract(vabTokenAddress, JSON.stringify(ERC20), provider);
        const usdcToken = new ethers.Contract(usdcAddress, JSON.stringify(ERC20), provider);
        const usdtToken = new ethers.Contract(usdtAddress, JSON.stringify(ERC20), provider);
        const exmToken = new ethers.Contract(exmAddress, JSON.stringify(ERC20), provider);

        const uniswapRouter = new ethers.Contract(uniswapRouterAddress, UNISWAP2ROUTER_ABI, provider);
        const sushiswapRouter = new ethers.Contract(sushiswapRouterAddress, SUSHISWAP2ROUTER_ABI, provider);
        const uniswapFactory = new ethers.Contract(uniswapFactoryAddress, UNISWAP2FACTORY_ABI, provider);
        const sushiswapFactory = new ethers.Contract(sushiswapFactoryAddress, SUSHISWAP2FACTORY_ABI, provider);

        const WETH1 = await uniswapRouter.WETH();   
        const WETH2 = await sushiswapRouter.WETH();   
   
        const signers = await ethers.getSigners();
        const deployer = signers[0];

        let totalSupply;
        // Approve Uniswap on 
        let totalVABSupply = await vabToken.totalSupply();
        const targetSupply = getBigNumber(500000000);
        console.log("VAB totalSupply", totalVABSupply.toString());

        let res;

        console.log("------------------- Approve USDC:VAB, USDT:VAB, EMX:VAB Pair Tokens -------------------");
        // var token_list = [usdcToken, usdtToken, exmToken];
        var token_list = [usdcToken, usdtToken];
        for (var i = 0; i < token_list.length; i++) {
            const token = token_list[i];
            let pair = await uniswapFactory.getPair(token.address, vabTokenAddress);   
            console.log((i + 1) + "'s getPair", pair);

            totalSupply = await token.totalSupply();
            console.log((i + 1) + "'s totalSupply", totalSupply.toString()); 

            if (pair != CONFIG.addressZero) {
                await vabToken.connect(deployer).approve(
                    pair,
                    totalVABSupply,
                    {from: deployer.address}
                );

                await token.connect(deployer).approve(
                    pair,
                    totalSupply,
                    {from: deployer.address}
                );
            }
        }

        console.log("------------------- Approve MATIC:VAB on uniswap/sushiswap -------------------");
        token_list = [WETH1, WETH2];
        for (var i = 0; i < token_list.length; i++) {
            const token = token_list[i];
            console.log("token address", token);
            let pair;
            if (token == WETH1) {
                pair = await uniswapFactory.getPair(token, vabTokenAddress);      
            }
            if (token == WETH2)
                pair = await sushiswapFactory.getPair(token, vabTokenAddress);      
             
            console.log((i + 1) + "'s getPair", pair);

            if (pair != CONFIG.addressZero) {
                await vabToken.connect(deployer).approve(
                    pair,
                    totalVABSupply,
                    {from: deployer.address}
                );
            }
        }

        console.log("------------------- Approve VAB/USDC/USDT on uniswap -------------------");
        token_list = [vabToken, usdcToken, usdtToken];

        for (var i = 0; i < token_list.length; i++) {
            const token = token_list[i];
            totalSupply = await token.totalSupply();
            console.log((i + 1) + "'s totalSupply", totalSupply.toString());       

            await token.connect(deployer).approve(
                uniswapRouterAddress,
                totalSupply,
                {from: deployer.address}
            );

            await token.connect(deployer).approve(
                sushiswapRouterAddress,
                totalSupply,
                {from: deployer.address}
            );
        }

        const deadline = Date.now() + 60 * 60 * 24 * 7;
        console.log("deadline", deadline);

        
        // USDC:VAB   = 10000:1000000(1:100) => uniswap     
        
        res = await uniswapRouter.connect(deployer).addLiquidity(
            usdcAddress,
            vabTokenAddress,
            getBigNumber(10, 6),
            getBigNumber(1000),
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
            getBigNumber(10, 6),
            getBigNumber(1000),
            1,
            1, 
            deployer.address,
            deadline,             
            {from: deployer.address}            
        );
        console.log("USDT:VAB", res);

        
        // VAB:MATIC   
        console.log("WETH1 address", WETH1);
        console.log("WETH2 address", WETH2);
        let ethVal = ethers.utils.parseEther('0.00001');
        console.log("ethVal", ethVal.toString());

        res = await sushiswapRouter.connect(deployer).addLiquidityETH(
            vabTokenAddress,            
            getBigNumber(1),          
            1,
            1, 
            deployer.address,
            deadline,             
            {from: deployer.address, value: ethVal}            
        );
        console.log("MATIC:VAB", res);

        // // EMX:VAB   = 1000:1000(1:1) => uniswap    
        // console.log("EMX address", exmAddress);
        
        // res = await uniswapRouter.connect(deployer).addLiquidity(
        //     exmAddress,
        //     vabTokenAddress,
        //     getBigNumber(1000),
        //     getBigNumber(1000),
        //     1,
        //     1, 
        //     deployer.address,
        //     deadline,             
        //     {from: deployer.address}            
        // );
        // console.log("EMX:VAB", res);
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

