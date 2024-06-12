# Property
[Git Source](https://github.com/Mill1995/VABDAO/blob/c1ade743ae4227c63e3d49544ad80f6b569b00da/contracts/dao/Property.sol)

**Inherits:**
ReentrancyGuard


## State Variables
### OWNABLE

```solidity
address private immutable OWNABLE;
```


### VOTE

```solidity
address private immutable VOTE;
```


### STAKING_POOL

```solidity
address private immutable STAKING_POOL;
```


### UNI_HELPER

```solidity
address private immutable UNI_HELPER;
```


### DAO_FUND_REWARD

```solidity
address public DAO_FUND_REWARD;
```


### filmVotePeriod

```solidity
uint256 public filmVotePeriod;
```


### agentVotePeriod

```solidity
uint256 public agentVotePeriod;
```


### disputeGracePeriod

```solidity
uint256 public disputeGracePeriod;
```


### propertyVotePeriod

```solidity
uint256 public propertyVotePeriod;
```


### lockPeriod

```solidity
uint256 public lockPeriod;
```


### rewardRate

```solidity
uint256 public rewardRate;
```


### filmRewardClaimPeriod

```solidity
uint256 public filmRewardClaimPeriod;
```


### maxAllowPeriod

```solidity
uint256 public maxAllowPeriod;
```


### proposalFeeAmount

```solidity
uint256 public proposalFeeAmount;
```


### fundFeePercent

```solidity
uint256 public fundFeePercent;
```


### minDepositAmount

```solidity
uint256 public minDepositAmount;
```


### maxDepositAmount

```solidity
uint256 public maxDepositAmount;
```


### maxMintFeePercent

```solidity
uint256 public maxMintFeePercent;
```


### minVoteCount

```solidity
uint256 public minVoteCount;
```


### minStakerCountPercent

```solidity
uint256 public minStakerCountPercent;
```


### availableVABAmount

```solidity
uint256 public availableVABAmount;
```


### boardVotePeriod

```solidity
uint256 public boardVotePeriod;
```


### boardVoteWeight

```solidity
uint256 public boardVoteWeight;
```


### rewardVotePeriod

```solidity
uint256 public rewardVotePeriod;
```


### subscriptionAmount

```solidity
uint256 public subscriptionAmount;
```


### boardRewardRate

```solidity
uint256 public boardRewardRate;
```


### maxPropertyList

```solidity
uint256[] private maxPropertyList;
```


### minPropertyList

```solidity
uint256[] private minPropertyList;
```


### governanceProposalCount

```solidity
uint256 public governanceProposalCount;
```


### filmVotePeriodList

```solidity
uint256[] private filmVotePeriodList;
```


### agentVotePeriodList

```solidity
uint256[] private agentVotePeriodList;
```


### disputeGracePeriodList

```solidity
uint256[] private disputeGracePeriodList;
```


### propertyVotePeriodList

```solidity
uint256[] private propertyVotePeriodList;
```


### lockPeriodList

```solidity
uint256[] private lockPeriodList;
```


### rewardRateList

```solidity
uint256[] private rewardRateList;
```


### filmRewardClaimPeriodList

```solidity
uint256[] private filmRewardClaimPeriodList;
```


### maxAllowPeriodList

```solidity
uint256[] private maxAllowPeriodList;
```


### proposalFeeAmountList

```solidity
uint256[] private proposalFeeAmountList;
```


### fundFeePercentList

```solidity
uint256[] private fundFeePercentList;
```


### minDepositAmountList

```solidity
uint256[] private minDepositAmountList;
```


### maxDepositAmountList

```solidity
uint256[] private maxDepositAmountList;
```


### maxMintFeePercentList

```solidity
uint256[] private maxMintFeePercentList;
```


### minVoteCountList

```solidity
uint256[] private minVoteCountList;
```


### minStakerCountPercentList

```solidity
uint256[] private minStakerCountPercentList;
```


### availableVABAmountList

```solidity
uint256[] private availableVABAmountList;
```


### boardVotePeriodList

```solidity
uint256[] private boardVotePeriodList;
```


### boardVoteWeightList

```solidity
uint256[] private boardVoteWeightList;
```


### rewardVotePeriodList

```solidity
uint256[] private rewardVotePeriodList;
```


### subscriptionAmountList

```solidity
uint256[] private subscriptionAmountList;
```


### boardRewardRateList

```solidity
uint256[] private boardRewardRateList;
```


### agentList

```solidity
Agent[] private agentList;
```


### rewardAddressList

```solidity
address[] private rewardAddressList;
```


### filmBoardCandidates

```solidity
address[] private filmBoardCandidates;
```


### filmBoardMembers

```solidity
address[] private filmBoardMembers;
```


### isGovWhitelist

```solidity
mapping(uint256 => mapping(address => uint256)) private isGovWhitelist;
```


### isPropertyWhitelist

```solidity
mapping(uint256 => mapping(uint256 => uint256)) private isPropertyWhitelist;
```


### govProposalInfo

```solidity
mapping(uint256 => mapping(uint256 => GovProposal)) private govProposalInfo;
```


### proProposalInfo

```solidity
mapping(uint256 => mapping(uint256 => ProProposal)) private proProposalInfo;
```


### allGovProposalInfo

```solidity
mapping(uint256 => address[]) private allGovProposalInfo;
```


### userGovProposalCount

```solidity
mapping(address => uint256) public userGovProposalCount;
```


## Functions
### onlyVote


```solidity
modifier onlyVote();
```

### onlyDeployer


```solidity
modifier onlyDeployer();
```

### onlyStaker


```solidity
modifier onlyStaker();
```

### onlyMajor


```solidity
modifier onlyMajor();
```

### constructor


```solidity
constructor(address _ownable, address _uniHelper, address _vote, address _staking);
```

### proposalAuditor

=================== proposals for replacing auditor ==============

Anyone($100 fee in VAB) create a proposal for replacing Auditor


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

### __paidFee

Check if proposal fee transferred from studio to stakingPool


```solidity
function __paidFee(uint256 _payAmount) private;
```

### proposalRewardFund


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

### proposalFilmBoard

Anyone($100 fee of VAB) create a proposal with the case to be added to film board


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

### removeFilmBoardMember

Remove a member from whitelist if he didn't vote to any propsoal for over 3 months


```solidity
function removeFilmBoardMember(address _member) external onlyStaker nonReentrant;
```

### __removeBoardMember


```solidity
function __removeBoardMember(address _member) private;
```

### getGovProposalList

Get gov address list


```solidity
function getGovProposalList(uint256 _flag) external view returns (address[] memory);
```

### getAgentProposerStakeAmount

Get agent list


```solidity
function getAgentProposerStakeAmount(uint256 _index) external view returns (uint256);
```

### getGovProposalInfo

Get govProposalInfo(agent=>1, board=>2, pool=>3)


```solidity
function getGovProposalInfo(
    uint256 _index,
    uint256 _flag
)
    external
    view
    returns (uint256, uint256, uint256, address, address, Helper.Status);
```

### getGovProposalStr


```solidity
function getGovProposalStr(uint256 _index, uint256 _flag) external view returns (string memory, string memory);
```

### proposalProperty

proposals for properties


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

### getPropertyProposalList

Get property proposal list


```solidity
function getPropertyProposalList(uint256 _flag) public view returns (uint256[] memory _list);
```

### getPropertyProposalInfo

Get property proposal created time


```solidity
function getPropertyProposalInfo(
    uint256 _index,
    uint256 _flag
)
    external
    view
    returns (uint256, uint256, uint256, uint256, address, Helper.Status);
```

### getPropertyProposalStr


```solidity
function getPropertyProposalStr(uint256 _index, uint256 _flag) external view returns (string memory, string memory);
```

### updatePropertyProposal


```solidity
function updatePropertyProposal(uint256 _index, uint256 _flag, uint256 _approveStatus) external onlyVote;
```

### updateGovProposal


```solidity
function updateGovProposal(uint256 _index, uint256 _flag, uint256 _approveStatus) external onlyVote;
```

### checkGovWhitelist


```solidity
function checkGovWhitelist(uint256 _flag, address _address) external view returns (uint256);
```

### checkPropertyWhitelist


```solidity
function checkPropertyWhitelist(uint256 _flag, uint256 _property) external view returns (uint256);
```

### getAllGovProposalInfo


```solidity
function getAllGovProposalInfo(uint256 _flag) external view returns (address[] memory);
```

## Events
### AuditorProposalCreated

```solidity
event AuditorProposalCreated(address indexed creator, address member, string title, string description);
```

### RewardFundProposalCreated

```solidity
event RewardFundProposalCreated(address indexed creator, address member, string title, string description);
```

### FilmBoardProposalCreated

```solidity
event FilmBoardProposalCreated(address indexed creator, address member, string title, string description);
```

### FilmBoardMemberRemoved

```solidity
event FilmBoardMemberRemoved(address indexed caller, address member);
```

### PropertyProposalCreated

```solidity
event PropertyProposalCreated(
    address indexed creator, uint256 property, uint256 flag, string title, string description
);
```

## Structs
### ProProposal

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

### GovProposal

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

### Agent

```solidity
struct Agent {
    address agent;
    uint256 stakeAmount;
}
```

