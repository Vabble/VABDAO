// SPDX-License-Identifier: MIT
// https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/Arrays.sol
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../interfaces/IVabbleDAO.sol";
import "../interfaces/IProperty.sol";
import "../interfaces/IOwnablee.sol";
import "../libraries/Helper.sol";
import "../libraries/Arrays.sol";

/**
 * @title StakingPool Contract
 * @notice This contract manages a staking pool where users can stake VAB tokens to earn rewards based on their staked
 * amount and participation in governance activities.
 *
 * The contract handles staking, unstaking, calculating rewards, and distributing rewards to stakers.
 * It also facilitates  participation in governance by allowing stakers to vote on proposals and earn rewards based on
 * their voting activities.
 *
 * Stakers can:
 * - Stake VAB tokens to participate in the staking pool.
 * - Earn rewards based on the amount staked and their participation in governance activities such as voting on
 * proposals.
 * - Unstake their tokens after a lock period to withdraw their staked amount and any earned rewards.
 * - Vote on proposals submitted to the governance system, this includes governance and film proposals.
 *
 * The contract calculates rewards based on the staking period, the amount staked, and the user's participation in
 * governance.
 *
 * During a migration process, stakers can withdraw their staked tokens and any accrued rewards without earning new
 * rewards until the migration is complete.
 * The contract ensures that stakers can safely withdraw their funds during this period
 * while maintaining the integrity of the staking pool and ongoing governance activities.
 *
 * Stakers are informed about the migration status, allowing them to make informed decisions regarding their staked
 * amounts and participation in governance activities.
 *
 * This contract plays a critical role in the Vabble ecosystem by providing a secure and efficient platform for staking
 * VAB tokens for participating in governance decisions and earning rewards.
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

    ///@dev The Ownablee contract address
    address private immutable OWNABLE;

    ///@dev The Vote contract address
    address private VOTE;

    ///@dev The VabbleDAO contract address
    address private VABBLE_DAO;

    ///@dev The Property contract address
    address private DAO_PROPERTY;

    ///@notice  Total amount staked in the contract
    uint256 public totalStakingAmount;

    ///@notice  Total amount of rewards available for distribution
    uint256 public totalRewardAmount;

    ///@notice  Total amount of rewards already distributed
    uint256 public totalRewardIssuedAmount;

    ///@notice  Timestamp of the last funding proposal creation on the VabbleDAO contract
    uint256 public lastfundProposalCreateTime;

    /// @notice  Migration status of the contract:
    /// - 0: not started
    /// - 1: started
    /// - 2: ended
    uint256 public migrationStatus = 0;

    /// @notice Total amount of tokens that can be migrated
    uint256 public totalMigrationVAB = 0;

    /// @dev Mapping to track the time of votes for proposals
    /// (user, proposalID) => voteTime needed for calculating rewards
    mapping(address => mapping(uint256 => uint256)) private votedTime;

    ///@notice Mapping to store stake information for each address
    mapping(address => Stake) public stakeInfo;

    ///@notice Mapping to track the amount of rewards received by each staker
    mapping(address => uint256) public receivedRewardAmount;

    ///@notice Mapping to store rental information for each user
    mapping(address => UserRent) public userRentInfo;

    ///@notice Mapping to track the minimum proposal index for each address
    mapping(address => uint256) public minProposalIndex;

    /// Counter to keep track of the number of proposals
    /// @notice Count starts from 1
    Counters.Counter public proposalCount;

    ///@dev Struct to store staker information
    Staker private stakerMap;

    ///@dev Array to store proposal information, needed for calculating rewards
    Props[] private propsList;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Emitted when a staker stakes VAB tokens.
     * @param staker The address of the staker.
     * @param stakeAmount The amount of VAB tokens staked.
     */
    event TokenStaked(address indexed staker, uint256 stakeAmount);

    /**
     * @dev Emitted when a staker unstakes VAB tokens.
     * @param unstaker The address of the staker.
     * @param unStakeAmount The amount of VAB tokens unstaked.
     */
    event TokenUnstaked(address indexed unstaker, uint256 unStakeAmount);

    /**
     * @dev Emitted when a staker withdraws rewards.
     * @param staker The address of the staker.
     * @param rewardAmount The amount of rewards withdrawn.
     */
    event RewardWithdraw(address indexed staker, uint256 rewardAmount);

    /**
     * @dev Emitted when a staker continues to receive rewards, either by withdrawing or compounding.
     * @param staker The address of the staker.
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

    /**
     * @notice Initializes the StakingPool contract, can only be called by the Deployer
     * @param _vabbleDAO Address of the VabbleDAO contract
     * @param _property Address of the Property contract
     * @param _vote Address of the Vote contract
     */
    function initialize(address _vabbleDAO, address _property, address _vote) external onlyDeployer {
        require(VABBLE_DAO == address(0), "init: initialized");
        require(_vabbleDAO != address(0), "init: zero dao");
        VABBLE_DAO = _vabbleDAO;
        require(_property != address(0), "init: zero property");
        DAO_PROPERTY = _property;
        require(_vote != address(0), "init: zero vote");
        VOTE = _vote;
    }

    /**
     * @notice Add reward token (VAB) to the StakingPool
     * @dev Should be called before users start staking in order to generate staking rewards
     * @dev This can't be called when a migration has started
     * @param _amount Amount of VAB tokens to add as reward
     */
    function addRewardToPool(uint256 _amount) external onlyNormal nonReentrant {
        require(_amount > 0, "aRTP: zero amount");

        Helper.safeTransferFrom(IOwnablee(OWNABLE).PAYOUT_TOKEN(), msg.sender, address(this), _amount);
        totalRewardAmount = totalRewardAmount + _amount;

        emit RewardAdded(totalRewardAmount, _amount, msg.sender);
    }

    /**
     * @notice Stake VAB token to the StakingPool to earn rewards and participate in the Governance
     * @dev A user turns in to a staker when they stake their tokens
     * @dev When a user stakes for the first time we add his address to the `stakerMap`
     * @dev This can't be called when a migration has started
     * @param _amount Amount of VAB tokens to stake, must be greater than 1 Token
     */
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

    /**
     * @notice Unstake VAB tokens after the correct time period has elapsed or a migration has started.
     * @dev The lock period of the tokens is a Governance property that can be changed through a proposal.
     * @dev This will transfer the stake amount + realized rewards to the user.
     * @dev This will remove the staker from the `stakerMap` when he unstakes all tokens.
     * @param _amount Amount of VAB tokens to unstake
     */
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

    /**
     * @notice Withdraw Rewards without unstaking VAB tokens
     * @dev This will lock the staked tokens for the duration of the lock period again
     * @dev There must be rewards in the StakingPool to withdraw
     * @param _isCompound can either be 1 to compound rewards or 0 to withdraw the rewards
     */
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

    /**
     * @notice Users on the streaming portal need to deposit VAB used for renting films
     * @dev This will update the userRentInfo for the given user.
     * @dev This can't be called when a migration has started.
     * @param _amount Amount of VAB tokens to deposit
     */
    function depositVAB(uint256 _amount) external onlyNormal nonReentrant {
        require(msg.sender != address(0), "dVAB: zero address");
        require(_amount > 0, "dVAB: zero amount");

        Helper.safeTransferFrom(IOwnablee(OWNABLE).PAYOUT_TOKEN(), msg.sender, address(this), _amount);
        userRentInfo[msg.sender].vabAmount += _amount;

        emit VABDeposited(msg.sender, _amount);
    }

    /**
     * @notice Request a withdrawal of VAB tokens from the streaming portal
     * @dev this is the counter part of the `depositVAB` function
     * @dev users can only request one withdrawal at a time, then the Auditor needs to approve or deny the withdraw
     * request
     * @param _amount Amount of VAB tokens to withdraw
     */
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

    /**
     * @notice Approve pending withdrawals of given users by Auditor
     * @dev A user has to call `pendingWithdraw` before
     * @param _customers Array of user addresses
     */
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

    /**
     * @notice Deny pending withdrawal of given users by Auditor
     * @param _customers Array of user addresses
     */
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

    /**
     * @notice Send VAB tokens from the given users to the given address
     * @dev This will be called from the VabbleDAO contract function `allocateToPool` by the Auditor
     * @dev The Auditor calculates what a user has to pay
     * @param _users Array of user addresses
     * @param _to Address to send tokens to
     * @param _amounts Array of amounts to transfer
     * @return sum Total amount of VAB tokens transferred
     */
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

    /**
     * @notice Calculate VAB amount able to be migrated and for each staker to receive
     * @dev This can only be called by the `Property::updateGovProposal()` function.
     * @dev After a proposal to change the reward Address has passed Governance Voting, we calculate the total VAB we
     * can migrate to a new address. All users should receive their outstanding VAB rewards.
     * @dev After calling this function the migrationStatus will be set to 1 and stakers wont receive any new rewards.
     * @dev All stakers can immediately unstake their VAB.
     */
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

    /**
     * @notice Transfer all funds from the StakingPool, EdgePool and StudioPool to a new address
     * @dev This will be called by the Auditor after a proposal to change the reward Address
     * `Property::proposalRewardFund()` has passed Governance Voting and has been finalized.
     * @dev The `to` address is the address voted for by Governance.
     * @dev This can only be called after `calcMigrationVAB`.
     * @dev All VAB tokens will be transfered and the migration status will be updated to 2 (ended).
     */
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

    /**
     * @notice Add voted data for a staker when they vote on (Governance / Film) proposals
     * @dev We need this so we can track if a user has voted on a proposal in order to calculate rewards
     * @param _user Address of the user
     * @param _time Time of the vote
     * @param _proposalID ID of the proposal
     */
    function addVotedData(address _user, uint256 _time, uint256 _proposalID) external onlyVote {
        votedTime[_user][_proposalID] = _time;
    }

    /**
     * @notice Update the last creation time of a film proposal that is for funding
     * @param _time New creation time
     */
    function updateLastfundProposalCreateTime(uint256 _time) external onlyDAO {
        lastfundProposalCreateTime = _time;
    }

    /**
     * @notice Add proposal data used for calculating staking rewards
     * @dev This must be called when a Governance / Film proposal is created
     * @param _creator Address of the proposal creator
     * @param _cTime Creation time of the proposal
     * @param _period Vote period of the proposal
     * @return proposalID ID of the new proposal
     */
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

    /**
     * @notice Function to validate if `sendVAB()` can be called with the given arguments
     * @dev Should be called before `VabbleDAO::allocateToPool()` to ensure that the arguments are valid
     * @param _users Array of user addresses
     * @param _amounts Array of amounts to allocate
     * @return bool True if allocation is valid, otherwise false
     */
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

    /**
     * @notice Check if pending withdrawals can be denied
     * @dev Should be called before `denyPendingWithdraw()`
     * @param _customers Array of user addresses
     * @return bool True if withdrawals can be denied, otherwise false
     */
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

    /**
     * @notice Check if pending withdrawals can be approved
     * @dev Should be called before `approvePendingWithdraw()`
     * @param _customers Array of user addresses
     * @return bool True if withdrawals can be approved, otherwise false
     */
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

    /**
     * @notice Calculate APR (Annual Percentage Rate) for staking/pending rewards
     * @param _period The staking period in days (e.g., 2 days, 32 days, 365 days)
     * @param _stakeAmount The amount of VAB staked (e.g., 100 VAB)
     * @param _proposalCount The number of proposals during the staking period
     * @param _voteCount The number of votes cast by the staker during the staking period
     * @param isBoardMember Indicates whether the staker is a film board member
     * @return amount_ The calculated APR amount for the specified staking period and conditions
     */
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

    /**
     * @notice Get VAB staking amount for an address
     * @param _user The address of the user
     * @return amount_ The staking amount of the user
     */
    function getStakeAmount(address _user) external view returns (uint256 amount_) {
        amount_ = stakeInfo[_user].stakeAmount;
    }

    /**
     * @notice Get user rent VAB amoun
     * @dev This is the amount that was deposited on the streaming portal used to rent films
     * @param _user The address of the user
     * @return amount_ The VAB amount of the user
     */
    function getRentVABAmount(address _user) external view returns (uint256 amount_) {
        amount_ = userRentInfo[_user].vabAmount;
    }

    /**
     * @notice Get minimum amount of stakers that needs to vote for a proposal to pass
     * @dev This is a threshold for proposals in order to pass
     * @return count_ The count of stakers for voting
     */
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

    /**
     * @notice Get the time when a staker can withdraw / unstake his VAB
     * @param _user The address of the user
     * @return time_ The time when the user can withdraw their stake
     */
    function getWithdrawableTime(address _user) external view returns (uint256 time_) {
        time_ = stakeInfo[_user].stakeTime + IProperty(DAO_PROPERTY).lockPeriod();
    }

    /**
     * @notice Get the list of all stakers
     * @return An array of addresses representing all stakers
     */
    function getStakerList() external view returns (address[] memory) {
        return stakerMap.keys;
    }

    /*//////////////////////////////////////////////////////////////
                                 PUBLIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Calculate the VAB reward amount for a user including previous rewards
     * @dev When a migration has started returns the outstanding rewards and doesn't generate new rewards
     * @param _user The address of the user
     * @return The total reward amount for the user
     */
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

    /**
     * @notice Calculate the proposal time intervals for a user.
     * This function computes the start and end times of all proposals that overlap with the staking period of a user.
     * The resulting array includes the user's stake time, the start and end times of the relevant proposals, and the
     * current block timestamp.
     * @dev The function retrieves proposals from the `propsList` array and checks if their end time is greater than or
     * equal to the user's stake time.
     * It constructs an array containing the user's stake time, the start and end times of the overlapping proposals,
     * and the current block timestamp.
     * @param _user The address of the user for whom the proposal time intervals are calculated.
     * @return times_ An array of timestamps representing the proposal time intervals. The array is sorted in ascending
     * order and includes:
     *  - The user's stake time at index 0.
     *  - The start and end times of the overlapping proposals.
     *  - The current block timestamp as the last element.
     */
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

    /**
     * @notice Get the count of proposals, votes, and pending votes within a specific time interval for a user.
     * This function calculates the number of proposals, the number of votes cast by the user, and the number of pending
     * votes within a specified time interval.
     * @dev The function iterates through the `propsList` array starting from `minIndex,
     * and counts proposals whose creation time falls within the interval [_start, _end].
     * It also counts the number of votes cast by the user during this period and pending votes.
     * @param _user The address of the user for whom the vote count is calculated.
     * @param minIndex The minimum index of the proposals to consider.
     * @param _start The start time of the interval in which the votes are counted.
     * @param _end The end time of the interval in which the votes are counted.
     * @return pCount The total number of proposals within the interval.
     * @return vCount The number of votes cast by the user within the interval.
     * @return pendingVoteCount The number of pending votes within the interval.
     */
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

    /**
     * @notice Calculate the realized rewards for a user
     * This function calculates the realized rewards for a user based on the proposals they have voted on and the
     * intervals between proposals within the staking period.
     * @param _user The address of the user for whom the realized rewards are being calculated.
     * @return realizeReward The total realized rewards for the user.
     */
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

    /**
     * @notice Calculate the pending rewards for a user
     * This function calculates the pending rewards for a user based on the proposals they are yet to vote on within the
     * specified intervals between proposals within the staking period.
     * @param _user The address of the user for whom the pending rewards are being calculated.
     * @return pendingReward The total pending rewards for the user.
     */
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

    /**
     * @notice Get the count of stakers
     * @return The total number of stakers
     */
    function stakerCount() public view returns (uint256) {
        return stakerMap.keys.length;
    }

    /**
     * @notice Get the address of the Ownable contract
     * @return The address of the Ownable contract
     */
    function getOwnableAddress() public view returns (address) {
        return OWNABLE;
    }

    /**
     * @notice Get the address of the Vote contract
     * @return The address of the Vote contract
     */
    function getVoteAddress() public view returns (address) {
        return VOTE;
    }

    /**
     * @notice Get the address of the VabbleDAO contract
     * @return The address of the VabbleDAO contract
     */
    function getVabbleDaoAddress() public view returns (address) {
        return VABBLE_DAO;
    }

    /**
     * @notice Get the address of the Property contract
     * @return The address of the Property contract
     */
    function getPropertyAddress() public view returns (address) {
        return DAO_PROPERTY;
    }

    /*//////////////////////////////////////////////////////////////
                                PRIVATE
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Transfer reward amount to the user and update relevant states
     * This function handles the transfer of the reward amount to the user, updates the total reward amount,
     * received reward amount, and the user's stake information. It also emits the RewardWithdraw event
     * and updates the minimum proposal index for the user.
     * @param _amount The amount of reward to be withdrawn
     */
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

    /**
     * @dev Update the minimum proposal index for a user
     * This function updates the minimum proposal index for a user by iterating through the proposals
     * and finding the first proposal whose end time is greater than or equal to the user's stake time.
     * @param _user The address of the user whose minimum proposal index is being updated
     */
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

    /**
     * @dev Add a staker to the staker map
     * This function adds a staker to the staker map if they are not already present.
     * @param key The address of the staker to be added
     */
    function __stakerSet(address key) private {
        if (stakerMap.indexOf[key] > 0) {
            return;
        }

        stakerMap.indexOf[key] = stakerMap.keys.length + 1;
        stakerMap.keys.push(key);
    }

    /**
     * @dev Remove a staker from the staker map
     * This function removes a staker from the staker map if they are present.
     * @param key The address of the staker to be removed
     */
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

    /**
     * @dev Transfer VAB tokens to fulfill a user's withdrawal request on the streaming portal
     * @param _to The address of the user to whom the VAB tokens are being transferred
     * @return payAmount The amount of VAB tokens transferred to the user
     */
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

    /**
     * @dev Calculate the rewards for a user within a specific time period
     * This function calculates the rewards for a user based on their stake amount and the time period specified.
     * If the user is a film board member, additional rewards are included.
     * @param _user The address of the user for whom the rewards are being calculated
     * @param startTime The start time of the reward calculation period
     * @param endTime The end time of the reward calculation period
     * @return amount_ The calculated reward amount for the user
     */
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

    /**
     * @dev Calculate the reward percentage based on the staking amount
     * This function calculates the reward percentage for a user based on their staking amount
     * and the total staking amount.
     * @param _stakingAmount The amount staked by the user
     * @return percent_ The calculated reward percentage for the user
     */
    function __rewardPercent(uint256 _stakingAmount) private view returns (uint256 percent_) {
        uint256 poolPercent = _stakingAmount * 1e10 / totalStakingAmount;
        percent_ = IProperty(DAO_PROPERTY).rewardRate() * poolPercent / 1e10;
    }
}
