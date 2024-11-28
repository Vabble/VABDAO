// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { BaseTest, console2 } from "../utils/BaseTest.sol";
import { UniHelper } from "../../../contracts/dao/UniHelper.sol";

contract UniHelperTest is BaseTest {
    error ZeroAddress();

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
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
}
