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
        uint256 stakeAmount_1;    // staking amount of voter with status(yes)
        uint256 stakeAmount_2;    // staking amount of voter with status(no)
        uint256 stakeAmount_3;    // staking amount of voter with status(abstain)
        uint256 voteCount;        // number of accumulated votes
        uint256 voteStartTime;    // vote start time for an agent
        uint256 disputeStartTime; // dispute vote start time for an agent
        uint256 disputeVABAmount; // VAB voted dispute
    }

    address private immutable OWNABLE;     // Ownablee contract address
    address private VABBLE_DAO;
    address private STAKING_POOL;
    address private DAO_PROPERTY;
             
    uint256[] private approvedFilmIds; // approved film ID list    
    uint256[] private voteStartTimeList;

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

    constructor(address _ownableContract) {
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

    /// @notice Vote to multi films from a staker
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

        Voting storage fv = filmVoting[_filmId];
        if(fv.voteCount == 0) {
            fv.voteStartTime = block.timestamp;
            voteStartTimeList.push(block.timestamp);
        } else {
            require(IProperty(DAO_PROPERTY).filmVotePeriod() >= block.timestamp - fv.voteStartTime);
        }
        
        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);
        if(IVabbleDAO(VABBLE_DAO).isForFund(_filmId)) {
            // If film is for funding and voter is film board member, more weight(30%) per vote
            if(IProperty(DAO_PROPERTY).isBoardWhitelist(msg.sender) == 2) {
                stakeAmount *= (IProperty(DAO_PROPERTY).boardVoteWeight() + 1e10) / 1e10; // (30+100)/100=1.3
            }
            //For extra reward in funding film case
            fundingFilmIdsPerUser[msg.sender].push(_filmId);
            fundingIdsVoteStatusPerUser[msg.sender][_filmId] = _voteInfo;
        }

        if(_voteInfo == 1) {
            fv.stakeAmount_1 += stakeAmount;   // Yes
        } else if(_voteInfo == 2) {
            fv.stakeAmount_2 += stakeAmount;   // No
        } else {
            fv.stakeAmount_3 += stakeAmount;   // Abstain
        }

        fv.voteCount++;

        isAttendToFilmVote[msg.sender][_filmId] = true;
        
        IProperty(DAO_PROPERTY).updateLastVoteTime(msg.sender);

        // Example: withdrawTime is 6/15 and voteStartTime is 6/10, votePeriod is 10 days
        // In this case, we update the withdrawTime to sum(6/20) of voteStartTime and votePeriod
        // so, staker cannot unstake his amount till 6/20
        uint256 withdrawableTime =  IStakingPool(STAKING_POOL).getWithdrawableTime(msg.sender);
        if (fv.voteStartTime + IProperty(DAO_PROPERTY).filmVotePeriod() > withdrawableTime) {
            IStakingPool(STAKING_POOL).updateWithdrawableTime(msg.sender, fv.voteStartTime + IProperty(DAO_PROPERTY).filmVotePeriod());
        }
        // 1++ for calculating the rewards
        if(withdrawableTime > block.timestamp) {
            IStakingPool(STAKING_POOL).updateVoteCount(msg.sender);
        }

        return true;
    }

    /// @notice Approve multi films that votePeriod has elapsed after votePeriod(10 days) by auditor
    // if isFund is true then "APPROVED_FUNDING", if isFund is false then "APPROVED_LISTING"
    function approveFilms(uint256[] memory _filmIds) external onlyAuditor {
        Voting storage fv;
        for(uint256 i = 0; i < _filmIds.length; i++) {
            fv = filmVoting[_filmIds[i]];
            // Example: stakeAmount of "YES" is 2000 and stakeAmount("NO") is 1000, stakeAmount("ABSTAIN") is 500 in 10 days(votePeriod)
            // In this case, Approved since 2000 > 1000 + 500 (it means ">50%") and stakeAmount of "YES" > 75m          
            if(fv.voteCount < IStakingPool(STAKING_POOL).getLimitCount()) continue;

            if(block.timestamp - fv.voteStartTime > IProperty(DAO_PROPERTY).filmVotePeriod()) {
                if(
                    fv.stakeAmount_1 > fv.stakeAmount_2 + fv.stakeAmount_3 &&
                    fv.stakeAmount_1 > IProperty(DAO_PROPERTY).availableVABAmount()
                ) {                    
                    bool isFund = IVabbleDAO(VABBLE_DAO).isForFund(_filmIds[i]);
                    IVabbleDAO(VABBLE_DAO).approveFilm(_filmIds[i], isFund);
                    approvedFilmIds.push(_filmIds[i]);
                }
                // format Vote info after pass the vote period
                delete filmVoting[_filmIds[i]];
            }        
        }        
        emit FilmIdsApproved(_filmIds, approvedFilmIds, msg.sender);
    }

    /// @notice Stakers vote(1,2,3 => Yes, No, Abstain) to agent for replacing Auditor
    //  flag=1 => dispute vote
    function voteToAgent(uint256 _voteInfo, uint256 _agentIndex, uint256 _flag) public onlyStaker nonReentrant {              
        address agent = IProperty(DAO_PROPERTY).getAgent(_agentIndex);       
        require(agent != address(0) && IOwnablee(OWNABLE).auditor() != agent, "voteToAgent: invalid index or no proposal"); 
        require(!isAttendToAgentVote[msg.sender][agent], "voteToAgent: Already voted");
        
        AgentVoting storage av = agentVoting[agent];
        uint256 startTime = av.voteStartTime;
        
        if(_flag == 1) {
            require(_voteInfo == 2, "voteToAgent: invalid vote value");
            require(av.voteCount > 0, "voteToAgent: no voter");
            require(IProperty(DAO_PROPERTY).agentVotePeriod() < block.timestamp - startTime, "voteToAgent: vote period yet");            
            require(IOwnablee(OWNABLE).auditor() != agent, "voteToAgent: Already replaced");

            uint256 disputeTime = av.disputeStartTime;
            if(av.disputeVABAmount == 0) {
                disputeTime = block.timestamp;
            } else {
                require(IProperty(DAO_PROPERTY).disputeGracePeriod() >= block.timestamp - disputeTime, "voteToAgent: grace period passed");            
            }
        } else {
            if(av.voteCount == 0) {
                av.voteStartTime = block.timestamp; 
                voteStartTimeList.push(block.timestamp);
            } else {
                require(IProperty(DAO_PROPERTY).agentVotePeriod() >= block.timestamp - startTime, "voteToAgent: vote period passed");               
            }
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

        if(_flag != 1) av.voteCount++;

        isAttendToAgentVote[msg.sender][agent] = true;
        
        IProperty(DAO_PROPERTY).updateLastVoteTime(msg.sender);
        // 1++ for calculating the rewards
        if(IStakingPool(STAKING_POOL).getWithdrawableTime(msg.sender) > block.timestamp) {
            IStakingPool(STAKING_POOL).updateVoteCount(msg.sender);
        }
        emit VotedToAgent(msg.sender, agent, _voteInfo);
    }

    /// @notice Replace Auditor based on vote result
    function replaceAuditor(uint256 _agentIndex) external onlyStaker nonReentrant {
        address agent = IProperty(DAO_PROPERTY).getAgent(_agentIndex);
        require(agent != address(0) && IOwnablee(OWNABLE).auditor() != agent, "replaceAuditor: invalid index or no proposal");

        AgentVoting storage av = agentVoting[agent];
        uint256 startTime = av.voteStartTime;
        uint256 disputeTime = av.disputeStartTime;
        require(av.voteCount >= IStakingPool(STAKING_POOL).getLimitCount(), "replaceAuditor: Less than limit count"); 
        require(IProperty(DAO_PROPERTY).agentVotePeriod() < block.timestamp - startTime, "replaceAuditor: vote period yet"); 
        if(disputeTime > 0) {
            require(IProperty(DAO_PROPERTY).disputeGracePeriod() < block.timestamp - disputeTime, "replaceAuditor: grace period yet");            
        } else {
            require(
                IProperty(DAO_PROPERTY).agentVotePeriod() + IProperty(DAO_PROPERTY).disputeGracePeriod() < block.timestamp - startTime, 
                "replaceAuditor: dispute vote period yet"
            );
        }
        // must be over 51%, staking amount must be over 75m, dispute staking amount must be less than 150m
        if(
            av.stakeAmount_1 > av.stakeAmount_2 + av.stakeAmount_3 && 
            av.stakeAmount_1 > IProperty(DAO_PROPERTY).availableVABAmount() &&
            av.disputeVABAmount < 2 * IProperty(DAO_PROPERTY).availableVABAmount()
        ) {
            IOwnablee(OWNABLE).replaceAuditor(agent);
            emit AuditorReplaced(agent);
        }
        // format Vote info after pass the vote period
        delete agentVoting[agent];
        IProperty(DAO_PROPERTY).removeAgent(_agentIndex);
    }
    
    function voteToFilmBoard(address _candidate, uint256 _voteInfo) public onlyStaker nonReentrant {
        require(IProperty(DAO_PROPERTY).isBoardWhitelist(_candidate) == 1, "voteToFilmBoard: Not candidate");
        require(!isAttendToBoardVote[msg.sender][_candidate], "voteToFilmBoard: Already voted");   

        Voting storage fbp = filmBoardVoting[_candidate];     
        if(fbp.voteCount == 0) {
            fbp.voteStartTime = block.timestamp;
            voteStartTimeList.push(block.timestamp);
        } else {            
            require(IProperty(DAO_PROPERTY).boardVotePeriod() >= block.timestamp - fbp.voteStartTime, "voteToFilmBoard: vote period passed");
        }
        
        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);
        if(_voteInfo == 1) {
            fbp.stakeAmount_1 += stakeAmount; // Yes
        } else if(_voteInfo == 2) {
            fbp.stakeAmount_2 += stakeAmount; // No
        } else {
            fbp.stakeAmount_3 += stakeAmount; // Abstain
        }

        fbp.voteCount++;

        isAttendToBoardVote[msg.sender][_candidate] = true;

        IProperty(DAO_PROPERTY).updateLastVoteTime(msg.sender);
        // 1++ for calculating the rewards
        if(IStakingPool(STAKING_POOL).getWithdrawableTime(msg.sender) > block.timestamp) {
            IStakingPool(STAKING_POOL).updateVoteCount(msg.sender);
        }
    }
    
    function addFilmBoard(address _member) external onlyStaker nonReentrant {
        require(IProperty(DAO_PROPERTY).isBoardWhitelist(_member) == 1, "addFilmBoard: Not candidate");

        Voting storage fbp = filmBoardVoting[_member];
        require(IProperty(DAO_PROPERTY).boardVotePeriod() < block.timestamp - fbp.voteStartTime, "addFilmBoard: vote period yet");
        require(fbp.voteCount >= IStakingPool(STAKING_POOL).getLimitCount(), "addFilmBoard: Less than limit count");

        if(
            fbp.stakeAmount_1 > fbp.stakeAmount_2 + fbp.stakeAmount_3 && 
            fbp.stakeAmount_1 > IProperty(DAO_PROPERTY).availableVABAmount()
        ) { 
            IProperty(DAO_PROPERTY).addFilmBoardMember(_member);
        }         
        // format Vote info after pass the vote period
        delete filmBoardVoting[_member];
    }

    ///@notice Stakers vote to proposal for setup the address to reward DAO fund
    function voteToRewardAddress(address _rewardAddress, uint256 _voteInfo) public onlyStaker nonReentrant {
        require(IProperty(DAO_PROPERTY).isRewardWhitelist(_rewardAddress) == 1, "voteToRewardAddress: Not candidate");
        require(!isAttendToRewardAddressVote[msg.sender][_rewardAddress], "voteToRewardAddress: Already voted");        

        Voting storage rav = rewardAddressVoting[_rewardAddress];
        if(rav.voteCount == 0) {
            rav.voteStartTime = block.timestamp;
            voteStartTimeList.push(block.timestamp);
        } else {
            require(IProperty(DAO_PROPERTY).rewardVotePeriod() >= block.timestamp - rav.voteStartTime, "voteToRewardAddress: vote period yet");
        }
        
        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);
        if(_voteInfo == 1) {
            rav.stakeAmount_1 += stakeAmount;   // Yes
        } else if(_voteInfo == 2) {
            rav.stakeAmount_2 += stakeAmount;   // No
        } else {
            rav.stakeAmount_3 += stakeAmount;   // Abstain
        }

        rav.voteCount++;

        isAttendToRewardAddressVote[msg.sender][_rewardAddress] = true;

        IProperty(DAO_PROPERTY).updateLastVoteTime(msg.sender);
        // 1++ for calculating the rewards
        if(IStakingPool(STAKING_POOL).getWithdrawableTime(msg.sender) > block.timestamp) {
            IStakingPool(STAKING_POOL).updateVoteCount(msg.sender);
        }
        emit VotedToRewardAddress(msg.sender, _rewardAddress, _voteInfo);
    }

    function setDAORewardAddress(address _rewardAddress) external onlyStaker nonReentrant {
        require(IProperty(DAO_PROPERTY).isRewardWhitelist(_rewardAddress) == 1, "setRewardAddress: Not candidate");

        Voting storage rav = rewardAddressVoting[_rewardAddress];
        require(block.timestamp - rav.voteStartTime > IProperty(DAO_PROPERTY).rewardVotePeriod(), "setRewardAddress: vote period yet");
        require(rav.voteCount >= IStakingPool(STAKING_POOL).getLimitCount(), "addRewardAddress: Less than limit count");

        if(
            rav.stakeAmount_1 > rav.stakeAmount_2 + rav.stakeAmount_3 && 
            rav.stakeAmount_1 > IProperty(DAO_PROPERTY).availableVABAmount()
        ) { 
            IProperty(DAO_PROPERTY).setRewardAddress(_rewardAddress);
        }     
        // format Vote info after pass the vote period
        delete rewardAddressVoting[_rewardAddress];    
    }

    /// @notice Stakers vote(1,2,3 => Yes, No, Abstain) to proposal for updating properties(filmVotePeriod, rewardRate, ...)
    function voteToProperty(uint256 _voteInfo, uint256 _propertyIndex, uint256 _flag) public onlyStaker nonReentrant {
        uint256 propertyVal = IProperty(DAO_PROPERTY).getProperty(_propertyIndex, _flag);
        require(propertyVal > 0, "voteToProperty: no proposal");
        require(!isAttendToPropertyVote[_flag][msg.sender][propertyVal], "voteToProperty: Already voted");

        Voting storage pv = propertyVoting[_flag][propertyVal];
        if(pv.voteCount == 0) {
            pv.voteStartTime = block.timestamp;     
            voteStartTimeList.push(block.timestamp);
        } else {
            require(IProperty(DAO_PROPERTY).propertyVotePeriod() >= block.timestamp - pv.voteStartTime, "voteToProperty: vote period yet");
        }

        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);
        if(_voteInfo == 1) {
            pv.stakeAmount_1 += stakeAmount;
        } else if(_voteInfo == 2) {
            pv.stakeAmount_2 += stakeAmount;
        } else {
            pv.stakeAmount_3 += stakeAmount;
        }

        pv.voteCount++;

        isAttendToPropertyVote[_flag][msg.sender][propertyVal] = true;
        
        IProperty(DAO_PROPERTY).updateLastVoteTime(msg.sender);
        // 1++ for calculating the rewards
        if(IStakingPool(STAKING_POOL).getWithdrawableTime(msg.sender) > block.timestamp) {
            IStakingPool(STAKING_POOL).updateVoteCount(msg.sender);
        }
        emit VotedToProperty(msg.sender, _flag, propertyVal, _voteInfo);
    }

    /// @notice Update properties based on vote result(>=51% and stakeAmount of "Yes" > 75m)
    function updateProperty(uint256 _propertyIndex, uint256 _flag) external onlyStaker nonReentrant {
        uint256 propertyVal = IProperty(DAO_PROPERTY).getProperty(_propertyIndex, _flag);
        Voting storage pv = propertyVoting[_flag][propertyVal];
        uint256 startTime = pv.voteStartTime;

        require(pv.voteCount >= IStakingPool(STAKING_POOL).getLimitCount(), "updateProperty: Less than limit count");
        require(IProperty(DAO_PROPERTY).propertyVotePeriod() < block.timestamp - startTime, "updateProperty: vote period yet");
        
        if(
            pv.stakeAmount_1 > pv.stakeAmount_2 + pv.stakeAmount_3 && 
            pv.stakeAmount_1 > IProperty(DAO_PROPERTY).availableVABAmount()
        ) {
            console.log("sol=>updateProperty", _propertyIndex, _flag);
            IProperty(DAO_PROPERTY).updateProperty(_propertyIndex, _flag);      
        }
        // format Vote info after pass the vote period
        delete propertyVoting[_flag][propertyVal];  
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

    /// @notice Get VotingStartList
    function getVoteStartTimeList() external view returns(uint256[] memory) {
        return voteStartTimeList;
    }
}