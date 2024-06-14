# VabbleDAO
[Git Source](https://github.com/Mill1995/VABDAO/blob/9050477259e61daa6bf97d9f648c5d24a5f80da7/contracts/dao/VabbleDAO.sol)

**Inherits:**
ReentrancyGuard

The VabbleDAO contract manages the creation and updating of film proposals,
reward distribution, payment processing,
and claims related to film projects within the Vabble decentralized platform.

*This contract contains various functions to handle film proposals, finalize films,
and distribute rewards to both studio payees and investors. It interacts with multiple
external contracts such as Property, Ownablee, UniHelper, StakingPool, and VabbleFund
to perform these operations. The contract ensures proper reward calculation and distribution
based on the film's status and the amount raised.
Key Features:
- Film proposal creation and approval times tracking.
- Reward calculation and distribution for both studio payees and investors.
- Finalization of film rewards based on status (listing or funding).
- Secure handling of proposal fees and reward claims.*


## State Variables
### OWNABLE
Address of the Ownable contract


```solidity
address public immutable OWNABLE;
```


### VOTE
Address of the Vote contract


```solidity
address public immutable VOTE;
```


### STAKING_POOL
Address of the StakingPool contract


```solidity
address public immutable STAKING_POOL;
```


### UNI_HELPER
Address of the UniHelper contract


```solidity
address public immutable UNI_HELPER;
```


### DAO_PROPERTY
Address of the DAO property


```solidity
address public immutable DAO_PROPERTY;
```


### VABBLE_FUND
Address of the Vabble fund


```solidity
address public immutable VABBLE_FUND;
```


### StudioPool
Total VAB tokens in the StudioPool


```solidity
uint256 public StudioPool;
```


### filmCount
Counter for the total number of created films

*Film IDs start from 1 and increment for each new film create*


```solidity
Counters.Counter public filmCount;
```


### updatedFilmCount
Counter for the total number of updated films

*Updated film IDs start from 1 and increment for each updated film*


```solidity
Counters.Counter public updatedFilmCount;
```


### monthId
Counter for the current month ID

*Month IDs increment for each new month*


```solidity
Counters.Counter public monthId;
```


### studioPoolUsers
*List of users in the StudioPool*


```solidity
address[] private studioPoolUsers;
```


### edgePoolUsers
*List of users in the EdgePool*


```solidity
address[] private edgePoolUsers;
```


### filmInfo
Mapping of film IDs to film information

*Maps each film ID to its corresponding film information*


```solidity
mapping(uint256 => IVabbleDAO.Film) public filmInfo;
```


### finalizedAmount
Mapping of finalized amounts by film ID, month ID, and user address

*Maps film ID and month ID to user addresses and their finalized amounts*


```solidity
mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public finalizedAmount;
```


### latestClaimMonthId
Mapping of latest claim month ID by film ID and user address

*Maps film ID to user addresses and their latest claim month IDs*


```solidity
mapping(uint256 => mapping(address => uint256)) public latestClaimMonthId;
```


### finalFilmCalledTime
Mapping of finalized film call times by film ID

*Maps film ID to the timestamp when the film was finalized*


```solidity
mapping(uint256 => uint256) public finalFilmCalledTime;
```


### totalFilmIds
*Mapping of flags to film ID lists*

*Flags indicate different states:
1 = proposal, 2 = approveListing, 3 = approveFunding, 4 = updated*


```solidity
mapping(uint256 => uint256[]) private totalFilmIds;
```


### userFilmIds
*Mapping of user addresses to film ID lists by flag*

*(user => (flag => filmId list))*

*Flags indicate different user actions:
1 = create, 2 = update, 3 = approve, 4 = final*


```solidity
mapping(address => mapping(uint256 => uint256[])) private userFilmIds;
```


### finalizedFilmIds
*Mapping of month IDs to finalized film ID lists*

*Maps each month ID to a list of finalized film IDs*


```solidity
mapping(uint256 => uint256[]) private finalizedFilmIds;
```


### isInvested
*Mapping of investment status by investor address and film ID*

*Maps investor addresses to film IDs indicating if they have invested (true/false)*


```solidity
mapping(address => mapping(uint256 => bool)) private isInvested;
```


### isStudioPoolUser
*Mapping indicating if an address is a StudioPool user*

*Maps user addresses to boolean values indicating StudioPool membership*


```solidity
mapping(address => bool) private isStudioPoolUser;
```


### isEdgePoolUser
*Mapping indicating if an address is an EdgePool user*

*Maps user addresses to boolean values indicating EdgePool membership*


```solidity
mapping(address => bool) private isEdgePoolUser;
```


## Functions
### onlyAuditor

*Restricts access to the current Auditor.*


```solidity
modifier onlyAuditor();
```

### onlyVote

*Restricts access to the Vote contract.*


```solidity
modifier onlyVote();
```

### onlyStakingPool

*Restricts access to the StakingPool contract.*


```solidity
modifier onlyStakingPool();
```

### constructor

*Constructor for the VabbleDAO contract*


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
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_ownable`|`address`|The address of the Ownable contract|
|`_uniHelper`|`address`|The address of the UniHelper contract|
|`_vote`|`address`|The address of the Vote contract|
|`_staking`|`address`|The address of the StakingPool contract|
|`_property`|`address`|The address of the Property contract|
|`_vabbleFund`|`address`|The address of the VabbleFund contract|


### receive


```solidity
receive() external payable;
```

### proposalFilmCreate

Creates a film proposal

User has to pay the current proposal fee


```solidity
function proposalFilmCreate(uint256 _fundType, uint256 _noVote, address _feeToken) external payable nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_fundType`|`uint256`|Distribution => 0, Token => 1, NFT => 2, NFT & Token => 3|
|`_noVote`|`uint256`|If the proposal can skip voting phase 0 = false, 1 = true|
|`_feeToken`|`address`|Must be a deposit asset added in the Ownable contract|


### proposalFilmUpdate

Update the details of an existing film proposal

*This function allows the film owner to update the details of their film proposal.
It verifies the validity of the input parameters, ensuring that the share percentages
and studio payee addresses are correctly specified and that other conditions are met
based on the type of funding. The function updates the film proposal details and adjusts
related records and mappings accordingly.
Requirements:
- `_studioPayees` must not be empty.
- The length of `_studioPayees` must equal the length of `_sharePercents`.
- `_title` must not be an empty string.
- If the film requires funding (`fundType != 0`):
- `_fundPeriod` must be non-zero.
- `_raiseAmount` must be greater than the minimum deposit amount defined in the DAO properties.
- `_rewardPercent` must not exceed 100% (1e10 basis points).
- If the film does not require funding (`fundType == 0`):
- `_rewardPercent` must be zero.
- The total of `_sharePercents` must equal 100% (1e10 basis points).
- The film proposal must have a status of `LISTED`.
- The caller must be the owner of the film proposal.
Effects:
- Updates the film proposal details.
- Updates the timestamp of proposal creation.
- Updates the status of the film proposal to `UPDATED`.
- Increments the `updatedFilmCount`.
- Records the film ID in the list of updated film proposals for the current month.
- Records the film ID in the list of film proposals updated by the user.
- Adds a new proposal in the staking pool contract used to calculate staker rewards.
- If the film requires funding and voting is skipped, it directly approves the film for funding.*


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
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|The unique identifier of the film proposal to update|
|`_title`|`string`|The title of the film|
|`_description`|`string`|The description of the film|
|`_sharePercents`|`uint256[]`|An array of share percentages for the studio payees|
|`_studioPayees`|`address[]`|An array of addresses for the studio payees|
|`_raiseAmount`|`uint256`|The amount to raise for funding|
|`_fundPeriod`|`uint256`|The duration of the funding period in seconds|
|`_rewardPercent`|`uint256`|The reward percentage allocated for funders (in basis points)|
|`_enableClaimer`|`uint256`|A flag to enable or disable the claimer (1 = enabled, 0 = disabled)|


### changeOwner

Change owner of a film


```solidity
function changeOwner(uint256 _filmId, address newOwner) external nonReentrant returns (bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film to change owner|
|`newOwner`|`address`|New owner address|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|success Boolean indicating success of the operation|


### approveFilmByVote

Updates the film's approval status accordingly


```solidity
function approveFilmByVote(uint256 _filmId, uint256 _flag) external onlyVote;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film to approve|
|`_flag`|`uint256`|Flag: 0 for film funding, 1 for listing film|


### updateFilmFundPeriod

Update film fund period by studio


```solidity
function updateFilmFundPeriod(uint256 _filmId, uint256 _fundPeriod) external nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film to update fund period|
|`_fundPeriod`|`uint256`|New fund period in seconds|


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
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_users`|`address[]`|Array of users to allocate VAB|
|`_amounts`|`uint256[]`|Array of amounts to allocate per user|
|`_which`|`uint256`|1 => to EdgePool, 2 => to StudioPool|


### allocateFromEdgePool

Allocate VAB from EdgePool(Ownable) to StudioPool(VabbleDAO) by Auditor


```solidity
function allocateFromEdgePool(uint256 _amount) external onlyAuditor nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_amount`|`uint256`|Amount of VAB to allocate|


### withdrawVABFromStudioPool

Withdraw VAB token from StudioPool(VabbleDAO) to the new reward address.

*This will be called by the StakingPool contract after a reward address proposal has been accepted and
finalized. This is part of the migration process to a new DAO.*


```solidity
function withdrawVABFromStudioPool(address _to) external onlyStakingPool nonReentrant returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_to`|`address`|Address to receive the withdrawn VAB|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|Amount of VAB withdrawn|


### startNewMonth

Start a new month for film rewards calculation / distribution

*This must be called before the auditor calls `setFinalFilms`.*


```solidity
function startNewMonth() external onlyAuditor nonReentrant;
```

### setFinalFilms

Finalizes the payout and reward distribution for a batch of films.

*This function is callable only by the auditor, he must call `startNewMonth` before.
It validates the input arrays, checks the validity of each film, and then
finalizes the payout for each valid film using the internal function `__setFinalFilm`.
This action will allow the studio, investors and assigned reward receives to claim their rewards.*


```solidity
function setFinalFilms(uint256[] calldata _filmIds, uint256[] calldata _payouts) external onlyAuditor nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmIds`|`uint256[]`|An array of unique identifiers for the films to be finalized.|
|`_payouts`|`uint256[]`|An array of total payout amounts corresponding to each film, to be distributed to payees and film investors / funders.|


### claimReward

Claim rewards for multiple film IDs after the auditor called setFinalFilms()


```solidity
function claimReward(uint256[] memory _filmIds) external nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmIds`|`uint256[]`|Array of film IDs to claim rewards for|


### claimAllReward

Claim rewards of all finalized film IDs for the caller


```solidity
function claimAllReward() external nonReentrant;
```

### updateEnabledClaimer

Update enableClaimer status for a film by studio


```solidity
function updateEnabledClaimer(uint256 _filmId, uint256 _enable) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film to update enableClaimer|
|`_enable`|`uint256`|New enableClaimer status|


### getUserFilmIds

Gets the film IDs for a user based on a flag


```solidity
function getUserFilmIds(address _user, uint256 _flag) external view returns (uint256[] memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_user`|`address`|Address of the user|
|`_flag`|`uint256`|Flag indicating the type of film IDs to retrieve (1 for created, 2 for updated, 3 for approved, 4 for final)|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256[]`|List of film IDs for the user|


### getFilmStatus

Gets the status of a film based on its ID

*Retrieves the status of the specified film*


```solidity
function getFilmStatus(uint256 _filmId) external view returns (Helper.Status status_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`status_`|`Helper.Status`|Status of the film|


### getFilmOwner

Gets the owner of a film based on its ID

*Retrieves the address of the studio that owns the specified film*


```solidity
function getFilmOwner(uint256 _filmId) external view returns (address owner_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`owner_`|`address`|Address of the film owner|


### getFilmFund

Gets the fund information for a film based on its ID

*Retrieves the fund details for the specified film*


```solidity
function getFilmFund(uint256 _filmId)
    external
    view
    returns (uint256 raiseAmount_, uint256 fundPeriod_, uint256 fundType_, uint256 rewardPercent_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`raiseAmount_`|`uint256`|Amount to be raised for the film|
|`fundPeriod_`|`uint256`|Fund period for the film|
|`fundType_`|`uint256`|Fund type for the film|
|`rewardPercent_`|`uint256`|Reward percentage for the film|


### getFilmShare

Gets the share information for a film based on its ID

*Retrieves the share percentages and studio payees for the specified film
Studio payees are the addresses that will receive a part of the film's revenue based on their share percentage.*


```solidity
function getFilmShare(uint256 _filmId)
    external
    view
    returns (uint256[] memory sharePercents_, address[] memory studioPayees_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`sharePercents_`|`uint256[]`|List of share percentages for the film|
|`studioPayees_`|`address[]`|List of studio payees for the film|


### isEnabledClaimer

Gets the enableClaimer status for a filmID


```solidity
function isEnabledClaimer(uint256 _filmId) external view returns (bool enable_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film to get the enableClaimer status|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`enable_`|`bool`|The enableClaimer status|


### getFilmIds

Get film IDs based on flag


```solidity
function getFilmIds(uint256 _flag) external view returns (uint256[] memory list_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_flag`|`uint256`|Flag: 1 = proposal, 2 = approveListing, 3 = approveFunding, 4 = updated|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`list_`|`uint256[]`|Array of film IDs|


### getPoolUsers

Get pool users based on flag


```solidity
function getPoolUsers(uint256 _flag) external view onlyAuditor returns (address[] memory list_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_flag`|`uint256`|Flag: 1 for studioPoolUsers, 2 for edgePoolUsers|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`list_`|`address[]`|Array of pool users addresses|


### getFinalizedFilmIds

Get finalized film IDs for a specific month


```solidity
function getFinalizedFilmIds(uint256 _monthId) external view returns (uint256[] memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_monthId`|`uint256`|Month ID to get finalized film IDs|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256[]`|Array of finalized film IDs|


### checkSetFinalFilms

Checks if the rewards for the provided film IDs can be finalized.

*Determines whether each film ID is eligible to have its rewards distributed based on the time since the last
reward distribution.
A film can receive rewards if either:
- It has never received rewards before.
- The required period (specified by `Property::filmRewardClaimPeriod`) has passed since the last time it received
rewards.*


```solidity
function checkSetFinalFilms(uint256[] calldata _filmIds) public view returns (bool[] memory _valids);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmIds`|`uint256[]`|List of film IDs to check for reward finalization eligibility.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`_valids`|`bool[]`|List of boolean values indicating if each film ID is eligible to have its rewards finalized.|


### getAllAvailableRewards

Gets all available rewards for a user

*Calculates the total available rewards for the user from the last time he claimed up to the current month*


```solidity
function getAllAvailableRewards(uint256 _curMonth, address _user) public view returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_curMonth`|`uint256`|Current month ID|
|`_user`|`address`|Address of the user|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|Total available rewards for the user|


### getUserRewardAmountForUser

Gets the reward amount for a user for a specific film ID

*Calculates the total reward amount for the user for the specified film ID
from the last time he claimed up to the current month*


```solidity
function getUserRewardAmountForUser(uint256 _filmId, uint256 _curMonth, address _user) public view returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film|
|`_curMonth`|`uint256`|Current month ID|
|`_user`|`address`|Address of the user|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|Total reward amount for the user|


### getFilmProposalTime

Gets the proposal creation and approval times for a film based on its ID

*Retrieves the proposal creation and approval times for the specified film*


```solidity
function getFilmProposalTime(uint256 _filmId) public view returns (uint256 cTime_, uint256 aTime_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`cTime_`|`uint256`|Creation time of the proposal|
|`aTime_`|`uint256`|Approval time of the proposal|


### getUserRewardAmountBetweenMonths

Gets the reward amount for a user between two months

*Calculates the total reward amount for the user for the specified film ID between the two months*


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
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film|
|`_preMonth`|`uint256`|Previous month ID|
|`_curMonth`|`uint256`|Current month ID|
|`_user`|`address`|Address of the user|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amount_`|`uint256`|Total reward amount for the user|


### __moveToAnotherArray

*Moves a value from one storage array to another and removes it from the first array.*

*Finds the index of the value in `array1`, moves it to `array2`, and updates `array1` accordingly.*


```solidity
function __moveToAnotherArray(uint256[] storage array1, uint256[] storage array2, uint256 value) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`array1`|`uint256[]`|The source array from which the value will be moved.|
|`array2`|`uint256[]`|The destination array to which the value will be moved.|
|`value`|`uint256`|The value to be moved from `array1` to `array2`.|


### __paidFee

*Handles the payment of proposal fees from the user / studio to the staking pool.*

*Transfers the required fee amount in a specified token (must be an allowed deposit asset)
to the staking pool, calculates the expected amount of VAB tokens using UniswapV2, swaps the token to VAB,
and adds the resulting VAB amount as a reward to the staking pool.*


```solidity
function __paidFee(address _dToken, uint256 _noVote) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_dToken`|`address`|The token address used for the payment of the proposal fee.|
|`_noVote`|`uint256`|Flag indicating if the proposal skipped voting phase 0 = false, 1 = true has to pay double the proposal fee if the proposal skipped voting|


### __setFinalFilm

*Finalizes the payout and reward distribution for a given film.*

*This function updates the final amounts to be paid to payees and investors
based on the film's status and the amount raised.
It handles both `APPROVED_LISTING` and `APPROVED_FUNDING` statuses. For `APPROVED_LISTING`,
it directly sets the final payout amounts to the payees. For `APPROVED_FUNDING`
it calculates and distributes the rewards to the helpers (investors) and the remaining amount to the payees.*


```solidity
function __setFinalFilm(uint256 _filmId, uint256 _payout) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|The unique identifier of the film being finalized.|
|`_payout`|`uint256`|The total payout amount to be distributed for the film.|


### __setFinalAmountToPayees

*Calculates and sets the final payout amounts for the studio payees of a film.*

*Avoid stack to deep error here.*


```solidity
function __setFinalAmountToPayees(uint256 _filmId, uint256 _payout, uint256 _curMonth) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|The unique identifier of the film.|
|`_payout`|`uint256`|The total payout amount to be distributed to the payees.|
|`_curMonth`|`uint256`|The current month identifier.|


### __setFinalAmountToHelpers

*Calculates and sets the final reward amounts for the investors of a funded film.*


```solidity
function __setFinalAmountToHelpers(uint256 _filmId, uint256 _rewardAmount, uint256 _curMonth) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|The unique identifier of the film.|
|`_rewardAmount`|`uint256`|The total reward amount to be distributed to the investors.|
|`_curMonth`|`uint256`|The current month identifier.|


### __addFinalFilmId

*Adds the film ID to the list of finalized rewards based on the film IDs for the user.*


```solidity
function __addFinalFilmId(address _user, uint256 _filmId) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_user`|`address`|The address of the user.|
|`_filmId`|`uint256`|The unique identifier of the film.|


### __claimAllReward

*Claims all rewards for a given list of film IDs for the caller.*

*Retrieves the total reward amount for the caller from the specified film IDs,
transfers the rewards in VAB tokens to the caller, and updates the studio pool accordingly.*


```solidity
function __claimAllReward(uint256[] memory _filmIds) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmIds`|`uint256[]`|List of film IDs for which rewards are being claimed.|


### __updateFinalizeAmountAndLastClaimMonth

*Updates the finalized payout amounts and last claim month for a film when ownership changes.*


```solidity
function __updateFinalizeAmountAndLastClaimMonth(
    uint256 _filmId,
    uint256 _curMonth,
    address _oldOwner,
    address _newOwner
)
    private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|The unique identifier of the film for which the ownership is being updated.|
|`_curMonth`|`uint256`|The current month identifier.|
|`_oldOwner`|`address`|The address of the current owner of the film's payouts.|
|`_newOwner`|`address`|The address of the new owner of the film's payouts.|


## Events
### FilmProposalCreated
*Emitted when a film proposal is created*


```solidity
event FilmProposalCreated(uint256 indexed filmId, uint256 noVote, uint256 fundType, address studio);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`filmId`|`uint256`|The ID of the film proposal|
|`noVote`|`uint256`|If the proposal can skip voting phase 0 = false, 1 = true|
|`fundType`|`uint256`|The type of funding for the proposal 0 = Distribution, 1 = Token, 2 = NFT, 3 = NFT & Token)|
|`studio`|`address`|The address of the studio creating the proposal|

### FilmProposalUpdated
*Emitted when a film proposal is updated*


```solidity
event FilmProposalUpdated(uint256 indexed filmId, uint256 fundType, address studio);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`filmId`|`uint256`|The ID of the updated film proposal|
|`fundType`|`uint256`|The updated type of funding for the proposal 0 = Distribution, 1 = Token, 2 = NFT, 3 = NFT & Token)|
|`studio`|`address`|The address of the studio updating the proposal|

### FilmFundPeriodUpdated
*Emitted when the film fund period is updated*


```solidity
event FilmFundPeriodUpdated(uint256 indexed filmId, address studio, uint256 fundPeriod);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`filmId`|`uint256`|The ID of the film whose fund period is updated|
|`studio`|`address`|The address of the studio updating the fund period|
|`fundPeriod`|`uint256`|The updated fund period|

### AllocatedToPool
*Emitted when funds are allocated to a pool*


```solidity
event AllocatedToPool(address[] users, uint256[] amounts, uint256 which);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`users`|`address[]`|The list of users receiving allocations|
|`amounts`|`uint256[]`|The amounts allocated to each user|
|`which`|`uint256`|Indicates the type of pool (1 = studio, 2 = edge)|

### RewardAllClaimed
*Emitted when a user claims all rewards for a month*


```solidity
event RewardAllClaimed(address indexed user, uint256 indexed monthId, uint256[] filmIds, uint256 claimAmount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`user`|`address`|The address of the user claiming rewards|
|`monthId`|`uint256`|The ID of the month for which rewards are claimed|
|`filmIds`|`uint256[]`|The list of film IDs involved in the claim|
|`claimAmount`|`uint256`|The total amount claimed|

### SetFinalFilms
*Emitted when final films are set by the auditor*


```solidity
event SetFinalFilms(address indexed user, uint256[] filmIds, uint256[] payouts);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`user`|`address`|The address of the auditor setting the final films|
|`filmIds`|`uint256[]`|The list of film IDs set as final|
|`payouts`|`uint256[]`|The payout amounts for each film|

### ChangeFilmOwner
*Emitted when the ownership of a film changes*


```solidity
event ChangeFilmOwner(uint256 indexed filmId, address indexed oldOwner, address indexed newOwner);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`filmId`|`uint256`|The ID of the film whose ownership is changing|
|`oldOwner`|`address`|The address of the previous owner|
|`newOwner`|`address`|The address of the new owner|

### FinalFilmSetted

```solidity
event FinalFilmSetted(
    address[] users, uint256[] filmIds, uint256[] watchedPercents, uint256[] rentPrices, uint256 setTime
);
```

