# UniHelper
[Git Source](https://github.com/Mill1995/VABDAO/blob/b6d0bc49c06645caa4c08cd044aa829b5ffd9210/contracts/dao/UniHelper.sol)

**Inherits:**
[IUniHelper](/contracts/interfaces/IUniHelper.sol/interface.IUniHelper.md), ReentrancyGuard


## State Variables
### UNISWAP2_ROUTER

```solidity
address private immutable UNISWAP2_ROUTER;
```


### UNISWAP2_FACTORY

```solidity
address private immutable UNISWAP2_FACTORY;
```


### SUSHI_FACTORY

```solidity
address private immutable SUSHI_FACTORY;
```


### SUSHI_ROUTER

```solidity
address private immutable SUSHI_ROUTER;
```


### OWNABLE

```solidity
address private immutable OWNABLE;
```


### isVabbleContract

```solidity
mapping(address => bool) public isVabbleContract;
```


### isInitialized

```solidity
bool public isInitialized;
```


## Functions
### onlyDeployer


```solidity
modifier onlyDeployer();
```

### receive


```solidity
receive() external payable;
```

### constructor


```solidity
constructor(
    address _uniswap2Factory,
    address _uniswap2Router,
    address _sushiswapFactory,
    address _sushiswapRouter,
    address _ownable
);
```

### setWhiteList


```solidity
function setWhiteList(
    address _vabbleDAO,
    address _vabbleFund,
    address _subscription,
    address _factoryFilm,
    address _factorySub
)
    external
    onlyDeployer;
```

### expectedAmount

Get incoming amount <- WETH <- deposit amount


```solidity
function expectedAmount(
    uint256 _depositAmount,
    address _depositAsset,
    address _incomingAsset
)
    external
    view
    override
    returns (uint256 amount_);
```

### expectedAmountForTest


```solidity
function expectedAmountForTest(
    uint256 _depositAmount,
    address _depositAsset,
    address _incomingAsset
)
    external
    view
    returns (uint256 amount_);
```

### __checkPool

check pool exist on uniswap


```solidity
function __checkPool(
    address _depositAsset,
    address _incomeAsset
)
    private
    view
    returns (address router, address[] memory path);
```

### swapAsset

Swap depositAsset -> WETH -> incomingAsset


```solidity
function swapAsset(bytes calldata _swapArgs) external override nonReentrant returns (uint256 amount_);
```

### __swapETHToToken

Swap ERC20 Token to ERC20 Token

Swap ETH to ERC20 Token


```solidity
function __swapETHToToken(
    uint256 _depositAmount,
    uint256 _expectedAmount,
    address _router,
    address[] memory _path
)
    private
    returns (uint256[] memory amounts_);
```

### __swapTokenToETH

Swap Token to ETH


```solidity
function __swapTokenToETH(
    uint256 _depositAmount,
    uint256 _expectedAmount,
    address _router,
    address[] memory _path
)
    private
    returns (uint256[] memory amounts_);
```

### __transferAssetToCaller

Helper to transfer full contract balances of assets to the caller


```solidity
function __transferAssetToCaller(address payable _target, address _asset) private;
```

### __approveMaxAsNeeded

*Helper for asset to approve their max amount of an asset.*


```solidity
function __approveMaxAsNeeded(address _asset, address _target, uint256 _neededAmount) private;
```

### getUniswapRouter

Gets the `UNISWAP2_ROUTER` variable


```solidity
function getUniswapRouter() external view returns (address router_);
```

### getUniswapFactory

Gets the `UNISWAP2_FACTORY` variable


```solidity
function getUniswapFactory() external view returns (address factory_);
```

### getSushiFactory

Gets the `SUSHI_FACTORY` variable


```solidity
function getSushiFactory() external view returns (address factory_);
```

### getSushiRouter

Gets the `SUSHI_ROUTER` variable


```solidity
function getSushiRouter() external view returns (address router_);
```

