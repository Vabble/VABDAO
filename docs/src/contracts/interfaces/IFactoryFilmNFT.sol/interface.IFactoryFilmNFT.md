# IFactoryFilmNFT
[Git Source](https://github.com/Mill1995/VABDAO/blob/df9d3dbfaf61478d7e8a6f44f0a92a8ebe82bada/contracts/interfaces/IFactoryFilmNFT.sol)


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

