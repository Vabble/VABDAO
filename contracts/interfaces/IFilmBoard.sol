// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IFilmBoard {  

    function updateLastVoteTime(address _member) external;

    function addFilmBoardMember(address _member) external;

    function isWhitelist(address _member) external view returns (bool);

    function filmBoardCandidates() external view returns (address[] memory);
    
    function isAgent(address _agent) external view returns (bool);
    
    function getAgentArray() external view returns (address[] memory);

}
