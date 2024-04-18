const { ethers } = require('hardhat');

require('dotenv').config();
const { CONFIG, getBigNumber, setupProvider, getConfig } = require('../scripts/utils');
const ERC20 = require('../data/ERC20.json');
const FERC20 = require('../data/FxERC20.json');
const UNISWAP2ROUTER_ABI = require('../data/Uniswap2Router.json');
const UNISWAP2FACTORY_ABI = require('../data/Uniswap2Factory.json');
const SUSHISWAP2ROUTER_ABI = require('../data/Sushiswap2Router.json');
const SUSHISWAP2FACTORY_ABI = require('../data/Sushiswap2Factory.json');


// MATIC/USDC = 1 : 500
// MATIC/USDT = 1 : 500
// MATIC/VAB = 1 : 50000
// USDC:VAB = 1 : 100
// USDT:VAB = 1 : 100
// USDC:USDT = 1 : 1

let isMatic = false
let isToken = true

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

        const provider = await setupProvider(chainId);
        const vabToken = new ethers.Contract(vabTokenAddress, JSON.stringify(ERC20), provider);
        const usdcToken = new ethers.Contract(usdcAddress, JSON.stringify(ERC20), provider);
        const usdtToken = new ethers.Contract(usdtAddress, JSON.stringify(ERC20), provider);

        const uniswapRouter = new ethers.Contract(uniswapRouterAddress, UNISWAP2ROUTER_ABI, provider);
        const sushiswapRouter = new ethers.Contract(sushiswapRouterAddress, SUSHISWAP2ROUTER_ABI, provider);
        const uniswapFactory = new ethers.Contract(uniswapFactoryAddress, UNISWAP2FACTORY_ABI, provider);
        const sushiswapFactory = new ethers.Contract(sushiswapFactoryAddress, SUSHISWAP2FACTORY_ABI, provider);

        const WETH1 = await uniswapRouter.WETH();   
        const WETH2 = await sushiswapRouter.WETH();   
   
        const signers = await ethers.getSigners();
        const deployer = signers[0];

        //===== Approve Uniswap on 
        let totalVABSupply = await vabToken.totalSupply();
        let B_VAB = await vabToken.balanceOf(deployer.address)
        console.log("VAB totalSupply", totalVABSupply.toString(), B_VAB.toString());
        let totalUSDT = await usdtToken.totalSupply();
        let B_USDT = await usdtToken.balanceOf(deployer.address)
        console.log("USDT totalSupply", totalUSDT.toString(), B_USDT.toString());
        let totalUSDC = await usdcToken.totalSupply();
        let B_USDC = await usdcToken.balanceOf(deployer.address)
        console.log("USDC totalSupply", totalUSDC.toString(), B_USDC.toString());

        const b1 = await ethers.provider.getBalance(deployer.address) //
        console.log("MATIC total", b1.toString()); // 1.466390757273000000

        let res;
        let ethVal = ethers.utils.parseEther('1');
                
        if(isToken) {
            // ======== USDC:VAB        
            let pair = await uniswapFactory.getPair(usdcAddress, vabTokenAddress);   
            console.log("USDC:VAB getPair", pair); 
            if (pair != CONFIG.addressZero) {
                await usdcToken.connect(deployer).approve(
                    uniswapRouter.address,
                    B_USDC,
                    {from: deployer.address}
                );
                console.log("===== approve USDC");
                await vabToken.connect(deployer).approve(
                    uniswapRouter.address,
                    B_VAB,
                    {from: deployer.address}
                );
                console.log("===== approve VAB");

                const deadline = Date.now() + 60 * 60 * 24 * 7;
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
                console.log("===== added USDC:VAB");
            }

            // ======== USDT:VAB        
            pair = await uniswapFactory.getPair(usdtAddress, vabTokenAddress);   
            console.log("USDT:VAB getPair", pair); 
            if (pair != CONFIG.addressZero) {
                await usdtToken.connect(deployer).approve(
                    uniswapRouter.address,
                    B_USDT,
                    {from: deployer.address}
                );
                console.log("===== approve USDT");
                await vabToken.connect(deployer).approve(
                    uniswapRouter.address,
                    B_VAB,
                    {from: deployer.address}
                );
                console.log("===== approve VAB");

                const deadline = Date.now() + 60 * 60 * 24 * 7;
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
                console.log("===== added USDT:VAB");
            }

            // ======== USDT:USDC        
            pair = await uniswapFactory.getPair(usdtAddress, usdcAddress);   
            console.log("USDT:USDC getPair", pair); 
            if (pair != CONFIG.addressZero) {
                await usdtToken.connect(deployer).approve(
                    uniswapRouter.address,
                    B_USDT,
                    {from: deployer.address}
                );
                console.log("===== approve USDT");
                await usdcToken.connect(deployer).approve(
                    uniswapRouter.address,
                    B_USDC,
                    {from: deployer.address}
                );
                console.log("===== approve USDC");

                const deadline = Date.now() + 60 * 60 * 24 * 7;
                res = await uniswapRouter.connect(deployer).addLiquidity(
                    usdtAddress,
                    usdcAddress,
                    getBigNumber(10000, 6),
                    getBigNumber(10000, 6),
                    1,
                    1, 
                    deployer.address,
                    deadline,             
                    {from: deployer.address}            
                );
                console.log("===== added USDT:USDC");
            }
        }
        
        if(isMatic) {
            //======== MATIC:USDC   
            pair = await uniswapFactory.getPair(usdcAddress, WETH1);   
            console.log("USDC:MATIC getPair", pair); 
            if (pair != CONFIG.addressZero) {
                const deadline = Date.now() + 60 * 60 * 24 * 7;
                await usdcToken.connect(deployer).approve(
                    uniswapRouter.address,
                    B_USDC,
                    {from: deployer.address}
                );
                console.log("===== approve USDC");

                res = await uniswapRouter.connect(deployer).addLiquidityETH(
                    usdcAddress,            
                    getBigNumber(500, 6),          
                    1,
                    1, 
                    deployer.address,
                    deadline,
                    {from: deployer.address, value: ethVal}            
                );
                console.log("===== added USDC");
            }


            //======== MATIC:USDT
            pair = await uniswapFactory.getPair(usdtAddress, WETH1);   
            console.log("USDT:MATIC getPair", pair); 
            if (pair != CONFIG.addressZero) {
                await usdtToken.connect(deployer).approve(
                    uniswapRouter.address,
                    B_USDT,
                    {from: deployer.address}
                );
                
                const deadline = Date.now() + 60 * 60 * 24 * 7;
                console.log("===== approve USDT: ", usdtAddress, deadline);

                res = await uniswapRouter.connect(deployer).addLiquidityETH(
                    usdtAddress,            
                    getBigNumber(500, 6),          
                    1,
                    1, 
                    deployer.address,
                    deadline,             
                    {from: deployer.address, value: ethVal}            
                );
                console.log("===== added USDT");
            }
        

            //======== MATIC:VAB  
            pair = await uniswapFactory.getPair(vabTokenAddress, WETH1);   
            console.log("VAB:MATIC getPair", pair); 
            if (pair != CONFIG.addressZero) {
                await vabToken.connect(deployer).approve(
                    uniswapRouter.address,
                    B_VAB,
                    {from: deployer.address}
                );
                console.log("===== approve VAB: ", vabTokenAddress);

                const deadline = Date.now() + 60 * 60 * 24 * 7;
                res = await uniswapRouter.connect(deployer).addLiquidityETH(
                    vabTokenAddress,            
                    getBigNumber(50000),          
                    1,
                    1, 
                    deployer.address,
                    deadline,             
                    {from: deployer.address, value: ethVal}            
                );
                console.log("===== added VAB");
            }  
        }      

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

