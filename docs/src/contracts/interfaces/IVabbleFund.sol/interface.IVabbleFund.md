# IVabbleFund
[Git Source](https://github.com/Mill1995/VABDAO/blob/217c9b2f97086a2b56e9d8ed6314ee399ea48dff/contracts/interfaces/IVabbleFund.sol)


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

