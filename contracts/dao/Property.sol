// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/Ownable.sol";
import "../libraries/Helper.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IStakingPool.sol";
import "hardhat/console.sol";

contract Property is Ownable, ReentrancyGuard {
    event PropertyUpdated(uint256 property, uint256 flag);
    
    IERC20 private immutable PAYOUT_TOKEN;    // VAB token        
    address private immutable VOTE;           // Vote contract address
    address private immutable STAKING_POOL;   // StakingPool contract address
    address private immutable UNI_HELPER;     // UniHelper contract address
    address private immutable USDC_TOKEN;     // USDC token 

    // Vote
    uint256 public filmVotePeriod;            // 0 - film vote period
    uint256 public boardVotePeriod;           // 1 - filmBoard vote period
    uint256 public boardVoteWeight;           // 2 - filmBoard member's vote weight
    uint256 public agentVotePeriod;           // 3 - vote period for replacing auditor
    uint256 public disputeGracePeriod;        // 4 - grace period for replacing Auditor
    uint256 public propertyVotePeriod;        // 5 - vote period for updating properties
    // StakingPool
    uint256 public lockPeriod;                // 6 - lock period for staked VAB
    uint256 public rewardRate;                // 7 - 1% = 1e8, 100% = 1e10
    uint256 public extraRewardRate;           // 8 - 1% = 1e8, 100% = 1e10
    // FilmBoard
    uint256 public maxAllowPeriod;            // 9 - max allowed period for removing filmBoard member
    // VabbleDAO
    uint256 public proposalFeeAmount;         // 10 - USDC amount($100) studio should pay when create a proposal
    uint256 public fundFeePercent;            // 11 - percent(2% = 2*1e8) of fee on the amount raised
    uint256 public minDepositAmount;          // 12 - USDC min amount($50) that a customer can deposit to a film approved for funding
    uint256 public maxDepositAmount;          // 13 - USDC max amount($5000) that a customer can deposit to a film approved for funding
    uint256 public subscriptionAmount;        // 15 - user need to have an active subscription(pay $10 per month) for rent films.
    // FactoryNFT
    uint256 public maxMintFeePercent;         // 14 - 10%(1% = 1e8, 100% = 1e10)

    uint256 public availableVABAmount;        // vab amount for replacing the auditor
    

    address[] private agents;
    uint256[] private filmVotePeriodList;       
    uint256[] private boardVotePeriodList;      
    uint256[] private boardVoteWeightList;      
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
    uint256[] private subscriptionAmountList;    

    modifier onlyVote() {
        require(msg.sender == VOTE, "caller is not the vote contract");
        _;
    }

    constructor(
        address _payoutToken,
        address _voteContract,
        address _stakingContract,
        address _uniHelperContract,
        address _usdcToken
    ) {
        require(_payoutToken != address(0), "payoutToken: Zero address");
        PAYOUT_TOKEN = IERC20(_payoutToken);    
        require(_voteContract != address(0), "voteContract: Zero address");
        VOTE = _voteContract;
        require(_stakingContract != address(0), "stakingContract: Zero address");
        STAKING_POOL = _stakingContract;
        require(_uniHelperContract != address(0), "uniHelperContract: Zero address");
        UNI_HELPER = _uniHelperContract;          
        require(_usdcToken != address(0), "usdcToken: Zero address");
        USDC_TOKEN = _usdcToken;

        filmVotePeriod = 10 days;   
        boardVotePeriod = 10 days;
        agentVotePeriod = 10 days;
        boardVoteWeight = 30 * 1e8;    // 30%, 1% = 1e8
        disputeGracePeriod = 30 days;  
        propertyVotePeriod = 10 days;

        lockPeriod = 30 days;
        rewardRate = 40000;            // 0.0004% (1% = 1e8, 100%=1e10)
        extraRewardRate = 667;         // 0.00000667% (1% = 1e8, 100%=1e10)

        maxAllowPeriod = 90 days;        

        proposalFeeAmount = 100 * (10**IERC20Metadata(_usdcToken).decimals()); // amount in cash(usd dollar - $100)
        minDepositAmount = 50 * (10**IERC20Metadata(_usdcToken).decimals());   // amount in cash(usd dollar - $50)
        maxDepositAmount = 5000 * (10**IERC20Metadata(_usdcToken).decimals()); // amount in cash(usd dollar - $5000)
        fundFeePercent = 2 * 1e8;    // percent(2%) 
        availableVABAmount = 75 * 1e7 * (10**IERC20Metadata(_payoutToken).decimals()); // 75M
        
        maxMintFeePercent = 1e9;   // 10%
        subscriptionAmount = 10 * (10**IERC20Metadata(_usdcToken).decimals()); // amount in cash(usd dollar - $10)
    }

    /// ========= proposals for replacing auditor
    /// @notice Anyone($100 fee in VAB) create a proposal for replacing Auditor
    function proposalAuditor(address _agent) external nonReentrant {
        require(_agent != address(0), "proposalAuditor: Zero address");                
        require(auditor != _agent, "proposalAuditor: Already Auditor address");                
        require(__isPaidFee(), 'proposalAuditor: Not paid fee');

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
    function __isPaidFee() private returns(bool) {    
        uint256 depositAmount = proposalFeeAmount;
        uint256 expectVABAmount = IUniHelper(UNI_HELPER).expectedAmount(depositAmount, USDC_TOKEN, address(PAYOUT_TOKEN));
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

    /// @notice proposals for properties
    function proposalProperty(uint256 _property, uint256 _flag) public nonReentrant {
        require(_property > 0, "proposalProperty: Zero period");
        require(__isPaidFee(), 'proposalProperty: Not paid fee');

        if(_flag == 0) {
            require(filmVotePeriod != _property, "proposalProperty: Already filmVotePeriod");
            filmVotePeriodList.push(_property);
        } else if(_flag == 1) {
            require(boardVotePeriod != _property, "proposalProperty: Already boardVotePeriod");
            boardVotePeriodList.push(_property);
        } else if(_flag == 2) {
            require(boardVoteWeight != _property, "proposalProperty: Already boardVoteWeight");
            boardVoteWeightList.push(_property);
        } else if(_flag == 3) {
            require(agentVotePeriod != _property, "proposalProperty: Already agentVotePeriod");
            agentVotePeriodList.push(_property);
        } else if(_flag == 4) {
            require(disputeGracePeriod != _property, "proposalProperty: Already disputeGracePeriod");
            disputeGracePeriodList.push(_property);
        } else if(_flag == 5) {
            require(propertyVotePeriod != _property, "proposalProperty: Already propertyVotePeriod");
            propertyVotePeriodList.push(_property);
        } else if(_flag == 6) {
            require(lockPeriod != _property, "proposalProperty: Already lockPeriod");
            lockPeriodList.push(_property);
        } else if(_flag == 7) {
            require(rewardRate != _property, "proposalProperty: Already rewardRate");
            rewardRateList.push(_property);
        } else if(_flag == 8) {
            require(extraRewardRate != _property, "proposalProperty: Already extraRewardRate");
            extraRewardRateList.push(_property);
        } else if(_flag == 9) {
            require(maxAllowPeriod != _property, "proposalProperty: Already maxAllowPeriod");
            maxAllowPeriodList.push(_property);
        } else if(_flag == 10) {
            require(proposalFeeAmount != _property, "proposalProperty: Already proposalFeeAmount");
            proposalFeeAmountList.push(_property);
        } else if(_flag == 11) {
            require(fundFeePercent != _property, "proposalProperty: Already fundFeePercent");
            fundFeePercentList.push(_property);
        } else if(_flag == 12) {
            require(minDepositAmount != _property, "proposalProperty: Already minDepositAmount");
            minDepositAmountList.push(_property);
        } else if(_flag == 13) {
            require(maxDepositAmount != _property, "proposalProperty: Already maxDepositAmount");
            maxDepositAmountList.push(_property);
        } else if(_flag == 14) {
            require(maxMintFeePercent != _property, "proposalProperty: Already maxMintFeePercent");
            maxMintFeePercentList.push(_property);
        } else if(_flag == 15) {
            require(subscriptionAmount != _property, "proposalProperty: Already subscriptionAmount");
            subscriptionAmountList.push(_property);
        }        
    }

    function getProperty(uint256 _index, uint256 _flag) external view returns (uint256 property_) {    
        if(_flag == 0) {
            if(filmVotePeriodList.length > 0 && filmVotePeriodList.length > _index) property_ = filmVotePeriodList[_index];
            else property_ = 0;
        } else if(_flag == 1) {
            if(boardVotePeriodList.length > 0 && boardVotePeriodList.length > _index) property_ = boardVotePeriodList[_index];
            else property_ = 0;
        } else if(_flag == 2) {
            if(boardVoteWeightList.length > 0 && boardVoteWeightList.length > _index) property_ = boardVoteWeightList[_index];
            else property_ = 0;
        } else if(_flag == 3) {
            if(agentVotePeriodList.length > 0 && agentVotePeriodList.length > _index) property_ = agentVotePeriodList[_index];
            else property_ = 0;
        } else if(_flag == 4) {
            if(disputeGracePeriodList.length > 0 && disputeGracePeriodList.length > _index) property_ = disputeGracePeriodList[_index];
            else property_ = 0;
        } else if(_flag == 5) {
            if(propertyVotePeriodList.length > 0 && propertyVotePeriodList.length > _index) property_ = propertyVotePeriodList[_index];
            else property_ = 0;
        } else if(_flag == 6) {
            if(lockPeriodList.length > 0 && lockPeriodList.length > _index) property_ = lockPeriodList[_index];
            else property_ = 0;
        } else if(_flag == 7) {
            if(rewardRateList.length > 0 && rewardRateList.length > _index) property_ = rewardRateList[_index];
            else property_ = 0;
        } else if(_flag == 8) {
            if(extraRewardRateList.length > 0 && extraRewardRateList.length > _index) property_ = extraRewardRateList[_index];
            else property_ = 0;
        } else if(_flag == 9) {
            if(maxAllowPeriodList.length > 0 && maxAllowPeriodList.length > _index) property_ = maxAllowPeriodList[_index];
            else property_ = 0;
        } else if(_flag == 10) {
            if(proposalFeeAmountList.length > 0 && proposalFeeAmountList.length > _index) property_ = proposalFeeAmountList[_index];
            else property_ = 0;
        } else if(_flag == 11) {
            if(fundFeePercentList.length > 0 && fundFeePercentList.length > _index) property_ = fundFeePercentList[_index];
            else property_ = 0;
        } else if(_flag == 12) {
            if(minDepositAmountList.length > 0 && minDepositAmountList.length > _index) property_ = minDepositAmountList[_index];
            else property_ = 0;
        } else if(_flag == 13) {
            if(maxDepositAmountList.length > 0 && maxDepositAmountList.length > _index) property_ = maxDepositAmountList[_index];
            else property_ = 0;
        } else if(_flag == 14) {
            if(maxMintFeePercentList.length > 0 && maxMintFeePercentList.length > _index) property_ = maxMintFeePercentList[_index];
            else property_ = 0;
        } else if(_flag == 15) {
            if(subscriptionAmountList.length > 0 && subscriptionAmountList.length > _index) property_ = subscriptionAmountList[_index];
            else property_ = 0;
        }         
    }

    function updateProperty(uint256 _index, uint256 _flag) external onlyVote {
        if(_flag == 0) {
            filmVotePeriod = filmVotePeriodList[_index];
            emit PropertyUpdated(filmVotePeriod, _flag);
        } else if(_flag == 1) {
            boardVotePeriod = boardVotePeriodList[_index];
            emit PropertyUpdated(boardVotePeriod, _flag);
        } else if(_flag == 2) {
            boardVoteWeight = boardVoteWeightList[_index];
            emit PropertyUpdated(boardVoteWeight, _flag);
        } else if(_flag == 3) {
            agentVotePeriod = agentVotePeriodList[_index];
            emit PropertyUpdated(agentVotePeriod, _flag);
        } else if(_flag == 4) {
            disputeGracePeriod = disputeGracePeriodList[_index];
            emit PropertyUpdated(disputeGracePeriod, _flag);
        } else if(_flag == 5) {
            propertyVotePeriod = propertyVotePeriodList[_index];
            emit PropertyUpdated(propertyVotePeriod, _flag);
        } else if(_flag == 6) {
            lockPeriod = lockPeriodList[_index];
            emit PropertyUpdated(lockPeriod, _flag);
        } else if(_flag == 7) {
            rewardRate = rewardRateList[_index];
            emit PropertyUpdated(rewardRate, _flag);
        } else if(_flag == 8) {
            extraRewardRate = extraRewardRateList[_index];
            emit PropertyUpdated(extraRewardRate, _flag);
        } else if(_flag == 9) {
            maxAllowPeriod = maxAllowPeriodList[_index];
            emit PropertyUpdated(maxAllowPeriod, _flag);        
        } else if(_flag == 10) {
            proposalFeeAmount = proposalFeeAmountList[_index];
            emit PropertyUpdated(proposalFeeAmount, _flag);        
        } else if(_flag == 11) {
            fundFeePercent = fundFeePercentList[_index];
            emit PropertyUpdated(fundFeePercent, _flag);        
        } else if(_flag == 12) {
            minDepositAmount = minDepositAmountList[_index];
            emit PropertyUpdated(minDepositAmount, _flag);        
        } else if(_flag == 13) {
            maxDepositAmount = maxDepositAmountList[_index];
            emit PropertyUpdated(maxDepositAmount, _flag);        
        } else if(_flag == 14) {
            maxMintFeePercent = maxMintFeePercentList[_index];
            emit PropertyUpdated(maxMintFeePercent, _flag);        
        } else if(_flag == 15) {
            subscriptionAmount = subscriptionAmountList[_index];
            emit PropertyUpdated(subscriptionAmount, _flag);        
        } 
    }

    function removeProperty(uint256 _index, uint256 _flag) external onlyVote {       
        if(_flag == 0) {  
            filmVotePeriodList[_index] = filmVotePeriodList[filmVotePeriodList.length - 1];
            filmVotePeriodList.pop();
        } else if(_flag == 1) {
            boardVotePeriodList[_index] = boardVotePeriodList[boardVotePeriodList.length - 1];
            boardVotePeriodList.pop();
        } else if(_flag == 2) {
            boardVoteWeightList[_index] = boardVoteWeightList[boardVoteWeightList.length - 1];
            boardVoteWeightList.pop();
        } else if(_flag == 3) {
            agentVotePeriodList[_index] = agentVotePeriodList[agentVotePeriodList.length - 1];
            agentVotePeriodList.pop();
        } else if(_flag == 4) {
            disputeGracePeriodList[_index] = disputeGracePeriodList[disputeGracePeriodList.length - 1];
            disputeGracePeriodList.pop();
        } else if(_flag == 5) {
            propertyVotePeriodList[_index] = propertyVotePeriodList[propertyVotePeriodList.length - 1];
            propertyVotePeriodList.pop();
        } else if(_flag == 6) {
            lockPeriodList[_index] = lockPeriodList[lockPeriodList.length - 1];
            lockPeriodList.pop();
        } else if(_flag == 7) {
            rewardRateList[_index] = rewardRateList[rewardRateList.length - 1];
            rewardRateList.pop();
        } else if(_flag == 8) {
            extraRewardRateList[_index] = extraRewardRateList[extraRewardRateList.length - 1];
            extraRewardRateList.pop();
        } else if(_flag == 9) {
            maxAllowPeriodList[_index] = maxAllowPeriodList[maxAllowPeriodList.length - 1];
            maxAllowPeriodList.pop();
        } else if(_flag == 10) {
            proposalFeeAmountList[_index] = proposalFeeAmountList[proposalFeeAmountList.length - 1];
            proposalFeeAmountList.pop();
        } else if(_flag == 11) {
            fundFeePercentList[_index] = fundFeePercentList[fundFeePercentList.length - 1];
            fundFeePercentList.pop();
        } else if(_flag == 12) {
            minDepositAmountList[_index] = minDepositAmountList[minDepositAmountList.length - 1];
            minDepositAmountList.pop();
        } else if(_flag == 13) {
            maxDepositAmountList[_index] = maxDepositAmountList[maxDepositAmountList.length - 1];
            maxDepositAmountList.pop();
        } else if(_flag == 14) {
            maxMintFeePercentList[_index] = maxMintFeePercentList[maxMintFeePercentList.length - 1];
            maxMintFeePercentList.pop();
        } else if(_flag == 15) {
            subscriptionAmountList[_index] = subscriptionAmountList[subscriptionAmountList.length - 1];
            subscriptionAmountList.pop();
        }                
    }

    /// @dev get a property list in a vote
    function getPeriodList(uint256 _flag) public view returns (uint256[] memory _list) {
        if(_flag == 0) {
            _list = filmVotePeriodList;
        } else if(_flag == 1) {
            _list = boardVotePeriodList;
        } else if(_flag == 2) {
            _list = boardVoteWeightList;
        } else if(_flag == 3) {
            _list = agentVotePeriodList;
        } else if(_flag == 4) {
            _list = disputeGracePeriodList;
        } else if(_flag == 5) {
            _list = propertyVotePeriodList;
        } else if(_flag == 6) {
            _list = lockPeriodList;
        } else if(_flag == 7) {
            _list = rewardRateList;
        } else if(_flag == 8) {
            _list = extraRewardRateList;
        } else if(_flag == 9) {
            _list = maxAllowPeriodList;
        } else if(_flag == 10) {
            _list = proposalFeeAmountList;
        } else if(_flag == 11) {
            _list = fundFeePercentList;
        } else if(_flag == 12) {
            _list = minDepositAmountList;
        } else if(_flag == 13) {
            _list = maxDepositAmountList;
        } else if(_flag == 14) {
            _list = maxMintFeePercentList;
        } else if(_flag == 15) {
            _list = subscriptionAmountList;
        }               
    }
}