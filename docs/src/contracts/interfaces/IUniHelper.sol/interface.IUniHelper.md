# IUniHelper
[Git Source](https://github.com/Mill1995/VABDAO/blob/b6d0bc49c06645caa4c08cd044aa829b5ffd9210/contracts/interfaces/IUniHelper.sol)

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

