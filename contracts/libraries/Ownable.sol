// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract Ownable {
    address public manager;

    mapping(address => bool) private admins; 

    event AddAdmin(address indexed _setter, address indexed _admin);
    event RemoveAdmin(address indexed _setter, address indexed _admin);

    constructor() {
        manager = msg.sender;
    }

    modifier onlyManager() {
        require(msg.sender == manager, "Ownable: caller is not the manager");
        _;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender], "Ownable: caller is not the admin");
        _;
    }

    function isAdmin(address _admin) public view returns (bool) {
        return admins[_admin];
    }
    function addAdmin(address _admin) external onlyManager {
        require(!isAdmin(_admin), "Already admin");
        admins[_admin] = true;

        emit AddAdmin(msg.sender, _admin);
    }

    function removeAdmin(address _admin) external onlyManager {
        require(isAdmin(_admin), "This address is not admin");
        admins[_admin] = false;

        emit RemoveAdmin(msg.sender, _admin);
    }

    function transferManager(address _newManager) external onlyManager {
        require(_newManager != address(0), "Ownable: Zero newManager address");
        manager = _newManager;
    }
}
