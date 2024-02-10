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

contract Property is ReentrancyGuard {

    event AuditorProposalCreated(address indexed creator, address member, string title, string description);
    event RewardFundProposalCreated(address indexed creator, address member, string title, string description);
    event FilmBoardProposalCreated(address indexed creator, address member, string title, string description);
    event FilmBoardMemberRemoved(address indexed caller, address member);
    event PropertyProposalCreated(address indexed creator, uint256 property, uint256 flag, string title, string description);
    
    struct Proposal {
        string title;          // proposal title
        string description;    // proposal description
        uint256 createTime;    // proposal created timestamp
        uint256 approveTime;   // proposal approved timestamp
        address creator;       // proposal creator address        
        Helper.Status status;  // status of proposal
    }
  
    address private immutable OWNABLE;        // Ownablee contract address 
    address private immutable VOTE;           // Vote contract address
    address private immutable STAKING_POOL;   // StakingPool contract address
    address private immutable UNI_HELPER;     // UniHelper contract address
    address public DAO_FUND_REWARD;       // address for sending the DAO rewards fund

    uint256 public filmVotePeriod;       // 0 - film vote period
    uint256 public agentVotePeriod;      // 1 - vote period for replacing auditor
    uint256 public disputeGracePeriod;   // 2 - grace period for replacing Auditor
    uint256 public propertyVotePeriod;   // 3 - vote period for updating properties    
    uint256 public lockPeriod;           // 4 - lock period for staked VAB
    uint256 public rewardRate;           // 5 - day rewards rate => 0.0004%(1% = 1e8, 100% = 1e10)
    uint256 public filmRewardClaimPeriod;// 6 - period when the auditor can submit the films reward results to be claimed
    uint256 public maxAllowPeriod;       // 7 - max allowed period for removing filmBoard member
    uint256 public proposalFeeAmount;    // 8 - USDC amount($100) studio should pay when create a proposal
    uint256 public fundFeePercent;       // 9 - percent(2% = 2*1e8) of fee on the amount raised
    uint256 public minDepositAmount;     // 10 - USDC min amount($50) that a customer can deposit to a film approved for funding
    uint256 public maxDepositAmount;     // 11 - USDC max amount($5000) that a customer can deposit to a film approved for funding
    uint256 public maxMintFeePercent;    // 12 - 10%(1% = 1e8, 100% = 1e10)
    uint256 public minVoteCount;         // 13 - 5 ppl(minium voter count for approving the proposal)
    uint256 public minStakerCountPercent;// 14 - percent(5% = 5*1e8)
    uint256 public availableVABAmount;   // 15 - vab amount for replacing the auditor    
    uint256 public boardVotePeriod;      // 16 - filmBoard vote period
    uint256 public boardVoteWeight;      // 17 - filmBoard member's vote weight
    uint256 public rewardVotePeriod;     // 18 - withdraw address setup for moving to V2
    uint256 public subscriptionAmount;   // 19 - user need to have an active subscription(pay $1 per month) for rent films.    
    uint256 public boardRewardRate;      // 20 - 25%(1% = 1e8, 100% = 1e10) more reward rate for filmboard members

    uint256[] private maxPropertyList;
    uint256[] private minPropertyList;
    uint256 public governanceProposalCount;

    uint256[] private filmVotePeriodList;          // 0
    uint256[] private agentVotePeriodList;         // 1
    uint256[] private disputeGracePeriodList;      // 2 
    uint256[] private propertyVotePeriodList;      // 3
    uint256[] private lockPeriodList;              // 4
    uint256[] private rewardRateList;              // 5
    uint256[] private filmRewardClaimPeriodList;   // 6
    uint256[] private maxAllowPeriodList;          // 7
    uint256[] private proposalFeeAmountList;       // 8
    uint256[] private fundFeePercentList;          // 9
    uint256[] private minDepositAmountList;        // 10
    uint256[] private maxDepositAmountList;        // 11
    uint256[] private maxMintFeePercentList;       // 12
    uint256[] private minVoteCountList;            // 13
    uint256[] private minStakerCountPercentList;   // 14
    uint256[] private availableVABAmountList;      // 15   
    uint256[] private boardVotePeriodList;         // 16
    uint256[] private boardVoteWeightList;         // 17
    uint256[] private rewardVotePeriodList;        // 18
    uint256[] private subscriptionAmountList;      // 19
    uint256[] private boardRewardRateList;         // 20

    address[] private agentList;             // for replacing auditor
    address[] private rewardAddressList;     // for adding v2 pool address
    address[] private filmBoardCandidates;   // filmBoard candidates and if isBoardWhitelist is true, become filmBoard member
    address[] private filmBoardMembers;      // filmBoard members

    // flag=1 =>agent, 2=>board, 3=>reward
    mapping(uint256 => mapping(address => uint256)) private isGovWhitelist;      // (flag => (address => 0: no, 1: candiate, 2: member))
    mapping(uint256 => mapping(uint256 => uint256)) private isPropertyWhitelist; // (flag => (property => 0: no, 1: candiate, 2: member))

    mapping(uint256 => mapping(address => Proposal)) public govProposalInfo;       // (flag => (address => Proposal))
    mapping(uint256 => mapping(uint256 => Proposal)) public propertyProposalInfo;  // (flag => (property => Proposal))
    mapping(uint256 => address[]) private allGovProposalInfo; // (flag => address array))

    mapping(address => uint256) public userGovernProposalCount;// (user => created governance-proposal count)
    mapping(uint256 => mapping(address => address)) private govProposer;      // (flag => (address => proposer))
    mapping(uint256 => mapping(uint256 => address)) private propertyProposer; // (flag => (property => proposer))

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
        address _staking
    ) {
        require(_ownable != address(0), "ownableContract: Zero address");
        OWNABLE = _ownable;  
        require(_uniHelper != address(0), "uniHelperContract: Zero address");
        UNI_HELPER = _uniHelper;
        require(_vote != address(0), "voteContract: Zero address");
        VOTE = _vote;
        require(_staking != address(0), "stakingContract: Zero address");
        STAKING_POOL = _staking;       

        filmVotePeriod = 10 days;   
        boardVotePeriod = 14 days;
        agentVotePeriod = 10 days;
        disputeGracePeriod = 30 days;  
        propertyVotePeriod = 10 days;
        rewardVotePeriod = 30 days;
        lockPeriod = 30 days;
        maxAllowPeriod = 90 days;        
        filmRewardClaimPeriod =30 days;

        boardVoteWeight = 30 * 1e8;      // 30% (1% = 1e8)
        rewardRate = 25 * 1e5; //40000;   // 0.0004% (1% = 1e8, 100%=1e10) // 2500000(0.025%)
        boardRewardRate = 25 * 1e8;      // 25%
        fundFeePercent = 2 * 1e8;        // percent(2%) 
        maxMintFeePercent = 10 * 1e8;    // 10%
        minStakerCountPercent = 5 * 1e8; // 5%(1% = 1e8, 100%=1e10)

        address usdcToken = IOwnablee(_ownable).USDC_TOKEN();
        address vabToken = IOwnablee(_ownable).PAYOUT_TOKEN();
        proposalFeeAmount = 20 * (10**IERC20Metadata(usdcToken).decimals());   // amount in cash(usd dollar - $20)
        minDepositAmount = 50 * (10**IERC20Metadata(usdcToken).decimals());    // amount in cash(usd dollar - $50)
        maxDepositAmount = 5000 * (10**IERC20Metadata(usdcToken).decimals());  // amount in cash(usd dollar - $5000)
        availableVABAmount = 75 * 1e6 * (10**IERC20Metadata(vabToken).decimals()); // 75M        
        subscriptionAmount = 299 * (10**IERC20Metadata(usdcToken).decimals()) / 100;   // amount in cash(usd dollar - $2.99)
        minVoteCount = 1;//5;

        minPropertyList = [
            7 days, // 0:
            7 days, // 1:
            7 days, // 2:
            7 days, // 3:
            7 days, // 4:
            2 * 1e5, // 5: 0.002%
            1 days, // 6:
            7 days, // 7:
            20 * (10**IERC20Metadata(usdcToken).decimals()), //8: amount in cash(usd dollar - $20)
            2 * 1e8, // 9: percent(2%) 
            5 * (10**IERC20Metadata(usdcToken).decimals()),    // 10: amount in cash(usd dollar - $5)
            5 * (10**IERC20Metadata(usdcToken).decimals()),  // 11: amount in cash(usd dollar - $5)
            1 * 1e8,    // 12: 1%
            1, // 13: 
            3 * 1e8, // 14: 3%
            50 * 1e6 * (10**IERC20Metadata(vabToken).decimals()), // 15: 50M        
            7 days, // 16:
            5 * 1e8, // 17: 5% (1% = 1e8)
            7 days, // 18:
            299 * (10**IERC20Metadata(usdcToken).decimals()) / 100,   // 19: amount in cash(usd dollar - $2.99)
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
            500 * (10**IERC20Metadata(usdcToken).decimals()), //8: amount in cash(usd dollar - $500)
            10 * 1e8, // 9: percent(10%) 
            10000000 * (10**IERC20Metadata(usdcToken).decimals()),    // 10: amount in cash(usd dollar - $10,000,000)
            10000000 * (10**IERC20Metadata(usdcToken).decimals()),  // 11: amount in cash(usd dollar - $10,000,000)
            10 * 1e8,    // 12: 10%
            10, // 13: 
            10 * 1e8, // 14: 10%
            200 * 1e6 * (10**IERC20Metadata(vabToken).decimals()), // 15: 200M        
            90 days, // 16:
            30 * 1e8, // 17: 30% (1% = 1e8)
            90 days, // 18:
            9999 * (10**IERC20Metadata(usdcToken).decimals()) / 100,   // 19: amount in cash(usd dollar - $99.99)
            20 * 1e8 // 20: 20%
        ]; 
    
    }

    function updateForTesting() external onlyDeployer nonReentrant {
        // if (Helper.isTestNet() == false)
        //     return;

        filmVotePeriod = 10 minutes;     // 10 days;   
        boardVotePeriod = 10 minutes;    // 14 days;
        agentVotePeriod = 10 minutes;    // 10 days;      
        disputeGracePeriod = 10 minutes;    // 30 days
        propertyVotePeriod = 10 minutes; // 10 days;
        rewardVotePeriod = 10 minutes;   // 30 days;
        lockPeriod = 10 minutes;         //30 days;
        filmRewardClaimPeriod = 10 minutes; // 30 days;

        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();
        availableVABAmount = (10**IERC20Metadata(vabToken).decimals()); // 1        
    }

    /// =================== proposals for replacing auditor ==============
    /// @notice Anyone($100 fee in VAB) create a proposal for replacing Auditor
    // function proposalAuditor(
    //     address _agent,
    //     string memory _title,
    //     string memory _description
    // ) external onlyMajor nonReentrant {
    //     require(
    //         _agent != address(0) && IOwnablee(OWNABLE).auditor() != _agent && isGovWhitelist[1][_agent] == 0, 
    //         "proposalAuditor: Already auditor or candidate or zero"
    //     );         

    //     __paidFee(proposalFeeAmount);

    //     agentList.push(_agent);
    //     governanceProposalCount += 1;
    //     userGovernProposalCount[msg.sender] += 1;        
    //     isGovWhitelist[1][_agent] = 1;
    //     govProposer[1][_agent] = msg.sender;

    //     Proposal storage ap = govProposalInfo[1][_agent];
    //     ap.title = _title;
    //     ap.description = _description;
    //     ap.createTime = block.timestamp;
    //     ap.creator = msg.sender;
    //     ap.status = Helper.Status.LISTED;

    //     allGovProposalInfo[1].push(_agent);

    //     // add timestap to array for calculating rewards
    //     IStakingPool(STAKING_POOL).updateProposalCreatedTimeList(block.timestamp);

    //     emit AuditorProposalCreated(msg.sender, _agent, _title, _description);
    // }

    /// @notice Check if proposal fee transferred from studio to stakingPool
    // Get expected VAB amount from UniswapV2 and then Transfer VAB: user(studio) -> stakingPool.
    function __paidFee(uint256 _payAmount) private {    
        address usdcToken = IOwnablee(OWNABLE).USDC_TOKEN();
        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();   
        uint256 expectVABAmount = IUniHelper(UNI_HELPER).expectedAmount(_payAmount, usdcToken, vabToken);

        require(expectVABAmount != 0, '__paidFee: Not paid fee');        
    
        Helper.safeTransferFrom(vabToken, msg.sender, address(this), expectVABAmount);
        if(IERC20(vabToken).allowance(address(this), STAKING_POOL) == 0) {
            Helper.safeApprove(vabToken, STAKING_POOL, IERC20(vabToken).totalSupply());
        }  
        IStakingPool(STAKING_POOL).addRewardToPool(expectVABAmount);
    } 

    // =================== DAO fund rewards proposal ====================
    function proposalRewardFund(
        address _rewardAddress,
        string memory _title,
        string memory _description
    ) external onlyMajor nonReentrant {
        require(
            _rewardAddress != address(0) && isGovWhitelist[3][_rewardAddress] == 0, 
            "proposalRewardFund: Already candidate or zero"
        );
        
        __paidFee(10 * proposalFeeAmount);

        rewardAddressList.push(_rewardAddress);
        isGovWhitelist[3][_rewardAddress] = 1;        
        governanceProposalCount += 1;
        userGovernProposalCount[msg.sender] += 1;
        govProposer[3][_rewardAddress] = msg.sender;

        Proposal storage rp = govProposalInfo[3][_rewardAddress];
        rp.title = _title;
        rp.description = _description;
        rp.createTime = block.timestamp;
        rp.creator = msg.sender;
        rp.status = Helper.Status.LISTED;

        allGovProposalInfo[3].push(_rewardAddress);

        // add timestap to array for calculating rewards
        IStakingPool(STAKING_POOL).updateProposalCreatedTimeList(block.timestamp);

        emit RewardFundProposalCreated(msg.sender, _rewardAddress, _title, _description);
    }

    /// @notice Get reward fund proposal title and description
    function getRewardProposalInfo(address _rewardAddress) external view returns (string memory, string memory, uint256) {
        Proposal memory rp = govProposalInfo[3][_rewardAddress];
        string memory title_ = rp.title;
        string memory desc_ = rp.description;        
        uint256 time_ = rp.createTime;

        return (title_, desc_, time_);
    }

    // =================== FilmBoard proposal ====================
    /// @notice Anyone($100 fee of VAB) create a proposal with the case to be added to film board
    // function proposalFilmBoard(
    //     address _member, 
    //     string memory _title,
    //     string memory _description
    // ) external onlyStaker nonReentrant {
    //     require(
    //         _member != address(0) && isGovWhitelist[2][_member] == 0, 
    //         "proposalFilmBoard: Already candidate or zero"
    //     );     
    //     __paidFee(proposalFeeAmount);

    //     filmBoardCandidates.push(_member);
    //     isGovWhitelist[2][_member] = 1;
    //     governanceProposalCount += 1;
    //     userGovernProposalCount[msg.sender] += 1;
    //     govProposer[2][_member] = msg.sender;

    //     Proposal storage bp = govProposalInfo[2][_member];
    //     bp.title = _title;
    //     bp.description = _description;
    //     bp.createTime = block.timestamp;
    //     bp.creator = msg.sender;
    //     bp.status = Helper.Status.LISTED;

    //     allGovProposalInfo[2].push(_member);

    //     // add timestap to array for calculating rewards
    //     IStakingPool(STAKING_POOL).updateProposalCreatedTimeList(block.timestamp);

    //     emit FilmBoardProposalCreated(msg.sender, _member, _title, _description);
    // }

    /// @notice Remove a member from whitelist if he didn't vote to any propsoal for over 3 months
    // function removeFilmBoardMember(address _member) external onlyStaker nonReentrant {
    //     require(isGovWhitelist[2][_member] == 2, "removeFilmBoardMember: Not Film board member");        
    //     require(maxAllowPeriod < block.timestamp - IVote(VOTE).getLastVoteTime(_member), 'maxAllowPeriod');
    //     require(maxAllowPeriod > block.timestamp - IStakingPool(STAKING_POOL).lastfundProposalCreateTime(), 'lastfundProposalCreateTime');

    //     __removeCandidate(_member, 4);
    //     isGovWhitelist[2][_member] = 0;

    //     emit FilmBoardMemberRemoved(msg.sender, _member);
    // }

    /// @notice Get proposal list(flag=1=>agentList, 2=>boardCandidateList, 3=>rewardAddressList, 4=>rest=>boardMemberList)
    function getGovProposalList(uint256 _flag) external view returns (address[] memory) {
        require(_flag != 0 && _flag < 5, "bad flag");

        if(_flag == 1) return agentList;
        else if(_flag == 2) return filmBoardCandidates;
        else if(_flag == 3) return rewardAddressList;
        else return filmBoardMembers;
    }    

    // ===================properties proposal ====================
    /// @notice proposals for properties
    // function proposalProperty(
    //     uint256 _property, 
    //     uint256 _flag,
    //     string memory _title,
    //     string memory _description
    // ) external onlyStaker nonReentrant {
    //     require(
    //         _property != 0 && _flag >= 0 && _flag < maxPropertyList.length && isPropertyWhitelist[_flag][_property] == 0, 
    //         "proposalProperty: Already candidate or zero value"
    //     );          

    //     require(minPropertyList[_flag] <= _property && _property <= maxPropertyList[_flag], "property invalid");
        
    //     __paidFee(proposalFeeAmount);

    //     if(_flag == 0) {
    //         require(filmVotePeriod != _property, "proposalProperty: Already filmVotePeriod");
    //         filmVotePeriodList.push(_property);
    //     } else if(_flag == 1) {
    //         require(agentVotePeriod != _property, "proposalProperty: Already agentVotePeriod");
    //         agentVotePeriodList.push(_property);
    //     } else if(_flag == 2) {
    //         require(disputeGracePeriod != _property, "proposalProperty: Already disputeGracePeriod");
    //         disputeGracePeriodList.push(_property);
    //     } else if(_flag == 3) {
    //         require(propertyVotePeriod != _property, "proposalProperty: Already propertyVotePeriod");
    //         propertyVotePeriodList.push(_property);
    //     } else if(_flag == 4) {
    //         require(lockPeriod != _property, "proposalProperty: Already lockPeriod");
    //         lockPeriodList.push(_property);
    //     } else if(_flag == 5) {
    //         require(rewardRate != _property, "proposalProperty: Already rewardRate");
    //         rewardRateList.push(_property);
    //     } else if(_flag == 6) {
    //         require(filmRewardClaimPeriod != _property, "proposalProperty: Already filmRewardClaimPeriod");
    //         filmRewardClaimPeriodList.push(_property);
    //     } else if(_flag == 7) {
    //         require(maxAllowPeriod != _property, "proposalProperty: Already maxAllowPeriod");
    //         maxAllowPeriodList.push(_property);
    //     } else if(_flag == 8) {
    //         require(proposalFeeAmount != _property, "proposalProperty: Already proposalFeeAmount");
    //         proposalFeeAmountList.push(_property);
    //     } else if(_flag == 9) {
    //         require(fundFeePercent != _property, "proposalProperty: Already fundFeePercent");
    //         fundFeePercentList.push(_property);
    //     } else if(_flag == 10) {
    //         require(minDepositAmount != _property, "proposalProperty: Already minDepositAmount");
    //         minDepositAmountList.push(_property);
    //     } else if(_flag == 11) {
    //         require(maxDepositAmount != _property, "proposalProperty: Already maxDepositAmount");
    //         maxDepositAmountList.push(_property);
    //     } else if(_flag == 12) {
    //         require(maxMintFeePercent != _property, "proposalProperty: Already maxMintFeePercent");
    //         maxMintFeePercentList.push(_property);
    //     } else if(_flag == 13) {
    //         require(minVoteCount != _property, "proposalProperty: Already minVoteCount");
    //         minVoteCountList.push(_property);
    //     } else if(_flag == 14) {
    //         require(minStakerCountPercent != _property, "proposalProperty: Already minStakerCountPercent");
    //         minStakerCountPercentList.push(_property);
    //     } else if(_flag == 15) {
    //         require(availableVABAmount != _property, "proposalProperty: Already availableVABAmount");
    //         availableVABAmountList.push(_property);
    //     } else if(_flag == 16) {
    //         require(boardVotePeriod != _property, "proposalProperty: Already boardVotePeriod");
    //         boardVotePeriodList.push(_property);
    //     } else if(_flag == 17) {
    //         require(boardVoteWeight != _property, "proposalProperty: Already boardVoteWeight");
    //         boardVoteWeightList.push(_property);
    //     } else if(_flag == 18) {
    //         require(rewardVotePeriod != _property, "proposalProperty: Already rewardVotePeriod");
    //         rewardVotePeriodList.push(_property);
    //     } else if(_flag == 19) {
    //         require(subscriptionAmount != _property, "proposalProperty: Already subscriptionAmount");
    //         subscriptionAmountList.push(_property);
    //     } else if(_flag == 20) {
    //         require(boardRewardRate != _property, "proposalProperty: Already boardRewardRate");
    //         boardRewardRateList.push(_property);
    //     }          
        
    //     governanceProposalCount += 1;     
    //     userGovernProposalCount[msg.sender] += 1;         
    //     isPropertyWhitelist[_flag][_property] = 1;
    //     propertyProposer[_flag][_property] = msg.sender;

    //     Proposal storage pp = propertyProposalInfo[_flag][_property];
    //     pp.title = _title;
    //     pp.description = _description;
    //     pp.createTime = block.timestamp;
    //     pp.creator = msg.sender;
    //     pp.status = Helper.Status.LISTED;

    //     // add timestap to array for calculating rewards
    //     IStakingPool(STAKING_POOL).updateProposalCreatedTimeList(block.timestamp);

    //     emit PropertyProposalCreated(msg.sender, _property, _flag, _title, _description);
    // }

    function getProperty(
        uint256 _index, 
        uint256 _flag
    ) external view returns (uint256 property_) { 
        require(_flag >= 0 && _index >= 0, "getProperty: Invalid flag");   
        
        if(_flag == 0 && filmVotePeriodList.length != 0 && filmVotePeriodList.length > _index) {
            property_ = filmVotePeriodList[_index];
        } else if(_flag == 1 && agentVotePeriodList.length != 0 && agentVotePeriodList.length > _index) {
            property_ = agentVotePeriodList[_index];
        } else if(_flag == 2 && disputeGracePeriodList.length != 0 && disputeGracePeriodList.length > _index) {
            property_ = disputeGracePeriodList[_index];
        } else if(_flag == 3 && propertyVotePeriodList.length != 0 && propertyVotePeriodList.length > _index) {
            property_ = propertyVotePeriodList[_index];
        } else if(_flag == 4 && lockPeriodList.length != 0 && lockPeriodList.length > _index) {
            property_ = lockPeriodList[_index];
        } else if(_flag == 5 && rewardRateList.length != 0 && rewardRateList.length > _index) {
            property_ = rewardRateList[_index];
        } else if(_flag == 6 && filmRewardClaimPeriodList.length != 0 && filmRewardClaimPeriodList.length > _index) {
            property_ = filmRewardClaimPeriodList[_index];
        } else if(_flag == 7 && maxAllowPeriodList.length != 0 && maxAllowPeriodList.length > _index) {
            property_ = maxAllowPeriodList[_index];
        } else if(_flag == 8 && proposalFeeAmountList.length != 0 && proposalFeeAmountList.length > _index) {
            property_ = proposalFeeAmountList[_index];
        } else if(_flag == 9 && fundFeePercentList.length != 0 && fundFeePercentList.length > _index) {
            property_ = fundFeePercentList[_index];
        } else if(_flag == 10 && minDepositAmountList.length != 0 && minDepositAmountList.length > _index) {
            property_ = minDepositAmountList[_index];
        } else if(_flag == 11 && maxDepositAmountList.length != 0 && maxDepositAmountList.length > _index) {
            property_ = maxDepositAmountList[_index];
        } else if(_flag == 12 && maxMintFeePercentList.length != 0 && maxMintFeePercentList.length > _index) {
            property_ = maxMintFeePercentList[_index];
        } else if(_flag == 13 && minVoteCountList.length != 0 && minVoteCountList.length > _index) {
            property_ = minVoteCountList[_index];
        } else if(_flag == 14 && minStakerCountPercentList.length != 0 && minStakerCountPercentList.length > _index) {
            property_ = minStakerCountPercentList[_index];
        } else if(_flag == 15 && availableVABAmountList.length != 0 && availableVABAmountList.length > _index) {
            property_ = availableVABAmountList[_index];
        } else if(_flag == 16 && boardVotePeriodList.length != 0 && boardVotePeriodList.length > _index) {
            property_ = boardVotePeriodList[_index];
        } else if(_flag == 17 && boardVoteWeightList.length != 0 && boardVoteWeightList.length > _index) {
            property_ = boardVoteWeightList[_index];
        } else if(_flag == 18 && rewardVotePeriodList.length != 0 && rewardVotePeriodList.length > _index) {
            property_ = rewardVotePeriodList[_index];
        } else if(_flag == 19 && subscriptionAmountList.length != 0 && subscriptionAmountList.length > _index) {
            property_ = subscriptionAmountList[_index];
        } else if(_flag == 20 && boardRewardRateList.length != 0 && boardRewardRateList.length > _index) {
            property_ = boardRewardRateList[_index];
        } else {
            property_ = 0;
        }     
    }

    /// @notice Get property proposal list
    function getPropertyProposalList(uint256 _flag) public view returns (uint256[] memory _list) {
        if(_flag == 0) _list = filmVotePeriodList;
        else if(_flag == 1) _list = agentVotePeriodList;
        else if(_flag == 2) _list = disputeGracePeriodList;
        else if(_flag == 3) _list = propertyVotePeriodList;
        else if(_flag == 4) _list = lockPeriodList;
        else if(_flag == 5) _list = rewardRateList;
        else if(_flag == 6) _list = filmRewardClaimPeriodList;
        else if(_flag == 7) _list = maxAllowPeriodList;
        else if(_flag == 8) _list = proposalFeeAmountList;
        else if(_flag == 9) _list = fundFeePercentList;
        else if(_flag == 10) _list = minDepositAmountList;
        else if(_flag == 11) _list = maxDepositAmountList;
        else if(_flag == 12) _list = maxMintFeePercentList;
        else if(_flag == 13) _list = minVoteCountList;        
        else if(_flag == 14) _list = minStakerCountPercentList;     
        else if(_flag == 15) _list = availableVABAmountList;     
        else if(_flag == 16) _list = boardVotePeriodList;     
        else if(_flag == 17) _list = boardVoteWeightList;     
        else if(_flag == 18) _list = rewardVotePeriodList;     
        else if(_flag == 19) _list = subscriptionAmountList;     
        else if(_flag == 20) _list = boardRewardRateList;                                   
    }

    /// @notice Get property proposal created time
    function getPropertyProposalTime(
        uint256 _property, 
        uint256 _flag
    ) external view returns (uint256 cTime_, uint256 aTime_) {
        cTime_ = propertyProposalInfo[_flag][_property].createTime;
        aTime_ = propertyProposalInfo[_flag][_property].approveTime;
    }
    
    // function updatePropertyProposal(
    //     uint256 _property, 
    //     uint256 _flag, 
    //     uint256 _approveStatus
    // ) external onlyVote {
    //     // update approve time
    //     propertyProposalInfo[_flag][_property].approveTime = block.timestamp;

    //     // update approve status
    //     if(_approveStatus == 1) {
    //         propertyProposalInfo[_flag][_property].status = Helper.Status.UPDATED;
    //         isPropertyWhitelist[_flag][_property] = 2;
    //     } else {
    //         propertyProposalInfo[_flag][_property].status = Helper.Status.REJECTED;
    //         isPropertyWhitelist[_flag][_property] = 0;
    //     }

    //     // update main item
    //     if(_approveStatus == 1) {
    //         if(_flag == 0) {
    //             filmVotePeriod = _property;
    //         } else if(_flag == 1) {
    //             agentVotePeriod = _property;
    //         } else if(_flag == 2) {
    //             disputeGracePeriod = _property;
    //         } else if(_flag == 3) {
    //             propertyVotePeriod = _property;
    //         } else if(_flag == 4) {
    //             lockPeriod = _property;
    //         } else if(_flag == 5) {
    //             rewardRate = _property;
    //         } else if(_flag == 6) {
    //             filmRewardClaimPeriod = _property;
    //         } else if(_flag == 7) {
    //             maxAllowPeriod = _property;
    //         } else if(_flag == 8) {
    //             proposalFeeAmount = _property;
    //         } else if(_flag == 9) {
    //             fundFeePercent = _property;
    //         } else if(_flag == 10) {
    //             minDepositAmount = _property;
    //         } else if(_flag == 11) {
    //             maxDepositAmount = _property;
    //         } else if(_flag == 12) {
    //             maxMintFeePercent = _property;
    //         } else if(_flag == 13) {
    //             minVoteCount = _property;
    //         } else if(_flag == 14) {
    //             minStakerCountPercent = _property;
    //         } else if(_flag == 15) {
    //             availableVABAmount = _property;
    //         } else if(_flag == 16) {
    //             boardVotePeriod = _property;
    //         } else if(_flag == 17) {
    //             boardVoteWeight = _property;
    //         } else if(_flag == 18) {
    //             rewardVotePeriod = _property;
    //         } else if(_flag == 19) {
    //             subscriptionAmount = _property;
    //         } else if(_flag == 20) {
    //             boardRewardRate = _property;
    //         } 
    //     }
    // }
    
    /// @notice Get agent/board/pool proposal created time
    // agent=>1, board=>2, pool=>3
    function getGovProposalTime(address _member, uint256 _flag) external view returns (uint256 cTime_, uint256 aTime_) {
        cTime_ = govProposalInfo[_flag][_member].createTime;
        aTime_ = govProposalInfo[_flag][_member].approveTime;
    }

    function updateGovProposal(
        address _member, 
        uint256 _flag,  // 1=>agent, 2=>board, 3=>pool
        uint256 _approveStatus // 1/0
    ) external onlyVote {
        // update approve time
        govProposalInfo[_flag][_member].approveTime = block.timestamp;

        // update approve status
        if(_approveStatus == 1) {
            govProposalInfo[_flag][_member].status = Helper.Status.UPDATED;
            isGovWhitelist[_flag][_member] = 2;
        } else {
            govProposalInfo[_flag][_member].status = Helper.Status.REJECTED;
            isGovWhitelist[_flag][_member] = 0;
        }
        
        // remove member from candidate list
        __removeCandidate(_member, _flag);

        // update main item
        if(_flag == 3 && _approveStatus == 1) {
            DAO_FUND_REWARD = _member;            
            IStakingPool(STAKING_POOL).calcMigrationVAB();
        }

        if(_flag == 2 && _approveStatus == 1) {
            filmBoardMembers.push(_member);    
        }
    }

    // flag=1 => agent candidate, 2 => board candidate, 3 => reward candidate, 4=> board member
    function __removeCandidate(address _candidate, uint256 _flag) private {
        if(_flag == 1) {        
            for(uint256 k = 0; k < agentList.length; k++) { 
                if(_candidate == agentList[k]) {
                    agentList[k] = agentList[agentList.length - 1];
                    agentList.pop();
                    break;
                }
            }  
        } else if(_flag == 2) {    
            for(uint256 k = 0; k < filmBoardCandidates.length; k++) { 
                if(_candidate == filmBoardCandidates[k]) {
                    filmBoardCandidates[k] = filmBoardCandidates[filmBoardCandidates.length - 1];
                    filmBoardCandidates.pop();
                    break;
                }
            }  
        } else if(_flag == 3) {
            for(uint256 k = 0; k < rewardAddressList.length; k++) { 
                if(_candidate == rewardAddressList[k]) {
                    rewardAddressList[k] = rewardAddressList[rewardAddressList.length - 1];
                    rewardAddressList.pop();
                    break;
                }
            }    
        } else if(_flag == 4) {
            for(uint256 k = 0; k < filmBoardMembers.length; k++) { 
                if(_candidate == filmBoardMembers[k]) {
                    filmBoardMembers[k] = filmBoardMembers[filmBoardMembers.length - 1];
                    filmBoardMembers.pop();
                    break;
                }
            }    
        }
    }
    
    function getGovProposer(uint256 _flag, address _candidate) external view returns (address) {
        return govProposer[_flag][_candidate];
    }

    function getPropertyProposer(uint256 _flag, uint256 _property) external view returns (address) {
        return propertyProposer[_flag][_property];
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

    ///================ @dev Update the property value for only testing in the testnet
    // we won't deploy this function in the mainnet
    function updatePropertyForTesting(
        uint256 _value, 
        uint256 _flag
    ) external onlyDeployer {
        if (Helper.isTestNet() == false)
            return;
            
        require(_value != 0, "test: Zero value");

        if(_flag == 0) filmVotePeriod = _value;
        else if(_flag == 1) agentVotePeriod = _value;
        else if(_flag == 2) disputeGracePeriod = _value;
        else if(_flag == 3) propertyVotePeriod = _value;
        else if(_flag == 4) lockPeriod = _value;
        else if(_flag == 5) rewardRate = _value;
        else if(_flag == 6) filmRewardClaimPeriod = _value;
        else if(_flag == 7) maxAllowPeriod = _value;
        else if(_flag == 8) proposalFeeAmount = _value;
        else if(_flag == 9) fundFeePercent = _value;
        else if(_flag == 10) minDepositAmount = _value;
        else if(_flag == 11) maxDepositAmount = _value;
        else if(_flag == 12) maxMintFeePercent = _value;
        else if(_flag == 13) availableVABAmount = _value;
        else if(_flag == 14) boardVotePeriod = _value;
        else if(_flag == 15) boardVoteWeight = _value;
        else if(_flag == 16) rewardVotePeriod = _value;
        else if(_flag == 17) subscriptionAmount = _value;
        else if(_flag == 18) minVoteCount = _value;        
        else if(_flag == 19) minStakerCountPercent = _value;                
    }

    /// @dev Update the rewardAddress for only testing in the testnet
    // function updateDAOFundForTesting(address _address) external onlyDeployer {        
    //     DAO_FUND_REWARD = _address;    
    // }        

    function updateAvailableVABForTesting(uint256 _amount) external onlyDeployer {        
        if (Helper.isTestNet() == false)
            return;

        availableVABAmount = _amount;
    }     
}
