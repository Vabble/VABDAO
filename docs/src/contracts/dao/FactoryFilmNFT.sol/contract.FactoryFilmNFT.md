# FactoryFilmNFT
[Git Source](https://github.com/Mill1995/VABDAO/blob/4914bdc306cbdb860037485ce4bcebbfdd390c9f/contracts/dao/FactoryFilmNFT.sol)

**Inherits:**
[IFactoryFilmNFT](/contracts/interfaces/IFactoryFilmNFT.sol/interface.IFactoryFilmNFT.md), ReentrancyGuard

This contract manages the creation and management of film-specific NFTs.
It allows studios to deploy NFT contracts for their films, set minting parameters,
and manage ownership of the NFT contracts. Users can claim allocated NFTs once
funding for a film is fully raised. The contract integrates with VabbleDAO and
VabbleFund contracts to validate ownership, funding status, and other parameters.


## State Variables
### OWNABLE
*Address of the Ownablee contract*


```solidity
address private immutable OWNABLE;
```


### VABBLE_DAO
*Address of the VabbleDAO contract*


```solidity
address private VABBLE_DAO;
```


### VABBLE_FUND
*Address of the VabbleFund contract*


```solidity
address private VABBLE_FUND;
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
Mapping to store information about each deployed NFT contract.


```solidity
mapping(address => FilmNFT) public nftInfo;
```


### studioNFTAddressList
Mapping to store a list of NFT contract addresses deployed by each studio.


```solidity
mapping(address => address[]) public studioNFTAddressList;
```


### filmNFTContract
Mapping to store deployed VabbleNFT contracts for each film ID.


```solidity
mapping(uint256 => VabbleNFT) public filmNFTContract;
```


### filmNFTTokenList
*Mapping to store a list of token IDs minted for each film ID.*


```solidity
mapping(uint256 => uint256[]) private filmNFTTokenList;
```


### mintInfo
*Mapping to store minting information for each film ID.*


```solidity
mapping(uint256 => Mint) private mintInfo;
```


## Functions
### onlyAuditor

*Restricts access to the current Auditor.*


```solidity
modifier onlyAuditor();
```

### onlyDeployer

*Restricts access to the deployer of the ownable contract.*


```solidity
modifier onlyDeployer();
```

### constructor

*Constructor to initialize the FactoryFilmNFT contract.*


```solidity
constructor(address _ownable);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_ownable`|`address`|Address of the Ownablee contract.|


### initialize

Initialize the addresses of VabbleDAO and VabbleFund contracts.

*Only callable by the deployer of the Ownablee contract.*


```solidity
function initialize(address _vabbleDAO, address _vabbleFund) external onlyDeployer;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
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


### setMintInfo

Set minting information for a film.

*Only callable by the owner of the film.*


```solidity
function setMintInfo(uint256 _filmId, uint256 _tier, uint256 _amount, uint256 _price) external nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film.|
|`_tier`|`uint256`|Tier of the minting configuration.|
|`_amount`|`uint256`|Maximum number of NFTs that can be minted.|
|`_price`|`uint256`|Price in USDC to mint one NFT.|


### deployFilmNFTContract

Studio deploys an NFT contract for a specific film.

*Only callable by the owner of the film and when the film is approved for NFT funding.*


```solidity
function deployFilmNFTContract(uint256 _filmId, string memory _name, string memory _symbol) external nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film.|
|`_name`|`string`|Name of the NFT contract.|
|`_symbol`|`string`|Symbol of the NFT contract.|


### claimNft

Claim NFTs allocated for the caller for a specific film.

*Only callable when NFTs are deployed for the film, caller has allocated NFTs, and funding is fully raised.*


```solidity
function claimNft(uint256 _filmId) external nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film.|


### changeOwner

Change the owner of a film's ERC721 contract.

*Only callable by the current owner of the film's ERC721 contract.*


```solidity
function changeOwner(uint256 _filmId, address newOwner) external nonReentrant returns (bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film.|
|`newOwner`|`address`|Address of the new owner.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|success Boolean indicating whether the owner change was successful.|


### getMintInfo

Get minting information for a specific film.


```solidity
function getMintInfo(uint256 _filmId)
    external
    view
    override
    returns (uint256 tier_, uint256 maxMintAmount_, uint256 mintPrice_, address nft_, address studio_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`tier_`|`uint256`|Tier of the minting configuration.|
|`maxMintAmount_`|`uint256`|Maximum number of NFTs that can be minted.|
|`mintPrice_`|`uint256`|Price in USDC to mint one NFT.|
|`nft_`|`address`|Address of the deployed NFT contract.|
|`studio_`|`address`|Address of the studio that owns the film's NFT.|


### getNFTOwner

Get the owner of a specific NFT token.


```solidity
function getNFTOwner(uint256 _filmId, uint256 _tokenId) external view returns (address);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film.|
|`_tokenId`|`uint256`|ID of the NFT token.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`address`|Address of the owner of the NFT token.|


### getTokenUri

Get the URI of a specific NFT token.


```solidity
function getTokenUri(uint256 _filmId, uint256 _tokenId) external view returns (string memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film.|
|`_tokenId`|`uint256`|ID of the NFT token.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`string`|URI of the NFT token.|


### getFilmNFTTokenList

Get the list of token IDs minted for a specific film.


```solidity
function getFilmNFTTokenList(uint256 _filmId) external view returns (uint256[] memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256[]`|Array of token IDs.|


### getTotalSupply

Get the total supply of NFTs minted for a specific film.


```solidity
function getTotalSupply(uint256 _filmId) public view override returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|Total number of NFTs minted.|


### getUserTokenIdList

Get the list of token IDs owned by a specific user for a film.


```solidity
function getUserTokenIdList(uint256 _filmId, address _owner) public view returns (uint256[] memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film.|
|`_owner`|`address`|Address of the owner.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256[]`|Array of token IDs owned by the owner.|


### getVabbleDAO

Get the address of the VabbleDAO contract.


```solidity
function getVabbleDAO() public view returns (address dao_);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`dao_`|`address`|Address of the VabbleDAO contract.|


### __mint

*Mint a new NFT for the caller and update internal records.*

*This function is called internally to mint an NFT for the given film ID.*


```solidity
function __mint(uint256 _filmId) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_filmId`|`uint256`|ID of the film for which the NFT is being minted.|


## Events
### FilmERC721Created
*Emitted when a new film-specific ERC721 contract is created.*


```solidity
event FilmERC721Created(address nftCreator, address nftContract, uint256 indexed filmId);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`nftCreator`|`address`|Address of the studio creating the NFT contract.|
|`nftContract`|`address`|Address of the newly created NFT contract.|
|`filmId`|`uint256`|ID of the film associated with the NFT contract.|

### FilmERC721Minted
*Emitted when a film-specific ERC721 token is minted.*


```solidity
event FilmERC721Minted(address nftContract, uint256 indexed filmId, uint256 indexed tokenId, address receiver);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`nftContract`|`address`|Address of the NFT contract.|
|`filmId`|`uint256`|ID of the film associated with the NFT.|
|`tokenId`|`uint256`|ID of the minted token.|
|`receiver`|`address`|Address of the receiver of the minted token.|

### MintInfoSetted
*Emitted when minting information is set for a film.*


```solidity
event MintInfoSetted(address filmOwner, uint256 indexed filmId, uint256 tier, uint256 mintAmount, uint256 mintPrice);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`filmOwner`|`address`|Address of the studio setting the minting information.|
|`filmId`|`uint256`|ID of the film associated with the minting information.|
|`tier`|`uint256`|Tier of the minting configuration.|
|`mintAmount`|`uint256`|Maximum number of NFTs that can be minted.|
|`mintPrice`|`uint256`|Price in USDC to mint one NFT.|

### ChangeERC721FilmOwner
*Emitted when the ownership of a film's ERC721 contract changes.*


```solidity
event ChangeERC721FilmOwner(uint256 indexed filmId, address indexed oldOwner, address indexed newOwner);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`filmId`|`uint256`|ID of the film associated with the ERC721 contract.|
|`oldOwner`|`address`|Address of the previous owner of the ERC721 contract.|
|`newOwner`|`address`|Address of the new owner of the ERC721 contract.|

## Structs
### Mint
*Struct containing minting parameters for each film.*


```solidity
struct Mint {
    uint256 tier;
    uint256 maxMintAmount;
    uint256 price;
    address nft;
    address studio;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`tier`|`uint256`|Tier of the minting configuration (e.g., 1, 2, 3).|
|`maxMintAmount`|`uint256`|Maximum number of NFTs that can be minted for this film.|
|`price`|`uint256`|Price in USDC (scaled by 1e6) to mint one NFT for this film.|
|`nft`|`address`|Address of the deployed NFT contract for this film.|
|`studio`|`address`|Address of the studio that owns this film's NFT.|

### FilmNFT
*Struct containing basic information about a film's NFT.*


```solidity
struct FilmNFT {
    string name;
    string symbol;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`name`|`string`|Name of the NFT associated with the film.|
|`symbol`|`string`|Symbol of the NFT associated with the film.|

