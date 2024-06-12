# StakingPool
[Git Source](https://github.com/Mill1995/VABDAO/blob/b6d0bc49c06645caa4c08cd044aa829b5ffd9210/contracts/dao/StakingPool.sol)

**Inherits:**
ReentrancyGuard

This contract allows users to stake VAB tokens and receive rewards
based on the amount staked and the duration of staking.
Users must also vote on proposals to receive rewards accordingly.


## State Variables
### OWNABLE
The Ownablee contract address


```solidity
address private immutable OWNABLE;
```


### VOTE
The Vote contract address


```solidity
address private VOTE;
```


### VABBLE_DAO
The VabbleDAO contract address


```solidity
address private VABBLE_DAO;
```


### DAO_PROPERTY
The Property contract address


```solidity
address private DAO_PROPERTY;
```


### totalStakingAmount
Total amount staked in the contract


```solidity
uint256 public totalStakingAmount;
```


### totalRewardAmount
Total amount of rewards available for distribution


```solidity
uint256 public totalRewardAmount;
```


### totalRewardIssuedAmount
Total amount of rewards already distributed


```solidity
uint256 public totalRewardIssuedAmount;
```


### lastfundProposalCreateTime
Timestamp of the last funding proposal creation on the VabbleDAO contract


```solidity
uint256 public lastfundProposalCreateTime;
```


### migrationStatus
*Migration status of the contract:
- 0: not started
- 1: started
- 2: ended*


```solidity
uint256 public migrationStatus = 0;
```


### totalMigrationVAB
Total amount of tokens that can be migrated


```solidity
uint256 public totalMigrationVAB = 0;
```


### votedTime
*Mapping to track the time of votes for proposals
(user, proposalID) => voteTime needed for calculating rewards*


```solidity
mapping(address => mapping(uint256 => uint256)) private votedTime;
```


### stakeInfo
Mapping to store stake information for each address


```solidity
mapping(address => Stake) public stakeInfo;
```


### receivedRewardAmount
Mapping to track the amount of rewards received by each staker


```solidity
mapping(address => uint256) public receivedRewardAmount;
```


### userRentInfo
Mapping to store rental information for each user


```solidity
mapping(address => UserRent) public userRentInfo;
```


### minProposalIndex
Mapping to track the minimum proposal index for each address


```solidity
mapping(address => uint256) public minProposalIndex;
```


### proposalCount
Counter to keep track of the number of proposals

*Count starts from 1*


```solidity
Counters.Counter public proposalCount;
```


### stakerMap
Struct to store staker information


```solidity
Staker private stakerMap;
```


### propsList
Array to store proposal information, needed for calculating rewards


```solidity
Props[] private propsList;
```


## Functions
### onlyVote

*Restricts access to the Vote contract.*


```solidity
modifier onlyVote();
```

### onlyDAO

*Restricts access to the VabbleDAO contract.*


```solidity
modifier onlyDAO();
```

### onlyAuditor

*Restricts access to the current Auditor.*


```solidity
modifier onlyAuditor();
```

### onlyDeployer

*Restricts access to the deployer of the Ownable contract.*


```solidity
modifier onlyDeployer();
```

### onlyNormal

*Restricts access during migration.*


```solidity
modifier onlyNormal();
```

### constructor

*Constructor function to initialize the StakingPool contract.*


```solidity
constructor(address _ownable);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_ownable`|`address`|Address of the Ownable contract|


### initialize

Initializes the StakingPool contract, can only be called by the Deployer


```solidity
function initialize(address _vabbleDAO, address _property, address _vote) external onlyDeployer;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_vabbleDAO`|`address`|Address of the VabbleDAO contract|
|`_property`|`address`|Address of the Property contract|
|`_vote`|`address`|Address of the Vote contract|


### addRewardToPool

Add reward token (VAB) to the StakingPool

*Should be called before users start staking in order to generate staking rewards*


```solidity
function addRewardToPool(uint256 _amount) external onlyNormal nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_amount`|`uint256`|Amount of VAB tokens to add as reward|


### stakeVAB

Stake VAB token to the StakingPool to earn rewards and participate in the Governance

*A user turns in to a staker when they stake their tokens*

*When a user stakes for the first time we add his address to the `stakerMap`*


```solidity
function stakeVAB(uint256 _amount) external onlyNormal nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_amount`|`uint256`|Amount of VAB tokens to stake, must be greater than 1 Token|


### unstakeVAB

Unstake VAB tokens after the correct time period has elapsed or a migration has started.

*The lock period of the tokens is a Governance property that can be changed through a proposal.*

*This will transfer the stake amount + realized rewards to the user.*

*This will remove the staker from the `stakerMap` when he unstakes all tokens.*


```solidity
function unstakeVAB(uint256 _amount) external nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_amount`|`uint256`|Amount of VAB tokens to unstake|


### withdrawReward

Withdraw Rewards without unstaking VAB tokens

*This will lock the staked tokens for the duration of the lock period again*

*There must be rewards in the StakingPool to withdraw*


```solidity
function withdrawReward(uint256 _isCompound) external nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_isCompound`|`uint256`|can either be 1 to compound rewards or 0 to withdraw the rewards|


### depositVAB

Users on the streaming portal need to deposit VAB used for renting films

*This will update the userRentInfo for the given user.*


```solidity
function depositVAB(uint256 _amount) external onlyNormal nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_amount`|`uint256`|Amount of VAB tokens to deposit|


### sendVAB

Send VAB tokens from the given users to the given address

*This will be called from the VabbleDAO contract function `allocateToPool` by the Auditor*

*The Auditor calculates what a user has to pay*


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
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_users`|`address[]`|Array of user addresses|
|`_to`|`address`|Address to send tokens to|
|`_amounts`|`uint256[]`|Array of amounts to transfer|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|sum Total amount of VAB tokens transferred|


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

### denyPendingWithdraw

Deny pending-withdraw of given customers by Auditor


```solidity
function denyPendingWithdraw(address[] calldata _customers) external onlyAuditor nonReentrant;
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

### checkAllocateToPool


```solidity
function checkAllocateToPool(address[] calldata _users, uint256[] calldata _amounts) external view returns (bool);
```

### checkDenyPendingWithDraw


```solidity
function checkDenyPendingWithDraw(address[] calldata _customers) external view returns (bool);
```

### checkApprovePendingWithdraw


```solidity
function checkApprovePendingWithdraw(address[] calldata _customers) external view returns (bool);
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

### getStakerList


```solidity
function getStakerList() external view returns (address[] memory);
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

### calcRealizedRewards

Calculate realized rewards


```solidity
function calcRealizedRewards(address _user) public view returns (uint256);
```

### calcPendingRewards


```solidity
function calcPendingRewards(address _user) public view returns (uint256);
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

### stakerCount


```solidity
function stakerCount() public view returns (uint256);
```

### __withdrawReward

*Transfer reward amount*


```solidity
function __withdrawReward(uint256 _amount) private;
```

### __updateMinProposalIndex


```solidity
function __updateMinProposalIndex(address _user) private;
```

### __stakerSet


```solidity
function __stakerSet(address key) private;
```

### __stakerRemove


```solidity
function __stakerRemove(address key) private;
```

### __transferVABWithdraw

*Transfer VAB token to user's withdraw request*


```solidity
function __transferVABWithdraw(address _to) private returns (uint256);
```

### __calcRewards


```solidity
function __calcRewards(address _user, uint256 startTime, uint256 endTime) private view returns (uint256 amount_);
```

### __rewardPercent


```solidity
function __rewardPercent(uint256 _stakingAmount) private view returns (uint256 percent_);
```

## Events
### TokenStaked
*Emitted when a staker stakes VAB tokens.*


```solidity
event TokenStaked(address indexed staker, uint256 stakeAmount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`staker`|`address`|The address of the staker.|
|`stakeAmount`|`uint256`|The amount of VAB tokens staked.|

### TokenUnstaked
*Emitted when a staker unstakes VAB tokens.*


```solidity
event TokenUnstaked(address indexed unstaker, uint256 unStakeAmount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`unstaker`|`address`|The address of the staker.|
|`unStakeAmount`|`uint256`|The amount of VAB tokens unstaked.|

### RewardWithdraw
*Emitted when a staker withdraws rewards.*


```solidity
event RewardWithdraw(address indexed staker, uint256 rewardAmount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`staker`|`address`|The address of the staker.|
|`rewardAmount`|`uint256`|The amount of rewards withdrawn.|

### RewardContinued
*Emitted when a staker continues to receive rewards, either by withdrawing or compounding.*


```solidity
event RewardContinued(address indexed staker, uint256 isCompound, uint256 rewardAmount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`staker`|`address`|The address of the staker.|
|`isCompound`|`uint256`|Flag indicating if the rewards are compounded (1) or withdrawn (0).|
|`rewardAmount`|`uint256`|The amount of rewards continued.|

### AllFundWithdraw
*Emitted when all funds are withdrawn from the contract.*


```solidity
event AllFundWithdraw(address to, uint256 amount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`to`|`address`|The address where the funds are withdrawn to.|
|`amount`|`uint256`|The total amount of funds withdrawn.|

### RewardAdded
*Emitted when reward tokens are added to the pool.*


```solidity
event RewardAdded(uint256 totalRewardAmount, uint256 rewardAmount, address indexed contributor);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`totalRewardAmount`|`uint256`|The total reward amount after addition.|
|`rewardAmount`|`uint256`|The amount of rewards added.|
|`contributor`|`address`|The address of the contributor who added the rewards.|

### VABDeposited
*Emitted when VAB tokens are deposited by a user.*


```solidity
event VABDeposited(address indexed customer, uint256 amount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`customer`|`address`|The address of the user who deposited VAB tokens.|
|`amount`|`uint256`|The amount of VAB tokens deposited.|

### WithdrawPending
*Emitted when a pending withdrawal request is made by a user.*


```solidity
event WithdrawPending(address indexed customer, uint256 amount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`customer`|`address`|The address of the user who made the pending withdrawal request.|
|`amount`|`uint256`|The amount of VAB tokens requested for withdrawal.|

### PendingWithdrawApproved
*Emitted when pending withdrawal requests are approved by the auditor.*


```solidity
event PendingWithdrawApproved(address[] customers, uint256[] withdrawAmounts);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`customers`|`address[]`|An array of user addresses whose pending withdrawals are approved.|
|`withdrawAmounts`|`uint256[]`|An array of withdrawal amounts approved for each user.|

### PendingWithdrawDenied
*Emitted when pending withdrawal requests are denied by the auditor.*


```solidity
event PendingWithdrawDenied(address[] customers);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`customers`|`address[]`|An array of user addresses whose pending withdrawals are denied.|

## Structs
### Staker
*Struct for storing staker information.*


```solidity
struct Staker {
    address[] keys;
    mapping(address => uint256) indexOf;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`keys`|`address[]`|Array of staker addresses.|
|`indexOf`|`mapping(address => uint256)`|Mapping of staker addresses to their index in the keys array.|

### Stake
*Struct for storing staking information.*


```solidity
struct Stake {
    uint256 stakeAmount;
    uint256 stakeTime;
    uint256 outstandingReward;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`stakeAmount`|`uint256`|The amount of VAB tokens staked.|
|`stakeTime`|`uint256`|The timestamp when the stake was made.|
|`outstandingReward`|`uint256`|The amount of outstanding rewards for the staker reserved after migration has started|

### UserRent
*Struct for storing user rent information from the streaming portal.*


```solidity
struct UserRent {
    uint256 vabAmount;
    uint256 withdrawAmount;
    bool pending;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`vabAmount`|`uint256`|The amount of VAB tokens deposited by the user.|
|`withdrawAmount`|`uint256`|The amount of VAB tokens requested for withdrawal by the user.|
|`pending`|`bool`|Flag indicating if there's a pending withdrawal request for the user.|

### Props
*Struct for storing proposal information.*


```solidity
struct Props {
    address creator;
    uint256 cTime;
    uint256 period;
    uint256 proposalID;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`creator`|`address`|The address of the proposal creator.|
|`cTime`|`uint256`|The creation time of the proposal.|
|`period`|`uint256`|The duration of the proposal.|
|`proposalID`|`uint256`|The ID of the proposal.|

