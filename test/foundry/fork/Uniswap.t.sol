// // SPDX-License-Identifier: MIT
// pragma solidity 0.8.24;

// import { Test, console2 } from "forge-std/Test.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import { IUniswapV2Router } from "../../../contracts/interfaces/IUniswapV2Router.sol";

// contract UniswapV2SwapAmountsTest is Test {
//     address constant WETH = 0x4200000000000000000000000000000000000006;
//     address constant VAB = 0x2C9ab600D71967fF259c491aD51F517886740cbc;
//     address constant UNISWAP_ROUTER = 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24;

//     IERC20 private constant weth = IERC20(WETH);
//     IERC20 private constant vab = IERC20(VAB);

//     IUniswapV2Router private constant router = IUniswapV2Router(UNISWAP_ROUTER);

//     function test_getAmountsOut() public view {
//         address[] memory path = new address[](2);
//         path[0] = VAB;
//         path[1] = WETH;

//         uint256 amountIn = 250_000_000e18;
//         uint256[] memory amounts = router.getAmountsOut(amountIn, path);

//         console2.log("VAB", amounts[0]);
//         console2.log("WETH", amounts[1]);
//     }

//     function test_getAmountsIn() public view {
//         address[] memory path = new address[](2);
//         path[0] = VAB;
//         path[1] = WETH;

//         uint256 amountOut = 45e18;
//         uint256[] memory amounts = router.getAmountsIn(amountOut, path);

//         console2.log("VAB", amounts[0]);
//         console2.log("WETH", amounts[1]);

//         // 13_826_461_076
//         // 38_646_200_000
//     }
// }
