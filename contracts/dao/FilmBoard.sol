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
    event ProposalFeeAmountUpdated(uint256 proposalFeeAmount);
    
    IERC20 public immutable PAYOUT_TOKEN;     // VAB token        
    address public immutable VOTE;            // Vote contract address
    address public immutable VABBLE_DAO;      // VabbleDAO contract address    
    address public immutable STAKING_POOL;    // StakingPool contract address
    address public immutable UNI_HELPER;      // UniHelper contract address
    address public immutable USDC_TOKEN;      // USDC token 

    uint256 public maxAllowPeriod;            // max allowed period for removing filmBoard member    

    address[] public filmBoardCandidates;     // filmBoard candidates and if isWhitelist is true, become filmBoard member
    address[] public agentArray;              // agent list for replacing Auditor

    mapping(address => bool) public filmBoardWhitelist; // (filmBoard member => true/false)
    mapping(address => uint256) public lastVoteTime;    // (staker => block.timestamp)
    mapping(address => bool) public agentList;          // (agent => true/false)

    modifier onlyVote() {
        require(msg.sender == VOTE, "caller is not the vote contract");
        _;
    }

    modifier onlyAvailableStaker() {
        require(IStakingPool(STAKING_POOL).getStakeAmount(msg.sender) >= PAYOUT_TOKEN.totalSupply(), "Not available staker");
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
        require(!isWhitelist(_member), "createProposalFilmBoard: Already film board member");                  
        require(__isPaidFee(IVabbleDAO(VABBLE_DAO).proposalFeeAmount(), false), 'createProposalFilms: Not paid fee');     

        filmBoardCandidates.push(_member);

        emit FilmBoardProposalCreated(_member);
    }

    /// @notice Add a member to whitelist by Vote contract
    function addFilmBoardMember(address _member) external onlyVote nonReentrant {
        require(_member != address(0), "addFilmBoardMember: Zero candidate address");     
        require(!isWhitelist(_member), "addFilmBoardMember: Already film board member");   

        filmBoardWhitelist[_member] = true;

        emit FilmBoardMemberAdded(_member);
    }

    /// @notice Remove a member from whitelist if he didn't vote to any propsoal for over 3 months
    function removeFilmBoardMember(address _member) external nonReentrant {
        require(isWhitelist(_member), "removeFilmBoardMember: Not Film board member");
        
        if(maxAllowPeriod < block.timestamp - lastVoteTime[_member]) {
            if(maxAllowPeriod > block.timestamp - IVabbleDAO(VABBLE_DAO).lastfundProposalCreateTime()) {
                filmBoardWhitelist[_member] = false;
                emit FilmBoardMemberRemoved(_member);
            }
        }
    }

    /// @notice Check if a user is from whitelist
    function isWhitelist(address _member) public view returns (bool) {
        return filmBoardWhitelist[_member];
    }

    /// @notice Update last vote time
    function updateLastVoteTime(address _member) external onlyVote {
        lastVoteTime[_member] = block.timestamp;
    }

    /// @notice Check if proposal fee transferred from studio to stakingPool
    // Get expected VAB amount from UniswapV2 and then Transfer VAB: user(studio) -> this contract(FilmBoard) -> stakingPool.
    function __isPaidFee(uint256 _proposalFeeAmount, bool _noVote) private returns(bool) {       
        uint256 depositAmount = _proposalFeeAmount;
        if(_noVote) depositAmount = _proposalFeeAmount * 2;

        uint256 expectVABAmount = IUniHelper(UNI_HELPER).expectedAmount(depositAmount, USDC_TOKEN, address(PAYOUT_TOKEN));
           
        if(expectVABAmount > 0) {
            Helper.safeTransferFrom(address(PAYOUT_TOKEN), msg.sender, address(this), expectVABAmount);
            IVabbleDAO(VABBLE_DAO).addReward(expectVABAmount);
            return true;
        } else {
            return false;
        }
    }

    //=================================
    /// @notice A staker create a proposal for replacing Auditor
    function createProposalReplaceAuditor(address _agent) external onlyAvailableStaker nonReentrant {
        require(_agent != address(0), "createProposalReplaceAuditor: Zero agent address");
        require(auditor != _agent, "createProposalReplaceAuditor: Already Auditor address");        
        require(!isAgent(_agent), "Already agent");

        agentList[_agent] = true;
        agentArray.push(_agent);
    }

    function getAgentArray() external view returns (address[] memory) {
        return agentArray;
    }

    function isAgent(address _agent) public view returns (bool) {
        return agentList[_agent];
    }
}