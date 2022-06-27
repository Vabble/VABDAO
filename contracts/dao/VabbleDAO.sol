// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "../libraries/Ownable.sol";
import "../libraries/Helper.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IStakingPool.sol";
import "hardhat/console.sol";

contract VabbleDAO is ERC721Holder, ERC1155Holder, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    event FilmsProposalCreated(uint256[] indexed filmIds, address studio);
    event FilmApproved(uint256 filmId);
    event FilmsFinalSet(uint256[] filmIds);
    event FilmsMultiUpdated(uint256[] indexed filmIds, address studio);
    event FilmSingleUpdated(uint256 filmId, address studio);
    event DepositedTokenToFilm(address customer, address token, uint256 amount, uint256 filmId);
    event VABDeposited(address customer, uint256 amount);
    event WithdrawVABTransferred(address customer, address token, uint256 amount);
    event CustomerWithdrawRequested(address customer, address token, uint256 amount);    
    event MinMaxDepositAmountUpdated(uint256 minAmount, uint256 maxAmount);
    event FundPeriodUpdated(uint256 filmId, uint256 fundPeriod);
    event FundFeePercentUpdated(uint256 fundFeePercent);
    event ProposalFeeAmountUpdated(uint256 proposalFeeAmount);
    event FundProcessed(uint256 filmId);

    struct UserRent {
        uint256 vabAmount;       // current VAB amount in DAO
        uint256 withdrawAmount;  // pending withdraw amount for a customer
    }

    struct Asset {
        address token;   // token address
        uint256 amount;  // token amount
    }

    // 1% = 100, 100% = 10000
    struct Film {
        address[] studioPayees; // addresses who studio define to pay revenue
        uint256[] sharePercents;// percents(1% = 100) that studio defines to pay revenue for each payee
        uint256 rentPrice;      // VAB amount that a customer rents a film
        uint256 rentStartTime;  // time(block.timestamp) that a customer rents a film
        uint256 raiseAmount;    // USDC amount(in cash) studio are seeking to raise for the film. if 0, this film is not for funding
        uint256 fundPeriod;     // how many days(ex: 20 days) to keep the funding pool open
        uint256 fundStart;      // time(block.timestamp) that film approved for raising fund
        address studio;         // address of studio who is admin of film 
        bool onlyAllowVAB;      // if onlyVAB is true, customer can deposit only VAB token for this film
        Helper.Status status;   // status of film
    }

    IERC20 public immutable PAYOUT_TOKEN;     // VAB token        
    address public immutable VOTE;            // Vote contract address
    address public immutable STAKING_POOL;    // StakingPool contract address
    address public immutable UNI_HELPER;      // UniHelper contract address
    address public immutable USDC_TOKEN;      // USDC token 
    address public DAOFee;                    // address for transferring DAO Fee

    uint256 public proposalFeeAmount;         // USDC amount($100) studio should pay when create a proposal
    uint256 public fundFeePercent;            // percent(2% = 200) of fee on the amount raised.
    uint256 public minDepositAmount;          // USDC min amount($50) that a customer can deposit to a film approved for funding
    uint256 public maxDepositAmount;          // USDC max amount($5000) that a customer can deposit to a film approved for funding
    uint256 public lastfundProposalCreateTime;// funding proposal created time(block.timestamp)

    uint256[] private proposalFilmIds;    
    uint256[] private updatedFilmIds;    
    uint256[] private finalFilmIds;

    mapping(uint256 => Film) public filmInfo;             // Each film information(filmId => Film)
    mapping(address => uint256[]) public customerFilmIds; // Rented film IDs for a customer(customer => fimlId[])
    mapping(address => UserRent) public userRentInfo;
    
    // Todo Funding Raise from tokens
    // mapping(uint256 => uint256) public raiseAmountPerFilm;          // (filmId => raiseAmount)
    mapping(uint256 => Asset[]) public assetPerFilm;                  // (filmId => Asset[token, amount])
    mapping(uint256 => mapping(address => Asset[])) public assetInfo; // (filmId => (customer => Asset[token, amount]))

    Counters.Counter public filmIds;          // filmId is from No.1

    modifier onlyVote() {
        require(msg.sender == VOTE, "caller is not the vote contract");
        _;
    }

    modifier onlyAvailableStaker() {
        require(IStakingPool(STAKING_POOL).getStakeAmount(msg.sender) >= PAYOUT_TOKEN.totalSupply(), "Not available staker");
        _;
    }

    receive() external payable {}

    constructor(
        address _daoFee,
        address _payoutToken,
        address _voteContract,
        address _stakingContract,
        address _uniHelperContract,
        address _usdcToken
    ) {        
        require(_daoFee != address(0), "_daoFee: Zero address");
        DAOFee = _daoFee;
        require(_payoutToken != address(0), "_payoutToken: Zero address");
        PAYOUT_TOKEN = IERC20(_payoutToken);        
        require(_voteContract != address(0), "_voteContract: Zero address");
        VOTE = _voteContract;
        require(_stakingContract != address(0), "_stakingContract: Zero address");
        STAKING_POOL = _stakingContract;
        require(_uniHelperContract != address(0), "_uniHelperContract: Zero address");
        UNI_HELPER = _uniHelperContract;       
        require(_usdcToken != address(0), "_usdcToken: Zeor address");
        USDC_TOKEN = _usdcToken;

        proposalFeeAmount = 100 * (10**IERC20Metadata(_usdcToken).decimals()); // amount in cash(usd dollar - $100)
        minDepositAmount = 50 * (10**IERC20Metadata(_usdcToken).decimals());   // amount in cash(usd dollar - $50)
        maxDepositAmount = 5000 * (10**IERC20Metadata(_usdcToken).decimals()); // amount in cash(usd dollar - $5000)
        fundFeePercent = 200;    // percent(2% == 200)
 
    }

    // ======================== Studio ==================================
    /// @notice Create a proposal with rentPrice and raise amount for multiple films by studio
    // if raiseAmount > 0 then it is for funding and if raiseAmount = 0 then it is for listing
    // Creator should pay VAB as fee
    function createProposalFilms(
        bytes[] calldata _proposalFilms,
        bool _noVote
    ) external onlyStudio nonReentrant {        
        require(_proposalFilms.length > 0, "createProposalFilms: Invalid films length");         
        require(__isPaidFee(_noVote), 'createProposalFilms: Not paid fee');

        for (uint256 i; i < _proposalFilms.length; i++) {        
            (
                uint256 _rentPrice,
                uint256 _raiseAmount,
                uint256 _fundPeriod,
                bool _onlyAllowVAB
            ) = abi.decode(_proposalFilms[i], (uint256, uint256, uint256, bool));

            proposalFilmIds.push(__proposalFilm(_rentPrice, _raiseAmount, _fundPeriod, _onlyAllowVAB)); 
        }
        
        emit FilmsProposalCreated(proposalFilmIds, msg.sender);        
    }

    /// @notice Create a Proposal for a film
    function __proposalFilm(
        uint256 _rentPrice,
        uint256 _raiseAmount,
        uint256 _fundPeriod,
        bool _onlyAllowVAB
    ) private returns(uint256) {
        filmIds.increment();
        uint256 filmId = filmIds.current();

        Film storage _filmInfo = filmInfo[filmId];
        _filmInfo.rentPrice = _rentPrice;
        _filmInfo.raiseAmount = _raiseAmount;
        _filmInfo.fundPeriod = _fundPeriod;
        _filmInfo.studio = msg.sender;
        _filmInfo.onlyAllowVAB = _onlyAllowVAB;
        _filmInfo.status = Helper.Status.LISTED;

        // If proposal is for fund, update "lastfundProposalCreateTime"
        if(_raiseAmount > 0) {
            lastfundProposalCreateTime = block.timestamp;
        }

        return filmId;
    }

    /// @notice Update multi films with param(payee and share %) after LISTED by studio
    function updateMultiFilms(
        bytes[] calldata _updateFilms
    ) external onlyStudio nonReentrant {
        require(_updateFilms.length > 0, "updateMultiFilms: Invalid item length");

        for (uint256 i; i < _updateFilms.length; i++) {        
            (
                uint256 filmId_, 
                uint256[] memory sharePercents_, 
                address[] memory studioPayees_
            ) = abi.decode(_updateFilms[i], (uint256, uint256[], address[]));

            Film storage _filmInfo = filmInfo[filmId_];
            if(_filmInfo.status == Helper.Status.LISTED && _filmInfo.studio == msg.sender) {
                _filmInfo.studioPayees = studioPayees_;   
                _filmInfo.sharePercents = sharePercents_;   

                updatedFilmIds.push(filmId_);
            }
        }   

        emit FilmsMultiUpdated(updatedFilmIds, msg.sender);
    }

    /// @notice Update single film with param(payee and share %) by studio
    function updateSingleFilm(
        bytes calldata _updateFilm
    ) external onlyStudio nonReentrant {
        (
            uint256 filmId_, 
            uint256[] memory sharePercents_, 
            address[] memory studioPayees_
        ) = abi.decode(_updateFilm, (uint256, uint256[], address[]));

        require(sharePercents_.length == studioPayees_.length, "updateSingleFilm: Invalid item length");

        Film storage _filmInfo = filmInfo[filmId_];
        
        require(_filmInfo.status == Helper.Status.LISTED, "updateSingleFilm: Not listed film");
        require(_filmInfo.studio == msg.sender, "updateSingleFilm: Bad owner of film");

        _filmInfo.studioPayees = studioPayees_;   
        _filmInfo.sharePercents = sharePercents_;   

        updatedFilmIds.push(filmId_);

        emit FilmSingleUpdated(filmId_, msg.sender);
    }

    /// @notice Approve a film for funding/listing from vote contract
    // For film with APPROVED_FUNDING, set up fundStart(current block timestamp)
    function approveFilm(uint256 _filmId, bool _isFund) external onlyVote {
        require(_filmId > 0, "ApproveFilm: Invalid filmId"); 

        if(_isFund) {
            filmInfo[_filmId].status = Helper.Status.APPROVED_FUNDING;
            filmInfo[_filmId].fundStart = block.timestamp;
        } else {
            filmInfo[_filmId].status = Helper.Status.APPROVED_LISTING;    
        }
        
        emit FilmApproved(_filmId);
    }

    /// @notice Update multiple films with watched percents by Auditor
    function setFinalFilms(
        bytes[] calldata _finalFilms
    ) external onlyAuditor nonReentrant {
        
        require(_finalFilms.length > 0, "finalSetFilms: Bad items length");
        
        for (uint256 i = 0; i < _finalFilms.length; i++) {
            __setFinalFilm(_finalFilms[i]);
        }

        emit FilmsFinalSet(finalFilmIds);
    }

    /// @notice Set final films for a customer with watched percents
    function __setFinalFilm(        
        bytes calldata _filmData
    ) private {
        (   
            address customer_,
            uint256[] memory filmIds_,
            uint256[] memory watchPercents_
        ) = abi.decode(_filmData, (address, uint256[], uint256[]));

        require(customer_ != address(0), "_setFinalFilm: Zero customer address");
        require(userRentInfo[customer_].vabAmount > 0, "_setFinalFilm: Zero balance");
        require(filmIds_.length == watchPercents_.length, "_setFinalFilm: Invalid items length");

        // Assgin the VAB token to payees based on share(%) and watch(%)
        for (uint256 i = 0; i < filmIds_.length; i++) {
            // Todo should check again with APPROVED_LISTING
            if(filmInfo[filmIds_[i]].status == Helper.Status.APPROVED_LISTING) { 
                uint256 payout = __getPayoutFor(filmIds_[i], watchPercents_[i]);
                if(payout > 0 && userRentInfo[customer_].vabAmount >= payout) {
                    userRentInfo[customer_].vabAmount -= payout; 

                    for(uint256 k = 0; k < filmInfo[filmIds_[i]].studioPayees.length; k++) {
                        userRentInfo[filmInfo[filmIds_[i]].studioPayees[k]].vabAmount += __getShareAmount(payout, filmIds_[i], k);
                    }

                    finalFilmIds.push(filmIds_[i]);
                }                
            } else if(filmInfo[filmIds_[i]].status == Helper.Status.APPROVED_FUNDING) {
                // Todo should process the films with APPROVED_FUNDING
            }
        }   
    }

    // =================== Funding(Launch Pad) START ===============================
    /// @notice Deposit tokens/ETH to each film by customer
    function depositToFilm(uint256 _filmId, address _token, uint256 _amount) external payable nonReentrant {
        require(msg.sender != address(0), "depositToFilm: Zero customer address");
        require(filmInfo[_filmId].status == Helper.Status.APPROVED_FUNDING, "depositToFilm: filmId not approved for funding");
        require(filmInfo[_filmId].fundPeriod >= block.timestamp - filmInfo[_filmId].fundStart, "depositToFilm: passed funding period");

        if(filmInfo[_filmId].onlyAllowVAB) {
            require(_token == address(PAYOUT_TOKEN), "depositToFilm: Allowed only VAB token");            
        } 

        // Return remain ETH to user back if case of ETH
        if(_token == address(0)) {
            require(msg.value >= _amount, "depositToFilm: Insufficient paid");
            if (msg.value > _amount) {
                Helper.safeTransferETH(msg.sender, msg.value - _amount);
            }
        }

        if(__checkMinMaxAmount(_filmId, _token, _amount)) {
            if(_token != address(0)) {
                Helper.safeTransferFrom(_token, msg.sender, address(this), _amount);
            }            
            __assignToken(_filmId, _token, _amount);

            emit DepositedTokenToFilm(msg.sender, _token, _amount, _filmId);
        } else {
            if(_token == address(0)) {
                Helper.safeTransferETH(msg.sender, _amount);
            }
        }
    }    

    /// @notice Update/Add user fund amount
    function __assignToken(uint256 _filmId, address _token, uint256 _amount) private {
        bool isNewTokenPerUser = true;
        bool isNewTokenPerFilm = true;
        Asset[] memory assetArr = assetInfo[_filmId][msg.sender];
        // update token amount
        for(uint256 i; i < assetArr.length; i++) {
            if(_token == assetArr[i].token) {
                assetInfo[_filmId][msg.sender][i].amount += _amount;
                isNewTokenPerUser = false;
            }
        }
        // add new token
        if(isNewTokenPerUser) {
            assetInfo[_filmId][msg.sender].push(Asset({
                token: _token,
                amount: _amount 
            }));
        }
        
        Asset[] memory _assetPerFilm = assetPerFilm[_filmId];
        for(uint256 i; i < _assetPerFilm.length; i++) {
            if(_token == _assetPerFilm[i].token) {
                assetPerFilm[_filmId][i].amount += _amount;
                isNewTokenPerFilm = false;
            }
        }
        if(isNewTokenPerFilm) {
            assetPerFilm[_filmId].push(Asset({
                token: _token,
                amount: _amount 
            }));
        }
    }
    
    /// @notice Send 2% of fund to reward pool after fund period
    // Send the 2% of funds to reward pool in VAB if funding meet the raise amount
    function fundProcess(uint256 _filmId) external onlyStudio nonReentrant {
        require(filmInfo[_filmId].studio == msg.sender, "fundProcess: Bad studio of this film");
        require(filmInfo[_filmId].status == Helper.Status.APPROVED_FUNDING, "fundProcess: filmId not approved for funding");
        require(filmInfo[_filmId].fundPeriod < block.timestamp - filmInfo[_filmId].fundStart, "fundProcess: funding period");

        uint256 raiseAmountPerFilm = getRaiseAmountPerFilm(_filmId);
        console.log("sol=>actural=expect::", raiseAmountPerFilm, filmInfo[_filmId].raiseAmount);
        require(raiseAmountPerFilm >= filmInfo[_filmId].raiseAmount, "fundProcess: fails to meet raise amount");
                        
        // Todo send fundFeePercent(2%) to reward pool as VAB token and rest send to studio
        Asset[] memory assetArr = assetPerFilm[_filmId];
        uint256 rewardSumAmount;
        uint256 rewardAmount;
        for(uint256 i; i < assetArr.length; i++) {                
            rewardAmount = assetArr[i].amount * fundFeePercent / 10000;
            if(address(PAYOUT_TOKEN) == assetArr[i].token) {
                rewardSumAmount += rewardAmount;
            } else {
                if(IERC20(assetArr[i].token).allowance(address(this), UNI_HELPER) == 0) {
                    Helper.safeApprove(assetArr[i].token, UNI_HELPER, IERC20(assetArr[i].token).totalSupply());
                }
                bytes memory swapArgs = abi.encode(rewardAmount, assetArr[i].token, address(PAYOUT_TOKEN));
                rewardSumAmount += IUniHelper(UNI_HELPER).swapAsset(swapArgs);
            }
            assetArr[i].amount -= rewardAmount;
            Helper.safeTransfer(assetArr[i].token, msg.sender, assetArr[i].amount);
            assetArr[i].amount = 0;
        }

        if(rewardSumAmount > 0) {
            addReward(rewardSumAmount);
        }

        emit FundProcessed(_filmId);
    }

    /// @notice Revert back fund to investor after fund period
    // Return the funds back to the users if funding fails to meet the raise amount
    function withdrawFunding(uint256 _filmId) external nonReentrant {     
        require(filmInfo[_filmId].status == Helper.Status.APPROVED_FUNDING, "withdrawFunding: filmId not approved for funding");
        require(filmInfo[_filmId].fundPeriod < block.timestamp - filmInfo[_filmId].fundStart, "withdrawFunding: funding period");

        uint256 raiseAmountPerFilm = getRaiseAmountPerFilm(_filmId);
        require(raiseAmountPerFilm > 0 && raiseAmountPerFilm < filmInfo[_filmId].raiseAmount, "withdrawFunding: satisfied raise amount");

        Asset[] memory assetArr = assetInfo[_filmId][msg.sender];
        for(uint256 i; i < assetArr.length; i++) {   
            if(assetArr[i].token == address(0)) {
                if(address(this).balance >= assetArr[i].amount) {
                    Helper.safeTransferETH(msg.sender, assetArr[i].amount);
                }                
            } else {
                if(IERC20(assetArr[i].token).balanceOf(address(this)) >= assetArr[i].amount) {
                    Helper.safeTransfer(assetArr[i].token, msg.sender, assetArr[i].amount);    
                }
            }
        }
    }
    // =================== Funding(Launch Pad) END ===============================

    // =================== Customer deposit/withdraw VAB START =================    
    /// @notice Deposit VAB token from customer for renting the films
    function depositVAB(uint256 _amount) external nonReentrant returns(uint256) {
        require(msg.sender != address(0), "depositVAB: Zero user address");
        require(_amount > 0, "depositVAB: Zero amount");
        require(_amount <= PAYOUT_TOKEN.balanceOf(msg.sender), "depositVAB: Insufficient VAB amount");

        Helper.safeTransferFrom(address(PAYOUT_TOKEN), msg.sender, address(this), _amount);
        userRentInfo[msg.sender].vabAmount += _amount;

        emit VABDeposited(msg.sender, _amount);

        return _amount;
    }

    /// @notice Pending Withdraw VAB token by customer
    function customerRequestWithdraw(uint256 _amount) external nonReentrant {
        require(msg.sender != address(0), "customerRequestWithdraw: Zero customer address");
        require(_amount > 0 && _amount <= userRentInfo[msg.sender].vabAmount, "customerRequestWithdraw: Insufficient VAB amount");

        userRentInfo[msg.sender].withdrawAmount = _amount;

        emit CustomerWithdrawRequested(msg.sender, address(PAYOUT_TOKEN), _amount);
    }

    /// @notice Approve pending-withdraw of given customers by Auditor
    function approvePendingWithdraw(address[] calldata _customers) external onlyAuditor nonReentrant {
        require(_customers.length > 0, "approvePendingWithdraw: No customer");

        // Transfer withdrawable amount to _customers
        for(uint256 i; i < _customers.length; i++) {
            if(userRentInfo[_customers[i]].withdrawAmount > 0) {
                if(userRentInfo[_customers[i]].withdrawAmount <= userRentInfo[_customers[i]].vabAmount) {
                    __transferVABWithdraw(_customers[i]);
                }            
            }
        }
    }

    /// @notice Transfer VAB token to user's withdraw request
    function __transferVABWithdraw(address _to) private returns(bool flag_) {
        uint256 payAmount = userRentInfo[_to].withdrawAmount;
        require(payAmount > 0 && payAmount <= userRentInfo[_to].vabAmount, "transferPayment: Insufficient VAB amount");

        Helper.safeTransfer(address(PAYOUT_TOKEN), _to, payAmount);

        userRentInfo[_to].vabAmount -= payAmount;
        userRentInfo[_to].withdrawAmount = 0;

        emit WithdrawVABTransferred(_to, address(PAYOUT_TOKEN), payAmount);

        flag_ = true;        
    }

    /// @notice Deny pending-withdraw of given customers by Auditor
    function denyPendingWithdraw(address[] memory _customers) external onlyAuditor nonReentrant {
        require(_customers.length > 0, "approvePendingWithdraw: No customer");

        // Release withdrawable amount for _customers
        for(uint256 i; i < _customers.length; i++) {
            if(userRentInfo[_customers[i]].withdrawAmount > 0) {
                userRentInfo[_customers[i]].withdrawAmount = 0;
            }
        }
    }    
    // =================== Customer deposit/withdraw VAB END =================    


    /// @notice Update minDepositAmount and maxDepositAmount only by Auditor
    function updateMinMaxDepositAmount(uint256 _minAmount, uint256 _maxAmount) external onlyAuditor nonReentrant {
        require(_minAmount > 0 && _maxAmount > _minAmount, "updateMinMaxDepositAmount: Invalid minAmount and maxAmount");        
        minDepositAmount = _minAmount;
        maxDepositAmount = _maxAmount;

        emit MinMaxDepositAmountUpdated(_minAmount, _maxAmount);
    }

    /// @notice Update fundFeePercent(ex: 3% = 300) by Auditor
    function updateFundFeePercent(uint256 _fundFeePercent) external onlyAuditor nonReentrant {
        require(_fundFeePercent > 0, "updateFundFeePercent: Invalid fundFeePercent");        
        fundFeePercent = _fundFeePercent;

        emit FundFeePercentUpdated(_fundFeePercent);
    }

    /// @notice Update fundPeriod only by studio that created the proposal
    // _fundPeriod : value in second
    function updateFundPeriod(uint256 _filmId, uint256 _fundPeriod) external onlyStudio nonReentrant {
        require(msg.sender == filmInfo[_filmId].studio, "updatefundPeriod: Invalid film owner");
        require(_fundPeriod > 0, "updatefundPeriod: Invalid fundPeriod");        
        filmInfo[_filmId].fundPeriod = _fundPeriod;

        emit FundPeriodUpdated(_filmId, _fundPeriod);
    }

    /// @notice Update proposalFeeAmount by auditor
    function updateProposalFeeAmount(uint256 _feeAmount) external onlyAuditor nonReentrant {
        require(_feeAmount > 0, "updateProposalFeeAmount: Invalid feeAmount");        
        proposalFeeAmount = _feeAmount;

        emit ProposalFeeAmountUpdated(_feeAmount);
    }

    /// @dev Helper to add reward to staking pool
    function addReward(uint256 _amount) public {
        if(PAYOUT_TOKEN.allowance(address(this), STAKING_POOL) == 0) {
            Helper.safeApprove(address(PAYOUT_TOKEN), STAKING_POOL, PAYOUT_TOKEN.totalSupply());
        }
        IStakingPool(STAKING_POOL).addReward(_amount);
    }

    /// @notice Check if proposal fee transferred from studio to stakingPool
    // Get expected VAB amount from UniswapV2 and then Transfer VAB: user(studio) -> this contract(DAO) -> stakingPool.
    function __isPaidFee(bool _noVote) private returns(bool) {       
        uint256 depositAmount = proposalFeeAmount;
        if(_noVote) depositAmount = proposalFeeAmount * 2;

        uint256 expectVABAmount = IUniHelper(UNI_HELPER).expectedAmount(depositAmount, USDC_TOKEN, address(PAYOUT_TOKEN));
        if(expectVABAmount > 0) {
            Helper.safeTransferFrom(address(PAYOUT_TOKEN), msg.sender, address(this), expectVABAmount);
            addReward(expectVABAmount);
            return true;
        } else {
            return false;
        }
    }    

    /// @notice Get payout amount based on watched percent for a film
    function __getPayoutFor(uint256 _filmId, uint256 _watchPercent) private view returns(uint256) {
        return filmInfo[_filmId].rentPrice * _watchPercent / 10000;
    }

    function __getShareAmount(uint256 _payout, uint256 _filmId, uint256 _k) private view returns(uint256) {
        return _payout * filmInfo[_filmId].sharePercents[_k] / 10000;
    }

    /// @notice Check min & max amount for each token/ETH per film
    function __checkMinMaxAmount(uint256 _filmId, address _token, uint256 _amount) private view returns (bool) {
        uint256 userFundAmountPerFilm = __getUserFundAmountPerFilm(_filmId);
        uint256 fundAmount = IUniHelper(UNI_HELPER).expectedAmount(_amount, _token, USDC_TOKEN);
        if(_amount >= minDepositAmount && fundAmount + userFundAmountPerFilm <= maxDepositAmount) {
            return true;
        } else {
            return false;
        } 
    }

    /// @notice Get user fund amount in cash(usdc) for each token per film
    function __getUserFundAmountPerFilm(uint256 _filmId) private view returns (uint256) {
        uint256 amount_;
        Asset[] memory assetArr = assetInfo[_filmId][msg.sender];
        for(uint256 i; i < assetArr.length; i++) {
            if(assetArr[i].amount == 0) continue;

            if(assetArr[i].token == USDC_TOKEN) {
                amount_ += assetArr[i].amount;
                continue;
            }
            amount_ += IUniHelper(UNI_HELPER).expectedAmount(assetArr[i].amount, assetArr[i].token, USDC_TOKEN);
        }

        return amount_;
    }

    /// @notice Get fund amount in cash(usdc) per film
    function getRaiseAmountPerFilm(uint256 _filmId) public view returns (uint256) {
        uint256 amount_;
        Asset[] memory assetArr = assetPerFilm[_filmId];
        for(uint256 i; i < assetArr.length; i++) {
            if(assetArr[i].amount == 0) continue;

            if(assetArr[i].token == USDC_TOKEN) {
                amount_ += assetArr[i].amount;
                continue;
            }
            amount_ += IUniHelper(UNI_HELPER).expectedAmount(assetArr[i].amount, assetArr[i].token, USDC_TOKEN);
        }

        return amount_;
    }

    // =================== View functions =====================
    /// @notice Check user balance(VAB token amount) in DAO if enough for rent or not
    function checkUserVABAmount(address _user, uint256[] calldata _filmIds) public view returns(bool) {
        uint256 totalRentPrice = 0;
        for(uint256 i; i < _filmIds.length; i++) {
            totalRentPrice += filmInfo[_filmIds[i]].rentPrice;
        }        

        if(userRentInfo[_user].vabAmount > totalRentPrice) return true;
        return false;
    }

    /// @notice Get film item based on Id
    function getFilmById(uint256 _filmId) external view 
    returns (
        address[] memory studioPayees_, 
        uint256[] memory sharePercents_, 
        uint256 rentPrice_,
        uint256 rentStartTime_,
        uint256 raiseAmount_,
        uint256 fundPeriod_,
        uint256 fundStart_,
        address studio_,
        bool onlyAllowVAB_,
        Helper.Status status_
    ) {
        Film storage _filmInfo = filmInfo[_filmId];
        studioPayees_ = _filmInfo.studioPayees;
        sharePercents_ = _filmInfo.sharePercents;
        rentPrice_ = _filmInfo.rentPrice;
        rentStartTime_ = _filmInfo.rentStartTime;
        raiseAmount_ = _filmInfo.raiseAmount;
        fundPeriod_ = _filmInfo.fundPeriod;
        fundStart_ = _filmInfo.fundStart;
        studio_ = _filmInfo.studio;
        onlyAllowVAB_ = _filmInfo.onlyAllowVAB;
        status_ = _filmInfo.status;
    }

    /// @notice Get film item based on Id
    function getFilmStatusById(uint256 _filmId) external view returns (Helper.Status status_) {
        Film storage _filmInfo = filmInfo[_filmId];
        status_ = _filmInfo.status;
    }

    /// @notice Check if film is for fund or list
    function isForFund(uint256 _filmId) external view returns (bool) {
        Film storage _filmInfo = filmInfo[_filmId];

        if(_filmInfo.raiseAmount > 0) return true;
        else return false;
    }
    
    /// @notice Get VAB amount of a user
    function getUserRentInfo(address _user) external view returns(uint256 vabAmount_, uint256 withdrawAmount_) {
        vabAmount_ = userRentInfo[_user].vabAmount;
        withdrawAmount_ = userRentInfo[_user].withdrawAmount;
    }   

    /// @notice Get proposal film Ids
    function getProposalFilmIds() external view returns(uint256[] memory) {
        return proposalFilmIds;
    }   

    /// @notice Get updated proposal film Ids
    function getUpdatedFilmIds() external view returns(uint256[] memory) {
        return updatedFilmIds;
    }
}
