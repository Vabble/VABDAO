// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../libraries/Ownable.sol";
import "../libraries/Helper.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IStakingPool.sol";
import "hardhat/console.sol";

contract FilmBoard is Ownable, ReentrancyGuard {

    address[] public whitelist;

    constructor() {}

    /// @notice Add addresses to whitelist by Auditor
    function initializeBoard(address[] calldata _whitelist) external onlyAuditor nonReentrant {
        for (uint256 i; i < _whitelist.length; i++) {
            whitelist.push(_whitelist[i]);
        }
    }

    /// @notice Remove addresses from whitelist by 
    function removeBoard(address[] calldata _board) external onlyAuditor nonReentrant {
        // Todo
    }

    /// @notice Create a proposal with the case to be added to film board where stakers can vote
    function createProposalBoard(address[] calldata _whitelist) external onlyAuditor nonReentrant {
        require(_whitelist.length > 0, "createProposalBoard: Invalid films length");    

        // Todo
    }
}