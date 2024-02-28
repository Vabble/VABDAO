// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IVote { 
    function getLastVoteTime(address _member) external view returns (uint256 time_);
    function saveProposalWithFilm(uint256 _filmId, uint256 _proposalID) external;
}
