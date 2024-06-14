# MockERC721
[Git Source](https://github.com/Mill1995/VABDAO/blob/9050477259e61daa6bf97d9f648c5d24a5f80da7/contracts/mocks/MockERC721.sol)

**Inherits:**
ERC721Enumerable, Ownable


## State Variables
### _currentTokenId

```solidity
uint256 private _currentTokenId;
```


## Functions
### constructor


```solidity
constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol);
```

### mintTo

*Mints a token to an address with a tokenURI.*


```solidity
function mintTo(address _to) public onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_to`|`address`|address of the future owner of the token|


### batchMintTo


```solidity
function batchMintTo(address _to, uint256 _amount) external onlyOwner;
```

### __getNextTokenId

*calculates the next token ID based on value of _currentTokenId*


```solidity
function __getNextTokenId() private view returns (uint256);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|uint256 for the next token ID|


### __incrementTokenId

*increments the value of _currentTokenId*


```solidity
function __incrementTokenId() private;
```

### baseTokenURI


```solidity
function baseTokenURI() public pure returns (string memory);
```

### tokenURI


```solidity
function tokenURI(uint256 _tokenId) public pure override returns (string memory);
```

