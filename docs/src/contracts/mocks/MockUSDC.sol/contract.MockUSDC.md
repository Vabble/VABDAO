# MockUSDC
[Git Source](https://github.com/Mill1995/VABDAO/blob/4914bdc306cbdb860037485ce4bcebbfdd390c9f/contracts/mocks/MockUSDC.sol)

**Inherits:**
Ownable, ERC20


## State Variables
### SUPPLY

```solidity
uint256 SUPPLY = 10_000_000 * 10 ** 6;
```


### faucetLimit

```solidity
uint256 public constant faucetLimit = 5000 * 10 ** 6;
```


## Functions
### constructor


```solidity
constructor(string memory _name_, string memory _symbol_) ERC20(_name_, _symbol_);
```

### decimals


```solidity
function decimals() public pure override returns (uint8);
```

### faucet


```solidity
function faucet(uint256 _amount) external;
```

