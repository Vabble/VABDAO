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

    event AuditorProposalCreated(address creator, address member, string title, string description);
    event RewardFundProposalCreated(address creator, address member, string title, string description);
    event FilmBoardProposalCreated(address creator, address member, string title, string description);
    event FilmBoardMemberAdded(address caller, address member);
    event FilmBoardMemberRemoved(address caller, address member);
    event PropertyProposalCreated(address creator, uint256 property, uint256 flag, string title, string description);
    event PropertyUpdated(address caller, uint256 property, uint256 flag);
    
    struct Proposal {
        string title;          // proposal title
        string description;    // proposal description
        uint256 createTime;    // proposal created timestamp
        uint256 approveTime;   // proposal approved timestamp
        address creator;       // proposal creator address
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
    uint256 public extraRewardRate;      // 6 - bonus day rewards rate =>0.0001%(1% = 1e8, 100% = 1e10)
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
    
    uint256 public governanceProposalCount;

    uint256[] private filmVotePeriodList;          // 0
    uint256[] private agentVotePeriodList;         // 1
    uint256[] private disputeGracePeriodList;      // 2 
    uint256[] private propertyVotePeriodList;      // 3
    uint256[] private lockPeriodList;              // 4
    uint256[] private rewardRateList;              // 5
    uint256[] private extraRewardRateList;         // 6
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

    mapping(address => uint256) public isBoardWhitelist;       // (filmBoard member => 0: no member, 1: candiate, 2: already member)
    mapping(address => uint256) public isRewardWhitelist;      // (rewardAddress => 0: no member, 1: candiate, 2: already member) 

    mapping(address => Proposal) public rewardProposalInfo;    // (rewardAddress => Proposal)       
    mapping(address => Proposal) public boardProposalInfo;     // (board => Proposal)       
    mapping(address => Proposal) public agentProposalInfo;     // (pool address => Proposal)       
    mapping(uint256 => mapping(uint256 => Proposal)) public propertyProposalInfo;  // (flag => (property => Proposal))

    mapping(address => uint256) public userGovernProposalCount;// (user => created governance-proposal count)

    modifier onlyVote() {
        require(msg.sender == VOTE, "caller is not the vote contract");
        _;
    }
    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "caller is not the auditor");
        _;
    }
    modifier onlyStaker() {
        require(IStakingPool(STAKING_POOL).getStakeAmount(msg.sender) > 0, "Not staker");
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
        lockPeriod = 10 minutes; //30 days;
        maxAllowPeriod = 90 days;        

        boardVoteWeight = 30 * 1e8;      // 30% (1% = 1e8)
        rewardRate = 40000;              // 0.0004% (1% = 1e8, 100%=1e10)
        extraRewardRate = 10000;         // 0.0001% (1% = 1e8, 100%=1e10)
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
        subscriptionAmount = 1 * (10**IERC20Metadata(usdcToken).decimals());   // amount in cash(usd dollar - $1)
        minVoteCount = 3;//5;
    }

    /// =================== proposals for replacing auditor ==============
    /// @notice Anyone($100 fee in VAB) create a proposal for replacing Auditor
    function proposalAuditor(
        address _agent,
        string memory _title,
        string memory _description
    ) external onlyStaker {
        require(_agent != address(0), "proposalAuditor: Zero address");                
        require(IOwnablee(OWNABLE).auditor() != _agent, "proposalAuditor: Already auditor address");                
        require(__isPaidFee(proposalFeeAmount), 'proposalAuditor: Not paid fee');

        agentList.push(_agent);
        governanceProposalCount += 1;
        userGovernProposalCount[msg.sender] += 1;

        Proposal storage ap = agentProposalInfo[_agent];
        ap.title = _title;
        ap.description = _description;
        ap.createTime = block.timestamp;
        ap.creator = msg.sender;

        // add timestap to array for calculating rewards
        IStakingPool(STAKING_POOL).updateProposalCreatedTimeList(block.timestamp);

        emit AuditorProposalCreated(msg.sender, _agent, _title, _description);
    }

    /// @notice Check if proposal fee transferred from studio to stakingPool
    // Get expected VAB amount from UniswapV2 and then Transfer VAB: user(studio) -> stakingPool.
    function __isPaidFee(uint256 _payAmount) private returns(bool) {         
        address usdcToken = IOwnablee(OWNABLE).USDC_TOKEN();
        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();   
        uint256 expectVABAmount = IUniHelper(UNI_HELPER).expectedAmount(_payAmount, usdcToken, vabToken);
        if(expectVABAmount > 0) {
            Helper.safeTransferFrom(vabToken, msg.sender, address(this), expectVABAmount);
            if(IERC20(vabToken).allowance(address(this), STAKING_POOL) == 0) {
                Helper.safeApprove(vabToken, STAKING_POOL, IERC20(vabToken).totalSupply());
            }  
            IStakingPool(STAKING_POOL).addRewardToPool(expectVABAmount);
            return true;
        } else {
            return false;
        }
    }  

    // =================== DAO fund rewards proposal ====================
    function proposalRewardFund(
        address _rewardAddress,
        string memory _title,
        string memory _description
    ) external onlyStaker {
        require(_rewardAddress != address(0), "proposalRewardFund: Zero candidate address");     
        require(isRewardWhitelist[_rewardAddress] == 0, "proposalRewardFund: Already created proposal by this address");
        require(__isPaidFee(10 * proposalFeeAmount), 'proposalRewardFund: Not paid fee');

        rewardAddressList.push(_rewardAddress);
        isRewardWhitelist[_rewardAddress] = 1;        
        governanceProposalCount += 1;
        userGovernProposalCount[msg.sender] += 1;

        Proposal storage rp = rewardProposalInfo[_rewardAddress];
        rp.title = _title;
        rp.description = _description;
        rp.createTime = block.timestamp;
        rp.creator = msg.sender;

        // add timestap to array for calculating rewards
        IStakingPool(STAKING_POOL).updateProposalCreatedTimeList(block.timestamp);

        emit RewardFundProposalCreated(msg.sender, _rewardAddress, _title, _description);
    }

    /// @notice Set DAO_FUND_REWARD by Vote contract
    function setRewardAddress(address _rewardAddress) external onlyVote nonReentrant {
        require(_rewardAddress != address(0), "setRewardAddress: Zero address");     
        require(isRewardWhitelist[_rewardAddress] == 1, "setRewardAddress: no proposal address");

        isRewardWhitelist[_rewardAddress] = 2;
        DAO_FUND_REWARD = _rewardAddress;
    }

    /// @notice Get reward fund proposal title and description
    function getRewardProposalInfo(address _rewardAddress) external view returns (string memory, string memory, uint256) {
        Proposal memory rp = rewardProposalInfo[_rewardAddress];
        string memory title_ = rp.title;
        string memory desc_ = rp.description;        
        uint256 time_ = rp.createTime;

        return (title_, desc_, time_);
    }

    // =================== FilmBoard proposal ====================
    /// @notice Anyone($100 fee of VAB) create a proposal with the case to be added to film board
    function proposalFilmBoard(
        address _member, 
        string memory _title,
        string memory _description
    ) external onlyStaker {
        require(_member != address(0), "proposalFilmBoard: Zero candidate address");     
        require(isBoardWhitelist[_member] == 0, "proposalFilmBoard: Already film board member or candidate");                  
        require(__isPaidFee(proposalFeeAmount), 'proposalFilmBoard: Not paid fee');     

        filmBoardCandidates.push(_member);
        isBoardWhitelist[_member] = 1;
        governanceProposalCount += 1;
        userGovernProposalCount[msg.sender] += 1;

        Proposal storage bp = boardProposalInfo[_member];
        bp.title = _title;
        bp.description = _description;
        bp.createTime = block.timestamp;
        bp.creator = msg.sender;

        // add timestap to array for calculating rewards
        IStakingPool(STAKING_POOL).updateProposalCreatedTimeList(block.timestamp);

        emit FilmBoardProposalCreated(msg.sender, _member, _title, _description);
    }

    /// @notice Add a member to whitelist by Vote contract
    function addFilmBoardMember(address _member) external onlyVote nonReentrant {
        require(_member != address(0), "addFilmBoardMember: Zero candidate address");     
        require(isBoardWhitelist[_member] == 1, "addFilmBoardMember: Already film board member or no candidate");   

        filmBoardMembers.push(_member);
        isBoardWhitelist[_member] = 2;
        
        emit FilmBoardMemberAdded(msg.sender, _member);
    }

    /// @notice Remove a member from whitelist if he didn't vote to any propsoal for over 3 months
    function removeFilmBoardMember(address _member) external onlyStaker nonReentrant {
        require(isBoardWhitelist[_member] == 2, "removeFilmBoardMember: Not Film board member");        
        require(maxAllowPeriod < block.timestamp - IVote(VOTE).getLastVoteTime(_member), 'maxAllowPeriod');
        require(maxAllowPeriod > block.timestamp - IStakingPool(STAKING_POOL).lastfundProposalCreateTime(), 'lastfundProposalCreateTime');

        isBoardWhitelist[_member] = 0;
    
        for(uint256 i = 0; i < filmBoardMembers.length; i++) {
            if(_member == filmBoardMembers[i]) {
                filmBoardMembers[i] = filmBoardMembers[filmBoardMembers.length - 1];
                filmBoardMembers.pop();
            }
        }
        emit FilmBoardMemberRemoved(msg.sender, _member);
    }

    /// @notice Get proposal list(flag=1=>agentList, 2=>rewardAddressList, 3=>boardCandidateList, rest=>boardMemberList)
    function getGovProposalList(uint256 _flag) external view returns (address[] memory) {
        if(_flag == 1) return agentList;
        else if(_flag == 2) return rewardAddressList;
        else if(_flag == 3) return filmBoardCandidates;
        else return filmBoardMembers;
    }    

    // ===================properties proposal ====================
    /// @notice proposals for properties
    function proposalProperty(
        uint256 _property, 
        uint256 _flag,
        string memory _title,
        string memory _description
    ) public onlyStaker {
        require(_property > 0 && _flag >= 0, "proposalProperty: Invalid param");
        require(__isPaidFee(proposalFeeAmount), 'proposalProperty: Not paid fee');

        if(_flag == 0) {
            require(filmVotePeriod != _property, "proposalProperty: Already filmVotePeriod");
            filmVotePeriodList.push(_property);
        } else if(_flag == 1) {
            require(agentVotePeriod != _property, "proposalProperty: Already agentVotePeriod");
            agentVotePeriodList.push(_property);
        } else if(_flag == 2) {
            require(disputeGracePeriod != _property, "proposalProperty: Already disputeGracePeriod");
            disputeGracePeriodList.push(_property);
        } else if(_flag == 3) {
            require(propertyVotePeriod != _property, "proposalProperty: Already propertyVotePeriod");
            propertyVotePeriodList.push(_property);
        } else if(_flag == 4) {
            require(lockPeriod != _property, "proposalProperty: Already lockPeriod");
            lockPeriodList.push(_property);
        } else if(_flag == 5) {
            require(rewardRate != _property, "proposalProperty: Already rewardRate");
            rewardRateList.push(_property);
        } else if(_flag == 6) {
            require(extraRewardRate != _property, "proposalProperty: Already extraRewardRate");
            extraRewardRateList.push(_property);
        } else if(_flag == 7) {
            require(maxAllowPeriod != _property, "proposalProperty: Already maxAllowPeriod");
            maxAllowPeriodList.push(_property);
        } else if(_flag == 8) {
            require(proposalFeeAmount != _property, "proposalProperty: Already proposalFeeAmount");
            proposalFeeAmountList.push(_property);
        } else if(_flag == 9) {
            require(fundFeePercent != _property, "proposalProperty: Already fundFeePercent");
            fundFeePercentList.push(_property);
        } else if(_flag == 10) {
            require(minDepositAmount != _property, "proposalProperty: Already minDepositAmount");
            minDepositAmountList.push(_property);
        } else if(_flag == 11) {
            require(maxDepositAmount != _property, "proposalProperty: Already maxDepositAmount");
            maxDepositAmountList.push(_property);
        } else if(_flag == 12) {
            require(maxMintFeePercent != _property, "proposalProperty: Already maxMintFeePercent");
            maxMintFeePercentList.push(_property);
        } else if(_flag == 13) {
            require(minVoteCount != _property, "proposalProperty: Already minVoteCount");
            minVoteCountList.push(_property);
        } else if(_flag == 14) {
            require(minStakerCountPercent != _property, "proposalProperty: Already minStakerCountPercent");
            minStakerCountPercentList.push(_property);
        } else if(_flag == 15) {
            require(availableVABAmount != _property, "proposalProperty: Already availableVABAmount");
            availableVABAmountList.push(_property);
        } else if(_flag == 16) {
            require(boardVotePeriod != _property, "proposalProperty: Already boardVotePeriod");
            boardVotePeriodList.push(_property);
        } else if(_flag == 17) {
            require(boardVoteWeight != _property, "proposalProperty: Already boardVoteWeight");
            boardVoteWeightList.push(_property);
        } else if(_flag == 18) {
            require(rewardVotePeriod != _property, "proposalProperty: Already rewardVotePeriod");
            rewardVotePeriodList.push(_property);
        } else if(_flag == 19) {
            require(subscriptionAmount != _property, "proposalProperty: Already subscriptionAmount");
            subscriptionAmountList.push(_property);
        } else if(_flag == 20) {
            require(boardRewardRate != _property, "proposalProperty: Already boardRewardRate");
            boardRewardRateList.push(_property);
        }          
        
        governanceProposalCount += 1;     
        userGovernProposalCount[msg.sender] += 1;         

        Proposal storage pp = propertyProposalInfo[_flag][_property];
        pp.title = _title;
        pp.description = _description;
        pp.createTime = block.timestamp;
        pp.creator = msg.sender;

        // add timestap to array for calculating rewards
        IStakingPool(STAKING_POOL).updateProposalCreatedTimeList(block.timestamp);

        emit PropertyProposalCreated(msg.sender, _property, _flag, _title, _description);
    }

    function getProperty(
        uint256 _index, 
        uint256 _flag
    ) external view returns (uint256 property_) { 
        require(_flag >= 0 && _index >= 0, "getProperty: Invalid flag");   
        
        property_ = 0;
        if(_flag == 0 && filmVotePeriodList.length > 0 && filmVotePeriodList.length > _index) {
            property_ = filmVotePeriodList[_index];
        } else if(_flag == 1 && agentVotePeriodList.length > 0 && agentVotePeriodList.length > _index) {
            property_ = agentVotePeriodList[_index];
        } else if(_flag == 2 && disputeGracePeriodList.length > 0 && disputeGracePeriodList.length > _index) {
            property_ = disputeGracePeriodList[_index];
        } else if(_flag == 3 && propertyVotePeriodList.length > 0 && propertyVotePeriodList.length > _index) {
            property_ = propertyVotePeriodList[_index];
        } else if(_flag == 4 && lockPeriodList.length > 0 && lockPeriodList.length > _index) {
            property_ = lockPeriodList[_index];
        } else if(_flag == 5 && rewardRateList.length > 0 && rewardRateList.length > _index) {
            property_ = rewardRateList[_index];
        } else if(_flag == 6 && extraRewardRateList.length > 0 && extraRewardRateList.length > _index) {
            property_ = extraRewardRateList[_index];
        } else if(_flag == 7 && maxAllowPeriodList.length > 0 && maxAllowPeriodList.length > _index) {
            property_ = maxAllowPeriodList[_index];
        } else if(_flag == 8 && proposalFeeAmountList.length > 0 && proposalFeeAmountList.length > _index) {
            property_ = proposalFeeAmountList[_index];
        } else if(_flag == 9 && fundFeePercentList.length > 0 && fundFeePercentList.length > _index) {
            property_ = fundFeePercentList[_index];
        } else if(_flag == 10 && minDepositAmountList.length > 0 && minDepositAmountList.length > _index) {
            property_ = minDepositAmountList[_index];
        } else if(_flag == 11 && maxDepositAmountList.length > 0 && maxDepositAmountList.length > _index) {
            property_ = maxDepositAmountList[_index];
        } else if(_flag == 12 && maxMintFeePercentList.length > 0 && maxMintFeePercentList.length > _index) {
            property_ = maxMintFeePercentList[_index];
        } else if(_flag == 13 && minVoteCountList.length > 0 && minVoteCountList.length > _index) {
            property_ = minVoteCountList[_index];
        } else if(_flag == 14 && minStakerCountPercentList.length > 0 && minStakerCountPercentList.length > _index) {
            property_ = minStakerCountPercentList[_index];
        } else if(_flag == 15 && availableVABAmountList.length > 0 && availableVABAmountList.length > _index) {
            property_ = availableVABAmountList[_index];
        } else if(_flag == 16 && boardVotePeriodList.length > 0 && boardVotePeriodList.length > _index) {
            property_ = boardVotePeriodList[_index];
        } else if(_flag == 17 && boardVoteWeightList.length > 0 && boardVoteWeightList.length > _index) {
            property_ = boardVoteWeightList[_index];
        } else if(_flag == 18 && rewardVotePeriodList.length > 0 && rewardVotePeriodList.length > _index) {
            property_ = rewardVotePeriodList[_index];
        } else if(_flag == 19 && subscriptionAmountList.length > 0 && subscriptionAmountList.length > _index) {
            property_ = subscriptionAmountList[_index];
        } else if(_flag == 20 && boardRewardRateList.length > 0 && boardRewardRateList.length > _index) {
            property_ = boardRewardRateList[_index];
        }                      
    }

    function updateProperty(
        uint256 _index, 
        uint256 _flag
    ) external onlyVote {
        require(_flag >= 0 && _index >= 0, "updateProperty: Invalid flag");   

        if(_flag == 0) {
            filmVotePeriod = filmVotePeriodList[_index];
            emit PropertyUpdated(msg.sender, filmVotePeriod, _flag);
        } else if(_flag == 1) {
            agentVotePeriod = agentVotePeriodList[_index];
            emit PropertyUpdated(msg.sender, agentVotePeriod, _flag);
        } else if(_flag == 2) {
            disputeGracePeriod = disputeGracePeriodList[_index];
            emit PropertyUpdated(msg.sender, disputeGracePeriod, _flag);
        } else if(_flag == 3) {
            propertyVotePeriod = propertyVotePeriodList[_index];
            emit PropertyUpdated(msg.sender, propertyVotePeriod, _flag);
        } else if(_flag == 4) {
            lockPeriod = lockPeriodList[_index];
            emit PropertyUpdated(msg.sender, lockPeriod, _flag);
        } else if(_flag == 5) {
            rewardRate = rewardRateList[_index];
            emit PropertyUpdated(msg.sender, rewardRate, _flag);
        } else if(_flag == 6) {
            extraRewardRate = extraRewardRateList[_index];
            emit PropertyUpdated(msg.sender, extraRewardRate, _flag);
        } else if(_flag == 7) {
            maxAllowPeriod = maxAllowPeriodList[_index];
            emit PropertyUpdated(msg.sender, maxAllowPeriod, _flag);        
        } else if(_flag == 8) {
            proposalFeeAmount = proposalFeeAmountList[_index];
            emit PropertyUpdated(msg.sender, proposalFeeAmount, _flag);        
        } else if(_flag == 9) {
            fundFeePercent = fundFeePercentList[_index];
            emit PropertyUpdated(msg.sender, fundFeePercent, _flag);        
        } else if(_flag == 10) {
            minDepositAmount = minDepositAmountList[_index];
            emit PropertyUpdated(msg.sender, minDepositAmount, _flag);        
        } else if(_flag == 11) {
            maxDepositAmount = maxDepositAmountList[_index];
            emit PropertyUpdated(msg.sender, maxDepositAmount, _flag);        
        } else if(_flag == 12) {
            maxMintFeePercent = maxMintFeePercentList[_index];
            emit PropertyUpdated(msg.sender, maxMintFeePercent, _flag);     
        } else if(_flag == 13) {
            minVoteCount = minVoteCountList[_index];
            emit PropertyUpdated(msg.sender, minVoteCount, _flag);     
        } else if(_flag == 14) {
            minStakerCountPercent = minStakerCountPercentList[_index];
            emit PropertyUpdated(msg.sender, minStakerCountPercent, _flag);     
        } else if(_flag == 15) {
            availableVABAmount = availableVABAmountList[_index];
            emit PropertyUpdated(msg.sender, availableVABAmount, _flag);     
        } else if(_flag == 16) {
            boardVotePeriod = boardVotePeriodList[_index];
            emit PropertyUpdated(msg.sender, boardVotePeriod, _flag);     
        } else if(_flag == 17) {
            boardVoteWeight = boardVoteWeightList[_index];
            emit PropertyUpdated(msg.sender, boardVoteWeight, _flag);     
        } else if(_flag == 18) {
            rewardVotePeriod = rewardVotePeriodList[_index];
            emit PropertyUpdated(msg.sender, rewardVotePeriod, _flag);     
        } else if(_flag == 19) {
            subscriptionAmount = subscriptionAmountList[_index];
            emit PropertyUpdated(msg.sender, subscriptionAmount, _flag);     
        } else if(_flag == 20) {
            boardRewardRate = boardRewardRateList[_index];
            emit PropertyUpdated(msg.sender, boardRewardRate, _flag);     
        }         
    }
    
    // function removeProperty(uint256 _index, uint256 _flag) external onlyVote {   
    //     require(_flag >= 0 && _index >= 0, "removeProperty: Invalid flag");   

    //     if(_flag == 0) {  
    //         filmVotePeriodList[_index] = filmVotePeriodList[filmVotePeriodList.length - 1];
    //         filmVotePeriodList.pop();
    //     } else if(_flag == 1) {
    //         agentVotePeriodList[_index] = agentVotePeriodList[agentVotePeriodList.length - 1];
    //         agentVotePeriodList.pop();
    //     } else if(_flag == 2) {
    //         disputeGracePeriodList[_index] = disputeGracePeriodList[disputeGracePeriodList.length - 1];
    //         disputeGracePeriodList.pop();
    //     } else if(_flag == 3) {
    //         propertyVotePeriodList[_index] = propertyVotePeriodList[propertyVotePeriodList.length - 1];
    //         propertyVotePeriodList.pop();
    //     } else if(_flag == 4) {
    //         lockPeriodList[_index] = lockPeriodList[lockPeriodList.length - 1];
    //         lockPeriodList.pop();
    //     } else if(_flag == 5) {
    //         rewardRateList[_index] = rewardRateList[rewardRateList.length - 1];
    //         rewardRateList.pop();
    //     } else if(_flag == 6) {
    //         extraRewardRateList[_index] = extraRewardRateList[extraRewardRateList.length - 1];
    //         extraRewardRateList.pop();
    //     } else if(_flag == 7) {
    //         maxAllowPeriodList[_index] = maxAllowPeriodList[maxAllowPeriodList.length - 1];
    //         maxAllowPeriodList.pop();
    //     } else if(_flag == 8) {
    //         proposalFeeAmountList[_index] = proposalFeeAmountList[proposalFeeAmountList.length - 1];
    //         proposalFeeAmountList.pop();
    //     } else if(_flag == 9) {
    //         fundFeePercentList[_index] = fundFeePercentList[fundFeePercentList.length - 1];
    //         fundFeePercentList.pop();
    //     } else if(_flag == 10) {
    //         minDepositAmountList[_index] = minDepositAmountList[minDepositAmountList.length - 1];
    //         minDepositAmountList.pop();
    //     } else if(_flag == 11) {
    //         maxDepositAmountList[_index] = maxDepositAmountList[maxDepositAmountList.length - 1];
    //         maxDepositAmountList.pop();
    //     } else if(_flag == 12) {
    //         maxMintFeePercentList[_index] = maxMintFeePercentList[maxMintFeePercentList.length - 1];
    //         maxMintFeePercentList.pop();
    //     } else if(_flag == 13) {
    //         minVoteCountList[_index] = minVoteCountList[minVoteCountList.length - 1];
    //         minVoteCountList.pop();
    //     } else if(_flag == 14) {
    //         minStakerCountPercentList[_index] = minStakerCountPercentList[minStakerCountPercentList.length - 1];
    //         minStakerCountPercentList.pop();
    //     } else if(_flag == 15) {
    //         availableVABAmountList[_index] = availableVABAmountList[availableVABAmountList.length - 1];
    //         availableVABAmountList.pop();
    //     } else if(_flag == 16) {
    //         boardVotePeriodList[_index] = boardVotePeriodList[boardVotePeriodList.length - 1];
    //         boardVotePeriodList.pop();
    //     } else if(_flag == 17) {
    //         boardVoteWeightList[_index] = boardVoteWeightList[boardVoteWeightList.length - 1];
    //         boardVoteWeightList.pop();
    //     } else if(_flag == 18) {
    //         rewardVotePeriodList[_index] = rewardVotePeriodList[rewardVotePeriodList.length - 1];
    //         rewardVotePeriodList.pop();
    //     } else if(_flag == 19) {
    //         subscriptionAmountList[_index] = subscriptionAmountList[subscriptionAmountList.length - 1];
    //         subscriptionAmountList.pop();
    //     } else if(_flag == 20) {
    //         boardRewardRateList[_index] = boardRewardRateList[boardRewardRateList.length - 1];
    //         boardRewardRateList.pop();
    //     } 
    // }

    /// @notice Get property proposal list
    function getPropertyProposalList(uint256 _flag) public view returns (uint256[] memory _list) {
        if(_flag == 0) _list = filmVotePeriodList;
        else if(_flag == 1) _list = agentVotePeriodList;
        else if(_flag == 2) _list = disputeGracePeriodList;
        else if(_flag == 3) _list = propertyVotePeriodList;
        else if(_flag == 4) _list = lockPeriodList;
        else if(_flag == 5) _list = rewardRateList;
        else if(_flag == 6) _list = extraRewardRateList;
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
    
    /// @notice Get agent/board/pool proposal created time
    function getGovProposalTime(
        address _member, 
        uint256 _flag
    ) external view returns (uint256 cTime_, uint256 aTime_) {
        if(_flag == 1) {
            cTime_ = agentProposalInfo[_member].createTime;
            aTime_ = agentProposalInfo[_member].approveTime;
        } else if(_flag == 2) {
            cTime_ = boardProposalInfo[_member].createTime;
            aTime_ = boardProposalInfo[_member].approveTime;
        } else if(_flag == 3) {
            cTime_ = rewardProposalInfo[_member].createTime;
            aTime_ = rewardProposalInfo[_member].approveTime;
        }
    }

    function updatePropertyProposalApproveTime(
        uint256 _property, 
        uint256 _flag, 
        uint256 _time
    ) external onlyVote {
        propertyProposalInfo[_flag][_property].approveTime = _time;
    }

    function updateGovProposalApproveTime(
        address _member, 
        uint256 _flag, 
        uint256 _time
    ) external onlyVote {
        if(_flag == 1) agentProposalInfo[_member].approveTime = _time;
        else if(_flag == 2) boardProposalInfo[_member].approveTime = _time;
        else if(_flag == 3) rewardProposalInfo[_member].approveTime = _time;
    }
    
    ///================ @dev Update the property value for only testing in the testnet
    // we won't deploy this function in the mainnet
    function updatePropertyForTesting(
        uint256 _value, 
        uint256 _flag
    ) external onlyAuditor {
        require(_value > 0, "test: Zero value");

        if(_flag == 0) filmVotePeriod = _value;
        else if(_flag == 1) agentVotePeriod = _value;
        else if(_flag == 2) disputeGracePeriod = _value;
        else if(_flag == 3) propertyVotePeriod = _value;
        else if(_flag == 4) lockPeriod = _value;
        else if(_flag == 5) rewardRate = _value;
        else if(_flag == 6) extraRewardRate = _value;
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
    function updateDAOFundForTesting(address _address) external onlyAuditor {        
        DAO_FUND_REWARD = _address;    
    }
        
}