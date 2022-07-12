// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IVote { 
    function getFilmIdsPerUser(address _staker) external view returns (uint256[] memory);
    
    function getVoteStatusPerUser(address _staker, uint256 _filmId) external view returns(uint256);

    function removeFilmIdsPerUser(address _staker) external;
}
