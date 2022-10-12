// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IProperty {  
    function filmVotePeriod() external view returns (uint256);        // 0
    function boardVotePeriod() external view returns (uint256);       // 1
    function boardVoteWeight() external view returns (uint256);       // 2
    function agentVotePeriod() external view returns (uint256);       // 3
    function disputeGracePeriod() external view returns (uint256);    // 4
    function propertyVotePeriod() external view returns (uint256);    // 5
    function lockPeriod() external view returns (uint256);            // 6
    function rewardRate() external view returns (uint256);            // 7
    function extraRewardRate() external view returns (uint256);       // 8
    function maxAllowPeriod() external view returns (uint256);        // 9
    function proposalFeeAmount() external view returns (uint256);     // 10
    function fundFeePercent() external view returns (uint256);        // 11
    function minDepositAmount() external view returns (uint256);      // 12
    function maxDepositAmount() external view returns (uint256);      // 13
    function maxMintFeePercent() external view returns (uint256);     // 14
    function subscriptionAmount() external view returns (uint256);    // 15    
    function availableVABAmount() external view returns (uint256);
    
    function getAgent(uint256 _agentIndex) external view returns (address agent_);
    function removeAgent(uint256 _index) external;

    function getProperty(uint256 _propertyIndex, uint256 _flag) external view returns (uint256 property_);
    function updateProperty(uint256 _propertyIndex, uint256 _flag) external;
    function removeProperty(uint256 _propertyIndex, uint256 _flag) external;
    
    function setRewardAddress(address _rewardAddress) external;    
    function isRewardWhitelist(address _rewardAddress) external view returns (uint256);
    function DAO_FUND_REWARD() external view returns (address);
}
