// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/Ownable.sol";
import "../libraries/Helper.sol";
import "../interfaces/IVabbleDAO.sol";
import "../interfaces/IStakingPool.sol";
import "../interfaces/IProperty.sol";
import "hardhat/console.sol";

contract Vote is Ownable, ReentrancyGuard {
    
    event FilmsVoted(uint256[] indexed filmIds, uint256[] status, address voter);
    event FilmIdsApproved(uint256[] filmIds, uint256[] approvedIds, address caller);
    event AuditorReplaced(address auditor);
    event VotedToAgent(address voter, address agent, uint256 voteInfo);
    event VotedToProperty(address voter, uint256 flag, uint256 propertyVal, uint256 voteInfo);

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
        uint256 yesVABAmount;  // VAB voted YES
    }

    struct PropertyProposal {
        uint256 yes;           // yes
        uint256 no;            // no
        uint256 abtain;        // abstain
        uint256 voteCount;     // number of accumulated votes
        uint256 voteStartTime; // vote start time for an agent
    }

    IERC20 private PAYOUT_TOKEN; // VAB token  
    address private VABBLE_DAO;
    address private STAKING_POOL;
    address private DAO_PROPERTY;
        
    uint256[] private approvedFilmIds; // approved film ID list
    bool public isInitialized;         // check if contract initialized or not

    mapping(uint256 => Proposal) public filmProposal;                    // (filmId => Proposal)
    mapping(address => mapping(uint256 => bool)) public voteAttend;      // (staker => (filmId => true/false))
    mapping(address => Proposal) public filmBoardProposal;               // (filmBoard candidate => Proposal)  
    mapping(address => mapping(address => bool)) public boardVoteAttend; // (staker => (filmBoard candidate => true/false))    
    mapping(address => AgentProposal) public agentProposal;              // (agent => AgentProposal)
    mapping(address => mapping(address => bool)) public votedToAgent;    // (staker => (agent => true/false)) 
    mapping(uint256 => mapping(uint256 => PropertyProposal)) public propertyProposal;        // (flag => (property => PropertyProposal))
    mapping(uint256 => mapping(address => mapping(uint256 => bool))) public votedToProperty; // (flag => (staker => (property => true/false)))
    // For extra reward
    mapping(address => uint256[]) public filmIdsPerUser;                 // (staker => filmId[])
    mapping(address => mapping(uint256 => uint256)) public voteStatusPerUser; // (staker => (filmId => voteInfo)) 1,2,3
    
    modifier initialized() {
        require(isInitialized, "Need initialized!");
        _;
    }

    /// @notice Allow to vote for only staker(stakingAmount > 0)
    modifier onlyStaker() {
        require(IStakingPool(STAKING_POOL).getStakeAmount(msg.sender) > 0, "Not staker");
        _;
    }

    constructor() {}

    /// @notice Initialize Vote
    function initializeVote(
        address _vabbleDAO,
        address _stakingPool,
        address _daoProperty,
        address _payoutToken
    ) external onlyAuditor {
        require(!isInitialized, "initializeVote: Already initialized vote");
        require(_vabbleDAO != address(0), "initializeVote: Zero vabbleDAO address");
        VABBLE_DAO = _vabbleDAO;        
        require(_stakingPool != address(0), "initializeVote: Zero stakingPool address");
        STAKING_POOL = _stakingPool;
        require(_daoProperty != address(0), "initializeVote: Zero filmBoard address");
        DAO_PROPERTY = _daoProperty;
        require(_payoutToken != address(0), "initializeVote: Zero VAB Token address");
        PAYOUT_TOKEN = IERC20(_payoutToken);        
           
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

        Proposal storage _proposal = filmProposal[_filmId];
        if(_proposal.voteCount == 0) {
            _proposal.voteStartTime = block.timestamp;
        }
        _proposal.voteCount++;

        uint256 stakingAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);

        if(IVabbleDAO(VABBLE_DAO).isForFund(_filmId)) {
            if(IVabbleDAO(VABBLE_DAO).isBoardWhitelist(msg.sender) == 2) {
                // If filme is for funding and voter is film board member, more weight(30%) per vote
                stakingAmount *= (IProperty(DAO_PROPERTY).boardVoteWeight() + 1e10) / 1e10; // (30+100)/100=1.3
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
        IVabbleDAO(VABBLE_DAO).updateLastVoteTime(msg.sender);

        // Example: withdrawTime is 6/15 and voteStartTime is 6/10, votePeriod is 10 days
        // In this case, we update the withdrawTime to sum(6/20) of voteStartTime and votePeriod
        // so, staker cannot unstake his amount till 6/20
        uint256 withdrawableTime =  IStakingPool(STAKING_POOL).getWithdrawableTime(msg.sender);
        if (_proposal.voteStartTime + IProperty(DAO_PROPERTY).filmVotePeriod() > withdrawableTime) {
            IStakingPool(STAKING_POOL).updateWithdrawableTime(msg.sender, _proposal.voteStartTime + IProperty(DAO_PROPERTY).filmVotePeriod());
        }

        return true;
    }

    /// @notice Approve multi films that votePeriod has elapsed after votePeriod(10 days) by auditor
    // if isFund is true then Approved for funding, if isFund is false then Approved for listing
    function approveFilms(uint256[] memory _filmIds) external onlyAuditor {
        for(uint256 i = 0; i < _filmIds.length; i++) {
            // Example: stakeAmount of "YES" is 2000 and stakeAmount("NO") is 1000, stakeAmount("ABSTAIN") is 500 in 10 days(votePeriod)
            // In this case, Approved since 2000 > 1000 + 500 (it means ">50%")            
            if(filmProposal[_filmIds[i]].voteCount > 0) {
                if(block.timestamp - filmProposal[_filmIds[i]].voteStartTime > IProperty(DAO_PROPERTY).filmVotePeriod()) {
                    if(filmProposal[_filmIds[i]].stakeAmount_1 > filmProposal[_filmIds[i]].stakeAmount_2 + filmProposal[_filmIds[i]].stakeAmount_3) {                    
                        bool isFund = IVabbleDAO(VABBLE_DAO).isForFund(_filmIds[i]);
                        IVabbleDAO(VABBLE_DAO).approveFilm(_filmIds[i], isFund);
                        approvedFilmIds.push(_filmIds[i]);
                    }
                }        
            }
        }        

        emit FilmIdsApproved(_filmIds, approvedFilmIds, msg.sender);
    }

    /// @notice Stakers vote(1,2,3 => Yes, No, Abstain) to agent for replacing Auditor
    function voteToAgent(uint256 _voteInfo, uint256 _agentIndex) public onlyStaker nonReentrant {
        address agent = IProperty(DAO_PROPERTY).getAgent(_agentIndex);        
        require(agent != address(0), "voteToAgent: invalid index or no proposal");
        require(!votedToAgent[msg.sender][agent], "voteToAgent: Already voted");

        AgentProposal storage _agentProposal = agentProposal[agent];
        if(_agentProposal.voteCount == 0) _agentProposal.voteStartTime = block.timestamp;

        if(_voteInfo == 1) {
            _agentProposal.yes += 1;
            _agentProposal.yesVABAmount += IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);
        } else if(_voteInfo == 2) _agentProposal.no += 1;
        else _agentProposal.abtain += 1;

        _agentProposal.voteCount++;
        votedToAgent[msg.sender][agent] = true;
        
        IVabbleDAO(VABBLE_DAO).updateLastVoteTime(msg.sender);

        emit VotedToAgent(msg.sender, agent, _voteInfo);
    }

    /// @notice Replace Auditor based on vote result
    function replaceAuditor(uint256 _agentIndex) external onlyStaker nonReentrant {
        address agent = IProperty(DAO_PROPERTY).getAgent(_agentIndex);
        require(agent != address(0), "replaceAuditor: invalid index or no proposal");

        AgentProposal storage _agentProposal = agentProposal[agent];
        uint256 startTime = _agentProposal.voteStartTime;
        require(_agentProposal.voteCount > 0, "replaceAuditor: No voter");
        require(IProperty(DAO_PROPERTY).agentVotePeriod() < block.timestamp - startTime, "replaceAuditor: vote period yet");
        require(IProperty(DAO_PROPERTY).disputeGracePeriod() < block.timestamp - startTime, "replaceAuditor: dispute grace period yet");

        // must be over 51%, staking amount must be over 75m
        if(
            _agentProposal.yes > _agentProposal.no + _agentProposal.abtain && 
            _agentProposal.yesVABAmount > IProperty(DAO_PROPERTY).availableVABAmount()
        ) {
            auditor = agent;            
            emit AuditorReplaced(auditor);
        }
        IProperty(DAO_PROPERTY).removeAgent(_agentIndex);
    }
    
    function voteToFilmBoard(address _candidate, uint256 _voteInfo) public onlyStaker nonReentrant {
        require(IVabbleDAO(VABBLE_DAO).isBoardWhitelist(_candidate) == 1, "voteToFilmBoard: Not candidate");
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

        IVabbleDAO(VABBLE_DAO).updateLastVoteTime(msg.sender);
    }
    
    function addFilmBoard(address _member) external onlyStaker nonReentrant {
        Proposal storage fbp = filmBoardProposal[_member];
        require(block.timestamp - fbp.voteStartTime > IProperty(DAO_PROPERTY).boardVotePeriod(), "addFilmBoard: vote period yet");
        require(fbp.voteCount > 0, "addFilmBoard: No voter");
        require(IVabbleDAO(VABBLE_DAO).isBoardWhitelist(_member) == 1, "addFilmBoard: Not candidate");

        if(fbp.stakeAmount_1 > fbp.stakeAmount_2 + fbp.stakeAmount_3) { 
            IVabbleDAO(VABBLE_DAO).addFilmBoardMember(_member);
        }         
    }

    /// @notice Stakers vote(1,2,3 => Yes, No, Abstain) to proposal for updating properties(filmVotePeriod, rewardRate, ...)
    function voteToProperty(uint256 _voteInfo, uint256 _propertyIndex, uint256 _flag) public onlyStaker nonReentrant {
        uint256 propertyVal = IProperty(DAO_PROPERTY).getProperty(_propertyIndex, _flag);
        require(propertyVal > 0, "voteToProperty: no proposal");
        require(!votedToProperty[_flag][msg.sender][propertyVal], "voteToProperty: Already voted");

        PropertyProposal storage _propertyProposal = propertyProposal[_flag][propertyVal];
        if(_propertyProposal.voteCount == 0) _propertyProposal.voteStartTime = block.timestamp;

        if(_voteInfo == 1) _propertyProposal.yes += 1;
        else if(_voteInfo == 2) _propertyProposal.no += 1;
        else _propertyProposal.abtain += 1;

        _propertyProposal.voteCount++;
        votedToProperty[_flag][msg.sender][propertyVal] = true;
        
        IVabbleDAO(VABBLE_DAO).updateLastVoteTime(msg.sender);

        emit VotedToProperty(msg.sender, _flag, propertyVal, _voteInfo);
    }

    /// @notice Update properties based on vote result(>=51%)
    function updateProperty(uint256 _propertyIndex, uint256 _flag) external onlyStaker nonReentrant {
        uint256 propertyVal = IProperty(DAO_PROPERTY).getProperty(_propertyIndex, _flag);
        PropertyProposal storage _propertyProposal = propertyProposal[_flag][propertyVal];

        uint256 startTime = _propertyProposal.voteStartTime;
        require(_propertyProposal.voteCount > 0, "updateProperty: No voter");
        require(IProperty(DAO_PROPERTY).propertyVotePeriod() < block.timestamp - startTime, "updateProperty: vote period yet");

        // must be over 51%
        if(_propertyProposal.yes > _propertyProposal.no + _propertyProposal.abtain) {
            IProperty(DAO_PROPERTY).updateProperty(_propertyIndex, _flag);      
        }

        IProperty(DAO_PROPERTY).removeProperty(_propertyIndex, _flag);
    }

    /// @notice Get proposal film Ids
    function getApprovedFilmIds() external view returns(uint256[] memory) {
        return approvedFilmIds;
    }

    /// @notice Get voteStatus per User
    function getVoteStatusPerUser(address _staker, uint256 _filmId) external view returns(uint256) {
        return voteStatusPerUser[_staker][_filmId];
    }

    /// @notice Get filmIds per User
    function getFilmIdsPerUser(address _staker) external view returns(uint256[] memory) {
        return filmIdsPerUser[_staker];
    }

    /// @notice Delete all filmIds per User
    function removeFilmIdsPerUser(address _staker) external {
        delete filmIdsPerUser[_staker];
    }
}