// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "../libraries/Ownable.sol";
import "hardhat/console.sol";

contract VoteFilm is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    event FilmsProposalCreated(uint256[] indexed filmIds);    

    enum Status {
        CREATED,  // proposal created by studio
        APPROVE, // approved by vote from VAB holders
        RENTED   // rented from customers
    }

    struct UserInfo {
        uint256 amount;
    }

    IERC20 public immutable PAYOUT_TOKEN; // Vab token

    Counters.Counter public filmIds; // filmId is from No.1

    constructor(
        address _payoutToken
    ) {        
        require(_payoutToken != address(0), "_payoutToken: ZERO address");
        PAYOUT_TOKEN = IERC20(_payoutToken);
    }
}