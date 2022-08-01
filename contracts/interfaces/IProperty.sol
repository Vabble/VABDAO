// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IProperty {  
    function filmVotePeriod() external view returns (uint256);
    function boardVotePeriod() external view returns (uint256);
    function agentVotePeriod() external view returns (uint256);
    function boardVoteWeight() external view returns (uint256);
    function disputeGracePeriod() external view returns (uint256);
    function propertyVotePeriod() external view returns (uint256);
    function lockPeriod() external view returns (uint256);
    function rewardRate() external view returns (uint256);
    function extraRewardRate() external view returns (uint256);
    function maxAllowPeriod() external view returns (uint256);
    function proposalFeeAmount() external view returns (uint256);
    function fundFeePercent() external view returns (uint256);
    function minDepositAmount() external view returns (uint256);
    function maxDepositAmount() external view returns (uint256);
    function maxMintFeePercent() external view returns (uint256);    
    function availableVABAmount() external view returns (uint256);
    
    function getAgent(uint256 _agentIndex) external view returns (address agent_);
    function removeAgent(uint256 _index) external;

    function getProperty(uint256 _propertyIndex, uint256 _flag) external view returns (uint256 property_);
    function updateProperty(uint256 _propertyIndex, uint256 _flag) external;
    function removeProperty(uint256 _propertyIndex, uint256 _flag) external;
}
