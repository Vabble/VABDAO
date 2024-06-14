# VabbleNFT
[Git Source](https://github.com/Mill1995/VABDAO/blob/4914bdc306cbdb860037485ce4bcebbfdd390c9f/contracts/dao/VabbleNFT.sol)

**Inherits:**
ERC2981, ERC721Enumerable, ReentrancyGuard

ERC721 NFT contract with metadata extension, royalty support, and minting controls.
This contract manages the minting, transferring, and metadata retrieval of Vabble NFTs (Non-Fungible Tokens).
It supports a base URI for token metadata and a collection URI for overall contract metadata.


## State Variables
### baseUri
*Base URI for retrieving token metadata.*


```solidity
string public baseUri;
```


### collectionUri
*Collection URI for contract-level metadata.*


```solidity
string public collectionUri;
```


### FACTORY
*Address of the factory contract that manages NFT creation.*


```solidity
address public immutable FACTORY;
```


### nftCount
*Counter for tracking the number of minted NFTs.*


```solidity
Counters.Counter private nftCount;
```


## Functions
### constructor

Constructor to initialize the VabbleNFT contract.


```solidity
constructor(
    string memory _baseUri,
    string memory _collectionUri,
    string memory _name,
    string memory _symbol,
    address _factory
)
    ERC721(_name, _symbol);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_baseUri`|`string`|Base URI for retrieving token metadata.|
|`_collectionUri`|`string`|Collection URI for contract-level metadata.|
|`_name`|`string`|Name of the NFT contract.|
|`_symbol`|`string`|Symbol of the NFT contract.|
|`_factory`|`address`|Address of the factory contract that deploys this NFT contract.|


### transferNFT

Transfers ownership of an NFT from the caller to a specified recipient.


```solidity
function transferNFT(uint256 _tokenId, address _to) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_tokenId`|`uint256`|ID of the NFT to transfer.|
|`_to`|`address`|Address of the recipient to transfer the NFT to.|


### userTokenIdList

Retrieves a list of token IDs owned by a specific address.


```solidity
function userTokenIdList(address _owner) external view returns (uint256[] memory _tokensOfOwner);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_owner`|`address`|Address of the owner to query tokens for.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`_tokensOfOwner`|`uint256[]`|Array of token IDs owned by the specified address.|


### mintTo

Mints a new NFT and assigns it to the specified recipient.

*Only callable by the FACTORY contract to ensure controlled minting.*


```solidity
function mintTo(address _to) public nonReentrant returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_to`|`address`|Address to assign the newly minted NFT to.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|newTokenId The ID of the newly minted NFT.|


### supportsInterface

Checks if a specific interface is supported by this contract.


```solidity
function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Enumerable, ERC2981) returns (bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`interfaceId`|`bytes4`|The interface identifier to check.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|True if the interface is supported, false otherwise.|


### contractURI

Retrieves the collection-level metadata URI for this contract.


```solidity
function contractURI() public view returns (string memory);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`string`|collectionUri The URI string pointing to the contract metadata.|


### tokenURI

Retrieves the token-level metadata URI for a specific NFT.


```solidity
function tokenURI(uint256 _tokenId) public view virtual override returns (string memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_tokenId`|`uint256`|ID of the NFT to retrieve metadata for.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`string`|URI string pointing to the token's metadata.|


### totalSupply

Retrieves the total number of minted NFTs.


```solidity
function totalSupply() public view override returns (uint256);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|Total count of minted NFTs.|


### _beforeTokenTransfer

*Hook function called before transferring tokens.*


```solidity
function _beforeTokenTransfer(
    address from,
    address to,
    uint256 firstTokenId,
    uint256 batchSize
)
    internal
    virtual
    override(ERC721Enumerable);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`from`|`address`|Address transferring the tokens.|
|`to`|`address`|Address receiving the tokens.|
|`firstTokenId`|`uint256`|ID of the first token being transferred.|
|`batchSize`|`uint256`|Number of tokens being transferred in the batch.|


### __getNextTokenId

*Internal function to generate the next token ID for minting.*


```solidity
function __getNextTokenId() private returns (uint256 newTokenId_);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`newTokenId_`|`uint256`|The next available token ID.|


