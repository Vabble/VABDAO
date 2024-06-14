# Property
[Git Source](https://github.com/Mill1995/VABDAO/blob/4914bdc306cbdb860037485ce4bcebbfdd390c9f/contracts/dao/Property.sol)

**Inherits:**
ReentrancyGuard

This contract manages various types of governance and property proposals
within a decentralized autonomous organization (DAO). It facilitates
proposals related to governance changes, property settings, and membership
adjustments for different roles within the organization.

*The contract allows major stakeholders and stakers to propose and vote on
changes that impact the organization's governance, including adding or
replacing auditors, adding new film board members, and modifying various
operational parameters such as voting periods, fee amounts, and reward rates.*

*Major stakeholders, identified as those staking a significant amount of the
organization's native token (VAB), have exclusive rights to propose changes
such as adding auditors or modifying reward fund addresses.*

*Stakers, who hold tokens and participate in the organization's activities,
can propose changes related to the film board membership and various other properties.
They can also initiate the removal of film board members based on inactivity criteria.*

*The contract ensures that proposals are paid for using a fee mechanism,
converting USDC tokens to VAB tokens via Uniswap. This fee is essential for
incentivizing serious proposals and ensuring they are adequately funded.*

*Governance proposals and property proposals are tracked separately, with
detailed information stored for each proposal type. This includes creation
timestamps, approval statuses, proposal IDs, proposer addresses, and more.*

*Functions in this contract are restricted to specific roles (onlyMajor,
onlyStaker) to maintain security and prevent unauthorized access to critical
functions such as proposal creation, voting status updates, and membership
adjustments.*

*Additionally, the contract provides public and external functions for querying
proposal details, checking whitelist statuses of addresses and properties,
and retrieving lists of active governance proposals and property proposals.*

*This contract forms a crucial part of the DAO's governance framework, ensuring
that decisions are made transparently, securely, and in accordance with the
organization's operational needs and community consensus.*


## State Variables
### OWNABLE
*The address of the Ownablee contract*


```solidity
address private immutable OWNABLE;
```


### VOTE
*The address of the Vote contract*


```solidity
address private immutable VOTE;
```


### STAKING_POOL
*The address of the StakingPool contract*


```solidity
address private immutable STAKING_POOL;
```


### UNI_HELPER
*The address of the UniHelper contract*


```solidity
address private immutable UNI_HELPER;
```


### DAO_FUND_REWARD
The address for sending the VAB from StakingPool, EdgePool and StudioPool when a proposal to change the
reward address passed.

*This is the address where all of the VAB tokens will be send when calling `StakingPool::withdrawAllFund()`.
This address will be updated to the address that was added in the proposal, once it has been finalized.*


```solidity
address public DAO_FUND_REWARD;
```


### minPropertyList
*contains the minimum values for each property change*


```solidity
uint256[] private minPropertyList;
```


### maxPropertyList
*contains the maximum values for each property change*


```solidity
uint256[] private maxPropertyList;
```


### governanceProposalCount
total count of all governance proposals


```solidity
uint256 public governanceProposalCount;
```


### agentList
*List of agents proposed for replacing the auditor.*


```solidity
Agent[] private agentList;
```


### rewardAddressList
*List of addresses proposed for receiving all pool funds (migrations proceess).*


```solidity
address[] private rewardAddressList;
```


### filmBoardCandidates
*List of candidates proposed for the filmBoard.*


```solidity
address[] private filmBoardCandidates;
```


### filmBoardMembers
*List of current filmBoard members.*


```solidity
address[] private filmBoardMembers;
```


### isGovWhitelist
*Whitelist status for governance roles (flag: 1 => agent, 2 => board, 3 => reward).
Maps flag to address and status (0: no, 1: candidate, 2: member).*


```solidity
mapping(uint256 => mapping(address => uint256)) private isGovWhitelist;
```


### isPropertyWhitelist
*Whitelist status for properties (flag => property i.e. 0 => filmVotePeriod).
Maps flag to property and status (0: no, 1: candidate, 2: member).*


```solidity
mapping(uint256 => mapping(uint256 => uint256)) private isPropertyWhitelist;
```


### govProposalInfo
*Information about governance proposals. Maps flag to proposal index and proposal details.*


```solidity
mapping(uint256 => mapping(uint256 => GovProposal)) private govProposalInfo;
```


### proProposalInfo
*Information about property proposals. Maps flag to proposal index and proposal details.*


```solidity
mapping(uint256 => mapping(uint256 => ProProposal)) private proProposalInfo;
```


### allGovProposalInfo
*List of addresses associated with all governance proposals. Maps flag to address array.*


```solidity
mapping(uint256 => address[]) private allGovProposalInfo;
```


### userGovProposalCount
*Count of governance proposals created by each user. Maps user address to proposal count.*


```solidity
mapping(address => uint256) public userGovProposalCount;
```


### filmVotePeriod
The amount of time a vote for a film proposal is open for

*index/flag : 0*


```solidity
uint256 public filmVotePeriod;
```


### filmVotePeriodList

```solidity
uint256[] private filmVotePeriodList;
```


### agentVotePeriod
The amount of time a vote to change the auditor is open for

*index/flag : 1*


```solidity
uint256 public agentVotePeriod;
```


### agentVotePeriodList

```solidity
uint256[] private agentVotePeriodList;
```


### disputeGracePeriod
The amount of time the dispute period is open for, when a proposal to change the Auditor passed Voting

*index/flag : 2*


```solidity
uint256 public disputeGracePeriod;
```


### disputeGracePeriodList

```solidity
uint256[] private disputeGracePeriodList;
```


### propertyVotePeriod
The amount of time a vote to change a property state is open for

*index/flag : 3*


```solidity
uint256 public propertyVotePeriod;
```


### propertyVotePeriodList

```solidity
uint256[] private propertyVotePeriodList;
```


### lockPeriod
The amount of time VAB tokens are locked when added to the staking pool contract.

*index/flag : 4*


```solidity
uint256 public lockPeriod;
```


### lockPeriodList

```solidity
uint256[] private lockPeriodList;
```


### filmRewardClaimPeriod
The period after the auditor can submit the films reward results

*index/flag : 6*


```solidity
uint256 public filmRewardClaimPeriod;
```


### filmRewardClaimPeriodList

```solidity
uint256[] private filmRewardClaimPeriodList;
```


### maxAllowPeriod
The maximum allowed period (in seconds) for removing film board members due to inactivity.

*Used to check if a film board member has been inactive (i.e., not voting) for longer than this period.
It also ensures that the most recent fund proposal creation is within this period.*

*index/flag : 7*


```solidity
uint256 public maxAllowPeriod;
```


### maxAllowPeriodList

```solidity
uint256[] private maxAllowPeriodList;
```


### boardVotePeriod
The amount of time a vote to add a film board member is open for

*index/flag : 16*


```solidity
uint256 public boardVotePeriod;
```


### boardVotePeriodList

```solidity
uint256[] private boardVotePeriodList;
```


### rewardVotePeriod
The amount of time a vote to change the reward address (moving pool funds) is open for

*index/flag : 18*


```solidity
uint256 public rewardVotePeriod;
```


### rewardVotePeriodList

```solidity
uint256[] private rewardVotePeriodList;
```


### rewardRate
The amount of daily rewards for staking
(1% = 1e8, 100% = 1e10)

*index/flag : 5*


```solidity
uint256 public rewardRate;
```


### rewardRateList

```solidity
uint256[] private rewardRateList;
```


### boardRewardRate
The reward rate Film Board members receive on top of normal staking rewards
(1% = 1e8, 100% = 1e10)

*index/flag : 20*


```solidity
uint256 public boardRewardRate;
```


### boardRewardRateList

```solidity
uint256[] private boardRewardRateList;
```


### proposalFeeAmount
The amount to submit a proposal to the DAO

*index/flag : 8*


```solidity
uint256 public proposalFeeAmount;
```


### proposalFeeAmountList

```solidity
uint256[] private proposalFeeAmountList;
```


### fundFeePercent
The amount of funding fees the DAO takes for film financing proposal raises.

*index/flag : 9*


```solidity
uint256 public fundFeePercent;
```


### fundFeePercentList

```solidity
uint256[] private fundFeePercentList;
```


### minDepositAmount
The minimum amount to deposit per individual on film financing proposals.

*index/flag : 10*


```solidity
uint256 public minDepositAmount;
```


### minDepositAmountList

```solidity
uint256[] private minDepositAmountList;
```


### maxDepositAmount
The maximum amount to deposit per individual on film financing proposals.

*index/flag : 11*


```solidity
uint256 public maxDepositAmount;
```


### maxDepositAmountList

```solidity
uint256[] private maxDepositAmountList;
```


### maxMintFeePercent
The maximum percent fee Vab DAO takes for minting an NFT collection.

*index/flag : 12*


```solidity
uint256 public maxMintFeePercent;
```


### maxMintFeePercentList

```solidity
uint256[] private maxMintFeePercentList;
```


### subscriptionAmount
The monthly fee rate for streaming content on Vabble Streaming.

*index/flag : 19*


```solidity
uint256 public subscriptionAmount;
```


### subscriptionAmountList

```solidity
uint256[] private subscriptionAmountList;
```


### minVoteCount
The minimum amount of people that need to vote for a proposal to pass

*This variable represents the threshold count of voters required for a proposal to be considered valid.*

*index/flag : 13*


```solidity
uint256 public minVoteCount;
```


### minVoteCountList

```solidity
uint256[] private minVoteCountList;
```


### minStakerCountPercent
The minimum percentage of stakers that need to vote for a proposal to pass

*This percentage is used to calculate the required number of stakers based on the total staker count.*

*index/flag: 14*


```solidity
uint256 public minStakerCountPercent;
```


### minStakerCountPercentList

```solidity
uint256[] private minStakerCountPercentList;
```


### availableVABAmount
The amount of VAB a user has to stake in order to create a proposal to change the auditor/reward address

*index/flag: 15*


```solidity
uint256 public availableVABAmount;
```


### availableVABAmountList

```solidity
uint256[] private availableVABAmountList;
```


### boardVoteWeight
The percentage weight Film Board members have in voting on proposals.

*index/flag: 17*


```solidity
uint256 public boardVoteWeight;
```


### boardVoteWeightList

```solidity
uint256[] private boardVoteWeightList;
```


## Functions
### onlyVote

*Restricts access to the Vote contract.*


```solidity
modifier onlyVote();
```

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

### onlyMajor

Ensures that the caller is a major staker


```solidity
modifier onlyMajor();
```

### constructor

Constructor to initialize the contract with required addresses and parameters

*Sets up the min and max allowed parameters for property changes*


```solidity
constructor(address _ownable, address _uniHelper, address _vote, address _staking);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_ownable`|`address`|Address of the Ownablee contract|
|`_uniHelper`|`address`|Address of the UniHelper contract|
|`_vote`|`address`|Address of the Vote contract|
|`_staking`|`address`|Address for sending the DAO rewards fund|


### proposalProperty

Creates a proposal to update a specific property with the provided details.

*Only callable by a staker. Ensures the property and flag values are within valid ranges and that the
property is not already a candidate or the current value of the property.*


```solidity
function proposalProperty(
    uint256 _property,
    uint256 _flag,
    string memory _title,
    string memory _description
)
    external
    onlyStaker
    nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_property`|`uint256`|The property value to propose.|
|`_flag`|`uint256`|The flag representing the type of property. 0 - Film Vote Period 1 - Agent Vote Period 2 - Dispute Grace Period 3 - Property Vote Period 4 - Lock Period 5 - Reward Rate 6 - Film Reward Claim Period 7 - Max Allow Period 8 - Proposal Fee Amount 9 - Fund Fee Percent 10 - Minimum Deposit Amount 11 - Maximum Deposit Amount 12 - Maximum Mint Fee Percent 13 - Minimum Vote Count 14 - Minimum Staker Count Percent 15 - Available VAB Amount 16 - Board Vote Period 17 - Board Vote Weight 18 - Reward Vote Period 19 - Subscription Amount 20 - Board Reward Rate|
|`_title`|`string`|The title of the proposal.|
|`_description`|`string`|The description of the proposal.|


### updatePropertyProposal

Updates the status of a property proposal.
If the proposal passed voting, this will update the property to the new value.

*Only callable by `Vote::updateProperty()` after the voting period has elapsed.
Updates the approval status and the whitelist status of the property.*


```solidity
function updatePropertyProposal(uint256 _index, uint256 _flag, uint256 _approveStatus) external onlyVote;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_index`|`uint256`|The index of the proposal to update.|
|`_flag`|`uint256`|The flag representing the type of property. 0 - Film Vote Period 1 - Agent Vote Period 2 - Dispute Grace Period 3 - Property Vote Period 4 - Lock Period 5 - Reward Rate 6 - Film Reward Claim Period 7 - Max Allow Period 8 - Proposal Fee Amount 9 - Fund Fee Percent 10 - Minimum Deposit Amount 11 - Maximum Deposit Amount 12 - Maximum Mint Fee Percent 13 - Minimum Vote Count 14 - Minimum Staker Count Percent 15 - Available VAB Amount 16 - Board Vote Period 17 - Board Vote Weight 18 - Reward Vote Period 19 - Subscription Amount 20 - Board Reward Rate|
|`_approveStatus`|`uint256`|The approval status (1 for approved, 0 for rejected).|


### proposalAuditor

Creates a proposal to replace the current auditor with a new agent.

*Only callable by a major stakeholder (needs to stake at least `availableVABAmount`).
Ensures the agent is not already the auditor or a candidate.*


```solidity
function proposalAuditor(
    address _agent,
    string memory _title,
    string memory _description
)
    external
    onlyMajor
    nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_agent`|`address`|The address of the proposed new auditor.|
|`_title`|`string`|The title of the proposal.|
|`_description`|`string`|The description of the proposal.|


### proposalRewardFund

Creates a proposal to add a new reward fund address.
This will be used if we need to do a migration to a new DAO.
The address proposed will receive all of the VAB from the Edge,Studio and StakingPool.

*Only callable by a major stakeholder (needs to stake at least `availableVABAmount`).
Ensures the address is not already a candidate.*


```solidity
function proposalRewardFund(
    address _rewardAddress,
    string memory _title,
    string memory _description
)
    external
    onlyMajor
    nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_rewardAddress`|`address`|The address proposed to receive all of the tokens.|
|`_title`|`string`|The title of the proposal.|
|`_description`|`string`|The description of the proposal.|


### proposalFilmBoard

Creates a proposal to add a new member to the film board.

*Only callable by a staker. Ensures the member is not already a candidate.*


```solidity
function proposalFilmBoard(
    address _member,
    string memory _title,
    string memory _description
)
    external
    onlyStaker
    nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_member`|`address`|The address of the proposed new film board member.|
|`_title`|`string`|The title of the proposal.|
|`_description`|`string`|The description of the proposal.|


### updateGovProposal

Updates the status of a governance proposal.
If the proposal passed voting, this will update the property to the new value.

*Only callable by the Vote contract. Updates the approval status and the whitelist status of the member.*


```solidity
function updateGovProposal(uint256 _index, uint256 _flag, uint256 _approveStatus) external onlyVote;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_index`|`uint256`|The index of the proposal to update.|
|`_flag`|`uint256`|The flag representing the type of proposal (1 for agent, 2 for board, 3 for pool).|
|`_approveStatus`|`uint256`|The approval status (1 for approved, 0 for rejected, 5 for replaced).|


### removeFilmBoardMember

Removes a film board member from the whitelist if they haven't voted on any proposal within the maximum
allowed period.

*Only callable by a staker. Ensures the member meets the inactivity criteria by checking their last vote time
and the most recent fund proposal creation time.*


```solidity
function removeFilmBoardMember(address _member) external onlyStaker nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_member`|`address`|The address of the film board member to remove. Requirements: - The member must be an active film board member (isGovWhitelist[2][_member] == 2). - The member's last vote must be older than the `maxAllowPeriod`. - The most recent fund proposal creation time must be within the `maxAllowPeriod`.|


### getGovProposalList

Retrieves the list of addresses for a specific governance proposal type.


```solidity
function getGovProposalList(uint256 _flag) external view returns (address[] memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_flag`|`uint256`|The flag representing the type of proposal (1 for agentList, 2 for boardCandidateList, 3 for rewardAddressList, 4 for filmBoardMembers).|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`address[]`|The list of addresses corresponding to the proposal type.|


### getGovProposalInfo

Retrieves detailed information about a specific governance proposal.


```solidity
function getGovProposalInfo(
    uint256 _index,
    uint256 _flag
)
    external
    view
    returns (uint256, uint256, uint256, address, address, Helper.Status);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_index`|`uint256`|The index of the proposal.|
|`_flag`|`uint256`|The flag representing the type of proposal (1 for agent, 2 for board, 3 for reward address).|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The creation time, approval time, proposal ID, value address, creator address, and status of the proposal.|
|`<none>`|`uint256`||
|`<none>`|`uint256`||
|`<none>`|`address`||
|`<none>`|`address`||
|`<none>`|`Helper.Status`||


### getGovProposalStr

Retrieves the title and description of a specific governance proposal.


```solidity
function getGovProposalStr(uint256 _index, uint256 _flag) external view returns (string memory, string memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_index`|`uint256`|The index of the proposal.|
|`_flag`|`uint256`|The flag representing the type of proposal.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`string`|The title and description of the proposal.|
|`<none>`|`string`||


### getPropertyProposalInfo

Retrieves detailed information about a specific property proposal.


```solidity
function getPropertyProposalInfo(
    uint256 _index,
    uint256 _flag
)
    external
    view
    returns (uint256, uint256, uint256, uint256, address, Helper.Status);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_index`|`uint256`|The index of the proposal.|
|`_flag`|`uint256`|The flag representing the type of proposal.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The creation time, approval time, proposal ID, property value, creator address, and status of the proposal.|
|`<none>`|`uint256`||
|`<none>`|`uint256`||
|`<none>`|`uint256`||
|`<none>`|`address`||
|`<none>`|`Helper.Status`||


### getPropertyProposalStr

Retrieves the title and description of a specific property proposal.


```solidity
function getPropertyProposalStr(uint256 _index, uint256 _flag) external view returns (string memory, string memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_index`|`uint256`|The index of the proposal.|
|`_flag`|`uint256`|The flag representing the type of proposal.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`string`|The title and description of the proposal.|
|`<none>`|`string`||


### getAgentProposerStakeAmount

Retrieves the stake amount of an agent proposer.

*This is used on the Vote contract for the auditor dispute flow.
We need to check if the user who disputes the proposal has staked double the amount
of the creator of the auditor change proposal.*


```solidity
function getAgentProposerStakeAmount(uint256 _index) external view returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_index`|`uint256`|The index of the agent in the agent list.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The stake amount of the agent proposer.|


### checkGovWhitelist

Checks the whitelist status of a governance address.


```solidity
function checkGovWhitelist(uint256 _flag, address _address) external view returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_flag`|`uint256`|The flag representing the type of governance address.|
|`_address`|`address`|The address to check.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The whitelist status of the address.|


### checkPropertyWhitelist

Checks the whitelist status of a property.


```solidity
function checkPropertyWhitelist(uint256 _flag, uint256 _property) external view returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_flag`|`uint256`|The flag representing the type of property.|
|`_property`|`uint256`|The property to check.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The whitelist status of the property.|


### getAllGovProposalInfo

Retrieves all governance proposal information for a specific flag.


```solidity
function getAllGovProposalInfo(uint256 _flag) external view returns (address[] memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_flag`|`uint256`|The flag representing the type of governance proposals (1: auditor, 2: film board member, 3: reward address)|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`address[]`|The list of addresses for the governance proposals.|


### getPropertyProposalList

Retrieves the list of property proposals for a specified flag.


```solidity
function getPropertyProposalList(uint256 _flag) public view returns (uint256[] memory _list);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_flag`|`uint256`|The flag representing the type of property proposal list to retrieve. 0 - Film Vote Period List 1 - Agent Vote Period List 2 - Dispute Grace Period List 3 - Property Vote Period List 4 - Lock Period List 5 - Reward Rate List 6 - Film Reward Claim Period List 7 - Max Allow Period List 8 - Proposal Fee Amount List 9 - Fund Fee Percent List 10 - Minimum Deposit Amount List 11 - Maximum Deposit Amount List 12 - Maximum Mint Fee Percent List 13 - Minimum Vote Count List 14 - Minimum Staker Count Percent List 15 - Available VAB Amount List 16 - Board Vote Period List 17 - Board Vote Weight List 18 - Reward Vote Period List 19 - Subscription Amount List 20 - Board Reward Rate List|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`_list`|`uint256[]`|The list of property proposals corresponding to the specified flag.|


### __paidFee

*Ensures the proposal fee is paid by transferring the expected amount of VAB tokens from the user to the
staking pool.*

*Converts the specified amount of USDC to the expected amount of VAB using Uniswap, then transfers the VAB to
the staking pool.*


```solidity
function __paidFee(uint256 _payAmount) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_payAmount`|`uint256`|The amount of USDC to be converted to VAB and paid as the proposal fee.|


### __removeBoardMember

*Removes a film board member from the list.*

*Finds the member in the film board members list and removes them by swapping with the last element and
reducing the list length.*


```solidity
function __removeBoardMember(address _member) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_member`|`address`|The address of the film board member to remove.|


## Events
### AuditorProposalCreated
Emitted when an auditor proposal is created


```solidity
event AuditorProposalCreated(address indexed creator, address member, string title, string description);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`creator`|`address`|The address of the proposal creator|
|`member`|`address`|The address of the proposed auditor|
|`title`|`string`|The title of the proposal|
|`description`|`string`|The description of the proposal|

### RewardFundProposalCreated
Emitted when a reward fund proposal is created


```solidity
event RewardFundProposalCreated(address indexed creator, address member, string title, string description);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`creator`|`address`|The address of the proposal creator|
|`member`|`address`|The address of the proposed reward fund address|
|`title`|`string`|The title of the proposal|
|`description`|`string`|The description of the proposal|

### FilmBoardProposalCreated
Emitted when a film board proposal is created


```solidity
event FilmBoardProposalCreated(address indexed creator, address member, string title, string description);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`creator`|`address`|The address of the proposal creator|
|`member`|`address`|The address of the proposed film board member address|
|`title`|`string`|The title of the proposal|
|`description`|`string`|The description of the proposal|

### PropertyProposalCreated
Emitted when a property proposal is created


```solidity
event PropertyProposalCreated(
    address indexed creator, uint256 property, uint256 flag, string title, string description
);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`creator`|`address`|The address of the proposal creator|
|`property`|`uint256`|The proposed property value|
|`flag`|`uint256`|The flag indicating the type of property|
|`title`|`string`|The title of the proposal|
|`description`|`string`|The description of the proposal|

### FilmBoardMemberRemoved
Emitted when a film board member is removed


```solidity
event FilmBoardMemberRemoved(address indexed caller, address member);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`caller`|`address`|The address of the caller who removed the member|
|`member`|`address`|The address of the removed member|

## Structs
### ProProposal
*This structure contains information related to proposals that update governance properties of the contract.*


```solidity
struct ProProposal {
    string title;
    string description;
    uint256 createTime;
    uint256 approveTime;
    uint256 proposalID;
    uint256 value;
    address creator;
    Helper.Status status;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`title`|`string`|The title of the proposal|
|`description`|`string`|The detailed description of the proposal|
|`createTime`|`uint256`|The timestamp when the proposal was created|
|`approveTime`|`uint256`|The timestamp when the proposal was approved|
|`proposalID`|`uint256`|The unique identifier for the proposal|
|`value`|`uint256`|The proposed new value for the governance property|
|`creator`|`address`|The address of the creator of the proposal|
|`status`|`Helper.Status`|The current status of the proposal|

### GovProposal
*This structure contains information related to governance proposals such as Auditor change, Reward Address
allocation, and Filmboard Member addition or removal.*


```solidity
struct GovProposal {
    string title;
    string description;
    uint256 createTime;
    uint256 approveTime;
    uint256 proposalID;
    address value;
    address creator;
    Helper.Status status;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`title`|`string`|The title of the proposal|
|`description`|`string`|The detailed description of the proposal|
|`createTime`|`uint256`|The timestamp when the proposal was created|
|`approveTime`|`uint256`|The timestamp when the proposal was approved|
|`proposalID`|`uint256`|The unique identifier for the proposal|
|`value`|`address`|The proposed new address|
|`creator`|`address`|The address of the creator of the proposal|
|`status`|`Helper.Status`|The current status of the proposal|

### Agent
*This structure contains information about an agent in the context of auditor replacement proposals.*


```solidity
struct Agent {
    address agent;
    uint256 stakeAmount;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`agent`|`address`|The address of the agent|
|`stakeAmount`|`uint256`|The stake amount of the agent proposal creator|

