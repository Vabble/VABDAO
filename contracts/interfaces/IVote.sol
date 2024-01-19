// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IVote { 
    function getLastVoteTime(address _member) external view returns (uint256 time_);
}
