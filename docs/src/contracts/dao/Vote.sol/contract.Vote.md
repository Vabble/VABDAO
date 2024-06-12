# Vote
[Git Source](https://github.com/Mill1995/VABDAO/blob/b6d0bc49c06645caa4c08cd044aa829b5ffd9210/contracts/dao/Vote.sol)

**Inherits:**
[IVote](/contracts/interfaces/IVote.sol/interface.IVote.md), ReentrancyGuard


## State Variables
### OWNABLE

```solidity
address private immutable OWNABLE;
```


### VABBLE_DAO

```solidity
address private VABBLE_DAO;
```


### STAKING_POOL

```solidity
address private STAKING_POOL;
```


### DAO_PROPERTY

```solidity
address private DAO_PROPERTY;
```


### UNI_HELPER

```solidity
address private UNI_HELPER;
```


### filmVoting

```solidity
mapping(uint256 => Voting) public filmVoting;
```


### isAttendToFilmVote

```solidity
mapping(address => mapping(uint256 => bool)) public isAttendToFilmVote;
```


### filmBoardVoting

```solidity
mapping(uint256 => Voting) public filmBoardVoting;
```


### isAttendToBoardVote

```solidity
mapping(address => mapping(uint256 => bool)) public isAttendToBoardVote;
```


### rewardAddressVoting

```solidity
mapping(uint256 => Voting) public rewardAddressVoting;
```


### isAttendToRewardAddressVote

```solidity
mapping(address => mapping(uint256 => bool)) public isAttendToRewardAddressVote;
```


### agentVoting

```solidity
mapping(uint256 => AgentVoting) public agentVoting;
```


### isAttendToAgentVote

```solidity
mapping(address => mapping(uint256 => bool)) public isAttendToAgentVote;
```


### propertyVoting

```solidity
mapping(uint256 => mapping(uint256 => Voting)) public propertyVoting;
```


### isAttendToPropertyVote

```solidity
mapping(uint256 => mapping(address => mapping(uint256 => bool))) public isAttendToPropertyVote;
```


### userFilmVoteCount

```solidity
mapping(address => uint256) public userFilmVoteCount;
```


### userGovernVoteCount

```solidity
mapping(address => uint256) public userGovernVoteCount;
```


### govPassedVoteCount

```solidity
mapping(uint256 => uint256) public govPassedVoteCount;
```


### lastVoteTime

```solidity
mapping(address => uint256) private lastVoteTime;
```


### proposalFilmIds

```solidity
mapping(uint256 => uint256) private proposalFilmIds;
```


## Functions
### onlyDeployer


```solidity
modifier onlyDeployer();
```

### onlyStaker


```solidity
modifier onlyStaker();
```

### constructor


```solidity
constructor(address _ownable);
```

### initialize

Initialize Vote


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

### voteToFilms

Vote to multi films from a staker


```solidity
function voteToFilms(uint256[] calldata _filmIds, uint256[] calldata _voteInfos) external onlyStaker nonReentrant;
```

### __voteToFilm


```solidity
function __voteToFilm(uint256 _filmId, uint256 _voteInfo) private;
```

### saveProposalWithFilm


```solidity
function saveProposalWithFilm(uint256 _filmId, uint256 _proposalID) external override;
```

### approveFilms

Approve multi films that votePeriod has elapsed after votePeriod(10 days) by anyone


```solidity
function approveFilms(uint256[] calldata _filmIds) external onlyStaker nonReentrant;
```

### __approveFilm


```solidity
function __approveFilm(uint256 _filmId) private;
```

### voteToAgent

Stakers vote(1,2 => Yes, No) to agent for replacing Auditor


```solidity
function voteToAgent(uint256 _voteInfo, uint256 _index) external onlyStaker nonReentrant;
```

### updateAgentStats

update proposal status based on vote result


```solidity
function updateAgentStats(uint256 _index) external onlyStaker nonReentrant;
```

### disputeToAgent

Dispute to agent proposal with staked double or paid double


```solidity
function disputeToAgent(uint256 _index, bool _pay) external onlyStaker nonReentrant;
```

### isDoubleStaked


```solidity
function isDoubleStaked(uint256 _index, address _user) public view returns (bool);
```

### __paidDoubleFee

Check if proposal fee transferred from studio to stakingPool


```solidity
function __paidDoubleFee() private returns (bool paid_);
```

### replaceAuditor


```solidity
function replaceAuditor(uint256 _index) external onlyStaker nonReentrant;
```

### voteToFilmBoard


```solidity
function voteToFilmBoard(uint256 _index, uint256 _voteInfo) external onlyStaker nonReentrant;
```

### addFilmBoard


```solidity
function addFilmBoard(uint256 _index) external onlyStaker nonReentrant;
```

### voteToRewardAddress

Stakers vote to proposal for setup the address to reward DAO fund


```solidity
function voteToRewardAddress(uint256 _index, uint256 _voteInfo) external onlyStaker nonReentrant;
```

### setDAORewardAddress


```solidity
function setDAORewardAddress(uint256 _index) external onlyStaker nonReentrant;
```

### voteToProperty

Stakers vote(1,2 => Yes, No) to proposal for updating properties(filmVotePeriod, rewardRate, ...)


```solidity
function voteToProperty(uint256 _voteInfo, uint256 _index, uint256 _flag) external onlyStaker nonReentrant;
```

### updateProperty

Update properties based on vote result(>=51% and stakeAmount of "Yes" > 75m)


```solidity
function updateProperty(uint256 _index, uint256 _flag) external onlyStaker nonReentrant;
```

### __isVotePeriod


```solidity
function __isVotePeriod(uint256 _period, uint256 _startTime) private view returns (bool);
```

### getLastVoteTime

Update last vote time for removing filmboard member


```solidity
function getLastVoteTime(address _member) external view override returns (uint256 time_);
```

## Events
### VotedToFilm

```solidity
event VotedToFilm(address indexed voter, uint256 indexed filmId, uint256 voteInfo);
```

### VotedToAgent

```solidity
event VotedToAgent(address indexed voter, address indexed agent, uint256 voteInfo, uint256 index);
```

### DisputedToAgent

```solidity
event DisputedToAgent(address indexed caller, address indexed agent, uint256 index);
```

### VotedToProperty

```solidity
event VotedToProperty(address indexed voter, uint256 flag, uint256 propertyVal, uint256 voteInfo, uint256 index);
```

### VotedToPoolAddress

```solidity
event VotedToPoolAddress(address indexed voter, address rewardAddress, uint256 voteInfo, uint256 index);
```

### VotedToFilmBoard

```solidity
event VotedToFilmBoard(address indexed voter, address candidate, uint256 voteInfo, uint256 index);
```

### FilmApproved

```solidity
event FilmApproved(uint256 indexed filmId, uint256 fundType, uint256 reason);
```

### AuditorReplaced

```solidity
event AuditorReplaced(address indexed agent, address caller);
```

### UpdatedAgentStats

```solidity
event UpdatedAgentStats(address indexed agent, address caller, uint256 reason, uint256 index);
```

### FilmBoardAdded

```solidity
event FilmBoardAdded(address indexed boardMember, address caller, uint256 reason, uint256 index);
```

### PoolAddressAdded

```solidity
event PoolAddressAdded(address indexed pool, address caller, uint256 reason, uint256 index);
```

### PropertyUpdated

```solidity
event PropertyUpdated(
    uint256 indexed whichProperty, uint256 propertyValue, address caller, uint256 reason, uint256 index
);
```

## Structs
### Voting

```solidity
struct Voting {
    uint256 stakeAmount_1;
    uint256 stakeAmount_2;
    uint256 voteCount_1;
    uint256 voteCount_2;
}
```

### AgentVoting

```solidity
struct AgentVoting {
    uint256 stakeAmount_1;
    uint256 stakeAmount_2;
    uint256 voteCount_1;
    uint256 voteCount_2;
}
```

