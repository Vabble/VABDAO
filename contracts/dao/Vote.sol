// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/Helper.sol";
import "../interfaces/IVabbleDAO.sol";
import "../interfaces/IStakingPool.sol";
import "../interfaces/IProperty.sol";
import "../interfaces/IOwnablee.sol";

contract Vote is ReentrancyGuard {

    event VotedToFilm(address voter, uint256 filmId, uint256 voteInfo, uint256 voteTime);
    event VotedToAgent(address voter, address agent, uint256 voteInfo, uint256 voteTime);
    event VotedToProperty(address voter, uint256 flag, uint256 propertyVal, uint256 voteInfo, uint256 voteTime);
    event VotedToPoolAddress(address voter, address rewardAddress, uint256 voteInfo, uint256 voteTime);
    event VotedToFilmBoard(address voter, address candidate, uint256 voteInfo, uint256 voteTime);
       
    event FilmApproved(uint256 filmId, uint256 fundType, uint256 approveTime, uint256 reason);
    event AuditorReplaced(address agent, address caller, uint256 replaceTime, uint256 reason);
    event FilmBoardAdded(address boardMember, address caller, uint256 addTime, uint256 reason);
    event PoolAddressAdded(address pool, address caller, uint256 addTime, uint256 reason);
    event PropertyUpdated(uint256 whichProperty, uint256 propertyValue, address caller, uint256 updateTime, uint256 reason);
    
    struct Voting {
        uint256 stakeAmount_1;  // staking amount of voter with status(yes)
        uint256 stakeAmount_2;  // staking amount of voter with status(no)
        uint256 stakeAmount_3;  // staking amount of voter with status(abstain)
        uint256 voteCount;      // number of accumulated votes
    }

    struct AgentVoting {
        uint256 stakeAmount_1;    // staking amount of voter with status(yes)
        uint256 stakeAmount_2;    // staking amount of voter with status(no)
        uint256 stakeAmount_3;    // staking amount of voter with status(abstain)
        uint256 voteCount;        // number of accumulated votes
        uint256 disputeStartTime; // dispute vote start time for an agent
        uint256 disputeVABAmount; // VAB voted dispute
    }

    address private immutable OWNABLE;     // Ownablee contract address
    address private VABBLE_DAO;
    address private STAKING_POOL;
    address private DAO_PROPERTY;
             
    bool public isInitialized;         // check if contract initialized or not

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
    modifier onlyStaker() {
        require(IStakingPool(STAKING_POOL).getStakeAmount(msg.sender) > 0, "Not staker");
        _;
    }

    constructor(address _ownable) {
        require(_ownable != address(0), "ownableContract: Zero address");
        OWNABLE = _ownable; 
    }

    /// @notice Initialize Vote
    function initializeVote(
        address _vabbleDAO,
        address _stakingPool,
        address _property
    ) external onlyAuditor {
        require(_vabbleDAO != address(0), "initializeVote: Zero vabbleDAO address");
        VABBLE_DAO = _vabbleDAO;        
        require(_stakingPool != address(0), "initializeVote: Zero stakingPool address");
        STAKING_POOL = _stakingPool;
        require(_property != address(0), "initializeVote: Zero property address");
        DAO_PROPERTY = _property;
           
        isInitialized = true;
    }        

    /// @notice Vote to multi films from a staker
    function voteToFilms(
        uint256[] memory _filmIds, 
        uint256[] memory _voteInfos
    ) external onlyStaker initialized nonReentrant {
        require(_filmIds.length > 0, "voteToFilm: zero length");
        require(_filmIds.length == _voteInfos.length, "voteToFilm: Bad item length");

        for(uint256 i = 0; i < _filmIds.length; i++) { 
            __voteToFilm(_filmIds[i], _voteInfos[i]);
        }        
    }

    function __voteToFilm(
        uint256 _filmId, 
        uint256 _voteInfo
    ) private {
        require(msg.sender != IVabbleDAO(VABBLE_DAO).getFilmOwner(_filmId), "filmVote: film owner");
        require(!isAttendToFilmVote[msg.sender][_filmId], "_voteToFilm: Already voted");    

        Helper.Status status = IVabbleDAO(VABBLE_DAO).getFilmStatus(_filmId);
        require(status == Helper.Status.UPDATED, "Not updated");        

        (uint256 pCreateTime, ) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId);
        require(pCreateTime > 0, "not updated");
        require(__isVotePeriod(IProperty(DAO_PROPERTY).filmVotePeriod(), pCreateTime), "film elapsed vote period");
        
        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);
        (, , uint256 fundType) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);
        if(fundType > 0) { // in case of fund film
            // If film is for funding and voter is film board member, more weight(30%) per vote
            if(IProperty(DAO_PROPERTY).isBoardWhitelist(msg.sender) == 2) {
                stakeAmount *= (IProperty(DAO_PROPERTY).boardVoteWeight() + 1e10) / 1e10; // (30+100)/100=1.3
            }
            //For extra reward in funding film case
            fundingFilmIdsPerUser[msg.sender].push(_filmId);
            fundingIdsVoteStatusPerUser[msg.sender][_filmId] = _voteInfo;
        }

        Voting storage fv = filmVoting[_filmId];
        fv.voteCount++;

        if(_voteInfo == 1) {
            fv.stakeAmount_1 += stakeAmount;   // Yes
        } else if(_voteInfo == 2) {
            fv.stakeAmount_2 += stakeAmount;   // No
        } else {
            fv.stakeAmount_3 += stakeAmount;   // Abstain
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
        if(withdrawableTime > block.timestamp) {
            IStakingPool(STAKING_POOL).updateVoteCount(msg.sender);
        }
        
        emit VotedToFilm(msg.sender, _filmId, _voteInfo, block.timestamp);
    }

    /// @notice Approve multi films that votePeriod has elapsed after votePeriod(10 days) by anyone
    // if isFund is true then "APPROVED_FUNDING", if isFund is false then "APPROVED_LISTING"
    function approveFilms(uint256[] memory _filmIds) external onlyStaker nonReentrant {
        require(_filmIds.length > 0, "approveFilms: Invalid items");

        for(uint256 i = 0; i < _filmIds.length; i++) {
            __approveFilm(_filmIds[i]);
        }   
    }

    function __approveFilm(uint256 _filmId) private {
        Voting storage fv = filmVoting[_filmId];
        
        // Example: stakeAmount of "YES" is 2000 and stakeAmount("NO") is 1000, stakeAmount("ABSTAIN") is 500 in 10 days(votePeriod)
        // In this case, Approved since 2000 > 1000 + 500 (it means ">50%") and stakeAmount of "YES" > 75m          
        (uint256 pCreateTime, uint256 pApproveTime) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId);
        require(!__isVotePeriod(IProperty(DAO_PROPERTY).filmVotePeriod(), pCreateTime), "approveFilms: vote period yet");
        require(pApproveTime == 0, "film already approved");
        
        (, , uint256 fundType) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);
        uint256 reason = 0;
        if(
            fv.voteCount >= IStakingPool(STAKING_POOL).getLimitCount() &&
            fv.stakeAmount_1 > fv.stakeAmount_2 + fv.stakeAmount_3
        ) {
            reason = 0;
        } else if(fv.voteCount < IStakingPool(STAKING_POOL).getLimitCount()) {
            reason = 1;
        } else if(fv.stakeAmount_1 <= fv.stakeAmount_2 + fv.stakeAmount_3) {
            reason = 2;
        }     

        IVabbleDAO(VABBLE_DAO).approveFilmByVote(_filmId, reason);

        emit FilmApproved(_filmId, fundType, block.timestamp, reason);
    }

    /// @notice Stakers vote(1,2,3 => Yes, No, Abstain) to agent for replacing Auditor    
    function voteToAgent(
        address _agent, 
        uint256 _voteInfo, 
        uint256 _flag     //  flag=1 => dispute vote
    ) external onlyStaker initialized nonReentrant {       
        require(!isAttendToAgentVote[msg.sender][_agent], "voteToAgent: Already voted");
        require(msg.sender != _agent, "voteToAgent: self voted");
        
        (uint256 pCreateTime, ) = IProperty(DAO_PROPERTY).getGovProposalTime(_agent, 1);
        require(pCreateTime > 0, "voteToAgent: no proposal");

        AgentVoting storage av = agentVoting[_agent];

        if(_flag == 1) {
            require(_voteInfo == 2, "voteToAgent: invalid vote value");
            require(av.voteCount > 0, "voteToAgent: no voter");          
            require(!__isVotePeriod(IProperty(DAO_PROPERTY).agentVotePeriod(), pCreateTime), "agent vote period yet");  

            if(av.disputeVABAmount == 0) {
                av.disputeStartTime = block.timestamp;
                govPassedVoteCount[2] += 1;
            } else {
                require(__isVotePeriod(IProperty(DAO_PROPERTY).disputeGracePeriod(), av.disputeStartTime), "agent elapsed grace period");            
            }
        } else {
            require(__isVotePeriod(IProperty(DAO_PROPERTY).agentVotePeriod(), pCreateTime), "agent elapsed vote period");               
        }

        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);
        if(_voteInfo == 1) {
            av.stakeAmount_1 += stakeAmount;
        } else if(_voteInfo == 2) {
            if(_flag == 1) av.disputeVABAmount += stakeAmount;
            else av.stakeAmount_2 += stakeAmount;
        } else {
            av.stakeAmount_3 += stakeAmount;
        }
        
        if(_flag != 1) {
            av.voteCount++;        
        }
        userGovernVoteCount[msg.sender] += 1;

        isAttendToAgentVote[msg.sender][_agent] = true;

        // for removing board member if he don't vote for some period
        lastVoteTime[msg.sender] = block.timestamp;
        // 1++ for calculating the rewards
        if(IStakingPool(STAKING_POOL).getWithdrawableTime(msg.sender) > block.timestamp) {
            IStakingPool(STAKING_POOL).updateVoteCount(msg.sender);
        }

        emit VotedToAgent(msg.sender, _agent, _voteInfo, block.timestamp);
    }

    /// @notice Replace Auditor based on vote result
    function replaceAuditor(address _agent) external onlyStaker nonReentrant {
        require(_agent != address(0) && IOwnablee(OWNABLE).auditor() != _agent, "replaceAuditor: invalid index or no proposal");
        
        (uint256 pCreateTime, uint256 pApproveTime) = IProperty(DAO_PROPERTY).getGovProposalTime(_agent, 1);
        require(!__isVotePeriod(IProperty(DAO_PROPERTY).agentVotePeriod(), pCreateTime), "auditor vote period yet"); 
        require(pApproveTime == 0, "auditor already approved"); 
        
        AgentVoting storage av = agentVoting[_agent];
        uint256 disputeTime = av.disputeStartTime;
        if(disputeTime > 0) {
            require(!__isVotePeriod(IProperty(DAO_PROPERTY).disputeGracePeriod(), disputeTime), "auditor grace period yet");            
        } else {
            require(
                !__isVotePeriod(IProperty(DAO_PROPERTY).agentVotePeriod() + IProperty(DAO_PROPERTY).disputeGracePeriod(), pCreateTime), 
                "auditor dispute vote period yet"
            );
        }

        uint256 reason = 0;
        // must be over 51%, staking amount must be over 75m, dispute staking amount must be less than 150m
        if(
            av.voteCount >= IStakingPool(STAKING_POOL).getLimitCount() &&
            av.stakeAmount_1 > av.stakeAmount_2 + av.stakeAmount_3 &&
            av.stakeAmount_1 > IProperty(DAO_PROPERTY).availableVABAmount() &&
            av.disputeVABAmount < 2 * IProperty(DAO_PROPERTY).availableVABAmount()
        ) {
            IOwnablee(OWNABLE).replaceAuditor(_agent);
            IProperty(DAO_PROPERTY).updateGovProposalApproveTime(_agent, 1, 1);
            govPassedVoteCount[1] += 1;
        } else {
            IProperty(DAO_PROPERTY).updateGovProposalApproveTime(_agent, 1, 0);

            if(av.voteCount < IStakingPool(STAKING_POOL).getLimitCount()) {
                reason = 1;
            } else if(av.stakeAmount_1 <= av.stakeAmount_2 + av.stakeAmount_3) {
                reason = 2;
            } else if(av.stakeAmount_1 <= IProperty(DAO_PROPERTY).availableVABAmount()) {
                reason = 3;
            } else if(av.disputeVABAmount >= 2 * IProperty(DAO_PROPERTY).availableVABAmount()) {
                reason = 4;
            }
        }
        emit AuditorReplaced(_agent, msg.sender, block.timestamp, reason);
    }
    
    function voteToFilmBoard(
        address _candidate, 
        uint256 _voteInfo
    ) external onlyStaker initialized nonReentrant {
        require(IProperty(DAO_PROPERTY).isBoardWhitelist(_candidate) == 1, "voteToFilmBoard: Not candidate");
        require(!isAttendToBoardVote[msg.sender][_candidate], "voteToFilmBoard: Already voted");   
        require(msg.sender != _candidate, "voteToFilmBoard: self voted");   

        (uint256 pCreateTime, ) = IProperty(DAO_PROPERTY).getGovProposalTime(_candidate, 2);
        require(pCreateTime > 0, "voteToFilmBoard: no proposal");
        require(__isVotePeriod(IProperty(DAO_PROPERTY).boardVotePeriod(), pCreateTime), "filmBoard elapsed vote period");
        
        Voting storage fbp = filmBoardVoting[_candidate];     
        fbp.voteCount++;

        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);
        if(_voteInfo == 1) {
            fbp.stakeAmount_1 += stakeAmount; // Yes
        } else if(_voteInfo == 2) {
            fbp.stakeAmount_2 += stakeAmount; // No
        } else {
            fbp.stakeAmount_3 += stakeAmount; // Abstain
        }

        userGovernVoteCount[msg.sender] += 1;

        isAttendToBoardVote[msg.sender][_candidate] = true;

        // for removing board member if he don't vote for some period
        lastVoteTime[msg.sender] = block.timestamp;
        // 1++ for calculating the rewards
        if(IStakingPool(STAKING_POOL).getWithdrawableTime(msg.sender) > block.timestamp) {
            IStakingPool(STAKING_POOL).updateVoteCount(msg.sender);
        }

        emit VotedToFilmBoard(msg.sender, _candidate, _voteInfo, block.timestamp);
    }
    
    function addFilmBoard(address _member) external onlyStaker nonReentrant {
        require(IProperty(DAO_PROPERTY).isBoardWhitelist(_member) == 1, "addFilmBoard: Not candidate");

        (uint256 pCreateTime, uint256 pApproveTime) = IProperty(DAO_PROPERTY).getGovProposalTime(_member, 2);
        require(!__isVotePeriod(IProperty(DAO_PROPERTY).boardVotePeriod(), pCreateTime), "filmBoard vote period yet");
        require(pApproveTime == 0, "filmBoard already approved");

        uint256 reason = 0;
        Voting storage fbp = filmBoardVoting[_member];
        if(
            fbp.voteCount >= IStakingPool(STAKING_POOL).getLimitCount() &&
            fbp.stakeAmount_1 > fbp.stakeAmount_2 + fbp.stakeAmount_3 &&
            fbp.stakeAmount_1 > IProperty(DAO_PROPERTY).availableVABAmount()
        ) {
            IProperty(DAO_PROPERTY).addFilmBoardMember(_member);   
            IProperty(DAO_PROPERTY).updateGovProposalApproveTime(_member, 2, 1);
            govPassedVoteCount[3] += 1;
        } else {
            IProperty(DAO_PROPERTY).updateGovProposalApproveTime(_member, 2, 0);

            if(fbp.voteCount < IStakingPool(STAKING_POOL).getLimitCount()) {
                reason = 1;
            } else if(fbp.stakeAmount_1 <= fbp.stakeAmount_2 + fbp.stakeAmount_3) {
                reason = 2;
            } else if(fbp.stakeAmount_1 <= IProperty(DAO_PROPERTY).availableVABAmount()) {
                reason = 3;
            }
        }        
        emit FilmBoardAdded(_member, msg.sender, block.timestamp, reason);
    }

    ///@notice Stakers vote to proposal for setup the address to reward DAO fund
    function voteToRewardAddress(address _rewardAddress, uint256 _voteInfo) external onlyStaker initialized nonReentrant {
        require(IProperty(DAO_PROPERTY).isRewardWhitelist(_rewardAddress) == 1, "voteToRewardAddress: Not candidate");
        require(!isAttendToRewardAddressVote[msg.sender][_rewardAddress], "voteToRewardAddress: Already voted");     
        require(msg.sender != _rewardAddress, "voteToRewardAddress: self voted");       

        (uint256 pCreateTime, ) = IProperty(DAO_PROPERTY).getGovProposalTime(_rewardAddress, 3);
        require(pCreateTime > 0, "voteToRewardAddress: no proposal");
        require(__isVotePeriod(IProperty(DAO_PROPERTY).rewardVotePeriod(), pCreateTime), "reward elapsed vote period");
        
        Voting storage rav = rewardAddressVoting[_rewardAddress];
        rav.voteCount++;

        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);
        if(_voteInfo == 1) {
            rav.stakeAmount_1 += stakeAmount;   // Yes
        } else if(_voteInfo == 2) {
            rav.stakeAmount_2 += stakeAmount;   // No
        } else {
            rav.stakeAmount_3 += stakeAmount;   // Abstain
        }

        userGovernVoteCount[msg.sender] += 1;

        isAttendToRewardAddressVote[msg.sender][_rewardAddress] = true;

        // for removing board member if he don't vote for some period
        lastVoteTime[msg.sender] = block.timestamp;
        // 1++ for calculating the rewards
        if(IStakingPool(STAKING_POOL).getWithdrawableTime(msg.sender) > block.timestamp) {
            IStakingPool(STAKING_POOL).updateVoteCount(msg.sender);
        }

        emit VotedToPoolAddress(msg.sender, _rewardAddress, _voteInfo, block.timestamp);
    }

    function setDAORewardAddress(address _rewardAddress) external onlyStaker nonReentrant {
        require(IProperty(DAO_PROPERTY).isRewardWhitelist(_rewardAddress) == 1, "setRewardAddress: Not candidate");

        (uint256 pCreateTime, uint256 pApproveTime) = IProperty(DAO_PROPERTY).getGovProposalTime(_rewardAddress, 3);
        require(!__isVotePeriod(IProperty(DAO_PROPERTY).rewardVotePeriod(), pCreateTime), "reward vote period yet");
        require(pApproveTime == 0, "pool address already approved");
        
        uint256 reason = 0;
        Voting storage rav = rewardAddressVoting[_rewardAddress];
        if(
            rav.voteCount >= IStakingPool(STAKING_POOL).getLimitCount() &&    // Less than limit count
            rav.stakeAmount_1 > rav.stakeAmount_2 + rav.stakeAmount_3 &&      // less 51%
            rav.stakeAmount_1 > IProperty(DAO_PROPERTY).availableVABAmount()  // less than permit amount
        ) {
            IProperty(DAO_PROPERTY).setRewardAddress(_rewardAddress);
            IProperty(DAO_PROPERTY).updateGovProposalApproveTime(_rewardAddress, 3, 1);
            govPassedVoteCount[4] += 1;
        } else {
            IProperty(DAO_PROPERTY).updateGovProposalApproveTime(_rewardAddress, 3, 0);

            if(rav.voteCount < IStakingPool(STAKING_POOL).getLimitCount()) {
                reason = 1;
            } else if(rav.stakeAmount_1 <= rav.stakeAmount_2 + rav.stakeAmount_3) {
                reason = 2;
            } else if(rav.stakeAmount_1 <= IProperty(DAO_PROPERTY).availableVABAmount()) {
                reason = 3;
            }
        }        
        emit PoolAddressAdded(_rewardAddress, msg.sender, block.timestamp, reason);
    }

    /// @notice Stakers vote(1,2,3 => Yes, No, Abstain) to proposal for updating properties(filmVotePeriod, rewardRate, ...)
    function voteToProperty(
        uint256 _voteInfo, 
        uint256 _propertyIndex, 
        uint256 _flag
    ) external onlyStaker initialized nonReentrant {
        uint256 propertyVal = IProperty(DAO_PROPERTY).getProperty(_propertyIndex, _flag);
        require(propertyVal > 0, "voteToProperty: no proposal");
        require(!isAttendToPropertyVote[_flag][msg.sender][propertyVal], "voteToProperty: Already voted");
        
        (uint256 pCreateTime, ) = IProperty(DAO_PROPERTY).getPropertyProposalTime(propertyVal, _flag);
        require(pCreateTime > 0, "voteToProperty: no proposal");
        require(__isVotePeriod(IProperty(DAO_PROPERTY).propertyVotePeriod(), pCreateTime), "property elapsed vote period");

        Voting storage pv = propertyVoting[_flag][propertyVal];
        pv.voteCount++;

        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);
        if(_voteInfo == 1) {
            pv.stakeAmount_1 += stakeAmount;
        } else if(_voteInfo == 2) {
            pv.stakeAmount_2 += stakeAmount;
        } else {
            pv.stakeAmount_3 += stakeAmount;
        }
        
        userGovernVoteCount[msg.sender] += 1;

        isAttendToPropertyVote[_flag][msg.sender][propertyVal] = true;
        
        // for removing board member if he don't vote for some period
        lastVoteTime[msg.sender] = block.timestamp;
        // 1++ for calculating the rewards
        if(IStakingPool(STAKING_POOL).getWithdrawableTime(msg.sender) > block.timestamp) {
            IStakingPool(STAKING_POOL).updateVoteCount(msg.sender);
        }

        emit VotedToProperty(msg.sender, _flag, propertyVal, _voteInfo, block.timestamp);
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
        Voting storage pv = propertyVoting[_flag][propertyVal];
        if(
            pv.voteCount >= IStakingPool(STAKING_POOL).getLimitCount() && 
            pv.stakeAmount_1 > pv.stakeAmount_2 + pv.stakeAmount_3 &&
            pv.stakeAmount_1 > IProperty(DAO_PROPERTY).availableVABAmount()
        ) {
            IProperty(DAO_PROPERTY).updateProperty(_propertyIndex, _flag);    
            IProperty(DAO_PROPERTY).updatePropertyProposalApproveTime(propertyVal, _flag, 1);
            govPassedVoteCount[5] += 1;              
        } else {
            IProperty(DAO_PROPERTY).updatePropertyProposalApproveTime(propertyVal, _flag, 0);

            if(pv.voteCount < IStakingPool(STAKING_POOL).getLimitCount()) {
                reason = 1;
            } else if(pv.stakeAmount_1 <= pv.stakeAmount_2 + pv.stakeAmount_3) {
                reason = 2;
            } else if(pv.stakeAmount_1 <= IProperty(DAO_PROPERTY).availableVABAmount()) {
                reason = 3;
            }
        }
        emit PropertyUpdated(_flag, propertyVal, msg.sender, block.timestamp, reason);
    }

    function __isVotePeriod(
        uint256 _period, 
        uint256 _startTime
    ) private view returns (bool) {
        if(_period >= block.timestamp - _startTime) return true;
        else return false;
    }
    /// @notice Get funding filmId voteStatus per User
    function getFundingIdVoteStatusPerUser(
        address _staker, 
        uint256 _filmId
    ) external view returns(uint256) {
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

    /// @notice Update last vote time for removing filmboard member
    function getLastVoteTime(address _member) external view returns (uint256 time_) {
        time_ = lastVoteTime[_member];
    }
}