# IFactoryFilmNFT
[Git Source](https://github.com/Mill1995/VABDAO/blob/96e45074ef6d32b9660a684b4e42c099c5b394c6/contracts/interfaces/IFactoryFilmNFT.sol)


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

