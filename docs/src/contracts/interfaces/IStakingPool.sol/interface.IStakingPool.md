# IStakingPool
[Git Source](https://github.com/Mill1995/VABDAO/blob/9050477259e61daa6bf97d9f648c5d24a5f80da7/contracts/interfaces/IStakingPool.sol)


## Functions
### getStakeAmount


```solidity
function getStakeAmount(address _user) external view returns (uint256 amount_);
```

### getWithdrawableTime


```solidity
function getWithdrawableTime(address _user) external view returns (uint256 time_);
```

### addVotedData


```solidity
function addVotedData(address _user, uint256 _time, uint256 _proposalID) external;
```

### addRewardToPool


```solidity
function addRewardToPool(uint256 _amount) external;
```

### getLimitCount


```solidity
function getLimitCount() external view returns (uint256 count_);
```

### lastfundProposalCreateTime


```solidity
function lastfundProposalCreateTime() external view returns (uint256);
```

### updateLastfundProposalCreateTime


```solidity
function updateLastfundProposalCreateTime(uint256 _time) external;
```

### addProposalData


```solidity
function addProposalData(address _creator, uint256 _cTime, uint256 _period) external returns (uint256);
```

### getRentVABAmount


```solidity
function getRentVABAmount(address _user) external view returns (uint256 amount_);
```

### sendVAB


```solidity
function sendVAB(address[] calldata _users, address _to, uint256[] calldata _amounts) external returns (uint256);
```

### calcMigrationVAB


```solidity
function calcMigrationVAB() external;
```

