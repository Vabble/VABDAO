# IVabbleFund
[Git Source](https://github.com/Mill1995/VABDAO/blob/df9d3dbfaf61478d7e8a6f44f0a92a8ebe82bada/contracts/interfaces/IVabbleFund.sol)


## Functions
### getTotalFundAmountPerFilm


```solidity
function getTotalFundAmountPerFilm(uint256 _filmId) external view returns (uint256 amount_);
```

### getUserFundAmountPerFilm


```solidity
function getUserFundAmountPerFilm(address _customer, uint256 _filmId) external view returns (uint256 amount_);
```

### isRaisedFullAmount


```solidity
function isRaisedFullAmount(uint256 _filmId) external view returns (bool);
```

### getFilmInvestorList


```solidity
function getFilmInvestorList(uint256 _filmId) external view returns (address[] memory);
```

### getAllowUserNftCount


```solidity
function getAllowUserNftCount(uint256 _filmId, address _user) external view returns (uint256);
```

