// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "../libraries/Ownable.sol";
import "../interfaces/IRentFilm.sol";
import "hardhat/console.sol";

contract VoteFilm is Ownable, ReentrancyGuard {
    
    event FilmsVoted(uint256[] indexed filmIds, uint256[] status, address voter);

    // enum Status {
    //     YES,     // 1
    //     NO,      // 2
    //     ABSTAIN  // 3
    // }
    // struct Voter {
    //     uint256 filmId;  // index of the voted proposal
    //     Status status;   // Vote status
    // }

    struct Proposal {
        uint256 count_1;   // count of voters with status(yes)
        uint256 count_2;   // count of voters with status(no)
        uint256 count_3;   // count of voters with status(abstain)
        uint256 voteCount;// number of accumulated votes
    }

    address private rentFilmContract;

    mapping(uint256 => Proposal) public proposal;
    
    mapping(address => mapping(uint256 => bool)) public voteAttend; // If true, a customer voted to a film

    modifier onlyCandidate() {
        require(msg.sender != address(0), "onlyCandidate: Zero address");
        require(IRentFilm(rentFilmContract).getUserAmount(msg.sender) > 100, "onlyCandidate: Insufficient VAB holder");
        _;
    }

    constructor() {}

    /// @notice Set RentFilm contract address by only auditor
    function setting(address _contract) external onlyAuditor {
        rentFilmContract = _contract;
    }    

    /// @notice Vote to multi films from a VAB holder
    function voteToFilms(bytes calldata _voteData) external onlyCandidate {
        require(_voteData.length > 0, "voteToFilm: Bad items length");
        (
            uint256[] memory filmIds_, 
            uint256[] memory votes_
        ) = abi.decode(_voteData, (uint256[], uint256[]));
        
        require(filmIds_.length == votes_.length, "voteToFilm: Bad votes length");

        uint256[] memory votedFilmIds = new uint256[](filmIds_.length);
        uint256[] memory votedStatus = new uint256[](filmIds_.length);

        for (uint256 i; i < filmIds_.length; i++) { 
            if(_voteToFilm(filmIds_[i], votes_[i])) {
                votedFilmIds[i] = filmIds_[i];
                votedStatus[i] = votes_[i];
            }
        }

        emit FilmsVoted(votedFilmIds, votedStatus, msg.sender);
    }

    function _voteToFilm(uint256 _filmId, uint256 _voteInfo) private returns(bool) {
        require(!voteAttend[msg.sender][_filmId], "_voteToFilm: Already voted");

        voteAttend[msg.sender][_filmId] = true;

        Proposal storage _proposal = proposal[_filmId];
        _proposal.voteCount++;
        if(_voteInfo == 1) _proposal.count_1++;      // Yes
        else if(_voteInfo == 2) _proposal.count_2++; // No
        else if(_voteInfo == 3) _proposal.count_3++; // Abstain

        require(_proposal.voteCount == (_proposal.count_1 + _proposal.count_2 + _proposal.count_3), "_voteToFilm: Bad voted");

        // Todo auto approve for a proposal film
        // Example : Over 50% of the minimum 100 voting
        if(_proposal.voteCount > 100 && _proposal.count_1 > _proposal.voteCount / 2) {
            IRentFilm(rentFilmContract).ApproveFilm(_filmId);
        }

        return true;
    }
}