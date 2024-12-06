# IUniHelper
[Git Source](https://github.com/Mill1995/VABDAO/blob/4914bdc306cbdb860037485ce4bcebbfdd390c9f/contracts/interfaces/IUniHelper.sol)

Interface for Helper


## Functions
### expectedAmount


```solidity
function expectedAmount(
    uint256 _depositAmount,
    address _depositAsset,
    address _incomingAsset
)
    external
    view
    returns (uint256 amount_);
```

### swapAsset


```solidity
function swapAsset(bytes calldata _swapArgs) external returns (uint256 amount_);
```

