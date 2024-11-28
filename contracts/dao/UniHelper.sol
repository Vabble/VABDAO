// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/Helper.sol";
import "../interfaces/IUniswapV2Router.sol";
import "../interfaces/IUniswapV2Factory.sol";
import "../interfaces/IOwnablee.sol";
import "../interfaces/IUniHelper.sol";

contract UniHelper is IUniHelper, ReentrancyGuard {
    // Immutable state variables
    address private immutable UNISWAP_ROUTER;
    address private immutable UNISWAP_FACTORY;
    address private immutable OWNABLE;
    address private immutable WETH;

    // State variables
    mapping(address => bool) public isVabbleContract;
    bool public isInitialized;

    // Events
    event WhitelistUpdated(address indexed contract_, bool status);
    event SwapExecuted(address indexed fromToken, address indexed toToken, uint256 amountIn, uint256 amountOut);

    // Errors
    error Unauthorized();
    error AlreadyInitialized();
    error ZeroAddress();
    error InvalidContract();
    error NoLiquidityPool();
    error InsufficientBalance();

    modifier onlyDeployer() {
        if (msg.sender != IOwnablee(OWNABLE).deployer()) revert Unauthorized();
        _;
    }

    receive() external payable { }

    constructor(address _uniswapFactory, address _uniswapRouter, address _ownable) {
        if (_uniswapFactory == address(0) || _uniswapRouter == address(0) || _ownable == address(0)) {
            revert ZeroAddress();
        }
        UNISWAP_FACTORY = _uniswapFactory;
        UNISWAP_ROUTER = _uniswapRouter;
        OWNABLE = _ownable;
        WETH = IUniswapV2Router(_uniswapRouter).WETH();
    }

    function setWhiteList(
        address _vabbleDAO,
        address _vabbleFund,
        address _subscription,
        address _factoryFilm,
        address _factorySub
    )
        external
        onlyDeployer
    {
        if (isInitialized) revert AlreadyInitialized();

        address[] memory contracts = new address[](5);
        contracts[0] = _vabbleDAO;
        contracts[1] = _vabbleFund;
        contracts[2] = _subscription;
        contracts[3] = _factoryFilm;
        contracts[4] = _factorySub;

        for (uint256 i = 0; i < contracts.length; i++) {
            if (contracts[i] == address(0) || !Helper.isContract(contracts[i])) {
                revert InvalidContract();
            }
            isVabbleContract[contracts[i]] = true;
            emit WhitelistUpdated(contracts[i], true);
        }

        isInitialized = true;
    }

    function expectedAmount(
        uint256 _depositAmount,
        address _depositAsset,
        address _incomingAsset
    )
        external
        view
        override
        returns (uint256)
    {
        // First conversion: deposit -> WETH
        uint256 wethAmount =
            _depositAsset == address(0) ? _depositAmount : _getExpectedOutput(_depositAmount, _depositAsset, address(0));

        // Second conversion: WETH -> incoming
        return _incomingAsset == address(0) ? wethAmount : _getExpectedOutput(wethAmount, address(0), _incomingAsset);
    }

    function swapAsset(bytes calldata _swapArgs) external override nonReentrant returns (uint256) {
        if (!isVabbleContract[msg.sender]) revert Unauthorized();

        (uint256 depositAmount, address depositAsset, address incomingAsset) =
            abi.decode(_swapArgs, (uint256, address, address));

        // Handle deposit asset to WETH swap
        uint256 wethAmount = depositAmount;
        if (depositAsset != address(0)) {
            Helper.safeTransferFrom(depositAsset, msg.sender, address(this), depositAmount);
            wethAmount = _executeSwap(depositAmount, depositAsset, address(0));
        }

        // Handle WETH to incoming asset swap
        uint256 finalAmount = wethAmount;
        if (incomingAsset != address(0)) {
            finalAmount = _executeSwap(wethAmount, address(0), incomingAsset);
        }

        // Transfer any remaining assets back to caller
        _transferRemainingAssets(payable(msg.sender), depositAsset);
        _transferRemainingAssets(payable(msg.sender), incomingAsset);

        emit SwapExecuted(depositAsset, incomingAsset, depositAmount, finalAmount);
        return finalAmount;
    }

    function _getSwapPath(
        address _tokenIn,
        address _tokenOut
    )
        private
        view
        returns (address router, address[] memory path)
    {
        path = new address[](2);

        // Handle ETH cases by using WETH
        path[0] = _tokenIn == address(0) ? WETH : _tokenIn;
        path[1] = _tokenOut == address(0) ? WETH : _tokenOut;

        // Check if pool exists
        address pool = IUniswapV2Factory(UNISWAP_FACTORY).getPair(path[0], path[1]);
        router = pool != address(0) ? UNISWAP_ROUTER : address(0);
    }

    // Internal helper functions
    function _getExpectedOutput(uint256 _amount, address _tokenIn, address _tokenOut) private view returns (uint256) {
        (address router, address[] memory path) = _getSwapPath(_tokenIn, _tokenOut);
        if (router == address(0)) revert NoLiquidityPool();
        return IUniswapV2Router(router).getAmountsOut(_amount, path)[1];
    }

    function _executeSwap(uint256 _amount, address _tokenIn, address _tokenOut) private returns (uint256) {
        (address router, address[] memory path) = _getSwapPath(_tokenIn, _tokenOut);
        if (router == address(0)) revert NoLiquidityPool();

        uint256 expectedOut = IUniswapV2Router(router).getAmountsOut(_amount, path)[1];

        if (_tokenIn == address(0)) {
            if (address(this).balance < _amount) revert InsufficientBalance();
            return IUniswapV2Router(router).swapExactETHForTokens{ value: _amount }(
                expectedOut, path, address(this), block.timestamp + 1
            )[1];
        } else if (_tokenOut == address(0)) {
            _approveIfNeeded(_tokenIn, router, _amount);
            return IUniswapV2Router(router).swapExactTokensForETH(
                _amount, expectedOut, path, address(this), block.timestamp + 1
            )[1];
        }
        return 0;
    }

    function _approveIfNeeded(address _token, address _spender, uint256 _amount) private {
        if (IERC20(_token).allowance(address(this), _spender) < _amount) {
            Helper.safeApprove(_token, _spender, _amount);
        }
    }

    function _transferRemainingAssets(address payable _target, address _asset) private {
        uint256 balance = _asset == address(0) ? address(this).balance : IERC20(_asset).balanceOf(address(this));

        if (balance > 0) {
            if (_asset == address(0)) {
                Helper.safeTransferETH(_target, balance);
            } else {
                Helper.safeTransfer(_asset, _target, balance);
            }
        }
    }

    // Getter functions
    function getUniswapRouter() external view returns (address) {
        return UNISWAP_ROUTER;
    }

    function getUniswapFactory() external view returns (address) {
        return UNISWAP_FACTORY;
    }

    function getWethAddress() external view returns (address) {
        return WETH;
    }

    function getOwnableAddress() external view returns (address) {
        return OWNABLE;
    }
}
