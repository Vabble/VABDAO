// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../interfaces/IUniswapV2Router.sol";
import "../interfaces/IUniswapV2Factory.sol";
import "hardhat/console.sol";

contract UniHelper {
        
    address private immutable UNISWAP2_ROUTER;
    address private immutable UNISWAP2_FACTORY;
    address public immutable USDC_TOKEN;      // USDC token 

    constructor(
        address _uniswap2Factory,
        address _uniswap2Router,
        address _usdcToken
    ) {
        require(_uniswap2Factory != address(0), "UniHelper: _uniswap2Factory zero address");
        UNISWAP2_FACTORY = _uniswap2Factory;
        require(_uniswap2Router != address(0), "UniHelper: _uniswap2Router zero address");
        UNISWAP2_ROUTER = _uniswap2Router;        
        require(_usdcToken != address(0), "UniHelper: _usdcToken zeor address");
        USDC_TOKEN = _usdcToken;
    }

    
    function expectedAmount(uint256 _depositAmount, address _incomingAsset) external view returns (uint256 amount_) {
        uint256 depositAmount = _depositAmount * (10**IERC20Metadata(USDC_TOKEN).decimals()); // 100 usdc
        
        address uni_router;
        address[] memory path = new address[](2);
        path[0] = USDC_TOKEN;
        path[1] = _incomingAsset;

        (uni_router, ) = _checkPool(path);
        
        require(uni_router != address(0), "Swap: No Pool");

        amount_ = IUniswapV2Router(uni_router).getAmountsOut(depositAmount, path)[1];
    }

    /// @notice check if special pool exist on uniswap
    function _checkPool(address[] memory _path) private view returns (address router_, address factory_) {        
        address uniPool = IUniswapV2Factory(UNISWAP2_FACTORY).getPair(_path[0], _path[1]);   
        
        if(uniPool != address(0)) {
            return (UNISWAP2_ROUTER, UNISWAP2_FACTORY);
        } else {
            return (address(0), address(0));
        }
    }

    /// @notice Gets the `UNISWAP2_ROUTER` variable
    function getUniswapRouter() external view returns (address router_) {
        return UNISWAP2_ROUTER;
    }

    /// @notice Gets the `UNISWAP2_FACTORY` variable
    function getUniswapFactory() external view returns (address factory_) {
        return UNISWAP2_FACTORY;
    }
}
