// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

contract Ownable {
    address public auditor;
    mapping(address => bool) public studioList;

    event StudioAdded(address indexed _setter, address indexed _studio);
    event StudioRemoved(address indexed _setter, address indexed _studio);

    constructor() {
        auditor = msg.sender;
    }

    modifier onlyAuditor() {
        require(msg.sender == auditor, "Ownable: caller is not the auditor");
        _;
    }

    modifier onlyStudio() {
        require(studioList[msg.sender], "Ownable: caller is not the studio");
        _;
    }

    function transferAuditor(address _newAuditor) external onlyAuditor {
        require(_newAuditor != address(0), "Ownable: Zero newAuditor address");
        auditor = _newAuditor;
    }

    function isStudio(address _studio) public view returns (bool) {
        return studioList[_studio];
    }

    function addStudio(address _studio) external onlyAuditor {
        require(!isStudio(_studio), "addStudio: Already studio");
        studioList[_studio] = true;
        emit StudioAdded(msg.sender, _studio);
    }

    function removeStudio(address _studio) external onlyAuditor {
        require(isStudio(_studio), "removeStudio: No studio");
        studioList[_studio] = false;
        emit StudioRemoved(msg.sender, _studio);
    }
}
