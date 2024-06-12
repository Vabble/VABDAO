# FactoryTierNFT
[Git Source](https://github.com/Mill1995/VABDAO/blob/c1ade743ae4227c63e3d49544ad80f6b569b00da/contracts/dao/FactoryTierNFT.sol)

**Inherits:**
ReentrancyGuard


## State Variables
### baseUri

```solidity
string public baseUri;
```


### collectionUri

```solidity
string public collectionUri;
```


### nftInfo

```solidity
mapping(address => TierNFT) public nftInfo;
```


### userTierNFTs

```solidity
mapping(address => address[]) private userTierNFTs;
```


### tierInfo

```solidity
mapping(uint256 => mapping(uint256 => Tier)) public tierInfo;
```


### tierCount

```solidity
mapping(uint256 => uint256) public tierCount;
```


### tierNFTContract

```solidity
mapping(uint256 => mapping(uint256 => VabbleNFT)) public tierNFTContract;
```


### tierNFTTokenList

```solidity
mapping(uint256 => mapping(uint256 => uint256[])) public tierNFTTokenList;
```


### OWNABLE

```solidity
address private immutable OWNABLE;
```


### VABBLE_DAO

```solidity
address private immutable VABBLE_DAO;
```


### VABBLE_FUND

```solidity
address private immutable VABBLE_FUND;
```


## Functions
### onlyAuditor


```solidity
modifier onlyAuditor();
```

### constructor


```solidity
constructor(address _ownable, address _vabbleDAO, address _vabbleFund);
```

### setBaseURI

Set baseURI by Auditor.


```solidity
function setBaseURI(string memory _baseUri, string memory _collectionUri) external onlyAuditor;
```

### setTierInfo

onlyStudio set tier info for his films


```solidity
function setTierInfo(
    uint256 _filmId,
    uint256[] calldata _minAmounts,
    uint256[] calldata _maxAmounts
)
    external
    nonReentrant;
```

### deployTierNFTContract

Studio deploy a nft contract per filmId


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

### mintTierNft

Should be called //before fundProcess() of VabbleDAO contract


```solidity
function mintTierNft(uint256 _filmId) external nonReentrant;
```

### getUserTierNFTs

userTierNFTs


```solidity
function getUserTierNFTs(address _user) external view returns (address[] memory);
```

### getNFTOwner


```solidity
function getNFTOwner(uint256 _filmId, uint256 _tokenId, uint256 _tier) external view returns (address);
```

### getTotalSupply


```solidity
function getTotalSupply(uint256 _filmId, uint256 _tier) public view returns (uint256);
```

### getTierTokenIdList


```solidity
function getTierTokenIdList(uint256 _filmId, uint256 _tier) external view returns (uint256[] memory);
```

### getUserTokenIdList


```solidity
function getUserTokenIdList(uint256 _filmId, address _owner, uint256 _tier) public view returns (uint256[] memory);
```

### getTokenUri


```solidity
function getTokenUri(uint256 _filmId, uint256 _tokenId, uint256 _tier) external view returns (string memory);
```

## Events
### TierERC721Created

```solidity
event TierERC721Created(address nftCreator, address nftContract, uint256 indexed tier);
```

### TierERC721Minted

```solidity
event TierERC721Minted(address nftContract, uint256 indexed tokenId, address receiver);
```

### TierInfoSetted

```solidity
event TierInfoSetted(address filmOwner, uint256 indexed filmId, uint256 tierCount);
```

## Structs
### TierNFT

```solidity
struct TierNFT {
    string name;
    string symbol;
}
```

### Tier

```solidity
struct Tier {
    uint256 maxAmount;
    uint256 minAmount;
}
```

