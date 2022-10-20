// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IVote { 
    function getFundingFilmIdsPerUser(address _staker) external view returns (uint256[] memory);
    
    function getFundingIdVoteStatusPerUser(address _staker, uint256 _filmId) external view returns(uint256);

    function removeFundingFilmIdsPerUser(address _staker) external;
}
