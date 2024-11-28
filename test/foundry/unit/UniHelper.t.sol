// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { BaseTest, console2 } from "../utils/BaseTest.sol";
import { UniHelper } from "../../../contracts/dao/UniHelper.sol";
import { HelperConfig, NetworkConfig } from "../../../scripts/foundry/HelperConfig.s.sol";

import "../../../contracts/interfaces/IUniswapV2Router.sol";

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
        assertEq(IUniswapV2Router(activeConfig.uniswapRouter).WETH(), WETH);
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

    function test_compareExpectedAmountWithUniswapRouter() public {
        uint256 depositAmount = 1 ether;
        NetworkConfig memory config = getActiveConfig();
        IUniswapV2Router router = IUniswapV2Router(config.uniswapRouter);

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
        IUniswapV2Router router = IUniswapV2Router(config.uniswapRouter);

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
        IUniswapV2Router router = IUniswapV2Router(config.uniswapRouter);

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

        // Direct router swap (ETH -> Token)
        uint256 routerOutput = router.swapExactETHForTokens{ value: depositAmount }(
            minOutput, path, address(vabbleDAO), block.timestamp + 1
        )[1];

        vab.approve(address(router), routerOutput);

        uint256 minEthOutput = router.getAmountsOut(routerOutput, reversePath)[1];
        router.swapExactTokensForETH(routerOutput, minEthOutput, reversePath, address(vabbleDAO), block.timestamp + 1);

        // Helper swap
        (bool sent,) = address(uniHelper).call{ value: depositAmount }("");
        require(sent, "Transfer to uniHelper failed");

        bytes memory swapArgs = abi.encode(depositAmount, address(0), address(vab));
        uint256 helperOutput = uniHelper.swapAsset(swapArgs);

        console2.log("routerOutput", routerOutput); //2496244366549824737105
        console2.log("helperOutput", helperOutput); // 2496244366549824737105

        // Compare results with small tolerance for price impact
        // Because:
        // Pool ratio changes
        // Trading fees (0.3% per swap)
        // Price impact (larger for smaller liquidity pools)
        assertApproxEqRel(helperOutput, routerOutput, 0.01e18, "Swap outputs should be within 1%");
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function getActiveConfig() internal returns (NetworkConfig memory) {
        return helperConfig.getActiveNetworkConfig();
    }
}
