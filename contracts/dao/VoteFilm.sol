// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "../libraries/Ownable.sol";
import "../libraries/Helper.sol";
import "../interfaces/IVabbleDAO.sol";
import "../interfaces/IStakingPool.sol";
import "hardhat/console.sol";

contract VoteFilm is Ownable, ReentrancyGuard {
    
    event FilmsVoted(uint256[] indexed filmIds, uint256[] status, address voter);
    event VotePeriodUpdated(uint256 votePeriod);
    event FilmIdsApproved(uint256[] filmIds, uint256[] approvedIds, address caller);
    event AuditorReplaced(address auditor);

    struct Proposal {
        uint256 stakeAmount_1;  // staking amount of voter with status(yes)
        uint256 stakeAmount_2;  // staking amount of voter with status(no)
        uint256 stakeAmount_3;  // staking amount of voter with status(abstain)
        uint256 voteCount;      // number of accumulated votes
        uint256 voteStartTime;  // vote start time for a film
    }

    struct AgentProposal {
        uint256 yes;          // yes
        uint256 no;           // no
        uint256 abtain;       // abstain
        uint256 voteCount;    // number of accumulated votes
        uint256 voteStartTime;// vote start time for an agent
    }

    IERC20 public PAYOUT_TOKEN; // VAB token  
    address public VABBLE_DAO;
    address public STAKING_POOL;
    address public FILM_BOARD;

    bool public isInitialized;
    uint256 public votePeriod;
    uint256 public disputeGracePeriod;
    uint256[] private approvedFilmIds; 
    address[] public agentArray; 

    mapping(uint256 => Proposal) public proposal;    
    mapping(address => mapping(uint256 => bool)) public voteAttend;   //(customer => (filmId => true/false)) 
    mapping(address => AgentProposal) public agentProposal;           //(agent => AgentProposal)
    mapping(address => mapping(address => bool)) public votedToAgent; //(customer => (agent => true/false)) 
    mapping(address => bool) public agentList;    
    
    modifier initialized() {
        require(isInitialized, "Need initialized!");
        _;
    }

    /// @notice Allow to vote for only staker(stakingAmount > 0)
    modifier onlyCandidate() {
        require(msg.sender != address(0), "onlyCandidate: Zero address");
        // Todo should check candidate condition again
        require(IStakingPool(STAKING_POOL).getStakeAmount(msg.sender) > 0, "onlyCandidate: Insufficient staking amount");
        _;
    }

    constructor() {
        votePeriod = 10 days;
        disputeGracePeriod = 30 days;
    }

    /// @notice Set VabbleDAO contract address and stakingPool address by only auditor
    function initializeVote(
        address _vabbleDAO,
        address _stakingPool,
        address _filmBoard,
        address _payoutToken
    ) external onlyAuditor {
        require(_vabbleDAO != address(0) && Helper.isContract(_vabbleDAO), "initializeVote: Zero vabbleDAO address");
        VABBLE_DAO = _vabbleDAO;        
        require(_stakingPool != address(0) && Helper.isContract(_stakingPool), "initializeVote: Zero stakingPool address");
        STAKING_POOL = _stakingPool;
        require(_filmBoard != address(0) && Helper.isContract(_filmBoard), "initializeVote: Zero filmBoard address");
        FILM_BOARD = _filmBoard;
        require(_payoutToken != address(0), "initializeVote: Zero VAB Token address");
        PAYOUT_TOKEN = IERC20(_payoutToken);        

        isInitialized = true;
    }        

    /// @notice Vote to multi films from a VAB holder
    function voteToFilms(bytes calldata _voteData) external onlyCandidate initialized nonReentrant {
        require(_voteData.length > 0, "voteToFilm: Bad items length");
        (
            uint256[] memory filmIds_, 
            uint256[] memory votes_
        ) = abi.decode(_voteData, (uint256[], uint256[]));
        
        require(filmIds_.length == votes_.length, "voteToFilm: Bad votes length");

        uint256[] memory votedFilmIds = new uint256[](filmIds_.length);
        uint256[] memory votedStatus = new uint256[](filmIds_.length);

        for (uint256 i; i < filmIds_.length; i++) { 
            if(__voteToFilm(filmIds_[i], votes_[i])) {
                votedFilmIds[i] = filmIds_[i];
                votedStatus[i] = votes_[i];
            }
        }

        emit FilmsVoted(votedFilmIds, votedStatus, msg.sender);
    }

    function __voteToFilm(uint256 _filmId, uint256 _voteInfo) private returns(bool) {
        require(!voteAttend[msg.sender][_filmId], "_voteToFilm: Already voted");        

        Proposal storage _proposal = proposal[_filmId];
        if(_proposal.voteCount == 0) {
            _proposal.voteStartTime = block.timestamp;
        }
        _proposal.voteCount++;

        uint256 stakingAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);
        if(_voteInfo == 1) _proposal.stakeAmount_1 += stakingAmount;      // Yes
        else if(_voteInfo == 2) _proposal.stakeAmount_2 += stakingAmount; // No
        else _proposal.stakeAmount_3 += stakingAmount; // Abstain

        voteAttend[msg.sender][_filmId] = true;

        // Todo should check/define voteStartTime again
        // Example: withdrawTime is 6/15 and voteStartTime is 6/10, votePeriod is 10 days
        // In this case, we update the withdrawTime to sum(6/20) of voteStartTime and votePeriod
        // so, staker cannot unstake his amount till 6/20
        uint256 withdrawableTime =  IStakingPool(STAKING_POOL).getWithdrawableTime(msg.sender);
        if (_proposal.voteStartTime + votePeriod > withdrawableTime) {
            IStakingPool(STAKING_POOL).updateWithdrawableTime(msg.sender, _proposal.voteStartTime + votePeriod);
        }

        return true;
    }

    /// @notice Approve multi films that votePeriod has elapsed after votePeriod(10 days) by auditor
    // if noFund is true, Approved for listing and if noFund is false, Approved for funding
    function approveFilms(uint256[] memory _filmIds) external onlyAuditor {
        for (uint256 i; i < _filmIds.length; i++) {
            // Example: stakeAmount of "YES" is 2000 and stakeAmount("NO") is 1000, stakeAmount("ABSTAIN") is 500 in 10 days(votePeriod)
            // In this case, Approved since 2000 > 1000 + 500
            if(block.timestamp - proposal[_filmIds[i]].voteStartTime > votePeriod) {
                if(proposal[_filmIds[i]].stakeAmount_1 > proposal[_filmIds[i]].stakeAmount_2 + proposal[_filmIds[i]].stakeAmount_3) {                    
                    bool isFund = IVabbleDAO(VABBLE_DAO).isForFund(_filmIds[i]);
                    IVabbleDAO(VABBLE_DAO).approveFilm(_filmIds[i], isFund);
                    approvedFilmIds.push(_filmIds[i]);
                }
            }        
        }        

        emit FilmIdsApproved(_filmIds, approvedFilmIds, msg.sender);
    }

    // ================ Auditor governance by the Staker START =================
    /// @notice A staker create a proposal for replacing Auditor
    function proposalReplaceAuditor(address _agent) external nonReentrant {
        require(_agent != address(0), "proposalReplaceAuditor: Zero newAuditor address");
        require(msg.sender != _agent, "proposalReplaceAuditor: Self agent address");
        require(auditor != _agent, "proposalReplaceAuditor: Auditor address");
        require(IStakingPool(STAKING_POOL).getStakeAmount(msg.sender) >= PAYOUT_TOKEN.totalSupply(), "proposalReplaceAuditor: Insufficient staking amount");

        require(!agentList[_agent], "Already agent");

        agentList[_agent] = true;
        agentArray.push(_agent);
    }

    /// @notice A staker vote to agents for replacing Auditor
    // _vote: 1,2,3 => Yes, No, Abstain
    function voteToAgent(address _agent, uint256 _voteInfo) external nonReentrant {
        require(!votedToAgent[msg.sender][_agent], "voteToAgent: Already voted");
        require(msg.sender != address(0), "voteToAgent: Zero caller address");
        require(__isAgent(_agent), "voteToAgent: No agent address");
        require(IStakingPool(STAKING_POOL).getStakeAmount(msg.sender) >= PAYOUT_TOKEN.totalSupply(), "voteToAgent: Insufficient staking amount");

        AgentProposal storage _agentProposal = agentProposal[_agent];
        if(_agentProposal.voteCount == 0) {
            _agentProposal.voteStartTime = block.timestamp;
        }

        if(_voteInfo == 1) _agentProposal.yes += 1;
        else if(_voteInfo == 2) _agentProposal.no += 1;
        else _agentProposal.abtain += 1;

        _agentProposal.voteCount++;
        votedToAgent[msg.sender][_agent] = true;
    }

    /// @notice Replace Auditor based on vote result
    function replaceAuditor() external onlyAuditor nonReentrant {
        uint256 startTime;
        AgentProposal storage prp;
        for(uint256 i; i < agentArray.length; i++) {
            prp = agentProposal[agentArray[i]];
            startTime = prp.voteStartTime;
            if(__isAgent(agentArray[i]) && disputeGracePeriod < block.timestamp - startTime) {
                if(prp.voteCount > 0 && prp.yes > prp.no + prp.abtain) {
                    auditor = agentArray[i];
                }                
            }
        }

        emit AuditorReplaced(auditor);
    }

    function __isAgent(address _agent) private view returns (bool) {
        return agentList[_agent];
    }
    // ================ Auditor governance by the Staker END =================
    /// @notice Update vote period by only auditor
    function updateVotePeriod(uint256 _period) external onlyAuditor nonReentrant {
        votePeriod = _period;

        emit VotePeriodUpdated(_period);
    }

    /// @notice Get proposal film Ids
    function getApprovedFilmIds() external view returns(uint256[] memory) {
        return approvedFilmIds;
    } 

}