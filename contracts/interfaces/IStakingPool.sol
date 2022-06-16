// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

interface IStakingPool {    
    function getStakeAmount(address _user) external view returns(uint256 amount_);

    function getWithdrawableTime(address _user) external view returns(uint256 time_);

    function updateWithdrawableTime(address _user, uint256 _time) external;

    function addReward(uint256 _amount) external;
}
