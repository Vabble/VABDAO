// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IVote.sol";
import "../interfaces/IStakingPool.sol";
import "../interfaces/IOwnablee.sol";
import "../libraries/Helper.sol";

/**
 * @title Property Contract
 * @notice This contract manages various types of governance and property proposals
 *         within a decentralized autonomous organization (DAO). It facilitates
 *         proposals related to governance changes, property settings, and membership
 *         adjustments for different roles within the organization.
 *
 * @dev The contract allows major stakeholders and stakers to propose and vote on
 *      changes that impact the organization's governance, including adding or
 *      replacing auditors, adding new film board members, and modifying various
 *      operational parameters such as voting periods, fee amounts, and reward rates.
 *
 * @dev Major stakeholders, identified as those staking a significant amount of the
 *      organization's native token (VAB), have exclusive rights to propose changes
 *      such as adding auditors or modifying reward fund addresses.
 *
 * @dev Stakers, who hold tokens and participate in the organization's activities,
 *      can propose changes related to the film board membership and various other properties.
 *      They can also initiate the removal of film board members based on inactivity criteria.
 *
 * @dev The contract ensures that proposals are paid for using a fee mechanism,
 *      converting USDC tokens to VAB tokens via Uniswap. This fee is essential for
 *      incentivizing serious proposals and ensuring they are adequately funded.
 *
 * @dev Governance proposals and property proposals are tracked separately, with
 *      detailed information stored for each proposal type. This includes creation
 *      timestamps, approval statuses, proposal IDs, proposer addresses, and more.
 *
 * @dev Functions in this contract are restricted to specific roles (onlyMajor,
 *      onlyStaker) to maintain security and prevent unauthorized access to critical
 *      functions such as proposal creation, voting status updates, and membership
 *      adjustments.
 *
 * @dev Additionally, the contract provides public and external functions for querying
 *      proposal details, checking whitelist statuses of addresses and properties,
 *      and retrieving lists of active governance proposals and property proposals.
 *
 * @dev This contract forms a crucial part of the DAO's governance framework, ensuring
 *      that decisions are made transparently, securely, and in accordance with the
 *      organization's operational needs and community consensus.
 */
contract Property is ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                           TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev This structure contains information related to proposals that update governance properties of the contract.
     * @param title The title of the proposal
     * @param description The detailed description of the proposal
     * @param createTime The timestamp when the proposal was created
     * @param approveTime The timestamp when the proposal was approved
     * @param proposalID The unique identifier for the proposal
     * @param value The proposed new value for the governance property
     * @param creator The address of the creator of the proposal
     * @param status The current status of the proposal
     */
    struct ProProposal {
        string title;
        string description;
        uint256 createTime;
        uint256 approveTime;
        uint256 proposalID;
        uint256 value;
        address creator;
        Helper.Status status;
    }

    /**
     * @dev This structure contains information related to governance proposals such as Auditor change, Reward Address
     * allocation, and Filmboard Member addition or removal.
     * @param title The title of the proposal
     * @param description The detailed description of the proposal
     * @param createTime The timestamp when the proposal was created
     * @param approveTime The timestamp when the proposal was approved
     * @param proposalID The unique identifier for the proposal
     * @param value The proposed new address
     * @param creator The address of the creator of the proposal
     * @param status The current status of the proposal
     */
    struct GovProposal {
        string title;
        string description;
        uint256 createTime;
        uint256 approveTime;
        uint256 proposalID;
        address value;
        address creator;
        Helper.Status status;
    }

    /**
     * @dev This structure contains information about an agent in the context of auditor replacement proposals.
     * @param agent The address of the agent
     * @param stakeAmount The stake amount of the agent proposal creator
     */
    struct Agent {
        address agent;
        uint256 stakeAmount;
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    /// @dev The address of the Ownablee contract
    address private immutable OWNABLE;
    /// @dev The address of the Vote contract
    address private immutable VOTE;
    /// @dev The address of the StakingPool contract
    address private immutable STAKING_POOL;
    /// @dev The address of the UniHelper contract
    address private immutable UNI_HELPER;

    /**
     * @notice The address for sending the VAB from StakingPool, EdgePool and StudioPool when a proposal to change the
     * reward address passed.
     * @dev This is the address where all of the VAB tokens will be send when calling `StakingPool::withdrawAllFund()`.
     * This address will be updated to the address that was added in the proposal, once it has been finalized.
     */
    address public DAO_FUND_REWARD;

    ///@dev contains the minimum values for each property change
    uint256[] private minPropertyList;

    ///@dev contains the maximum values for each property change
    uint256[] private maxPropertyList;

    ///@notice total count of all governance proposals
    uint256 public governanceProposalCount;

    /// @dev List of agents proposed for replacing the auditor.
    Agent[] private agentList;

    /// @dev List of addresses proposed for receiving all pool funds (migrations proceess).
    address[] private rewardAddressList;

    /// @dev List of candidates proposed for the filmBoard.
    address[] private filmBoardCandidates;

    ///@dev List of current filmBoard members.
    address[] private filmBoardMembers;

    /**
     * @dev Whitelist status for governance roles (flag: 1 => agent, 2 => board, 3 => reward).
     * Maps flag to address and status (0: no, 1: candidate, 2: member).
     */
    mapping(uint256 => mapping(address => uint256)) private isGovWhitelist;

    /**
     * @dev Whitelist status for properties (flag => property i.e. 0 => filmVotePeriod).
     * Maps flag to property and status (0: no, 1: candidate, 2: member).
     */
    mapping(uint256 => mapping(uint256 => uint256)) private isPropertyWhitelist;

    /**
     * @dev Information about governance proposals. Maps flag to proposal index and proposal details.
     */
    mapping(uint256 => mapping(uint256 => GovProposal)) private govProposalInfo;

    /**
     * @dev Information about property proposals. Maps flag to proposal index and proposal details.
     */
    mapping(uint256 => mapping(uint256 => ProProposal)) private proProposalInfo;

    /**
     * @dev List of addresses associated with all governance proposals. Maps flag to address array.
     */
    mapping(uint256 => address[]) private allGovProposalInfo;

    /**
     * @dev Count of governance proposals created by each user. Maps user address to proposal count.
     */
    mapping(address => uint256) public userGovProposalCount;

    /*//////////////////////////////////////////////////////////////
                                PERIODS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice The amount of time a vote for a film proposal is open for
     * @dev index/flag : 0
     */
    uint256 public filmVotePeriod;
    uint256[] private filmVotePeriodList;

    /**
     * @notice The amount of time a vote to change the auditor is open for
     * @dev index/flag : 1
     */
    uint256 public agentVotePeriod;
    uint256[] private agentVotePeriodList;

    /**
     * @notice The amount of time the dispute period is open for, when a proposal to change the Auditor passed Voting
     * @dev index/flag : 2
     */
    uint256 public disputeGracePeriod;
    uint256[] private disputeGracePeriodList;

    /**
     * @notice The amount of time a vote to change a property state is open for
     * @dev index/flag : 3
     */
    uint256 public propertyVotePeriod;
    uint256[] private propertyVotePeriodList;

    /**
     * @notice The amount of time VAB tokens are locked when added to the staking pool contract.
     * @dev index/flag : 4
     */
    uint256 public lockPeriod;
    uint256[] private lockPeriodList;

    /**
     * @notice The period after the auditor can submit the films reward results
     * @dev index/flag : 6
     */
    uint256 public filmRewardClaimPeriod;
    uint256[] private filmRewardClaimPeriodList;

    /**
     * @notice The maximum allowed period (in seconds) for removing film board members due to inactivity.
     * @dev Used to check if a film board member has been inactive (i.e., not voting) for longer than this period.
     *      It also ensures that the most recent fund proposal creation is within this period.
     * @dev index/flag : 7
     */
    uint256 public maxAllowPeriod;
    uint256[] private maxAllowPeriodList;

    /**
     * @notice The amount of time a vote to add a film board member is open for
     * @dev index/flag : 16
     */
    uint256 public boardVotePeriod;
    uint256[] private boardVotePeriodList;

    /**
     * @notice The amount of time a vote to change the reward address (moving pool funds) is open for
     * @dev index/flag : 18
     */
    uint256 public rewardVotePeriod;
    uint256[] private rewardVotePeriodList;

    /*//////////////////////////////////////////////////////////////
                                 RATES
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice The amount of daily rewards for staking
     * (1% = 1e8, 100% = 1e10)
     * @dev index/flag : 5
     */
    uint256 public rewardRate;
    uint256[] private rewardRateList;

    /**
     * @notice The reward rate Film Board members receive on top of normal staking rewards
     * (1% = 1e8, 100% = 1e10)
     * @dev index/flag : 20
     */
    uint256 public boardRewardRate;
    uint256[] private boardRewardRateList;

    // @audit -info dead code
    // uint256 public disputLimitAmount;

    /*//////////////////////////////////////////////////////////////
                        FEES AND DEPOSIT AMOUNTS
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice The amount to submit a proposal to the DAO
     * @dev index/flag : 8
     */
    uint256 public proposalFeeAmount;
    uint256[] private proposalFeeAmountList;

    /**
     * @notice The amount of funding fees the DAO takes for film financing proposal raises.
     * @dev index/flag : 9
     */
    uint256 public fundFeePercent;
    uint256[] private fundFeePercentList;

    /**
     * @notice The minimum amount to deposit per individual on film financing proposals.
     * @dev index/flag : 10
     */
    uint256 public minDepositAmount;
    uint256[] private minDepositAmountList; // 10

    /**
     * @notice The maximum amount to deposit per individual on film financing proposals.
     * @dev index/flag : 11
     */
    uint256 public maxDepositAmount;
    uint256[] private maxDepositAmountList;

    /**
     * @notice The maximum percent fee Vab DAO takes for minting an NFT collection.
     * @dev index/flag : 12
     */
    uint256 public maxMintFeePercent;
    uint256[] private maxMintFeePercentList;

    /**
     * @notice The monthly fee rate for streaming content on Vabble Streaming.
     * @dev index/flag : 19
     */
    uint256 public subscriptionAmount;
    uint256[] private subscriptionAmountList;

    /*//////////////////////////////////////////////////////////////
                    VOTING AND STAKING REQUIREMENTS
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice The minimum amount of people that need to vote for a proposal to pass
     * @dev This variable represents the threshold count of voters required for a proposal to be considered valid.
     * @dev index/flag : 13
     */
    uint256 public minVoteCount;
    uint256[] private minVoteCountList;

    /**
     * @notice The minimum percentage of stakers that need to vote for a proposal to pass
     * @dev This percentage is used to calculate the required number of stakers based on the total staker count.
     * @dev index/flag: 14
     */
    uint256 public minStakerCountPercent;
    uint256[] private minStakerCountPercentList;

    /*//////////////////////////////////////////////////////////////
                                  MISC
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice The amount of VAB a user has to stake in order to create a proposal to change the auditor/reward address
     * @dev index/flag: 15
     */
    uint256 public availableVABAmount;
    uint256[] private availableVABAmountList;

    /**
     * @notice The percentage weight Film Board members have in voting on proposals.
     * @dev index/flag: 17
     */
    uint256 public boardVoteWeight;
    uint256[] private boardVoteWeightList;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Emitted when an auditor proposal is created
     * @param creator The address of the proposal creator
     * @param member The address of the proposed auditor
     * @param title The title of the proposal
     * @param description The description of the proposal
     */
    event AuditorProposalCreated(address indexed creator, address member, string title, string description);

    /**
     * @notice Emitted when a reward fund proposal is created
     * @param creator The address of the proposal creator
     * @param member The address of the proposed reward fund address
     * @param title The title of the proposal
     * @param description The description of the proposal
     */
    event RewardFundProposalCreated(address indexed creator, address member, string title, string description);

    /**
     * @notice Emitted when a film board proposal is created
     * @param creator The address of the proposal creator
     * @param member The address of the proposed film board member address
     * @param title The title of the proposal
     * @param description The description of the proposal
     */
    event FilmBoardProposalCreated(address indexed creator, address member, string title, string description);

    /**
     * @notice Emitted when a property proposal is created
     * @param creator The address of the proposal creator
     * @param property The proposed property value
     * @param flag The flag indicating the type of property
     * @param title The title of the proposal
     * @param description The description of the proposal
     */
    event PropertyProposalCreated(
        address indexed creator, uint256 property, uint256 flag, string title, string description
    );

    /**
     * @notice Emitted when a film board member is removed
     * @param caller The address of the caller who removed the member
     * @param member The address of the removed member
     */
    event FilmBoardMemberRemoved(address indexed caller, address member);

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /// @dev Restricts access to the Vote contract.
    modifier onlyVote() {
        require(msg.sender == VOTE, "caller is not the vote contract");
        _;
    }

    // @audit-issue low: unused modifier
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

    /// @notice Ensures that the caller is a major staker
    modifier onlyMajor() {
        require(IStakingPool(STAKING_POOL).getStakeAmount(msg.sender) >= availableVABAmount, "Not major");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Constructor to initialize the contract with required addresses and parameters
     * @dev Sets up the min and max allowed parameters for property changes
     * @param _ownable Address of the Ownablee contract
     * @param _uniHelper Address of the UniHelper contract
     * @param _vote Address of the Vote contract
     * @param _staking Address for sending the DAO rewards fund
     */
    constructor(address _ownable, address _uniHelper, address _vote, address _staking) {
        require(_ownable != address(0), "ownable: zero address");
        OWNABLE = _ownable;
        require(_uniHelper != address(0), "uniHelper: zero address");
        UNI_HELPER = _uniHelper;
        require(_vote != address(0), "vote: zero address");
        VOTE = _vote;
        require(_staking != address(0), "staking: zero address");
        STAKING_POOL = _staking;

        filmVotePeriod = 10 days;
        boardVotePeriod = 14 days;
        agentVotePeriod = 10 days;
        disputeGracePeriod = 30 days;
        propertyVotePeriod = 10 days;
        rewardVotePeriod = 7 days;
        lockPeriod = 30 days;
        maxAllowPeriod = 90 days;
        filmRewardClaimPeriod = 30 days;

        boardVoteWeight = 30 * 1e8; // 30% (1% = 1e8)
        rewardRate = 25 * 1e5; //40000;   // 0.0004% (1% = 1e8, 100%=1e10) // 2500000(0.025%)
        boardRewardRate = 25 * 1e8; // 25%
        fundFeePercent = 2 * 1e8; // percent(2%)
        maxMintFeePercent = 10 * 1e8; // 10%
        minStakerCountPercent = 5 * 1e8; // 5%(1% = 1e8, 100%=1e10)

        // @audit magic numbers everywhere 😥

        address usdcToken = IOwnablee(_ownable).USDC_TOKEN();
        address vabToken = IOwnablee(_ownable).PAYOUT_TOKEN();
        proposalFeeAmount = 20 * (10 ** IERC20Metadata(usdcToken).decimals()); // amount in cash(usd dollar - $20)
        minDepositAmount = 50 * (10 ** IERC20Metadata(usdcToken).decimals()); // amount in cash(usd dollar - $50)
        maxDepositAmount = 5000 * (10 ** IERC20Metadata(usdcToken).decimals()); // amount in cash(usd dollar - $5000)
        availableVABAmount = 50 * 1e6 * (10 ** IERC20Metadata(vabToken).decimals()); // 50M
        // disputLimitAmount = 75 * 1e6 * (10**IERC20Metadata(vabToken).decimals());    // 75M
        subscriptionAmount = 299 * (10 ** IERC20Metadata(usdcToken).decimals()) / 100; // amount in cash(usd dollar -
            // $2.99)
        minVoteCount = 1; //5;

        minPropertyList = [
            7 days, // 0:
            7 days, // 1:
            7 days, // 2:
            7 days, // 3:
            7 days, // 4:
            2 * 1e5, // 5: 0.002%
            1 days, // 6:
            7 days, // 7:
            20 * (10 ** IERC20Metadata(usdcToken).decimals()), //8: amount in cash(usd dollar - $20)
            2 * 1e8, // 9: percent(2%)
            5 * (10 ** IERC20Metadata(usdcToken).decimals()), // 10: amount in cash(usd dollar - $5)
            5 * (10 ** IERC20Metadata(usdcToken).decimals()), // 11: amount in cash(usd dollar - $5)
            1 * 1e8, // 12: 1%
            1, // 13:
            3 * 1e8, // 14: 3%
            50 * 1e6 * (10 ** IERC20Metadata(vabToken).decimals()), // 15: 50M
            7 days, // 16:
            5 * 1e8, // 17: 5% (1% = 1e8)
            7 days, // 18:
            299 * (10 ** IERC20Metadata(usdcToken).decimals()) / 100, // 19: amount in cash(usd dollar - $2.99)
            1 * 1e8 // 20: 1%
        ];

        maxPropertyList = [
            90 days, // 0:
            90 days, // 1:
            90 days, // 2:
            90 days, // 3:
            90 days, // 4:
            58 * 1e5, // 5: 0.058%
            90 days, // 6:
            90 days, // 7:
            500 * (10 ** IERC20Metadata(usdcToken).decimals()), //8: amount in cash(usd dollar - $500)
            10 * 1e8, // 9: percent(10%)
            10 * 1e6 * (10 ** IERC20Metadata(usdcToken).decimals()), // 10: amount in cash(usd dollar - $10,000,000)
            10 * 1e6 * (10 ** IERC20Metadata(usdcToken).decimals()), // 11: amount in cash(usd dollar - $10,000,000)
            10 * 1e8, // 12: 10%
            10, // 13:
            10 * 1e8, // 14: 10%
            200 * 1e6 * (10 ** IERC20Metadata(vabToken).decimals()), // 15: 200M
            90 days, // 16:
            30 * 1e8, // 17: 30% (1% = 1e8)
            90 days, // 18:
            9999 * (10 ** IERC20Metadata(usdcToken).decimals()) / 100, // 19: amount in cash(usd dollar - $99.99)
            20 * 1e8 // 20: 20%
        ];
    }

    /*//////////////////////////////////////////////////////////////
                                EXTERNAL
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Creates a proposal to update a specific property with the provided details.
     * @dev Only callable by a staker. Ensures the property and flag values are within valid ranges and that the
     * property is not already a candidate or the current value of the property.
     * @param _property The property value to propose.
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
     * @param _title The title of the proposal.
     * @param _description The description of the proposal.
     */
    function proposalProperty(
        uint256 _property,
        uint256 _flag,
        string memory _title,
        string memory _description
    )
        external
        onlyStaker
        nonReentrant
    {
        require(_property != 0 && _flag >= 0 && _flag < maxPropertyList.length, "pP: bad value");
        require(isPropertyWhitelist[_flag][_property] == 0, "pP: already candidate");
        require(minPropertyList[_flag] <= _property && _property <= maxPropertyList[_flag], "pP: invalid");

        __paidFee(proposalFeeAmount);

        uint256 len;
        if (_flag == 0) {
            require(filmVotePeriod != _property, "pP: already filmVotePeriod");
            len = filmVotePeriodList.length;
            filmVotePeriodList.push(_property);
        } else if (_flag == 1) {
            require(agentVotePeriod != _property, "pP: already agentVotePeriod");
            len = agentVotePeriodList.length;
            agentVotePeriodList.push(_property);
        } else if (_flag == 2) {
            require(disputeGracePeriod != _property, "pP: already disputeGracePeriod");
            len = disputeGracePeriodList.length;
            disputeGracePeriodList.push(_property);
        } else if (_flag == 3) {
            require(propertyVotePeriod != _property, "pP: already propertyVotePeriod");
            len = propertyVotePeriodList.length;
            propertyVotePeriodList.push(_property);
        } else if (_flag == 4) {
            require(lockPeriod != _property, "pP: already lockPeriod");
            len = lockPeriodList.length;
            lockPeriodList.push(_property);
        } else if (_flag == 5) {
            require(rewardRate != _property, "pP: already rewardRate");
            len = rewardRateList.length;
            rewardRateList.push(_property);
        } else if (_flag == 6) {
            require(filmRewardClaimPeriod != _property, "pP: already filmRewardClaimPeriod");
            len = filmRewardClaimPeriodList.length;
            filmRewardClaimPeriodList.push(_property);
        } else if (_flag == 7) {
            require(maxAllowPeriod != _property, "pP: already maxAllowPeriod");
            len = maxAllowPeriodList.length;
            maxAllowPeriodList.push(_property);
        } else if (_flag == 8) {
            require(proposalFeeAmount != _property, "pP: already proposalFeeAmount");
            len = proposalFeeAmountList.length;
            proposalFeeAmountList.push(_property);
        } else if (_flag == 9) {
            require(fundFeePercent != _property, "pP: already fundFeePercent");
            len = fundFeePercentList.length;
            fundFeePercentList.push(_property);
        } else if (_flag == 10) {
            require(minDepositAmount != _property, "pP: already minDepositAmount");
            len = minDepositAmountList.length;
            minDepositAmountList.push(_property);
        } else if (_flag == 11) {
            require(maxDepositAmount != _property, "pP: already maxDepositAmount");
            len = maxDepositAmountList.length;
            maxDepositAmountList.push(_property);
        } else if (_flag == 12) {
            require(maxMintFeePercent != _property, "pP: already maxMintFeePercent");
            len = maxMintFeePercentList.length;
            maxMintFeePercentList.push(_property);
        } else if (_flag == 13) {
            require(minVoteCount != _property, "pP: already minVoteCount");
            len = minVoteCountList.length;
            minVoteCountList.push(_property);
        } else if (_flag == 14) {
            require(minStakerCountPercent != _property, "pP: already minStakerCountPercent");
            len = minStakerCountPercentList.length;
            minStakerCountPercentList.push(_property);
        } else if (_flag == 15) {
            require(availableVABAmount != _property, "pP: already availableVABAmount");
            len = availableVABAmountList.length;
            availableVABAmountList.push(_property);
        } else if (_flag == 16) {
            require(boardVotePeriod != _property, "pP: already boardVotePeriod");
            len = boardVotePeriodList.length;
            boardVotePeriodList.push(_property);
        } else if (_flag == 17) {
            require(boardVoteWeight != _property, "pP: already boardVoteWeight");
            len = boardVoteWeightList.length;
            boardVoteWeightList.push(_property);
        } else if (_flag == 18) {
            require(rewardVotePeriod != _property, "pP: already rewardVotePeriod");
            len = rewardVotePeriodList.length;
            rewardVotePeriodList.push(_property);
        } else if (_flag == 19) {
            require(subscriptionAmount != _property, "pP: already subscriptionAmount");
            len = subscriptionAmountList.length;
            subscriptionAmountList.push(_property);
        } else if (_flag == 20) {
            require(boardRewardRate != _property, "pP: already boardRewardRate");
            len = boardRewardRateList.length;
            boardRewardRateList.push(_property);
        }

        ProProposal storage pp = proProposalInfo[_flag][len];
        pp.title = _title;
        pp.description = _description;
        pp.createTime = block.timestamp;
        pp.value = _property;
        pp.creator = msg.sender;
        pp.status = Helper.Status.LISTED;
        // add proposal data to array for calculating rewards
        pp.proposalID = IStakingPool(STAKING_POOL).addProposalData(msg.sender, block.timestamp, propertyVotePeriod);

        governanceProposalCount += 1;
        userGovProposalCount[msg.sender] += 1;
        isPropertyWhitelist[_flag][_property] = 1;

        emit PropertyProposalCreated(msg.sender, _property, _flag, _title, _description);
    }

    /**
     * @notice Updates the status of a property proposal.
     * If the proposal passed voting, this will update the property to the new value.
     * @dev Only callable by `Vote::updateProperty()` after the voting period has elapsed.
     * Updates the approval status and the whitelist status of the property.
     * @param _index The index of the proposal to update.
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
     * @param _approveStatus The approval status (1 for approved, 0 for rejected).
     */
    function updatePropertyProposal(uint256 _index, uint256 _flag, uint256 _approveStatus) external onlyVote {
        uint256 property = proProposalInfo[_flag][_index].value;

        // update approve time
        proProposalInfo[_flag][_index].approveTime = block.timestamp;

        // update approve status
        if (_approveStatus == 1) {
            proProposalInfo[_flag][_index].status = Helper.Status.UPDATED;
            isPropertyWhitelist[_flag][property] = 2;
        } else {
            proProposalInfo[_flag][_index].status = Helper.Status.REJECTED;
            isPropertyWhitelist[_flag][property] = 0;
        }

        // update main item
        if (_approveStatus == 1) {
            if (_flag == 0) {
                filmVotePeriod = property;
            } else if (_flag == 1) {
                agentVotePeriod = property;
            } else if (_flag == 2) {
                disputeGracePeriod = property;
            } else if (_flag == 3) {
                propertyVotePeriod = property;
            } else if (_flag == 4) {
                lockPeriod = property;
            } else if (_flag == 5) {
                rewardRate = property;
            } else if (_flag == 6) {
                filmRewardClaimPeriod = property;
            } else if (_flag == 7) {
                maxAllowPeriod = property;
            } else if (_flag == 8) {
                proposalFeeAmount = property;
            } else if (_flag == 9) {
                fundFeePercent = property;
            } else if (_flag == 10) {
                minDepositAmount = property;
            } else if (_flag == 11) {
                maxDepositAmount = property;
            } else if (_flag == 12) {
                maxMintFeePercent = property;
            } else if (_flag == 13) {
                minVoteCount = property;
            } else if (_flag == 14) {
                minStakerCountPercent = property;
            } else if (_flag == 15) {
                availableVABAmount = property;
            } else if (_flag == 16) {
                boardVotePeriod = property;
            } else if (_flag == 17) {
                boardVoteWeight = property;
            } else if (_flag == 18) {
                rewardVotePeriod = property;
            } else if (_flag == 19) {
                subscriptionAmount = property;
            } else if (_flag == 20) {
                boardRewardRate = property;
            }
        }
    }

    /**
     * @notice Creates a proposal to replace the current auditor with a new agent.
     * @dev Only callable by a major stakeholder (needs to stake at least `availableVABAmount`).
     * Ensures the agent is not already the auditor or a candidate.
     * @param _agent The address of the proposed new auditor.
     * @param _title The title of the proposal.
     * @param _description The description of the proposal.
     */
    function proposalAuditor(
        address _agent,
        string memory _title,
        string memory _description
    )
        external
        onlyMajor
        nonReentrant
    {
        require(_agent != address(0), "pA: zero");
        require(IOwnablee(OWNABLE).auditor() != _agent, "pA: already auditor");
        require(isGovWhitelist[1][_agent] == 0, "pA: already candidate");

        __paidFee(proposalFeeAmount);

        GovProposal storage ap = govProposalInfo[1][agentList.length];
        ap.title = _title;
        ap.description = _description;
        ap.createTime = block.timestamp;
        ap.value = _agent;
        ap.creator = msg.sender;
        ap.status = Helper.Status.LISTED;
        // add proposal data to array for calculating rewards
        ap.proposalID = IStakingPool(STAKING_POOL).addProposalData(msg.sender, block.timestamp, agentVotePeriod);

        governanceProposalCount += 1;
        userGovProposalCount[msg.sender] += 1;
        isGovWhitelist[1][_agent] = 1;
        allGovProposalInfo[1].push(_agent);
        agentList.push(Agent(_agent, IStakingPool(STAKING_POOL).getStakeAmount(msg.sender)));

        emit AuditorProposalCreated(msg.sender, _agent, _title, _description);
    }

    /**
     * @notice Creates a proposal to add a new reward fund address.
     * This will be used if we need to do a migration to a new DAO.
     * The address proposed will receive all of the VAB from the Edge,Studio and StakingPool.
     * @dev Only callable by a major stakeholder (needs to stake at least `availableVABAmount`).
     * Ensures the address is not already a candidate.
     * @param _rewardAddress The address proposed to receive all of the tokens.
     * @param _title The title of the proposal.
     * @param _description The description of the proposal.
     */
    function proposalRewardFund(
        address _rewardAddress,
        string memory _title,
        string memory _description
    )
        external
        onlyMajor
        nonReentrant
    {
        require(_rewardAddress != address(0), "pRF: zero");
        require(isGovWhitelist[3][_rewardAddress] == 0, "pRF: already candidate");

        __paidFee(10 * proposalFeeAmount);

        GovProposal storage rp = govProposalInfo[3][rewardAddressList.length];
        rp.title = _title;
        rp.description = _description;
        rp.createTime = block.timestamp;
        rp.value = _rewardAddress;
        rp.creator = msg.sender;
        rp.status = Helper.Status.LISTED;
        // add proposal data to array for calculating rewards
        rp.proposalID = IStakingPool(STAKING_POOL).addProposalData(msg.sender, block.timestamp, rewardVotePeriod);

        isGovWhitelist[3][_rewardAddress] = 1;
        governanceProposalCount += 1;
        userGovProposalCount[msg.sender] += 1;
        allGovProposalInfo[3].push(_rewardAddress);
        rewardAddressList.push(_rewardAddress);

        emit RewardFundProposalCreated(msg.sender, _rewardAddress, _title, _description);
    }

    /**
     * @notice Creates a proposal to add a new member to the film board.
     * @dev Only callable by a staker. Ensures the member is not already a candidate.
     * @param _member The address of the proposed new film board member.
     * @param _title The title of the proposal.
     * @param _description The description of the proposal.
     */
    function proposalFilmBoard(
        address _member,
        string memory _title,
        string memory _description
    )
        external
        onlyStaker
        nonReentrant
    {
        require(_member != address(0), "pFB: zero");
        require(isGovWhitelist[2][_member] == 0, "pFB: already candidate");

        __paidFee(proposalFeeAmount);

        GovProposal storage bp = govProposalInfo[2][filmBoardCandidates.length];
        bp.title = _title;
        bp.description = _description;
        bp.createTime = block.timestamp;
        bp.value = _member;
        bp.creator = msg.sender;
        bp.status = Helper.Status.LISTED;
        // add proposal data to array for calculating rewards
        bp.proposalID = IStakingPool(STAKING_POOL).addProposalData(msg.sender, block.timestamp, boardVotePeriod);

        isGovWhitelist[2][_member] = 1;
        governanceProposalCount += 1;
        userGovProposalCount[msg.sender] += 1;
        allGovProposalInfo[2].push(_member);
        filmBoardCandidates.push(_member);

        emit FilmBoardProposalCreated(msg.sender, _member, _title, _description);
    }

    /**
     * @notice Updates the status of a governance proposal.
     * If the proposal passed voting, this will update the property to the new value.
     * @dev Only callable by the Vote contract. Updates the approval status and the whitelist status of the member.
     *
     * @param _index The index of the proposal to update.
     * @param _flag The flag representing the type of proposal (1 for agent, 2 for board, 3 for pool).
     * @param _approveStatus The approval status (1 for approved, 0 for rejected, 5 for replaced).
     */
    function updateGovProposal(
        uint256 _index,
        uint256 _flag, // 1=>agent, 2=>board, 3=>pool
        uint256 _approveStatus // 1/0
    )
        external
        onlyVote
    {
        address member = govProposalInfo[_flag][_index].value;

        // update approve time
        govProposalInfo[_flag][_index].approveTime = block.timestamp;

        // update approve status
        if (_approveStatus == 5) {
            // replaced
            govProposalInfo[_flag][_index].status = Helper.Status.REPLACED;
            isGovWhitelist[_flag][member] = 2;
        } else if (_approveStatus == 1) {
            govProposalInfo[_flag][_index].status = Helper.Status.UPDATED;
            isGovWhitelist[_flag][member] = 2;
        } else {
            govProposalInfo[_flag][_index].status = Helper.Status.REJECTED;
            isGovWhitelist[_flag][member] = 0;
        }

        // update main item
        if (_flag == 3 && _approveStatus == 1) {
            DAO_FUND_REWARD = member;
            IStakingPool(STAKING_POOL).calcMigrationVAB();
        }

        if (_flag == 2 && _approveStatus == 1) {
            filmBoardMembers.push(member);
        }
    }

    /**
     * @notice Removes a film board member from the whitelist if they haven't voted on any proposal within the maximum
     * allowed period.
     * @dev Only callable by a staker. Ensures the member meets the inactivity criteria by checking their last vote time
     * and the most recent fund proposal creation time.
     * @param _member The address of the film board member to remove.
     * Requirements:
     * - The member must be an active film board member (isGovWhitelist[2][_member] == 2).
     * - The member's last vote must be older than the `maxAllowPeriod`.
     * - The most recent fund proposal creation time must be within the `maxAllowPeriod`.
     */
    function removeFilmBoardMember(address _member) external onlyStaker nonReentrant {
        require(isGovWhitelist[2][_member] == 2, "rFBM: not board member");
        require(maxAllowPeriod < block.timestamp - IVote(VOTE).getLastVoteTime(_member), "rFBM: e1");
        require(maxAllowPeriod > block.timestamp - IStakingPool(STAKING_POOL).lastfundProposalCreateTime(), "rFBM: e2");

        __removeBoardMember(_member);

        isGovWhitelist[2][_member] = 0;

        emit FilmBoardMemberRemoved(msg.sender, _member);
    }

    /**
     * @notice Retrieves the list of addresses for a specific governance proposal type.
     * @param _flag The flag representing the type of proposal (1 for agentList, 2 for boardCandidateList, 3 for
     * rewardAddressList, 4 for filmBoardMembers).
     * @return The list of addresses corresponding to the proposal type.
     */
    function getGovProposalList(uint256 _flag) external view returns (address[] memory) {
        require(_flag != 0 && _flag < 5, "bad flag");

        if (_flag == 1) {
            address[] memory list = new address[](agentList.length);
            for (uint256 k = 0; k < agentList.length; k++) {
                list[k] = agentList[k].agent;
            }
            return list;
        } else if (_flag == 2) {
            return filmBoardCandidates;
        } else if (_flag == 3) {
            return rewardAddressList;
        } else {
            return filmBoardMembers;
        }
    }

    /**
     * @notice Retrieves detailed information about a specific governance proposal.
     * @param _index The index of the proposal.
     * @param _flag The flag representing the type of proposal (1 for agent, 2 for board, 3 for reward address).
     * @return The creation time, approval time, proposal ID, value address, creator address, and status of the
     * proposal.
     */
    function getGovProposalInfo(
        uint256 _index,
        uint256 _flag
    )
        external
        view
        returns (uint256, uint256, uint256, address, address, Helper.Status)
    {
        GovProposal memory rp = govProposalInfo[_flag][_index];
        uint256 cTime_ = rp.createTime;
        uint256 aTime_ = rp.approveTime;
        uint256 pID_ = rp.proposalID;
        address value_ = rp.value;
        address creator_ = rp.creator;
        Helper.Status status_ = rp.status;

        return (cTime_, aTime_, pID_, value_, creator_, status_);
    }

    /**
     * @notice Retrieves the title and description of a specific governance proposal.
     * @param _index The index of the proposal.
     * @param _flag The flag representing the type of proposal.
     * @return The title and description of the proposal.
     */
    function getGovProposalStr(uint256 _index, uint256 _flag) external view returns (string memory, string memory) {
        GovProposal memory rp = govProposalInfo[_flag][_index];
        string memory title_ = rp.title;
        string memory desc_ = rp.description;

        return (title_, desc_);
    }

    /**
     * @notice Retrieves detailed information about a specific property proposal.
     * @param _index The index of the proposal.
     * @param _flag The flag representing the type of proposal.
     * @return The creation time, approval time, proposal ID, property value, creator address, and status of the
     * proposal.
     */
    function getPropertyProposalInfo(
        uint256 _index,
        uint256 _flag
    )
        external
        view
        returns (uint256, uint256, uint256, uint256, address, Helper.Status)
    {
        ProProposal memory rp = proProposalInfo[_flag][_index];
        uint256 cTime_ = rp.createTime;
        uint256 aTime_ = rp.approveTime;
        uint256 pID_ = rp.proposalID;
        uint256 value_ = rp.value;
        address creator_ = rp.creator;
        Helper.Status status_ = rp.status;

        return (cTime_, aTime_, pID_, value_, creator_, status_);
    }

    /**
     * @notice Retrieves the title and description of a specific property proposal.
     * @param _index The index of the proposal.
     * @param _flag The flag representing the type of proposal.
     * @return The title and description of the proposal.
     */
    function getPropertyProposalStr(
        uint256 _index,
        uint256 _flag
    )
        external
        view
        returns (string memory, string memory)
    {
        ProProposal memory rp = proProposalInfo[_flag][_index];
        string memory title_ = rp.title;
        string memory desc_ = rp.description;

        return (title_, desc_);
    }

    /**
     * @notice Retrieves the stake amount of an agent proposer.
     * @dev This is used on the Vote contract for the auditor dispute flow.
     * We need to check if the user who disputes the proposal has staked double the amount
     * of the creator of the auditor change proposal.
     * @param _index The index of the agent in the agent list.
     * @return The stake amount of the agent proposer.
     */
    function getAgentProposerStakeAmount(uint256 _index) external view returns (uint256) {
        return agentList[_index].stakeAmount;
    }

    /**
     * @notice Checks the whitelist status of a governance address.
     * @param _flag The flag representing the type of governance address.
     * @param _address The address to check.
     * @return The whitelist status of the address.
     */
    function checkGovWhitelist(uint256 _flag, address _address) external view returns (uint256) {
        return isGovWhitelist[_flag][_address];
    }

    /**
     * @notice Checks the whitelist status of a property.
     * @param _flag The flag representing the type of property.
     * @param _property The property to check.
     * @return The whitelist status of the property.
     */
    function checkPropertyWhitelist(uint256 _flag, uint256 _property) external view returns (uint256) {
        return isPropertyWhitelist[_flag][_property];
    }

    /**
     * @notice Retrieves all governance proposal information for a specific flag.
     * @param _flag The flag representing the type of governance proposals (1: auditor, 2: film board member, 3: reward
     * address)
     * @return The list of addresses for the governance proposals.
     */
    function getAllGovProposalInfo(uint256 _flag) external view returns (address[] memory) {
        return allGovProposalInfo[_flag];
    }

    /*//////////////////////////////////////////////////////////////
                                 PUBLIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Retrieves the list of property proposals for a specified flag.
     * @param _flag The flag representing the type of property proposal list to retrieve.
     *              0 - Film Vote Period List
     *              1 - Agent Vote Period List
     *              2 - Dispute Grace Period List
     *              3 - Property Vote Period List
     *              4 - Lock Period List
     *              5 - Reward Rate List
     *              6 - Film Reward Claim Period List
     *              7 - Max Allow Period List
     *              8 - Proposal Fee Amount List
     *              9 - Fund Fee Percent List
     *              10 - Minimum Deposit Amount List
     *              11 - Maximum Deposit Amount List
     *              12 - Maximum Mint Fee Percent List
     *              13 - Minimum Vote Count List
     *              14 - Minimum Staker Count Percent List
     *              15 - Available VAB Amount List
     *              16 - Board Vote Period List
     *              17 - Board Vote Weight List
     *              18 - Reward Vote Period List
     *              19 - Subscription Amount List
     *              20 - Board Reward Rate List
     * @return _list The list of property proposals corresponding to the specified flag.
     */
    function getPropertyProposalList(uint256 _flag) public view returns (uint256[] memory _list) {
        if (_flag == 0) _list = filmVotePeriodList;
        else if (_flag == 1) _list = agentVotePeriodList;
        else if (_flag == 2) _list = disputeGracePeriodList;
        else if (_flag == 3) _list = propertyVotePeriodList;
        else if (_flag == 4) _list = lockPeriodList;
        else if (_flag == 5) _list = rewardRateList;
        else if (_flag == 6) _list = filmRewardClaimPeriodList;
        else if (_flag == 7) _list = maxAllowPeriodList;
        else if (_flag == 8) _list = proposalFeeAmountList;
        else if (_flag == 9) _list = fundFeePercentList;
        else if (_flag == 10) _list = minDepositAmountList;
        else if (_flag == 11) _list = maxDepositAmountList;
        else if (_flag == 12) _list = maxMintFeePercentList;
        else if (_flag == 13) _list = minVoteCountList;
        else if (_flag == 14) _list = minStakerCountPercentList;
        else if (_flag == 15) _list = availableVABAmountList;
        else if (_flag == 16) _list = boardVotePeriodList;
        else if (_flag == 17) _list = boardVoteWeightList;
        else if (_flag == 18) _list = rewardVotePeriodList;
        else if (_flag == 19) _list = subscriptionAmountList;
        else if (_flag == 20) _list = boardRewardRateList;
    }

    /*//////////////////////////////////////////////////////////////
                                PRIVATE
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Ensures the proposal fee is paid by transferring the expected amount of VAB tokens from the user to the
     * staking pool.
     * @dev Converts the specified amount of USDC to the expected amount of VAB using Uniswap, then transfers the VAB to
     * the staking pool.
     * @param _payAmount The amount of USDC to be converted to VAB and paid as the proposal fee.
     */
    function __paidFee(uint256 _payAmount) private {
        address usdcToken = IOwnablee(OWNABLE).USDC_TOKEN();
        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();
        uint256 expectVABAmount = IUniHelper(UNI_HELPER).expectedAmount(_payAmount, usdcToken, vabToken);

        require(expectVABAmount != 0, "pFee: Not paid fee");

        Helper.safeTransferFrom(vabToken, msg.sender, address(this), expectVABAmount);
        if (IERC20(vabToken).allowance(address(this), STAKING_POOL) == 0) {
            Helper.safeApprove(vabToken, STAKING_POOL, IERC20(vabToken).totalSupply());
        }
        IStakingPool(STAKING_POOL).addRewardToPool(expectVABAmount);
    }

    /**
     * @dev Removes a film board member from the list.
     * @dev Finds the member in the film board members list and removes them by swapping with the last element and
     * reducing the list length.
     * @param _member The address of the film board member to remove.
     */
    function __removeBoardMember(address _member) private {
        for (uint256 k = 0; k < filmBoardMembers.length; k++) {
            if (_member == filmBoardMembers[k]) {
                filmBoardMembers[k] = filmBoardMembers[filmBoardMembers.length - 1];
                filmBoardMembers.pop();
                break;
            }
        }
    }
}
