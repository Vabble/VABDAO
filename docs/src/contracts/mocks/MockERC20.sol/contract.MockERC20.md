# MockERC20
[Git Source](https://github.com/Mill1995/VABDAO/blob/6b2692eb00242bb9bb0e30b4b8c33940feb51fa0/contracts/mocks/MockERC20.sol)

**Inherits:**
Ownable, ERC20


## State Variables
### SUPPLY

```solidity
uint256 private SUPPLY = 1_456_250_000 * 10 ** 18;
```


### faucetLimit

```solidity
uint256 private constant faucetLimit = 5e8 * 10 ** 18;
```


## Functions
### constructor


```solidity
constructor(string memory _name_, string memory _symbol_) ERC20(_name_, _symbol_);
```

### faucet


```solidity
function faucet(uint256 _amount) external;
```

