// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/Helper.sol";
import "../interfaces/IVabbleDAO.sol";
import "../interfaces/IStakingPool.sol";
import "../interfaces/IProperty.sol";
import "../interfaces/IOwnablee.sol";
import "hardhat/console.sol";

contract Vote is ReentrancyGuard {
    
    event FilmsVoted(uint256[] indexed filmIds, uint256[] status, address voter);
    event FilmIdsApproved(uint256[] filmIds, uint256[] approvedIds, address caller);
    event AuditorReplaced(address auditor);
    event VotedToAgent(address voter, address agent, uint256 voteInfo);
    event VotedToProperty(address voter, uint256 flag, uint256 propertyVal, uint256 voteInfo);
    event VotedToRewardAddress(address voter, address rewardAddress, uint256 voteInfo);

    struct Voting {
        uint256 stakeAmount_1;  // staking amount of voter with status(yes)
        uint256 stakeAmount_2;  // staking amount of voter with status(no)
        uint256 stakeAmount_3;  // staking amount of voter with status(abstain)
        uint256 voteCount;      // number of accumulated votes
        uint256 voteStartTime;  // vote start time for a film
    }

    struct AgentVoting {
        uint256 yes;           // yes
        uint256 no;            // no
        uint256 abtain;        // abstain
        uint256 voteCount;     // number of accumulated votes
        uint256 voteStartTime; // vote start time for an agent
        uint256 yesVABAmount;  // VAB voted YES
    }

    struct PropertyVoting {
        uint256 yes;           // yes
        uint256 no;            // no
        uint256 abtain;        // abstain
        uint256 voteCount;     // number of accumulated votes
        uint256 voteStartTime; // vote start time for an agent
    }

    IERC20 private immutable PAYOUT_TOKEN; // VAB token  
    address private immutable OWNABLE;     // Ownablee contract address
    address private VABBLE_DAO;
    address private STAKING_POOL;
    address private DAO_PROPERTY;
        
    uint256[] private approvedFilmIds; // approved film ID list
    bool public isInitialized;         // check if contract initialized or not

    mapping(uint256 => Voting) public filmVoting;                            // (filmId => Voting)
    mapping(address => mapping(uint256 => bool)) public isAttendToFilmVote;  // (staker => (filmId => true/false))
    mapping(address => Voting) public filmBoardVoting;                       // (filmBoard candidate => Voting) 
    mapping(address => Voting) public rewardAddressVoting;                   // (rewardAddress candidate => Voting)  
    mapping(address => mapping(address => bool)) public isAttendToBoardVote; // (staker => (filmBoard candidate => true/false))    
    mapping(address => mapping(address => bool)) public isAttendToRewardAddressVote; // (staker => (reward address => true/false))    
    mapping(address => AgentVoting) public agentVoting;                      // (agent => AgentVoting)
    mapping(address => mapping(address => bool)) public isAttendToAgentVote; // (staker => (agent => true/false)) 
    mapping(uint256 => mapping(uint256 => PropertyVoting)) public propertyVoting;          // (flag => (property value => PropertyVoting))
    mapping(uint256 => mapping(address => mapping(uint256 => bool))) public isAttendToPropertyVote; // (flag => (staker => (property => true/false)))
    // For extra reward
    mapping(address => uint256[]) private fundingFilmIdsPerUser;                         // (staker => filmId[] for only funding)
    mapping(address => mapping(uint256 => uint256)) private fundingIdsVoteStatusPerUser; // (staker => (filmId => voteInfo) for only funing) 1,2,3
    
    modifier initialized() {
        require(isInitialized, "Need initialized!");
        _;
    }

    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "caller is not the auditor");
        _;
    }
    
    /// @notice Allow to vote for only staker(stakingAmount > 0)
    modifier onlyStaker() {
        require(IStakingPool(STAKING_POOL).getStakeAmount(msg.sender) > 0, "Not staker");
        _;
    }

    constructor(
        address _payoutToken,
        address _ownableContract
    ) {
        require(_payoutToken != address(0), "payoutToken: Zero address");
        PAYOUT_TOKEN = IERC20(_payoutToken);
        require(_ownableContract != address(0), "ownableContract: Zero address");
        OWNABLE = _ownableContract; 
    }

    /// @notice Initialize Vote
    function initializeVote(
        address _vabbleDAO,
        address _stakingPool,
        address _daoProperty
    ) external onlyAuditor {
        require(_vabbleDAO != address(0), "initializeVote: Zero vabbleDAO address");
        VABBLE_DAO = _vabbleDAO;        
        require(_stakingPool != address(0), "initializeVote: Zero stakingPool address");
        STAKING_POOL = _stakingPool;
        require(_daoProperty != address(0), "initializeVote: Zero filmBoard address");
        DAO_PROPERTY = _daoProperty;
           
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
        require(!isAttendToFilmVote[msg.sender][_filmId], "_voteToFilm: Already voted");    

        Helper.Status status = IVabbleDAO(VABBLE_DAO).getFilmStatusById(_filmId);
        require(status == Helper.Status.LISTED, "Not listed");        

        Voting storage _voting = filmVoting[_filmId];
        if(_voting.voteCount == 0) _voting.voteStartTime = block.timestamp;
        
        _voting.voteCount++;

        uint256 stakingAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);

        if(IVabbleDAO(VABBLE_DAO).isForFund(_filmId)) {
            if(IVabbleDAO(VABBLE_DAO).isBoardWhitelist(msg.sender) == 2) {
                // If film is for funding and voter is film board member, more weight(30%) per vote
                stakingAmount *= (IProperty(DAO_PROPERTY).boardVoteWeight() + 1e10) / 1e10; // (30+100)/100=1.3
            }
            //For extra reward in funding film case
            fundingFilmIdsPerUser[msg.sender].push(_filmId);
            fundingIdsVoteStatusPerUser[msg.sender][_filmId] = _voteInfo;
        }

        if(_voteInfo == 1) {
            _voting.stakeAmount_1 += stakingAmount;   // Yes
        } else if(_voteInfo == 2) {
            _voting.stakeAmount_2 += stakingAmount;   // No
        } else {
            _voting.stakeAmount_3 += stakingAmount;   // Abstain
        }

        isAttendToFilmVote[msg.sender][_filmId] = true;
        
        IVabbleDAO(VABBLE_DAO).updateLastVoteTime(msg.sender);

        // Example: withdrawTime is 6/15 and voteStartTime is 6/10, votePeriod is 10 days
        // In this case, we update the withdrawTime to sum(6/20) of voteStartTime and votePeriod
        // so, staker cannot unstake his amount till 6/20
        uint256 withdrawableTime =  IStakingPool(STAKING_POOL).getWithdrawableTime(msg.sender);
        if (_voting.voteStartTime + IProperty(DAO_PROPERTY).filmVotePeriod() > withdrawableTime) {
            IStakingPool(STAKING_POOL).updateWithdrawableTime(msg.sender, _voting.voteStartTime + IProperty(DAO_PROPERTY).filmVotePeriod());
        }

        return true;
    }

    /// @notice Approve multi films that votePeriod has elapsed after votePeriod(10 days) by auditor
    // if isFund is true then "APPROVED_FUNDING", if isFund is false then "APPROVED_LISTING"
    function approveFilms(uint256[] memory _filmIds) external onlyAuditor {
        for(uint256 i = 0; i < _filmIds.length; i++) {
            // Example: stakeAmount of "YES" is 2000 and stakeAmount("NO") is 1000, stakeAmount("ABSTAIN") is 500 in 10 days(votePeriod)
            // In this case, Approved since 2000 > 1000 + 500 (it means ">50%")           
            if(filmVoting[_filmIds[i]].voteCount < IStakingPool(STAKING_POOL).getLimitCount()) continue;

            if(block.timestamp - filmVoting[_filmIds[i]].voteStartTime > IProperty(DAO_PROPERTY).filmVotePeriod()) {
                if(filmVoting[_filmIds[i]].stakeAmount_1 > filmVoting[_filmIds[i]].stakeAmount_2 + filmVoting[_filmIds[i]].stakeAmount_3) {                    
                    bool isFund = IVabbleDAO(VABBLE_DAO).isForFund(_filmIds[i]);
                    IVabbleDAO(VABBLE_DAO).approveFilm(_filmIds[i], isFund);
                    approvedFilmIds.push(_filmIds[i]);
                }
            }        
        }        

        emit FilmIdsApproved(_filmIds, approvedFilmIds, msg.sender);
    }

    /// @notice Stakers vote(1,2,3 => Yes, No, Abstain) to agent for replacing Auditor
    function voteToAgent(uint256 _voteInfo, uint256 _agentIndex) public onlyStaker nonReentrant {
        address agent = IProperty(DAO_PROPERTY).getAgent(_agentIndex);        
        require(agent != address(0), "voteToAgent: invalid index or no proposal");
        require(!isAttendToAgentVote[msg.sender][agent], "voteToAgent: Already voted");

        AgentVoting storage _agentVoting = agentVoting[agent];
        if(_agentVoting.voteCount == 0) _agentVoting.voteStartTime = block.timestamp;

        if(_voteInfo == 1) {
            _agentVoting.yes += 1;
            _agentVoting.yesVABAmount += IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);
        } else if(_voteInfo == 2) {
            _agentVoting.no += 1;
        } else {
            _agentVoting.abtain += 1;
        }

        _agentVoting.voteCount++;

        isAttendToAgentVote[msg.sender][agent] = true;
        
        IVabbleDAO(VABBLE_DAO).updateLastVoteTime(msg.sender);

        emit VotedToAgent(msg.sender, agent, _voteInfo);
    }

    /// @notice Replace Auditor based on vote result
    function replaceAuditor(uint256 _agentIndex) external onlyStaker nonReentrant {
        address agent = IProperty(DAO_PROPERTY).getAgent(_agentIndex);
        require(agent != address(0), "replaceAuditor: invalid index or no proposal");

        AgentVoting storage _agentVoting = agentVoting[agent];
        uint256 startTime = _agentVoting.voteStartTime;
        require(_agentVoting.voteCount >= IStakingPool(STAKING_POOL).getLimitCount(), "replaceAuditor: Less than limit count");        
        require(IProperty(DAO_PROPERTY).agentVotePeriod() < block.timestamp - startTime, "replaceAuditor: vote period yet");
        require(IProperty(DAO_PROPERTY).disputeGracePeriod() < block.timestamp - startTime, "replaceAuditor: dispute grace period yet");

        // must be over 51%, staking amount must be over 75m
        if(
            _agentVoting.yes > _agentVoting.no + _agentVoting.abtain && 
            _agentVoting.yesVABAmount > IProperty(DAO_PROPERTY).availableVABAmount()
        ) {
            IOwnablee(OWNABLE).replaceAuditor(agent);
            emit AuditorReplaced(agent);
        }
        IProperty(DAO_PROPERTY).removeAgent(_agentIndex);
    }
    
    function voteToFilmBoard(address _candidate, uint256 _voteInfo) public onlyStaker nonReentrant {
        require(IVabbleDAO(VABBLE_DAO).isBoardWhitelist(_candidate) == 1, "voteToFilmBoard: Not candidate");
        require(!isAttendToBoardVote[msg.sender][_candidate], "voteToFilmBoard: Already voted");        

        Voting storage fbp = filmBoardVoting[_candidate];
        if(fbp.voteCount == 0) fbp.voteStartTime = block.timestamp;
        
        fbp.voteCount++;

        uint256 stakingAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);

        if(_voteInfo == 1) {
            fbp.stakeAmount_1 += stakingAmount; // Yes
        } else if(_voteInfo == 2) {
            fbp.stakeAmount_2 += stakingAmount; // No
        } else {
            fbp.stakeAmount_3 += stakingAmount; // Abstain
        }

        isAttendToBoardVote[msg.sender][_candidate] = true;

        IVabbleDAO(VABBLE_DAO).updateLastVoteTime(msg.sender);
    }
    
    function addFilmBoard(address _member) external onlyStaker nonReentrant {
        require(IVabbleDAO(VABBLE_DAO).isBoardWhitelist(_member) == 1, "addFilmBoard: Not candidate");

        Voting storage fbp = filmBoardVoting[_member];
        require(block.timestamp - fbp.voteStartTime > IProperty(DAO_PROPERTY).boardVotePeriod(), "addFilmBoard: vote period yet");
        require(fbp.voteCount >= IStakingPool(STAKING_POOL).getLimitCount(), "addFilmBoard: Less than limit count");

        if(fbp.stakeAmount_1 > fbp.stakeAmount_2 + fbp.stakeAmount_3) { 
            IVabbleDAO(VABBLE_DAO).addFilmBoardMember(_member);
        }         
    }

    ///@notice Stakers vote to proposal for setup the address to reward DAO fund
    function voteToRewardAddress(address _rewardAddress, uint256 _voteInfo) public onlyStaker nonReentrant {
        require(IProperty(DAO_PROPERTY).isRewardWhitelist(_rewardAddress) == 1, "voteToRewardAddress: Not candidate");
        require(!isAttendToRewardAddressVote[msg.sender][_rewardAddress], "voteToRewardAddress: Already voted");        

        Voting storage rav = rewardAddressVoting[_rewardAddress];
        if(rav.voteCount == 0) rav.voteStartTime = block.timestamp;
        
        rav.voteCount++;

        uint256 stakingAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);

        if(_voteInfo == 1) {
            rav.stakeAmount_1 += stakingAmount;   // Yes
        } else if(_voteInfo == 2) {
            rav.stakeAmount_2 += stakingAmount;   // No
        } else {
            rav.stakeAmount_3 += stakingAmount;   // Abstain
        }

        isAttendToRewardAddressVote[msg.sender][_rewardAddress] = true;

        IVabbleDAO(VABBLE_DAO).updateLastVoteTime(msg.sender);

        emit VotedToRewardAddress(msg.sender, _rewardAddress, _voteInfo);
    }

    function setDAORewardAddress(address _rewardAddress) external onlyStaker nonReentrant {
        require(IProperty(DAO_PROPERTY).isRewardWhitelist(_rewardAddress) == 1, "setRewardAddress: Not candidate");

        Voting storage rav = rewardAddressVoting[_rewardAddress];
        require(block.timestamp - rav.voteStartTime > IProperty(DAO_PROPERTY).rewardVotePeriod(), "setRewardAddress: vote period yet");
        require(rav.voteCount >= IStakingPool(STAKING_POOL).getLimitCount(), "addRewardAddress: Less than limit count");

        if(rav.stakeAmount_1 > rav.stakeAmount_2 + rav.stakeAmount_3) { 
            IProperty(DAO_PROPERTY).setRewardAddress(_rewardAddress);
        }         
    }

    /// @notice Stakers vote(1,2,3 => Yes, No, Abstain) to proposal for updating properties(filmVotePeriod, rewardRate, ...)
    function voteToProperty(uint256 _voteInfo, uint256 _propertyIndex, uint256 _flag) public onlyStaker nonReentrant {
        uint256 propertyVal = IProperty(DAO_PROPERTY).getProperty(_propertyIndex, _flag);
        require(propertyVal > 0, "voteToProperty: no proposal");
        require(!isAttendToPropertyVote[_flag][msg.sender][propertyVal], "voteToProperty: Already voted");

        PropertyVoting storage _propertyVoting = propertyVoting[_flag][propertyVal];
        if(_propertyVoting.voteCount == 0) _propertyVoting.voteStartTime = block.timestamp;

        if(_voteInfo == 1) _propertyVoting.yes += 1;
        else if(_voteInfo == 2) _propertyVoting.no += 1;
        else _propertyVoting.abtain += 1;

        _propertyVoting.voteCount++;

        isAttendToPropertyVote[_flag][msg.sender][propertyVal] = true;
        
        IVabbleDAO(VABBLE_DAO).updateLastVoteTime(msg.sender);

        emit VotedToProperty(msg.sender, _flag, propertyVal, _voteInfo);
    }

    /// @notice Update properties based on vote result(>=51%)
    function updateProperty(uint256 _propertyIndex, uint256 _flag) external onlyStaker nonReentrant {
        uint256 propertyVal = IProperty(DAO_PROPERTY).getProperty(_propertyIndex, _flag);
        PropertyVoting storage _propertyVoting = propertyVoting[_flag][propertyVal];

        uint256 startTime = _propertyVoting.voteStartTime;
        require(_propertyVoting.voteCount >= IStakingPool(STAKING_POOL).getLimitCount(), "updateProperty: Less than limit count");
        require(IProperty(DAO_PROPERTY).propertyVotePeriod() < block.timestamp - startTime, "updateProperty: vote period yet");

        // must be over 51%
        if(_propertyVoting.yes > _propertyVoting.no + _propertyVoting.abtain) {
            IProperty(DAO_PROPERTY).updateProperty(_propertyIndex, _flag);      
        }

        IProperty(DAO_PROPERTY).removeProperty(_propertyIndex, _flag);
    }

    /// @notice Get approved film Ids
    function getApprovedFilmIds() external view returns(uint256[] memory) {
        return approvedFilmIds;
    }

    /// @notice Get funding filmId voteStatus per User
    function getFundingIdVoteStatusPerUser(address _staker, uint256 _filmId) external view returns(uint256) {
        return fundingIdsVoteStatusPerUser[_staker][_filmId];
    }

    /// @notice Get funding filmIds per User
    function getFundingFilmIdsPerUser(address _staker) external view returns(uint256[] memory) {
        return fundingFilmIdsPerUser[_staker];
    }

    /// @notice Delete all funding filmIds per User
    function removeFundingFilmIdsPerUser(address _staker) external {
        delete fundingFilmIdsPerUser[_staker];
    }
}