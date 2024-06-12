# IUniHelper
[Git Source](https://github.com/Mill1995/VABDAO/blob/c1ade743ae4227c63e3d49544ad80f6b569b00da/contracts/interfaces/IUniHelper.sol)

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

