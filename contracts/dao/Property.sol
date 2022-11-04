// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/Helper.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IStakingPool.sol";
import "../interfaces/IOwnablee.sol";
import "hardhat/console.sol";

contract Property is ReentrancyGuard {
    event PropertyUpdated(uint256 property, uint256 flag);
    // filmboard    
    event FilmBoardProposalCreated(address member);
    event FilmBoardMemberAdded(address member);
    event FilmBoardMemberRemoved(address member);
    
    struct RewardProposal {
        string title;          // proposal title
        string description;    // proposal description
    }

    IERC20 private immutable PAYOUT_TOKEN;    // VAB token       
    address private immutable OWNABLE;        // Ownablee contract address 
    address private immutable VOTE;           // Vote contract address
    address private immutable STAKING_POOL;   // StakingPool contract address
    address private immutable UNI_HELPER;     // UniHelper contract address
    address private immutable USDC_TOKEN;     // USDC token 

    address public DAO_FUND_REWARD;                               // address for sending the DAO rewards fund
    mapping(address => uint256) public isRewardWhitelist;         //(rewardAddress => 0: no member, 1: candiate, 2: already member)    
    mapping(address => RewardProposal) public rewardProposalInfo; //(rewardAddress => RewardProposal)

    // Vote
    uint256 public filmVotePeriod;       // 0 - film vote period
    uint256 public agentVotePeriod;      // 1 - vote period for replacing auditor
    uint256 public disputeGracePeriod;   // 2 - grace period for replacing Auditor
    uint256 public propertyVotePeriod;   // 3 - vote period for updating properties    
    // StakingPool
    uint256 public lockPeriod;           // 4 - lock period for staked VAB
    uint256 public rewardRate;           // 5 - 0.0004%(1% = 1e8, 100% = 1e10)
    uint256 public extraRewardRate;      // 6 - 0.0001%(1% = 1e8, 100% = 1e10)
    // FilmBoard
    uint256 public maxAllowPeriod;       // 7 - max allowed period for removing filmBoard member
    // VabbleDAO
    uint256 public proposalFeeAmount;    // 8 - USDC amount($100) studio should pay when create a proposal
    uint256 public fundFeePercent;       // 9 - percent(2% = 2*1e8) of fee on the amount raised
    uint256 public minDepositAmount;     // 10 - USDC min amount($50) that a customer can deposit to a film approved for funding
    uint256 public maxDepositAmount;     // 11 - USDC max amount($5000) that a customer can deposit to a film approved for funding
    // FactoryNFT
    uint256 public maxMintFeePercent;    // 12 - 10%(1% = 1e8, 100% = 1e10)

    uint256 public minVoteCount;         // 13 - 5 ppl
    uint256 public minStakerCountPercent;// 14 - percent(5% = 5*1e8)

    uint256 public availableVABAmount;   // vab amount for replacing the auditor    
    uint256 public boardVotePeriod;      // filmBoard vote period
    uint256 public boardVoteWeight;      // filmBoard member's vote weight
    uint256 public rewardVotePeriod;     // withdraw address setup for moving to V2
    uint256 public subscriptionAmount;   // user need to have an active subscription(pay $10 per month) for rent films.    
    uint256 public boardRewardRate;      // 25%(1% = 1e8, 100% = 1e10) more reward rate for filmboard members   

    address[] private agents;
    address[] private rewardAddressList;
    uint256[] private filmVotePeriodList;          
    uint256[] private agentVotePeriodList;      
    uint256[] private disputeGracePeriodList;         
    uint256[] private propertyVotePeriodList;
    uint256[] private lockPeriodList;           
    uint256[] private rewardRateList;           
    uint256[] private extraRewardRateList;      
    uint256[] private maxAllowPeriodList;
    uint256[] private proposalFeeAmountList;
    uint256[] private fundFeePercentList;
    uint256[] private minDepositAmountList;
    uint256[] private maxDepositAmountList;
    uint256[] private maxMintFeePercentList;
    uint256[] private minVoteCountList;    
    uint256[] private minStakerCountPercentList;        

    // filmboard member proposal
    address[] private filmBoardCandidates;   // filmBoard candidates and if isBoardWhitelist is true, become filmBoard member
    address[] private filmBoardMembers;      // filmBoard members
    mapping(address => uint256) public isBoardWhitelist; // (filmBoard member => 0: no member, 1: candiate, 2: already member)
    mapping(address => uint256) public lastVoteTime;     // (staker => block.timestamp)

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
        address _payoutToken,
        address _ownableContract,
        address _voteContract,
        address _stakingContract,
        address _uniHelperContract,
        address _usdcToken
    ) {
        require(_payoutToken != address(0), "payoutToken: Zero address");
        PAYOUT_TOKEN = IERC20(_payoutToken);    
        require(_ownableContract != address(0), "ownableContract: Zero address");
        OWNABLE = _ownableContract;  
        require(_voteContract != address(0), "voteContract: Zero address");
        VOTE = _voteContract;
        require(_stakingContract != address(0), "stakingContract: Zero address");
        STAKING_POOL = _stakingContract;
        require(_uniHelperContract != address(0), "uniHelperContract: Zero address");
        UNI_HELPER = _uniHelperContract;          
        require(_usdcToken != address(0), "usdcToken: Zero address");
        USDC_TOKEN = _usdcToken;

        filmVotePeriod = 10 days;   
        boardVotePeriod = 14 days;
        agentVotePeriod = 10 days;
        boardVoteWeight = 30 * 1e8;    // 30% (1% = 1e8)
        disputeGracePeriod = 30 days;  
        propertyVotePeriod = 10 days;
        rewardVotePeriod = 30 days;

        lockPeriod = 30 days;
        rewardRate = 40000;            // 0.0004% (1% = 1e8, 100%=1e10)
        extraRewardRate = 10000;       // 0.0001% (1% = 1e8, 100%=1e10)
        boardRewardRate = 25 * 1e8;    // 25%

        maxAllowPeriod = 90 days;        

        proposalFeeAmount = 100 * (10**IERC20Metadata(_usdcToken).decimals()); // amount in cash(usd dollar - $100)
        minDepositAmount = 50 * (10**IERC20Metadata(_usdcToken).decimals());   // amount in cash(usd dollar - $50)
        maxDepositAmount = 5000 * (10**IERC20Metadata(_usdcToken).decimals()); // amount in cash(usd dollar - $5000)
        fundFeePercent = 2 * 1e8;    // percent(2%) 
        availableVABAmount = 75 * 1e6 * (10**IERC20Metadata(_payoutToken).decimals()); // 75M
        
        maxMintFeePercent = 1e9;   // 10%
        subscriptionAmount = 10 * (10**IERC20Metadata(_usdcToken).decimals()); // amount in cash(usd dollar - $10)
        minVoteCount = 5;
        minStakerCountPercent = 5 * 1e8; // 5%(1% = 1e8, 100%=1e10)
    }

    /// =================== proposals for replacing auditor ==============
    /// @notice Anyone($100 fee in VAB) create a proposal for replacing Auditor
    function proposalAuditor(address _agent) external onlyStaker nonReentrant {
        require(_agent != address(0), "proposalAuditor: Zero address");                
        require(IOwnablee(OWNABLE).auditor() != _agent, "proposalAuditor: Already auditor address");                
        require(__isPaidFee(proposalFeeAmount), 'proposalAuditor: Not paid fee');

        agents.push(_agent);
    }

    function getAgent(uint256 _index) public view returns (address agent_) {
        if(agents.length > 0 && agents.length > _index) {
            agent_ = agents[_index];
        } else {
            agent_ = address(0);
        }
    }

    function getAgentList() public view returns (address[] memory) {
        return agents;
    }

    /// @notice Remove agent address from array
    function removeAgent(uint256 _index) external onlyVote {        
        agents[_index] = agents[agents.length - 1];
        agents.pop();
    }

    /// @notice Check if proposal fee transferred from studio to stakingPool
    // Get expected VAB amount from UniswapV2 and then Transfer VAB: user(studio) -> stakingPool.
    function __isPaidFee(uint256 _payAmount) private returns(bool) {    
        uint256 expectVABAmount = IUniHelper(UNI_HELPER).expectedAmount(_payAmount, USDC_TOKEN, address(PAYOUT_TOKEN));
        if(expectVABAmount > 0) {
            Helper.safeTransferFrom(address(PAYOUT_TOKEN), msg.sender, address(this), expectVABAmount);
            if(PAYOUT_TOKEN.allowance(address(this), STAKING_POOL) == 0) {
                Helper.safeApprove(address(PAYOUT_TOKEN), STAKING_POOL, PAYOUT_TOKEN.totalSupply());
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
    ) external onlyStaker nonReentrant {
        require(_rewardAddress != address(0), "proposalRewardFund: Zero candidate address");     
        require(isRewardWhitelist[_rewardAddress] == 0, "proposalRewardFund: Already created proposal by this address");
        require(__isPaidFee(10 * proposalFeeAmount), 'proposalRewardFund: Not paid fee');

        rewardAddressList.push(_rewardAddress);
        isRewardWhitelist[_rewardAddress] = 1;

        RewardProposal storage rp = rewardProposalInfo[_rewardAddress];
        rp.title = _title;
        rp.description = _description;
    }

    /// @notice Set DAO_FUND_REWARD by Vote contract
    function setRewardAddress(address _rewardAddress) external onlyVote nonReentrant {
        isRewardWhitelist[_rewardAddress] = 2;
        DAO_FUND_REWARD = _rewardAddress;

        __removeRewardAddress(_rewardAddress);
    }

    function __removeRewardAddress(address _address) private {
        for(uint256 i = 0; i < rewardAddressList.length; i++) { 
            if(_address != rewardAddressList[i]) continue;

            rewardAddressList[i] = rewardAddressList[rewardAddressList.length - 1];
            rewardAddressList.pop();
        }
    }

    /// @notice Get reward fund proposal title and description
    function getRewardProposalInfo(address _rewardAddress) external view returns (string memory, string memory) {
        RewardProposal storage rp = rewardProposalInfo[_rewardAddress];
        string memory title_ = rp.title;
        string memory desc_ = rp.description;        

        return (title_, desc_);
    }

    // =================== FilmBoard proposal ====================
    /// @notice Anyone($100 fee of VAB) create a proposal with the case to be added to film board
    function proposalFilmBoard(address _member) external nonReentrant {
        require(_member != address(0), "proposalFilmBoard: Zero candidate address");     
        require(isBoardWhitelist[_member] == 0, "proposalFilmBoard: Already film board member or candidate");                  
        require(__isPaidFee(proposalFeeAmount), 'proposalFilmBoard: Not paid fee');     

        filmBoardCandidates.push(_member);
        isBoardWhitelist[_member] = 1;

        emit FilmBoardProposalCreated(_member);
    }

    /// @notice Add a member to whitelist by Vote contract
    function addFilmBoardMember(address _member) external onlyVote nonReentrant {
        require(_member != address(0), "addFilmBoardMember: Zero candidate address");     
        require(isBoardWhitelist[_member] == 1, "addFilmBoardMember: Already film board member or no candidate");   

        filmBoardMembers.push(_member);
        isBoardWhitelist[_member] = 2;
        
        for(uint256 i = 0; i < filmBoardCandidates.length; i++) {
            if(_member == filmBoardCandidates[i]) {
                filmBoardCandidates[i] = filmBoardCandidates[filmBoardCandidates.length - 1];
                filmBoardCandidates.pop();
            }
        }
        emit FilmBoardMemberAdded(_member);
    }

    /// @notice Remove a member from whitelist if he didn't vote to any propsoal for over 3 months
    function removeFilmBoardMember(address _member) external nonReentrant {
        require(isBoardWhitelist[_member] == 2, "removeFilmBoardMember: Not Film board member");        
        require(maxAllowPeriod < block.timestamp - lastVoteTime[_member], 'maxAllowPeriod');
        require(maxAllowPeriod > block.timestamp - IStakingPool(STAKING_POOL).lastfundProposalCreateTime(), 'lastfundProposalCreateTime');

        isBoardWhitelist[_member] = 0;
    
        for(uint256 i = 0; i < filmBoardMembers.length; i++) {
            if(_member == filmBoardMembers[i]) {
                filmBoardMembers[i] = filmBoardMembers[filmBoardMembers.length - 1];
                filmBoardMembers.pop();
            }
        }
        emit FilmBoardMemberRemoved(_member);
    }
    
    /// @notice Get film board candidates/members
    function getFilmBoardItems(bool _candidateOrMember) external view returns (address[] memory) {
        if(_candidateOrMember) return filmBoardCandidates;
        else return filmBoardMembers;
    }

    /// @notice Update last vote time
    function updateLastVoteTime(address _member) external onlyVote {
        lastVoteTime[_member] = block.timestamp;
    }
    
    // ================= subscriptionAmount ==========
    function updateSubscriptionAmount(uint256 _amount) external onlyAuditor {
        require(_amount > 0, "updateSubscriptionAmount: Zero amount");
        subscriptionAmount = _amount;
    }

    // ===================properties proposal ====================
    /// @notice proposals for properties
    function proposalProperty(uint256 _property, uint256 _flag) public onlyStaker nonReentrant {
        require(_property > 0, "proposalProperty: Zero period");
        require(_flag >= 0 && _flag < 15, "proposalProperty: Invalid flag");
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
        }                        
    }

    function getProperty(uint256 _index, uint256 _flag) external view returns (uint256 property_) { 
        require(_flag >= 0 && _flag < 15, "getProperty: Invalid flag");   
        
        if(_flag == 0) {
            if(filmVotePeriodList.length > 0 && filmVotePeriodList.length > _index) property_ = filmVotePeriodList[_index];
            else property_ = 0;
        } else if(_flag == 1) {
            if(agentVotePeriodList.length > 0 && agentVotePeriodList.length > _index) property_ = agentVotePeriodList[_index];
            else property_ = 0;
        } else if(_flag == 2) {
            if(disputeGracePeriodList.length > 0 && disputeGracePeriodList.length > _index) property_ = disputeGracePeriodList[_index];
            else property_ = 0;
        } else if(_flag == 3) {
            if(propertyVotePeriodList.length > 0 && propertyVotePeriodList.length > _index) property_ = propertyVotePeriodList[_index];
            else property_ = 0;
        } else if(_flag == 4) {
            if(lockPeriodList.length > 0 && lockPeriodList.length > _index) property_ = lockPeriodList[_index];
            else property_ = 0;
        } else if(_flag == 5) {
            if(rewardRateList.length > 0 && rewardRateList.length > _index) property_ = rewardRateList[_index];
            else property_ = 0;
        } else if(_flag == 6) {
            if(extraRewardRateList.length > 0 && extraRewardRateList.length > _index) property_ = extraRewardRateList[_index];
            else property_ = 0;
        } else if(_flag == 7) {
            if(maxAllowPeriodList.length > 0 && maxAllowPeriodList.length > _index) property_ = maxAllowPeriodList[_index];
            else property_ = 0;
        } else if(_flag == 8) {
            if(proposalFeeAmountList.length > 0 && proposalFeeAmountList.length > _index) property_ = proposalFeeAmountList[_index];
            else property_ = 0;
        } else if(_flag == 9) {
            if(fundFeePercentList.length > 0 && fundFeePercentList.length > _index) property_ = fundFeePercentList[_index];
            else property_ = 0;
        } else if(_flag == 10) {
            if(minDepositAmountList.length > 0 && minDepositAmountList.length > _index) property_ = minDepositAmountList[_index];
            else property_ = 0;
        } else if(_flag == 11) {
            if(maxDepositAmountList.length > 0 && maxDepositAmountList.length > _index) property_ = maxDepositAmountList[_index];
            else property_ = 0;
        } else if(_flag == 12) {
            if(maxMintFeePercentList.length > 0 && maxMintFeePercentList.length > _index) property_ = maxMintFeePercentList[_index];
            else property_ = 0;
        } else if(_flag == 13) {
            if(minVoteCountList.length > 0 && minVoteCountList.length > _index) property_ = minVoteCountList[_index];
            else property_ = 0;
        } else if(_flag == 14) {
            if(minStakerCountPercentList.length > 0 && minStakerCountPercentList.length > _index) property_ = minStakerCountPercentList[_index];
            else property_ = 0;
        }                         
    }

    function updateProperty(uint256 _index, uint256 _flag) external onlyVote {
        require(_flag >= 0 && _flag < 15, "updateProperty: Invalid flag");   

        if(_flag == 0) {
            filmVotePeriod = filmVotePeriodList[_index];
            emit PropertyUpdated(filmVotePeriod, _flag);
        } else if(_flag == 1) {
            agentVotePeriod = agentVotePeriodList[_index];
            emit PropertyUpdated(agentVotePeriod, _flag);
        } else if(_flag == 2) {
            disputeGracePeriod = disputeGracePeriodList[_index];
            emit PropertyUpdated(disputeGracePeriod, _flag);
        } else if(_flag == 3) {
            propertyVotePeriod = propertyVotePeriodList[_index];
            emit PropertyUpdated(propertyVotePeriod, _flag);
        } else if(_flag == 4) {
            lockPeriod = lockPeriodList[_index];
            emit PropertyUpdated(lockPeriod, _flag);
        } else if(_flag == 5) {
            rewardRate = rewardRateList[_index];
            emit PropertyUpdated(rewardRate, _flag);
        } else if(_flag == 6) {
            extraRewardRate = extraRewardRateList[_index];
            emit PropertyUpdated(extraRewardRate, _flag);
        } else if(_flag == 7) {
            maxAllowPeriod = maxAllowPeriodList[_index];
            emit PropertyUpdated(maxAllowPeriod, _flag);        
        } else if(_flag == 8) {
            proposalFeeAmount = proposalFeeAmountList[_index];
            emit PropertyUpdated(proposalFeeAmount, _flag);        
        } else if(_flag == 9) {
            fundFeePercent = fundFeePercentList[_index];
            emit PropertyUpdated(fundFeePercent, _flag);        
        } else if(_flag == 10) {
            minDepositAmount = minDepositAmountList[_index];
            emit PropertyUpdated(minDepositAmount, _flag);        
        } else if(_flag == 11) {
            maxDepositAmount = maxDepositAmountList[_index];
            emit PropertyUpdated(maxDepositAmount, _flag);        
        } else if(_flag == 12) {
            maxMintFeePercent = maxMintFeePercentList[_index];
            emit PropertyUpdated(maxMintFeePercent, _flag);     
        } else if(_flag == 13) {
            minVoteCount = minVoteCountList[_index];
            emit PropertyUpdated(minVoteCount, _flag);     
        } else if(_flag == 14) {
            minStakerCountPercent = minStakerCountPercentList[_index];
            emit PropertyUpdated(minStakerCountPercent, _flag);     
        }                 
    }

    function removeProperty(uint256 _index, uint256 _flag) external onlyVote {   
        require(_flag >= 0 && _flag < 15, "removeProperty: Invalid flag");   

        if(_flag == 0) {  
            filmVotePeriodList[_index] = filmVotePeriodList[filmVotePeriodList.length - 1];
            filmVotePeriodList.pop();
        } else if(_flag == 1) {
            agentVotePeriodList[_index] = agentVotePeriodList[agentVotePeriodList.length - 1];
            agentVotePeriodList.pop();
        } else if(_flag == 2) {
            disputeGracePeriodList[_index] = disputeGracePeriodList[disputeGracePeriodList.length - 1];
            disputeGracePeriodList.pop();
        } else if(_flag == 3) {
            propertyVotePeriodList[_index] = propertyVotePeriodList[propertyVotePeriodList.length - 1];
            propertyVotePeriodList.pop();
        } else if(_flag == 4) {
            lockPeriodList[_index] = lockPeriodList[lockPeriodList.length - 1];
            lockPeriodList.pop();
        } else if(_flag == 5) {
            rewardRateList[_index] = rewardRateList[rewardRateList.length - 1];
            rewardRateList.pop();
        } else if(_flag == 6) {
            extraRewardRateList[_index] = extraRewardRateList[extraRewardRateList.length - 1];
            extraRewardRateList.pop();
        } else if(_flag == 7) {
            maxAllowPeriodList[_index] = maxAllowPeriodList[maxAllowPeriodList.length - 1];
            maxAllowPeriodList.pop();
        } else if(_flag == 8) {
            proposalFeeAmountList[_index] = proposalFeeAmountList[proposalFeeAmountList.length - 1];
            proposalFeeAmountList.pop();
        } else if(_flag == 9) {
            fundFeePercentList[_index] = fundFeePercentList[fundFeePercentList.length - 1];
            fundFeePercentList.pop();
        } else if(_flag == 10) {
            minDepositAmountList[_index] = minDepositAmountList[minDepositAmountList.length - 1];
            minDepositAmountList.pop();
        } else if(_flag == 11) {
            maxDepositAmountList[_index] = maxDepositAmountList[maxDepositAmountList.length - 1];
            maxDepositAmountList.pop();
        } else if(_flag == 12) {
            maxMintFeePercentList[_index] = maxMintFeePercentList[maxMintFeePercentList.length - 1];
            maxMintFeePercentList.pop();
        } else if(_flag == 13) {
            minVoteCountList[_index] = minVoteCountList[minVoteCountList.length - 1];
            minVoteCountList.pop();
        } else if(_flag == 14) {
            minStakerCountPercentList[_index] = minStakerCountPercentList[minStakerCountPercentList.length - 1];
            minStakerCountPercentList.pop();
        }                                
    }

    /// @notice get a property list in a vote
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
    }

    ///================ @dev Update the property value for only testing in the testnet
    // we won't deploy this function in the mainnet
    function updatePropertyForTesting(uint256 _value, uint256 _flag) external onlyAuditor {
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
    function updateRewardAddressForTesting(address _rewardAddress) external onlyAuditor {
        require(_rewardAddress != address(0), "test: Zero address");
        DAO_FUND_REWARD = _rewardAddress;            
    }
        
}