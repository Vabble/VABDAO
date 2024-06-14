# VabbleFund
[Git Source](https://github.com/Mill1995/VABDAO/blob/96e45074ef6d32b9660a684b4e42c099c5b394c6/contracts/dao/VabbleFund.sol)

**Inherits:**
[IVabbleFund](/contracts/interfaces/IVabbleFund.sol/interface.IVabbleFund.md), ReentrancyGuard

VabbleFund contract handles the management of funds deposited for films in the Vabble ecosystem.

*This contract facilitates the deposit, processing, and withdrawal of funds by investors for funding films.
Funds can be deposited in the form of tokens, and are managed based on specified film funding criteria.
Upon successful funding, rewards are distributed to the staking pool and remaining funds are transferred to the film
owner. Funding rewards for investors can be issued in the form of NFT's, tokens or both.*

*The contract interacts with other contracts including Ownable, StakingPool, UniHelper, Property, FactoryFilmNFT,
VabbleDAO, and various ERC20 tokens to achieve its functionalities.*

*It includes features for checking film funding status, managing investor lists, handling asset transfers,
and ensuring compliance with film-specific funding conditions such as minimum and maximum deposit amounts.*


## State Variables
### OWNABLE
*The address of the Ownable contract.*


```solidity
address private immutable OWNABLE;
```


### STAKING_POOL
*The address of the StakingPool contract.*


```solidity
address private immutable STAKING_POOL;
```


### UNI_HELPER
*The address of the UniHelper contract.*


```solidity
address private immutable UNI_HELPER;
```


### DAO_PROPERTY
*The address of the Property contract.*


```solidity
address private immutable DAO_PROPERTY;
```


### FILM_NFT
*The address of the FilmNftFactory contract.*


```solidity
address private immutable FILM_NFT;
```


### VABBLE_DAO
The address of the VabbleDAO contract.


```solidity
address public VABBLE_DAO;
```


### fundProcessedFilmIds
*List of film IDs that have processed funds.*


```solidity
uint256[] private fundProcessedFilmIds;
```


### filmInvestorList
*Mapping from film ID to list of investor addresses.*


```solidity
mapping(uint256 => address[]) private filmInvestorList;
```


### assetPerFilm
Mapping from film ID to list of assets per film.


```solidity
mapping(uint256 => Asset[]) public assetPerFilm;
```


### isFundProcessed
Mapping to check if fund is processed for a film.


```solidity
mapping(uint256 => bool) public isFundProcessed;
```


### assetInfo
Mapping from film ID and customer address to list of assets.


```solidity
mapping(uint256 => mapping(address => Asset[])) public assetInfo;
```


### allowUserNftCount
*Mapping from film ID and user address to NFT count.*


```solidity
mapping(uint256 => mapping(address => uint256)) private allowUserNftCount;
```


## Functions
### onlyDeployer

*Restricts access to the deployer of the Ownable contract.*


```solidity
modifier onlyDeployer();
```

### constructor

Initializes the contract with the given addresses.


```solidity
constructor(address _ownable, address _uniHelper, address _staking, address _property, address _filmNftFactory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_ownable`|`address`|The address of the Ownable contract.|
|`_uniHelper`|`address`|The address of the UniHelper contract.|
|`_staking`|`address`|The address of the StakingPool contract.|
|`_property`|`address`|The address of the DAO property contract.|
|`_filmNftFactory`|`address`|The address of the FilmNftFactory contract.|


### receive


```solidity
receive() external payable;
```

### initialize

Initializes the VabbleDAO contract address.


```solidity
function initialize(address _vabbleDAO) external onlyDeployer;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_vabbleDAO`|`address`|The address of the Vabble DAO.|


### depositToFilm

Investors deposit tokens to fund a film.


```solidity
function depositToFilm(uint256 _filmId, uint256 _amount, uint256 _flag, address _token) external payable nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|The ID of the film.|
|`_amount`|`uint256`|The amount to deposit must be between the range of `Property::minDepositAmount` and `Property::maxDepositAmount`.|
|`_flag`|`uint256`|Indicates the type of deposit (1 for token, 2 for NFT).|
|`_token`|`address`|The address of the token to deposit.|


### fundProcess

Processes the funds for a film, transferring rewards to the staking pool and the remaining funds to the
film owner.

*This function can only be called by the owner of the film and ensures the film has met the funding criteria.*


```solidity
function fundProcess(uint256 _filmId) external nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|The unique identifier of the film to process funds for. Requirements: - Caller must be the owner of the film. - Film must not have already been processed. - Film must be in the approved funding status. - The funding period must have ended. - The film must have raised the full required amount. Functionality: - Calculates and transfers the `Property::fundFeePercent` of the funds to the reward pool as VAB tokens. - Transfers the remaining funds to the film owner. - Marks the film as processed and emits a `FundFilmProcessed` event.|


### withdrawFunding

Allows an investor to withdraw their funds from a film if the funding period has ended and the film did
not meet its funding goal.

*This function can only be called by investors who have deposited funds into the film.*


```solidity
function withdrawFunding(uint256 _filmId) external nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|The unique identifier of the film from which funds are being withdrawn. Requirements: - Film must be in the approved funding status. - The funding period must have ended. - The film must not have raised the full required amount. Functionality: - Transfers deposited tokens back to the investor. - If the investor's total fund amount for the film becomes zero after withdrawal, they are removed from the investor list. - Emits a `FundWithdrawed` event upon successful withdrawal.|


### getFundProcessedFilmIdList

Retrieves a list of film IDs that have successfully processed funds.


```solidity
function getFundProcessedFilmIdList() external view returns (uint256[] memory);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256[]`|List of values representing the film IDs that have completed the fund processing.|


### getFilmInvestorList

Returns the list of investors for a film.


```solidity
function getFilmInvestorList(uint256 _filmId) external view override returns (address[] memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|The ID of the film.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`address[]`|List of investor addresses.|


### getAllowUserNftCount

Returns the allowed NFT count for an investor in a film.


```solidity
function getAllowUserNftCount(uint256 _filmId, address _user) external view override returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|The ID of the film.|
|`_user`|`address`|The address of the investor.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The allowed NFT count.|


### isRaisedFullAmount

Checks if the film funding has met the raise amount.


```solidity
function isRaisedFullAmount(uint256 _filmId) public view override returns (bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|The ID of the film.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|True if the raise amount is met, false otherwise.|


### getUserFundAmountPerFilm

Returns the fund amount for an investor in a film.


```solidity
function getUserFundAmountPerFilm(address _customer, uint256 _filmId) public view override returns (uint256 amount_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_customer`|`address`|The address of the investor.|
|`_filmId`|`uint256`|The ID of the film.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amount_`|`uint256`|The fund amount in USDC.|


### getTotalFundAmountPerFilm

Returns the total fund amount for a film.


```solidity
function getTotalFundAmountPerFilm(uint256 _filmId) public view override returns (uint256 amount_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|The ID of the film.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amount_`|`uint256`|The total fund amount in USDC.|


### __getExpectedTokenAmount

Returns the token amount equivalent to the given USDC amount.


```solidity
function __getExpectedTokenAmount(address _token, uint256 _usdcAmount) public view returns (uint256 amount_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_token`|`address`|The address of the token.|
|`_usdcAmount`|`uint256`|The amount in USDC.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amount_`|`uint256`|The equivalent token amount.|


### __getExpectedUsdcAmount

Returns the USDC amount equivalent to the given token amount.


```solidity
function __getExpectedUsdcAmount(address _token, uint256 _tokenAmount) public view returns (uint256 amount_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_token`|`address`|The address of the token.|
|`_tokenAmount`|`uint256`|The amount of the token.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amount_`|`uint256`|The equivalent USDC amount.|


### __depositToFilm

*Deposits an amount to a film based on specified parameters.*

*Function to deposit funds to a film based on specified conditions.
- Requires proper authorization based on the fund type and token/NFT availability.
- Ensures the deposited amount meets minimum and maximum deposit criteria.*


```solidity
function __depositToFilm(
    uint256 _filmId,
    uint256 _amount,
    uint256 _flag,
    uint256 _fundType,
    uint256 _userFundAmount,
    address _token
)
    private
    returns (uint256 tokenAmount_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|The ID of the film to deposit funds into.|
|`_amount`|`uint256`|The amount to deposit.|
|`_flag`|`uint256`|A flag indicating the type of funding operation: - 1 for token-based funding. - 2 for NFT-based funding.|
|`_fundType`|`uint256`|The type of funding: - 1 for token funding. - 2 for NFT funding. - 3 for NFT & token funding.|
|`_userFundAmount`|`uint256`|The current total funds deposited by the user for the film.|
|`_token`|`address`|The address of the token used for funding.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`tokenAmount_`|`uint256`|The amount of tokens or NFTs deposited.|


### __assignToken

*Assigns a token amount to the user's funding information for a specific film.*

*Function to update or add the token amount for the user's funding information.*


```solidity
function __assignToken(uint256 _filmId, address _token, uint256 _amount) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|The ID of the film.|
|`_token`|`address`|The address of the token.|
|`_amount`|`uint256`|The amount of tokens to assign.|


### __removeFilmInvestorList

*Removes a user from the investor list for a specific film.*


```solidity
function __removeFilmInvestorList(uint256 _filmId, address _user) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|The ID of the film.|
|`_user`|`address`|The address of the user to remove.|


### __isOverMinAmount

*Checks if the amount is over the minimum deposit amount allowed for a film.*


```solidity
function __isOverMinAmount(uint256 _amount) private view returns (bool passed_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_amount`|`uint256`|The amount to check.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`passed_`|`bool`|True if the amount meets or exceeds the minimum deposit amount, otherwise false.|


### __isLessMaxAmount

*Checks if the amount is less than or equal to the maximum deposit amount allowed for a film.*


```solidity
function __isLessMaxAmount(uint256 _amount) private view returns (bool passed_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_amount`|`uint256`|The amount to check.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`passed_`|`bool`|True if the amount is within the maximum deposit amount, otherwise false.|


## Events
### DepositedToFilm
Emitted when tokens are deposited to a film.


```solidity
event DepositedToFilm(address indexed customer, uint256 indexed filmId, address token, uint256 amount, uint256 flag);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`customer`|`address`|The address of the investor.|
|`filmId`|`uint256`|The ID of the film.|
|`token`|`address`|The address of the token deposited.|
|`amount`|`uint256`|The amount of tokens deposited.|
|`flag`|`uint256`|Indicates the type of deposit (1 for token, 2 for NFT).|

### FundFilmProcessed
Emitted when the funding for a film is processed.


```solidity
event FundFilmProcessed(uint256 indexed filmId, address indexed studio);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`filmId`|`uint256`|The ID of the film.|
|`studio`|`address`|The address of the studio.|

### FundWithdrawed
Emitted when funds are withdrawn from a film when the funding failed.


```solidity
event FundWithdrawed(uint256 indexed filmId, address indexed customer);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`filmId`|`uint256`|The ID of the film.|
|`customer`|`address`|The address of the investor.|

## Structs
### Asset
Represents an asset with its token address and amount.


```solidity
struct Asset {
    address token;
    uint256 amount;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|The address of the token.|
|`amount`|`uint256`|The amount of the token.|

