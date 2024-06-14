# IVabbleDAO
[Git Source](https://github.com/Mill1995/VABDAO/blob/9050477259e61daa6bf97d9f648c5d24a5f80da7/contracts/interfaces/IVabbleDAO.sol)


## Functions
### getFilmFund


```solidity
function getFilmFund(uint256 _filmId)
    external
    view
    returns (uint256 raiseAmount_, uint256 fundPeriod_, uint256 fundType_, uint256 rewardPercent_);
```

### getFilmStatus


```solidity
function getFilmStatus(uint256 _filmId) external view returns (Helper.Status status_);
```

### getFilmOwner


```solidity
function getFilmOwner(uint256 _filmId) external view returns (address owner_);
```

### getFilmProposalTime


```solidity
function getFilmProposalTime(uint256 _filmId) external view returns (uint256 cTime_, uint256 aTime_);
```

### approveFilmByVote


```solidity
function approveFilmByVote(uint256 _filmId, uint256 _flag) external;
```

### isEnabledClaimer


```solidity
function isEnabledClaimer(uint256 _filmId) external view returns (bool enable_);
```

### getFilmShare


```solidity
function getFilmShare(uint256 _filmId)
    external
    view
    returns (uint256[] memory sharePercents_, address[] memory studioPayees_);
```

### getUserFilmListForMigrate


```solidity
function getUserFilmListForMigrate(address _user) external view returns (Film[] memory filmList_);
```

### withdrawVABFromStudioPool


```solidity
function withdrawVABFromStudioPool(address _to) external returns (uint256);
```

## Structs
### Film

```solidity
struct Film {
    string title;
    string description;
    uint256[] sharePercents;
    address[] studioPayees;
    uint256 raiseAmount;
    uint256 fundPeriod;
    uint256 fundType;
    uint256 rewardPercent;
    uint256 noVote;
    uint256 enableClaimer;
    uint256 pCreateTime;
    uint256 pApproveTime;
    address studio;
    Helper.Status status;
}
```

