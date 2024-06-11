# VabbleDAO
[Git Source](https://github.com/Mill1995/VABDAO/blob/df9d3dbfaf61478d7e8a6f44f0a92a8ebe82bada/contracts/dao/VabbleDAO.sol)

**Inherits:**
ReentrancyGuard


## State Variables
### OWNABLE

```solidity
address public immutable OWNABLE;
```


### VOTE

```solidity
address public immutable VOTE;
```


### STAKING_POOL

```solidity
address public immutable STAKING_POOL;
```


### UNI_HELPER

```solidity
address public immutable UNI_HELPER;
```


### DAO_PROPERTY

```solidity
address public immutable DAO_PROPERTY;
```


### VABBLE_FUND

```solidity
address public immutable VABBLE_FUND;
```


### totalFilmIds

```solidity
mapping(uint256 => uint256[]) private totalFilmIds;
```


### studioPoolUsers

```solidity
address[] private studioPoolUsers;
```


### edgePoolUsers

```solidity
address[] private edgePoolUsers;
```


### filmInfo

```solidity
mapping(uint256 => IVabbleDAO.Film) public filmInfo;
```


### userFilmIds

```solidity
mapping(address => mapping(uint256 => uint256[])) private userFilmIds;
```


### finalizedFilmIds

```solidity
mapping(uint256 => uint256[]) private finalizedFilmIds;
```


### finalizedAmount

```solidity
mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public finalizedAmount;
```


### latestClaimMonthId

```solidity
mapping(uint256 => mapping(address => uint256)) public latestClaimMonthId;
```


### isInvested

```solidity
mapping(address => mapping(uint256 => bool)) private isInvested;
```


### isStudioPoolUser

```solidity
mapping(address => bool) private isStudioPoolUser;
```


### isEdgePoolUser

```solidity
mapping(address => bool) private isEdgePoolUser;
```


### StudioPool

```solidity
uint256 public StudioPool;
```


### finalFilmCalledTime

```solidity
mapping(uint256 => uint256) public finalFilmCalledTime;
```


### filmCount

```solidity
Counters.Counter public filmCount;
```


### updatedFilmCount

```solidity
Counters.Counter public updatedFilmCount;
```


### monthId

```solidity
Counters.Counter public monthId;
```


## Functions
### onlyAuditor


```solidity
modifier onlyAuditor();
```

### onlyVote


```solidity
modifier onlyVote();
```

### onlyStakingPool


```solidity
modifier onlyStakingPool();
```

### receive


```solidity
receive() external payable;
```

### constructor


```solidity
constructor(
    address _ownable,
    address _uniHelper,
    address _vote,
    address _staking,
    address _property,
    address _vabbleFund
);
```

### proposalFilmCreate

Film proposal


```solidity
function proposalFilmCreate(uint256 _fundType, uint256 _noVote, address _feeToken) external payable nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_fundType`|`uint256`|Distribution => 0, Token => 1, NFT => 2, NFT & Token => 3|
|`_noVote`|`uint256`|if 0 => false, 1 => true|
|`_feeToken`|`address`|Matic/USDC/USDT, not VAB|


### proposalFilmUpdate


```solidity
function proposalFilmUpdate(
    uint256 _filmId,
    string memory _title,
    string memory _description,
    uint256[] calldata _sharePercents,
    address[] calldata _studioPayees,
    uint256 _raiseAmount,
    uint256 _fundPeriod,
    uint256 _rewardPercent,
    uint256 _enableClaimer
)
    external
    nonReentrant;
```

### changeOwner


```solidity
function changeOwner(uint256 _filmId, address newOwner) external nonReentrant returns (bool);
```

### __moveToAnotherArray


```solidity
function __moveToAnotherArray(uint256[] storage array1, uint256[] storage array2, uint256 value) private;
```

### __paidFee

Check if proposal fee transferred from studio to stakingPool


```solidity
function __paidFee(address _dToken, uint256 _noVote) private;
```

### approveFilmByVote

Approve a film for funding/listing from vote contract


```solidity
function approveFilmByVote(uint256 _filmId, uint256 _flag) external onlyVote;
```

### updateFilmFundPeriod

onlyStudio update film fund period


```solidity
function updateFilmFundPeriod(uint256 _filmId, uint256 _fundPeriod) external nonReentrant;
```

### allocateToPool

Allocate VAB from StakingPool(user balance) to EdgePool(Ownable)/StudioPool(VabbleDAO) by Auditor


```solidity
function allocateToPool(
    address[] calldata _users,
    uint256[] calldata _amounts,
    uint256 _which
)
    external
    onlyAuditor
    nonReentrant;
```

### allocateFromEdgePool

Allocate VAB from EdgePool(Ownable) to StudioPool(VabbleDAO) by Auditor


```solidity
function allocateFromEdgePool(uint256 _amount) external onlyAuditor nonReentrant;
```

### withdrawVABFromStudioPool

Withdraw VAB token from StudioPool(VabbleDAO) to V2 by StakingPool contract


```solidity
function withdrawVABFromStudioPool(address _to) external onlyStakingPool nonReentrant returns (uint256);
```

### checkSetFinalFilms

Pre-Checking for set Final Film


```solidity
function checkSetFinalFilms(uint256[] calldata _filmIds) public view returns (bool[] memory _valids);
```

### setFinalFilms

Set final films for a customer with watched


```solidity
function setFinalFilms(uint256[] calldata _filmIds, uint256[] calldata _payouts) external onlyAuditor nonReentrant;
```

### startNewMonth


```solidity
function startNewMonth() external onlyAuditor nonReentrant;
```

### __setFinalFilm


```solidity
function __setFinalFilm(uint256 _filmId, uint256 _payout) private;
```

### __setFinalAmountToPayees

*Avoid deep error*


```solidity
function __setFinalAmountToPayees(uint256 _filmId, uint256 _payout, uint256 _curMonth) private;
```

### __setFinalAmountToHelpers

*Avoid deep error*


```solidity
function __setFinalAmountToHelpers(uint256 _filmId, uint256 _rewardAmount, uint256 _curMonth) private;
```

### __addFinalFilmId


```solidity
function __addFinalFilmId(address _user, uint256 _filmId) private;
```

### claimReward


```solidity
function claimReward(uint256[] memory _filmIds) external nonReentrant;
```

### __claimAllReward


```solidity
function __claimAllReward(uint256[] memory _filmIds) private;
```

### claimAllReward


```solidity
function claimAllReward() external nonReentrant;
```

### getUserRewardAmountBetweenMonths


```solidity
function getUserRewardAmountBetweenMonths(
    uint256 _filmId,
    uint256 _preMonth,
    uint256 _curMonth,
    address _user
)
    public
    view
    returns (uint256 amount_);
```

### getAllAvailableRewards


```solidity
function getAllAvailableRewards(uint256 _curMonth, address _user) public view returns (uint256);
```

### getUserRewardAmountForUser


```solidity
function getUserRewardAmountForUser(uint256 _filmId, uint256 _curMonth, address _user) public view returns (uint256);
```

### getUserFilmIds

flag: create=1, update=2, approve=3, final=4


```solidity
function getUserFilmIds(address _user, uint256 _flag) external view returns (uint256[] memory);
```

### getFilmStatus

Get film status based on Id


```solidity
function getFilmStatus(uint256 _filmId) external view returns (Helper.Status status_);
```

### getFilmOwner

Get film owner(studio) based on Id


```solidity
function getFilmOwner(uint256 _filmId) external view returns (address owner_);
```

### getFilmFund

Get film fund info based on Id


```solidity
function getFilmFund(uint256 _filmId)
    external
    view
    returns (uint256 raiseAmount_, uint256 fundPeriod_, uint256 fundType_, uint256 rewardPercent_);
```

### getFilmShare

Get film fund info based on Id


```solidity
function getFilmShare(uint256 _filmId)
    external
    view
    returns (uint256[] memory sharePercents_, address[] memory studioPayees_);
```

### getFilmProposalTime

Get film proposal created time based on Id


```solidity
function getFilmProposalTime(uint256 _filmId) public view returns (uint256 cTime_, uint256 aTime_);
```

### isEnabledClaimer

Get enableClaimer based on Id


```solidity
function isEnabledClaimer(uint256 _filmId) external view returns (bool enable_);
```

### updateEnabledClaimer

Set enableClaimer based on Id by studio


```solidity
function updateEnabledClaimer(uint256 _filmId, uint256 _enable) external;
```

### getFilmIds

Get film Ids


```solidity
function getFilmIds(uint256 _flag) external view returns (uint256[] memory list_);
```

### getPoolUsers

flag=1 => studioPoolUsers, flag=2 => edgePoolUsers


```solidity
function getPoolUsers(uint256 _flag) external view onlyAuditor returns (address[] memory list_);
```

### getFinalizedFilmIds


```solidity
function getFinalizedFilmIds(uint256 _monthId) external view returns (uint256[] memory);
```

### __updateFinalizeAmountAndLastClaimMonth


```solidity
function __updateFinalizeAmountAndLastClaimMonth(
    uint256 _filmId,
    uint256 _curMonth,
    address _oldOwner,
    address _newOwner
)
    private;
```

## Events
### FilmProposalCreated

```solidity
event FilmProposalCreated(uint256 indexed filmId, uint256 noVote, uint256 fundType, address studio);
```

### FilmProposalUpdated

```solidity
event FilmProposalUpdated(uint256 indexed filmId, uint256 fundType, address studio);
```

### FinalFilmSetted

```solidity
event FinalFilmSetted(
    address[] users, uint256[] filmIds, uint256[] watchedPercents, uint256[] rentPrices, uint256 setTime
);
```

### FilmFundPeriodUpdated

```solidity
event FilmFundPeriodUpdated(uint256 indexed filmId, address studio, uint256 fundPeriod);
```

### AllocatedToPool

```solidity
event AllocatedToPool(address[] users, uint256[] amounts, uint256 which);
```

### RewardAllClaimed

```solidity
event RewardAllClaimed(address indexed user, uint256 indexed monthId, uint256[] filmIds, uint256 claimAmount);
```

### SetFinalFilms

```solidity
event SetFinalFilms(address indexed user, uint256[] filmIds, uint256[] payouts);
```

### ChangeFilmOwner

```solidity
event ChangeFilmOwner(uint256 indexed filmId, address indexed oldOwner, address indexed newOwner);
```

