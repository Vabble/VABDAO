# IFactoryFilmNFT
[Git Source](https://github.com/Mill1995/VABDAO/blob/4914bdc306cbdb860037485ce4bcebbfdd390c9f/contracts/interfaces/IFactoryFilmNFT.sol)


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

