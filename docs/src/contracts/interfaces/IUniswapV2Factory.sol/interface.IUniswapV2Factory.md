# IUniswapV2Factory
[Git Source](https://github.com/Mill1995/VABDAO/blob/96e45074ef6d32b9660a684b4e42c099c5b394c6/contracts/interfaces/IUniswapV2Factory.sol)


## Functions
### feeTo


```solidity
function feeTo() external view returns (address);
```

### feeToSetter


```solidity
function feeToSetter() external view returns (address);
```

### getPair


```solidity
function getPair(address tokenA, address tokenB) external view returns (address pair);
```

### allPairs


```solidity
function allPairs(uint256) external view returns (address pair);
```

### allPairsLength


```solidity
function allPairsLength() external view returns (uint256);
```

### createPair


```solidity
function createPair(address tokenA, address tokenB) external returns (address pair);
```

### setFeeTo


```solidity
function setFeeTo(address) external;
```

### setFeeToSetter


```solidity
function setFeeToSetter(address) external;
```

## Events
### PairCreated

```solidity
event PairCreated(address indexed token0, address indexed token1, address pair, uint256);
```

