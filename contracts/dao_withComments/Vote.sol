// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IVabbleDAO.sol";
import "../interfaces/IStakingPool.sol";
import "../interfaces/IProperty.sol";
import "../interfaces/IOwnablee.sol";
import "../interfaces/IVote.sol";
import "../interfaces/IUniHelper.sol";
import "../libraries/Helper.sol";

/**
 * @title Vote Contract
 * @dev This contract facilitates voting processes related to governance and film approvals within the Vabble ecosystem.
 * It integrates with other contracts like `StakingPool`, `Property`, and `VabbleDAO` to manage voting rights, stake
 * amounts, and proposal approval logic.
 * The contract allows stakeholders (stakers) to vote on proposals regarding governance decisions and films.
 *
 * The contract includes functionality for:
 * - Voting on governance proposals for auditor changes, reward address changes, adding film board members and various
 * property changes.
 * - Voting on film proposals for funding types, such as listing or distribution.
 * - Approving film proposals based on voting outcomes.
 * - Tracking voting periods and stakeholder participation.
 *
 * Governance proposals and film proposals undergo distinct voting periods, ensuring transparent decision-making and
 * stakeholder engagement. Stakers are incentivized through rewards managed by the `StakingPool` contract, which
 * distributes rewards based on voting activity and stake amounts.
 *
 * This contract is part of the broader Vabble ecosystem governance framework, enabling efficient and fair governance
 * decision-making processes. It enforces governance rules defined in the `Property` contract and interacts with the
 * `VabbleDAO` for film-related decisions and status updates.
 */
contract Vote is IVote, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                           TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Struct representing the details of a voting process.
     * @param stakeAmount_1 The total amount staked by voters who voted "yes".
     * @param stakeAmount_2 The total amount staked by voters who voted "no".
     * @param voteCount_1 The total number of votes cast as "yes".
     * @param voteCount_2 The total number of votes cast as "no".
     */
    struct Voting {
        uint256 stakeAmount_1;
        uint256 stakeAmount_2;
        uint256 voteCount_1;
        uint256 voteCount_2;
    }

    /**
     * @dev Struct representing the details of an agent-specific voting process.
     * @param stakeAmount_1 The total amount staked by voters who voted "yes".
     * @param stakeAmount_2 The total amount staked by voters who voted "no".
     * @param voteCount_1 The total number of votes cast as "yes".
     * @param voteCount_2 The total number of votes cast as "no".
     */
    //@follow-up why use different Struct as above Voting struct ?
    struct AgentVoting {
        uint256 stakeAmount_1;
        uint256 stakeAmount_2;
        uint256 voteCount_1;
        uint256 voteCount_2;
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    /// @dev The address of the Ownable contract.
    address private immutable OWNABLE;
    /// @dev The address of the Vabble DAO contract.
    address private VABBLE_DAO;
    /// @dev The address of the Staking Pool contract.
    address private STAKING_POOL;
    /// @dev The address of the Property contract.
    address private DAO_PROPERTY;
    /// @dev The address of the Uni Helper contract.
    address private UNI_HELPER;

    /**
     * @notice Mapping of film IDs to their corresponding Voting struct.
     */
    mapping(uint256 => Voting) public filmVoting;

    /**
     * @notice Mapping of film board indices to their corresponding Voting struct.
     */
    mapping(uint256 => Voting) public filmBoardVoting;

    /**
     * @notice Mapping of reward address indices to their corresponding Voting struct.
     */
    mapping(uint256 => Voting) public rewardAddressVoting;

    /**
     * @notice Mapping of property flags and indices to their corresponding Voting struct.
     * (flag => (property index => Voting))
     */
    mapping(uint256 => mapping(uint256 => Voting)) public propertyVoting;

    /**
     * @notice Mapping of agent indices to their corresponding AgentVoting struct.
     */
    mapping(uint256 => AgentVoting) public agentVoting;

    /**
     * @notice Mapping to track if a staker has participated in a film vote.
     * Maps staker to filmId to true/false.
     */
    mapping(address => mapping(uint256 => bool)) public isAttendToFilmVote;

    /**
     * @notice Mapping to track if a staker has participated in a film board vote.
     * Maps staker to filmBoard index to true/false.
     */
    mapping(address => mapping(uint256 => bool)) public isAttendToBoardVote;

    /**
     * @notice Mapping to track if a staker has participated in a reward address vote.
     * Maps staker to rewardAddress index to true/false.
     */
    mapping(address => mapping(uint256 => bool)) public isAttendToRewardAddressVote;

    /**
     * @notice Mapping to track if a staker has participated in an agent vote.
     * Maps staker to agent index to true/false.
     */
    mapping(address => mapping(uint256 => bool)) public isAttendToAgentVote;

    /**
     * @notice Mapping to track if a staker has participated in a property vote.
     * Maps flag to staker to property index to true/false.
     */
    mapping(uint256 => mapping(address => mapping(uint256 => bool))) public isAttendToPropertyVote;

    /**
     * @notice Mapping of users to the count of their film votes.
     */
    mapping(address => uint256) public userFilmVoteCount;

    /**
     * @notice Mapping of users to the count of their governance votes.
     */
    mapping(address => uint256) public userGovernVoteCount;

    /**
     * @notice Mapping of governance flags to the count of passed votes.
     * Maps flag to passed vote count. Flags: 1 - agent, 2 - dispute, 3 - board, 4 - pool, 5 - property.
     */
    mapping(uint256 => uint256) public govPassedVoteCount;

    /**
     * @dev Mapping of stakers to their last vote timestamp.
     * Maps staker address to block.timestamp used at `Property::removeFilmBoardMember()` to check if a film board
     * member didn't vote during a given time period (which is the `Property::maxAllowPeriod`).
     */
    mapping(address => uint256) private lastVoteTime;

    /**
     * @dev Mapping of film IDs to proposal IDs.
     */
    mapping(uint256 => uint256) private proposalFilmIds;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Emitted when a vote is cast for a property.
     * @param voter The address of the voter.
     * @param flag The flag indicating the property type.
     * @param propertyVal The value of the property.
     * @param voteInfo The vote information.
     * @param index The index of the property proposal.
     */
    event VotedToProperty(address indexed voter, uint256 flag, uint256 propertyVal, uint256 voteInfo, uint256 index);

    /**
     * @notice Emitted when a vote is cast for an agent.
     * @param voter The address of the voter.
     * @param agent The address of the agent being voted on.
     * @param voteInfo The vote information (1 for yes, 2 for no).
     * @param index The index of the agent proposal.
     */
    event VotedToAgent(address indexed voter, address indexed agent, uint256 voteInfo, uint256 index);

    /**
     * @notice Emitted when a vote is cast for a reward address.
     * @param voter The address of the voter.
     * @param rewardAddress The address of the reward.
     * @param voteInfo The vote information.
     * @param index The index of the reward address proposal.
     */
    event VotedToPoolAddress(address indexed voter, address rewardAddress, uint256 voteInfo, uint256 index);

    /**
     * @notice Emitted when a vote is cast for a film board member.
     * @param voter The address of the voter.
     * @param candidate The address of the candidate.
     * @param voteInfo The vote information.
     * @param index The index of the film board proposal.
     */
    event VotedToFilmBoard(address indexed voter, address candidate, uint256 voteInfo, uint256 index);

    /**
     * @notice Emitted when a vote is cast for a film.
     * @param voter The address of the voter.
     * @param filmId The ID of the film being voted on.
     * @param voteInfo The vote information (1 for yes, 2 for no).
     */
    event VotedToFilm(address indexed voter, uint256 indexed filmId, uint256 voteInfo);

    /**
     * @notice Emitted when a property is updated.
     * @param whichProperty The ID of the property.
     * @param propertyValue The value of the property.
     * @param caller The address of the caller who updated the property.
     * @param reason The reason for the update.
     * @param index The index of the property proposal.
     */
    event PropertyUpdated(
        uint256 indexed whichProperty, uint256 propertyValue, address caller, uint256 reason, uint256 index
    );

    /**
     * @notice Emitted when agent stats are updated.
     * @param agent The address of the agent.
     * @param caller The address of the caller who updated the stats.
     * @param reason The reason for the update.
     * @param index The index of the agent proposal.
     */
    event UpdatedAgentStats(address indexed agent, address caller, uint256 reason, uint256 index);

    /**
     * @notice Emitted when a dispute is raised against an agent.
     * @param caller The address of the caller raising the dispute.
     * @param agent The address of the agent being disputed.
     * @param index The index of the agent proposal.
     */
    event DisputedToAgent(address indexed caller, address indexed agent, uint256 index);

    /**
     * @notice Emitted when an auditor is replaced.
     * @param agent The address of the replaced agent.
     * @param caller The address of the caller who replaced the auditor.
     */
    event AuditorReplaced(address indexed agent, address caller);

    /**
     * @notice Emitted when a pool address is added.
     * @param pool The address of the pool.
     * @param caller The address of the caller who added the pool address.
     * @param reason The reason for adding the pool address.
     * @param index The index of the pool address proposal.
     */
    event PoolAddressAdded(address indexed pool, address caller, uint256 reason, uint256 index);

    /**
     * @notice Emitted when a film board member is added.
     * @param boardMember The address of the new board member.
     * @param caller The address of the caller who added the board member.
     * @param reason The reason for adding the board member.
     * @param index The index of the film board proposal.
     */
    event FilmBoardAdded(address indexed boardMember, address caller, uint256 reason, uint256 index);

    /**
     * @notice Emitted when a film is approved.
     * @param filmId The ID of the film.
     * @param fundType The type of fund (0 for distribution, 1 for funding).
     * @param reason The reason for approval.
     */
    event FilmApproved(uint256 indexed filmId, uint256 fundType, uint256 reason);

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /// @dev Restricts access to the deployer of the Ownable contract.
    modifier onlyDeployer() {
        require(msg.sender == IOwnablee(OWNABLE).deployer(), "caller is not the deployer");
        _;
    }

    /// @dev Restricts access to stakers.
    modifier onlyStaker() {
        require(IStakingPool(STAKING_POOL).getStakeAmount(msg.sender) != 0, "Not staker");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Constructor to initialize the ownable address.
     * @param _ownable Address of the ownable contract.
     */
    constructor(address _ownable) {
        require(_ownable != address(0), "ownablee: zero address");
        OWNABLE = _ownable;
    }

    /*//////////////////////////////////////////////////////////////
                                EXTERNAL
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initialize Vote contract.
     * @param _vabbleDAO Address of the VabbleDAO contract.
     * @param _stakingPool Address of the StakingPool contract.
     * @param _property Address of the Property contract.
     * @param _uniHelper Address of the UniHelper contract.
     * @dev Throws an error if already initialized or if any of the addresses are invalid.
     * Only the Deployer is allowed to call this.
     */
    function initialize(
        address _vabbleDAO,
        address _stakingPool,
        address _property,
        address _uniHelper
    )
        external
        onlyDeployer
    {
        require(VABBLE_DAO == address(0), "init: already initialized");

        require(_vabbleDAO != address(0) && Helper.isContract(_vabbleDAO), "init: zero vabbleDAO");
        VABBLE_DAO = _vabbleDAO;
        require(_stakingPool != address(0) && Helper.isContract(_stakingPool), "init: zero stakingPool");
        STAKING_POOL = _stakingPool;
        require(_property != address(0) && Helper.isContract(_property), "init: zero property");
        DAO_PROPERTY = _property;
        require(_uniHelper != address(0), "init: zero uniHelper");
        UNI_HELPER = _uniHelper;
    }

    /**
     * @notice Stakers can vote to a property proposal.
     * @param _voteInfo Vote information (1 for Yes, 2 for No).
     * @param _index Index of the proposal.
     * @param _flag The flag representing the type of property.
     *              0 - Film Vote Period
     *              1 - Agent Vote Period
     *              2 - Dispute Grace Period
     *              3 - Property Vote Period
     *              4 - Lock Period
     *              5 - Reward Rate
     *              6 - Film Reward Claim Period
     *              7 - Max Allow Period
     *              8 - Proposal Fee Amount
     *              9 - Fund Fee Percent
     *              10 - Minimum Deposit Amount
     *              11 - Maximum Deposit Amount
     *              12 - Maximum Mint Fee Percent
     *              13 - Minimum Vote Count
     *              14 - Minimum Staker Count Percent
     *              15 - Available VAB Amount
     *              16 - Board Vote Period
     *              17 - Board Vote Weight
     *              18 - Reward Vote Period
     *              19 - Subscription Amount
     *              20 - Board Reward Rate
     * @dev Throws an error if the caller is not a staker, has already voted, or the vote info is invalid.
     */
    function voteToProperty(uint256 _voteInfo, uint256 _index, uint256 _flag) external onlyStaker nonReentrant {
        (uint256 cTime,, uint256 pID, uint256 value, address creator,) =
            IProperty(DAO_PROPERTY).getPropertyProposalInfo(_index, _flag);

        require(!isAttendToPropertyVote[_flag][msg.sender][_index], "vP: already voted");
        require(msg.sender != creator, "vP: self voted");
        require(_voteInfo == 1 || _voteInfo == 2, "vP: bad vote info");
        require(cTime != 0, "vP: no proposal");
        require(__isVotePeriod(IProperty(DAO_PROPERTY).propertyVotePeriod(), cTime), "vP: elapsed period");

        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);

        Voting storage pv = propertyVoting[_flag][_index];
        if (_voteInfo == 1) {
            pv.stakeAmount_1 += stakeAmount;
            pv.voteCount_1++;
        } else {
            pv.stakeAmount_2 += stakeAmount;
            pv.voteCount_2++;
        }

        userGovernVoteCount[msg.sender] += 1;

        isAttendToPropertyVote[_flag][msg.sender][_index] = true;

        // for removing board member if he don't vote for some period
        lastVoteTime[msg.sender] = block.timestamp;
        // 1++ for calculating the rewards
        IStakingPool(STAKING_POOL).addVotedData(msg.sender, block.timestamp, pID);

        emit VotedToProperty(msg.sender, _flag, value, _voteInfo, _index);
    }

    /**
     * @notice Finalize property proposal based on vote results.
     * @param _index Index of the proposal.
     * @param _flag The flag representing the type of property.
     *              0 - Film Vote Period
     *              1 - Agent Vote Period
     *              2 - Dispute Grace Period
     *              3 - Property Vote Period
     *              4 - Lock Period
     *              5 - Reward Rate
     *              6 - Film Reward Claim Period
     *              7 - Max Allow Period
     *              8 - Proposal Fee Amount
     *              9 - Fund Fee Percent
     *              10 - Minimum Deposit Amount
     *              11 - Maximum Deposit Amount
     *              12 - Maximum Mint Fee Percent
     *              13 - Minimum Vote Count
     *              14 - Minimum Staker Count Percent
     *              15 - Available VAB Amount
     *              16 - Board Vote Period
     *              17 - Board Vote Weight
     *              18 - Reward Vote Period
     *              19 - Subscription Amount
     *              20 - Board Reward Rate
     * @dev Throws an error if the vote period has not ended or the proposal has already been approved.
     * This will interact with the `Property` contract and update the property proposal accordingly.
     */
    function updateProperty(uint256 _index, uint256 _flag) external onlyStaker nonReentrant {
        (uint256 cTime, uint256 aTime,, uint256 value,,) =
            IProperty(DAO_PROPERTY).getPropertyProposalInfo(_index, _flag);

        require(!__isVotePeriod(IProperty(DAO_PROPERTY).propertyVotePeriod(), cTime), "pV: vote period yet");
        require(aTime == 0, "pV: already approved");

        uint256 reason = 0;
        Voting memory pv = propertyVoting[_flag][_index];
        uint256 totalVoteCount = pv.voteCount_1 + pv.voteCount_2;
        if (totalVoteCount >= IStakingPool(STAKING_POOL).getLimitCount() && pv.stakeAmount_1 > pv.stakeAmount_2) {
            IProperty(DAO_PROPERTY).updatePropertyProposal(_index, _flag, 1);
            govPassedVoteCount[5] += 1;
        } else {
            IProperty(DAO_PROPERTY).updatePropertyProposal(_index, _flag, 0);

            if (totalVoteCount < IStakingPool(STAKING_POOL).getLimitCount()) {
                reason = 1;
            } else if (pv.stakeAmount_1 <= pv.stakeAmount_2) {
                reason = 2;
            } else {
                reason = 10;
            }
        }
        emit PropertyUpdated(_flag, value, msg.sender, reason, _index);
    }

    /**
     * @notice Stakers vote to film board member proposal.
     * @param _index Index of the proposal.
     * @param _voteInfo Vote information (1 for Yes, 2 for No).
     * @dev Throws an error if the caller is not a staker, has already voted, or the vote info is invalid.
     */
    function voteToFilmBoard(uint256 _index, uint256 _voteInfo) external onlyStaker nonReentrant {
        (uint256 cTime,, uint256 pID, address member, address creator,) =
            IProperty(DAO_PROPERTY).getGovProposalInfo(_index, 2);

        require(IProperty(DAO_PROPERTY).checkGovWhitelist(2, member) == 1, "vFB: not candidate");
        require(!isAttendToBoardVote[msg.sender][_index], "vFB: already voted");
        require(_voteInfo == 1 || _voteInfo == 2, "vFB: bad vote info");
        require(msg.sender != creator, "vFB: self voted");
        require(cTime != 0, "vFB: no proposal");
        require(__isVotePeriod(IProperty(DAO_PROPERTY).boardVotePeriod(), cTime), "vFB: elapsed period");

        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);

        Voting storage fbp = filmBoardVoting[_index];
        if (_voteInfo == 1) {
            fbp.stakeAmount_1 += stakeAmount; // Yes
            fbp.voteCount_1++;
        } else {
            fbp.stakeAmount_2 += stakeAmount; // No
            fbp.voteCount_2++;
        }

        userGovernVoteCount[msg.sender] += 1;

        isAttendToBoardVote[msg.sender][_index] = true;

        // for removing board member if he don't vote for some period
        lastVoteTime[msg.sender] = block.timestamp;
        // 1++ for calculating the rewards
        IStakingPool(STAKING_POOL).addVotedData(msg.sender, block.timestamp, pID);

        emit VotedToFilmBoard(msg.sender, member, _voteInfo, _index);
    }

    /**
     * @notice Finalize film board member proposal based on vote result.
     * @param _index Index of the proposal.
     * @dev Throws an error if the vote period has not ended or the proposal has already been approved.
     * This will interact with the `Property` contract and update the governance proposal to add a film board member
     * accordingly.
     */
    function addFilmBoard(uint256 _index) external onlyStaker nonReentrant {
        (uint256 cTime, uint256 aTime,, address member,,) = IProperty(DAO_PROPERTY).getGovProposalInfo(_index, 2);

        require(IProperty(DAO_PROPERTY).checkGovWhitelist(2, member) == 1, "aFB: not candidate");
        require(!__isVotePeriod(IProperty(DAO_PROPERTY).boardVotePeriod(), cTime), "aFB: vote period yet");
        require(aTime == 0, "aFB: already approved");

        uint256 reason = 0;
        Voting memory fbp = filmBoardVoting[_index];
        uint256 totalVoteCount = fbp.voteCount_1 + fbp.voteCount_2;
        if (totalVoteCount >= IStakingPool(STAKING_POOL).getLimitCount() && fbp.stakeAmount_1 > fbp.stakeAmount_2) {
            IProperty(DAO_PROPERTY).updateGovProposal(_index, 2, 1);
            govPassedVoteCount[3] += 1;
        } else {
            IProperty(DAO_PROPERTY).updateGovProposal(_index, 2, 0);

            if (totalVoteCount < IStakingPool(STAKING_POOL).getLimitCount()) {
                reason = 1;
            } else if (fbp.stakeAmount_1 <= fbp.stakeAmount_2) {
                reason = 2;
            } else {
                reason = 10;
            }
        }
        emit FilmBoardAdded(member, msg.sender, reason, _index);
    }

    /**
     * @notice Stakers vote to replace the current Auditor.
     * @param _voteInfo Vote information (1 for Yes, 2 for No).
     * @param _index Index of the proposal.
     * @dev Throws an error if the caller is not a staker, has already voted, or the vote info is invalid.
     */
    function voteToAgent(uint256 _voteInfo, uint256 _index) external onlyStaker nonReentrant {
        (uint256 cTime,, uint256 pID, address agent, address creator,) =
            IProperty(DAO_PROPERTY).getGovProposalInfo(_index, 1);

        require(_voteInfo == 1 || _voteInfo == 2, "vA: bad vote info");
        require(cTime != 0, "vA: no proposal");

        AgentVoting storage av = agentVoting[_index];
        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);
        require(!isAttendToAgentVote[msg.sender][_index], "vA: already voted");
        require(msg.sender != creator, "vA: self voted");
        require(__isVotePeriod(IProperty(DAO_PROPERTY).agentVotePeriod(), cTime), "vA: elapsed period");

        if (_voteInfo == 1) {
            av.stakeAmount_1 += stakeAmount;
            av.voteCount_1++;
        } else {
            av.stakeAmount_2 += stakeAmount;
            av.voteCount_2++;
        }
        isAttendToAgentVote[msg.sender][_index] = true;
        userGovernVoteCount[msg.sender] += 1;

        // for removing board member if he don't vote for some period
        lastVoteTime[msg.sender] = block.timestamp;
        // 1++ for calculating the rewards
        IStakingPool(STAKING_POOL).addVotedData(msg.sender, block.timestamp, pID);

        emit VotedToAgent(msg.sender, agent, _voteInfo, _index);
    }

    /**
     * @notice Update auditor proposal status based on vote result.
     * @param _index Index of the proposal.
     * @dev Throws an error if the vote period has not ended or the proposal has already been updated.
     * This will enable the auditor dispute period, when the proposal passed voting, otherwise the proposal will be
     * rejected
     * and there is no aditional dispute period needed.
     */
    function updateAgentStats(uint256 _index) external onlyStaker nonReentrant {
        (uint256 cTime, uint256 aTime,, address agent,,) = IProperty(DAO_PROPERTY).getGovProposalInfo(_index, 1);

        require(!__isVotePeriod(IProperty(DAO_PROPERTY).agentVotePeriod(), cTime), "uAS: vote period yet");
        require(aTime == 0, "uAS: already updated");

        AgentVoting memory av = agentVoting[_index];
        uint256 reason = 0;
        uint256 totalVoteCount = av.voteCount_1 + av.voteCount_2;
        // must be over 51%
        if (totalVoteCount >= IStakingPool(STAKING_POOL).getLimitCount() && av.stakeAmount_1 > av.stakeAmount_2) {
            IProperty(DAO_PROPERTY).updateGovProposal(_index, 1, 1);
            govPassedVoteCount[1] += 1;
        } else {
            IProperty(DAO_PROPERTY).updateGovProposal(_index, 1, 0);

            if (totalVoteCount < IStakingPool(STAKING_POOL).getLimitCount()) {
                reason = 1;
            } else if (av.stakeAmount_1 <= av.stakeAmount_2) {
                reason = 2;
            } else {
                reason = 10;
            }
        }

        emit UpdatedAgentStats(agent, msg.sender, reason, _index);
    }

    /**
     * @notice Dispute an auditor proposal.
     * @param _index Index of the proposal.
     * @param _pay True if disputing by paying double the proposal fee, false if disputing by staking double the
     * creators stake.
     * @dev Throws an error if the proposal status is not updated, or the dispute period has elapsed.
     * This flow will only be available when the vote period is over and the auditor proposal passed voting.
     * The user who wants to dispute has to either staked double the amount of the proposal creator or paid double of
     * the proposal fee amount.
     */
    function disputeToAgent(uint256 _index, bool _pay) external onlyStaker nonReentrant {
        (, uint256 aTime,, address agent,, Helper.Status stats) = IProperty(DAO_PROPERTY).getGovProposalInfo(_index, 1);

        require(stats == Helper.Status.UPDATED, "dTA: reject or not pass vote");
        require(__isVotePeriod(IProperty(DAO_PROPERTY).disputeGracePeriod(), aTime), "dTA: elapsed dispute period");

        // staked double than agent proposer or pay double of proposalFeeAmount
        if (_pay) {
            require(__paidDoubleFee(), "dTA: pay double");
        } else {
            require(isDoubleStaked(_index, msg.sender), "dTA: stake more");
        }

        IProperty(DAO_PROPERTY).updateGovProposal(_index, 1, 0);

        emit DisputedToAgent(msg.sender, agent, _index);
    }

    /**
     * @notice Replace the current Auditor based on vote results.
     * @param _index Index of the proposal.
     * @dev Throws an error if the proposal status is not updated or the dispute grace period has not ended.
     * This can only be called if no one disputes the auditor change during the dispute phase.
     * This will interact with the `Ownable` & `Property` contract to replace the auditor.
     */
    function replaceAuditor(uint256 _index) external onlyStaker nonReentrant {
        (, uint256 aTime,, address agent,, Helper.Status stats) = IProperty(DAO_PROPERTY).getGovProposalInfo(_index, 1);

        require(stats == Helper.Status.UPDATED, "rA: reject or not pass vote");
        require(!__isVotePeriod(IProperty(DAO_PROPERTY).disputeGracePeriod(), aTime), "rA: grace period yet");

        AgentVoting memory av = agentVoting[_index];
        uint256 totalVoteCount = av.voteCount_1 + av.voteCount_2;
        require(totalVoteCount >= IStakingPool(STAKING_POOL).getLimitCount(), "rA: e1");
        require(av.stakeAmount_1 > av.stakeAmount_2, "rA: e2");
        // require(av.stakeAmount_1 > IProperty(DAO_PROPERTY).disputLimitAmount(), "rA: e3");

        IOwnablee(OWNABLE).replaceAuditor(agent);

        IProperty(DAO_PROPERTY).updateGovProposal(_index, 1, 5); // update proposal status

        emit AuditorReplaced(agent, msg.sender);
    }

    /**
     * @notice Stakers vote on a proposal to set the address to receive the DAO pool funds.
     * @param _index Index of the proposal.
     * @param _voteInfo Vote information (1 for Yes, 2 for No).
     * @dev Throws an error if the caller is not a staker, has already voted, or the vote info is invalid.
     */
    function voteToRewardAddress(uint256 _index, uint256 _voteInfo) external onlyStaker nonReentrant {
        (uint256 cTime,, uint256 pID, address member, address creator,) =
            IProperty(DAO_PROPERTY).getGovProposalInfo(_index, 3);

        require(IProperty(DAO_PROPERTY).checkGovWhitelist(3, member) == 1, "vRA: not candidate");
        require(!isAttendToRewardAddressVote[msg.sender][_index], "vRA: already voted");
        require(_voteInfo == 1 || _voteInfo == 2, "vRA: bad vote info");
        require(msg.sender != creator, "vRA: self voted");
        require(cTime != 0, "vRA: no proposal");
        require(__isVotePeriod(IProperty(DAO_PROPERTY).rewardVotePeriod(), cTime), "vRA elapsed period");

        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);

        Voting storage rav = rewardAddressVoting[_index];
        if (_voteInfo == 1) {
            rav.stakeAmount_1 += stakeAmount; // Yes
            rav.voteCount_1++;
        } else {
            rav.stakeAmount_2 += stakeAmount; // No
            rav.voteCount_2++;
        }

        userGovernVoteCount[msg.sender] += 1;

        isAttendToRewardAddressVote[msg.sender][_index] = true;

        // for removing board member if he don't vote for some period
        lastVoteTime[msg.sender] = block.timestamp;
        // 1++ for calculating the rewards
        IStakingPool(STAKING_POOL).addVotedData(msg.sender, block.timestamp, pID);

        emit VotedToPoolAddress(msg.sender, member, _voteInfo, _index);
    }

    /**
     * @notice Finalize reward address proposal based on vote result.
     * @param _index Index of the proposal.
     * @dev Throws an error if the vote period has not ended or the proposal has already been approved.
     * This will interact with the `Property` contract and update the governance proposal to set the reward address
     * accordingly. This will also trigger the `migration` flow of the DAO.
     */
    function setDAORewardAddress(uint256 _index) external onlyStaker nonReentrant {
        (uint256 cTime, uint256 aTime,, address member,,) = IProperty(DAO_PROPERTY).getGovProposalInfo(_index, 3);

        require(IProperty(DAO_PROPERTY).checkGovWhitelist(3, member) == 1, "sRA: not candidate");
        require(!__isVotePeriod(IProperty(DAO_PROPERTY).rewardVotePeriod(), cTime), "sRA: vote period yet");
        require(aTime == 0, "sRA: already approved");

        uint256 reason = 0;
        Voting memory rav = rewardAddressVoting[_index];
        uint256 totalVoteCount = rav.voteCount_1 + rav.voteCount_2;
        if (
            totalVoteCount >= IStakingPool(STAKING_POOL).getLimitCount() // Less than limit count
                && rav.stakeAmount_1 > rav.stakeAmount_2 // less 51%
        ) {
            IProperty(DAO_PROPERTY).updateGovProposal(_index, 3, 1);
            govPassedVoteCount[4] += 1;
        } else {
            IProperty(DAO_PROPERTY).updateGovProposal(_index, 3, 0);

            if (totalVoteCount < IStakingPool(STAKING_POOL).getLimitCount()) {
                reason = 1;
            } else if (rav.stakeAmount_1 <= rav.stakeAmount_2) {
                reason = 2;
            } else {
                reason = 10;
            }
        }
        emit PoolAddressAdded(member, msg.sender, reason, _index);
    }

    /**
     * @notice Vote on multiple films in a single transaction.
     * @param _filmIds Array of film IDs to vote on.
     * @param _voteInfos Array of vote information (1 for Yes, 2 for No) corresponding to each film.
     * @dev Throws an error if the arrays are of different lengths or if any vote info is invalid.
     */
    function voteToFilms(uint256[] calldata _filmIds, uint256[] calldata _voteInfos) external onlyStaker nonReentrant {
        uint256 filmLength = _filmIds.length;
        require(filmLength != 0 && filmLength < 1000, "vF: zero length");
        require(filmLength == _voteInfos.length, "vF: Bad item length");

        for (uint256 i = 0; i < filmLength; ++i) {
            __voteToFilm(_filmIds[i], _voteInfos[i]);
        }
    }

    /**
     * @notice Approve multiple films that have passed their vote period.
     * @param _filmIds Array of film IDs to approve.
     * @dev Throws an error if the arrays are empty or exceed the maximum allowed length.
     */
    function approveFilms(uint256[] calldata _filmIds) external onlyStaker nonReentrant {
        uint256 filmLength = _filmIds.length;
        require(filmLength != 0 && filmLength < 1000, "aF: invalid items");

        for (uint256 i = 0; i < filmLength; ++i) {
            __approveFilm(_filmIds[i]);
        }
    }

    /**
     * @notice Save the proposal ID associated with a film ID.
     * @param _filmId The ID of the film.
     * @param _proposalID The ID of the proposal.
     */
    function saveProposalWithFilm(uint256 _filmId, uint256 _proposalID) external override {
        proposalFilmIds[_filmId] = _proposalID;
    }

    /**
     * @notice Get the last vote time of a member.
     * @dev This is used to track if a filmboard member can be removed because he didn't voted for a given time period.
     * @param _member The address of the member.
     * @return time_ The last vote time of the member.
     */
    function getLastVoteTime(address _member) external view override returns (uint256 time_) {
        time_ = lastVoteTime[_member];
    }

    /*//////////////////////////////////////////////////////////////
                                 PUBLIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Check if a user has staked double the amount of the auditor change proposer.
     * @dev This is used to check if a user can dispute a auditor proposal.
     * @param _index The index of the proposal.
     * @param _user The address of the user.
     * @return True if the user has staked double the amount, false otherwise.
     */
    function isDoubleStaked(uint256 _index, address _user) public view returns (bool) {
        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(_user);
        uint256 proposerAmount = IProperty(DAO_PROPERTY).getAgentProposerStakeAmount(_index);

        if (stakeAmount >= 2 * proposerAmount) {
            return true;
        } else {
            return false;
        }
    }

    /*//////////////////////////////////////////////////////////////
                                PRIVATE
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Function to handle voting on a film.
     * @param _filmId The ID of the film to vote on.
     * @param _voteInfo Vote information where 1 indicates 'Yes' and 2 indicates 'No'.
     * @dev This function handles the logic for voting on a film proposal.
     * It throws an error if:
     * - The caller is the owner of the film.
     * - The caller has already voted on this film.
     * - The provided vote information is not 1 or 2.
     * It also checks the status of the film and the voting period, and updates the voting records and the caller's vote
     * count.
     */
    function __voteToFilm(uint256 _filmId, uint256 _voteInfo) private {
        require(msg.sender != IVabbleDAO(VABBLE_DAO).getFilmOwner(_filmId), "vF: film owner");
        require(!isAttendToFilmVote[msg.sender][_filmId], "vF: already voted");
        require(_voteInfo == 1 || _voteInfo == 2, "vF: bad vote info");

        Helper.Status status = IVabbleDAO(VABBLE_DAO).getFilmStatus(_filmId);
        require(status == Helper.Status.UPDATED, "vF: not updated1");

        (uint256 cTime,) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId);
        require(cTime != 0, "vF: not updated2");
        require(__isVotePeriod(IProperty(DAO_PROPERTY).filmVotePeriod(), cTime), "vF: elapsed period");

        uint256 stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender);
        (,, uint256 fundType,) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);
        if (fundType == 0) {
            // in case of distribution(list) film
            // If film is for listing and voter is film board member, more weight(30%) per vote
            if (IProperty(DAO_PROPERTY).checkGovWhitelist(2, msg.sender) == 2) {
                stakeAmount += stakeAmount * IProperty(DAO_PROPERTY).boardVoteWeight() / 1e10; // (30+100)/100=1.3
            }
        }

        Voting storage fv = filmVoting[_filmId];
        if (_voteInfo == 1) {
            fv.stakeAmount_1 += stakeAmount; // Yes
            fv.voteCount_1++;
        } else {
            fv.stakeAmount_2 += stakeAmount; // No
            fv.voteCount_2++;
        }

        userFilmVoteCount[msg.sender] += 1;

        isAttendToFilmVote[msg.sender][_filmId] = true;

        // for removing board member if he don't vote for some period
        lastVoteTime[msg.sender] = block.timestamp;

        // 1++ for calculating the rewards
        IStakingPool(STAKING_POOL).addVotedData(msg.sender, block.timestamp, proposalFilmIds[_filmId]);

        emit VotedToFilm(msg.sender, _filmId, _voteInfo);
    }

    /**
     * @dev Function to approve a film based on voting results.
     * @param _filmId The ID of the film to approve.
     * @dev This function finalizes the film approval process based on the voting results.
     * It throws an error if:
     * - The voting period has not ended.
     * - The film has already been approved.
     * The function checks the voting outcomes and updates the film's approval status accordingly, also recording the
     * reason for the decision.
     */
    function __approveFilm(uint256 _filmId) private {
        Voting memory fv = filmVoting[_filmId];

        // Example: stakeAmount of "YES" is 2000 and stakeAmount("NO") is 1000 in 10 days(votePeriod)
        // In this case, Approved since 2000 > 1000 + 500 (it means ">50%") and stakeAmount of "YES" > 75m
        (uint256 pCreateTime, uint256 pApproveTime) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId);
        require(!__isVotePeriod(IProperty(DAO_PROPERTY).filmVotePeriod(), pCreateTime), "aF: vote period yet");
        require(pApproveTime == 0, "aF: already approved");

        (,, uint256 fundType,) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);
        uint256 reason = 0;
        uint256 totalVoteCount = fv.voteCount_1 + fv.voteCount_2;
        if (totalVoteCount >= IStakingPool(STAKING_POOL).getLimitCount() && fv.stakeAmount_1 > fv.stakeAmount_2) {
            reason = 0;
        } else {
            if (totalVoteCount < IStakingPool(STAKING_POOL).getLimitCount()) {
                reason = 1;
            } else if (fv.stakeAmount_1 <= fv.stakeAmount_2) {
                reason = 2;
            } else {
                reason = 10;
            }
        }

        IVabbleDAO(VABBLE_DAO).approveFilmByVote(_filmId, reason);

        emit FilmApproved(_filmId, fundType, reason);
    }

    /**
     * @dev Function to check if the proposal fee has been paid double.
     * @return paid_ Returns true if the fee has been paid double, otherwise false.
     * @dev This function verifies if the user has paid double the required proposal fee in VAB tokens.
     * A staker that wants to dispute a auditor proposal needs to either pay double the fee or stake double of the
     * creator.
     * It checks the user's balance, transfers the fee amount to the staking pool, and updates the staking pool's reward
     * balance.
     * The function returns true if the payment is successful, otherwise false.
     */
    function __paidDoubleFee() private returns (bool paid_) {
        uint256 amount = 2 * IProperty(DAO_PROPERTY).proposalFeeAmount();
        address usdcToken = IOwnablee(OWNABLE).USDC_TOKEN();
        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();
        uint256 expectVABAmount = IUniHelper(UNI_HELPER).expectedAmount(amount, usdcToken, vabToken);

        if (expectVABAmount > 0 && IERC20(vabToken).balanceOf(msg.sender) >= expectVABAmount) {
            Helper.safeTransferFrom(vabToken, msg.sender, address(this), expectVABAmount);
            if (IERC20(vabToken).allowance(address(this), STAKING_POOL) == 0) {
                Helper.safeApprove(vabToken, STAKING_POOL, IERC20(vabToken).totalSupply());
            }
            IStakingPool(STAKING_POOL).addRewardToPool(expectVABAmount);

            paid_ = true;
        }
    }

    /**
     * @dev Function to check if the vote period is still ongoing.
     * @param _period The duration of the vote period in seconds.
     * @param _startTime The start time of the vote period as a Unix timestamp.
     * @return Returns true if the vote period is still ongoing, otherwise false.
     * @dev This function calculates if the current time is within the vote period duration from the start time.
     * It throws an error if the start time is zero.
     */
    function __isVotePeriod(uint256 _period, uint256 _startTime) private view returns (bool) {
        require(_startTime != 0, "zero start time");
        if (_period >= block.timestamp - _startTime) return true;
        else return false;
    }
}
