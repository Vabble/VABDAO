# IFactoryFilmNFT
[Git Source](https://github.com/Mill1995/VABDAO/blob/217c9b2f97086a2b56e9d8ed6314ee399ea48dff/contracts/interfaces/IFactoryFilmNFT.sol)


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

