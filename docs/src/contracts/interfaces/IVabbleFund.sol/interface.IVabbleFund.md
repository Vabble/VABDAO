# IVabbleFund
[Git Source](https://github.com/Mill1995/VABDAO/blob/9050477259e61daa6bf97d9f648c5d24a5f80da7/contracts/interfaces/IVabbleFund.sol)


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

