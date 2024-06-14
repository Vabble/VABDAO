# UniHelper
[Git Source](https://github.com/Mill1995/VABDAO/blob/9050477259e61daa6bf97d9f648c5d24a5f80da7/contracts/dao/UniHelper.sol)

**Inherits:**
[IUniHelper](/contracts/interfaces/IUniHelper.sol/interface.IUniHelper.md), ReentrancyGuard

A contract facilitating token swaps between ERC20 tokens and ETH using Uniswap and Sushiswap.
This contract provides functionalities to:
- Set whitelisted Vabble contracts for interaction.
- Swap ERC20 tokens for ETH and vice versa using Uniswap or Sushiswap.
- Estimate amounts of incoming assets for a given deposit amount and assets.
- Retrieve addresses of Uniswap V2 and Sushiswap routers and factories.
- Check for the existence of liquidity pools on Uniswap or Sushiswap for given asset pairs.
The contract is initialized with the addresses of Uniswap and Sushiswap routers and factories,
and the Ownable contract address. Only the deployer of the Ownable contract can set whitelisted
Vabble contracts until the contract is initialized. Once initialized, Vabble contracts can call
specific functions to interact with this contract for token swaps and other operations.
This contract uses helper functions from external libraries and interfaces defined in other contracts,
such as `IUniswapV2Router`, `IUniswapV2Factory`, `IOwnablee`, `IUniHelper`, and `Helper`.

*The contract is designed to be non-upgradable with fixed addresses for routers and factories,
ensuring predictable behavior and security of asset swaps.*


## State Variables
### UNISWAP2_ROUTER
*The address of the UniswapV2 Router contract.*


```solidity
address private immutable UNISWAP2_ROUTER;
```


### UNISWAP2_FACTORY
*The address of the UniswapV2 Factory contract.*


```solidity
address private immutable UNISWAP2_FACTORY;
```


### SUSHI_ROUTER
*The address of the Sushiswap Router contract.*


```solidity
address private immutable SUSHI_ROUTER;
```


### SUSHI_FACTORY
*The address of the Sushiswap Factory contract.*


```solidity
address private immutable SUSHI_FACTORY;
```


### OWNABLE
*The address of the Ownable contract.*


```solidity
address private immutable OWNABLE;
```


### isVabbleContract
*mapping to keep track of all Vabble contract addresses
allowed to interact with this contract*


```solidity
mapping(address => bool) public isVabbleContract;
```


### isInitialized
*Boolean flag to indicate if the contract has been initialized*


```solidity
bool public isInitialized;
```


## Functions
### onlyDeployer

*Restricts access to the deployer of the Ownable contract.*


```solidity
modifier onlyDeployer();
```

### constructor

*Constructor to initialize contract with necessary addresses.*


```solidity
constructor(
    address _uniswap2Factory,
    address _uniswap2Router,
    address _sushiswapFactory,
    address _sushiswapRouter,
    address _ownable
);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_uniswap2Factory`|`address`|The address of the Uniswap V2 factory.|
|`_uniswap2Router`|`address`|The address of the Uniswap V2 router.|
|`_sushiswapFactory`|`address`|The address of the Sushiswap factory.|
|`_sushiswapRouter`|`address`|The address of the Sushiswap router.|
|`_ownable`|`address`|The address of the Ownable contract.|


### receive


```solidity
receive() external payable;
```

### setWhiteList

Sets the addresses of Vabble contracts for whitelist validation.

*Only callable by the deployer until contract is initialized.*


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
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_vabbleDAO`|`address`|The address of the VabbleDAO contract.|
|`_vabbleFund`|`address`|The address of the VabbleFund contract.|
|`_subscription`|`address`|The address of the Subscription contract.|
|`_factoryFilm`|`address`|The address of the FactoryFilmNFT contract.|
|`_factorySub`|`address`|The address of the FactorySubNFT contract.|


### swapAsset

Swaps an ERC20 token for another ERC20 token using Uniswap or Sushiswap.


```solidity
function swapAsset(bytes calldata _swapArgs) external override nonReentrant returns (uint256 amount_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_swapArgs`|`bytes`|Packed arguments including deposit amount, deposit asset address, and incoming asset address.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amount_`|`uint256`|The amount of tokens received after the swap.|


### expectedAmount

Estimates the amount of incoming asset received for a given deposit amount and assets.


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
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_depositAmount`|`uint256`|The amount of deposit asset.|
|`_depositAsset`|`address`|The address of the deposit asset.|
|`_incomingAsset`|`address`|The address of the incoming asset.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amount_`|`uint256`|The estimated amount of incoming asset.|


### expectedAmountForTest

Estimates the amount of incoming asset received for a given deposit amount and assets (for testing
purposes).


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
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_depositAmount`|`uint256`|The amount of deposit asset.|
|`_depositAsset`|`address`|The address of the deposit asset.|
|`_incomingAsset`|`address`|The address of the incoming asset.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amount_`|`uint256`|The estimated amount of incoming asset.|


### getUniswapRouter

Retrieves the address of the Uniswap V2 router.


```solidity
function getUniswapRouter() external view returns (address router_);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`router_`|`address`|The address of the Uniswap V2 router.|


### getUniswapFactory

Retrieves the address of the Uniswap V2 factory.


```solidity
function getUniswapFactory() external view returns (address factory_);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`factory_`|`address`|The address of the Uniswap V2 factory.|


### getSushiFactory

Retrieves the address of the Sushiswap factory.


```solidity
function getSushiFactory() external view returns (address factory_);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`factory_`|`address`|The address of the Sushiswap factory.|


### getSushiRouter

Retrieves the address of the Sushiswap router.


```solidity
function getSushiRouter() external view returns (address router_);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`router_`|`address`|The address of the Sushiswap router.|


### __swapETHToToken

*Swaps ETH for an ERC20 token using a specified router and path.*

*This function performs a swap of ETH to an ERC20 token using Uniswap or Sushiswap.*


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
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_depositAmount`|`uint256`|The amount of ETH to swap.|
|`_expectedAmount`|`uint256`|The expected amount of ERC20 token to receive.|
|`_router`|`address`|The address of the Uniswap or Sushiswap router.|
|`_path`|`address[]`|The path of tokens for the swap, starting from ETH.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amounts_`|`uint256[]`|An array of amounts received in the swap.|


### __swapTokenToETH

*Swaps an ERC20 token for ETH using a specified router and path.*

*This function performs a swap of an ERC20 token to ETH using Uniswap or Sushiswap.*


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
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_depositAmount`|`uint256`|The amount of ERC20 token to swap.|
|`_expectedAmount`|`uint256`|The expected amount of ETH to receive.|
|`_router`|`address`|The address of the Uniswap or Sushiswap router.|
|`_path`|`address[]`|The path of tokens for the swap, starting from the ERC20 token.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amounts_`|`uint256[]`|An array of amounts received in the swap.|


### __approveMaxAsNeeded

*Approves the maximum amount of an ERC20 token to a specified target.*

*This function ensures that the contract has approved enough tokens to perform transactions.*


```solidity
function __approveMaxAsNeeded(address _asset, address _target, uint256 _neededAmount) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_asset`|`address`|The address of the ERC20 token.|
|`_target`|`address`|The address of the spender to approve.|
|`_neededAmount`|`uint256`|The amount of tokens needed to be approved.|


### __transferAssetToCaller

*Transfers the entire contract balance of a specified asset to a caller.*

*This function safely transfers either ETH or ERC20 tokens to the caller.*


```solidity
function __transferAssetToCaller(address payable _target, address _asset) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_target`|`address payable`|The address of the caller to receive the assets.|
|`_asset`|`address`|The address of the asset to transfer, or `address(0)` for ETH.|


### __checkPool

*Checks for the existence of a liquidity pool on Uniswap or Sushiswap for given assets.*

*This function checks if a liquidity pool exists between `_depositAsset` and `_incomeAsset`.*


```solidity
function __checkPool(
    address _depositAsset,
    address _incomeAsset
)
    private
    view
    returns (address router, address[] memory path);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_depositAsset`|`address`|The address of the deposit asset, or `address(0)` for ETH.|
|`_incomeAsset`|`address`|The address of the incoming asset, or `address(0)` for ETH.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`router`|`address`|The address of the router where the pool exists, and path The token path of the pool.|
|`path`|`address[]`||


