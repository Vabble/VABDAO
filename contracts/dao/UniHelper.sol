// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../libraries/Helper.sol";
import "../interfaces/IUniswapV2Router.sol";
import "../interfaces/IUniswapV2Factory.sol";
import "hardhat/console.sol";

contract UniHelper {
        
    address private immutable UNISWAP2_ROUTER;
    address private immutable UNISWAP2_FACTORY;    
    address private immutable SUSHI_FACTORY;
    address private immutable SUSHI_ROUTER;
    address private immutable WETH;

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

    constructor(
        address _uniswap2Factory,
        address _uniswap2Router,
        address _sushiswapFactory,
        address _sushiswapRouter
    ) {
        require(_uniswap2Factory != address(0), "UniHelper: _uniswap2Factory must not be zero address");
        UNISWAP2_FACTORY = _uniswap2Factory;
        require(_uniswap2Router != address(0), "UniHelper: _uniswap2Router must not be zero address");
        UNISWAP2_ROUTER = _uniswap2Router;
        require(_sushiswapFactory != address(0), "UniHelper: _sushiswapFactory must not be zero address");
        SUSHI_FACTORY = _sushiswapFactory;    
        require(_sushiswapRouter != address(0), "UniHelper: _sushiswapRouter must not be zero address");
        SUSHI_ROUTER = _sushiswapRouter;  
        WETH = IUniswapV2Router(_uniswap2Router).WETH(); 
    }

    /// @notice Get incoming token amount from deposit token and amount
    function expectedAmount(
        uint256 _depositAmount,
        address _depositAsset, 
        address _incomingAsset
    ) external view returns (uint256 amount_) {        
        address router;
        address[] memory path = new address[](2);
        path[0] = _depositAsset;
        if(path[0] == address(0)) path[0] = WETH;
        path[1] = _incomingAsset;
        if(path[1] == address(0)) path[1] = WETH;
        
        (router, ) = __checkPool(path);        
        require(router != address(0), "expectedAmount: No Pool");

        amount_ = IUniswapV2Router(router).getAmountsOut(_depositAmount, path)[1];
    }

    /// @notice Get incoming token amount from deposit token and amount
    function expectedAmountIn(
        uint256 _depositAmount,
        address _depositAsset, 
        address _incomingAsset
    ) external view returns (uint256 amount_) {        
        address router;
        address[] memory path = new address[](2);
        path[0] = _incomingAsset;
        if(path[0] == address(0)) path[0] = WETH;
        path[1] = _depositAsset;
        if(path[1] == address(0)) path[1] = WETH;
        
        (router, ) = __checkPool(path);        
        require(router != address(0), "expectedAmount: No Pool");

        amount_ = IUniswapV2Router(router).getAmountsIn(_depositAmount, path)[0];
    }

    /// @notice check if special pool exist on uniswap
    function __checkPool(address[] memory _path) private view returns (address router_, address factory_) {        
        address uniPool = IUniswapV2Factory(UNISWAP2_FACTORY).getPair(_path[0], _path[1]);
        address sushiPool = IUniswapV2Factory(SUSHI_FACTORY).getPair(_path[0], _path[1]);

        if(uniPool == address(0) && sushiPool != address(0)) {
            return (SUSHI_ROUTER, SUSHI_FACTORY);
        } else if(uniPool != address(0) && sushiPool == address(0)) {
            return (UNISWAP2_ROUTER, UNISWAP2_FACTORY);
        } else if(uniPool != address(0) && sushiPool != address(0)) {
            return (UNISWAP2_ROUTER, UNISWAP2_FACTORY);
        } else if(uniPool == address(0) && sushiPool == address(0)) {
            return (address(0), address(0));
        }
    }

    /// @notice Swap eth/token to another token
    function swapAsset(bytes calldata _swapArgs) external transferHandler(_swapArgs) returns (uint256 amount_) {
        (
            uint256 depositAmount,
            address depositAsset,
            address incomingAsset
        ) = abi.decode(_swapArgs, (uint256, address, address));

        address router;
        address[] memory path = new address[](2);  
        path[0] = depositAsset;            
        if(path[0] == address(0)) path[0] = WETH;
        path[1] = incomingAsset;
        if(path[1] == address(0)) path[1] = WETH;

        (router, ) = __checkPool(path);        
        require(router != address(0), "swapAsset: No Pool");

        // Get payoutAmount from depositAsset on Uniswap
        uint256 expectAmount = IUniswapV2Router(router).getAmountsOut(depositAmount, path)[1];
        
        if(path[0] == WETH) {
            amount_ = __swapETHToToken(depositAmount, expectAmount, router, path)[1];
        } else {
            amount_ = __swapTokenToToken(depositAmount, expectAmount, router, path)[1];
        } 
    }

    /// @notice Swap ERC20 Token to ERC20 Token
    function __swapTokenToToken(
        uint256 _depositAmount,
        uint256 _expectedAmount,
        address _router,
        address[] memory _path
    ) private returns (uint256[] memory amounts_) {
        __approveMaxAsNeeded(_path[0], _router, _depositAmount);
        
        amounts_ = IUniswapV2Router(_router).swapExactTokensForTokens(
            _depositAmount,
            _expectedAmount,
            _path,
            address(this),
            block.timestamp + 1
        );
    }

    /// @notice Swap ETH to ERC20 Token
    function __swapETHToToken(
        uint256 _depositAmount,
        uint256 _expectedAmount,
        address _router,
        address[] memory _path
    ) public payable returns (uint256[] memory amounts_) {
        require(address(this).balance >= _depositAmount, "swapETHToToken: Insufficient paid");

        amounts_ = IUniswapV2Router(_router).swapExactETHForTokens{value: address(this).balance}(
            _expectedAmount,
            _path,
            address(this),
            block.timestamp + 1
        );
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

    /// @notice Gets the `UNISWAP2_ROUTER` variable
    function getUniswapRouter() external view returns (address router_) {
        router_ = UNISWAP2_ROUTER;
    }

    /// @notice Gets the `UNISWAP2_FACTORY` variable
    function getUniswapFactory() external view returns (address factory_) {
        factory_ = UNISWAP2_FACTORY;
    }

    /// @notice Gets the `SUSHI_FACTORY` variable
    function getSushiFactory() external view returns (address factory_) {
        return SUSHI_FACTORY;
    }

    /// @notice Gets the `SUSHI_ROUTER` variable
    function getSushiRouter() external view returns (address router_) {
        return SUSHI_ROUTER;
    }
}
