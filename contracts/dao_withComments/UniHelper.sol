// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "../interfaces/IUniswapV2Router.sol";
import "../interfaces/IUniswapV2Factory.sol";
import "../interfaces/IOwnablee.sol";
import "../interfaces/IUniHelper.sol";
import "../libraries/Helper.sol";

/**
 * @title UniHelper Contract
 * @notice A contract facilitating token swaps between ERC20 tokens and ETH using Uniswap and Sushiswap.
 * This contract provides functionalities to:
 * - Set whitelisted Vabble contracts for interaction.
 * - Swap ERC20 tokens for ETH and vice versa using Uniswap or Sushiswap.
 * - Estimate amounts of incoming assets for a given deposit amount and assets.
 * - Retrieve addresses of Uniswap V2 and Sushiswap routers and factories.
 * - Check for the existence of liquidity pools on Uniswap or Sushiswap for given asset pairs.
 *
 * The contract is initialized with the addresses of Uniswap and Sushiswap routers and factories,
 * and the Ownable contract address. Only the deployer of the Ownable contract can set whitelisted
 * Vabble contracts until the contract is initialized. Once initialized, Vabble contracts can call
 * specific functions to interact with this contract for token swaps and other operations.
 *
 * This contract uses helper functions from external libraries and interfaces defined in other contracts,
 * such as `IUniswapV2Router`, `IUniswapV2Factory`, `IOwnablee`, `IUniHelper`, and `Helper`.
 *
 * @dev The contract is designed to be non-upgradable with fixed addresses for routers and factories,
 * ensuring predictable behavior and security of asset swaps.
 */
contract UniHelper is IUniHelper, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @dev The address of the UniswapV2 Router contract.
    address internal immutable UNISWAP2_ROUTER;

    /// @dev The address of the UniswapV2 Factory contract.
    address internal immutable UNISWAP2_FACTORY;

    /// @dev The address of the Sushiswap Router contract.
    address internal immutable SUSHI_ROUTER;

    /// @dev The address of the Sushiswap Factory contract.
    address internal immutable SUSHI_FACTORY;

    /// @dev The address of the Ownable contract.
    address internal immutable OWNABLE;

    /// @dev mapping to keep track of all Vabble contract addresses
    /// allowed to interact with this contract
    mapping(address => bool) public isVabbleContract;

    /// @dev Boolean flag to indicate if the contract has been initialized
    bool public isInitialized;

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /// @dev Restricts access to the deployer of the Ownable contract.
    modifier onlyDeployer() {
        require(msg.sender == IOwnablee(OWNABLE).deployer(), "caller is not the deployer");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Constructor to initialize contract with necessary addresses.
     * @param _uniswap2Factory The address of the Uniswap V2 factory.
     * @param _uniswap2Router The address of the Uniswap V2 router.
     * @param _sushiswapFactory The address of the Sushiswap factory.
     * @param _sushiswapRouter The address of the Sushiswap router.
     * @param _ownable The address of the Ownable contract.
     */
    constructor(
        address _uniswap2Factory,
        address _uniswap2Router,
        address _sushiswapFactory,
        address _sushiswapRouter,
        address _ownable
    ) {
        require(_uniswap2Factory != address(0), "UniHelper: _uniswap2Factory must not be zero address");
        UNISWAP2_FACTORY = _uniswap2Factory;
        require(_uniswap2Router != address(0), "UniHelper: _uniswap2Router must not be zero address");
        UNISWAP2_ROUTER = _uniswap2Router;
        require(_sushiswapFactory != address(0), "UniHelper: _sushiswapFactory must not be zero address");
        SUSHI_FACTORY = _sushiswapFactory;
        require(_sushiswapRouter != address(0), "UniHelper: _sushiswapRouter must not be zero address");
        SUSHI_ROUTER = _sushiswapRouter;
        require(_ownable != address(0), "UniHelper: _ownable must not be zero address");
        OWNABLE = _ownable;
    }

    receive() external payable { }

    /*//////////////////////////////////////////////////////////////
                                EXTERNAL
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Sets the addresses of Vabble contracts for whitelist validation.
     * @dev Only callable by the deployer until contract is initialized.
     * @param _vabbleDAO The address of the VabbleDAO contract.
     * @param _vabbleFund The address of the VabbleFund contract.
     * @param _subscription The address of the Subscription contract.
     * @param _factoryFilm The address of the FactoryFilmNFT contract.
     * @param _factorySub The address of the FactorySubNFT contract.
     */
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
        require(!isInitialized, "setWhiteList: already initialized");

        require(_vabbleDAO != address(0) && Helper.isContract(_vabbleDAO), "setWhiteList: zero vabbleDAO address");
        isVabbleContract[_vabbleDAO] = true;
        require(_vabbleFund != address(0) && Helper.isContract(_vabbleFund), "setWhiteList: zero vabbleFund address");
        isVabbleContract[_vabbleFund] = true;
        require(
            _subscription != address(0) && Helper.isContract(_subscription), "setWhiteList: zero subscription address"
        );
        isVabbleContract[_subscription] = true;
        require(
            _factoryFilm != address(0) && Helper.isContract(_factoryFilm), "setWhiteList: zero factory film address"
        );
        isVabbleContract[_factoryFilm] = true;
        require(_factorySub != address(0) && Helper.isContract(_factorySub), "setWhiteList: zero factory sub address");
        isVabbleContract[_factorySub] = true;

        isInitialized = true;
    }

    /**
     * @notice Swaps an ERC20 token for another ERC20 token using Uniswap or Sushiswap.
     * @param _swapArgs Packed arguments including deposit amount, deposit asset address, and incoming asset address.
     * @return amount_ The amount of tokens received after the swap.
     */
    function swapAsset(bytes calldata _swapArgs) external override nonReentrant returns (uint256 amount_) {
        (uint256 depositAmount, address depositAsset, address incomingAsset) =
            abi.decode(_swapArgs, (uint256, address, address));

        require(isVabbleContract[msg.sender], "caller is not one of vabble contracts");

        // Swap depositAsset -> WETH
        uint256 weth_amount = depositAmount;
        if (depositAsset != address(0)) {
            Helper.safeTransferFrom(depositAsset, msg.sender, address(this), depositAmount);

            (address router, address[] memory path) = __checkPool(depositAsset, address(0));
            require(router != address(0), "sA: no pool dA/weth");

            // maximum output token amount we can get
            uint256 expectAmount = IUniswapV2Router(router).getAmountsOut(depositAmount, path)[1];

            weth_amount = __swapTokenToETH(depositAmount, expectAmount, router, path)[1];
        }

        // Swap WETH -> incomingAsset
        amount_ = weth_amount;
        if (incomingAsset != address(0)) {
            (address router, address[] memory path) = __checkPool(address(0), incomingAsset);
            require(router != address(0), "sA: no pool weth/iA");

            uint256 expectAmount = IUniswapV2Router(router).getAmountsOut(weth_amount, path)[1];

            amount_ = __swapETHToToken(weth_amount, expectAmount, router, path)[1];
        }

        // remain asset to send caller back
        __transferAssetToCaller(payable(msg.sender), depositAsset);
        __transferAssetToCaller(payable(msg.sender), incomingAsset);
    }

    /**
     * @notice Estimates the amount of incoming asset received for a given deposit amount and assets.
     * @param _depositAmount The amount of deposit asset.
     * @param _depositAsset The address of the deposit asset.
     * @param _incomingAsset The address of the incoming asset.
     * @return amount_ The estimated amount of incoming asset.
     */
    function expectedAmount(
        uint256 _depositAmount, //e: 2.99
        address _depositAsset, //e: USDC
        address _incomingAsset //e: USDT
    )
        external
        view
        override
        returns (uint256 amount_)
    {
        // _depositAsset -> WETH
        uint256 weth_amount;
        if (_depositAsset == address(0)) {
            weth_amount = _depositAmount;
        } else {
            // example:
            // User wants to activate a subscription paying with USDT
            // We want to check how much WETH we need for the given _depositAmount + asset
            // we check if there is a pool first
            (address router, address[] memory path) = __checkPool(_depositAsset, address(0));
            require(router != address(0), "eA: no pool dA/weth");
            // now we can calculate the amount of WETH we'll need
            // deposit amount (subscription amount) = 2990000
            // path: [USDC, WETH]
            // WETH amount = 862454909597929 = 0.000862454909597929
            weth_amount = IUniswapV2Router(router).getAmountsOut(_depositAmount, path)[1];
        }

        // WETH -> _incomingAsset
        if (_incomingAsset == address(0)) {
            amount_ = weth_amount;
        } else {
            // Now we want to check how much USDT we need for the calculated WETH
            // we check if there is a pool again
            (address router, address[] memory path) = __checkPool(address(0), _incomingAsset);
            require(router != address(0), "eA: no pool weth/iA");
            // path: [WETH, USDT]
            // WETH amount = 862454909597929
            // USDT amount = ???
            //@audit-issue There is no liquidty for this token pair
            amount_ = IUniswapV2Router(router).getAmountsOut(weth_amount, path)[1];
        }
    }

    /**
     * @notice Estimates the amount of incoming asset received for a given deposit amount and assets (for testing
     * purposes).
     * @param _depositAmount The amount of deposit asset.
     * @param _depositAsset The address of the deposit asset.
     * @param _incomingAsset The address of the incoming asset.
     * @return amount_ The estimated amount of incoming asset.
     */
    //@follow-up is this still needed here ?
    function expectedAmountForTest(
        uint256 _depositAmount,
        address _depositAsset,
        address _incomingAsset
    )
        external
        view
        returns (uint256 amount_)
    {
        require(Helper.isTestNet(), "only avaiable on testnet");

        (address router, address[] memory path) = __checkPool(_depositAsset, _incomingAsset);
        require(router != address(0), "expectedAmount: No Pool");

        amount_ = IUniswapV2Router(router).getAmountsOut(_depositAmount, path)[1];
    }

    /**
     * @notice Retrieves the address of the Uniswap V2 router.
     * @return router_ The address of the Uniswap V2 router.
     */
    function getUniswapRouter() external view returns (address router_) {
        router_ = UNISWAP2_ROUTER;
    }

    /**
     * @notice Retrieves the address of the Uniswap V2 factory.
     * @return factory_ The address of the Uniswap V2 factory.
     */
    function getUniswapFactory() external view returns (address factory_) {
        factory_ = UNISWAP2_FACTORY;
    }

    /**
     * @notice Retrieves the address of the Sushiswap factory.
     * @return factory_ The address of the Sushiswap factory.
     */
    function getSushiFactory() external view returns (address factory_) {
        return SUSHI_FACTORY;
    }

    /**
     * @notice Retrieves the address of the Sushiswap router.
     * @return router_ The address of the Sushiswap router.
     */
    function getSushiRouter() external view returns (address router_) {
        return SUSHI_ROUTER;
    }

    /*//////////////////////////////////////////////////////////////
                                internal
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Swaps ETH for an ERC20 token using a specified router and path.
     * @dev This function performs a swap of ETH to an ERC20 token using Uniswap or Sushiswap.
     * @param _depositAmount The amount of ETH to swap.
     * @param _expectedAmount The expected amount of ERC20 token to receive.
     * @param _router The address of the Uniswap or Sushiswap router.
     * @param _path The path of tokens for the swap, starting from ETH.
     * @return amounts_ An array of amounts received in the swap.
     */
    function __swapETHToToken(
        uint256 _depositAmount,
        uint256 _expectedAmount,
        address _router,
        address[] memory _path
    )
        internal
        returns (uint256[] memory amounts_)
    {
        require(address(this).balance >= _depositAmount, "sEToT: insufficient");

        __approveMaxAsNeeded(_path[0], _router, _depositAmount);
        //@audit q: why use block.timestamp + 1 as deadline here ?
        amounts_ = IUniswapV2Router(_router).swapExactETHForTokens{ value: address(this).balance }(
            _expectedAmount, _path, address(this), block.timestamp + 1
        );
    }

    /**
     * @dev Swaps an ERC20 token for ETH using a specified router and path.
     * @dev This function performs a swap of an ERC20 token to ETH using Uniswap or Sushiswap.
     * @param _depositAmount The amount of ERC20 token to swap.
     * @param _expectedAmount The expected amount of ETH to receive.
     * @param _router The address of the Uniswap or Sushiswap router.
     * @param _path The path of tokens for the swap, starting from the ERC20 token.
     * @return amounts_ An array of amounts received in the swap.
     */
    function __swapTokenToETH(
        uint256 _depositAmount,
        uint256 _expectedAmount,
        address _router,
        address[] memory _path
    )
        internal
        returns (uint256[] memory amounts_)
    {
        __approveMaxAsNeeded(_path[0], _router, _depositAmount);

        //@audit q: why use block.timestamp + 1 as deadline here ?

        //Swaps an exact amount of tokens for as much ETH as possible
        // uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline
        amounts_ = IUniswapV2Router(_router).swapExactTokensForETH(
            _depositAmount, _expectedAmount, _path, address(this), block.timestamp + 1
        );
    }

    /**
     * @dev Approves the maximum amount of an ERC20 token to a specified target.
     * @dev This function ensures that the contract has approved enough tokens to perform transactions.
     * @param _asset The address of the ERC20 token.
     * @param _target The address of the spender to approve.
     * @param _neededAmount The amount of tokens needed to be approved.
     */
    function __approveMaxAsNeeded(address _asset, address _target, uint256 _neededAmount) internal {
        if (IERC20(_asset).allowance(address(this), _target) < _neededAmount) {
            // Helper.safeApprove(_asset, _target, type(uint256).max);
            Helper.safeApprove(_asset, _target, _neededAmount);
        }
    }

    /**
     * @dev Transfers the entire contract balance of a specified asset to a caller.
     * @dev This function safely transfers either ETH or ERC20 tokens to the caller.
     * @param _target The address of the caller to receive the assets.
     * @param _asset The address of the asset to transfer, or `address(0)` for ETH.
     */
    function __transferAssetToCaller(address payable _target, address _asset) internal {
        uint256 transferAmount;
        if (_asset == address(0)) {
            transferAmount = address(this).balance;
            if (transferAmount != 0) {
                Helper.safeTransferETH(_target, transferAmount);
            }
        } else {
            transferAmount = IERC20(_asset).balanceOf(address(this));
            if (transferAmount != 0) {
                Helper.safeTransfer(_asset, _target, transferAmount);
            }
        }
    }

    /**
     * @dev Checks for the existence of a liquidity pool on Uniswap or Sushiswap for given assets.
     * @dev This function checks if a liquidity pool exists between `_depositAsset` and `_incomeAsset`.
     * @param _depositAsset The address of the deposit asset, or `address(0)` for ETH.
     * @param _incomeAsset The address of the incoming asset, or `address(0)` for ETH.
     * @return router The address of the router where the pool exists, and path The token path of the pool.
     */
    function __checkPool(
        address _depositAsset, // e: USDC
        address _incomeAsset // ETH
    )
        internal
        view
        returns (address router, address[] memory path)
    {
        address WETH1 = IUniswapV2Router(UNISWAP2_ROUTER).WETH();
        address WETH2 = IUniswapV2Router(SUSHI_ROUTER).WETH();

        address[] memory path1 = new address[](2);
        address[] memory path2 = new address[](2);

        if (_depositAsset == address(0)) {
            path1[0] = WETH1;
            path1[1] = _incomeAsset;

            path2[0] = WETH2;
            path2[1] = _incomeAsset;
        }
        if (_incomeAsset == address(0)) {
            path1[0] = _depositAsset;
            path1[1] = WETH1;

            path2[0] = _depositAsset;
            path2[1] = WETH2;
        }
        if (_depositAsset != address(0) && _incomeAsset != address(0)) {
            path1[0] = _depositAsset;
            path1[1] = _incomeAsset;

            path2[0] = _depositAsset;
            path2[1] = _incomeAsset;
        }

        address uniPool = IUniswapV2Factory(UNISWAP2_FACTORY).getPair(path1[0], path1[1]);
        address sushiPool = IUniswapV2Factory(SUSHI_FACTORY).getPair(path2[0], path2[1]);

        if (uniPool == address(0) && sushiPool != address(0)) {
            return (SUSHI_ROUTER, path2);
        } else if (uniPool != address(0) && sushiPool == address(0)) {
            return (UNISWAP2_ROUTER, path1);
        } else if (uniPool != address(0) && sushiPool != address(0)) {
            return (UNISWAP2_ROUTER, path1);
        } else if (uniPool == address(0) && sushiPool == address(0)) {
            return (address(0), path1);
        }
    }
}
