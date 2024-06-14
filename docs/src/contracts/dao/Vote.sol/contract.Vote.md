# Vote
[Git Source](https://github.com/Mill1995/VABDAO/blob/96e45074ef6d32b9660a684b4e42c099c5b394c6/contracts/dao/Vote.sol)

**Inherits:**
[IVote](/contracts/interfaces/IVote.sol/interface.IVote.md), ReentrancyGuard

*This contract facilitates voting processes related to governance and film approvals within the Vabble ecosystem.
It integrates with other contracts like `StakingPool`, `Property`, and `VabbleDAO` to manage voting rights, stake
amounts, and proposal approval logic.
The contract allows stakeholders (stakers) to vote on proposals regarding governance decisions and films.
The contract includes functionality for:
- Voting on governance proposals for auditor changes, reward address changes, adding film board members and various
property changes.
- Voting on film proposals for funding types, such as listing or distribution.
- Approving film proposals based on voting outcomes.
- Tracking voting periods and stakeholder participation.
Governance proposals and film proposals undergo distinct voting periods, ensuring transparent decision-making and
stakeholder engagement. Stakers are incentivized through rewards managed by the `StakingPool` contract, which
distributes rewards based on voting activity and stake amounts.
This contract is part of the broader Vabble ecosystem governance framework, enabling efficient and fair governance
decision-making processes. It enforces governance rules defined in the `Property` contract and interacts with the
`VabbleDAO` for film-related decisions and status updates.*


## State Variables
### OWNABLE
*The address of the Ownable contract.*


```solidity
address private immutable OWNABLE;
```


### VABBLE_DAO
*The address of the Vabble DAO contract.*


```solidity
address private VABBLE_DAO;
```


### STAKING_POOL
*The address of the Staking Pool contract.*


```solidity
address private STAKING_POOL;
```


### DAO_PROPERTY
*The address of the Property contract.*


```solidity
address private DAO_PROPERTY;
```


### UNI_HELPER
*The address of the Uni Helper contract.*


```solidity
address private UNI_HELPER;
```


### filmVoting
Mapping of film IDs to their corresponding Voting struct.


```solidity
mapping(uint256 => Voting) public filmVoting;
```


### filmBoardVoting
Mapping of film board indices to their corresponding Voting struct.


```solidity
mapping(uint256 => Voting) public filmBoardVoting;
```


### rewardAddressVoting
Mapping of reward address indices to their corresponding Voting struct.


```solidity
mapping(uint256 => Voting) public rewardAddressVoting;
```


### propertyVoting
Mapping of property flags and indices to their corresponding Voting struct.
(flag => (property index => Voting))


```solidity
mapping(uint256 => mapping(uint256 => Voting)) public propertyVoting;
```


### agentVoting
Mapping of agent indices to their corresponding AgentVoting struct.


```solidity
mapping(uint256 => AgentVoting) public agentVoting;
```


### isAttendToFilmVote
Mapping to track if a staker has participated in a film vote.
Maps staker to filmId to true/false.


```solidity
mapping(address => mapping(uint256 => bool)) public isAttendToFilmVote;
```


### isAttendToBoardVote
Mapping to track if a staker has participated in a film board vote.
Maps staker to filmBoard index to true/false.


```solidity
mapping(address => mapping(uint256 => bool)) public isAttendToBoardVote;
```


### isAttendToRewardAddressVote
Mapping to track if a staker has participated in a reward address vote.
Maps staker to rewardAddress index to true/false.


```solidity
mapping(address => mapping(uint256 => bool)) public isAttendToRewardAddressVote;
```


### isAttendToAgentVote
Mapping to track if a staker has participated in an agent vote.
Maps staker to agent index to true/false.


```solidity
mapping(address => mapping(uint256 => bool)) public isAttendToAgentVote;
```


### isAttendToPropertyVote
Mapping to track if a staker has participated in a property vote.
Maps flag to staker to property index to true/false.


```solidity
mapping(uint256 => mapping(address => mapping(uint256 => bool))) public isAttendToPropertyVote;
```


### userFilmVoteCount
Mapping of users to the count of their film votes.


```solidity
mapping(address => uint256) public userFilmVoteCount;
```


### userGovernVoteCount
Mapping of users to the count of their governance votes.


```solidity
mapping(address => uint256) public userGovernVoteCount;
```


### govPassedVoteCount
Mapping of governance flags to the count of passed votes.
Maps flag to passed vote count. Flags: 1 - agent, 2 - dispute, 3 - board, 4 - pool, 5 - property.


```solidity
mapping(uint256 => uint256) public govPassedVoteCount;
```


### lastVoteTime
*Mapping of stakers to their last vote timestamp.
Maps staker address to block.timestamp used at `Property::removeFilmBoardMember()` to check if a film board
member didn't vote during a given time period (which is the `Property::maxAllowPeriod`).*


```solidity
mapping(address => uint256) private lastVoteTime;
```


### proposalFilmIds
*Mapping of film IDs to proposal IDs.*


```solidity
mapping(uint256 => uint256) private proposalFilmIds;
```


## Functions
### onlyDeployer

*Restricts access to the deployer of the Ownable contract.*


```solidity
modifier onlyDeployer();
```

### onlyStaker

*Restricts access to stakers.*


```solidity
modifier onlyStaker();
```

### constructor

Constructor to initialize the ownable address.


```solidity
constructor(address _ownable);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_ownable`|`address`|Address of the ownable contract.|


### initialize

Initialize Vote contract.

*Throws an error if already initialized or if any of the addresses are invalid.
Only the Deployer is allowed to call this.*


```solidity
function initialize(
    address _vabbleDAO,
    address _stakingPool,
    address _property,
    address _uniHelper
)
    external
    onlyDeployer;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_vabbleDAO`|`address`|Address of the VabbleDAO contract.|
|`_stakingPool`|`address`|Address of the StakingPool contract.|
|`_property`|`address`|Address of the Property contract.|
|`_uniHelper`|`address`|Address of the UniHelper contract.|


### voteToProperty

Stakers can vote to a property proposal.

*Throws an error if the caller is not a staker, has already voted, or the vote info is invalid.*


```solidity
function voteToProperty(uint256 _voteInfo, uint256 _index, uint256 _flag) external onlyStaker nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_voteInfo`|`uint256`|Vote information (1 for Yes, 2 for No).|
|`_index`|`uint256`|Index of the proposal.|
|`_flag`|`uint256`|The flag representing the type of property. 0 - Film Vote Period 1 - Agent Vote Period 2 - Dispute Grace Period 3 - Property Vote Period 4 - Lock Period 5 - Reward Rate 6 - Film Reward Claim Period 7 - Max Allow Period 8 - Proposal Fee Amount 9 - Fund Fee Percent 10 - Minimum Deposit Amount 11 - Maximum Deposit Amount 12 - Maximum Mint Fee Percent 13 - Minimum Vote Count 14 - Minimum Staker Count Percent 15 - Available VAB Amount 16 - Board Vote Period 17 - Board Vote Weight 18 - Reward Vote Period 19 - Subscription Amount 20 - Board Reward Rate|


### updateProperty

Finalize property proposal based on vote results.

*Throws an error if the vote period has not ended or the proposal has already been approved.
This will interact with the `Property` contract and update the property proposal accordingly.*


```solidity
function updateProperty(uint256 _index, uint256 _flag) external onlyStaker nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_index`|`uint256`|Index of the proposal.|
|`_flag`|`uint256`|The flag representing the type of property. 0 - Film Vote Period 1 - Agent Vote Period 2 - Dispute Grace Period 3 - Property Vote Period 4 - Lock Period 5 - Reward Rate 6 - Film Reward Claim Period 7 - Max Allow Period 8 - Proposal Fee Amount 9 - Fund Fee Percent 10 - Minimum Deposit Amount 11 - Maximum Deposit Amount 12 - Maximum Mint Fee Percent 13 - Minimum Vote Count 14 - Minimum Staker Count Percent 15 - Available VAB Amount 16 - Board Vote Period 17 - Board Vote Weight 18 - Reward Vote Period 19 - Subscription Amount 20 - Board Reward Rate|


### voteToFilmBoard

Stakers vote to film board member proposal.

*Throws an error if the caller is not a staker, has already voted, or the vote info is invalid.*


```solidity
function voteToFilmBoard(uint256 _index, uint256 _voteInfo) external onlyStaker nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_index`|`uint256`|Index of the proposal.|
|`_voteInfo`|`uint256`|Vote information (1 for Yes, 2 for No).|


### addFilmBoard

Finalize film board member proposal based on vote result.

*Throws an error if the vote period has not ended or the proposal has already been approved.
This will interact with the `Property` contract and update the governance proposal to add a film board member
accordingly.*


```solidity
function addFilmBoard(uint256 _index) external onlyStaker nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_index`|`uint256`|Index of the proposal.|


### voteToAgent

Stakers vote to replace the current Auditor.

*Throws an error if the caller is not a staker, has already voted, or the vote info is invalid.*


```solidity
function voteToAgent(uint256 _voteInfo, uint256 _index) external onlyStaker nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_voteInfo`|`uint256`|Vote information (1 for Yes, 2 for No).|
|`_index`|`uint256`|Index of the proposal.|


### updateAgentStats

Update auditor proposal status based on vote result.

*Throws an error if the vote period has not ended or the proposal has already been updated.
This will enable the auditor dispute period, when the proposal passed voting, otherwise the proposal will be
rejected
and there is no aditional dispute period needed.*


```solidity
function updateAgentStats(uint256 _index) external onlyStaker nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_index`|`uint256`|Index of the proposal.|


### disputeToAgent

Dispute an auditor proposal.

*Throws an error if the proposal status is not updated, or the dispute period has elapsed.
This flow will only be available when the vote period is over and the auditor proposal passed voting.
The user who wants to dispute has to either staked double the amount of the proposal creator or paid double of
the proposal fee amount.*


```solidity
function disputeToAgent(uint256 _index, bool _pay) external onlyStaker nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_index`|`uint256`|Index of the proposal.|
|`_pay`|`bool`|True if disputing by paying double the proposal fee, false if disputing by staking double the creators stake.|


### replaceAuditor

Replace the current Auditor based on vote results.

*Throws an error if the proposal status is not updated or the dispute grace period has not ended.
This can only be called if no one disputes the auditor change during the dispute phase.
This will interact with the `Ownable` & `Property` contract to replace the auditor.*


```solidity
function replaceAuditor(uint256 _index) external onlyStaker nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_index`|`uint256`|Index of the proposal.|


### voteToRewardAddress

Stakers vote on a proposal to set the address to receive the DAO pool funds.

*Throws an error if the caller is not a staker, has already voted, or the vote info is invalid.*


```solidity
function voteToRewardAddress(uint256 _index, uint256 _voteInfo) external onlyStaker nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_index`|`uint256`|Index of the proposal.|
|`_voteInfo`|`uint256`|Vote information (1 for Yes, 2 for No).|


### setDAORewardAddress

Finalize reward address proposal based on vote result.

*Throws an error if the vote period has not ended or the proposal has already been approved.
This will interact with the `Property` contract and update the governance proposal to set the reward address
accordingly. This will also trigger the `migration` flow of the DAO.*


```solidity
function setDAORewardAddress(uint256 _index) external onlyStaker nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_index`|`uint256`|Index of the proposal.|


### voteToFilms

Vote on multiple films in a single transaction.

*Throws an error if the arrays are of different lengths or if any vote info is invalid.*


```solidity
function voteToFilms(uint256[] calldata _filmIds, uint256[] calldata _voteInfos) external onlyStaker nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmIds`|`uint256[]`|Array of film IDs to vote on.|
|`_voteInfos`|`uint256[]`|Array of vote information (1 for Yes, 2 for No) corresponding to each film.|


### approveFilms

Approve multiple films that have passed their vote period.

*Throws an error if the arrays are empty or exceed the maximum allowed length.*


```solidity
function approveFilms(uint256[] calldata _filmIds) external onlyStaker nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmIds`|`uint256[]`|Array of film IDs to approve.|


### saveProposalWithFilm

Save the proposal ID associated with a film ID.


```solidity
function saveProposalWithFilm(uint256 _filmId, uint256 _proposalID) external override;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|The ID of the film.|
|`_proposalID`|`uint256`|The ID of the proposal.|


### getLastVoteTime

Get the last vote time of a member.

*This is used to track if a filmboard member can be removed because he didn't voted for a given time period.*


```solidity
function getLastVoteTime(address _member) external view override returns (uint256 time_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_member`|`address`|The address of the member.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`time_`|`uint256`|The last vote time of the member.|


### isDoubleStaked

Check if a user has staked double the amount of the auditor change proposer.

*This is used to check if a user can dispute a auditor proposal.*


```solidity
function isDoubleStaked(uint256 _index, address _user) public view returns (bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_index`|`uint256`|The index of the proposal.|
|`_user`|`address`|The address of the user.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|True if the user has staked double the amount, false otherwise.|


### __voteToFilm

*Function to handle voting on a film.*

*This function handles the logic for voting on a film proposal.
It throws an error if:
- The caller is the owner of the film.
- The caller has already voted on this film.
- The provided vote information is not 1 or 2.
It also checks the status of the film and the voting period, and updates the voting records and the caller's vote
count.*


```solidity
function __voteToFilm(uint256 _filmId, uint256 _voteInfo) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|The ID of the film to vote on.|
|`_voteInfo`|`uint256`|Vote information where 1 indicates 'Yes' and 2 indicates 'No'.|


### __approveFilm

*Function to approve a film based on voting results.*

*This function finalizes the film approval process based on the voting results.
It throws an error if:
- The voting period has not ended.
- The film has already been approved.
The function checks the voting outcomes and updates the film's approval status accordingly, also recording the
reason for the decision.*


```solidity
function __approveFilm(uint256 _filmId) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|The ID of the film to approve.|


### __paidDoubleFee

*Function to check if the proposal fee has been paid double.*

*This function verifies if the user has paid double the required proposal fee in VAB tokens.
A staker that wants to dispute a auditor proposal needs to either pay double the fee or stake double of the
creator.
It checks the user's balance, transfers the fee amount to the staking pool, and updates the staking pool's reward
balance.
The function returns true if the payment is successful, otherwise false.*


```solidity
function __paidDoubleFee() private returns (bool paid_);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`paid_`|`bool`|Returns true if the fee has been paid double, otherwise false.|


### __isVotePeriod

*Function to check if the vote period is still ongoing.*

*This function calculates if the current time is within the vote period duration from the start time.
It throws an error if the start time is zero.*


```solidity
function __isVotePeriod(uint256 _period, uint256 _startTime) private view returns (bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_period`|`uint256`|The duration of the vote period in seconds.|
|`_startTime`|`uint256`|The start time of the vote period as a Unix timestamp.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|Returns true if the vote period is still ongoing, otherwise false.|


## Events
### VotedToProperty
Emitted when a vote is cast for a property.


```solidity
event VotedToProperty(address indexed voter, uint256 flag, uint256 propertyVal, uint256 voteInfo, uint256 index);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`voter`|`address`|The address of the voter.|
|`flag`|`uint256`|The flag indicating the property type.|
|`propertyVal`|`uint256`|The value of the property.|
|`voteInfo`|`uint256`|The vote information.|
|`index`|`uint256`|The index of the property proposal.|

### VotedToAgent
Emitted when a vote is cast for an agent.


```solidity
event VotedToAgent(address indexed voter, address indexed agent, uint256 voteInfo, uint256 index);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`voter`|`address`|The address of the voter.|
|`agent`|`address`|The address of the agent being voted on.|
|`voteInfo`|`uint256`|The vote information (1 for yes, 2 for no).|
|`index`|`uint256`|The index of the agent proposal.|

### VotedToPoolAddress
Emitted when a vote is cast for a reward address.


```solidity
event VotedToPoolAddress(address indexed voter, address rewardAddress, uint256 voteInfo, uint256 index);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`voter`|`address`|The address of the voter.|
|`rewardAddress`|`address`|The address of the reward.|
|`voteInfo`|`uint256`|The vote information.|
|`index`|`uint256`|The index of the reward address proposal.|

### VotedToFilmBoard
Emitted when a vote is cast for a film board member.


```solidity
event VotedToFilmBoard(address indexed voter, address candidate, uint256 voteInfo, uint256 index);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`voter`|`address`|The address of the voter.|
|`candidate`|`address`|The address of the candidate.|
|`voteInfo`|`uint256`|The vote information.|
|`index`|`uint256`|The index of the film board proposal.|

### VotedToFilm
Emitted when a vote is cast for a film.


```solidity
event VotedToFilm(address indexed voter, uint256 indexed filmId, uint256 voteInfo);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`voter`|`address`|The address of the voter.|
|`filmId`|`uint256`|The ID of the film being voted on.|
|`voteInfo`|`uint256`|The vote information (1 for yes, 2 for no).|

### PropertyUpdated
Emitted when a property is updated.


```solidity
event PropertyUpdated(
    uint256 indexed whichProperty, uint256 propertyValue, address caller, uint256 reason, uint256 index
);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`whichProperty`|`uint256`|The ID of the property.|
|`propertyValue`|`uint256`|The value of the property.|
|`caller`|`address`|The address of the caller who updated the property.|
|`reason`|`uint256`|The reason for the update.|
|`index`|`uint256`|The index of the property proposal.|

### UpdatedAgentStats
Emitted when agent stats are updated.


```solidity
event UpdatedAgentStats(address indexed agent, address caller, uint256 reason, uint256 index);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`agent`|`address`|The address of the agent.|
|`caller`|`address`|The address of the caller who updated the stats.|
|`reason`|`uint256`|The reason for the update.|
|`index`|`uint256`|The index of the agent proposal.|

### DisputedToAgent
Emitted when a dispute is raised against an agent.


```solidity
event DisputedToAgent(address indexed caller, address indexed agent, uint256 index);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`caller`|`address`|The address of the caller raising the dispute.|
|`agent`|`address`|The address of the agent being disputed.|
|`index`|`uint256`|The index of the agent proposal.|

### AuditorReplaced
Emitted when an auditor is replaced.


```solidity
event AuditorReplaced(address indexed agent, address caller);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`agent`|`address`|The address of the replaced agent.|
|`caller`|`address`|The address of the caller who replaced the auditor.|

### PoolAddressAdded
Emitted when a pool address is added.


```solidity
event PoolAddressAdded(address indexed pool, address caller, uint256 reason, uint256 index);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`pool`|`address`|The address of the pool.|
|`caller`|`address`|The address of the caller who added the pool address.|
|`reason`|`uint256`|The reason for adding the pool address.|
|`index`|`uint256`|The index of the pool address proposal.|

### FilmBoardAdded
Emitted when a film board member is added.


```solidity
event FilmBoardAdded(address indexed boardMember, address caller, uint256 reason, uint256 index);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`boardMember`|`address`|The address of the new board member.|
|`caller`|`address`|The address of the caller who added the board member.|
|`reason`|`uint256`|The reason for adding the board member.|
|`index`|`uint256`|The index of the film board proposal.|

### FilmApproved
Emitted when a film is approved.


```solidity
event FilmApproved(uint256 indexed filmId, uint256 fundType, uint256 reason);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`filmId`|`uint256`|The ID of the film.|
|`fundType`|`uint256`|The type of fund (0 for distribution, 1 for funding).|
|`reason`|`uint256`|The reason for approval.|

## Structs
### Voting
*Struct representing the details of a voting process.*


```solidity
struct Voting {
    uint256 stakeAmount_1;
    uint256 stakeAmount_2;
    uint256 voteCount_1;
    uint256 voteCount_2;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`stakeAmount_1`|`uint256`|The total amount staked by voters who voted "yes".|
|`stakeAmount_2`|`uint256`|The total amount staked by voters who voted "no".|
|`voteCount_1`|`uint256`|The total number of votes cast as "yes".|
|`voteCount_2`|`uint256`|The total number of votes cast as "no".|

### AgentVoting
*Struct representing the details of an agent-specific voting process.*


```solidity
struct AgentVoting {
    uint256 stakeAmount_1;
    uint256 stakeAmount_2;
    uint256 voteCount_1;
    uint256 voteCount_2;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`stakeAmount_1`|`uint256`|The total amount staked by voters who voted "yes".|
|`stakeAmount_2`|`uint256`|The total amount staked by voters who voted "no".|
|`voteCount_1`|`uint256`|The total number of votes cast as "yes".|
|`voteCount_2`|`uint256`|The total number of votes cast as "no".|

