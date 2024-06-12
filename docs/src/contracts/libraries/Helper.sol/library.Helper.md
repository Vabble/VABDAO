# Helper
[Git Source](https://github.com/Mill1995/VABDAO/blob/b6d0bc49c06645caa4c08cd044aa829b5ffd9210/contracts/libraries/Helper.sol)


## Functions
### safeApprove


```solidity
function safeApprove(address token, address to, uint256 value) internal;
```

### safeTransfer


```solidity
function safeTransfer(address token, address to, uint256 value) internal;
```

### safeTransferFrom


```solidity
function safeTransferFrom(address token, address from, address to, uint256 value) internal;
```

### safeTransferETH


```solidity
function safeTransferETH(address to, uint256 value) internal;
```

### safeTransferAsset


```solidity
function safeTransferAsset(address token, address to, uint256 value) internal;
```

### isContract


```solidity
function isContract(address _address) internal view returns (bool);
```

### isTestNet


```solidity
function isTestNet() internal view returns (bool);
```

## Enums
### Status

```solidity
enum Status {
    LISTED,
    UPDATED,
    APPROVED_LISTING,
    APPROVED_FUNDING,
    REJECTED,
    REPLACED
}
```

### TokenType

```solidity
enum TokenType {
    ERC20,
    ERC721,
    ERC1155
}
```

