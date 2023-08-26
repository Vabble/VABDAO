// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../dao/Vote.sol";
interface IVote { 
    function getLastVoteTime(address _member) external view returns (uint256 time_);
}
