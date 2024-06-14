# StakingPool
[Git Source](https://github.com/Mill1995/VABDAO/blob/9050477259e61daa6bf97d9f648c5d24a5f80da7/contracts/dao/StakingPool.sol)

**Inherits:**
ReentrancyGuard

This contract manages a staking pool where users can stake VAB tokens to earn rewards based on their staked
amount and participation in governance activities.
The contract handles staking, unstaking, calculating rewards, and distributing rewards to stakers.
It also facilitates  participation in governance by allowing stakers to vote on proposals and earn rewards based on
their voting activities.
Stakers can:
- Stake VAB tokens to participate in the staking pool.
- Earn rewards based on the amount staked and their participation in governance activities such as voting on
proposals.
- Unstake their tokens after a lock period to withdraw their staked amount and any earned rewards.
- Vote on proposals submitted to the governance system, this includes governance and film proposals.
The contract calculates rewards based on the staking period, the amount staked, and the user's participation in
governance.
During a migration process, stakers can withdraw their staked tokens and any accrued rewards without earning new
rewards until the migration is complete.
The contract ensures that stakers can safely withdraw their funds during this period
while maintaining the integrity of the staking pool and ongoing governance activities.
Stakers are informed about the migration status, allowing them to make informed decisions regarding their staked
amounts and participation in governance activities.
This contract plays a critical role in the Vabble ecosystem by providing a secure and efficient platform for staking
VAB tokens for participating in governance decisions and earning rewards.


## State Variables
### OWNABLE
*The Ownablee contract address*


```solidity
address private immutable OWNABLE;
```


### VOTE
*The Vote contract address*


```solidity
address private VOTE;
```


### VABBLE_DAO
*The VabbleDAO contract address*


```solidity
address private VABBLE_DAO;
```


### DAO_PROPERTY
*The Property contract address*


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
Migration status of the contract:
- 0: not started
- 1: started
- 2: ended


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

Count starts from 1


```solidity
Counters.Counter public proposalCount;
```


### stakerMap
*Struct to store staker information*


```solidity
Staker private stakerMap;
```


### propsList
*Array to store proposal information, needed for calculating rewards*


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

*This can't be called when a migration has started*


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

*This can't be called when a migration has started*


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

*This can't be called when a migration has started.*


```solidity
function depositVAB(uint256 _amount) external onlyNormal nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_amount`|`uint256`|Amount of VAB tokens to deposit|


### pendingWithdraw

Request a withdrawal of VAB tokens from the streaming portal

*this is the counter part of the `depositVAB` function*

*users can only request one withdrawal at a time, then the Auditor needs to approve or deny the withdraw
request*


```solidity
function pendingWithdraw(uint256 _amount) external nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_amount`|`uint256`|Amount of VAB tokens to withdraw|


### approvePendingWithdraw

Approve pending withdrawals of given users by Auditor

*A user has to call `pendingWithdraw` before*


```solidity
function approvePendingWithdraw(address[] calldata _customers) external onlyAuditor nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_customers`|`address[]`|Array of user addresses|


### denyPendingWithdraw

Deny pending withdrawal of given users by Auditor


```solidity
function denyPendingWithdraw(address[] calldata _customers) external onlyAuditor nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_customers`|`address[]`|Array of user addresses|


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


### calcMigrationVAB

Calculate VAB amount able to be migrated and for each staker to receive

*This can only be called by the `Property::updateGovProposal()` function.*

*After a proposal to change the reward Address has passed Governance Voting, we calculate the total VAB we
can migrate to a new address. All users should receive their outstanding VAB rewards.*

*After calling this function the migrationStatus will be set to 1 and stakers wont receive any new rewards.*

*All stakers can immediately unstake their VAB.*


```solidity
function calcMigrationVAB() external onlyNormal nonReentrant;
```

### withdrawAllFund

Transfer all funds from the StakingPool, EdgePool and StudioPool to a new address

*This will be called by the Auditor after a proposal to change the reward Address
`Property::proposalRewardFund()` has passed Governance Voting and has been finalized.*

*The `to` address is the address voted for by Governance.*

*This can only be called after `calcMigrationVAB`.*

*All VAB tokens will be transfered and the migration status will be updated to 2 (ended).*


```solidity
function withdrawAllFund() external onlyAuditor nonReentrant;
```

### addVotedData

Add voted data for a staker when they vote on (Governance / Film) proposals

*We need this so we can track if a user has voted on a proposal in order to calculate rewards*


```solidity
function addVotedData(address _user, uint256 _time, uint256 _proposalID) external onlyVote;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_user`|`address`|Address of the user|
|`_time`|`uint256`|Time of the vote|
|`_proposalID`|`uint256`|ID of the proposal|


### updateLastfundProposalCreateTime

Update the last creation time of a film proposal that is for funding


```solidity
function updateLastfundProposalCreateTime(uint256 _time) external onlyDAO;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_time`|`uint256`|New creation time|


### addProposalData

Add proposal data used for calculating staking rewards

*This must be called when a Governance / Film proposal is created*


```solidity
function addProposalData(address _creator, uint256 _cTime, uint256 _period) external returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_creator`|`address`|Address of the proposal creator|
|`_cTime`|`uint256`|Creation time of the proposal|
|`_period`|`uint256`|Vote period of the proposal|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|proposalID ID of the new proposal|


### checkAllocateToPool

Function to validate if `sendVAB()` can be called with the given arguments

*Should be called before `VabbleDAO::allocateToPool()` to ensure that the arguments are valid*


```solidity
function checkAllocateToPool(address[] calldata _users, uint256[] calldata _amounts) external view returns (bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_users`|`address[]`|Array of user addresses|
|`_amounts`|`uint256[]`|Array of amounts to allocate|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|bool True if allocation is valid, otherwise false|


### checkDenyPendingWithDraw

Check if pending withdrawals can be denied

*Should be called before `denyPendingWithdraw()`*


```solidity
function checkDenyPendingWithDraw(address[] calldata _customers) external view returns (bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_customers`|`address[]`|Array of user addresses|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|bool True if withdrawals can be denied, otherwise false|


### checkApprovePendingWithdraw

Check if pending withdrawals can be approved

*Should be called before `approvePendingWithdraw()`*


```solidity
function checkApprovePendingWithdraw(address[] calldata _customers) external view returns (bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_customers`|`address[]`|Array of user addresses|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|bool True if withdrawals can be approved, otherwise false|


### calculateAPR

Calculate APR (Annual Percentage Rate) for staking/pending rewards


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
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_period`|`uint256`|The staking period in days (e.g., 2 days, 32 days, 365 days)|
|`_stakeAmount`|`uint256`|The amount of VAB staked (e.g., 100 VAB)|
|`_proposalCount`|`uint256`|The number of proposals during the staking period|
|`_voteCount`|`uint256`|The number of votes cast by the staker during the staking period|
|`isBoardMember`|`bool`|Indicates whether the staker is a film board member|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amount_`|`uint256`|The calculated APR amount for the specified staking period and conditions|


### getStakeAmount

Get VAB staking amount for an address


```solidity
function getStakeAmount(address _user) external view returns (uint256 amount_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_user`|`address`|The address of the user|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amount_`|`uint256`|The staking amount of the user|


### getRentVABAmount

Get user rent VAB amoun

*This is the amount that was deposited on the streaming portal used to rent films*


```solidity
function getRentVABAmount(address _user) external view returns (uint256 amount_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_user`|`address`|The address of the user|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amount_`|`uint256`|The VAB amount of the user|


### getLimitCount

Get minimum amount of stakers that needs to vote for a proposal to pass

*This is a threshold for proposals in order to pass*


```solidity
function getLimitCount() external view returns (uint256 count_);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`count_`|`uint256`|The count of stakers for voting|


### getWithdrawableTime

Get the time when a staker can withdraw / unstake his VAB


```solidity
function getWithdrawableTime(address _user) external view returns (uint256 time_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_user`|`address`|The address of the user|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`time_`|`uint256`|The time when the user can withdraw their stake|


### getStakerList

Get the list of all stakers


```solidity
function getStakerList() external view returns (address[] memory);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`address[]`|An array of addresses representing all stakers|


### calcRewardAmount

Calculate the VAB reward amount for a user including previous rewards

*When a migration has started returns the outstanding rewards and doesn't generate new rewards*


```solidity
function calcRewardAmount(address _user) public view returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_user`|`address`|The address of the user|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The total reward amount for the user|


### __calcProposalTimeIntervals

Calculate the proposal time intervals for a user.
This function computes the start and end times of all proposals that overlap with the staking period of a user.
The resulting array includes the user's stake time, the start and end times of the relevant proposals, and the
current block timestamp.

*The function retrieves proposals from the `propsList` array and checks if their end time is greater than or
equal to the user's stake time.
It constructs an array containing the user's stake time, the start and end times of the overlapping proposals,
and the current block timestamp.*


```solidity
function __calcProposalTimeIntervals(address _user) public view returns (uint256[] memory times_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_user`|`address`|The address of the user for whom the proposal time intervals are calculated.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`times_`|`uint256[]`|An array of timestamps representing the proposal time intervals. The array is sorted in ascending order and includes: - The user's stake time at index 0. - The start and end times of the overlapping proposals. - The current block timestamp as the last element.|


### __getProposalVoteCount

Get the count of proposals, votes, and pending votes within a specific time interval for a user.
This function calculates the number of proposals, the number of votes cast by the user, and the number of pending
votes within a specified time interval.

*The function iterates through the `propsList` array starting from `minIndex,
and counts proposals whose creation time falls within the interval [_start, _end].
It also counts the number of votes cast by the user during this period and pending votes.*


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
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_user`|`address`|The address of the user for whom the vote count is calculated.|
|`minIndex`|`uint256`|The minimum index of the proposals to consider.|
|`_start`|`uint256`|The start time of the interval in which the votes are counted.|
|`_end`|`uint256`|The end time of the interval in which the votes are counted.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|pCount The total number of proposals within the interval.|
|`<none>`|`uint256`|vCount The number of votes cast by the user within the interval.|
|`<none>`|`uint256`|pendingVoteCount The number of pending votes within the interval.|


### calcRealizedRewards

Calculate the realized rewards for a user
This function calculates the realized rewards for a user based on the proposals they have voted on and the
intervals between proposals within the staking period.


```solidity
function calcRealizedRewards(address _user) public view returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_user`|`address`|The address of the user for whom the realized rewards are being calculated.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|realizeReward The total realized rewards for the user.|


### calcPendingRewards

Calculate the pending rewards for a user
This function calculates the pending rewards for a user based on the proposals they are yet to vote on within the
specified intervals between proposals within the staking period.


```solidity
function calcPendingRewards(address _user) public view returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_user`|`address`|The address of the user for whom the pending rewards are being calculated.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|pendingReward The total pending rewards for the user.|


### stakerCount

Get the count of stakers


```solidity
function stakerCount() public view returns (uint256);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The total number of stakers|


### getOwnableAddress

Get the address of the Ownable contract


```solidity
function getOwnableAddress() public view returns (address);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`address`|The address of the Ownable contract|


### getVoteAddress

Get the address of the Vote contract


```solidity
function getVoteAddress() public view returns (address);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`address`|The address of the Vote contract|


### getVabbleDaoAddress

Get the address of the VabbleDAO contract


```solidity
function getVabbleDaoAddress() public view returns (address);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`address`|The address of the VabbleDAO contract|


### getPropertyAddress

Get the address of the Property contract


```solidity
function getPropertyAddress() public view returns (address);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`address`|The address of the Property contract|


### __withdrawReward

*Transfer reward amount to the user and update relevant states
This function handles the transfer of the reward amount to the user, updates the total reward amount,
received reward amount, and the user's stake information. It also emits the RewardWithdraw event
and updates the minimum proposal index for the user.*


```solidity
function __withdrawReward(uint256 _amount) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_amount`|`uint256`|The amount of reward to be withdrawn|


### __updateMinProposalIndex

*Update the minimum proposal index for a user
This function updates the minimum proposal index for a user by iterating through the proposals
and finding the first proposal whose end time is greater than or equal to the user's stake time.*


```solidity
function __updateMinProposalIndex(address _user) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_user`|`address`|The address of the user whose minimum proposal index is being updated|


### __stakerSet

*Add a staker to the staker map
This function adds a staker to the staker map if they are not already present.*


```solidity
function __stakerSet(address key) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`key`|`address`|The address of the staker to be added|


### __stakerRemove

*Remove a staker from the staker map
This function removes a staker from the staker map if they are present.*


```solidity
function __stakerRemove(address key) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`key`|`address`|The address of the staker to be removed|


### __transferVABWithdraw

*Transfer VAB tokens to fulfill a user's withdrawal request on the streaming portal*


```solidity
function __transferVABWithdraw(address _to) private returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_to`|`address`|The address of the user to whom the VAB tokens are being transferred|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|payAmount The amount of VAB tokens transferred to the user|


### __calcRewards

*Calculate the rewards for a user within a specific time period
This function calculates the rewards for a user based on their stake amount and the time period specified.
If the user is a film board member, additional rewards are included.*


```solidity
function __calcRewards(address _user, uint256 startTime, uint256 endTime) private view returns (uint256 amount_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_user`|`address`|The address of the user for whom the rewards are being calculated|
|`startTime`|`uint256`|The start time of the reward calculation period|
|`endTime`|`uint256`|The end time of the reward calculation period|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amount_`|`uint256`|The calculated reward amount for the user|


### __rewardPercent

*Calculate the reward percentage based on the staking amount
This function calculates the reward percentage for a user based on their staking amount
and the total staking amount.*


```solidity
function __rewardPercent(uint256 _stakingAmount) private view returns (uint256 percent_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_stakingAmount`|`uint256`|The amount staked by the user|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`percent_`|`uint256`|The calculated reward percentage for the user|


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

