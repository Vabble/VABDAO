# IOwnablee
[Git Source](https://github.com/Mill1995/VABDAO/blob/217c9b2f97086a2b56e9d8ed6314ee399ea48dff/contracts/interfaces/IOwnablee.sol)


## Functions
### auditor


```solidity
function auditor() external view returns (address);
```

### deployer


```solidity
function deployer() external view returns (address);
```

### replaceAuditor


```solidity
function replaceAuditor(address _newAuditor) external;
```

### transferAuditor


```solidity
function transferAuditor(address _newAuditor) external;
```

### isDepositAsset


```solidity
function isDepositAsset(address _asset) external view returns (bool);
```

### getDepositAssetList


```solidity
function getDepositAssetList() external view returns (address[] memory);
```

### VAB_WALLET


```solidity
function VAB_WALLET() external view returns (address);
```

### USDC_TOKEN


```solidity
function USDC_TOKEN() external view returns (address);
```

### PAYOUT_TOKEN


```solidity
function PAYOUT_TOKEN() external view returns (address);
```

### addToStudioPool


```solidity
function addToStudioPool(uint256 _amount) external;
```

### withdrawVABFromEdgePool


```solidity
function withdrawVABFromEdgePool(address _to) external returns (uint256);
```

