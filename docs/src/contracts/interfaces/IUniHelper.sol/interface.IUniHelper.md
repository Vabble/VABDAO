# IUniHelper
[Git Source](https://github.com/Mill1995/VABDAO/blob/df9d3dbfaf61478d7e8a6f44f0a92a8ebe82bada/contracts/interfaces/IUniHelper.sol)

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

