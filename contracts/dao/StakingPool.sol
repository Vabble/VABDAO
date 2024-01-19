// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../libraries/Helper.sol";
import "../interfaces/IVabbleDAO.sol";
import "../interfaces/IProperty.sol";
import "../interfaces/IOwnablee.sol";

contract StakingPool is ReentrancyGuard {
    
    using Counters for Counters.Counter;

    event TokenStaked(address indexed staker, uint256 stakeAmount, uint256 stakeTime);
    event TokenUnstaked(address indexed unstaker, uint256 unStakeAmount);
    event RewardWithdraw(address indexed staker, uint256 rewardAmount);
    event RewardContinued(address indexed staker, uint256 isCompound);
    event AllFundWithdraw(address to, uint256 amount);
    event RewardAdded(uint256 totalRewardAmount, uint256 rewardAmount, address contributor);
    event VABDeposited(address indexed customer, uint256 amount);
    event WithdrawPending(address indexed customer, uint256 amount);  
    event PendingWithdrawApproved(address[] customers, uint256[] withdrawAmounts);
    event PendingWithdrawDenied(address[] customers);

    struct Stake {
        uint256 stakeAmount;     // staking amount per staker
        uint256 withdrawableTime;// last staked time(here, means the time that staker withdrawable time)
        uint256 stakeTime;         
    }

    struct UserRent {
        uint256 vabAmount;       // current VAB amount in DAO
        uint256 withdrawAmount;  // pending withdraw amount for a customer
        bool pending;            // pending status for withdraw
    }

    address private immutable OWNABLE;     // Ownablee contract address
    address private VOTE;                  // Vote contract address
    address private VABBLE_DAO;            // VabbleDAO contract address
    // TODO - N2-3 updated(remove VABBLE_FUNDING)
    address private DAO_PROPERTY;          // Property contract address
        
    uint256 public totalStakingAmount;   
    uint256 public totalRewardAmount;    
    uint256 public totalRewardIssuedAmount;
    uint256 public lastfundProposalCreateTime; // funding proposal created time(block.timestamp)
    bool public isInitialized;                 // check if contract initialized or not
    uint256[] private proposalCreatedTimeList;                   // need for calculating rewards
    mapping(address => uint256[]) private proposalVotedTimeList; // need for calculating rewards
    
    mapping(address => Stake) public stakeInfo;
    mapping(address => uint256) public receivedRewardAmount; // (staker => received reward amount)
    mapping(address => UserRent) public userRentInfo;

    Counters.Counter public stakerCount;   // count of stakers is from No.1

    modifier onlyVote() {
        require(msg.sender == VOTE, "caller is not vote contract");
        _;
    }
    modifier onlyDAO() {
        require(msg.sender == VABBLE_DAO, "caller is not dao contract");
        _;
    }
    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "caller is not auditor");
        _;
    }    
    modifier onlyDeployer() {
        require(msg.sender == IOwnablee(OWNABLE).deployer(), "caller is not the deployer");
        _;
    }

    constructor(address _ownable) {
        require(_ownable != address(0), "ownableContract: Zero address");
        OWNABLE = _ownable;    
    }

    /// @notice Initialize Pool
    function initialize(
        address _vabbleDAO,
        address _property,
        address _vote
    ) external onlyDeployer {
        // TODO - N3-3 updated(add below line)
        // require(!isInitialized, "initializePool: already initialized");

        require(_vabbleDAO != address(0), "initializePool: Zero vabbleDAO address");
        VABBLE_DAO = _vabbleDAO; 
        require(_property != address(0), "initializePool: Zero propertyContract address");
        DAO_PROPERTY = _property;   
        require(_vote != address(0), "initializePool: Zero voteContract address");
        VOTE = _vote;                  

        isInitialized = true;
    }    

    /// @notice Add reward token(VAB)
    function addRewardToPool(uint256 _amount) external nonReentrant {
        require(_amount != 0, 'addRewardToPool: Zero amount');

        Helper.safeTransferFrom(IOwnablee(OWNABLE).PAYOUT_TOKEN(), msg.sender, address(this), _amount);
        totalRewardAmount = totalRewardAmount + _amount;

        emit RewardAdded(totalRewardAmount, _amount, msg.sender);
    }    
    
    /// @notice Staking VAB token by staker
    function stakeVAB(uint256 _amount) external nonReentrant {
        require(isInitialized, "stakeVAB: Should be initialized");
        require(_amount != 0, "stakeVAB: Zero amount");
        // TODO - N2 updated(remove msg.sender != address(0))

        uint256 minAmount = 10**IERC20Metadata(IOwnablee(OWNABLE).PAYOUT_TOKEN()).decimals() / 100;
        require(_amount > minAmount, "stakeVAB: less amount than 0.01");

        Helper.safeTransferFrom(IOwnablee(OWNABLE).PAYOUT_TOKEN(), msg.sender, address(this), _amount);

        Stake storage si = stakeInfo[msg.sender];
        if(si.stakeAmount == 0 && si.stakeTime == 0) {
            stakerCount.increment();
        }
        si.stakeAmount += _amount;
        si.stakeTime = block.timestamp;
        si.withdrawableTime = block.timestamp + IProperty(DAO_PROPERTY).lockPeriod();

        totalStakingAmount += _amount;

        emit TokenStaked(msg.sender, _amount, block.timestamp);
    }

    /// @dev Allows user to unstake tokens after the correct time period has elapsed
    function unstakeVAB(uint256 _amount) external nonReentrant {
        require(isInitialized, "unstakeVAB: Should be initialized");
        require(msg.sender != address(0), "unstakeVAB: Zero staker address");

        Stake storage si = stakeInfo[msg.sender];
        require(si.stakeAmount >= _amount, "unstakeVAB: Insufficient stake amount");
        require(block.timestamp > si.withdrawableTime, "unstakeVAB: lock period yet");

        // first, withdraw reward
        uint256 rewardAmount = calcRewardAmount(msg.sender);
        if(totalRewardAmount >= rewardAmount && rewardAmount != 0) {
            __withdrawReward(rewardAmount);
        }

        // Next, unstake
        Helper.safeTransfer(IOwnablee(OWNABLE).PAYOUT_TOKEN(), msg.sender, _amount);        

        si.stakeTime = block.timestamp;
        si.withdrawableTime = block.timestamp + IProperty(DAO_PROPERTY).lockPeriod();
        si.stakeAmount -= _amount;        
        totalStakingAmount -= _amount;

        if(si.stakeAmount == 0) {
            stakerCount.decrement();
            delete stakeInfo[msg.sender];
        } 

        emit TokenUnstaked(msg.sender, _amount);
    }

    /// @notice Withdraw reward.  isCompound=1 => compound reward, isCompound=0 => withdraw
    function withdrawReward(uint256 _isCompound) external nonReentrant {
        require(stakeInfo[msg.sender].stakeAmount != 0, "withdrawReward: Zero staking amount");
        require(block.timestamp > stakeInfo[msg.sender].withdrawableTime, "withdrawReward: lock period yet");
        
        uint256 rewardAmount = calcRewardAmount(msg.sender);
        if(_isCompound == 1) {
            Stake storage si = stakeInfo[msg.sender];
            si.stakeAmount = si.stakeAmount + rewardAmount;
            si.stakeTime = block.timestamp;
            si.withdrawableTime = block.timestamp + IProperty(DAO_PROPERTY).lockPeriod();

            emit RewardContinued(msg.sender, _isCompound);
        } else {
            require(rewardAmount != 0, "withdrawReward: zero reward amount");
            require(totalRewardAmount >= rewardAmount, "withdrawReward: Insufficient total reward amount");

            __withdrawReward(rewardAmount);
        }
    }

    /// @dev Transfer reward amount
    function __withdrawReward(uint256 _amount) private {
        Helper.safeTransfer(IOwnablee(OWNABLE).PAYOUT_TOKEN(), msg.sender, _amount);        
        totalRewardAmount -= _amount;
        receivedRewardAmount[msg.sender] += _amount;
        totalRewardIssuedAmount += _amount;

        stakeInfo[msg.sender].stakeTime = block.timestamp;
        stakeInfo[msg.sender].withdrawableTime = block.timestamp + IProperty(DAO_PROPERTY).lockPeriod();
        
        emit RewardWithdraw(msg.sender, _amount);
    }
    // TODO - PVE008 updated(calculate voteCount again)
    /// @notice Calculate reward amount without extra reward amount for listing film vote
    function calcRewardAmount(address _customer) public view returns (uint256 amount_) {
        Stake memory si = stakeInfo[_customer];
        require(si.stakeAmount != 0, "calcRewardAmount: Not staker");

        uint256 minAmount = 10**IERC20Metadata(IOwnablee(OWNABLE).PAYOUT_TOKEN()).decimals() / 100;
        require(si.stakeAmount > minAmount, "calcRewardAmount: less amount than 0.01");

        // Get proposal count started in withdrawable period of customer
        uint256 proposalCount = 0;     
        uint256 proposalCreatedTimeListLength = proposalCreatedTimeList.length;
        for(uint256 i = 0; i < proposalCreatedTimeListLength; ++i) { 
            if(proposalCreatedTimeList[i] > si.stakeTime && proposalCreatedTimeList[i] < si.withdrawableTime) {
                proposalCount += 1;
            }
        }

        // Get vote count started in withdrawable period of customer
        uint256 votedCount = 0;     
        uint256 proposalVotedTimeListLength = proposalVotedTimeList[_customer].length;
        for(uint256 i = 0; i < proposalVotedTimeListLength; ++i) { 
            if(proposalVotedTimeList[_customer][i] > si.stakeTime && proposalVotedTimeList[_customer][i] < si.withdrawableTime) {
                votedCount += 1;
            }
        }

        uint256 rewardPercent = __rewardPercent(si.stakeAmount); // 0.0125*1e8 = 0.0125%
        
        // Get time with accuracy(10**4) from after lockPeriod 
        uint256 period = (block.timestamp - si.stakeTime) * 1e4 / 1 days;
        uint256 rewardAmount = totalRewardAmount * rewardPercent * period / 1e10 / 1e4;
        
        // if no proposal then full rewards, if no vote for 5 proposals then no rewards, if 3 votes for 5 proposals then rewards*3/5
        if(proposalCount != 0) {
            if(votedCount == 0) {
                rewardAmount = 0;
            } else {
                uint256 countVal = (votedCount * 1e4) / proposalCount;
                rewardAmount = rewardAmount * countVal / 1e4;
            }
        }
        
        // If customer is film board member, more rewards(25%)
        if(IProperty(DAO_PROPERTY).checkGovWhitelist(2, _customer) == 2) {            
            rewardAmount = rewardAmount + rewardAmount * IProperty(DAO_PROPERTY).boardRewardRate() / 1e10;
        } 
        
        amount_ = rewardAmount;
    }

    // 500 * 1e10 / 1000 = 50*1e8 = 50% 
    // 0.025*1e8 * 50*1e8 / 1e10 = 0.0125*1e8 = 0.0125%
    function __rewardPercent(uint256 _stakingAmount) private view returns (uint256 percent_) {
        uint256 poolPercent = _stakingAmount * 1e10 / totalStakingAmount; 
        percent_ = IProperty(DAO_PROPERTY).rewardRate() * poolPercent / 1e10;
    }

    /// @notice Calculate APR(Annual Percentage Rate) for staking rewards
    function calculateAPR( 
        uint256 _period,        // ex: 2 days / 32 days / 365 days
        uint256 _stakeAmount,   // ex: 100 VAB
        uint256 _proposalCount,
        uint256 _voteCount,
        bool isBoardMember      // filmboard member or not
    ) external view returns (uint256 amount_) {
        require(_period != 0, "apr: zero period");
        require(_stakeAmount != 0, "apr: zero staker");
        require(_proposalCount >= _voteCount, "apr: bad vote count");

        // Annual rate = daily rate x period(ex: 365)
        uint256 rewardPercent = __rewardPercent(_stakeAmount); // 0.0125*1e8 = 0.0125%        
        uint256 rewardAmount = totalRewardAmount * rewardPercent * _period / 1e10;
        
        // if no proposal then full rewards, if no vote for 5 proposals then no rewards, if 3 votes for 5 proposals then rewards*3/5
        if(_proposalCount != 0) {
            if(_voteCount == 0) {
                rewardAmount = 0;
            } else {
                uint256 countVal = (_voteCount * 1e4) / _proposalCount;
                rewardAmount = rewardAmount * countVal / 1e4;
            }
        }
        
        // If customer is film board member, more rewards(25%)
        if(isBoardMember) {            
            rewardAmount = rewardAmount + rewardAmount * IProperty(DAO_PROPERTY).boardRewardRate() / 1e10;
        }        

        amount_ = rewardAmount;
    }
    
    // =================== Customer deposit/withdraw VAB START =================    
    /// @notice Deposit VAB token from customer for renting the films
    function depositVAB(uint256 _amount) external nonReentrant {
        require(msg.sender != address(0), "depositVAB: Zero address");
        require(_amount != 0, "depositVAB: Zero amount");

        Helper.safeTransferFrom(IOwnablee(OWNABLE).PAYOUT_TOKEN(), msg.sender, address(this), _amount);
        userRentInfo[msg.sender].vabAmount += _amount;

        emit VABDeposited(msg.sender, _amount);
    }

    /// @notice Pending Withdraw VAB token by customer
    function pendingWithdraw(uint256 _amount) external nonReentrant {
        require(msg.sender != address(0), "pendingWithdraw: zero address");
        require(_amount != 0, "pendingWithdraw: zero VAB amount");
        require(!userRentInfo[msg.sender].pending, "pendingWithdraw: already pending status");

        uint256 cAmount = userRentInfo[msg.sender].vabAmount;
        uint256 wAmount = userRentInfo[msg.sender].withdrawAmount;
        require(_amount <= cAmount - wAmount, "pendingWithdraw: Insufficient VAB amount");

        userRentInfo[msg.sender].withdrawAmount += _amount;
        userRentInfo[msg.sender].pending = true;

        emit WithdrawPending(msg.sender, _amount);
    }

    /// @notice Approve pending-withdraw of given customers by Auditor
    function approvePendingWithdraw(address[] calldata _customers) external onlyAuditor nonReentrant {
        require(_customers.length != 0, "approvePendingWithdraw: No customer");
        
        uint256[] memory withdrawAmounts = new uint256[](_customers.length);
        // Transfer withdrawable amount to _customers
        uint256 customerLength = _customers.length;
        for(uint256 i = 0; i < customerLength; ++i) {
            withdrawAmounts[i] = __transferVABWithdraw(_customers[i]);
        }
        
        emit PendingWithdrawApproved(_customers, withdrawAmounts);
    }

    /// @dev Transfer VAB token to user's withdraw request
    function __transferVABWithdraw(address _to) private returns (uint256) {
        uint256 payAmount = userRentInfo[_to].withdrawAmount;
        require(payAmount != 0, "approveWithdraw: zero withdraw amount");
        require(payAmount <= userRentInfo[_to].vabAmount, "approveWithdraw: insufficuent amount");
        require(userRentInfo[_to].pending, "approveWithdraw: no pending");

        Helper.safeTransfer(IOwnablee(OWNABLE).PAYOUT_TOKEN(), _to, payAmount);

        userRentInfo[_to].vabAmount -= payAmount;
        userRentInfo[_to].withdrawAmount = 0;
        userRentInfo[_to].pending = false;
        
        return payAmount;
    }

    function checkApprovePendingWithdraw(address[] calldata _customers) external view returns (bool) {
        address _to;
        uint256 payAmount;
        uint256 sum = 0;
        uint256 customerLength = _customers.length;
        for(uint256 i = 0; i < customerLength; ++i) {
            _to = _customers[i];
            payAmount = userRentInfo[_to].withdrawAmount;
            if (payAmount == 0) 
                return false;

            if (payAmount > userRentInfo[_to].vabAmount) 
                return false;

            if (!userRentInfo[_to].pending) 
                return false;

            sum += payAmount;
        }

        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();

        if (IERC20(vabToken).balanceOf(address(this)) < sum)
            return false;

        return true;
    }

    /// @notice Deny pending-withdraw of given customers by Auditor
    function denyPendingWithdraw(address[] calldata _customers) external onlyAuditor nonReentrant {
        require(_customers.length != 0, "denyWithdraw: bad customers");

        // Release withdrawable amount for _customers
        uint256 customerLength = _customers.length;
        for(uint256 i = 0; i < customerLength; ++i) {
            require(userRentInfo[_customers[i]].withdrawAmount != 0, "denyWithdraw: zero withdraw amount");
            require(userRentInfo[_customers[i]].pending, "denyWithdraw: no pending");
            
            userRentInfo[_customers[i]].withdrawAmount = 0;
            userRentInfo[_customers[i]].pending = false;
        }

        emit PendingWithdrawDenied(_customers);
    } 

    function checkDenyPendingWithDraw(address[] calldata _customers) external view returns (bool) {
        uint256 customerLength = _customers.length;
        for(uint256 i = 0; i < customerLength; ++i) {
            if (userRentInfo[_customers[i]].withdrawAmount == 0)
                return false;

            if (!userRentInfo[_customers[i]].pending)
                return false;
        }
        return true;
    }
    
    /// @notice onlyDAO transfer VAB token to user
    function sendVAB(
        address[] calldata _users, 
        address _to, 
        uint256[] calldata _amounts
    ) external onlyDAO returns (uint256) {
        uint256 sum;
        uint256 userLength = _users.length;
        for(uint256 i = 0; i < userLength; ++i) {  
            require(userRentInfo[_users[i]].vabAmount >= _amounts[i], "sendVAB: insufficient balance");

            userRentInfo[_users[i]].vabAmount -= _amounts[i];
            sum += _amounts[i];
        }

        Helper.safeTransfer(IOwnablee(OWNABLE).PAYOUT_TOKEN(), _to, sum);

        return sum;
    }

    function checkAllocateToPool(address[] calldata _users, uint256[] calldata _amounts) external view returns (bool) {
        uint256 sum;
        uint256 userLength = _users.length;
        for(uint256 i = 0; i < userLength; ++i) {  
            if (userRentInfo[_users[i]].vabAmount < _amounts[i])
                return false;

            sum += _amounts[i];            
        }

        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();

        if (IERC20(vabToken).balanceOf(address(this)) < sum)
            return false;

        return true;
    }



    /// @notice Transfer DAO all fund to V2
    // After call this function, users should be available to withdraw his funds deposited
    function withdrawAllFund() external onlyAuditor nonReentrant {
        address to = IProperty(DAO_PROPERTY).DAO_FUND_REWARD();
        require(to != address(0), 'withdrawAllFund: Zero address');

        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();

        uint256 sumAmount;
        // Transfer rewards of Staking Pool        
        if(IERC20(vabToken).balanceOf(address(this)) >= totalRewardAmount && totalRewardAmount != 0) {
            Helper.safeTransfer(vabToken, to, totalRewardAmount);
            sumAmount += totalRewardAmount;
            totalRewardAmount = 0;     
        }        
        
        // Transfer VAB of Edge Pool(Ownable)
        sumAmount += IOwnablee(OWNABLE).withdrawVABFromEdgePool(to);
        
        // Transfer VAB of Studio Pool(VabbleDAO)
        sumAmount += IVabbleDAO(VABBLE_DAO).withdrawVABFromStudioPool(to);
        
        emit AllFundWithdraw(to, sumAmount);
    }

    /// @notice Update lastStakedTime for a staker when vote
    function updateWithdrawableTime(
        address _user, 
        uint256 _time
    ) external onlyVote {
        stakeInfo[_user].withdrawableTime = _time;
    }

    /// @notice Add voted time for a staker when vote
    function updateVotedTime(address _user, uint256 _time) external onlyVote {
        proposalVotedTimeList[_user].push(_time);
    }

    /// @notice Update lastfundProposalCreateTime for only fund film proposal
    function updateLastfundProposalCreateTime(uint256 _time) external onlyDAO {
        lastfundProposalCreateTime = _time;
    }

    /// @notice Update ProposalCreateTimeList for calculating rewards
    function updateProposalCreatedTimeList(uint256 _time) external {
        require(msg.sender == VABBLE_DAO || msg.sender == DAO_PROPERTY, "caller is not VabbleDAO/Property contract");
        proposalCreatedTimeList.push(_time);
    }    

    /// @notice Get staking amount for a staker
    function getStakeAmount(address _user) external view returns(uint256 amount_) {
        amount_ = stakeInfo[_user].stakeAmount;
    }

    /// @notice Get user rent VAB amount
    function getRentVABAmount(address _user) external view returns(uint256 amount_) {
        amount_ = userRentInfo[_user].vabAmount;
    }

    /// @notice Get limit staker count for voting
    function getLimitCount() external view returns(uint256 count_) {
        uint256 limitPercent = IProperty(DAO_PROPERTY).minStakerCountPercent();
        uint256 minVoteCount = IProperty(DAO_PROPERTY).minVoteCount();
        
        uint256 limitStakerCount = stakerCount.current() * limitPercent * 1e4 / 1e10;
        if(limitStakerCount <= minVoteCount * 1e4) {
            count_ = minVoteCount;
        } else {
            // limitStakerCount=12500 => count=1
            count_ = limitStakerCount / 1e4;
        }
    }

    /// @notice Get withdrawableTime for a staker
    function getWithdrawableTime(address _user) external view returns(uint256 time_) {
        time_ = stakeInfo[_user].withdrawableTime;
    }    
}