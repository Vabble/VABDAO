// SPDX-License-Identifier: MIT
// https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/Arrays.sol
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../libraries/Helper.sol";
import "../libraries/Arrays.sol";
import "../interfaces/IVabbleDAO.sol";
import "../interfaces/IProperty.sol";
import "../interfaces/IOwnablee.sol";

contract StakingPool is ReentrancyGuard {
    using Counters for Counters.Counter;
    using Arrays for uint256[];

    event TokenStaked(address indexed staker, uint256 stakeAmount);
    event TokenUnstaked(address indexed unstaker, uint256 unStakeAmount);
    event RewardWithdraw(address indexed staker, uint256 rewardAmount);
    event RewardContinued(address indexed staker, uint256 isCompound);
    event AllFundWithdraw(address to, uint256 amount);
    event RewardAdded(uint256 totalRewardAmount, uint256 rewardAmount, address indexed contributor);
    event VABDeposited(address indexed customer, uint256 amount);
    event WithdrawPending(address indexed customer, uint256 amount);
    event PendingWithdrawApproved(address[] customers, uint256[] withdrawAmounts);
    event PendingWithdrawDenied(address[] customers);

    struct Staker {
        address[] keys;
        mapping(address => uint256) values;
        mapping(address => uint256) indexOf;
        mapping(address => bool) inserted;
    }

    struct Stake {
        uint256 stakeAmount; // staking amount per staker
        uint256 stakeTime;
        uint256 outstandingReward; // after migration is started, this amount will be holded
    }

    struct UserRent {
        uint256 vabAmount; // current VAB amount in DAO
        uint256 withdrawAmount; // pending withdraw amount for a customer
        bool pending; // pending status for withdraw
    }

    struct Props {
        address creator;
        uint256 cTime;
        uint256 period;
        uint256 proposalID;
    }

    address private immutable OWNABLE; // Ownablee contract address
    address private VOTE; // Vote contract address
    address private VABBLE_DAO; // VabbleDAO contract address
    address private DAO_PROPERTY; // Property contract address

    uint256 public totalStakingAmount;
    uint256 public totalRewardAmount;
    uint256 public totalRewardIssuedAmount;
    uint256 public lastfundProposalCreateTime; // funding proposal created time(block.timestamp)
    uint256 public migrationStatus = 0; // 0: not started, 1: started, 2: end
    uint256 public totalMigrationVAB = 0;

    mapping(address => mapping(uint256 => uint256)) private votedTime; // (user, proposalID) => voteTime need for calculating rewards
    mapping(address => Stake) public stakeInfo;
    mapping(address => uint256) public receivedRewardAmount; // (staker => received reward amount)
    mapping(address => UserRent) public userRentInfo;
    mapping(address => uint256) public minProposalIndex;

    Counters.Counter public proposalCount; // count of stakers is from No.1

    Staker private stakerMap;
    Props[] private propsList; // need for calculating rewards

    modifier onlyVote() {
        require(msg.sender == VOTE, "not vote");
        _;
    }

    modifier onlyDAO() {
        require(msg.sender == VABBLE_DAO, "not dao");
        _;
    }

    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "not auditor");
        _;
    }

    modifier onlyDeployer() {
        require(msg.sender == IOwnablee(OWNABLE).deployer(), "not deployer");
        _;
    }

    modifier onlyNormal() {
        require(migrationStatus < 1, "Migration is on going");
        _;
    }

    constructor(address _ownable) {
        require(_ownable != address(0), "zero ownable");
        OWNABLE = _ownable;
    }

    /// @notice Initialize Pool
    function initialize(address _vabbleDAO, address _property, address _vote) external onlyDeployer {
        // TODO - N3-3 updated(add below line)
        require(VABBLE_DAO == address(0), "init: initialized");

        require(_vabbleDAO != address(0), "init: zero dao");
        VABBLE_DAO = _vabbleDAO;
        require(_property != address(0), "init: zero property");
        DAO_PROPERTY = _property;
        require(_vote != address(0), "init: zero vote");
        VOTE = _vote;
    }

    /// @notice Add reward token(VAB)
    function addRewardToPool(uint256 _amount) external onlyNormal nonReentrant {
        require(_amount > 0, "aRTP: zero amount");

        Helper.safeTransferFrom(IOwnablee(OWNABLE).PAYOUT_TOKEN(), msg.sender, address(this), _amount);
        totalRewardAmount = totalRewardAmount + _amount;

        emit RewardAdded(totalRewardAmount, _amount, msg.sender);
    }

    /// @notice Staking VAB token by staker
    function stakeVAB(uint256 _amount) external onlyNormal nonReentrant {
        require(_amount > 0, "sVAB: zero amount");

        uint256 minAmount = 10 ** IERC20Metadata(IOwnablee(OWNABLE).PAYOUT_TOKEN()).decimals() / 100;
        require(_amount > minAmount, "sVAB: min 0.01");

        Helper.safeTransferFrom(IOwnablee(OWNABLE).PAYOUT_TOKEN(), msg.sender, address(this), _amount);

        Stake storage si = stakeInfo[msg.sender];
        if (si.stakeAmount == 0 && si.stakeTime == 0) {
            __stakerSet(msg.sender, stakerCount());
        }
        si.outstandingReward += calcRealizedRewards(msg.sender);
        si.stakeAmount += _amount;
        si.stakeTime = block.timestamp;

        totalStakingAmount += _amount;

        __updateMinProposalIndex(msg.sender);

        emit TokenStaked(msg.sender, _amount);
    }

    /// @dev Allows user to unstake tokens after the correct time period has elapsed
    function unstakeVAB(uint256 _amount) external nonReentrant {
        require(msg.sender != address(0), "usVAB: zero staker");

        Stake storage si = stakeInfo[msg.sender];
        uint256 withdrawTime = si.stakeTime + IProperty(DAO_PROPERTY).lockPeriod();
        require(si.stakeAmount >= _amount, "usVAB: insufficient");
        require(migrationStatus > 0 || block.timestamp > withdrawTime, "usVAB: lock");

        // first, withdraw reward
        uint256 rewardAmount = calcRewardAmount(msg.sender);
        if (totalRewardAmount >= rewardAmount && rewardAmount > 0) {
            __withdrawReward(rewardAmount);
        }

        // Next, unstake
        Helper.safeTransfer(IOwnablee(OWNABLE).PAYOUT_TOKEN(), msg.sender, _amount);

        si.stakeTime = block.timestamp;
        si.stakeAmount -= _amount;
        totalStakingAmount -= _amount;

        if (si.stakeAmount == 0) {
            delete stakeInfo[msg.sender];

            // remove staker from list
            __stakerRemove(msg.sender);
        }

        emit TokenUnstaked(msg.sender, _amount);
    }

    /// @notice Withdraw reward.  isCompound=1 => compound reward, isCompound=0 => withdraw
    function withdrawReward(uint256 _isCompound) external nonReentrant {
        require(_isCompound == 0 || _isCompound == 1, "wR: compound");
        require(stakeInfo[msg.sender].stakeAmount > 0, "wR: zero amount");

        uint256 withdrawTime = stakeInfo[msg.sender].stakeTime + IProperty(DAO_PROPERTY).lockPeriod();
        require(migrationStatus > 0 || block.timestamp > withdrawTime, "wR: lock");

        if (migrationStatus > 0) {
            require(_isCompound == 0, "migration is on going");
        }

        uint256 rewardAmount = calcRewardAmount(msg.sender);
        require(rewardAmount > 0, "wR: zero reward");

        if (_isCompound == 1) {
            Stake storage si = stakeInfo[msg.sender];
            si.stakeAmount = si.stakeAmount + rewardAmount;
            si.stakeTime = block.timestamp;
            si.outstandingReward = 0;

            totalStakingAmount += rewardAmount;

            __updateMinProposalIndex(msg.sender);

            emit RewardContinued(msg.sender, _isCompound);
        } else {
            require(totalRewardAmount >= rewardAmount, "wR: insufficient total");

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
        stakeInfo[msg.sender].outstandingReward = 0;

        emit RewardWithdraw(msg.sender, _amount);

        // update minProposalIndex
        __updateMinProposalIndex(msg.sender);
    }

    /// @notice Calculate reward amount with previous reward
    function calcRewardAmount(address _user) public view returns (uint256) {
        Stake memory si = stakeInfo[_user];

        if (si.stakeAmount == 0) return 0;

        if (migrationStatus > 0) {
            // if migration is started
            return si.outstandingReward; // just return pre-calculated amount
        } else {
            return si.outstandingReward + calcRealizedRewards(_user);
        }
    }

    function __calcProposalTimeIntervals(address _user) public view returns (uint256[] memory times_) {
        uint256 pLength = propsList.length;
        Props memory pData;
        uint256 stakeTime = stakeInfo[_user].stakeTime;
        uint256 end = block.timestamp;

        // find all start/end proposal whose end >= stakeTime
        uint256 count = 0;
        uint256 minIndex = minProposalIndex[_user];
        for (uint256 i = minIndex; i < pLength; ++i) {
            if (propsList[i].cTime + propsList[i].period >= stakeInfo[_user].stakeTime) {
                count++;
            }
        }

        times_ = new uint256[](2 * count + 2);

        times_[0] = stakeTime;

        // find all start/end proposal whose end >= stakeTime
        count = 0;

        for (uint256 i = minIndex; i < pLength; ++i) {
            pData = propsList[i];

            if (pData.cTime + pData.period >= stakeTime) {
                times_[2 * count + 1] = pData.cTime;
                times_[2 * count + 2] = pData.cTime + pData.period;

                if (times_[2 * count + 2] > end) {
                    times_[2 * count + 2] = end;
                }
                count++;
            }
        }
        times_[2 * count + 1] = end;

        // sort times
        times_.sort();
    }

    // function __calcProposalTimeIntervalsTest(address _user) public view returns (uint256[] memory times_, uint256 count_) {
    //     uint256 pLength = propsList.length;
    //     Props memory pData;
    //     uint256 stakeTime = stakeInfo[_user].stakeTime;
    //     uint256 end = block.timestamp;

    //     // find all start/end proposal whose end >= stakeTime
    //     uint256 count = 0;
    //     uint256 minIndex = minProposalIndex[_user];
    //     for(uint256 i = minIndex; i < pLength; ++i) {
    //         if (propsList[i].cTime + propsList[i].period >= stakeInfo[_user].stakeTime) {
    //             count++;
    //         }
    //     }

    //     times_ = new uint[](2 * count + 2);

    //     times_[0] = stakeTime;

    //     // find all start/end proposal whose end >= stakeTime
    //     count = 0;

    //     for(uint256 i = minIndex; i < pLength; ++i) {
    //         pData = propsList[i];

    //         if (pData.cTime + pData.period >= stakeTime) {
    //             times_[2 * count + 1] = pData.cTime;
    //             times_[2 * count + 2] = pData.cTime + pData.period;
    //             count++;
    //         }
    //     }
    //     times_[2 * count + 1] = end;

    //     count_ = count;
    // }

    function __getProposalVoteCount(address _user, uint256 minIndex, uint256 _start, uint256 _end)
        public
        view
        returns (uint256, uint256, uint256)
    {
        uint256 pCount = 0;
        uint256 vCount = 0;
        uint256 pendingVoteCount = 0;
        Props memory pData;
        uint256 pLength = propsList.length;

        for (uint256 j = minIndex; j < pLength; ++j) {
            pData = propsList[j];

            if (pData.cTime <= _start && _end <= pData.cTime + pData.period) {
                pCount++;
                if (pData.creator == _user || votedTime[_user][pData.proposalID] > 0) {
                    if (_start >= stakeInfo[_user].stakeTime) {
                        // interval is after stake
                        vCount += 1;
                    } else {
                        // interval is before stake
                        if (pData.creator == _user || votedTime[_user][pData.proposalID] <= stakeInfo[_user].stakeTime)
                        { // already vote in previous peorid
                                // ignore
                        } else {
                            vCount += 1;
                        }
                    }
                } else {
                    if (block.timestamp <= pData.cTime + pData.period) {
                        // vote period is not over
                        pendingVoteCount += 1;
                    }
                }
            }
        }

        return (pCount, vCount, pendingVoteCount);
    }

    function __updateMinProposalIndex(address _user) private {
        uint256 pLength = propsList.length;
        uint256 minIndex = minProposalIndex[_user];
        for (uint256 i = minIndex; i < pLength; ++i) {
            if (propsList[i].cTime + propsList[i].period >= stakeInfo[_user].stakeTime) {
                minProposalIndex[_user] = i;
                break;
            }
        }
    }

    /// @notice Calculate realized rewards
    function calcRealizedRewards(address _user) public view returns (uint256) {
        uint256 realizeReward = 0;

        uint256[] memory times = __calcProposalTimeIntervals(_user);

        uint256 minIndex = minProposalIndex[_user];

        uint256 intervalCount = times.length - 1;
        uint256 start;
        uint256 end;
        uint256 amount = 0;
        for (uint256 i = 0; i < intervalCount; ++i) {
            // determine proposal start and end time
            start = times[i];
            end = times[i + 1];

            // count all proposals which contains interval [t(i), t(i + 1))]
            // and also count vote proposals which contains  interval [t(i), t(i + 1))]
            (uint256 pCount, uint256 vCount,) = __getProposalVoteCount(_user, minIndex, start, end);
            amount = __calcRewards(_user, start, end);

            if (pCount > 0) {
                uint256 countRate = (vCount * 1e4) / pCount;
                amount = (amount * countRate) / 1e4;
            }

            realizeReward += amount;
        }

        return realizeReward;
    }

    function calcPendingRewards(address _user) public view returns (uint256) {
        uint256 pendingReward = 0;

        uint256[] memory times = __calcProposalTimeIntervals(_user);

        uint256 minIndex = minProposalIndex[_user];

        uint256 intervalCount = times.length - 1;
        uint256 start;
        uint256 end;
        uint256 amount = 0;
        for (uint256 i = 0; i < intervalCount; ++i) {
            // determine proposal start and end time
            start = times[i];
            end = times[i + 1];

            // count all proposals which contains interval [t(i), t(i + 1))]
            // and also count vote proposals which contains  interval [t(i), t(i + 1))]
            (uint256 pCount,, uint256 pendingVoteCount) = __getProposalVoteCount(_user, minIndex, start, end);
            amount = __calcRewards(_user, start, end);

            if (pCount > 0) {
                uint256 countRate = (pendingVoteCount * 1e4) / pCount;
                amount = (amount * countRate) / 1e4;
            } else {
                amount = 0;
            }

            pendingReward += amount;
        }

        return pendingReward;
    }

    function __calcRewards(address _user, uint256 startTime, uint256 endTime) private view returns (uint256 amount_) {
        Stake memory si = stakeInfo[_user];
        if (si.stakeAmount == 0) return 0;
        if (startTime == 0) return 0;

        uint256 rewardPercent = __rewardPercent(si.stakeAmount); // 0.0125*1e8 = 0.0125%

        // Get time with accuracy(10**4) from after lockPeriod
        uint256 period = (endTime - startTime) * 1e4 / 1 days;
        amount_ = totalRewardAmount * rewardPercent * period / 1e10 / 1e4;

        // If user is film board member, more rewards(25%)
        if (IProperty(DAO_PROPERTY).checkGovWhitelist(2, _user) == 2) {
            amount_ += amount_ * IProperty(DAO_PROPERTY).boardRewardRate() / 1e10;
        }
    }

    // 500 * 1e10 / 1000 = 50*1e8 = 50%
    // 0.025*1e8 * 50*1e8 / 1e10 = 0.0125*1e8 = 0.0125%
    function __rewardPercent(uint256 _stakingAmount) private view returns (uint256 percent_) {
        uint256 poolPercent = _stakingAmount * 1e10 / totalStakingAmount;
        percent_ = IProperty(DAO_PROPERTY).rewardRate() * poolPercent / 1e10;
    }

    /// @notice Calculate APR(Annual Percentage Rate) for staking/pending rewards
    function calculateAPR(
        uint256 _period, // ex: 2 days / 32 days / 365 days
        uint256 _stakeAmount, // ex: 100 VAB
        uint256 _proposalCount,
        uint256 _voteCount,
        bool isBoardMember // filmboard member or not
    ) external view returns (uint256 amount_) {
        require(_period > 0, "apr: zero period");
        require(_stakeAmount > 0, "apr: zero staker");
        require(_proposalCount >= _voteCount, "apr: bad vote count");

        // Annual rate = daily rate x period(ex: 365)
        uint256 rewardPercent = __rewardPercent(_stakeAmount); // 0.0125*1e8 = 0.0125%
        uint256 stakingRewards = totalRewardAmount * rewardPercent * _period / 1e10;

        // If customer is film board member, more rewards(25%)
        if (isBoardMember) {
            stakingRewards += stakingRewards * IProperty(DAO_PROPERTY).boardRewardRate() / 1e10;
        }

        // if no proposal then full rewards, if no vote for 5 proposals then no rewards, if 3 votes for 5 proposals then rewards*3/5
        uint256 pendingRewards;
        if (_proposalCount > 0) {
            if (_voteCount == 0) {
                pendingRewards = 0;
            } else {
                uint256 countVal = (_voteCount * 1e4) / _proposalCount;
                pendingRewards = stakingRewards * countVal / 1e4;
            }
        }

        amount_ = stakingRewards + pendingRewards;
    }

    // =================== Customer deposit/withdraw VAB START =================
    /// @notice Deposit VAB token from customer for renting the films
    function depositVAB(uint256 _amount) external onlyNormal nonReentrant {
        require(msg.sender != address(0), "dVAB: zero address");
        require(_amount > 0, "dVAB: zero amount");

        Helper.safeTransferFrom(IOwnablee(OWNABLE).PAYOUT_TOKEN(), msg.sender, address(this), _amount);
        userRentInfo[msg.sender].vabAmount += _amount;

        emit VABDeposited(msg.sender, _amount);
    }

    /// @notice Pending Withdraw VAB token by customer
    function pendingWithdraw(uint256 _amount) external nonReentrant {
        require(msg.sender != address(0), "pW: zero address");
        require(_amount > 0, "pW: zero VAB");
        require(!userRentInfo[msg.sender].pending, "pW: pending");

        uint256 cAmount = userRentInfo[msg.sender].vabAmount;
        uint256 wAmount = userRentInfo[msg.sender].withdrawAmount;
        require(_amount <= cAmount - wAmount, "pW: insufficient VAB");

        userRentInfo[msg.sender].withdrawAmount += _amount;
        userRentInfo[msg.sender].pending = true;

        emit WithdrawPending(msg.sender, _amount);
    }

    /// @notice Approve pending-withdraw of given customers by Auditor
    function approvePendingWithdraw(address[] calldata _customers) external onlyAuditor nonReentrant {
        require(_customers.length > 0 && _customers.length < 1000, "aPW: No customer");

        uint256[] memory withdrawAmounts = new uint256[](_customers.length);
        // Transfer withdrawable amount to _customers
        uint256 customerLength = _customers.length;
        for (uint256 i = 0; i < customerLength; ++i) {
            withdrawAmounts[i] = __transferVABWithdraw(_customers[i]);
        }

        emit PendingWithdrawApproved(_customers, withdrawAmounts);
    }

    /// @dev Transfer VAB token to user's withdraw request
    function __transferVABWithdraw(address _to) private returns (uint256) {
        uint256 payAmount = userRentInfo[_to].withdrawAmount;
        require(payAmount > 0, "aW: zero withdraw");
        require(payAmount <= userRentInfo[_to].vabAmount, "aW: insufficuent");
        require(userRentInfo[_to].pending, "aW: no pending");

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
        for (uint256 i = 0; i < customerLength; ++i) {
            _to = _customers[i];
            payAmount = userRentInfo[_to].withdrawAmount;
            if (payAmount == 0) {
                return false;
            }

            if (payAmount > userRentInfo[_to].vabAmount) {
                return false;
            }

            if (!userRentInfo[_to].pending) {
                return false;
            }

            sum += payAmount;
        }

        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();

        if (IERC20(vabToken).balanceOf(address(this)) < sum) {
            return false;
        }

        return true;
    }

    /// @notice Deny pending-withdraw of given customers by Auditor
    function denyPendingWithdraw(address[] calldata _customers) external onlyAuditor nonReentrant {
        require(_customers.length > 0 && _customers.length < 1000, "denyW: bad customers");

        // Release withdrawable amount for _customers
        uint256 customerLength = _customers.length;
        for (uint256 i = 0; i < customerLength; ++i) {
            require(userRentInfo[_customers[i]].withdrawAmount > 0, "denyW: zero withdraw");
            require(userRentInfo[_customers[i]].pending, "denyW: no pending");

            userRentInfo[_customers[i]].withdrawAmount = 0;
            userRentInfo[_customers[i]].pending = false;
        }

        emit PendingWithdrawDenied(_customers);
    }

    function checkDenyPendingWithDraw(address[] calldata _customers) external view returns (bool) {
        uint256 customerLength = _customers.length;
        for (uint256 i = 0; i < customerLength; ++i) {
            if (userRentInfo[_customers[i]].withdrawAmount == 0) {
                return false;
            }

            if (!userRentInfo[_customers[i]].pending) {
                return false;
            }
        }
        return true;
    }

    /// @notice onlyDAO transfer VAB token to user
    function sendVAB(address[] calldata _users, address _to, uint256[] calldata _amounts)
        external
        onlyDAO
        returns (uint256)
    {
        require(_users.length == _amounts.length && _users.length < 1000, "sendVAB: bad array");
        uint256 sum;
        uint256 userLength = _users.length;
        for (uint256 i = 0; i < userLength; ++i) {
            require(userRentInfo[_users[i]].vabAmount >= _amounts[i], "sendVAB: insufficient");

            userRentInfo[_users[i]].vabAmount -= _amounts[i];
            sum += _amounts[i];
        }

        Helper.safeTransfer(IOwnablee(OWNABLE).PAYOUT_TOKEN(), _to, sum);

        return sum;
    }

    function checkAllocateToPool(address[] calldata _users, uint256[] calldata _amounts) external view returns (bool) {
        uint256 sum;
        uint256 userLength = _users.length;
        for (uint256 i = 0; i < userLength; ++i) {
            if (userRentInfo[_users[i]].vabAmount < _amounts[i]) {
                return false;
            }

            sum += _amounts[i];
        }

        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();

        if (IERC20(vabToken).balanceOf(address(this)) < sum) {
            return false;
        }

        return true;
    }

    /// @notice Transfer DAO all fund to V2
    // After call this function, users should be available to withdraw his funds deposited
    function withdrawAllFund() external onlyAuditor nonReentrant {
        address to = IProperty(DAO_PROPERTY).DAO_FUND_REWARD();
        require(to != address(0), "wAF: zero address");
        require(migrationStatus == 1, "Migration is not on going");

        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();

        uint256 sumAmount;
        // Transfer rewards of Staking Pool
        if (IERC20(vabToken).balanceOf(address(this)) >= totalMigrationVAB && totalMigrationVAB > 0) {
            Helper.safeTransfer(vabToken, to, totalMigrationVAB);
            sumAmount += sumAmount + totalMigrationVAB;
            totalRewardAmount = totalRewardAmount - totalMigrationVAB;
            totalMigrationVAB = 0;
        }

        // Transfer VAB of Edge Pool(Ownable)
        sumAmount += IOwnablee(OWNABLE).withdrawVABFromEdgePool(to);

        // Transfer VAB of Studio Pool(VabbleDAO)
        sumAmount += IVabbleDAO(VABBLE_DAO).withdrawVABFromStudioPool(to);

        migrationStatus = 2; // migration is end

        emit AllFundWithdraw(to, sumAmount);
    }

    function calcMigrationVAB() external onlyNormal nonReentrant {
        require(msg.sender == DAO_PROPERTY, "not Property");

        uint256 amount = 0;
        uint256 totalAmount = 0; // sum of each staker's rewards

        // calculate the total amount of reward
        for (uint256 i = 0; i < stakerCount(); ++i) {
            amount = calcRewardAmount(stakerMap.keys[i]);
            stakeInfo[stakerMap.keys[i]].outstandingReward = amount;
            totalAmount = totalAmount + amount;
        }

        if (totalRewardAmount >= totalAmount) {
            totalMigrationVAB = totalRewardAmount - totalAmount;
        }

        migrationStatus = 1;
    }

    /// @notice Add voted time for a staker when vote
    function addVotedData(address _user, uint256 _time, uint256 _proposalID) external onlyVote {
        votedTime[_user][_proposalID] = _time;
    }

    /// @notice Update lastfundProposalCreateTime for only fund film proposal
    function updateLastfundProposalCreateTime(uint256 _time) external onlyDAO {
        lastfundProposalCreateTime = _time;
    }

    /// @notice Add proposal data to array for calculating rewards
    function addProposalData(address _creator, uint256 _cTime, uint256 _period) external returns (uint256) {
        require(msg.sender == VABBLE_DAO || msg.sender == DAO_PROPERTY, "not dao/property");

        proposalCount.increment();
        uint256 proposalID = proposalCount.current();
        propsList.push(Props(_creator, _cTime, _period, proposalID));

        return proposalID;
    }

    /// @notice Get staking amount for a staker
    function getStakeAmount(address _user) external view returns (uint256 amount_) {
        amount_ = stakeInfo[_user].stakeAmount;
    }

    /// @notice Get user rent VAB amount
    function getRentVABAmount(address _user) external view returns (uint256 amount_) {
        amount_ = userRentInfo[_user].vabAmount;
    }

    /// @notice Get limit staker count for voting
    function getLimitCount() external view returns (uint256 count_) {
        uint256 limitPercent = IProperty(DAO_PROPERTY).minStakerCountPercent();
        uint256 minVoteCount = IProperty(DAO_PROPERTY).minVoteCount();

        uint256 limitStakerCount = stakerCount() * limitPercent * 1e4 / 1e10;
        if (limitStakerCount <= minVoteCount * 1e4) {
            count_ = minVoteCount;
        } else {
            // limitStakerCount=12500 => count=1
            count_ = limitStakerCount / 1e4;
        }
    }

    /// @notice Get withdrawTime for a staker
    function getWithdrawableTime(address _user) external view returns (uint256 time_) {
        time_ = stakeInfo[_user].stakeTime + IProperty(DAO_PROPERTY).lockPeriod();
    }

    function withdrawToOwner(address to) external onlyDeployer nonReentrant {
        require(Helper.isTestNet(), "apply on testnet");

        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();

        uint256 sumAmount;

        // withdraw from staking pool
        uint256 balance = IERC20(vabToken).balanceOf(address(this));
        Helper.safeTransfer(vabToken, to, balance);

        sumAmount += balance;

        // Transfer VAB of Edge Pool(Ownable)
        sumAmount += IOwnablee(OWNABLE).withdrawVABFromEdgePool(to);

        // Transfer VAB of Studio Pool(VabbleDAO)
        sumAmount += IVabbleDAO(VABBLE_DAO).withdrawVABFromStudioPool(to);
    }

    //? View / Pure functions
    function getOwnableAddress() public view returns (address) {
        return OWNABLE;
    }

    function getVoteAddress() public view returns (address) {
        return VOTE;
    }

    function getVabbleDaoAddress() public view returns (address) {
        return VABBLE_DAO;
    }

    function getPropertyAddress() public view returns (address) {
        return DAO_PROPERTY;
    }

    function getStakerList() external view returns (address[] memory) {
        return stakerMap.keys;
    }

    function stakerCount() public view returns (uint256) {
        return stakerMap.keys.length;
    }

    function __stakerSet(address key, uint256 val) private {
        if (stakerMap.inserted[key]) {
            stakerMap.values[key] = val;
        } else {
            stakerMap.inserted[key] = true;
            stakerMap.values[key] = val;
            stakerMap.indexOf[key] = stakerMap.keys.length;
            stakerMap.keys.push(key);
        }
    }

    function __stakerRemove(address key) private {
        if (!stakerMap.inserted[key]) {
            return;
        }

        delete stakerMap.inserted[key];
        delete stakerMap.values[key];

        uint256 index = stakerMap.indexOf[key];
        address lastKey = stakerMap.keys[stakerMap.keys.length - 1];

        stakerMap.indexOf[lastKey] = index;
        delete stakerMap.indexOf[key];

        stakerMap.keys[index] = lastKey;
        stakerMap.keys.pop();
    }
}
