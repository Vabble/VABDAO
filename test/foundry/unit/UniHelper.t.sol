// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { BaseTest, console2 } from "../utils/BaseTest.sol";
import { UniHelper } from "../../../contracts/dao/UniHelper.sol";
import { HelperConfig, NetworkConfig } from "../../../scripts/foundry/HelperConfig.s.sol";
import "../../../contracts/interfaces/uniswap-v2/IUniswapV2Router02.sol";
import "../../../contracts/interfaces/uniswap-v2/IUniswapV2Pair.sol";
import "../../../contracts/interfaces/uniswap-v2/IUniswapV2Factory.sol";
import { IERC20 } from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract UniHelperTest is BaseTest {
    HelperConfig helperConfig;

    // Errors
    error Unauthorized();
    error AlreadyInitialized();
    error ZeroAddress();
    error InvalidContract();
    error NoLiquidityPool();
    error InsufficientBalance();

    event WhitelistUpdated(address indexed contract_, bool status);
    event SwapExecuted(address indexed fromToken, address indexed toToken, uint256 amountIn, uint256 amountOut);

    function setUp() public override {
        super.setUp();
        helperConfig = new HelperConfig();
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    function test_deployUniHelperConstructor() public {
        address UNISWAP_ROUTER = uniHelper.getUniswapRouter();
        address UNISWAP_FACTORY = uniHelper.getUniswapFactory();
        address OWNABLE = uniHelper.getOwnableAddress();
        address WETH = uniHelper.getWethAddress();

        NetworkConfig memory activeConfig = getActiveConfig();

        assertEq(activeConfig.uniswapRouter, UNISWAP_ROUTER);
        assertEq(activeConfig.uniswapFactory, UNISWAP_FACTORY);
        assertEq(address(ownablee), OWNABLE);
        assertEq(IUniswapV2Router02(activeConfig.uniswapRouter).WETH(), WETH);
    }

    function test_revertConstructorCannotSetZeroUniswapFactoryAddress() public {
        address _uniswapFactory = address(0);
        address _uniswapRouter = address(0x1);
        address _ownable = address(0x4);
        vm.expectRevert(ZeroAddress.selector);
        new UniHelper(_uniswapFactory, _uniswapRouter, _ownable);
    }

    function test_revertConstructorCannotSetZeroUniswapRouterAddress() public {
        address _uniswapFactory = address(0x1);
        address _uniswapRouter = address(0);
        address _ownable = address(0x4);
        vm.expectRevert(ZeroAddress.selector);
        new UniHelper(_uniswapFactory, _uniswapRouter, _ownable);
    }

    function test_revertConstructorCannotSetZeroOwnableAddress() public {
        address _uniswapFactory = address(0x4);
        address _uniswapRouter = address(0x1);
        address _ownable = address(0);
        vm.expectRevert(ZeroAddress.selector);
        new UniHelper(_uniswapFactory, _uniswapRouter, _ownable);
    }

    /*//////////////////////////////////////////////////////////////
                              SETWHITELIST
    //////////////////////////////////////////////////////////////*/

    function test_setWhiteListShouldRevertIfInvalidContract() public {
        address dao = address(0x1);
        address fund = address(0x2);
        address sub = address(0x3);
        address film = address(0x4);
        address factorySub = address(0x5);

        NetworkConfig memory activeConfig = getActiveConfig();

        vm.startPrank(deployer);
        UniHelper newUnihelper =
            new UniHelper(activeConfig.uniswapFactory, activeConfig.uniswapRouter, address(ownablee));
        vm.expectRevert(InvalidContract.selector);
        newUnihelper.setWhiteList(dao, fund, sub, film, factorySub);
        vm.stopPrank();
    }

    function test_setWhiteListShouldUpdateIsVabbleContractMapping() public view {
        assertEq(uniHelper.isVabbleContract(address(vabbleDAO)), true);
        assertEq(uniHelper.isVabbleContract(address(vabbleFund)), true);
        assertEq(uniHelper.isVabbleContract(address(subscription)), true);
        assertEq(uniHelper.isVabbleContract(address(factoryFilmNFT)), true);
        assertEq(uniHelper.isVabbleContract(address(factorySubNFT)), true);
    }

    function test_setWhiteListShouldRevertIfAlreadyInitialized() public {
        assertEq(uniHelper.isInitialized(), true);
        vm.startPrank(deployer);
        vm.expectRevert(AlreadyInitialized.selector);
        uniHelper.setWhiteList(
            address(vabbleDAO),
            address(vabbleFund),
            address(subscription),
            address(factoryFilmNFT),
            address(factorySubNFT)
        );
        vm.stopPrank();
    }

    function test_setWhiteListShouldEmitTheWhitelistUpdatedEvent() public {
        NetworkConfig memory activeConfig = getActiveConfig();

        vm.startPrank(deployer);
        UniHelper newUnihelper =
            new UniHelper(activeConfig.uniswapFactory, activeConfig.uniswapRouter, address(ownablee));

        // Expect five events for the five whitelist addresses
        vm.expectEmit(true, true, true, true);
        emit WhitelistUpdated(address(vabbleDAO), true);

        vm.expectEmit(true, true, true, true);
        emit WhitelistUpdated(address(vabbleFund), true);

        vm.expectEmit(true, true, true, true);
        emit WhitelistUpdated(address(subscription), true);

        vm.expectEmit(true, true, true, true);
        emit WhitelistUpdated(address(factoryFilmNFT), true);

        vm.expectEmit(true, true, true, true);
        emit WhitelistUpdated(address(factorySubNFT), true);

        newUnihelper.setWhiteList(
            address(vabbleDAO),
            address(vabbleFund),
            address(subscription),
            address(factoryFilmNFT),
            address(factorySubNFT)
        );

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                               SWAPASSET
    //////////////////////////////////////////////////////////////*/

    function test_compareExpectedAmountWithUniswapRouter() public {
        uint256 depositAmount = 1 ether;
        NetworkConfig memory config = getActiveConfig();
        IUniswapV2Router02 router = IUniswapV2Router02(config.uniswapRouter);

        // Get path for ETH -> VAB
        address[] memory path = new address[](2);
        path[0] = router.WETH();
        path[1] = address(vab);

        // Compare router output with helper output
        uint256 routerExpectedOutput = router.getAmountsOut(depositAmount, path)[1];
        uint256 helperExpectedOutput = uniHelper.expectedAmount(depositAmount, address(0), address(vab));

        assertEq(helperExpectedOutput, routerExpectedOutput, "Helper output should match router output");
    }

    function test_compareTokenToTokenExpectedAmount() public {
        uint256 depositAmount = 1000e18; // 1000 VAB
        NetworkConfig memory config = getActiveConfig();
        IUniswapV2Router02 router = IUniswapV2Router02(config.uniswapRouter);

        // Get path for VAB -> WETH -> USDC
        address[] memory path = new address[](3);
        path[0] = address(vab);
        path[1] = router.WETH();
        path[2] = address(usdc);

        uint256 routerExpectedOutput = router.getAmountsOut(depositAmount, path)[2];
        uint256 helperExpectedOutput = uniHelper.expectedAmount(depositAmount, address(vab), address(usdc));

        assertEq(helperExpectedOutput, routerExpectedOutput, "Helper token-to-token output should match router");
    }

    function test_compareETHtoTokenSwap() public {
        uint256 depositAmount = 0.1 ether;
        NetworkConfig memory config = getActiveConfig();
        IUniswapV2Router02 router = IUniswapV2Router02(config.uniswapRouter);

        // Setup paths for ETH -> VAB and VAB -> ETH
        address[] memory path = new address[](2);
        path[0] = router.WETH();
        path[1] = address(vab);
        uint256 minOutput = router.getAmountsOut(depositAmount, path)[1];

        address[] memory reversePath = new address[](2);
        reversePath[0] = address(vab);
        reversePath[1] = router.WETH();

        // Execute swaps
        vm.startPrank(address(vabbleDAO));
        vm.deal(address(vabbleDAO), depositAmount * 2); // Double for both swaps

        // Track initial balances
        uint256 initialETH = address(vabbleDAO).balance;
        uint256 initialVAB = vab.balanceOf(address(vabbleDAO));

        // *** Direct Router Swap (ETH -> VAB) ***
        uint256 routerOutput = router.swapExactETHForTokens{ value: depositAmount }(
            minOutput, path, address(vabbleDAO), block.timestamp + 1
        )[1];

        uint256 ethAfterFirstSwap = address(vabbleDAO).balance;
        uint256 vabAfterFirstSwap = vab.balanceOf(address(vabbleDAO));

        // Validate balance changes after the first swap
        uint256 ethSpentRouterSwap = initialETH - ethAfterFirstSwap;
        uint256 vabGainedRouterSwap = vabAfterFirstSwap - initialVAB;

        // // *** Reverse Swap (VAB -> ETH) ***
        // vab.approve(address(router), routerOutput);
        // uint256 minEthOutput = router.getAmountsOut(routerOutput, reversePath)[1];
        // router.swapExactTokensForETH(routerOutput, minEthOutput, reversePath, address(vabbleDAO), block.timestamp +
        // 1);

        // *** Helper Swap ***
        uint256 initialEthHelperSwap = address(vabbleDAO).balance;
        uint256 initialVabHelperSwap = vab.balanceOf(address(vabbleDAO));

        (bool sent,) = address(uniHelper).call{ value: depositAmount }("");
        require(sent, "Transfer to uniHelper failed");

        bytes memory swapArgs = abi.encode(depositAmount, address(0), address(vab));
        uint256 helperOutput = uniHelper.swapAsset(swapArgs);

        uint256 finalEthHelperSwap = address(vabbleDAO).balance;
        uint256 finalVabHelperSwap = vab.balanceOf(address(vabbleDAO));

        // Validate balance changes after the helper swap
        uint256 ethSpentHelperSwap = initialEthHelperSwap - finalEthHelperSwap;
        uint256 vabGainedHelperSwap = finalVabHelperSwap - initialVabHelperSwap;

        // Compare results with small tolerance for price impact
        // Because:
        // Pool ratio changes
        // Trading fees (0.3% per swap)
        // Price impact (larger for smaller liquidity pools)
        assertApproxEqRel(helperOutput, routerOutput, 0.01e18, "Swap outputs should be within 1%");

        // Compare ETH and VAB balances
        assertApproxEqRel(ethSpentRouterSwap, ethSpentHelperSwap, 0.01e18, "ETH spent should match");
        assertApproxEqRel(vabGainedRouterSwap, vabGainedHelperSwap, 0.01e18, "VAB gained should match");
        vm.stopPrank();
    }

    function test_compareTokenToETHSwap() public {
        uint256 depositAmount = 1000e18; // 1000 VAB
        NetworkConfig memory config = getActiveConfig();
        IUniswapV2Router02 router = IUniswapV2Router02(config.uniswapRouter);

        // Setup path and approval
        address[] memory path = new address[](2);
        path[0] = address(vab);
        path[1] = router.WETH();

        vm.startPrank(address(vabbleDAO));
        deal(address(vab), address(vabbleDAO), depositAmount * 2); // Double for both swaps
        vab.approve(address(router), depositAmount);
        vab.approve(address(uniHelper), depositAmount);

        // Track initial wallet balances
        uint256 initialETH = address(vabbleDAO).balance;
        uint256 initialVAB = vab.balanceOf(address(vabbleDAO));

        uint256 minOutput = router.getAmountsOut(depositAmount, path)[1];

        // Direct router swap
        uint256 routerOutput =
            router.swapExactTokensForETH(depositAmount, minOutput, path, address(vabbleDAO), block.timestamp + 1)[1];

        uint256 ethAfterRouterSwap = address(vabbleDAO).balance;
        uint256 vabAfterRouterSwap = vab.balanceOf(address(vabbleDAO));

        // Compute balance changes for the router swap
        uint256 ethGainedRouterSwap = ethAfterRouterSwap - initialETH;
        uint256 vabSpentRouterSwap = initialVAB - vabAfterRouterSwap;

        // *** Helper Swap ***
        uint256 initialEthBeforeHelperSwap = address(vabbleDAO).balance;
        uint256 initialVabBeforeHelperSwap = vab.balanceOf(address(vabbleDAO));

        bytes memory swapArgs = abi.encode(depositAmount, address(vab), address(0));
        uint256 helperOutput = uniHelper.swapAsset(swapArgs);

        uint256 finalEthAfterHelperSwap = address(vabbleDAO).balance;
        uint256 finalVabAfterHelperSwap = vab.balanceOf(address(vabbleDAO));

        // Compute balance changes for the helper swap
        uint256 ethGainedHelperSwap = finalEthAfterHelperSwap - initialEthBeforeHelperSwap;
        uint256 vabSpentHelperSwap = initialVabBeforeHelperSwap - finalVabAfterHelperSwap;

        // *** Compare Balance Changes ***
        assertApproxEqRel(ethGainedRouterSwap, ethGainedHelperSwap, 0.01e18, "ETH gained should match");
        assertApproxEqRel(vabSpentRouterSwap, vabSpentHelperSwap, 0.01e18, "VAB spent should match");

        // *** Compare Swap Outputs ***
        assertApproxEqRel(helperOutput, routerOutput, 0.01e18, "Swap outputs should be within 1%");

        vm.stopPrank();
    }

    function test_compareTokenToTokenSwap() public {
        uint256 depositAmount = 1000e18; // 1000 VAB
        NetworkConfig memory config = getActiveConfig();
        IUniswapV2Router02 router = IUniswapV2Router02(config.uniswapRouter);

        deal(address(vab), address(vabbleDAO), depositAmount * 2); // Double for both swaps

        // VAB -> WETH -> USDC path
        vm.startPrank(address(vabbleDAO));

        vab.approve(address(router), depositAmount);
        vab.approve(address(uniHelper), depositAmount);

        // Direct router swap
        address[] memory path = new address[](3);
        path[0] = address(vab);
        path[1] = router.WETH();
        path[2] = address(usdc);

        uint256 minOutput = router.getAmountsOut(depositAmount, path)[2];
        uint256 routerOutput =
            router.swapExactTokensForTokens(depositAmount, minOutput, path, address(vabbleDAO), block.timestamp + 1)[2];

        // USDC -> WETH -> VAB path
        address[] memory reversePath = new address[](3);
        reversePath[0] = address(usdc);
        reversePath[1] = router.WETH();
        reversePath[2] = address(vab);

        // Calculate minimum output amount
        uint256 minReverseOutput = router.getAmountsOut(routerOutput, reversePath)[2];
        usdc.approve(address(router), minReverseOutput);

        // Execute the reverse swap
        router.swapExactTokensForTokens(
            routerOutput, minReverseOutput, reversePath, address(vabbleDAO), block.timestamp + 1
        );

        // // Helper swap (automatically finds best path)
        bytes memory swapArgs = abi.encode(depositAmount, address(vab), address(usdc));
        uint256 helperOutput = uniHelper.swapAsset(swapArgs);

        assertApproxEqRel(helperOutput, routerOutput, 0.01e18, "Complex path swap outputs should be within 1%");
        vm.stopPrank();
    }

    function test_gasComparisonETHToToken() public {
        uint256 depositAmount = 1 ether;
        NetworkConfig memory config = getActiveConfig();
        IUniswapV2Router02 router = IUniswapV2Router02(config.uniswapRouter);

        address[] memory path = new address[](2);
        path[0] = router.WETH();
        path[1] = address(vab);

        vm.deal(address(vabbleDAO), depositAmount * 3);

        vm.startPrank(address(vabbleDAO));

        (bool sent,) = address(uniHelper).call{ value: depositAmount }("");
        require(sent, "Transfer to uniHelper failed");

        // Measure router gas
        uint256 minOutput = router.getAmountsOut(depositAmount, path)[1];
        uint256 gasStart = gasleft();
        router.swapExactETHForTokens{ value: depositAmount }(minOutput, path, address(vabbleDAO), block.timestamp + 1);
        uint256 routerGas = gasStart - gasleft();

        // Measure helper gas
        bytes memory swapArgs = abi.encode(depositAmount, address(0), address(vab));
        gasStart = gasleft();
        uniHelper.swapAsset(swapArgs);
        uint256 helperGas = gasStart - gasleft();

        console2.log("Router gas used:", routerGas);
        // Router gas used: 111306
        console2.log("Helper gas used:", helperGas);
        // Helper gas used: 113471
        console2.log("Gas diff:", helperGas - routerGas);
        //  Gas diff: 2285
        vm.stopPrank();
    }

    function test_transferRemainingAssetsETH() public {
        uint256 depositAmount = 1 ether;

        // Send ETH to VabDao contract
        vm.deal(address(vabbleDAO), depositAmount);

        // Track initial balance
        uint256 initialBalance = address(vabbleDAO).balance;

        // Prepare swap args for a swap that will leave remaining ETH
        bytes memory swapArgs = abi.encode(depositAmount / 2, address(0), address(vab));

        // Execute swap as vabbleDAO (whitelisted contract)
        vm.startPrank(address(vabbleDAO));

        // Send the whole deposit amount to the contract
        (bool sent,) = address(uniHelper).call{ value: depositAmount }("");
        require(sent, "Transfer to uniHelper failed");

        // Only swap half of the deposited amount
        uint256 swappedVabAmount = uniHelper.swapAsset(swapArgs);
        vm.stopPrank();

        // Verify remaining ETH was transferred back
        uint256 finalBalance = address(vabbleDAO).balance;
        uint256 finalVabBalance = vab.balanceOf(address(vabbleDAO));

        assertEq(finalVabBalance, swappedVabAmount);
        assertEq(initialBalance, depositAmount);
        assertEq(finalBalance, initialBalance / 2, "Should have received remaining ETH");
    }

    function test_transferRemainingAssetsUsdc() public {
        uint256 depositAmount = 100e6;

        // Send USDC to VabDao contract
        deal(address(usdc), address(vabbleDAO), depositAmount);

        // Track initial balance
        uint256 initialBalance = usdc.balanceOf(address(vabbleDAO));
        console2.log("initialBalance", initialBalance);

        // Prepare swap args for a swap that will leave remaining USDC
        bytes memory swapArgs = abi.encode(depositAmount / 2, address(usdc), address(vab));

        // Execute swap as vabbleDAO (whitelisted contract)
        vm.startPrank(address(vabbleDAO));
        usdc.approve(address(uniHelper), depositAmount);

        // Send the half of the deposit amount to the contract
        (bool sent) = usdc.transfer(address(uniHelper), depositAmount / 2);

        require(sent, "Transfer to uniHelper failed");

        // Only swap half of the deposited amount
        uniHelper.swapAsset(swapArgs);
        vm.stopPrank();

        // Verify remaining USDC was transferred back
        uint256 finalBalance = usdc.balanceOf(address(vabbleDAO));
        console2.log("finalBalance", finalBalance);

        assertEq(finalBalance, initialBalance / 2, "Should have received remaining ETH");
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function getActiveConfig() internal returns (NetworkConfig memory) {
        return helperConfig.getActiveNetworkConfig();
    }

    function needsLiquidity() internal returns (bool) {
        NetworkConfig memory config = getActiveConfig();
        IUniswapV2Router02 router = IUniswapV2Router02(config.uniswapRouter);
        IUniswapV2Factory factory = IUniswapV2Factory(config.uniswapFactory);

        // Get pairs
        address vabWethPair = factory.getPair(address(vab), router.WETH());
        address wethUsdcPair = factory.getPair(router.WETH(), address(usdc));

        // If pairs don't exist, we definitely need liquidity
        if (vabWethPair == address(0) || wethUsdcPair == address(0)) {
            return true;
        }

        // Get reserves for each pair
        (uint112 vabReserve, uint112 wethReserve1,) = IUniswapV2Pair(vabWethPair).getReserves();
        (uint112 wethReserve2, uint112 usdcReserve,) = IUniswapV2Pair(wethUsdcPair).getReserves();

        // Define minimum liquidity thresholds
        uint256 MIN_VAB_LIQUIDITY = 10_000e18; // 10,000 VAB
        uint256 MIN_WETH_LIQUIDITY = 50e18; // 10 WETH
        uint256 MIN_USDC_LIQUIDITY = 10_000e6; // 10,000 USDC

        // Check if any pool is below threshold
        return vabReserve < MIN_VAB_LIQUIDITY || wethReserve1 < MIN_WETH_LIQUIDITY || wethReserve2 < MIN_WETH_LIQUIDITY
            || usdcReserve < MIN_USDC_LIQUIDITY;
    }

    // function addTestLiquidity() internal {
    //     NetworkConfig memory config = getActiveConfig();
    //     IUniswapV2Router02 router = IUniswapV2Router02(config.uniswapRouter);
    //     IUniswapV2Factory factory = IUniswapV2Factory(config.uniswapFactory);

    //     // Initial base amounts
    //     uint256 vabLiquidity = 100_000e18; // 100,000 VAB
    //     uint256 wethLiquidity = 50e18; // 50 WETH
    //     uint256 usdcLiquidity = 100_000e6; // 100,000 USDC

    //     address liquidityProvider = makeAddr("liquidityProvider");
    //     vm.startPrank(liquidityProvider);

    //     // Fund the liquidity provider
    //     deal(address(vab), liquidityProvider, vabLiquidity * 2);
    //     deal(router.WETH(), liquidityProvider, wethLiquidity * 2);
    //     deal(address(usdc), liquidityProvider, usdcLiquidity * 2);

    //     // Approve router to spend tokens
    //     IERC20(address(vab)).approve(address(router), type(uint256).max);
    //     IERC20(router.WETH()).approve(address(router), type(uint256).max);
    //     IERC20(address(usdc)).approve(address(router), type(uint256).max);

    //     // Handle VAB-WETH pair
    //     address vabWethPair = factory.getPair(address(vab), router.WETH());
    //     if (vabWethPair != address(0)) {
    //         // Pool exists, get current reserves
    //         (uint112 vabReserve, uint112 wethReserve,) = IUniswapV2Pair(vabWethPair).getReserves();
    //         if (vabReserve > 0 && wethReserve > 0) {
    //             // Adjust amounts to match current ratio
    //             wethLiquidity = (vabLiquidity * uint256(wethReserve)) / uint256(vabReserve);
    //         }
    //     }

    //     // Add VAB-WETH liquidity with 10% slippage
    //     router.addLiquidity(
    //         address(vab), router.WETH(), vabLiquidity, wethLiquidity, 0, 0, liquidityProvider, block.timestamp + 1
    //     );

    //     // Handle WETH-USDC pair
    //     address wethUsdcPair = factory.getPair(router.WETH(), address(usdc));
    //     if (wethUsdcPair != address(0)) {
    //         // Pool exists, get current reserves
    //         (uint112 wethReserve, uint112 usdcReserve,) = IUniswapV2Pair(wethUsdcPair).getReserves();
    //         if (wethReserve > 0 && usdcReserve > 0) {
    //             // Adjust amounts to match current ratio
    //             usdcLiquidity = (wethLiquidity * uint256(usdcReserve)) / uint256(wethReserve);
    //         }
    //     }

    //     // Add WETH-USDC liquidity with 10% slippage
    //     router.addLiquidity(
    //         router.WETH(), address(usdc), wethLiquidity, usdcLiquidity, 0, 0, liquidityProvider, block.timestamp + 1
    //     );

    //     vm.stopPrank();

    //     // Add logging to debug liquidity addition
    //     console2.log("=== Liquidity Addition Complete ===");
    //     console2.log("VAB-WETH pair address:", vabWethPair);
    //     console2.log("WETH-USDC pair address:", wethUsdcPair);

    //     // Log final reserves
    //     if (vabWethPair != address(0)) {
    //         (uint112 vabReserve, uint112 wethReserve1,) = IUniswapV2Pair(vabWethPair).getReserves();
    //         console2.log("Final VAB reserve:", vabReserve);
    //         console2.log("Final WETH reserve (VAB pair):", wethReserve1);
    //     }

    //     if (wethUsdcPair != address(0)) {
    //         (uint112 wethReserve2, uint112 usdcReserve,) = IUniswapV2Pair(wethUsdcPair).getReserves();
    //         console2.log("Final WETH reserve (USDC pair):", wethReserve2);
    //         console2.log("Final USDC reserve:", usdcReserve);
    //     }

    //     require(!needsLiquidity(), "Failed to add sufficient liquidity");
    // }
}
