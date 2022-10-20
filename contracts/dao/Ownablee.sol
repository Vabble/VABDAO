// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

contract Ownablee {
    
    event StudioAdded(address[] studioList);
    event StudioRemoved(address[] studioList);

    address public auditor;
    address private VOTE;                // vote contract address
    mapping(address => bool) private studioInfo;
    
    bool public isInitialized;           // check if contract initialized or not

    modifier onlyAuditor() {
        require(msg.sender == auditor, "caller is not the auditor");
        _;
    }

    modifier onlyVote() {
        require(msg.sender == VOTE, "caller is not the vote contract");
        _;
    }

    constructor() {
        auditor = msg.sender;
    }
    
    function setupVote(address _voteContract) external onlyAuditor {
        require(!isInitialized, "setupVote: Already initialized");
        require(_voteContract != address(0), "setupVote: Zero voteContract address");
        VOTE = _voteContract;    
                
        isInitialized = true;
    }    
    
    function transferAuditor(address _newAuditor) external onlyAuditor {
        require(_newAuditor != address(0), "Ownablee: Zero newAuditor address");
        auditor = _newAuditor;
    }

    function replaceAuditor(address _newAuditor) external onlyVote {
        require(_newAuditor != address(0), "Ownablee: Zero newAuditor address");
        auditor = _newAuditor;
    }

    function addStudio(address[] memory _studioList) external onlyAuditor {
        require(_studioList.length > 0, "addStudio: zero studio list");

        for(uint256 i = 0; i < _studioList.length; i++) { 
            require(!studioInfo[_studioList[i]], "addStudio: Already studio");
            studioInfo[_studioList[i]] = true;
        }
        
        emit StudioAdded(_studioList);
    }

    function removeStudio(address[] memory _studioList) external onlyAuditor {
        require(_studioList.length > 0, "addStudio: zero studio list");

        for(uint256 i = 0; i < _studioList.length; i++) { 
            require(studioInfo[_studioList[i]], "removeStudio: No studio");
            studioInfo[_studioList[i]] = false;
        }
        
        emit StudioRemoved(_studioList);
    }

    function isStudio(address _studio) external view returns (bool) {
        return studioInfo[_studio];
    }
}
