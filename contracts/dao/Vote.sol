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
import "../interfaces/IFilmBoard.sol";
import "hardhat/console.sol";

contract Vote is Ownable, ReentrancyGuard {
    
    event FilmsVoted(uint256[] indexed filmIds, uint256[] status, address voter);
    event FilmIdsApproved(uint256[] filmIds, uint256[] approvedIds, address caller);
    event AuditorReplaced(address auditor);
    event VotedToAgent(address voter, uint256 voteInfo);

    struct Proposal {
        uint256 stakeAmount_1;  // staking amount of voter with status(yes)
        uint256 stakeAmount_2;  // staking amount of voter with status(no)
        uint256 stakeAmount_3;  // staking amount of voter with status(abstain)
        uint256 voteCount;      // number of accumulated votes
        uint256 voteStartTime;  // vote start time for a film
    }

    struct AgentProposal {
        uint256 yes;           // yes
        uint256 no;            // no
        uint256 abtain;        // abstain
        uint256 voteCount;     // number of accumulated votes
        uint256 voteStartTime; // vote start time for an agent
    }

    IERC20 private PAYOUT_TOKEN; // VAB token  
    address private VABBLE_DAO;
    address private STAKING_POOL;
    address private FILM_BOARD;
    
    uint256 public filmVotePeriod;     // film vote period
    uint256 public boardVotePeriod;    // filmBoard vote period
    uint256 public agentVotePeriod;    // vote period for replacing auditor
    uint256 public boardVoteWeight;    // filmBoard member's vote weight
    uint256 public disputeGracePeriod; // grace period for replacing Auditor
    uint256[] private approvedFilmIds; // approved film ID list
    bool public isInitialized;         // check if contract initialized or not

    mapping(uint256 => Proposal) public proposal;                        // (filmId => Proposal)
    mapping(address => Proposal) public filmBoardProposal;               // (filmBoard candidate => Proposal)  
    mapping(address => mapping(uint256 => bool)) public voteAttend;      // (staker => (filmId => true/false))
    // For extra reward
    mapping(address => uint256[]) public filmIdsPerUser;                 // (staker => filmId[])
    mapping(address => mapping(uint256 => uint256)) public voteStatusPerUser; // (staker => (filmId => voteInfo)) 1,2,3

    mapping(address => mapping(address => bool)) public boardVoteAttend; // (staker => (filmBoard candidate => true/false))    
    mapping(address => AgentProposal) public agentProposal;              // (agent => AgentProposal)
    mapping(address => mapping(address => bool)) public votedToAgent;    // (staker => (agent => true/false)) 
    
    modifier initialized() {
        require(isInitialized, "Need initialized!");
        _;
    }

    /// @notice Allow to vote for only staker(stakingAmount > 0)
    modifier onlyStaker() {
        require(msg.sender != address(0), "Staker Zero address");
        require(IStakingPool(STAKING_POOL).getStakeAmount(msg.sender) > 0, "Not staker");
        _;
    }

    modifier onlyAvailableStaker() {
        require(IStakingPool(STAKING_POOL).getStakeAmount(msg.sender) >= PAYOUT_TOKEN.totalSupply()/2, "Not available staker");
        _;
    }

    constructor() {}

    /// @notice Initialize Vote
    function initializeVote(
        address _vabbleDAO,
        address _stakingPool,
        address _filmBoard,
        address _payoutToken
    ) external onlyAuditor {
        require(!isInitialized, "initializeVote: Already initialized vote");
        require(_vabbleDAO != address(0) && Helper.isContract(_vabbleDAO), "initializeVote: Zero vabbleDAO address");
        VABBLE_DAO = _vabbleDAO;        
        require(_stakingPool != address(0) && Helper.isContract(_stakingPool), "initializeVote: Zero stakingPool address");
        STAKING_POOL = _stakingPool;
        require(_filmBoard != address(0) && Helper.isContract(_filmBoard), "initializeVote: Zero filmBoard address");
        FILM_BOARD = _filmBoard;
        require(_payoutToken != address(0), "initializeVote: Zero VAB Token address");
        PAYOUT_TOKEN = IERC20(_payoutToken);        

        filmVotePeriod = 10 days;   
        boardVotePeriod = 10 days;
        agentVotePeriod = 10 days;
        boardVoteWeight = 30 * 1e8;       // 30%, 1% = 1e8
        disputeGracePeriod = 30 days;     
        isInitialized = true;
    }        

    /// @notice Vote to multi films from a VAB holder
    function voteToFilms(bytes calldata _voteData) public onlyStaker initialized nonReentrant {
        require(_voteData.length > 0, "voteToFilm: Bad items length");
        (
            uint256[] memory filmIds_, 
            uint256[] memory voteInfos_
        ) = abi.decode(_voteData, (uint256[], uint256[]));
        
        require(filmIds_.length == voteInfos_.length, "voteToFilm: Bad voteInfos length");

        uint256[] memory votedFilmIds = new uint256[](filmIds_.length);
        uint256[] memory votedStatus = new uint256[](filmIds_.length);

        for(uint256 i = 0; i < filmIds_.length; i++) { 
            if(__voteToFilm(filmIds_[i], voteInfos_[i])) {
                votedFilmIds[i] = filmIds_[i];
                votedStatus[i] = voteInfos_[i];
            }
        }

        emit FilmsVoted(votedFilmIds, votedStatus, msg.sender);
    }

    function __voteToFilm(uint256 _filmId, uint256 _voteInfo) private returns(bool) {
        require(!voteAttend[msg.sender][_filmId], "_voteToFilm: Already voted");    

        Helper.Status status = IVabbleDAO(VABBLE_DAO).getFilmStatusById(_filmId);
        require(status == Helper.Status.LISTED, "Not listed");        

        Proposal storage _proposal = proposal[_filmId];
        if(_proposal.voteCount == 0) {
            _proposal.voteStartTime = block.timestamp;
        }
        _proposal.voteCount++;

        uint256 stakingAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);

        if(IVabbleDAO(VABBLE_DAO).isForFund(_filmId)) {
            if(IFilmBoard(FILM_BOARD).isBoardWhitelist(msg.sender) == 2) {
                // If filme is for funding and voter is film board member, more weight(30%) per vote
                stakingAmount *= (boardVoteWeight + 1e10) / 1e10; // (30+100)/100=1.3
            }
            //For extra reward in funding film case
            filmIdsPerUser[msg.sender].push(_filmId);
            voteStatusPerUser[msg.sender][_filmId] = _voteInfo;
        }

        if(_voteInfo == 1) {
            _proposal.stakeAmount_1 += stakingAmount;   // Yes
        } else if(_voteInfo == 2) {
            _proposal.stakeAmount_2 += stakingAmount;   // No
        } else {
            _proposal.stakeAmount_3 += stakingAmount;   // Abstain
        }

        voteAttend[msg.sender][_filmId] = true;
        IFilmBoard(FILM_BOARD).updateLastVoteTime(msg.sender);

        // Example: withdrawTime is 6/15 and voteStartTime is 6/10, votePeriod is 10 days
        // In this case, we update the withdrawTime to sum(6/20) of voteStartTime and votePeriod
        // so, staker cannot unstake his amount till 6/20
        uint256 withdrawableTime =  IStakingPool(STAKING_POOL).getWithdrawableTime(msg.sender);
        if (_proposal.voteStartTime + filmVotePeriod > withdrawableTime) {
            IStakingPool(STAKING_POOL).updateWithdrawableTime(msg.sender, _proposal.voteStartTime + filmVotePeriod);
        }

        return true;
    }

    /// @notice Approve multi films that votePeriod has elapsed after votePeriod(10 days) by auditor
    // if isFund is true then Approved for funding, if isFund is false then Approved for listing
    function approveFilms(uint256[] memory _filmIds) external onlyAuditor {
        for(uint256 i = 0; i < _filmIds.length; i++) {
            // Example: stakeAmount of "YES" is 2000 and stakeAmount("NO") is 1000, stakeAmount("ABSTAIN") is 500 in 10 days(votePeriod)
            // In this case, Approved since 2000 > 1000 + 500 (it means ">50%")
            if(proposal[_filmIds[i]].voteCount > 0) {
                if(block.timestamp - proposal[_filmIds[i]].voteStartTime > filmVotePeriod) {
                    if(proposal[_filmIds[i]].stakeAmount_1 > proposal[_filmIds[i]].stakeAmount_2 + proposal[_filmIds[i]].stakeAmount_3) {                    
                        bool isFund = IVabbleDAO(VABBLE_DAO).isForFund(_filmIds[i]);
                        IVabbleDAO(VABBLE_DAO).approveFilm(_filmIds[i], isFund);
                        approvedFilmIds.push(_filmIds[i]);
                    }
                }        
            }
        }        

        emit FilmIdsApproved(_filmIds, approvedFilmIds, msg.sender);
    }

    /// @notice A staker vote to agent for replacing Auditor
    // _vote: 1,2,3 => Yes, No, Abstain
    function voteToAgent(uint256 _voteInfo) public onlyAvailableStaker initialized nonReentrant {
        address agent = IFilmBoard(FILM_BOARD).Agent();
        require(!votedToAgent[msg.sender][agent], "voteToAgent: Already voted");

        AgentProposal storage _agentProposal = agentProposal[agent];
        if(_agentProposal.voteCount == 0) _agentProposal.voteStartTime = block.timestamp;

        if(_voteInfo == 1) _agentProposal.yes += 1;
        else if(_voteInfo == 2) _agentProposal.no += 1;
        else _agentProposal.abtain += 1;

        _agentProposal.voteCount++;
        votedToAgent[msg.sender][agent] = true;
        
        IFilmBoard(FILM_BOARD).updateLastVoteTime(msg.sender);

        emit VotedToAgent(msg.sender, _voteInfo);
    }

    /// @notice Replace Auditor based on vote result
    function replaceAuditor() external onlyAvailableStaker initialized nonReentrant {
        address agent = IFilmBoard(FILM_BOARD).Agent();
        AgentProposal storage _agentProposal = agentProposal[agent];
        uint256 startTime = _agentProposal.voteStartTime;
        require(agentVotePeriod < block.timestamp - startTime, "replaceAuditor: vote period yet");
        require(_agentProposal.voteCount > 0, "replaceAuditor: No voter");

        if(disputeGracePeriod < block.timestamp - startTime) {
            if(_agentProposal.yes > _agentProposal.no + _agentProposal.abtain) {
                auditor = agent;
                IFilmBoard(FILM_BOARD).releaseAgent();
                emit AuditorReplaced(auditor);
            }                
        }
    }
    // ================ Auditor governance by the Staker END =================
    
    function voteToFilmBoard(address _candidate, uint256 _voteInfo) public onlyStaker initialized nonReentrant {
        require(IFilmBoard(FILM_BOARD).isBoardWhitelist(_candidate) == 1, "voteToFilmBoard: Not candidate");
        require(!boardVoteAttend[msg.sender][_candidate], "voteToFilmBoard: Already voted");        

        Proposal storage fbp = filmBoardProposal[_candidate];
        if(fbp.voteCount == 0) {
            fbp.voteStartTime = block.timestamp;
        }
        fbp.voteCount++;

        uint256 stakingAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);

        if(_voteInfo == 1) {
            fbp.stakeAmount_1 += stakingAmount;   // Yes
        } else if(_voteInfo == 2) {
            fbp.stakeAmount_2 += stakingAmount;   // No
        } else {
            fbp.stakeAmount_3 += stakingAmount;   // Abstain
        }

        boardVoteAttend[msg.sender][_candidate] = true;

        IFilmBoard(FILM_BOARD).updateLastVoteTime(msg.sender);
    }
    
    function addFilmBoard(address _member) external onlyStaker nonReentrant {
        Proposal storage fbp = filmBoardProposal[_member];
        require(block.timestamp - fbp.voteStartTime > boardVotePeriod, "addFilmBoard: vote period yet");
        require(fbp.voteCount > 0, "addFilmBoard: No voter");
        require(IFilmBoard(FILM_BOARD).isBoardWhitelist(_member) == 1, "addFilmBoard: Not candidate");

        if(fbp.stakeAmount_1 > fbp.stakeAmount_2 + fbp.stakeAmount_3) { 
            IFilmBoard(FILM_BOARD).addFilmBoardMember(_member);
        }         
    }

    /// @notice Update vote period by only auditor
    function updateVotePeriod(
        uint256 _filmVotePeriod, 
        uint256 _boardVotePeriod, 
        uint256 _agentVotePeriod,
        uint256 _disputeGracePeriod
    ) external onlyAuditor nonReentrant {
        if(_filmVotePeriod > 0) filmVotePeriod = _filmVotePeriod;
        if(_boardVotePeriod > 0) boardVotePeriod = _boardVotePeriod;
        if(_agentVotePeriod > 0) agentVotePeriod = _agentVotePeriod;
        if(_disputeGracePeriod > 0) disputeGracePeriod = _disputeGracePeriod;
    }

    /// @notice Get proposal film Ids
    function getApprovedFilmIds() external view returns(uint256[] memory) {
        return approvedFilmIds;
    }

    /// @notice Get voteStatus per User
    function getVoteStatusPerUser(address _staker, uint256 _filmId) external view returns(uint256) {
        return voteStatusPerUser[_staker][_filmId];
    }

    /// @notice Get voteStatus per User
    function getFilmIdsPerUser(address _staker) external view returns(uint256[] memory) {
        return filmIdsPerUser[_staker];
    }
}