// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../libraries/Ownable.sol";
import "../libraries/Helper.sol";
import "hardhat/console.sol";

contract StakingPool is Ownable, ReentrancyGuard {
    
    using Counters for Counters.Counter;

    event TokenStaked(address staker, uint256 stakeAmount, uint256 withdrawableTime);
    event TokenUnstaked(address unstaker, uint256 unStakeAmount);
    event LockTimeUpdated(uint256 lockTime);
    event RewardWithdraw(address staker, uint256 rewardAmount);
    event RewardAdded(uint256 totalRewardAmount, uint256 rewardAmount);

    struct UserInfo {
        uint256 stakeAmount;     // staking amount per staker
        uint256 withdrawableTime;// last staked time(here, means the time that staker withdrawable time)
    }

    IERC20 public immutable PAYOUT_TOKEN;// VAB token   
    address immutable public VOTE;       // vote contract address
    uint256 public lockPeriod;           // lock period for staked VAB
    uint256 public rewardRate;           // 1% = 100, 100% = 10000
    uint256 public totalStakingAmount;   // 
    uint256 public totalRewardAmount;    // 

    mapping(address => UserInfo) public userInfo;

    Counters.Counter public stakerCount;   // count of stakers is from No.1

    modifier onlyVote() {
        require(msg.sender == VOTE, "caller is not the vote contract");
        _;
    }

    constructor(
        address _payoutToken,
        address _voteContract
    ) {
        require(_payoutToken != address(0), "_payoutToken: Zero address");
        PAYOUT_TOKEN = IERC20(_payoutToken);
        require(_voteContract != address(0), "_voteContract: ZERO address");
        VOTE = _voteContract;

        lockPeriod = 30 days;
        rewardRate = 1; // 0.01% (1% = 100, 100%=10000)
    }

    /// @notice Update lock time(in second) by auditor
    function updateLockPeriod(uint256 _lockPeriod) external onlyAuditor {
        require(_lockPeriod > 0, "updateLockPeriod: not allow zero lock period");
        lockPeriod = _lockPeriod;
        emit LockTimeUpdated(_lockPeriod);
    }

    /// @notice Add reward token(VAB)
    function addReward(uint256 _amount) external {
        require(_amount > 0 && _amount <= PAYOUT_TOKEN.balanceOf(msg.sender), 'addReward: Insufficient reward amount');

        Helper.safeTransferFrom(address(PAYOUT_TOKEN), msg.sender, address(this), _amount);
        totalRewardAmount += _amount;

        emit RewardAdded(totalRewardAmount, _amount);
    }

    /// @notice Update reward rate by auditor
    function updateRewardRate(uint256 _rate) external onlyAuditor {
        require(_rate > 0 && rewardRate != _rate, "updateRewardRate: not allow rate");
        rewardRate = _rate;
    }

    /// @notice Staking VAB token by staker
    function stakeToken(uint256 _amount) public nonReentrant {
        require(msg.sender != address(0), "stakeToken: Zero staker address");
        require(_amount > 0 && PAYOUT_TOKEN.balanceOf(msg.sender) >= _amount, "stakeToken: Insufficient VAB token amount");

        Helper.safeTransferFrom(address(PAYOUT_TOKEN), msg.sender, address(this), _amount);

        if(userInfo[msg.sender].stakeAmount == 0 && userInfo[msg.sender].withdrawableTime == 0) {
            stakerCount.increment();
        }
        userInfo[msg.sender].stakeAmount += _amount;
        userInfo[msg.sender].withdrawableTime = block.timestamp + lockPeriod;
        console.log("sol=>withdrawTime in staking::", userInfo[msg.sender].withdrawableTime, block.timestamp);

        totalStakingAmount += _amount;

        emit TokenStaked(msg.sender, _amount, block.timestamp + lockPeriod);
    }

    /// @dev Allows user to unstake tokens after the correct time period has elapsed
    function unstakeToken(uint256 _amount) public nonReentrant {
        require(msg.sender != address(0), "unstakeToken: Zero staker address");
        require(userInfo[msg.sender].stakeAmount >= _amount, "unstakeToken: Insufficient stake token amount");
        console.log("sol=>withdrawTime in unstaking::", userInfo[msg.sender].withdrawableTime);
        require(
            block.timestamp >= userInfo[msg.sender].withdrawableTime, "unstakeToken: Token locked yet"
        );

        // Todo should check if we consider reward amount here or not
        Helper.safeTransfer(address(PAYOUT_TOKEN), msg.sender, _amount);
        userInfo[msg.sender].stakeAmount -= _amount;

        totalStakingAmount -= _amount;

        emit TokenUnstaked(msg.sender, _amount);
    }

    /// @notice Withdraw reward
    function withdrawReward() external {
        require(msg.sender != address(0), "withdrawReward: Zero staker address");
        require(userInfo[msg.sender].stakeAmount > 0, "withdrawReward: Zero staking amount");
        require(
            block.timestamp >= userInfo[msg.sender].withdrawableTime, "withdrawReward: Token locked yet"
        );

        // Todo should calculate rewardAmount. again check
        uint256 rewardAmount = userInfo[msg.sender].stakeAmount * rewardRate / 10000;
        require(totalRewardAmount >= rewardAmount, "withdrawReward: Insufficient total reward amount");

        Helper.safeTransfer(address(PAYOUT_TOKEN), msg.sender, rewardAmount);

        totalRewardAmount -= rewardAmount;

        emit RewardWithdraw(msg.sender, rewardAmount);
    }

    /// @notice Get staking amount for a staker
    function getStakeAmount(address _user) external view returns(uint256 amount_) {
        amount_ = userInfo[_user].stakeAmount;
    }

    /// @notice Get withdrawableTime for a staker
    function getWithdrawableTime(address _user) external view returns(uint256 time_) {
        time_ = userInfo[_user].withdrawableTime;
    }

    /// @notice Update lastStakedTime for a staker when vote
    function updateWithdrawableTime(address _user, uint256 _time) external onlyVote {
        userInfo[_user].withdrawableTime = _time;
    }
}