# MockERC1155
[Git Source](https://github.com/Mill1995/VABDAO/blob/df9d3dbfaf61478d7e8a6f44f0a92a8ebe82bada/contracts/mocks/MockERC1155.sol)

**Inherits:**
ERC1155


## State Variables
### _uri_

```solidity
string private _uri_ = "https://opensea-creatures-api.herokuapp.com/api/creature/{id}.json";
```


## Functions
### constructor


```solidity
constructor() ERC1155(_uri_);
```

