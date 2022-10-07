// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../libraries/Helper.sol";
import "../interfaces/IVote.sol";
import "../interfaces/IVabbleDAO.sol";
import "../interfaces/IProperty.sol";
import "../interfaces/IOwnablee.sol";
import "hardhat/console.sol";

contract StakingPool is ReentrancyGuard {
    
    using Counters for Counters.Counter;

    event TokenStaked(address staker, uint256 stakeAmount, uint256 withdrawableTime);
    event TokenUnstaked(address unstaker, uint256 unStakeAmount);
    event LockTimeUpdated(uint256 lockTime);
    event RewardWithdraw(address staker, uint256 rewardAmount);
    event RewardAdded(uint256 totalRewardAmount, uint256 rewardAmount);

    struct Stake {
        uint256 stakeAmount;     // staking amount per staker
        uint256 withdrawableTime;// last staked time(here, means the time that staker withdrawable time)
        uint256 stakeTime;       // last staked time(here, means the time that staker withdrawable time)
    }

    IERC20 private PAYOUT_TOKEN;           // VAB token   
    address private immutable OWNABLE;     // Ownablee contract address
    address private VOTE;                  // vote contract address
    address private VABBLE_DAO;            // VabbleDAO contract address
    address private DAO_PROPERTY;          // Property contract address
        
    uint256 public totalStakingAmount;   // 
    uint256 public totalRewardAmount;    // 
    bool public isInitialized;           // check if contract initialized or not

    mapping(address => Stake) public stakeInfo;

    Counters.Counter public stakerCount;   // count of stakers is from No.1

    modifier onlyVote() {
        require(msg.sender == VOTE, "caller is not the vote contract");
        _;
    }

    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "caller is not the auditor");
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
    function initializePool(
        address _vabbleDAO,
        address _voteContract,
        address _daoProperty
    ) external onlyAuditor {
        require(!isInitialized, "initializePool: Already initialized");
        require(_vabbleDAO != address(0), "initializePool: Zero vabbleDAO address");
        VABBLE_DAO = _vabbleDAO;
        require(_voteContract != address(0), "initializePool: Zero voteContract address");
        VOTE = _voteContract;    
        require(_daoProperty != address(0), "initializePool: Zero filmBoard address");
        DAO_PROPERTY = _daoProperty;               
                
        isInitialized = true;
    }    

    /// @notice Add reward token(VAB)
    function addRewardToPool(uint256 _amount) external {
        require(_amount > 0, 'addRewardToPool: Zero amount');

        Helper.safeTransferFrom(address(PAYOUT_TOKEN), msg.sender, address(this), _amount);
        totalRewardAmount += _amount;

        emit RewardAdded(totalRewardAmount, _amount);
    }    

    /// @notice Staking VAB token by staker
    function stakeToken(uint256 _amount) public nonReentrant {
        require(isInitialized, "stakeToken: Should be initialized");
        require(msg.sender != address(0), "stakeToken: Zero address");
        require(_amount > 0, "stakeToken: Zero amount");

        Helper.safeTransferFrom(address(PAYOUT_TOKEN), msg.sender, address(this), _amount);

        if(stakeInfo[msg.sender].stakeAmount == 0 && stakeInfo[msg.sender].withdrawableTime == 0) {
            stakerCount.increment();
        }
        stakeInfo[msg.sender].stakeAmount += _amount;
        stakeInfo[msg.sender].withdrawableTime = block.timestamp + IProperty(DAO_PROPERTY).lockPeriod();
        stakeInfo[msg.sender].stakeTime = block.timestamp;

        totalStakingAmount += _amount;

        emit TokenStaked(msg.sender, _amount, block.timestamp + IProperty(DAO_PROPERTY).lockPeriod());
    }

    /// @dev Allows user to unstake tokens after the correct time period has elapsed
    function unstakeToken(uint256 _amount) external nonReentrant {
        require(isInitialized, "unstakeToken: Should be initialized");
        require(msg.sender != address(0), "unstakeToken: Zero staker address");
        require(stakeInfo[msg.sender].stakeAmount >= _amount, "unstakeToken: Insufficient stake token amount");
        require(
            block.timestamp >= stakeInfo[msg.sender].withdrawableTime, "unstakeToken: Token locked yet"
        );

        // first, withdraw reward
        uint256 rewardAmount = __calcRewardAmount() + __calcExtraRewardAmount();
        if(totalRewardAmount >= rewardAmount) {
            __withdrawReward(rewardAmount);
        }

        // Next, unstake
        // Todo should check if we consider reward amount here or not
        Helper.safeTransfer(address(PAYOUT_TOKEN), msg.sender, _amount);        
        stakeInfo[msg.sender].stakeAmount -= _amount;
        totalStakingAmount -= _amount;

        emit TokenUnstaked(msg.sender, _amount);
    }

    /// @notice Withdraw reward
    function withdrawReward() external nonReentrant {
        require(msg.sender != address(0), "withdrawReward: Zero staker address");
        require(stakeInfo[msg.sender].stakeAmount > 0, "withdrawReward: Zero staking amount");
        require(block.timestamp - stakeInfo[msg.sender].stakeTime > IProperty(DAO_PROPERTY).lockPeriod(), "withdrawReward: lock period yet");

        uint256 rewardAmount = __calcRewardAmount() + __calcExtraRewardAmount();
        require(totalRewardAmount >= rewardAmount, "withdrawReward: Insufficient total reward amount");

        __withdrawReward(rewardAmount);
    }

    /// @dev Calculate reward amount
    function __calcRewardAmount() private view returns (uint256 amount_) {
        // Get time with accuracy(10**4) from after lockPeriod 
        uint256 timeVal = (block.timestamp - stakeInfo[msg.sender].stakeTime) * 1e4 / IProperty(DAO_PROPERTY).lockPeriod();
        amount_ = stakeInfo[msg.sender].stakeAmount * timeVal * IProperty(DAO_PROPERTY).rewardRate() / 1e10 / 1e4;
    }

    /// @dev Calculate extra reward amount for funding film vote
    function __calcExtraRewardAmount() private view returns (uint256 amount_) {
        uint256[] memory filmIds = IVote(VOTE).getFilmIdsPerUser(msg.sender); 
        for(uint256 i = 0; i < filmIds.length; i++) { 
            uint256 voteStatus = IVote(VOTE).getVoteStatusPerUser(msg.sender, filmIds[i]);    
            bool isRaised = IVabbleDAO(VABBLE_DAO).isRaisedFullAmount(filmIds[i]);
            if((voteStatus == 1 && isRaised) || (voteStatus == 2 && !isRaised)) { 
                amount_ += totalRewardAmount * IProperty(DAO_PROPERTY).extraRewardRate() / 1e10;       
            }
        } 
    }

    /// @dev Transfer reward amount
    function __withdrawReward(uint256 _amount) private {
        Helper.safeTransfer(address(PAYOUT_TOKEN), msg.sender, _amount);
        stakeInfo[msg.sender].stakeTime = block.timestamp;
        totalRewardAmount -= _amount;

        IVote(VOTE).removeFilmIdsPerUser(msg.sender);
        
        emit RewardWithdraw(msg.sender, _amount);
    }

    /// @notice Update lastStakedTime for a staker when vote
    function updateWithdrawableTime(address _user, uint256 _time) external onlyVote {
        stakeInfo[_user].withdrawableTime = _time;
    }

    /// @notice Get staking amount for a staker
    function getStakeAmount(address _user) external view returns(uint256 amount_) {
        amount_ = stakeInfo[_user].stakeAmount;
    }

    /// @notice Get withdrawableTime for a staker
    function getWithdrawableTime(address _user) external view returns(uint256 time_) {
        time_ = stakeInfo[_user].withdrawableTime;
    }    
}