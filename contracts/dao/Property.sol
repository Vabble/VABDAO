// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/Helper.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IVote.sol";
import "../interfaces/IStakingPool.sol";
import "../interfaces/IOwnablee.sol";

import "../libraries/ConfigLibrary.sol";

contract Property is ReentrancyGuard {
    using ConfigLibrary for ConfigLibrary.PropertyTimePeriodConfig;
    using ConfigLibrary for ConfigLibrary.PropertyRatesConfig;
    using ConfigLibrary for ConfigLibrary.PropertyAmountsConfig;

    event AuditorProposalCreated(address indexed creator, address member, string title, string description);
    event RewardFundProposalCreated(address indexed creator, address member, string title, string description);
    event FilmBoardProposalCreated(address indexed creator, address member, string title, string description);
    event FilmBoardMemberRemoved(address indexed caller, address member);
    event PropertyProposalCreated(
        address indexed creator, uint256 property, uint256 flag, string title, string description
    );

    struct ProProposal {
        string title; // title
        string description; // description
        uint256 createTime; // created timestamp
        uint256 approveTime; // approved timestamp
        uint256 proposalID; // ID
        uint256 value; // property
        address creator; // creator address
        Helper.Status status; // status
    }

    struct GovProposal {
        string title; // title
        string description; // description
        uint256 createTime; // created timestamp
        uint256 approveTime; // approved timestamp
        uint256 proposalID; // ID
        address value; // address
        address creator; // creator address
        Helper.Status status; // status
    }

    struct Agent {
        address agent; // agent address
        uint256 stakeAmount; // stake amount of agent proposal creator
    }

    address private immutable OWNABLE; // Ownablee contract address
    address private immutable VOTE; // Vote contract address
    address private immutable STAKING_POOL; // StakingPool contract address
    address private immutable UNI_HELPER; // UniHelper contract address
    address public DAO_FUND_REWARD; // address for sending the DAO rewards fund

    uint256 public filmVotePeriod; // 0 - film vote period
    uint256 public agentVotePeriod; // 1 - vote period for replacing auditor
    uint256 public disputeGracePeriod; // 2 - grace period for replacing Auditor
    uint256 public propertyVotePeriod; // 3 - vote period for updating properties
    uint256 public lockPeriod; // 4 - lock period for staked VAB
    uint256 public rewardRate; // 5 - day rewards rate => 0.0004%(1% = 1e8, 100% = 1e10)
    uint256 public filmRewardClaimPeriod; // 6 - period when the auditor can submit the films reward results to be
        // claimed
    uint256 public maxAllowPeriod; // 7 - max allowed period for removing filmBoard member
    uint256 public proposalFeeAmount; // 8 - USDC amount($100) studio should pay when create a proposal
    uint256 public fundFeePercent; // 9 - percent(2% = 2*1e8) of fee on the amount raised
    uint256 public minDepositAmount; // 10 - USDC min amount($50) that a customer can deposit to a film approved for
        // funding
    uint256 public maxDepositAmount; // 11 - USDC max amount($5000) that a customer can deposit to a film approved for
        // funding
    uint256 public maxMintFeePercent; // 12 - 10%(1% = 1e8, 100% = 1e10)
    uint256 public minVoteCount; // 13 - 5 ppl(minium voter count for approving the proposal)
    uint256 public minStakerCountPercent; // 14 - percent(5% = 5*1e8)
    uint256 public availableVABAmount; // 15 - vab amount for replacing the auditor
    uint256 public boardVotePeriod; // 16 - filmBoard vote period
    uint256 public boardVoteWeight; // 17 - filmBoard member's vote weight
    uint256 public rewardVotePeriod; // 18 - withdraw address setup for moving to V2
    uint256 public subscriptionAmount; // 19 - user need to have an active subscription(pay $1 per month) for rent
        // films.
    uint256 public boardRewardRate; // 20 - 25%(1% = 1e8, 100% = 1e10) more reward rate for filmboard members

    uint256[] private maxPropertyList;
    uint256[] private minPropertyList;
    uint256 public governanceProposalCount;

    uint256[] private filmVotePeriodList; // 0
    uint256[] private agentVotePeriodList; // 1
    uint256[] private disputeGracePeriodList; // 2
    uint256[] private propertyVotePeriodList; // 3
    uint256[] private lockPeriodList; // 4
    uint256[] private rewardRateList; // 5
    uint256[] private filmRewardClaimPeriodList; // 6
    uint256[] private maxAllowPeriodList; // 7
    uint256[] private proposalFeeAmountList; // 8
    uint256[] private fundFeePercentList; // 9
    uint256[] private minDepositAmountList; // 10
    uint256[] private maxDepositAmountList; // 11
    uint256[] private maxMintFeePercentList; // 12
    uint256[] private minVoteCountList; // 13
    uint256[] private minStakerCountPercentList; // 14
    uint256[] private availableVABAmountList; // 15
    uint256[] private boardVotePeriodList; // 16
    uint256[] private boardVoteWeightList; // 17
    uint256[] private rewardVotePeriodList; // 18
    uint256[] private subscriptionAmountList; // 19
    uint256[] private boardRewardRateList; // 20

    Agent[] private agentList; // for replacing auditor
    address[] private rewardAddressList; // for adding v2 pool address
    address[] private filmBoardCandidates; // filmBoard candidates and if isBoardWhitelist is true, become filmBoard
        // member
    address[] private filmBoardMembers; // filmBoard members

    // flag=1 =>agent, 2=>board, 3=>reward
    mapping(uint256 => mapping(address => uint256)) private isGovWhitelist; // (flag => (address => 0: no, 1: candiate,
        // 2: member))
    mapping(uint256 => mapping(uint256 => uint256)) private isPropertyWhitelist; // (flag => (property => 0: no, 1:
        // candiate, 2: member))
    mapping(uint256 => mapping(uint256 => GovProposal)) private govProposalInfo; // (flag => (index => Proposal))
    mapping(uint256 => mapping(uint256 => ProProposal)) private proProposalInfo; // (flag => (index => Proposal))
    mapping(uint256 => address[]) private allGovProposalInfo; // (flag => address array))
    mapping(address => uint256) public userGovProposalCount; // (user => created governance-proposal count)

    modifier onlyVote() {
        require(msg.sender == VOTE, "caller is not the vote contract");
        _;
    }

    modifier onlyDeployer() {
        require(msg.sender == IOwnablee(OWNABLE).deployer(), "caller is not the deployer");
        _;
    }

    modifier onlyStaker() {
        require(IStakingPool(STAKING_POOL).getStakeAmount(msg.sender) != 0, "Not staker");
        _;
    }

    modifier onlyMajor() {
        require(IStakingPool(STAKING_POOL).getStakeAmount(msg.sender) >= availableVABAmount, "Not major");
        _;
    }

    constructor(
        address _ownable,
        address _uniHelper,
        address _vote,
        address _staking,
        ConfigLibrary.PropertyTimePeriodConfig memory _timePeriodConfig,
        ConfigLibrary.PropertyRatesConfig memory _ratesConfig,
        ConfigLibrary.PropertyAmountsConfig memory _amountsConfig,
        ConfigLibrary.PropertyMinMaxListConfig memory _minMaxListConfig
    ) {
        require(_ownable != address(0), "ownable: zero address");
        require(_uniHelper != address(0), "uniHelper: zero address");
        require(_vote != address(0), "vote: zero address");
        require(_staking != address(0), "staking: zero address");

        OWNABLE = _ownable;
        UNI_HELPER = _uniHelper;
        VOTE = _vote;
        STAKING_POOL = _staking;

        filmVotePeriod = _timePeriodConfig.filmVotePeriod;
        boardVotePeriod = _timePeriodConfig.boardVotePeriod;
        agentVotePeriod = _timePeriodConfig.agentVotePeriod;
        disputeGracePeriod = _timePeriodConfig.disputeGracePeriod;
        propertyVotePeriod = _timePeriodConfig.propertyVotePeriod;
        rewardVotePeriod = _timePeriodConfig.rewardVotePeriod;
        lockPeriod = _timePeriodConfig.lockPeriod;
        maxAllowPeriod = _timePeriodConfig.maxAllowPeriod;
        filmRewardClaimPeriod = _timePeriodConfig.filmRewardClaimPeriod;

        boardVoteWeight = _ratesConfig.boardVoteWeight;
        rewardRate = _ratesConfig.rewardRate;
        boardRewardRate = _ratesConfig.boardRewardRate;
        fundFeePercent = _ratesConfig.fundFeePercent;
        maxMintFeePercent = _ratesConfig.maxMintFeePercent;
        minStakerCountPercent = _ratesConfig.minStakerCountPercent;

        proposalFeeAmount = _amountsConfig.proposalFeeAmount;
        minDepositAmount = _amountsConfig.minDepositAmount;
        maxDepositAmount = _amountsConfig.maxDepositAmount;
        availableVABAmount = _amountsConfig.availableVABAmount;
        subscriptionAmount = _amountsConfig.subscriptionAmount;

        minVoteCount = _amountsConfig.minVoteCount;

        minPropertyList = _minMaxListConfig.minPropertyList;
        maxPropertyList = _minMaxListConfig.maxPropertyList;
    }

    /// =================== proposals for replacing auditor ==============
    /// @notice Anyone($100 fee in VAB) create a proposal for replacing Auditor
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

    /// @notice Check if proposal fee transferred from studio to stakingPool
    // Get expected VAB amount from UniswapV2 and then Transfer VAB: user(studio) -> stakingPool.
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

    // =================== DAO fund rewards proposal ====================
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

    // =================== FilmBoard proposal ====================
    /// @notice Anyone($100 fee of VAB) create a proposal with the case to be added to film board
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

    /// @notice Remove a member from whitelist if he didn't vote to any propsoal for over 3 months
    function removeFilmBoardMember(address _member) external onlyStaker nonReentrant {
        require(isGovWhitelist[2][_member] == 2, "rFBM: not board member");
        require(maxAllowPeriod < block.timestamp - IVote(VOTE).getLastVoteTime(_member), "rFBM: e1");
        require(maxAllowPeriod > block.timestamp - IStakingPool(STAKING_POOL).lastfundProposalCreateTime(), "rFBM: e2");

        __removeBoardMember(_member);

        isGovWhitelist[2][_member] = 0;

        emit FilmBoardMemberRemoved(msg.sender, _member);
    }

    function __removeBoardMember(address _member) private {
        for (uint256 k = 0; k < filmBoardMembers.length; k++) {
            if (_member == filmBoardMembers[k]) {
                filmBoardMembers[k] = filmBoardMembers[filmBoardMembers.length - 1];
                filmBoardMembers.pop();
                break;
            }
        }
    }

    /// @notice Get gov address list
    // (1=>agentList, 2=>boardCandidateList, 3=>rewardAddressList, 4=>rest=>boardMemberList)
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

    /// @notice Get agent list
    function getAgentProposerStakeAmount(uint256 _index) external view returns (uint256) {
        return agentList[_index].stakeAmount;
    }

    /// @notice Get govProposalInfo(agent=>1, board=>2, pool=>3)
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

    function getGovProposalStr(uint256 _index, uint256 _flag) external view returns (string memory, string memory) {
        GovProposal memory rp = govProposalInfo[_flag][_index];
        string memory title_ = rp.title;
        string memory desc_ = rp.description;

        return (title_, desc_);
    }

    // ===================properties proposal ====================
    /// @notice proposals for properties
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
        require(_property != 0 && _flag < maxPropertyList.length, "pP: bad value");
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

    /// @notice Get property proposal list
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

    /// @notice Get property proposal created time
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

    function checkGovWhitelist(uint256 _flag, address _address) external view returns (uint256) {
        return isGovWhitelist[_flag][_address];
    }

    function checkPropertyWhitelist(uint256 _flag, uint256 _property) external view returns (uint256) {
        return isPropertyWhitelist[_flag][_property];
    }

    function getAllGovProposalInfo(uint256 _flag) external view returns (address[] memory) {
        return allGovProposalInfo[_flag];
    }

    function getMinPropertyList(uint256 _index) external view returns (uint256) {
        return minPropertyList[_index];
    }

    function getMaxPropertyList(uint256 _index) external view returns (uint256) {
        return maxPropertyList[_index];
    }
}
