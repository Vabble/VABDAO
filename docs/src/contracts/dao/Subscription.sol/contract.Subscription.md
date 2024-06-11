# Subscription
[Git Source](https://github.com/Mill1995/VABDAO/blob/0d779ec55317045015c4224c0805ea7a1092ab9f/contracts/dao/Subscription.sol)

**Inherits:**
ReentrancyGuard


## State Variables
### OWNABLE

```solidity
address private immutable OWNABLE;
```


### UNI_HELPER

```solidity
address private immutable UNI_HELPER;
```


### DAO_PROPERTY

```solidity
address private immutable DAO_PROPERTY;
```


### PERIOD_UNIT

```solidity
uint256 private constant PERIOD_UNIT = 30 days;
```


### PERCENT60

```solidity
uint256 private constant PERCENT60 = 60 * 1e8;
```


### PERCENT40

```solidity
uint256 private constant PERCENT40 = 40 * 1e8;
```


### discountList

```solidity
uint256[] private discountList;
```


### subscriptionInfo

```solidity
mapping(address => UserSubscription) public subscriptionInfo;
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
constructor(address _ownable, address _uniHelper, address _property, uint256[] memory _discountPercents);
```

### activeSubscription

active subscription(pay $1 monthly as ETH/USDC/USDT/VAB...) for renting the films


```solidity
function activeSubscription(address _token, uint256 _period) external payable nonReentrant;
```

### getExpectedSubscriptionAmount

Expected token amount that user should pay for activing the subscription


```solidity
function getExpectedSubscriptionAmount(address _token, uint256 _period) public view returns (uint256 expectAmount_);
```

### isActivedSubscription

Check if subscription period


```solidity
function isActivedSubscription(address _customer) public view returns (bool active_);
```

### addDiscountPercent

Add discount percents(3 months, 6 months, 12 months) from Auditor


```solidity
function addDiscountPercent(uint256[] calldata _discountPercents) external onlyAuditor;
```

### getDiscountPercentList

get discount percent list


```solidity
function getDiscountPercentList() external view returns (uint256[] memory list_);
```

## Events
### SubscriptionActivated

```solidity
event SubscriptionActivated(address indexed customer, address token, uint256 period);
```

## Structs
### UserSubscription

```solidity
struct UserSubscription {
    uint256 activeTime;
    uint256 period;
    uint256 expireTime;
}
```

