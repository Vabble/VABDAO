# FactorySubNFT
[Git Source](https://github.com/Mill1995/VABDAO/blob/c1ade743ae4227c63e3d49544ad80f6b569b00da/contracts/dao/FactorySubNFT.sol)

**Inherits:**
IERC721Receiver, ReentrancyGuard


## State Variables
### baseUri

```solidity
string public baseUri;
```


### collectionUri

```solidity
string public collectionUri;
```


### mintInfo

```solidity
mapping(uint256 => Mint) private mintInfo;
```


### lockInfo

```solidity
mapping(uint256 => Lock) private lockInfo;
```


### subNFTTokenList

```solidity
mapping(address => uint256[]) public subNFTTokenList;
```


### categoryList

```solidity
uint256[] public categoryList;
```


### subNFTContract

```solidity
VabbleNFT private subNFTContract;
```


### subNFTAddress

```solidity
address public subNFTAddress;
```


### OWNABLE

```solidity
address private immutable OWNABLE;
```


### UNI_HELPER

```solidity
address private immutable UNI_HELPER;
```


## Functions
### onlyAuditor


```solidity
modifier onlyAuditor();
```

### receive


```solidity
receive() external payable;
```

### constructor


```solidity
constructor(address _ownable, address _uniHelper);
```

### setBaseURI

Set baseURI by Auditor.


```solidity
function setBaseURI(string memory _baseUri, string memory _collectionUri) external onlyAuditor;
```

### setMintInfo

Set subscription nft mint information by Auditor.


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

### deploySubNFTContract

Audio deploy a nft contract for subscription


```solidity
function deploySubNFTContract(string memory _name, string memory _symbol) external onlyAuditor nonReentrant;
```

### __mint

User mint the subscription NFTs to "_to" address


```solidity
function __mint(address _token, address _to, uint256 _subPeriod, uint256 _category) private;
```

### mintToBatch


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

### __handleMintPay


```solidity
function __handleMintPay(address _payToken, uint256[] calldata _periodList, uint256[] calldata _categoryList) private;
```

### lockNFT

Lock subscription NFT for some period (transfer nft from owner wallet to this contract)


```solidity
function lockNFT(uint256 _tokenId) external nonReentrant;
```

### unlockNFT

unlock subscription NFT (transfer nft from this contract to owner wallet)


```solidity
function unlockNFT(uint256 _tokenId) external nonReentrant;
```

### getExpectedTokenAmount


```solidity
function getExpectedTokenAmount(address _token, uint256 _usdcAmount) public view returns (uint256 amount_);
```

### getNFTOwner


```solidity
function getNFTOwner(uint256 _tokenId) external view returns (address owner_);
```

### getTotalSupply


```solidity
function getTotalSupply() public view returns (uint256);
```

### getUserTokenIdList


```solidity
function getUserTokenIdList(address _owner) external view returns (uint256[] memory tokenIds_);
```

### getTokenUri


```solidity
function getTokenUri(uint256 _tokenId) external view returns (string memory tokeUri_);
```

### getMintInfo

Get mint information per category


```solidity
function getMintInfo(uint256 _category)
    external
    view
    returns (uint256 mintAmount_, uint256 mintPrice_, uint256 lockPeriod_);
```

### getLockInfo

Get lock information per tokenId


```solidity
function getLockInfo(uint256 _tokenId)
    external
    view
    returns (uint256 subPeriod_, uint256 lockPeriod_, uint256 lockTime_, uint256 category_, address minter_);
```

### onERC721Received

Needed to mint to this contract the NFT


```solidity
function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4);
```

## Events
### SubscriptionERC721Created

```solidity
event SubscriptionERC721Created(address indexed nftCreator, address nftContract);
```

### SubscriptionERC721Minted

```solidity
event SubscriptionERC721Minted(address receiver, uint256 subscriptionPeriod, uint256 indexed tokenId);
```

### SubscriptionNFTLocked

```solidity
event SubscriptionNFTLocked(uint256 indexed tokenId, uint256 lockPeriod, address owner);
```

### SubscriptionNFTUnLocked

```solidity
event SubscriptionNFTUnLocked(uint256 indexed tokenId, address owner);
```

## Structs
### Mint

```solidity
struct Mint {
    uint256 maxMintAmount;
    uint256 mintPrice;
    uint256 lockPeriod;
}
```

### Lock

```solidity
struct Lock {
    uint256 subscriptionPeriod;
    uint256 lockPeriod;
    uint256 lockTime;
    uint256 category;
    address minter;
}
```

