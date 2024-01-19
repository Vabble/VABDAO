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
        // require(VABBLE_DAO == address(0), "initialize: already initialized");

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
        require(_filmIds.length != 0, "voteToFilm: zero length");
        require(_filmIds.length == _voteInfos.length, "voteToFilm: Bad item length");

        uint256 filmLength = _filmIds.length;
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

        (uint256 pCreateTime, ) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId);
        require(pCreateTime != 0, "not updated");
        require(__isVotePeriod(IProperty(DAO_PROPERTY).filmVotePeriod(), pCreateTime), "film elapsed vote period");
        
        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);
        (, , uint256 fundType, ) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);
        if(fundType == 0) { // in case of distribution(list) film
            // If film is for listing and voter is film board member, more weight(30%) per vote
            if(IProperty(DAO_PROPERTY).checkGovWhitelist(2, msg.sender) == 2) {
                stakeAmount = stakeAmount + stakeAmount * IProperty(DAO_PROPERTY).boardVoteWeight() / 1e10; // (30+100)/100=1.3
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

        // Example: withdrawTime is 6/15 and proposal CreatedTime is 6/10, votePeriod is 10 days
        // In this case, we update the withdrawTime to sum(6/20) of proposal CreatedTime and votePeriod
        // so, staker cannot unstake his amount till 6/20
        uint256 withdrawableTime =  IStakingPool(STAKING_POOL).getWithdrawableTime(msg.sender);
        if (pCreateTime + IProperty(DAO_PROPERTY).filmVotePeriod() > withdrawableTime) {
            IStakingPool(STAKING_POOL).updateWithdrawableTime(msg.sender, pCreateTime + IProperty(DAO_PROPERTY).filmVotePeriod());
        }
        // 1++ for calculating the rewards
        IStakingPool(STAKING_POOL).updateVotedTime(msg.sender, block.timestamp);
        
        emit VotedToFilm(msg.sender, _filmId, _voteInfo);
    }

    /// @notice Approve multi films that votePeriod has elapsed after votePeriod(10 days) by anyone
    // if isFund is true then "APPROVED_FUNDING", if isFund is false then "APPROVED_LISTING"
    function approveFilms(uint256[] calldata _filmIds) external onlyStaker nonReentrant {
        require(_filmIds.length != 0, "approveFilms: Invalid items");

        uint256 filmLength = _filmIds.length;
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
        address _agent, 
        uint256 _voteInfo, 
        uint256 _flag     //  flag=1 => dispute vote
    ) external onlyStaker nonReentrant {       
        require(!isAttendToAgentVote[msg.sender][_agent], "voteToAgent: Already voted");
        require(
            msg.sender != _agent && msg.sender != IProperty(DAO_PROPERTY).getGovProposer(1, _agent), 
            "voteToAgent: self voted"
        );    
        require(_voteInfo == 1 || _voteInfo == 2, "voteToAgent: bad vote info");  
        
        (uint256 pCreateTime, ) = IProperty(DAO_PROPERTY).getGovProposalTime(_agent, 1);
        require(pCreateTime != 0, "voteToAgent: no proposal");

        __voteToAgent(_agent, _voteInfo, _flag, pCreateTime);        
        
        userGovernVoteCount[msg.sender] += 1;

        isAttendToAgentVote[msg.sender][_agent] = true;

        // for removing board member if he don't vote for some period
        lastVoteTime[msg.sender] = block.timestamp;
        // 1++ for calculating the rewards
        IStakingPool(STAKING_POOL).updateVotedTime(msg.sender, block.timestamp);

        emit VotedToAgent(msg.sender, _agent, _voteInfo);
    }

    function __voteToAgent(address _agent, uint256 _voteInfo, uint256 _flag, uint256 _pTime) private {
        AgentVoting storage av = agentVoting[_agent];
        uint256 totalVoteCount = av.voteCount_1 + av.voteCount_2;
        if(_flag == 1) {
            require(_voteInfo == 2, "voteToAgent: invalid vote value");
            require(totalVoteCount != 0, "voteToAgent: no voter");          
            require(!__isVotePeriod(IProperty(DAO_PROPERTY).agentVotePeriod(), _pTime), "agent vote period yet");  

            if(av.disputeVABAmount == 0) {
                av.disputeStartTime = block.timestamp;
                govPassedVoteCount[2] += 1;
            } else {
                require(__isVotePeriod(IProperty(DAO_PROPERTY).disputeGracePeriod(), av.disputeStartTime), "agent elapsed grace period");            
            }
        } else {
            require(__isVotePeriod(IProperty(DAO_PROPERTY).agentVotePeriod(), _pTime), "agent elapsed vote period");               
        }

        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);
        if(_voteInfo == 1) {
            av.stakeAmount_1 += stakeAmount;
            av.voteCount_1++;
        } else {
            if(_flag == 1) av.disputeVABAmount += stakeAmount;
            else {
                av.stakeAmount_2 += stakeAmount;
                av.voteCount_2++;
            }
        }
    }

    /// @notice Replace Auditor based on vote result
    function replaceAuditor(address _agent) external onlyStaker nonReentrant {
        require(_agent != address(0) && IOwnablee(OWNABLE).auditor() != _agent, "replaceAuditor: invalid index or no proposal");
        
        (uint256 pCreateTime, uint256 pApproveTime) = IProperty(DAO_PROPERTY).getGovProposalTime(_agent, 1);
        require(!__isVotePeriod(IProperty(DAO_PROPERTY).agentVotePeriod(), pCreateTime), "auditor vote period yet"); 
        require(pApproveTime == 0, "auditor already approved"); 
        
        AgentVoting memory av = agentVoting[_agent];
        uint256 disputeTime = av.disputeStartTime;
        if(disputeTime != 0) {
            require(!__isVotePeriod(IProperty(DAO_PROPERTY).disputeGracePeriod(), disputeTime), "auditor grace period yet");            
        } else {
            require(
                !__isVotePeriod(IProperty(DAO_PROPERTY).agentVotePeriod() + IProperty(DAO_PROPERTY).disputeGracePeriod(), pCreateTime), 
                "auditor dispute vote period yet"
            );
        }

        uint256 reason = 0;
        uint256 totalVoteCount = av.voteCount_1 + av.voteCount_2;
        // must be over 51%, staking amount must be over 75m, dispute staking amount must be less than 150m
        if(
            totalVoteCount >= IStakingPool(STAKING_POOL).getLimitCount() &&
            av.stakeAmount_1 > av.stakeAmount_2 &&
            av.stakeAmount_1 > IProperty(DAO_PROPERTY).availableVABAmount() &&
            av.disputeVABAmount < 2 * IProperty(DAO_PROPERTY).availableVABAmount()
        ) {
            IOwnablee(OWNABLE).replaceAuditor(_agent);
            IProperty(DAO_PROPERTY).updateGovProposal(_agent, 1, 1);
            govPassedVoteCount[1] += 1;
        } else {
            IProperty(DAO_PROPERTY).updateGovProposal(_agent, 1, 0);

            if(totalVoteCount < IStakingPool(STAKING_POOL).getLimitCount()) {
                reason = 1;
            } else if(av.stakeAmount_1 <= av.stakeAmount_2) {
                reason = 2;
            } else if(av.stakeAmount_1 <= IProperty(DAO_PROPERTY).availableVABAmount()) {
                reason = 3;
            } else if(av.disputeVABAmount >= 2 * IProperty(DAO_PROPERTY).availableVABAmount()) {
                reason = 4;
            } else {
                reason = 10;
            }
        }
        emit AuditorReplaced(_agent, msg.sender, reason);
    }
    
    function voteToFilmBoard(
        address _candidate, 
        uint256 _voteInfo
    ) external onlyStaker nonReentrant {
        require(IProperty(DAO_PROPERTY).checkGovWhitelist(2, _candidate) == 1, "voteToFilmBoard: Not candidate");
        require(!isAttendToBoardVote[msg.sender][_candidate], "voteToFilmBoard: Already voted");   
        require(_voteInfo == 1 || _voteInfo == 2, "voteToFilmBoard: bad vote info");  
        require(
            msg.sender != _candidate && msg.sender != IProperty(DAO_PROPERTY).getGovProposer(2, _candidate), 
            "voteToFilmBoard: self voted"
        );   

        (uint256 pCreateTime, ) = IProperty(DAO_PROPERTY).getGovProposalTime(_candidate, 2);
        require(pCreateTime != 0, "voteToFilmBoard: no proposal");
        require(__isVotePeriod(IProperty(DAO_PROPERTY).boardVotePeriod(), pCreateTime), "filmBoard elapsed vote period");
        
        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);
        
        Voting storage fbp = filmBoardVoting[_candidate];     
        if(_voteInfo == 1) {
            fbp.stakeAmount_1 += stakeAmount; // Yes
            fbp.voteCount_1++;
        } else {
            fbp.stakeAmount_2 += stakeAmount; // No
            fbp.voteCount_2++;
        }

        userGovernVoteCount[msg.sender] += 1;

        isAttendToBoardVote[msg.sender][_candidate] = true;

        // for removing board member if he don't vote for some period
        lastVoteTime[msg.sender] = block.timestamp;
        // 1++ for calculating the rewards
        IStakingPool(STAKING_POOL).updateVotedTime(msg.sender, block.timestamp);

        emit VotedToFilmBoard(msg.sender, _candidate, _voteInfo);
    }
    
    function addFilmBoard(address _member) external onlyStaker nonReentrant {
        require(IProperty(DAO_PROPERTY).checkGovWhitelist(2, _member) == 1, "addFilmBoard: Not candidate");

        (uint256 pCreateTime, uint256 pApproveTime) = IProperty(DAO_PROPERTY).getGovProposalTime(_member, 2);
        require(!__isVotePeriod(IProperty(DAO_PROPERTY).boardVotePeriod(), pCreateTime), "filmBoard vote period yet");
        require(pApproveTime == 0, "filmBoard already approved");

        uint256 reason = 0;
        Voting memory fbp = filmBoardVoting[_member];
        uint256 totalVoteCount = fbp.voteCount_1 + fbp.voteCount_2;
        if(
            totalVoteCount >= IStakingPool(STAKING_POOL).getLimitCount() &&
            fbp.stakeAmount_1 > fbp.stakeAmount_2 &&
            fbp.stakeAmount_1 > IProperty(DAO_PROPERTY).availableVABAmount()
        ) {
            IProperty(DAO_PROPERTY).updateGovProposal(_member, 2, 1);
            govPassedVoteCount[3] += 1;
        } else {
            IProperty(DAO_PROPERTY).updateGovProposal(_member, 2, 0);

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
        emit FilmBoardAdded(_member, msg.sender, reason);
    }

    ///@notice Stakers vote to proposal for setup the address to reward DAO fund
    function voteToRewardAddress(address _rewardAddress, uint256 _voteInfo) external onlyStaker nonReentrant {
        require(IProperty(DAO_PROPERTY).checkGovWhitelist(3,_rewardAddress) == 1, "voteToRewardAddress: Not candidate");
        require(!isAttendToRewardAddressVote[msg.sender][_rewardAddress], "voteToRewardAddress: Already voted");   
        require(_voteInfo == 1 || _voteInfo == 2, "voteToRewardAddress: bad vote info");    
        require(
            msg.sender != _rewardAddress && msg.sender != IProperty(DAO_PROPERTY).getGovProposer(3, _rewardAddress), 
            "voteToRewardAddress: self voted"
        );       

        (uint256 pCreateTime, ) = IProperty(DAO_PROPERTY).getGovProposalTime(_rewardAddress, 3);
        require(pCreateTime != 0, "voteToRewardAddress: no proposal");
        require(__isVotePeriod(IProperty(DAO_PROPERTY).rewardVotePeriod(), pCreateTime), "reward elapsed vote period");
        
        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);

        Voting storage rav = rewardAddressVoting[_rewardAddress];
        if(_voteInfo == 1) {
            rav.stakeAmount_1 += stakeAmount;   // Yes
            rav.voteCount_1++;
        } else {
            rav.stakeAmount_2 += stakeAmount;   // No
            rav.voteCount_2++;
        }

        userGovernVoteCount[msg.sender] += 1;

        isAttendToRewardAddressVote[msg.sender][_rewardAddress] = true;

        // for removing board member if he don't vote for some period
        lastVoteTime[msg.sender] = block.timestamp;
        // 1++ for calculating the rewards
        IStakingPool(STAKING_POOL).updateVotedTime(msg.sender, block.timestamp);

        emit VotedToPoolAddress(msg.sender, _rewardAddress, _voteInfo);
    }

    function setDAORewardAddress(address _rewardAddress) external onlyStaker nonReentrant {
        require(IProperty(DAO_PROPERTY).checkGovWhitelist(3, _rewardAddress) == 1, "setRewardAddress: Not candidate");

        (uint256 pCreateTime, uint256 pApproveTime) = IProperty(DAO_PROPERTY).getGovProposalTime(_rewardAddress, 3);
        require(!__isVotePeriod(IProperty(DAO_PROPERTY).rewardVotePeriod(), pCreateTime), "reward vote period yet");
        require(pApproveTime == 0, "pool address already approved");
        
        uint256 reason = 0;
        Voting memory rav = rewardAddressVoting[_rewardAddress];
        uint256 totalVoteCount = rav.voteCount_1 + rav.voteCount_2;
        if(
            totalVoteCount >= IStakingPool(STAKING_POOL).getLimitCount() &&       // Less than limit count
            rav.stakeAmount_1 > rav.stakeAmount_2 &&                         // less 51%
            rav.stakeAmount_1 > IProperty(DAO_PROPERTY).availableVABAmount() // less than permit amount
        ) {
            IProperty(DAO_PROPERTY).updateGovProposal(_rewardAddress, 3, 1);
            govPassedVoteCount[4] += 1;
        } else {
            IProperty(DAO_PROPERTY).updateGovProposal(_rewardAddress, 3, 0);

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
        emit PoolAddressAdded(_rewardAddress, msg.sender, reason);
    }

    /// @notice Stakers vote(1,2 => Yes, No) to proposal for updating properties(filmVotePeriod, rewardRate, ...)
    function voteToProperty(
        uint256 _voteInfo, 
        uint256 _propertyIndex, 
        uint256 _flag
    ) external onlyStaker nonReentrant {
        uint256 propertyVal = IProperty(DAO_PROPERTY).getProperty(_propertyIndex, _flag);
        require(!isAttendToPropertyVote[_flag][msg.sender][propertyVal], "voteToProperty: Already voted"); 
        require(msg.sender != IProperty(DAO_PROPERTY).getPropertyProposer(_flag, propertyVal), "voteToProperty: self voted");    
        require(_voteInfo == 1 || _voteInfo == 2, "voteToProperty: bad vote info");    
        
        (uint256 pCreateTime, ) = IProperty(DAO_PROPERTY).getPropertyProposalTime(propertyVal, _flag);
        require(pCreateTime != 0, "voteToProperty: no proposal");
        require(__isVotePeriod(IProperty(DAO_PROPERTY).propertyVotePeriod(), pCreateTime), "property elapsed vote period");

        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);

        Voting storage pv = propertyVoting[_flag][propertyVal];
        if(_voteInfo == 1) {
            pv.stakeAmount_1 += stakeAmount;
            pv.voteCount_1++;
        } else {
            pv.stakeAmount_2 += stakeAmount;
            pv.voteCount_2++;
        }
        
        userGovernVoteCount[msg.sender] += 1;

        isAttendToPropertyVote[_flag][msg.sender][propertyVal] = true;
        
        // for removing board member if he don't vote for some period
        lastVoteTime[msg.sender] = block.timestamp;
        // 1++ for calculating the rewards
        IStakingPool(STAKING_POOL).updateVotedTime(msg.sender, block.timestamp);

        emit VotedToProperty(msg.sender, _flag, propertyVal, _voteInfo);
    }

    /// @notice Update properties based on vote result(>=51% and stakeAmount of "Yes" > 75m)
    function updateProperty(
        uint256 _propertyIndex, 
        uint256 _flag
    ) external onlyStaker nonReentrant {
        uint256 propertyVal = IProperty(DAO_PROPERTY).getProperty(_propertyIndex, _flag);
        (uint256 pCreateTime, uint256 pApproveTime) = IProperty(DAO_PROPERTY).getPropertyProposalTime(propertyVal, _flag);
        require(!__isVotePeriod(IProperty(DAO_PROPERTY).propertyVotePeriod(), pCreateTime), "property vote period yet");
        require(pApproveTime == 0, "property already approved");

        uint256 reason = 0;
        Voting memory pv = propertyVoting[_flag][propertyVal];
        uint256 totalVoteCount = pv.voteCount_1 + pv.voteCount_2;
        if(
            totalVoteCount >= IStakingPool(STAKING_POOL).getLimitCount() && 
            pv.stakeAmount_1 > pv.stakeAmount_2 &&
            pv.stakeAmount_1 > IProperty(DAO_PROPERTY).availableVABAmount()
        ) {
            IProperty(DAO_PROPERTY).updatePropertyProposal(propertyVal, _flag, 1);
            govPassedVoteCount[5] += 1;              
        } else {
            IProperty(DAO_PROPERTY).updatePropertyProposal(propertyVal, _flag, 0);

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
        emit PropertyUpdated(_flag, propertyVal, msg.sender, reason);
    }

    function __isVotePeriod(
        uint256 _period, 
        uint256 _startTime
    ) private view returns (bool) {
        if(_period >= block.timestamp - _startTime) return true;
        else return false;
    }

    /// @notice Update last vote time for removing filmboard member
    function getLastVoteTime(address _member) external view override returns (uint256 time_) {
        time_ = lastVoteTime[_member];
    }
}