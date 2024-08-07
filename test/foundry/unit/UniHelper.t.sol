// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { BaseTest, console2 } from "../utils/BaseTest.sol";
import { UniHelper } from "../../../contracts/dao/UniHelper.sol";

contract UniHelperTest is BaseTest {
    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    function test_revertConstructorCannotSetZeroUniswapFactoryAddress() public {
        address _uniswapFactory = address(0);
        address _uniswapRouter = address(0x1);
        address _sushiswapFactory = address(0x2);
        address _sushiswapRouter = address(0x3);
        address _ownable = address(0x4);
        vm.expectRevert("UniHelper: _uniswap2Factory must not be zero address");
        new UniHelper(_uniswapFactory, _uniswapRouter, _sushiswapFactory, _sushiswapRouter, _ownable);
    }

    function test_revertConstructorCannotSetZeroUniswapRouterAddress() public {
        address _uniswapFactory = address(0x1);
        address _uniswapRouter = address(0);
        address _sushiswapFactory = address(0x2);
        address _sushiswapRouter = address(0x3);
        address _ownable = address(0x4);
        vm.expectRevert("UniHelper: _uniswap2Router must not be zero address");
        new UniHelper(_uniswapFactory, _uniswapRouter, _sushiswapFactory, _sushiswapRouter, _ownable);
    }

    function test_revertConstructorCannotSetZeroSushiSwapFactoryAddress() public {
        address _uniswapFactory = address(0x2);
        address _uniswapRouter = address(0x1);
        address _sushiswapFactory = address(0);
        address _sushiswapRouter = address(0x3);
        address _ownable = address(0x4);
        vm.expectRevert("UniHelper: _sushiswapFactory must not be zero address");
        new UniHelper(_uniswapFactory, _uniswapRouter, _sushiswapFactory, _sushiswapRouter, _ownable);
    }

    function test_revertConstructorCannotSetZeroSushiSwapRouterAddress() public {
        address _uniswapFactory = address(0x3);
        address _uniswapRouter = address(0x1);
        address _sushiswapFactory = address(0x2);
        address _sushiswapRouter = address(0);
        address _ownable = address(0x4);
        vm.expectRevert("UniHelper: _sushiswapRouter must not be zero address");
        new UniHelper(_uniswapFactory, _uniswapRouter, _sushiswapFactory, _sushiswapRouter, _ownable);
    }

    function test_revertConstructorCannotSetZeroOwnableAddress() public {
        address _uniswapFactory = address(0x4);
        address _uniswapRouter = address(0x1);
        address _sushiswapFactory = address(0x2);
        address _sushiswapRouter = address(0x3);
        address _ownable = address(0);
        vm.expectRevert("UniHelper: _ownable must not be zero address");
        new UniHelper(_uniswapFactory, _uniswapRouter, _sushiswapFactory, _sushiswapRouter, _ownable);
    }
}
