# Ownablee
[Git Source](https://github.com/Mill1995/VABDAO/blob/da329adf87a2070b031772816f2c7bd185e5f213/contracts/dao/Ownablee.sol)

**Inherits:**
[IOwnablee](/contracts/interfaces/IOwnablee.sol/interface.IOwnablee.md)


## State Variables
### auditor

```solidity
address public override auditor;
```


### deployer

```solidity
address public immutable override deployer;
```


### VAB_WALLET

```solidity
address public override VAB_WALLET;
```


### PAYOUT_TOKEN

```solidity
address public immutable override PAYOUT_TOKEN;
```


### USDC_TOKEN

```solidity
address public immutable override USDC_TOKEN;
```


### VOTE

```solidity
address private VOTE;
```


### VABBLE_DAO

```solidity
address private VABBLE_DAO;
```


### STAKING_POOL

```solidity
address private STAKING_POOL;
```


### depositAssetList

```solidity
address[] private depositAssetList;
```


### allowAssetToDeposit

```solidity
mapping(address => bool) private allowAssetToDeposit;
```


## Functions
### onlyAuditor


```solidity
modifier onlyAuditor();
```

### onlyDeployer


```solidity
modifier onlyDeployer();
```

### onlyVote


```solidity
modifier onlyVote();
```

### onlyDAO


```solidity
modifier onlyDAO();
```

### onlyStakingPool


```solidity
modifier onlyStakingPool();
```

### constructor


```solidity
constructor(address _vabbleWallet, address _payoutToken, address _usdcToken, address _multiSigWallet);
```

### setup


```solidity
function setup(address _vote, address _dao, address _stakingPool) external onlyDeployer;
```

### transferAuditor


```solidity
function transferAuditor(address _newAuditor) external override onlyAuditor;
```

### replaceAuditor


```solidity
function replaceAuditor(address _newAuditor) external override onlyVote;
```

### addDepositAsset


```solidity
function addDepositAsset(address[] calldata _assetList) external;
```

### removeDepositAsset


```solidity
function removeDepositAsset(address[] calldata _assetList) external onlyAuditor;
```

### isDepositAsset


```solidity
function isDepositAsset(address _asset) external view override returns (bool);
```

### getDepositAssetList


```solidity
function getDepositAssetList() external view override returns (address[] memory);
```

### addToStudioPool


```solidity
function addToStudioPool(uint256 _amount) external override onlyDAO;
```

### depositVABToEdgePool

Deposit VAB token from Auditor to EdgePool


```solidity
function depositVABToEdgePool(uint256 _amount) external onlyAuditor;
```

### withdrawVABFromEdgePool

Withdraw VAB token from EdgePool to V2


```solidity
function withdrawVABFromEdgePool(address _to) external override onlyStakingPool returns (uint256);
```

### getVoteAddress


```solidity
function getVoteAddress() public view returns (address);
```

### getVabbleDAO


```solidity
function getVabbleDAO() public view returns (address dao_);
```

### getStakingPoolAddress


```solidity
function getStakingPoolAddress() public view returns (address);
```

## Events
### VABWalletChanged

```solidity
event VABWalletChanged(address indexed wallet);
```

