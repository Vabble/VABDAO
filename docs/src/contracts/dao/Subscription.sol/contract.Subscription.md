# Subscription
[Git Source](https://github.com/Mill1995/VABDAO/blob/4914bdc306cbdb860037485ce4bcebbfdd390c9f/contracts/dao/Subscription.sol)

**Inherits:**
ReentrancyGuard

*This contract facilitates subscription management for renting films on the streaming portal,
allowing users to activate subscriptions using allowed payment tokens and managing subscription periods.
The Auditor can add discount percentage for different subscription periods.
We allow subscriptions for (1, 3, 6, 12 months).*


## State Variables
### OWNABLE
*Address of the Ownablee contract*


```solidity
address private immutable OWNABLE;
```


### UNI_HELPER
*Address of the UniHelper contract*


```solidity
address private immutable UNI_HELPER;
```


### DAO_PROPERTY
*Address of the Property contract*


```solidity
address private immutable DAO_PROPERTY;
```


### PERIOD_UNIT
*Fixed unit of a subscription period (30 days)*


```solidity
uint256 private constant PERIOD_UNIT = 30 days;
```


### PERCENT40
*Constant representing 40% in scaled units*


```solidity
uint256 private constant PERCENT40 = 40 * 1e8;
```


### PERCENT60
*Constant representing 60% in scaled units*


```solidity
uint256 private constant PERCENT60 = 60 * 1e8;
```


### discountList
*Array holding discount percentages for different subscription durations*


```solidity
uint256[] private discountList;
```


### subscriptionInfo
Mapping to store user subscription information


```solidity
mapping(address => UserSubscription) public subscriptionInfo;
```


## Functions
### onlyAuditor

*Restricts access to the current Auditor.*


```solidity
modifier onlyAuditor();
```

### constructor

*Constructor to initialize Subscription contract.*


```solidity
constructor(address _ownable, address _uniHelper, address _property, uint256[] memory _discountPercents);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_ownable`|`address`|Address of the Ownablee contract.|
|`_uniHelper`|`address`|Address of the UniHelper contract.|
|`_property`|`address`|Address of the Property contract.|
|`_discountPercents`|`uint256[]`|Array of discount percentages for different subscription periods (3, 6, 12 months).|


### receive


```solidity
receive() external payable;
```

### activeSubscription

active subscription(pay $1 monthly as ETH/USDC/USDT/VAB...) for renting the films

Activate a subscription using a specified token for a given period.

*Allows users to activate a subscription by paying using ETH or allowed ERC20 tokens.*


```solidity
function activeSubscription(address _token, uint256 _period) external payable nonReentrant;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_token`|`address`|Address of the payment token (ERC20) or address(0) for ETH.|
|`_period`|`uint256`|Subscription period in months (e.g., 1, 3, 6, 12).|


### addDiscountPercent

Add discount percentages for different subscription durations.

*Only callable by the auditor.*


```solidity
function addDiscountPercent(uint256[] calldata _discountPercents) external onlyAuditor;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_discountPercents`|`uint256[]`|Array of discount percentages for subscription periods (3, 6, 12 months). The array must contain exactly three elements.|


### getDiscountPercentList

Retrieve the current discount percentage list.


```solidity
function getDiscountPercentList() external view returns (uint256[] memory list_);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`list_`|`uint256[]`|Array of discount percentages for subscription periods (3, 6, 12 months).|


### getExpectedSubscriptionAmount

Calculate the expected token amount that a user should pay for activating the subscription.


```solidity
function getExpectedSubscriptionAmount(address _token, uint256 _period) public view returns (uint256 expectAmount_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_token`|`address`|Address of the payment token (ERC20) or address(0) for ETH.|
|`_period`|`uint256`|Subscription period in months (e.g., 1, 3, 6, 12).|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`expectAmount_`|`uint256`|Expected token amount to be paid.|


### isActivedSubscription

Check if a customer has an active subscription.


```solidity
function isActivedSubscription(address _customer) public view returns (bool active_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_customer`|`address`|Address of the customer to check.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`active_`|`bool`|Boolean indicating whether the customer has an active subscription.|


## Events
### SubscriptionActivated
*Emitted when a subscription is successfully activated.*


```solidity
event SubscriptionActivated(address indexed customer, address token, uint256 period);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`customer`|`address`|Address of the customer who activated the subscription.|
|`token`|`address`|Address of the payment token used for subscription.|
|`period`|`uint256`|Subscription period in months.|

## Structs
### UserSubscription
*Struct representing a user's subscription details.*


```solidity
struct UserSubscription {
    uint256 activeTime;
    uint256 period;
    uint256 expireTime;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`activeTime`|`uint256`|Timestamp when the subscription was activated.|
|`period`|`uint256`|Subscription period in months (e.g., 1 => 1 month, 3 => 3 months).|
|`expireTime`|`uint256`|Timestamp when the subscription expires.|

