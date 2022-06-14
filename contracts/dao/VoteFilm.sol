// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "../libraries/Ownable.sol";
import "../libraries/Helper.sol";
import "../interfaces/IRentFilm.sol";
import "../interfaces/IStakingPool.sol";
import "hardhat/console.sol";

contract VoteFilm is Ownable, ReentrancyGuard {
    
    event FilmsVoted(uint256[] indexed filmIds, uint256[] status, address voter);
    event VotePeriodUpdated(uint256 votePeriod);
    event FilmIdsApproved(uint256[] filmIds, uint256[] approvedIds, address caller);

    struct Proposal {
        uint256 stakeAmount_1;  // staking amount of voter with status(yes)
        uint256 stakeAmount_2;  // staking amount of voter with status(no)
        uint256 stakeAmount_3;  // staking amount of voter with status(abstain)
        uint256 voteCount;      // number of accumulated votes
        uint256 voteStartTime;  // vote start time for a film
    }

    address public rentFilmContract;

    address public stakingPool;

    bool public isInitialized;

    uint256 public votePeriod;

    uint256[] private approvedFilmIds;  

    mapping(uint256 => Proposal) public proposal;
    
    mapping(address => mapping(uint256 => bool)) public voteAttend; // If true, a customer voted to a film
    
    modifier notInitialized() {
        require(!isInitialized, "Need initialized!");
        _;
    }

    /// @notice Allow to vote for only staker(stakingAmount > 0)
    modifier onlyCandidate() {
        require(msg.sender != address(0), "onlyCandidate: Zero address");
        // Todo should check candidate condition again
        require(IStakingPool(stakingPool).getStakeAmount(msg.sender) > 0, "onlyCandidate: Insufficient staking amount");
        _;
    }

    constructor() {}

    /// @notice Set RentFilm contract address and stakingPool address by only auditor
    function setting(
        address _rentFilm,
        address _stakingPool,
        uint256 _votePeriod
    ) external onlyAuditor notInitialized {
        require(_rentFilm != address(0) && Helper.isContract(_rentFilm), "setting: Invalid rentfilm address");
        rentFilmContract = _rentFilm;        
        require(_stakingPool != address(0) && Helper.isContract(_stakingPool), "setting: Invalid stakingPool address");
        stakingPool = _stakingPool;
        require(_votePeriod > 0, "setting: Zero vote period");
        votePeriod = _votePeriod;
        isInitialized = true;
    }    

    /// @notice Update vote period by only auditor
    function updateVotePeriod(uint256 _period) external onlyAuditor {
        require(isInitialized, "updateVotePeriod: Need to initialize");
        votePeriod = _period;

        emit VotePeriodUpdated(_period);
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

        Proposal storage _proposal = proposal[_filmId];
        if(_proposal.voteCount == 0) {
            _proposal.voteStartTime = block.timestamp;
        }
        _proposal.voteCount++;

        uint256 stakingAmount = IStakingPool(stakingPool).getStakeAmount(msg.sender);
        if(_voteInfo == 1) _proposal.stakeAmount_1 += stakingAmount; // Yes
        else if(_voteInfo == 2) _proposal.stakeAmount_2 += stakingAmount; // No
        else if(_voteInfo == 3) _proposal.stakeAmount_3 += stakingAmount; // Abstain

        voteAttend[msg.sender][_filmId] = true;

        // Todo should check/define voteStartTime again
        // Example: withdrawTime is 6/15 and voteStartTime is 6/10, votePeriod is 10 days
        // In this case, we update the withdrawTime to sum(6/20) of voteStartTime and votePeriod
        // so, staker cannot unstake his amount till 6/20
        uint256 withdrawableTime =  IStakingPool(stakingPool).getWithdrawableTime(msg.sender);
        if (_proposal.voteStartTime + votePeriod > withdrawableTime) {
            IStakingPool(stakingPool).updateWithdrawableTime(msg.sender, _proposal.voteStartTime + votePeriod);
        }

        return true;
    }

    /// @notice Approve multi films that votePeriod has elapsed by auditor
    function approveFilms(uint256[] memory _filmIds) external onlyAuditor {
        for (uint256 i; i < _filmIds.length; i++) {
            // Example: "YES"(stakeAmount) is 2000 and "NO"(stakeAmount) is 1000, "ABSTAIN"(stakeAmount) is 500 in 10 days(votePeriod)
            // In this case, Approved since 2000 > 1000 + 500
            if(block.timestamp - proposal[_filmIds[i]].voteStartTime > votePeriod) {
                if(proposal[_filmIds[i]].stakeAmount_1 > proposal[_filmIds[i]].stakeAmount_2 + proposal[_filmIds[i]].stakeAmount_3) {
                    IRentFilm(rentFilmContract).approveFilm(_filmIds[i]);
                    approvedFilmIds.push(_filmIds[i]);
                }
            }        
        }        

        emit FilmIdsApproved(_filmIds, approvedFilmIds, msg.sender);
    }

    /// @notice Get proposal film Ids
    function getApprovedFilmIds() external view returns(uint256[] memory) {
        return approvedFilmIds;
    } 

}