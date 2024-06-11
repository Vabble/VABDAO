# StakingPool
[Git Source](https://github.com/Mill1995/VABDAO/blob/0d779ec55317045015c4224c0805ea7a1092ab9f/contracts/dao/StakingPool.sol)

**Inherits:**
ReentrancyGuard


## State Variables
### OWNABLE

```solidity
address private immutable OWNABLE;
```


### VOTE

```solidity
address private VOTE;
```


### VABBLE_DAO

```solidity
address private VABBLE_DAO;
```


### DAO_PROPERTY

```solidity
address private DAO_PROPERTY;
```


### totalStakingAmount

```solidity
uint256 public totalStakingAmount;
```


### totalRewardAmount

```solidity
uint256 public totalRewardAmount;
```


### totalRewardIssuedAmount

```solidity
uint256 public totalRewardIssuedAmount;
```


### lastfundProposalCreateTime

```solidity
uint256 public lastfundProposalCreateTime;
```


### migrationStatus

```solidity
uint256 public migrationStatus = 0;
```


### totalMigrationVAB

```solidity
uint256 public totalMigrationVAB = 0;
```


### votedTime

```solidity
mapping(address => mapping(uint256 => uint256)) private votedTime;
```


### stakeInfo

```solidity
mapping(address => Stake) public stakeInfo;
```


### receivedRewardAmount

```solidity
mapping(address => uint256) public receivedRewardAmount;
```


### userRentInfo

```solidity
mapping(address => UserRent) public userRentInfo;
```


### minProposalIndex

```solidity
mapping(address => uint256) public minProposalIndex;
```


### proposalCount

```solidity
Counters.Counter public proposalCount;
```


### stakerMap

```solidity
Staker private stakerMap;
```


### propsList

```solidity
Props[] private propsList;
```


## Functions
### onlyVote


```solidity
modifier onlyVote();
```

### onlyDAO


```solidity
modifier onlyDAO();
```

### onlyAuditor


```solidity
modifier onlyAuditor();
```

### onlyDeployer


```solidity
modifier onlyDeployer();
```

### onlyNormal


```solidity
modifier onlyNormal();
```

### constructor


```solidity
constructor(address _ownable);
```

### initialize

Initialize Pool


```solidity
function initialize(address _vabbleDAO, address _property, address _vote) external onlyDeployer;
```

### addRewardToPool

Add reward token(VAB)


```solidity
function addRewardToPool(uint256 _amount) external onlyNormal nonReentrant;
```

### stakeVAB

Staking VAB token by staker


```solidity
function stakeVAB(uint256 _amount) external onlyNormal nonReentrant;
```

### unstakeVAB

*Allows user to unstake tokens after the correct time period has elapsed*


```solidity
function unstakeVAB(uint256 _amount) external nonReentrant;
```

### withdrawReward

Withdraw reward.  isCompound=1 => compound reward, isCompound=0 => withdraw


```solidity
function withdrawReward(uint256 _isCompound) external nonReentrant;
```

### __withdrawReward

*Transfer reward amount*


```solidity
function __withdrawReward(uint256 _amount) private;
```

### calcRewardAmount

Calculate reward amount with previous reward


```solidity
function calcRewardAmount(address _user) public view returns (uint256);
```

### __calcProposalTimeIntervals


```solidity
function __calcProposalTimeIntervals(address _user) public view returns (uint256[] memory times_);
```

### __getProposalVoteCount


```solidity
function __getProposalVoteCount(
    address _user,
    uint256 minIndex,
    uint256 _start,
    uint256 _end
)
    public
    view
    returns (uint256, uint256, uint256);
```

### __updateMinProposalIndex


```solidity
function __updateMinProposalIndex(address _user) private;
```

### calcRealizedRewards

Calculate realized rewards


```solidity
function calcRealizedRewards(address _user) public view returns (uint256);
```

### calcPendingRewards


```solidity
function calcPendingRewards(address _user) public view returns (uint256);
```

### __calcRewards


```solidity
function __calcRewards(address _user, uint256 startTime, uint256 endTime) private view returns (uint256 amount_);
```

### __rewardPercent


```solidity
function __rewardPercent(uint256 _stakingAmount) private view returns (uint256 percent_);
```

### calculateAPR

Calculate APR(Annual Percentage Rate) for staking/pending rewards


```solidity
function calculateAPR(
    uint256 _period,
    uint256 _stakeAmount,
    uint256 _proposalCount,
    uint256 _voteCount,
    bool isBoardMember
)
    external
    view
    returns (uint256 amount_);
```

### depositVAB

Deposit VAB token from customer for renting the films


```solidity
function depositVAB(uint256 _amount) external onlyNormal nonReentrant;
```

### pendingWithdraw

Pending Withdraw VAB token by customer


```solidity
function pendingWithdraw(uint256 _amount) external nonReentrant;
```

### approvePendingWithdraw

Approve pending-withdraw of given customers by Auditor


```solidity
function approvePendingWithdraw(address[] calldata _customers) external onlyAuditor nonReentrant;
```

### __transferVABWithdraw

*Transfer VAB token to user's withdraw request*


```solidity
function __transferVABWithdraw(address _to) private returns (uint256);
```

### checkApprovePendingWithdraw


```solidity
function checkApprovePendingWithdraw(address[] calldata _customers) external view returns (bool);
```

### denyPendingWithdraw

Deny pending-withdraw of given customers by Auditor


```solidity
function denyPendingWithdraw(address[] calldata _customers) external onlyAuditor nonReentrant;
```

### checkDenyPendingWithDraw


```solidity
function checkDenyPendingWithDraw(address[] calldata _customers) external view returns (bool);
```

### sendVAB

onlyDAO transfer VAB token to user


```solidity
function sendVAB(
    address[] calldata _users,
    address _to,
    uint256[] calldata _amounts
)
    external
    onlyDAO
    returns (uint256);
```

### checkAllocateToPool


```solidity
function checkAllocateToPool(address[] calldata _users, uint256[] calldata _amounts) external view returns (bool);
```

### withdrawAllFund

Transfer DAO all fund to V2


```solidity
function withdrawAllFund() external onlyAuditor nonReentrant;
```

### calcMigrationVAB


```solidity
function calcMigrationVAB() external onlyNormal nonReentrant;
```

### addVotedData

Add voted time for a staker when vote


```solidity
function addVotedData(address _user, uint256 _time, uint256 _proposalID) external onlyVote;
```

### updateLastfundProposalCreateTime

Update lastfundProposalCreateTime for only fund film proposal


```solidity
function updateLastfundProposalCreateTime(uint256 _time) external onlyDAO;
```

### addProposalData

Add proposal data to array for calculating rewards


```solidity
function addProposalData(address _creator, uint256 _cTime, uint256 _period) external returns (uint256);
```

### getStakeAmount

Get staking amount for a staker


```solidity
function getStakeAmount(address _user) external view returns (uint256 amount_);
```

### getRentVABAmount

Get user rent VAB amount


```solidity
function getRentVABAmount(address _user) external view returns (uint256 amount_);
```

### getLimitCount

Get limit staker count for voting


```solidity
function getLimitCount() external view returns (uint256 count_);
```

### getWithdrawableTime

Get withdrawTime for a staker


```solidity
function getWithdrawableTime(address _user) external view returns (uint256 time_);
```

### getOwnableAddress


```solidity
function getOwnableAddress() public view returns (address);
```

### getVoteAddress


```solidity
function getVoteAddress() public view returns (address);
```

### getVabbleDaoAddress


```solidity
function getVabbleDaoAddress() public view returns (address);
```

### getPropertyAddress


```solidity
function getPropertyAddress() public view returns (address);
```

### getStakerList


```solidity
function getStakerList() external view returns (address[] memory);
```

### stakerCount


```solidity
function stakerCount() public view returns (uint256);
```

### __stakerSet


```solidity
function __stakerSet(address key) private;
```

### __stakerRemove


```solidity
function __stakerRemove(address key) private;
```

## Events
### TokenStaked

```solidity
event TokenStaked(address indexed staker, uint256 stakeAmount);
```

### TokenUnstaked

```solidity
event TokenUnstaked(address indexed unstaker, uint256 unStakeAmount);
```

### RewardWithdraw

```solidity
event RewardWithdraw(address indexed staker, uint256 rewardAmount);
```

### RewardContinued

```solidity
event RewardContinued(address indexed staker, uint256 isCompound, uint256 rewardAmount);
```

### AllFundWithdraw

```solidity
event AllFundWithdraw(address to, uint256 amount);
```

### RewardAdded

```solidity
event RewardAdded(uint256 totalRewardAmount, uint256 rewardAmount, address indexed contributor);
```

### VABDeposited

```solidity
event VABDeposited(address indexed customer, uint256 amount);
```

### WithdrawPending

```solidity
event WithdrawPending(address indexed customer, uint256 amount);
```

### PendingWithdrawApproved

```solidity
event PendingWithdrawApproved(address[] customers, uint256[] withdrawAmounts);
```

### PendingWithdrawDenied

```solidity
event PendingWithdrawDenied(address[] customers);
```

## Structs
### Staker

```solidity
struct Staker {
    address[] keys;
    mapping(address => uint256) indexOf;
}
```

### Stake

```solidity
struct Stake {
    uint256 stakeAmount;
    uint256 stakeTime;
    uint256 outstandingReward;
}
```

### UserRent

```solidity
struct UserRent {
    uint256 vabAmount;
    uint256 withdrawAmount;
    bool pending;
}
```

### Props

```solidity
struct Props {
    address creator;
    uint256 cTime;
    uint256 period;
    uint256 proposalID;
}
```

