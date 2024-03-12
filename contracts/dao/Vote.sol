// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/Helper.sol";
import "../interfaces/IVabbleDAO.sol";
import "../interfaces/IStakingPool.sol";
import "../interfaces/IProperty.sol";
import "../interfaces/IOwnablee.sol";
import "../interfaces/IVote.sol";

contract Vote is IVote, ReentrancyGuard {

    event VotedToFilm(address indexed voter, uint256 indexed filmId, uint256 voteInfo);
    event VotedToAgent(address indexed voter, address indexed agent, uint256 voteInfo);
    event VotedToProperty(address indexed voter, uint256 flag, uint256 propertyVal, uint256 voteInfo);
    event VotedToPoolAddress(address indexed voter, address rewardAddress, uint256 voteInfo);
    event VotedToFilmBoard(address indexed voter, address candidate, uint256 voteInfo);       
    event FilmApproved(uint256 indexed filmId, uint256 fundType, uint256 reason);
    event AuditorReplaced(address indexed agent, address caller, uint256 reason);
    event FilmBoardAdded(address indexed boardMember, address caller, uint256 reason);
    event PoolAddressAdded(address indexed pool, address caller, uint256 reason);
    event PropertyUpdated(uint256 indexed whichProperty, uint256 propertyValue, address caller, uint256 reason);
    
    struct Voting {
        uint256 stakeAmount_1;  // staking amount of voter with status(yes)
        uint256 stakeAmount_2;  // staking amount of voter with status(no)
        uint256 voteCount_1;    // number of accumulated votes(yes)
        uint256 voteCount_2;    // number of accumulated votes(no)
    }

    struct AgentVoting {
        uint256 stakeAmount_1;    // staking amount of voter with status(yes)
        uint256 stakeAmount_2;    // staking amount of voter with status(no)
        uint256 voteCount_1;      // number of accumulated votes(yes)
        uint256 voteCount_2;      // number of accumulated votes(no)
        uint256 disputeStartTime; // dispute vote start time for an agent
        uint256 disputeVABAmount; // VAB voted dispute
    }

    address private immutable OWNABLE;     // Ownablee contract address
    address private VABBLE_DAO;
    address private STAKING_POOL;
    address private DAO_PROPERTY;             

    mapping(uint256 => Voting) public filmVoting;                            // (filmId => Voting)
    mapping(address => mapping(uint256 => bool)) public isAttendToFilmVote;  // (staker => (filmId => true/false))
    mapping(address => Voting) public filmBoardVoting;                       // (filmBoard candidate => Voting) 
    mapping(address => mapping(address => bool)) public isAttendToBoardVote; // (staker => (filmBoard candidate => true/false))    
    mapping(address => Voting) public rewardAddressVoting;                   // (rewardAddress candidate => Voting)  
    mapping(address => mapping(address => bool)) public isAttendToRewardAddressVote; // (staker => (reward address => true/false))    
    mapping(address => AgentVoting) public agentVoting;                      // (agent => AgentVoting) 
    mapping(address => mapping(address => bool)) public isAttendToAgentVote; // (staker => (agent => true/false)) 
    mapping(uint256 => mapping(uint256 => Voting)) public propertyVoting;    // (flag => (property value => Voting))
    mapping(uint256 => mapping(address => mapping(uint256 => bool))) public isAttendToPropertyVote; // (flag => (staker => (property => true/false)))    
    mapping(address => uint256) public userFilmVoteCount;   //(user => film vote count)
    mapping(address => uint256) public userGovernVoteCount; //(user => governance vote count)
    mapping(uint256 => uint256) public govPassedVoteCount;  //(flag => pased vote count) 1: agent, 2: disput, 3: board, 4: pool, 5: property    
    mapping(address => uint256) private lastVoteTime;        // (staker => block.timestamp) for removing filmboard member
    mapping(uint256 => uint256) private proposalFilmIds;     // filmId => proposalID
       
    modifier onlyDeployer() {
        require(msg.sender == IOwnablee(OWNABLE).deployer(), "caller is not the deployer");
        _;
    }
    modifier onlyStaker() {
        require(IStakingPool(STAKING_POOL).getStakeAmount(msg.sender) != 0, "Not staker");
        _;
    }

    constructor(address _ownable) {
        require(_ownable != address(0), "ownableContract: Zero address");
        OWNABLE = _ownable; 
    }

    /// @notice Initialize Vote
    function initialize(
        address _vabbleDAO,
        address _stakingPool,
        address _property
    ) external onlyDeployer {
        require(VABBLE_DAO == address(0), "initialize: already initialized");

        require(_vabbleDAO != address(0) && Helper.isContract(_vabbleDAO), "initializeVote: Zero vabbleDAO address");
        VABBLE_DAO = _vabbleDAO;        
        require(_stakingPool != address(0) && Helper.isContract(_stakingPool), "initializeVote: Zero stakingPool address");
        STAKING_POOL = _stakingPool;
        require(_property != address(0) && Helper.isContract(_property), "initializeVote: Zero property address");
        DAO_PROPERTY = _property;
    }        

    /// @notice Vote to multi films from a staker
    function voteToFilms(
        uint256[] calldata _filmIds, 
        uint256[] calldata _voteInfos
    ) external onlyStaker nonReentrant {
        uint256 filmLength = _filmIds.length;
        require(filmLength != 0 && filmLength < 1000, "voteToFilm: zero length");
        require(filmLength == _voteInfos.length, "voteToFilm: Bad item length");

        for(uint256 i = 0; i < filmLength; ++i) { 
            __voteToFilm(_filmIds[i], _voteInfos[i]);
        }        
    }

    function __voteToFilm(
        uint256 _filmId, 
        uint256 _voteInfo
    ) private {
        require(msg.sender != IVabbleDAO(VABBLE_DAO).getFilmOwner(_filmId), "filmVote: film owner");
        require(!isAttendToFilmVote[msg.sender][_filmId], "_voteToFilm: Already voted");    
        require(_voteInfo == 1 || _voteInfo == 2, "_voteToFilm: bad vote info");    

        Helper.Status status = IVabbleDAO(VABBLE_DAO).getFilmStatus(_filmId);
        require(status == Helper.Status.UPDATED, "Not updated");        

        (uint256 cTime, ) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId);
        require(cTime != 0, "not updated");
        require(__isVotePeriod(IProperty(DAO_PROPERTY).filmVotePeriod(), cTime), "film elapsed vote period");
        
        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);
        (, , uint256 fundType, ) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);
        if(fundType == 0) { // in case of distribution(list) film
            // If film is for listing and voter is film board member, more weight(30%) per vote
            if(IProperty(DAO_PROPERTY).checkGovWhitelist(2, msg.sender) == 2) {
                stakeAmount += stakeAmount * IProperty(DAO_PROPERTY).boardVoteWeight() / 1e10; // (30+100)/100=1.3
            }
        }

        Voting storage fv = filmVoting[_filmId];
        if(_voteInfo == 1) {
            fv.stakeAmount_1 += stakeAmount;   // Yes
            fv.voteCount_1++;
        } else {
            fv.stakeAmount_2 += stakeAmount;   // No
            fv.voteCount_2++;
        }

        userFilmVoteCount[msg.sender] += 1;

        isAttendToFilmVote[msg.sender][_filmId] = true;
        
        // for removing board member if he don't vote for some period
        lastVoteTime[msg.sender] = block.timestamp;

        // 1++ for calculating the rewards
        IStakingPool(STAKING_POOL).addVotedData(
            msg.sender, block.timestamp, proposalFilmIds[_filmId]
        );
        
        emit VotedToFilm(msg.sender, _filmId, _voteInfo);
    }

    function saveProposalWithFilm(uint256 _filmId, uint256 _proposalID) external override {
        proposalFilmIds[_filmId] = _proposalID;
    }

    /// @notice Approve multi films that votePeriod has elapsed after votePeriod(10 days) by anyone
    // if isFund is true then "APPROVED_FUNDING", if isFund is false then "APPROVED_LISTING"
    function approveFilms(uint256[] calldata _filmIds) external onlyStaker nonReentrant {
        uint256 filmLength = _filmIds.length;
        require(filmLength != 0 && filmLength < 1000, "approveFilms: Invalid items");

        for(uint256 i = 0; i < filmLength; ++i) {
            __approveFilm(_filmIds[i]);
        }   
    }

    function __approveFilm(uint256 _filmId) private {
        Voting memory fv = filmVoting[_filmId];
        
        // Example: stakeAmount of "YES" is 2000 and stakeAmount("NO") is 1000 in 10 days(votePeriod)
        // In this case, Approved since 2000 > 1000 + 500 (it means ">50%") and stakeAmount of "YES" > 75m          
        (uint256 pCreateTime, uint256 pApproveTime) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId);
        require(!__isVotePeriod(IProperty(DAO_PROPERTY).filmVotePeriod(), pCreateTime), "approveFilms: vote period yet");
        require(pApproveTime == 0, "film already approved");
        
        (, , uint256 fundType, ) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);
        uint256 reason = 0;
        uint256 totalVoteCount = fv.voteCount_1 + fv.voteCount_2;
        if(totalVoteCount >= IStakingPool(STAKING_POOL).getLimitCount() && fv.stakeAmount_1 > fv.stakeAmount_2) {
            reason = 0;
        } else {
            if(totalVoteCount < IStakingPool(STAKING_POOL).getLimitCount()) {
                reason = 1;
            } else if(fv.stakeAmount_1 <= fv.stakeAmount_2) {
                reason = 2;
            } else {
                reason = 10;
            } 
        }  

        IVabbleDAO(VABBLE_DAO).approveFilmByVote(_filmId, reason);

        emit FilmApproved(_filmId, fundType, reason);
    }

    /// @notice Stakers vote(1,2 => Yes, No) to agent for replacing Auditor    
    function voteToAgent(
        uint256 _voteInfo, 
        uint256 _index, 
        uint256 _flag     //  flag=1 => dispute vote
    ) external onlyStaker nonReentrant {  
        (uint256 cTime, , uint256 pID, address agent, address creator, ) = IProperty(DAO_PROPERTY).getGovProposalInfo(_index, 1);
        
        require(!isAttendToAgentVote[msg.sender][agent], "vA: already voted");
        require(msg.sender != agent && msg.sender != creator, "vA: self voted");    
        require(_voteInfo == 1 || _voteInfo == 2, "vA: bad vote info"); 
        require(cTime != 0, "vA: no proposal");

        __voteToAgent(agent, creator, _voteInfo, _flag, cTime);        
        
        userGovernVoteCount[msg.sender] += 1;

        isAttendToAgentVote[msg.sender][agent] = true;

        // for removing board member if he don't vote for some period
        lastVoteTime[msg.sender] = block.timestamp;
        // 1++ for calculating the rewards
        IStakingPool(STAKING_POOL).addVotedData(msg.sender, block.timestamp, pID);

        emit VotedToAgent(msg.sender, agent, _voteInfo);
    }

    function __voteToAgent(address _agent, address proposer, uint256 _voteInfo, uint256 _flag, uint256 _cTime) private {
        AgentVoting storage av = agentVoting[_agent];
        uint256 totalVoteCount = av.voteCount_1 + av.voteCount_2;
        if(_flag == 1) {
            require(_voteInfo == 2, "vA: invalid vote value");
            require(totalVoteCount != 0, "vA: no voter");          
            require(!__isVotePeriod(IProperty(DAO_PROPERTY).agentVotePeriod(), _cTime), "vA: vote period yet");  

            // a user must have staked double the stake of the initial proposer of the auditor change proposal
            uint256 proposerAmount = IStakingPool(STAKING_POOL).getStakeAmount(proposer);
            uint256 callerAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);            
            require(callerAmount >= 2 * proposerAmount, "caller must stake more");
            
            if(av.disputeVABAmount == 0) {
                av.disputeStartTime = block.timestamp;
                govPassedVoteCount[2] += 1;
            } else {
                require(__isVotePeriod(IProperty(DAO_PROPERTY).disputeGracePeriod(), av.disputeStartTime), "vA: elapsed grace period");            
            }
        } else {
            require(__isVotePeriod(IProperty(DAO_PROPERTY).agentVotePeriod(), _cTime), "vA elapsed period");               
        }

        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);
        if(_voteInfo == 1) {
            av.stakeAmount_1 += stakeAmount;
            av.voteCount_1++;
        } else {
            if(_flag == 1) av.disputeVABAmount += stakeAmount;
            else 
                av.stakeAmount_2 += stakeAmount;
            av.voteCount_2++;            
        }
    }

    /// @notice Replace Auditor based on vote result
    function replaceAuditor(uint256 _index) external onlyStaker nonReentrant {
        (uint256 cTime, uint256 aTime, , address agent, , ) = IProperty(DAO_PROPERTY).getGovProposalInfo(_index, 1);
        
        require(agent != address(0) && IOwnablee(OWNABLE).auditor() != agent, "rA: invalid index or no proposal");        
        require(!__isVotePeriod(IProperty(DAO_PROPERTY).agentVotePeriod(), cTime), "rA: vote period yet"); 
        require(aTime == 0, "auditor already approved"); 
        
        AgentVoting memory av = agentVoting[agent];
        uint256 disputeTime = av.disputeStartTime;
        if(disputeTime != 0) {
            require(!__isVotePeriod(IProperty(DAO_PROPERTY).disputeGracePeriod(), disputeTime), "rA: grace period yet");            
        } else {
            require(
                !__isVotePeriod(IProperty(DAO_PROPERTY).agentVotePeriod() + IProperty(DAO_PROPERTY).disputeGracePeriod(), cTime), 
                "rA: dispute vote period yet"
            );
        }

        uint256 reason = 0;
        uint256 totalVoteCount = av.voteCount_1 + av.voteCount_2;
        // must be over 51%, staking amount must be over 75m, 
        // dispute staking amount must be less than 150m
        if(
            totalVoteCount >= IStakingPool(STAKING_POOL).getLimitCount() &&
            av.stakeAmount_1 > av.stakeAmount_2 + av.disputeVABAmount &&
            av.stakeAmount_1 > IProperty(DAO_PROPERTY).disputLimitAmount() &&
            av.disputeVABAmount < 2 * IProperty(DAO_PROPERTY).disputLimitAmount()
        ) {
            IOwnablee(OWNABLE).replaceAuditor(agent);
            IProperty(DAO_PROPERTY).updateGovProposal(_index, 1, 1);
            govPassedVoteCount[1] += 1;
        } else {
            IProperty(DAO_PROPERTY).updateGovProposal(_index, 1, 0);

            if(totalVoteCount < IStakingPool(STAKING_POOL).getLimitCount()) {
                reason = 1;
            } else if(av.stakeAmount_1 <= av.stakeAmount_2) {
                reason = 2;
            } else if(av.stakeAmount_1 <= IProperty(DAO_PROPERTY).disputLimitAmount()) {
                reason = 3;
            } else if(av.disputeVABAmount >= 2 * IProperty(DAO_PROPERTY).disputLimitAmount()) {
                reason = 4;
            } else {
                reason = 10;
            }
        }
        emit AuditorReplaced(agent, msg.sender, reason);
    }
    
    function voteToFilmBoard(
        uint256 _index, 
        uint256 _voteInfo
    ) external onlyStaker nonReentrant {
        (uint256 cTime, , uint256 pID, address member, address creator, ) = IProperty(DAO_PROPERTY).getGovProposalInfo(_index, 2);
        
        require(IProperty(DAO_PROPERTY).checkGovWhitelist(2, member) == 1, "vFB: not candidate");
        require(!isAttendToBoardVote[msg.sender][member], "vFB: already voted");   
        require(_voteInfo == 1 || _voteInfo == 2, "vFB: bad vote info");  
        require(msg.sender != member && msg.sender != creator, "vFB: self voted");   
        require(cTime != 0, "vFB: no proposal");
        require(__isVotePeriod(IProperty(DAO_PROPERTY).boardVotePeriod(), cTime), "vFB: elapsed vote period");
        
        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);
        
        Voting storage fbp = filmBoardVoting[member];     
        if(_voteInfo == 1) {
            fbp.stakeAmount_1 += stakeAmount; // Yes
            fbp.voteCount_1++;
        } else {
            fbp.stakeAmount_2 += stakeAmount; // No
            fbp.voteCount_2++;
        }

        userGovernVoteCount[msg.sender] += 1;

        isAttendToBoardVote[msg.sender][member] = true;

        // for removing board member if he don't vote for some period
        lastVoteTime[msg.sender] = block.timestamp;
        // 1++ for calculating the rewards
        IStakingPool(STAKING_POOL).addVotedData(msg.sender, block.timestamp, pID);

        emit VotedToFilmBoard(msg.sender, member, _voteInfo);
    }
    
    function addFilmBoard(uint256 _index) external onlyStaker nonReentrant {
        (uint256 cTime, uint256 aTime, , address member, , ) = IProperty(DAO_PROPERTY).getGovProposalInfo(_index, 2);
        
        require(IProperty(DAO_PROPERTY).checkGovWhitelist(2, member) == 1, "aFB: not candidate");
        require(!__isVotePeriod(IProperty(DAO_PROPERTY).boardVotePeriod(), cTime), "aFB: vote period yet");
        require(aTime == 0, "aFB: already approved");

        uint256 reason = 0;
        Voting memory fbp = filmBoardVoting[member];
        uint256 totalVoteCount = fbp.voteCount_1 + fbp.voteCount_2;
        if(
            totalVoteCount >= IStakingPool(STAKING_POOL).getLimitCount() &&
            fbp.stakeAmount_1 > fbp.stakeAmount_2
            // fbp.stakeAmount_1 > IProperty(DAO_PROPERTY).availableVABAmount()
        ) {
            IProperty(DAO_PROPERTY).updateGovProposal(_index, 2, 1);
            govPassedVoteCount[3] += 1;
        } else {
            IProperty(DAO_PROPERTY).updateGovProposal(_index, 2, 0);

            if(totalVoteCount < IStakingPool(STAKING_POOL).getLimitCount()) {
                reason = 1;
            } else if(fbp.stakeAmount_1 <= fbp.stakeAmount_2) {
                reason = 2;
            } else if(fbp.stakeAmount_1 <= IProperty(DAO_PROPERTY).availableVABAmount()) {
                reason = 3;
            } else {
                reason = 10;
            }
        }        
        emit FilmBoardAdded(member, msg.sender, reason);
    }

    ///@notice Stakers vote to proposal for setup the address to reward DAO fund
    function voteToRewardAddress(uint256 _index, uint256 _voteInfo) external onlyStaker nonReentrant {
        (uint256 cTime, , uint256 pID, address member, address creator, ) = IProperty(DAO_PROPERTY).getGovProposalInfo(_index, 3);
        
        require(IProperty(DAO_PROPERTY).checkGovWhitelist(3, member) == 1, "vRA: not candidate");
        require(!isAttendToRewardAddressVote[msg.sender][member], "vRA: already voted");   
        require(_voteInfo == 1 || _voteInfo == 2, "vRA: bad vote info");    
        require(msg.sender != member && msg.sender != creator, "vRA: self voted");       
        require(cTime != 0, "vRA: no proposal");
        require(__isVotePeriod(IProperty(DAO_PROPERTY).rewardVotePeriod(), cTime), "vRA elapsed vote period");
        
        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);

        Voting storage rav = rewardAddressVoting[member];
        if(_voteInfo == 1) {
            rav.stakeAmount_1 += stakeAmount;   // Yes
            rav.voteCount_1++;
        } else {
            rav.stakeAmount_2 += stakeAmount;   // No
            rav.voteCount_2++;
        }

        userGovernVoteCount[msg.sender] += 1;

        isAttendToRewardAddressVote[msg.sender][member] = true;

        // for removing board member if he don't vote for some period
        lastVoteTime[msg.sender] = block.timestamp;
        // 1++ for calculating the rewards        
        IStakingPool(STAKING_POOL).addVotedData(msg.sender, block.timestamp, pID);

        emit VotedToPoolAddress(msg.sender, member, _voteInfo);
    }

    function setDAORewardAddress(uint256 _index) external onlyStaker nonReentrant {
        (uint256 cTime, uint256 aTime, , address member, , ) = IProperty(DAO_PROPERTY).getGovProposalInfo(_index, 3);
        
        require(IProperty(DAO_PROPERTY).checkGovWhitelist(3, member) == 1, "sRA: not candidate");
        require(!__isVotePeriod(IProperty(DAO_PROPERTY).rewardVotePeriod(), cTime), "sRA: vote period yet");
        require(aTime == 0, "sRA: already approved");
        
        uint256 reason = 0;
        Voting memory rav = rewardAddressVoting[member];
        uint256 totalVoteCount = rav.voteCount_1 + rav.voteCount_2;
        if(
            totalVoteCount >= IStakingPool(STAKING_POOL).getLimitCount() &&       // Less than limit count
            rav.stakeAmount_1 > rav.stakeAmount_2                          // less 51%
            // rav.stakeAmount_1 > IProperty(DAO_PROPERTY).availableVABAmount() // less than permit amount
        ) {
            IProperty(DAO_PROPERTY).updateGovProposal(_index, 3, 1);
            govPassedVoteCount[4] += 1;
        } else {
            IProperty(DAO_PROPERTY).updateGovProposal(_index, 3, 0);

            if(totalVoteCount < IStakingPool(STAKING_POOL).getLimitCount()) {
                reason = 1;
            } else if(rav.stakeAmount_1 <= rav.stakeAmount_2) {
                reason = 2;
            } else if(rav.stakeAmount_1 <= IProperty(DAO_PROPERTY).availableVABAmount()) {
                reason = 3;
            } else {
                reason = 10;
            }
        }        
        emit PoolAddressAdded(member, msg.sender, reason);
    }

    /// @notice Stakers vote(1,2 => Yes, No) to proposal for updating properties(filmVotePeriod, rewardRate, ...)
    function voteToProperty(
        uint256 _voteInfo, 
        uint256 _index, 
        uint256 _flag
    ) external onlyStaker nonReentrant {
        (uint256 cTime, , uint256 pID, uint256 value, address creator, ) = IProperty(DAO_PROPERTY).getPropertyProposalInfo(_index, _flag);
        
        require(!isAttendToPropertyVote[_flag][msg.sender][value], "vP: already voted"); 
        require(msg.sender != creator, "vP: self voted");    
        require(_voteInfo == 1 || _voteInfo == 2, "vP: bad vote info");            
        require(cTime != 0, "vP: no proposal");
        require(__isVotePeriod(IProperty(DAO_PROPERTY).propertyVotePeriod(), cTime), "vP: elapsed period");

        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);

        Voting storage pv = propertyVoting[_flag][value];
        if(_voteInfo == 1) {
            pv.stakeAmount_1 += stakeAmount;
            pv.voteCount_1++;
        } else {
            pv.stakeAmount_2 += stakeAmount;
            pv.voteCount_2++;
        }
        
        userGovernVoteCount[msg.sender] += 1;

        isAttendToPropertyVote[_flag][msg.sender][value] = true;
        
        // for removing board member if he don't vote for some period
        lastVoteTime[msg.sender] = block.timestamp;
        // 1++ for calculating the rewards
        IStakingPool(STAKING_POOL).addVotedData(msg.sender, block.timestamp, pID);

        emit VotedToProperty(msg.sender, _flag, value, _voteInfo);
    }

    /// @notice Update properties based on vote result(>=51% and stakeAmount of "Yes" > 75m)
    function updateProperty(
        uint256 _index, 
        uint256 _flag
    ) external onlyStaker nonReentrant {
        (uint256 cTime, uint256 aTime, , uint256 value, , ) = IProperty(DAO_PROPERTY).getPropertyProposalInfo(_index, _flag);
        
        require(!__isVotePeriod(IProperty(DAO_PROPERTY).propertyVotePeriod(), cTime), "pV: vote period yet");
        require(aTime == 0, "pV: already approved");

        uint256 reason = 0;
        Voting memory pv = propertyVoting[_flag][value];
        uint256 totalVoteCount = pv.voteCount_1 + pv.voteCount_2;
        if(
            totalVoteCount >= IStakingPool(STAKING_POOL).getLimitCount() && 
            pv.stakeAmount_1 > pv.stakeAmount_2 
            // pv.stakeAmount_1 > IProperty(DAO_PROPERTY).availableVABAmount()
        ) {
            IProperty(DAO_PROPERTY).updatePropertyProposal(_index, _flag, 1);
            govPassedVoteCount[5] += 1;              
        } else {
            IProperty(DAO_PROPERTY).updatePropertyProposal(_index, _flag, 0);

            if(totalVoteCount < IStakingPool(STAKING_POOL).getLimitCount()) {
                reason = 1;
            } else if(pv.stakeAmount_1 <= pv.stakeAmount_2) {
                reason = 2;
            } else if(pv.stakeAmount_1 <= IProperty(DAO_PROPERTY).availableVABAmount()) {
                reason = 3;
            } else {
                reason = 10;
            }
        }
        emit PropertyUpdated(_flag, value, msg.sender, reason);
    }

    function __isVotePeriod(
        uint256 _period, 
        uint256 _startTime
    ) private view returns (bool) {
        require(_startTime != 0, "bad startTime");
        if(_period >= block.timestamp - _startTime) return true;
        else return false;
    }

    /// @notice Update last vote time for removing filmboard member
    function getLastVoteTime(address _member) external view override returns (uint256 time_) {
        time_ = lastVoteTime[_member];
    }
}