// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

interface IStakingPool {
    function getStakeAmount(address _user) external view returns (uint256 amount_);

    function getWithdrawableTime(address _user) external view returns (uint256 time_);

    function addVotedData(address _user, uint256 _time, uint256 _proposalID) external;

    function addRewardToPool(uint256 _amount) external;

    function getLimitCount() external view returns (uint256 count_);

    function lastfundProposalCreateTime() external view returns (uint256);

    function updateLastfundProposalCreateTime(uint256 _time) external;

    function addProposalData(address _creator, uint256 _cTime, uint256 _period) external returns (uint256);

    function getRentVABAmount(address _user) external view returns (uint256 amount_);

    function sendVAB(address[] calldata _users, address _to, uint256[] calldata _amounts) external returns (uint256);

    function calcMigrationVAB() external;

    function depositVAB(uint256 amount) external;

    function depositVABTo(address subscriber, uint256 amount) external;
}
