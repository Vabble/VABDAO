// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IFilmBoard {  

    function updateLastVoteTime(address _member) external;

    function addFilmBoardMember(address _member) external;

    function isBoardWhitelist(address _member) external view returns (uint256);
    
    function Agent() external view returns (address);

    function releaseAgent() external;
}
