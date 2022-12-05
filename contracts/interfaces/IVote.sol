// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../dao/Vote.sol";
interface IVote { 
    function getFundingFilmIdsPerUser(address _staker) external view returns (uint256[] memory);
    
    function getFundingIdVoteStatusPerUser(address _staker, uint256 _filmId) external view returns(uint256);

    function removeFundingFilmIdsPerUser(address _staker) external;

    function getLastVoteTime(address _member) external view returns (uint256 time_);
}
