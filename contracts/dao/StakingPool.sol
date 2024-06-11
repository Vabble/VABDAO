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

/**
 * @title StakingPool contract
 * @notice This contract allows users to stake VAB tokens and receive rewards
 * based on the amount staked and the duration of staking.
 * Users must also vote on proposals to receive rewards accordingly.
 */
contract StakingPool is ReentrancyGuard {
    using Counters for Counters.Counter;
    using Arrays for uint256[];

    /*//////////////////////////////////////////////////////////////
                           TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Struct for storing staker information.
     * @param keys Array of staker addresses.
     * @param indexOf Mapping of staker addresses to their index in the keys array.
     */
    struct Staker {
        address[] keys;
        mapping(address => uint256) indexOf;
    }

    /**
     * @dev Struct for storing staking information.
     * @param stakeAmount The amount of VAB tokens staked.
     * @param stakeTime The timestamp when the stake was made.
     * @param outstandingReward The amount of outstanding rewards for the staker reserved after migration has started
     */
    struct Stake {
        uint256 stakeAmount;
        uint256 stakeTime;
        uint256 outstandingReward;
    }

    /**
     * @dev Struct for storing user rent information from the streaming portal.
     * @param vabAmount The amount of VAB tokens deposited by the user.
     * @param withdrawAmount The amount of VAB tokens requested for withdrawal by the user.
     * @param pending Flag indicating if there's a pending withdrawal request for the user.
     */
    struct UserRent {
        uint256 vabAmount;
        uint256 withdrawAmount;
        bool pending;
    }

    /**
     * @dev Struct for storing proposal information.
     * @param creator The address of the proposal creator.
     * @param cTime The creation time of the proposal.
     * @param period The duration of the proposal.
     * @param proposalID The ID of the proposal.
     */
    struct Props {
        address creator;
        uint256 cTime;
        uint256 period;
        uint256 proposalID;
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// The Ownablee contract address
    address private immutable OWNABLE;
    /// The Vote contract address
    address private VOTE;
    /// The VabbleDAO contract address
    address private VABBLE_DAO;
    /// The Property contract address
    address private DAO_PROPERTY;
    /// Total amount staked in the contract
    uint256 public totalStakingAmount;
    /// Total amount of rewards available for distribution
    uint256 public totalRewardAmount;
    /// Total amount of rewards already distributed
    uint256 public totalRewardIssuedAmount;
    /// Timestamp of the last funding proposal creation on the VabbleDAO contract
    uint256 public lastfundProposalCreateTime;

    /// @dev  Migration status of the contract:
    /// - 0: not started
    /// - 1: started
    /// - 2: ended
    uint256 public migrationStatus = 0;
    /// Total amount of tokens that can be migrated
    uint256 public totalMigrationVAB = 0;

    /// @dev Mapping to track the time of votes for proposals
    /// (user, proposalID) => voteTime needed for calculating rewards
    mapping(address => mapping(uint256 => uint256)) private votedTime;
    /// Mapping to store stake information for each address
    mapping(address => Stake) public stakeInfo;
    /// Mapping to track the amount of rewards received by each staker
    mapping(address => uint256) public receivedRewardAmount;
    /// Mapping to store rental information for each user
    mapping(address => UserRent) public userRentInfo;
    /// Mapping to track the minimum proposal index for each address
    mapping(address => uint256) public minProposalIndex;

    /// Counter to keep track of the number of proposals
    /// @dev Count starts from 1
    Counters.Counter public proposalCount;

    /// Struct to store staker information
    Staker private stakerMap;
    /// Array to store proposal information, needed for calculating rewards
    Props[] private propsList;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Emitted when a staker stakes VAB tokens.
     * @param staker The address of the user.
     * @param stakeAmount The amount of VAB tokens staked.
     */
    event TokenStaked(address indexed staker, uint256 stakeAmount);

    /**
     * @dev Emitted when a staker unstakes VAB tokens.
     * @param unstaker The address of the user.
     * @param unStakeAmount The amount of VAB tokens unstaked.
     */
    event TokenUnstaked(address indexed unstaker, uint256 unStakeAmount);

    /**
     * @dev Emitted when a staker withdraws rewards.
     * @param staker The address of the user.
     * @param rewardAmount The amount of rewards withdrawn.
     */
    event RewardWithdraw(address indexed staker, uint256 rewardAmount);

    /**
     * @dev Emitted when a staker continues to receive rewards, either by withdrawing or compounding.
     * @param staker The address of the user.
     * @param isCompound Flag indicating if the rewards are compounded (1) or withdrawn (0).
     * @param rewardAmount The amount of rewards continued.
     */
    event RewardContinued(address indexed staker, uint256 isCompound, uint256 rewardAmount);

    /**
     * @dev Emitted when all funds are withdrawn from the contract.
     * @param to The address where the funds are withdrawn to.
     * @param amount The total amount of funds withdrawn.
     */
    event AllFundWithdraw(address to, uint256 amount);

    /**
     * @dev Emitted when reward tokens are added to the pool.
     * @param totalRewardAmount The total reward amount after addition.
     * @param rewardAmount The amount of rewards added.
     * @param contributor The address of the contributor who added the rewards.
     */
    event RewardAdded(uint256 totalRewardAmount, uint256 rewardAmount, address indexed contributor);

    /**
     * @dev Emitted when VAB tokens are deposited by a user.
     * @param customer The address of the user who deposited VAB tokens.
     * @param amount The amount of VAB tokens deposited.
     */
    event VABDeposited(address indexed customer, uint256 amount);

    /**
     * @dev Emitted when a pending withdrawal request is made by a user.
     * @param customer The address of the user who made the pending withdrawal request.
     * @param amount The amount of VAB tokens requested for withdrawal.
     */
    event WithdrawPending(address indexed customer, uint256 amount);

    /**
     * @dev Emitted when pending withdrawal requests are approved by the auditor.
     * @param customers An array of user addresses whose pending withdrawals are approved.
     * @param withdrawAmounts An array of withdrawal amounts approved for each user.
     */
    event PendingWithdrawApproved(address[] customers, uint256[] withdrawAmounts);

    /**
     * @dev Emitted when pending withdrawal requests are denied by the auditor.
     * @param customers An array of user addresses whose pending withdrawals are denied.
     */
    event PendingWithdrawDenied(address[] customers);

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /// @dev Restricts access to the Vote contract.
    modifier onlyVote() {
        require(msg.sender == VOTE, "not vote");
        _;
    }

    /// @dev Restricts access to the VabbleDAO contract.
    modifier onlyDAO() {
        require(msg.sender == VABBLE_DAO, "not dao");
        _;
    }

    /// @dev Restricts access to the current Auditor.
    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "not auditor");
        _;
    }

    /// @dev Restricts access to the deployer of the Ownable contract.
    modifier onlyDeployer() {
        require(msg.sender == IOwnablee(OWNABLE).deployer(), "not deployer");
        _;
    }

    /// @dev Restricts access during migration.
    modifier onlyNormal() {
        require(migrationStatus < 1, "Migration is on going");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Constructor function to initialize the StakingPool contract.
     * @param _ownable Address of the Ownable contract
     */
    constructor(address _ownable) {
        require(_ownable != address(0), "zero ownable");
        OWNABLE = _ownable;
    }

    /*//////////////////////////////////////////////////////////////
                                EXTERNAL
    //////////////////////////////////////////////////////////////*/

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

        uint256 minAmount = 10 ** IERC20Metadata(IOwnablee(OWNABLE).PAYOUT_TOKEN()).decimals();
        require(_amount > minAmount, "sVAB: min 1");

        Helper.safeTransferFrom(IOwnablee(OWNABLE).PAYOUT_TOKEN(), msg.sender, address(this), _amount);

        Stake storage si = stakeInfo[msg.sender];
        if (si.stakeAmount == 0 && si.stakeTime == 0) {
            __stakerSet(msg.sender);
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

            emit RewardContinued(msg.sender, _isCompound, rewardAmount);
        } else {
            require(totalRewardAmount >= rewardAmount, "wR: insufficient total");

            __withdrawReward(rewardAmount);
        }
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

    /// @notice onlyDAO transfer VAB token to user
    function sendVAB(
        address[] calldata _users,
        address _to,
        uint256[] calldata _amounts
    )
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

    /*//////////////////////////////////////////////////////////////
                              VIEW / PURE
    //////////////////////////////////////////////////////////////*/

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

    /// @notice Calculate APR(Annual Percentage Rate) for staking/pending rewards
    function calculateAPR(
        uint256 _period, // ex: 2 days / 32 days / 365 days
        uint256 _stakeAmount, // ex: 100 VAB
        uint256 _proposalCount,
        uint256 _voteCount,
        bool isBoardMember // filmboard member or not
    )
        external
        view
        returns (uint256 amount_)
    {
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

        // if no proposal then full rewards, if no vote for 5 proposals then no rewards, if 3 votes for 5 proposals then
        // rewards*3/5
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

    function getStakerList() external view returns (address[] memory) {
        return stakerMap.keys;
    }

    /*//////////////////////////////////////////////////////////////
                                 PUBLIC
    //////////////////////////////////////////////////////////////*/

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

    function __getProposalVoteCount(
        address _user,
        uint256 minIndex,
        uint256 _start,
        uint256 _end
    )
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

    function stakerCount() public view returns (uint256) {
        return stakerMap.keys.length;
    }

    /*//////////////////////////////////////////////////////////////
                                PRIVATE
    //////////////////////////////////////////////////////////////*/

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

    function __stakerSet(address key) private {
        if (stakerMap.indexOf[key] > 0) {
            return;
        }

        stakerMap.indexOf[key] = stakerMap.keys.length + 1;
        stakerMap.keys.push(key);
    }

    function __stakerRemove(address key) private {
        if (stakerMap.indexOf[key] == 0) {
            return;
        }

        uint256 index = stakerMap.indexOf[key];
        address lastKey = stakerMap.keys[stakerMap.keys.length - 1];

        stakerMap.indexOf[lastKey] = index;
        delete stakerMap.indexOf[key];

        stakerMap.keys[index - 1] = lastKey;
        stakerMap.keys.pop();
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

    /*//////////////////////////////////////////////////////////////
                              VIEW / PURE
    //////////////////////////////////////////////////////////////*/

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
}
