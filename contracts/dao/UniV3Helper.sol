// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../libraries/Helper.sol";
import "../interfaces/IUniswapV3Router.sol";
import "hardhat/console.sol";

contract UniV3Helper {
        
    IUniswapV3Router public constant router = IUniswapV3Router(0xE592427A0AEce92De3Edee1F18E0157C05861564);
    address private constant WETH9 = 0xd0A1E359811322d97991E03f863a0C30C2cF029C;

    /// @dev Provides a standard implementation for transferring assets between
    /// the msg.sender and the helper, by wrapping the action.
    modifier transferHandler(bytes memory _encodedArgs) {            
        (
            uint256 depositAmount,
            address depositAsset,
            address incomingAsset
        ) = abi.decode(_encodedArgs, (uint256, address, address));
        
        if(depositAsset != address(0)) {
            Helper.safeTransferFrom(depositAsset, msg.sender, address(this), depositAmount);
        }
        // Execute call
        _;

        // remain asset to send caller back
        __transferAssetToCaller(payable(msg.sender), depositAsset);        
        __transferAssetToCaller(payable(msg.sender), incomingAsset);
    }
    
    receive() external payable {}

    constructor() {}

    /// @notice Swap eth/token to another token
    function swapAsset(bytes calldata _swapArgs) external transferHandler(_swapArgs) returns (uint256 amount_) {
        (
            address depositAsset,
            address incomingAsset,
            uint256 depositAmount,
            uint24 poolFee
        ) = abi.decode(_swapArgs, (address, address, uint256, uint24));

        if(depositAsset == address(0)) {
            amount_ = __swapETHToToken(depositAsset, incomingAsset, depositAmount, poolFee);
        } else {            
            amount_ = __swapTokenToToken(depositAsset, incomingAsset, depositAmount, poolFee);
        }        
    }

    /// @notice Swap ERC20 Token to ERC20 Token
    function __swapTokenToToken(
        address _depositAsset,
        address _incomingAsset,
        uint256 _depositAmount,
        uint24 _poolFee
    ) private returns (uint256 amount_) {
        __approveMaxAsNeeded(_depositAsset, address(router), _depositAmount);
        
        IUniswapV3Router.ExactInputSingleParams memory params = IUniswapV3Router
            .ExactInputSingleParams({
                tokenIn: _depositAsset,
                tokenOut: _incomingAsset,
                fee: _poolFee,
                recipient: msg.sender,
                deadline: block.timestamp + 1,
                amountIn: _depositAmount,
                amountOutMinimum: 1,
                sqrtPriceLimitX96: 0
            });

        amount_ = router.exactInputSingle(params);
    }

    /// @notice Swap ETH to ERC20 Token
    function __swapETHToToken(
        address _depositAsset,
        address _incomingAsset,
        uint256 _depositAmount,
        uint24 _poolFee
    ) public payable returns (uint256 amount_) {
        require(address(this).balance >= _depositAmount, "swapETHToToken: Insufficient paid");

        IUniswapV3Router.ExactInputSingleParams memory params = IUniswapV3Router
            .ExactInputSingleParams({
                tokenIn: _depositAsset,
                tokenOut: _incomingAsset,
                fee: _poolFee,
                recipient: msg.sender,
                deadline: block.timestamp + 1,
                amountIn: address(this).balance,
                amountOutMinimum: 1,
                sqrtPriceLimitX96: 0
            });

        amount_ = router.exactInputSingle{ value: address(this).balance }(params);
        router.refundETH();
    
        // refund leftover ETH to user
        (bool success,) = msg.sender.call{ value: address(this).balance }("");
        require(success, "refund failed");
    }

    /// @notice Helper to transfer full contract balances of assets to the caller
    function __transferAssetToCaller(address payable _target, address _asset) private {
        uint256 transferAmount;
        if(_asset == address(0)) {
            transferAmount = address(this).balance;
            if (transferAmount > 0) {
                Helper.safeTransferETH(_target, transferAmount);
            }
        } else {
            transferAmount = IERC20(_asset).balanceOf(address(this));
            if (transferAmount > 0) {
                Helper.safeTransfer(_asset, _target, transferAmount);
            }
        }        
    }

    /// @dev Helper for asset to approve their max amount of an asset.
    function __approveMaxAsNeeded(address _asset, address _target, uint256 _neededAmount) private {
        if (IERC20(_asset).allowance(address(this), _target) < _neededAmount) {
            Helper.safeApprove(_asset, _target, type(uint256).max);
        }
    }
}
