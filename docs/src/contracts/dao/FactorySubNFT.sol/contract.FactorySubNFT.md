# FactorySubNFT
[Git Source](https://github.com/Mill1995/VABDAO/blob/9050477259e61daa6bf97d9f648c5d24a5f80da7/contracts/dao/FactorySubNFT.sol)

**Inherits:**
IERC721Receiver, ReentrancyGuard

*A factory contract for managing subscription NFTs.
Users can mint subscription NFTs, lock and unlock them based on predefined
categories and parameters. Payment can be made in either ETH or allowed ERC20 tokens.
This contract interfaces with Ownablee and UniHelper contracts for configuration
and asset management.*


## State Variables
### OWNABLE
*Address of the Ownable contract*


```solidity
address private immutable OWNABLE;
```


### UNI_HELPER
*Address of the UniHelper contract*


```solidity
address private immutable UNI_HELPER;
```


### subNFTAddress
Address of the deployed subscription NFT contract


```solidity
address public subNFTAddress;
```


### subNFTContract
*Instance of the VabbleNFT contract used for subscription NFTs*


```solidity
VabbleNFT private subNFTContract;
```


### baseUri
Base URI for the subscription NFTs


```solidity
string public baseUri;
```


### collectionUri
Collection URI for the subscription NFTs


```solidity
string public collectionUri;
```


### mintInfo
*Mapping of category IDs to minting information*

*Maps each category ID to its corresponding minting information*


```solidity
mapping(uint256 => Mint) private mintInfo;
```


### lockInfo
*Mapping of token IDs to locking information*

*Maps each token ID to its corresponding locking information*


```solidity
mapping(uint256 => Lock) private lockInfo;
```


### subNFTTokenList
Mapping of user addresses to lists of minted token IDs

*Maps each user address to a list of token IDs they have minted*


```solidity
mapping(address => uint256[]) public subNFTTokenList;
```


### categoryList
List of all category IDs with configured minting information


```solidity
uint256[] public categoryList;
```


## Functions
### onlyAuditor

*Restricts access to the current Auditor.*


```solidity
modifier onlyAuditor();
```

### constructor

*Constructor to initialize the contract with addresses of the Ownablee and UniHelper contracts.*


```solidity
constructor(address _ownable, address _uniHelper);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_ownable`|`address`|Address of the Ownablee contract.|
|`_uniHelper`|`address`|Address of the UniHelper contract.|


### receive


```solidity
receive() external payable;
```

### setBaseURI

Set baseURI and collectionURI for the subscription NFTs.
Can only be called by the auditor.


```solidity
function setBaseURI(string memory _baseUri, string memory _collectionUri) external onlyAuditor;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_baseUri`|`string`|Base URI for the NFT metadata.|
|`_collectionUri`|`string`|Collection URI for the NFT metadata.|


### setMintInfo

Set minting information for a specific category of subscription NFTs.
Can only be called by the auditor.


```solidity
function setMintInfo(
    uint256 _mintAmount,
    uint256 _mintPrice,
    uint256 _lockPeriod,
    uint256 _category
)
    external
    onlyAuditor;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_mintAmount`|`uint256`|Maximum number of NFTs that can be minted in this category.|
|`_mintPrice`|`uint256`|Price in USDC to mint one NFT in this category.|
|`_lockPeriod`|`uint256`|Lock period in seconds after which the NFT can be unlocked.|
|`_category`|`uint256`|Category ID for which to set the minting information.|


### deploySubNFTContract

Deploy a new subscription NFT contract.
Can only be called by the auditor.


```solidity
function deploySubNFTContract(string memory _name, string memory _symbol) external onlyAuditor nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_name`|`string`|Name of the new NFT contract.|
|`_symbol`|`string`|Symbol of the new NFT contract.|


### mintToBatch

Mint multiple subscription NFTs to multiple addresses.


```solidity
function mintToBatch(
    address _token,
    address[] calldata _toList,
    uint256[] calldata _periodList,
    uint256[] calldata _categoryList
)
    external
    payable
    nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_token`|`address`|Address of the token used for payment.|
|`_toList`|`address[]`|Array of recipient addresses to receive the NFTs.|
|`_periodList`|`uint256[]`|Array of subscription periods for each NFT.|
|`_categoryList`|`uint256[]`|Array of category IDs for each NFT.|


### lockNFT

Lock a subscription NFT for the specified period.
Only the owner of the NFT can lock it.
Transfers the NFT from the owner to this contract.


```solidity
function lockNFT(uint256 _tokenId) external nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_tokenId`|`uint256`|ID of the subscription NFT to be locked.|


### unlockNFT

Unlock a subscription NFT and transfer it from this contract to the owner's wallet.

*Requires that the caller is the minter of the NFT and that the lock period has expired.*


```solidity
function unlockNFT(uint256 _tokenId) external nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_tokenId`|`uint256`|The ID of the subscription NFT to unlock|


### getLockInfo

Get lock information for a specific subscription NFT.


```solidity
function getLockInfo(uint256 _tokenId)
    external
    view
    returns (uint256 subPeriod_, uint256 lockPeriod_, uint256 lockTime_, uint256 category_, address minter_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_tokenId`|`uint256`|The ID of the subscription NFT to query|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`subPeriod_`|`uint256`|The subscription period associated with the NFT|
|`lockPeriod_`|`uint256`|The lock period associated with the NFT|
|`lockTime_`|`uint256`|The timestamp when the NFT was locked|
|`category_`|`uint256`|The category of the NFT|
|`minter_`|`address`|The address of the minter of the NFT|


### getNFTOwner

Get the owner of a specific subscription NFT.


```solidity
function getNFTOwner(uint256 _tokenId) external view returns (address owner_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_tokenId`|`uint256`|The ID of the subscription NFT to query|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`owner_`|`address`|The address of the current owner of the NFT|


### getUserTokenIdList

Get the list of token IDs minted by a specific user.


```solidity
function getUserTokenIdList(address _owner) external view returns (uint256[] memory tokenIds_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_owner`|`address`|The address of the user to query|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`tokenIds_`|`uint256[]`|An array of token IDs minted by the user|


### getTokenUri

Get the URI of a specific subscription NFT.


```solidity
function getTokenUri(uint256 _tokenId) external view returns (string memory tokeUri_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_tokenId`|`uint256`|The ID of the subscription NFT to query|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`tokeUri_`|`string`|The URI of the NFT's metadata|


### getMintInfo

Get mint information for a specific category.


```solidity
function getMintInfo(uint256 _category)
    external
    view
    returns (uint256 mintAmount_, uint256 mintPrice_, uint256 lockPeriod_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_category`|`uint256`|The category ID to query|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`mintAmount_`|`uint256`|The maximum mint amount allowed for the category|
|`mintPrice_`|`uint256`|The mint price for the category|
|`lockPeriod_`|`uint256`|The lock period associated with the category|


### onERC721Received

*Whenever an {IERC721} `tokenId` token is transferred to this contract via {IERC721-safeTransferFrom}
by `operator` from `from`, this function is called.
It must return its Solidity selector to confirm the token transfer.
If any other value is returned or the interface is not implemented by the recipient, the transfer will be
reverted.
The selector can be obtained in Solidity with `IERC721Receiver.onERC721Received.selector`.*


```solidity
function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4);
```

### getExpectedTokenAmount

Get the expected amount of tokens needed for minting based on the provided payment token and amount.


```solidity
function getExpectedTokenAmount(address _token, uint256 _usdcAmount) public view returns (uint256 amount_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_token`|`address`|The address of the payment token|
|`_usdcAmount`|`uint256`|The amount in USDC equivalent to calculate against|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amount_`|`uint256`|The expected amount of tokens required for minting|


### getTotalSupply

Get the total supply of subscription NFTs.


```solidity
function getTotalSupply() public view returns (uint256);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The total supply of subscription NFTs|


### __mint

*Function to mint subscription NFTs to a specified address.*

*Allows minting with optional lock period based on the category of NFT.*


```solidity
function __mint(address _token, address _to, uint256 _subPeriod, uint256 _category) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_token`|`address`|The address of the payment token for minting|
|`_to`|`address`|The address to mint the subscription NFTs to|
|`_subPeriod`|`uint256`|The subscription period associated with the minted NFTs|
|`_category`|`uint256`|The category of the subscription NFTs to mint|


### __handleMintPay

*Function to handle payment and minting process.*

*Handles payment in either ETH or ERC20 tokens, calculates expected amount,
swaps assets if necessary, and transfers USDC to the `Ownablee::VAB_WALLET`.*


```solidity
function __handleMintPay(address _payToken, uint256[] calldata _periodList, uint256[] calldata _categoryList) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_payToken`|`address`|The address of the payment token|
|`_periodList`|`uint256[]`|An array of subscription periods for minting|
|`_categoryList`|`uint256[]`|An array of categories for minting|


## Events
### SubscriptionERC721Created
Emitted when a new subscription ERC721 NFT contract is deployed.


```solidity
event SubscriptionERC721Created(address indexed nftCreator, address nftContract);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`nftCreator`|`address`|The address of the creator of the ERC721 contract|
|`nftContract`|`address`|The address of the deployed ERC721 contract|

### SubscriptionERC721Minted
Emitted when a new subscription NFT is minted.


```solidity
event SubscriptionERC721Minted(address receiver, uint256 subscriptionPeriod, uint256 indexed tokenId);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`receiver`|`address`|The address that received the minted NFT|
|`subscriptionPeriod`|`uint256`|The subscription period associated with the minted NFT|
|`tokenId`|`uint256`|The ID of the minted NFT|

### SubscriptionNFTLocked
Emitted when a subscription NFT is locked.


```solidity
event SubscriptionNFTLocked(uint256 indexed tokenId, uint256 lockPeriod, address owner);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`tokenId`|`uint256`|The ID of the locked NFT|
|`lockPeriod`|`uint256`|The lock period associated with the NFT|
|`owner`|`address`|The current owner of the NFT|

### SubscriptionNFTUnLocked
Emitted when a subscription NFT is unlocked.


```solidity
event SubscriptionNFTUnLocked(uint256 indexed tokenId, address owner);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`tokenId`|`uint256`|The ID of the unlocked NFT|
|`owner`|`address`|The owner who unlocked the NFT|

## Structs
### Mint
*Struct containing minting parameters for each category of subscription NFTs.*


```solidity
struct Mint {
    uint256 maxMintAmount;
    uint256 mintPrice;
    uint256 lockPeriod;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`maxMintAmount`|`uint256`|Maximum number of NFTs that can be minted in this category.|
|`mintPrice`|`uint256`|Price in USDC (scaled by 1e6) to mint one NFT in this category.|
|`lockPeriod`|`uint256`|Lock period in seconds after which the NFT can be unlocked.|

### Lock
*Struct containing locking parameters for each subscription NFT.*


```solidity
struct Lock {
    uint256 subscriptionPeriod;
    uint256 lockPeriod;
    uint256 lockTime;
    uint256 category;
    address minter;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`subscriptionPeriod`|`uint256`|Subscription period associated with the NFT.|
|`lockPeriod`|`uint256`|Lock period in seconds for this NFT.|
|`lockTime`|`uint256`|Timestamp when the NFT was locked.|
|`category`|`uint256`|Category of the NFT.|
|`minter`|`address`|Address of the user who minted the NFT.|

