# VabbleFund
[Git Source](https://github.com/Mill1995/VABDAO/blob/49910eda11ba2d3203435fe324821be24d291140/contracts/dao/VabbleFund.sol)

**Inherits:**
[IVabbleFund](/contracts/interfaces/IVabbleFund.sol/interface.IVabbleFund.md), ReentrancyGuard


## State Variables
### OWNABLE

```solidity
address private immutable OWNABLE;
```


### STAKING_POOL

```solidity
address private immutable STAKING_POOL;
```


### UNI_HELPER

```solidity
address private immutable UNI_HELPER;
```


### DAO_PROPERTY

```solidity
address private immutable DAO_PROPERTY;
```


### FILM_NFT

```solidity
address private immutable FILM_NFT;
```


### VABBLE_DAO

```solidity
address public VABBLE_DAO;
```


### fundProcessedFilmIds

```solidity
uint256[] private fundProcessedFilmIds;
```


### assetPerFilm

```solidity
mapping(uint256 => Asset[]) public assetPerFilm;
```


### assetInfo

```solidity
mapping(uint256 => mapping(address => Asset[])) public assetInfo;
```


### filmInvestorList

```solidity
mapping(uint256 => address[]) private filmInvestorList;
```


### isFundProcessed

```solidity
mapping(uint256 => bool) public isFundProcessed;
```


### allowUserNftCount

```solidity
mapping(uint256 => mapping(address => uint256)) private allowUserNftCount;
```


## Functions
### onlyDeployer


```solidity
modifier onlyDeployer();
```

### receive


```solidity
receive() external payable;
```

### constructor


```solidity
constructor(address _ownable, address _uniHelper, address _staking, address _property, address _filmNftFactory);
```

### initialize

Initialize


```solidity
function initialize(address _vabbleDAO) external onlyDeployer;
```

### depositToFilm

Deposit tokens(VAB, USDT, USDC)/native token($50 ~ $5000 per address for a film) to only funding film by investor


```solidity
function depositToFilm(uint256 _filmId, uint256 _amount, uint256 _flag, address _token) external payable nonReentrant;
```

### __depositToFilm

*Avoid deep error*


```solidity
function __depositToFilm(
    uint256 _filmId,
    uint256 _amount,
    uint256 _flag,
    uint256 _fundType,
    uint256 _userFundAmount,
    address _token
)
    private
    returns (uint256 tokenAmount_);
```

### __assignToken

*Update/Add user fund amount*


```solidity
function __assignToken(uint256 _filmId, address _token, uint256 _amount) private;
```

### fundProcess

onlyStudio send the 2% of funds to reward pool in VAB if funding meet the raise amount after fund period


```solidity
function fundProcess(uint256 _filmId) external nonReentrant;
```

### withdrawFunding

Investor can withdraw fund after fund period if funding fails to meet the raise amount


```solidity
function withdrawFunding(uint256 _filmId) external nonReentrant;
```

### __removeFilmInvestorList

*Remove user from investor list*


```solidity
function __removeFilmInvestorList(uint256 _filmId, address _user) private;
```

### __isOverMinAmount

*Check min amount for each token/ETH per film*


```solidity
function __isOverMinAmount(uint256 _amount) private view returns (bool passed_);
```

### __isLessMaxAmount

*Check max amount for each token/ETH per film*


```solidity
function __isLessMaxAmount(uint256 _amount) private view returns (bool passed_);
```

### isRaisedFullAmount

Check if fund meet raise amount


```solidity
function isRaisedFullAmount(uint256 _filmId) public view override returns (bool);
```

### getUserFundAmountPerFilm

Get user fund amount in cash(usdc) for each token per film


```solidity
function getUserFundAmountPerFilm(address _customer, uint256 _filmId) public view override returns (uint256 amount_);
```

### getTotalFundAmountPerFilm

Get fund amount in cash(usdc) per film


```solidity
function getTotalFundAmountPerFilm(uint256 _filmId) public view override returns (uint256 amount_);
```

### __getExpectedTokenAmount

*token amount from usdc amount*


```solidity
function __getExpectedTokenAmount(address _token, uint256 _usdcAmount) public view returns (uint256 amount_);
```

### __getExpectedUsdcAmount

*usdc amount from token amount*


```solidity
function __getExpectedUsdcAmount(address _token, uint256 _tokenAmount) public view returns (uint256 amount_);
```

### getFundProcessedFilmIdList

Get fundProcessedFilmIds


```solidity
function getFundProcessedFilmIdList() external view returns (uint256[] memory);
```

### getFilmInvestorList

Get investor list per film Id


```solidity
function getFilmInvestorList(uint256 _filmId) external view override returns (address[] memory);
```

### getAllowUserNftCount

Get investor list per film Id


```solidity
function getAllowUserNftCount(uint256 _filmId, address _user) external view override returns (uint256);
```

## Events
### DepositedToFilm

```solidity
event DepositedToFilm(address indexed customer, uint256 indexed filmId, address token, uint256 amount, uint256 flag);
```

### FundFilmProcessed

```solidity
event FundFilmProcessed(uint256 indexed filmId, address indexed studio);
```

### FundWithdrawed

```solidity
event FundWithdrawed(uint256 indexed filmId, address indexed customer);
```

## Structs
### Asset

```solidity
struct Asset {
    address token;
    uint256 amount;
}
```

