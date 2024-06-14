# Ownablee
[Git Source](https://github.com/Mill1995/VABDAO/blob/4914bdc306cbdb860037485ce4bcebbfdd390c9f/contracts/dao/Ownablee.sol)

**Inherits:**
[IOwnablee](/contracts/interfaces/IOwnablee.sol/interface.IOwnablee.md)

Contract managing ownership and administrative functions for Vabble platform contracts.
This contract handles setup of key addresses such as auditor, Vabble wallet, and allowed deposit assets for staking,
voting and payments accross the whole protocol.

*This contract must be deployed first.*


## State Variables
### STAKING_POOL
*The address of the StakingPool contract*


```solidity
address private STAKING_POOL;
```


### VABBLE_DAO
*The address of the VabbleDAO contract*


```solidity
address private VABBLE_DAO;
```


### VOTE
*The address of the Vote contract*


```solidity
address private VOTE;
```


### VAB_WALLET
*The address of the Vabble wallet*


```solidity
address public override VAB_WALLET;
```


### auditor
*The address of the current Auditor*


```solidity
address public override auditor;
```


### deployer
*The address of the deployer*


```solidity
address public immutable override deployer;
```


### USDC_TOKEN
*The address of the USDC token*


```solidity
address public immutable override USDC_TOKEN;
```


### PAYOUT_TOKEN
*The address of the VAB token*


```solidity
address public immutable override PAYOUT_TOKEN;
```


### depositAssetList
*List of assets allowed for deposit.*


```solidity
address[] private depositAssetList;
```


### allowAssetToDeposit
*Mapping to track allowed deposit assets.*


```solidity
mapping(address => bool) private allowAssetToDeposit;
```


## Functions
### onlyAuditor

*Restricts access to the auditor.*


```solidity
modifier onlyAuditor();
```

### onlyDeployer

*Restricts access to the deployer.*


```solidity
modifier onlyDeployer();
```

### onlyVote

*Restricts access to the vote contract.*


```solidity
modifier onlyVote();
```

### onlyDAO

*Restricts access to the VabbleDAO contract.*


```solidity
modifier onlyDAO();
```

### onlyStakingPool

*Restricts access to the StakingPool contract.*


```solidity
modifier onlyStakingPool();
```

### constructor

*Constructor to initialize the Ownablee contract.*


```solidity
constructor(address _vabbleWallet, address _payoutToken, address _usdcToken, address _multiSigWallet);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_vabbleWallet`|`address`|Address of the Vabble wallet.|
|`_payoutToken`|`address`|Address of the VAB token contract.|
|`_usdcToken`|`address`|Address of the USDC token contract.|
|`_multiSigWallet`|`address`|Address of the multi-signature wallet (auditor).|


### setup

Sets up initial contract addresses for voting, DAO, and staking pool.


```solidity
function setup(address _vote, address _dao, address _stakingPool) external onlyDeployer;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_vote`|`address`|Address of the Vote contract.|
|`_dao`|`address`|Address of the VabbleDAO contract.|
|`_stakingPool`|`address`|Address of the StakingPool contract.|


### transferAuditor

Transfers the role of auditor to a new address.


```solidity
function transferAuditor(address _newAuditor) external override onlyAuditor;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_newAuditor`|`address`|Address of the new auditor.|


### replaceAuditor

Replaces the auditor address with a new address (callable only by Vote contract).

*This will be called when a proposal to replace the auditor is approved.*


```solidity
function replaceAuditor(address _newAuditor) external override onlyVote;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_newAuditor`|`address`|Address of the new auditor.|


### addDepositAsset

Adds new assets to the list of assets allowed for deposit.


```solidity
function addDepositAsset(address[] calldata _assetList) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_assetList`|`address[]`|List of asset addresses to be added.|


### removeDepositAsset

Removes assets from the list of assets allowed for deposit.


```solidity
function removeDepositAsset(address[] calldata _assetList) external onlyAuditor;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_assetList`|`address[]`|List of asset addresses to be removed.|


### addToStudioPool

Adds VAB tokens from the contract balance to the VabbleDAO for studio pool.


```solidity
function addToStudioPool(uint256 _amount) external override onlyDAO;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_amount`|`uint256`|Amount of VAB tokens to transfer.|


### depositVABToEdgePool

Deposits VAB tokens from the auditor's address to the contract for the EdgePool.


```solidity
function depositVABToEdgePool(uint256 _amount) external onlyAuditor;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_amount`|`uint256`|Amount of VAB tokens to deposit.|


### withdrawVABFromEdgePool

Withdraws VAB tokens from the contract to a specified address (callable only by StakingPool).

*This is part of the migration process to a new DAO.*

*The _to address is what was specified in the proposal to change the reward address.*


```solidity
function withdrawVABFromEdgePool(address _to) external override onlyStakingPool returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_to`|`address`|Address to receive the withdrawn VAB tokens.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The amount of VAB tokens withdrawn.|


### isDepositAsset

Checks if an asset is allowed for deposit.


```solidity
function isDepositAsset(address _asset) external view override returns (bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_asset`|`address`|Address of the asset to check.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|True if the asset is allowed for deposit, false otherwise.|


### getDepositAssetList

Retrieves the list of assets allowed for deposit.


```solidity
function getDepositAssetList() external view override returns (address[] memory);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`address[]`|An array of asset addresses allowed for deposit.|


### getVoteAddress

Retrieves the address of the Vote contract.


```solidity
function getVoteAddress() public view returns (address);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`address`|The address of the Vote contract.|


### getVabbleDAO

Retrieves the address of the VabbleDAO contract.


```solidity
function getVabbleDAO() public view returns (address dao_);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`dao_`|`address`|The address of the VabbleDAO contract.|


### getStakingPoolAddress

Retrieves the address of the StakingPool contract.


```solidity
function getStakingPoolAddress() public view returns (address);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`address`|The address of the StakingPool contract.|


## Events
### VABWalletChanged
*Emitted when the Vabble wallet address is changed.*


```solidity
event VABWalletChanged(address indexed wallet);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`wallet`|`address`|The new Vabble wallet address.|

