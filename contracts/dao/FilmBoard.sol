// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../libraries/Ownable.sol";
import "../libraries/Helper.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IStakingPool.sol";
import "../interfaces/IVabbleDAO.sol";
import "hardhat/console.sol";

contract FilmBoard is Ownable, ReentrancyGuard {

    event FilmBoardProposalCreated(address member);
    event FilmBoardMemberAdded(address member);
    event FilmBoardMemberRemoved(address member);
    
    IERC20 private immutable PAYOUT_TOKEN;     // VAB token        
    address private immutable VOTE;            // Vote contract address
    address private immutable VABBLE_DAO;      // VabbleDAO contract address    
    address private immutable STAKING_POOL;    // StakingPool contract address
    address private immutable UNI_HELPER;      // UniHelper contract address
    address private immutable USDC_TOKEN;      // USDC token 

    address public Agent;
    uint256 public maxAllowPeriod;            // max allowed period for removing filmBoard member    

    address[] public filmBoardCandidates;     // filmBoard candidates and if isBoardWhitelist is true, become filmBoard member

    mapping(address => uint256) public isBoardWhitelist; // (filmBoard member => 0: no member, 1: candiate, 2: member)
    mapping(address => uint256) public lastVoteTime;     // (staker => block.timestamp)

    modifier onlyVote() {
        require(msg.sender == VOTE, "caller is not the vote contract");
        _;
    }

    modifier onlyAvailableStaker() {
        require(IStakingPool(STAKING_POOL).getStakeAmount(msg.sender) >= PAYOUT_TOKEN.totalSupply()/2, "Not available staker");
        _;
    }

    constructor(
        address _payoutToken,
        address _vabbleDAOContract,
        address _voteContract,
        address _stakingContract,
        address _uniHelperContract,
        address _usdcToken
    ) {
        require(_payoutToken != address(0), "_payoutToken: Zero address");
        PAYOUT_TOKEN = IERC20(_payoutToken);    
        require(_vabbleDAOContract != address(0), "_vabbleDAOContract: Zero address");
        VABBLE_DAO = _vabbleDAOContract;
        require(_voteContract != address(0), "_voteContract: Zero address");
        VOTE = _voteContract;
        require(_stakingContract != address(0), "_stakingContract: Zero address");
        STAKING_POOL = _stakingContract;
        require(_uniHelperContract != address(0), "_uniHelperContract: Zero address");
        UNI_HELPER = _uniHelperContract;          
        require(_usdcToken != address(0), "_usdcToken: Zeor address");
        USDC_TOKEN = _usdcToken;

        maxAllowPeriod = 90 days;        
    }

    /// @notice Create a proposal with the case to be added to film board where stakers can vote
    // Everyone(owned $100 of VAB) can create this proposal
    function createProposalFilmBoard(address _member) external nonReentrant {
        require(_member != address(0), "createProposalFilmBoard: Zero candidate address");     
        require(isBoardWhitelist[_member] == 0, "createProposalFilmBoard: Already film board member or candidate");                  
        require(__isPaidFee(), 'createProposalFilms: Not paid fee');     

        filmBoardCandidates.push(_member);
        isBoardWhitelist[_member] = 1;

        emit FilmBoardProposalCreated(_member);
    }

    /// @notice Add a member to whitelist by Vote contract
    function addFilmBoardMember(address _member) external onlyVote nonReentrant {
        require(_member != address(0), "addFilmBoardMember: Zero candidate address");     
        require(isBoardWhitelist[_member] == 1, "addFilmBoardMember: Already film board member or no candidate");   

        isBoardWhitelist[_member] = 2;

        emit FilmBoardMemberAdded(_member);
    }

    /// @notice Remove a member from whitelist if he didn't vote to any propsoal for over 3 months
    function removeFilmBoardMember(address _member) external nonReentrant {
        require(isBoardWhitelist[_member] == 2, "removeFilmBoardMember: Not Film board member");
        
        if(maxAllowPeriod < block.timestamp - lastVoteTime[_member]) {
            if(maxAllowPeriod > block.timestamp - IVabbleDAO(VABBLE_DAO).lastfundProposalCreateTime()) {
                isBoardWhitelist[_member] = 0;
                emit FilmBoardMemberRemoved(_member);
            }
        }
    }
    
    /// @notice Check if proposal fee transferred from studio to stakingPool
    // Get expected VAB amount from UniswapV2 and then Transfer VAB: user(studio) -> this contract(FilmBoard) -> stakingPool.
    function __isPaidFee() private returns(bool) {       
        uint256 feeAmount = IVabbleDAO(VABBLE_DAO).proposalFeeAmount();
        uint256 expectVABAmount = IUniHelper(UNI_HELPER).expectedAmount(feeAmount, USDC_TOKEN, address(PAYOUT_TOKEN));
           
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

    /// @notice A staker create a proposal for replacing Auditor
    function createProposalReplaceAuditor(address _agent) external onlyAvailableStaker nonReentrant {
        require(IStakingPool(STAKING_POOL).getStakeAmount(_agent) >= PAYOUT_TOKEN.totalSupply()/2, "Not available agent");
        require(auditor != _agent, "createProposalReplaceAuditor: Already Auditor address");        
        require(Agent == address(0), "Already agent");

        Agent = _agent;
    }

    /// @notice Make agent to Zero address
    function releaseAgent() external onlyVote {
        Agent = address(0);
    }   

    /// @notice Update last vote time
    function updateLastVoteTime(address _member) external onlyVote {
        lastVoteTime[_member] = block.timestamp;
    }

    /// @notice Update maxAllowPeriod for replacing the Auditor
    function updateMaxAllowPeriod(uint256 _period) external onlyAuditor {
        require(_period > 0, "updateMaxAllowPeriod: Zero period");
        maxAllowPeriod = _period;
    }
}