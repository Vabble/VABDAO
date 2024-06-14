# IUniHelper
[Git Source](https://github.com/Mill1995/VABDAO/blob/96e45074ef6d32b9660a684b4e42c099c5b394c6/contracts/interfaces/IUniHelper.sol)

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

