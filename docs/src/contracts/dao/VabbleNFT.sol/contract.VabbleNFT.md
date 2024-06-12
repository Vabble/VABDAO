# VabbleNFT
[Git Source](https://github.com/Mill1995/VABDAO/blob/217c9b2f97086a2b56e9d8ed6314ee399ea48dff/contracts/dao/VabbleNFT.sol)

**Inherits:**
ERC2981, ERC721Enumerable, ReentrancyGuard


## State Variables
### nftCount

```solidity
Counters.Counter private nftCount;
```


### baseUri

```solidity
string public baseUri;
```


### collectionUri

```solidity
string public collectionUri;
```


### FACTORY

```solidity
address public immutable FACTORY;
```


## Functions
### constructor


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

### supportsInterface


```solidity
function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Enumerable, ERC2981) returns (bool);
```

### _beforeTokenTransfer


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

### contractURI


```solidity
function contractURI() public view returns (string memory);
```

### mintTo


```solidity
function mintTo(address _to) public nonReentrant returns (uint256);
```

### __getNextTokenId

*Generate tokenId(film nft=>odd, subscription nft=>even)*


```solidity
function __getNextTokenId() private returns (uint256 newTokenId_);
```

### tokenURI

Set tokenURI in all available cases


```solidity
function tokenURI(uint256 _tokenId) public view virtual override returns (string memory);
```

### transferNFT


```solidity
function transferNFT(uint256 _tokenId, address _to) external;
```

### userTokenIdList


```solidity
function userTokenIdList(address _owner) external view returns (uint256[] memory _tokensOfOwner);
```

### totalSupply

Return total minited NFT count


```solidity
function totalSupply() public view override returns (uint256);
```

