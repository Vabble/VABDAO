# FactoryTierNFT
[Git Source](https://github.com/Mill1995/VABDAO/blob/4914bdc306cbdb860037485ce4bcebbfdd390c9f/contracts/dao/FactoryTierNFT.sol)

**Inherits:**
ReentrancyGuard

This contract manages the deployment and minting of tier-specific NFTs
for films. It interacts with VabbleDAO for film ownership and fund management,
VabbleFund for investment tracking, and deploys VabbleNFT contracts for each tier.


## State Variables
### OWNABLE
*Address of the Ownablee contract.*


```solidity
address private immutable OWNABLE;
```


### VABBLE_DAO
*Address of the VabbleDAO contract.*


```solidity
address private immutable VABBLE_DAO;
```


### VABBLE_FUND
*Address of the VabbleFund contract.*


```solidity
address private immutable VABBLE_FUND;
```


### baseUri
Base URI for the metadata of all NFTs created by this contract.


```solidity
string public baseUri;
```


### collectionUri
Collection URI for the metadata of all NFTs created by this contract.


```solidity
string public collectionUri;
```


### nftInfo
Mapping to store information about each deployed tiered NFT contract.


```solidity
mapping(address => TierNFT) public nftInfo;
```


### tierCount
Mapping to store the number of tiers defined for each film.


```solidity
mapping(uint256 => uint256) public tierCount;
```


### tierInfo
Mapping to store investment tiers for each film ID.


```solidity
mapping(uint256 => mapping(uint256 => Tier)) public tierInfo;
```


### tierNFTContract
Mapping to store deployed VabbleNFT contracts for each film's tier.
(filmId => (tier number => nftcontract))


```solidity
mapping(uint256 => mapping(uint256 => VabbleNFT)) public tierNFTContract;
```


### tierNFTTokenList
Mapping to store a list of token IDs minted for each film's tier.


```solidity
mapping(uint256 => mapping(uint256 => uint256[])) public tierNFTTokenList;
```


### userTierNFTs
Mapping to store a list of tiered NFT contract addresses deployed by each studio.


```solidity
mapping(address => address[]) private userTierNFTs;
```


## Functions
### onlyAuditor

*Restricts access to the current Auditor.*


```solidity
modifier onlyAuditor();
```

### constructor

*Constructor to initialize the FactoryTierNFT contract.*


```solidity
constructor(address _ownable, address _vabbleDAO, address _vabbleFund);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_ownable`|`address`|Address of the Ownablee contract.|
|`_vabbleDAO`|`address`|Address of the VabbleDAO contract.|
|`_vabbleFund`|`address`|Address of the VabbleFund contract.|


### setBaseURI

Set baseURI and collectionURI for all NFTs created by this contract.

*Only callable by the Auditor.*


```solidity
function setBaseURI(string memory _baseUri, string memory _collectionUri) external onlyAuditor;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_baseUri`|`string`|Base URI for all NFTs.|
|`_collectionUri`|`string`|Collection URI for all NFTs.|


### setTierInfo

Set tier information for a film NFT.

*Only callable by the owner of the film.*


```solidity
function setTierInfo(
    uint256 _filmId,
    uint256[] calldata _minAmounts,
    uint256[] calldata _maxAmounts
)
    external
    nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film.|
|`_minAmounts`|`uint256[]`|Array of minimum investment amounts for each tier.|
|`_maxAmounts`|`uint256[]`|Array of maximum investment amounts for each tier.|


### deployTierNFTContract

Studio deploys a tier-specific NFT contract for a specific film.

*Only callable by the owner of the film and when investment tiers are set.*


```solidity
function deployTierNFTContract(
    uint256 _filmId,
    uint256 _tier,
    string memory _name,
    string memory _symbol
)
    external
    nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film.|
|`_tier`|`uint256`|Tier number associated with the NFT contract.|
|`_name`|`string`|Name of the NFT contract.|
|`_symbol`|`string`|Symbol of the NFT contract.|


### mintTierNft

Mints a tier-specific NFT for the caller if conditions are met.

*Should be called before the fundProcess() of VabbleDAO contract.*


```solidity
function mintTierNft(uint256 _filmId) external nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film for which the tier-specific NFT is minted.|


### getUserTierNFTs

Retrieves the list of tier-specific NFT contracts owned by a user.


```solidity
function getUserTierNFTs(address _user) external view returns (address[] memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_user`|`address`|Address of the user.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`address[]`|An array of addresses representing the tier-specific NFT contracts owned by the user.|


### getNFTOwner

Retrieves the owner of a specific tier-specific NFT token.


```solidity
function getNFTOwner(uint256 _filmId, uint256 _tokenId, uint256 _tier) external view returns (address);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film associated with the NFT.|
|`_tokenId`|`uint256`|ID of the NFT token.|
|`_tier`|`uint256`|Tier number associated with the NFT.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`address`|Address of the owner of the NFT token.|


### getTokenUri

Retrieves the URI of metadata associated with a specific tier-specific NFT token.


```solidity
function getTokenUri(uint256 _filmId, uint256 _tokenId, uint256 _tier) external view returns (string memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film associated with the NFT.|
|`_tokenId`|`uint256`|ID of the NFT token.|
|`_tier`|`uint256`|Tier number associated with the NFT.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`string`|URI string pointing to the metadata of the NFT token.|


### getTierTokenIdList

Retrieves the list of token IDs minted for a specific tier of a film.


```solidity
function getTierTokenIdList(uint256 _filmId, uint256 _tier) external view returns (uint256[] memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film.|
|`_tier`|`uint256`|Tier number associated with the NFT.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256[]`|An array of token IDs minted for the specified tier.|


### getTotalSupply

Retrieves the total supply of tier-specific NFTs minted for a film.


```solidity
function getTotalSupply(uint256 _filmId, uint256 _tier) public view returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film.|
|`_tier`|`uint256`|Tier number associated with the NFT.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|Total number of tier-specific NFTs minted for the specified tier of the film.|


### getUserTokenIdList

Retrieves the list of token IDs owned by a user for a specific tier of a film.


```solidity
function getUserTokenIdList(uint256 _filmId, address _owner, uint256 _tier) public view returns (uint256[] memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film.|
|`_owner`|`address`|Address of the owner.|
|`_tier`|`uint256`|Tier number associated with the NFT.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256[]`|An array of token IDs owned by the specified owner for the specified tier.|


## Events
### TierERC721Created
*Emitted when a new tier-specific ERC721 contract is created.*


```solidity
event TierERC721Created(address nftCreator, address nftContract, uint256 indexed tier);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`nftCreator`|`address`|Address of the studio creating the NFT contract.|
|`nftContract`|`address`|Address of the newly created NFT contract.|
|`tier`|`uint256`|Tier number associated with the NFT contract, if tier != 0 then tierNFTContract|

### TierERC721Minted
*Emitted when a tier-specific ERC721 token is minted.*


```solidity
event TierERC721Minted(address nftContract, uint256 indexed tokenId, address receiver);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`nftContract`|`address`|Address of the NFT contract.|
|`tokenId`|`uint256`|ID of the minted token.|
|`receiver`|`address`|Address of the receiver of the minted token.|

### TierInfoSetted
*Emitted when investment tier information is set for a film.*


```solidity
event TierInfoSetted(address filmOwner, uint256 indexed filmId, uint256 tierCount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`filmOwner`|`address`|Address of the studio setting the tier information.|
|`filmId`|`uint256`|ID of the film associated with the tier information.|
|`tierCount`|`uint256`|Number of tiers defined for the film.|

## Structs
### TierNFT
*Struct to hold information about a tiered NFT.*


```solidity
struct TierNFT {
    string name;
    string symbol;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`name`|`string`|Name of the NFT associated with the tier.|
|`symbol`|`string`|Symbol of the NFT associated with the tier.|

### Tier
*Struct to define investment tiers for films.*


```solidity
struct Tier {
    uint256 maxAmount;
    uint256 minAmount;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`maxAmount`|`uint256`|Minimum amount required to invest in this tier.|
|`minAmount`|`uint256`|Maximum amount allowed to invest in this tier.|

