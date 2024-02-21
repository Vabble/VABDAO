// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IProperty {  
    function filmVotePeriod() external view returns (uint256);        // 0
    function agentVotePeriod() external view returns (uint256);       // 1
    function disputeGracePeriod() external view returns (uint256);    // 2
    function propertyVotePeriod() external view returns (uint256);    // 3
    function lockPeriod() external view returns (uint256);            // 4
    function rewardRate() external view returns (uint256);            // 5
    function filmRewardClaimPeriod() external view returns (uint256); // 6
    function maxAllowPeriod() external view returns (uint256);        // 7
    function proposalFeeAmount() external view returns (uint256);     // 8
    function fundFeePercent() external view returns (uint256);        // 9
    function minDepositAmount() external view returns (uint256);      // 10
    function maxDepositAmount() external view returns (uint256);      // 11
    function maxMintFeePercent() external view returns (uint256);     // 12    
    function minVoteCount() external view returns (uint256);          // 13
    function minStakerCountPercent() external view returns (uint256); // 14      
    function availableVABAmount() external view returns (uint256);    // 15     
    function boardVotePeriod() external view returns (uint256);       // 16    
    function boardVoteWeight() external view returns (uint256);       // 17 
    function rewardVotePeriod() external view returns (uint256);      // 18    
    function subscriptionAmount() external view returns (uint256);    // 19
    function boardRewardRate() external view returns (uint256);       // 20      
    function disputLimitAmount() external view returns (uint256);    

    function getProperty(uint256 _propertyIndex, uint256 _flag) external view returns (uint256 property_);

    function DAO_FUND_REWARD() external view returns (address);

    function updateLastVoteTime(address _member) external;

    function getPropertyProposalTime(uint256 _property, uint256 _flag) external view returns (uint256 cTime_, uint256 aTime_);
    function getGovProposalTime(address _member, uint256 _flag) external view returns (uint256 cTime_, uint256 aTime_);
    
    function updatePropertyProposal(uint256 _property, uint256 _flag, uint256 _approveStatus) external;
    function updateGovProposal(address _member, uint256 _flag, uint256 _approveStatus) external;

    function getGovProposer(uint256 _flag, address _candidate) external view returns (address);
    function getPropertyProposer(uint256 _flag, uint256 _property) external view returns (address);

    function checkGovWhitelist(uint256 _flag, address _address) external view returns (uint256);
    function checkPropertyWhitelist(uint256 _flag, uint256 _property) external view returns (uint256);
}
