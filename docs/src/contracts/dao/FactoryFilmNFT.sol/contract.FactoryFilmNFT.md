# FactoryFilmNFT
[Git Source](https://github.com/Mill1995/VABDAO/blob/217c9b2f97086a2b56e9d8ed6314ee399ea48dff/contracts/dao/FactoryFilmNFT.sol)

**Inherits:**
[IFactoryFilmNFT](/contracts/interfaces/IFactoryFilmNFT.sol/interface.IFactoryFilmNFT.md), ReentrancyGuard


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


### nftInfo

```solidity
mapping(address => FilmNFT) public nftInfo;
```


### filmNFTTokenList

```solidity
mapping(uint256 => uint256[]) private filmNFTTokenList;
```


### studioNFTAddressList

```solidity
mapping(address => address[]) public studioNFTAddressList;
```


### filmNFTContract

```solidity
mapping(uint256 => VabbleNFT) public filmNFTContract;
```


### OWNABLE

```solidity
address private immutable OWNABLE;
```


### VABBLE_DAO

```solidity
address private VABBLE_DAO;
```


### VABBLE_FUND

```solidity
address private VABBLE_FUND;
```


## Functions
### onlyAuditor


```solidity
modifier onlyAuditor();
```

### onlyDeployer


```solidity
modifier onlyDeployer();
```

### constructor


```solidity
constructor(address _ownable);
```

### initialize


```solidity
function initialize(address _vabbleDAO, address _vabbleFund) external onlyDeployer;
```

### setBaseURI

Set baseURI by Auditor.


```solidity
function setBaseURI(string memory _baseUri, string memory _collectionUri) external onlyAuditor;
```

### setMintInfo

onlyStudio set mint info for his films


```solidity
function setMintInfo(uint256 _filmId, uint256 _tier, uint256 _amount, uint256 _price) external nonReentrant;
```

### deployFilmNFTContract

Studio deploy a nft contract per filmId


```solidity
function deployFilmNFTContract(uint256 _filmId, string memory _name, string memory _symbol) external nonReentrant;
```

### claimNft


```solidity
function claimNft(uint256 _filmId) external nonReentrant;
```

### __mint


```solidity
function __mint(uint256 _filmId) private;
```

### changeOwner


```solidity
function changeOwner(uint256 _filmId, address newOwner) external nonReentrant returns (bool);
```

### getNFTOwner


```solidity
function getNFTOwner(uint256 _filmId, uint256 _tokenId) external view returns (address);
```

### getTotalSupply


```solidity
function getTotalSupply(uint256 _filmId) public view override returns (uint256);
```

### getUserTokenIdList


```solidity
function getUserTokenIdList(uint256 _filmId, address _owner) public view returns (uint256[] memory);
```

### getTokenUri


```solidity
function getTokenUri(uint256 _filmId, uint256 _tokenId) external view returns (string memory);
```

### getMintInfo

Get mint information per filmId


```solidity
function getMintInfo(uint256 _filmId)
    external
    view
    override
    returns (uint256 tier_, uint256 maxMintAmount_, uint256 mintPrice_, address nft_, address studio_);
```

### getFilmNFTTokenList


```solidity
function getFilmNFTTokenList(uint256 _filmId) external view returns (uint256[] memory);
```

### getVabbleDAO


```solidity
function getVabbleDAO() public view returns (address dao_);
```

## Events
### FilmERC721Created

```solidity
event FilmERC721Created(address nftCreator, address nftContract, uint256 indexed filmId);
```

### FilmERC721Minted

```solidity
event FilmERC721Minted(address nftContract, uint256 indexed filmId, uint256 indexed tokenId, address receiver);
```

### MintInfoSetted

```solidity
event MintInfoSetted(address filmOwner, uint256 indexed filmId, uint256 tier, uint256 mintAmount, uint256 mintPrice);
```

### ChangeERC721FilmOwner

```solidity
event ChangeERC721FilmOwner(uint256 indexed filmId, address indexed oldOwner, address indexed newOwner);
```

## Structs
### Mint

```solidity
struct Mint {
    uint256 tier;
    uint256 maxMintAmount;
    uint256 price;
    address nft;
    address studio;
}
```

### FilmNFT

```solidity
struct FilmNFT {
    string name;
    string symbol;
}
```

