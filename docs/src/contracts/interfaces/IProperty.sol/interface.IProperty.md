# IProperty
[Git Source](https://github.com/Mill1995/VABDAO/blob/217c9b2f97086a2b56e9d8ed6314ee399ea48dff/contracts/interfaces/IProperty.sol)


## Functions
### filmVotePeriod


```solidity
function filmVotePeriod() external view returns (uint256);
```

### agentVotePeriod


```solidity
function agentVotePeriod() external view returns (uint256);
```

### disputeGracePeriod


```solidity
function disputeGracePeriod() external view returns (uint256);
```

### propertyVotePeriod


```solidity
function propertyVotePeriod() external view returns (uint256);
```

### lockPeriod


```solidity
function lockPeriod() external view returns (uint256);
```

### rewardRate


```solidity
function rewardRate() external view returns (uint256);
```

### filmRewardClaimPeriod


```solidity
function filmRewardClaimPeriod() external view returns (uint256);
```

### maxAllowPeriod


```solidity
function maxAllowPeriod() external view returns (uint256);
```

### proposalFeeAmount


```solidity
function proposalFeeAmount() external view returns (uint256);
```

### fundFeePercent


```solidity
function fundFeePercent() external view returns (uint256);
```

### minDepositAmount


```solidity
function minDepositAmount() external view returns (uint256);
```

### maxDepositAmount


```solidity
function maxDepositAmount() external view returns (uint256);
```

### maxMintFeePercent


```solidity
function maxMintFeePercent() external view returns (uint256);
```

### minVoteCount


```solidity
function minVoteCount() external view returns (uint256);
```

### minStakerCountPercent


```solidity
function minStakerCountPercent() external view returns (uint256);
```

### availableVABAmount


```solidity
function availableVABAmount() external view returns (uint256);
```

### boardVotePeriod


```solidity
function boardVotePeriod() external view returns (uint256);
```

### boardVoteWeight


```solidity
function boardVoteWeight() external view returns (uint256);
```

### rewardVotePeriod


```solidity
function rewardVotePeriod() external view returns (uint256);
```

### subscriptionAmount


```solidity
function subscriptionAmount() external view returns (uint256);
```

### boardRewardRate


```solidity
function boardRewardRate() external view returns (uint256);
```

### DAO_FUND_REWARD


```solidity
function DAO_FUND_REWARD() external view returns (address);
```

### updateLastVoteTime


```solidity
function updateLastVoteTime(address _member) external;
```

### getPropertyProposalInfo


```solidity
function getPropertyProposalInfo(
    uint256 _index,
    uint256 _flag
)
    external
    view
    returns (uint256, uint256, uint256, uint256, address, Helper.Status);
```

### getGovProposalInfo


```solidity
function getGovProposalInfo(
    uint256 _index,
    uint256 _flag
)
    external
    view
    returns (uint256, uint256, uint256, address, address, Helper.Status);
```

### updatePropertyProposal


```solidity
function updatePropertyProposal(uint256 _index, uint256 _flag, uint256 _approveStatus) external;
```

### updateGovProposal


```solidity
function updateGovProposal(uint256 _index, uint256 _flag, uint256 _approveStatus) external;
```

### checkGovWhitelist


```solidity
function checkGovWhitelist(uint256 _flag, address _address) external view returns (uint256);
```

### checkPropertyWhitelist


```solidity
function checkPropertyWhitelist(uint256 _flag, uint256 _property) external view returns (uint256);
```

### getAgentProposerStakeAmount


```solidity
function getAgentProposerStakeAmount(uint256 _index) external view returns (uint256);
```

