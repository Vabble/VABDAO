# IFactoryFilmNFT
[Git Source](https://github.com/Mill1995/VABDAO/blob/b6d0bc49c06645caa4c08cd044aa829b5ffd9210/contracts/interfaces/IFactoryFilmNFT.sol)


## Functions
### getMintInfo


```solidity
function getMintInfo(uint256 _filmId)
    external
    view
    returns (uint256 tier_, uint256 maxMintAmount_, uint256 mintPrice_, address nft_, address studio_);
```

### getTotalSupply


```solidity
function getTotalSupply(uint256 _filmId) external view returns (uint256);
```

