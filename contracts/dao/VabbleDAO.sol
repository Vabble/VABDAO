// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../libraries/Helper.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IStakingPool.sol";
import "../interfaces/IProperty.sol";
import "../interfaces/IOwnablee.sol";
import "../interfaces/IFactoryFilmNFT.sol";

contract VabbleDAO is ReentrancyGuard {
    using Counters for Counters.Counter;
    
    event FilmProposalCreated(uint256[] filmIds, uint256[] noVotes, address studio);
    event FilmProposalUpdated(uint256 indexed filmId, address studio);
    event FilmApproved(uint256 filmId);
    event FinalFilmSetted(address[] users, uint256[] filmIds, uint256[] watchedPercents);
    event DepositedTokenToFilm(address customer, address token, uint256 amount, uint256 filmId);
    event FundFilmProcessed(uint256 filmId);
    event FilmShareAndPayeeUpdated(address filmOwner, uint256 filmId, uint256[] shares, address[] payees);
    event FilmPriceAndPeriodUpdated(address filmOwner, uint256 filmId, uint256 rentPrice, uint256 fundPeriod);
    
    struct Asset {
        address token;   // token address
        uint256 amount;  // token amount
    }

    struct Film {
        uint256[] nftRight;      // What genre the film will be(Action,Adventure,Animation,Biopic, , , Western,War,WEB3)
        uint256[] sharePercents; // percents(1% = 1e8) that studio defines to pay revenue for each payee
        address[] choiceAuditor; // What auditor will you distribute to = Vabble consumer portal. Titled as "Vabble"
        address[] studioPayees;  // payee addresses who studio define to pay revenue
        uint256 rentPrice;       // USDC amount that a customer should pay for renting a film
        uint256 raiseAmount;     // USDC amount(in cash) studio are seeking to raise for the film
        uint256 fundPeriod;      // how many days(ex: 20 days) to keep the funding pool open        
        uint256 fundType;        // Financing Type(None=>0, Token=>1, NFT=>2, NFT & Token=>3)
        uint256 pCreateTime;     // proposal created time(block.timestamp) by studio
        uint256 pApproveTime;    // proposal approved time(block.timestamp) by vote
        uint256 noVote;          // check if vote need or not. if 0 => false, 1 => true
        address studio;          // Studio Address (Admin of film)
        Helper.Status status;    // status of film
    }
  
    address public immutable OWNABLE;         // Ownablee contract address
    address public immutable VOTE;            // Vote contract address
    address public immutable STAKING_POOL;    // StakingPool contract address
    address public immutable UNI_HELPER;      // UniHelper contract address
    address public immutable DAO_PROPERTY;
    address public immutable FILM_NFT_FACTORY;  
    
    uint256[] private proposalFilmIds;    
    uint256[] private approvedNoVoteFilmIds;
    uint256[] private approvedFundingFilmIds;
    uint256[] private approvedListingFilmIds;
    uint256[] private fundProcessedFilmIds;
    
    mapping(uint256 => Film) private filmInfo;             // Each film information(filmId => Film)
    mapping(uint256 => Asset[]) public assetPerFilm;                  // (filmId => Asset[token, amount])
    mapping(uint256 => mapping(address => Asset[])) public assetInfo; // (filmId => (customer => Asset[token, amount]))
    mapping(uint256 => address[]) private filmInvestorList;   // (filmId => investor address[])
    mapping(address => uint256[]) private userInvestFilmIds;  // (user => invest filmId[]) for only approved_funding films
    mapping(address => uint256) public userFilmProposalCount; // (user => created film-proposal count)
    mapping(address => uint256[]) public userFinalFilmIds;
    mapping(address => mapping(uint256 => bool)) public isFundProcessed; // (customer => (filmId => true/false))
    mapping(address => uint256[]) public userFilmProposalIds; // (studio => filmId list)
    
    Counters.Counter public filmCount;          // filmId is from No.1

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

    receive() external payable {}
    
    constructor(
        address _ownableContract,
        address _voteContract,
        address _stakingContract,
        address _uniHelperContract,
        address _daoProperty,
        address _filmNftFactory
    ) {        
        require(_ownableContract != address(0), "ownableContract: Zero address");
        OWNABLE = _ownableContract;     
        require(_voteContract != address(0), "voteContract: Zero address");
        VOTE = _voteContract;
        require(_stakingContract != address(0), "stakingContract: Zero address");
        STAKING_POOL = _stakingContract;
        require(_uniHelperContract != address(0), "uniHelperContract: Zero address");
        UNI_HELPER = _uniHelperContract;      
        require(_daoProperty != address(0), "daoProperty: Zero address");
        DAO_PROPERTY = _daoProperty; 
        require(_filmNftFactory!= address(0), "setup: zero factoryContract address");
        FILM_NFT_FACTORY = _filmNftFactory;  
    }

    // ======================== Film proposal ==============================
    /// @notice Staker create multi proposal for a lot of films
    // if 0 => false, 1 => true
    function proposalFilmCreate(uint256[] memory _noVotes) external nonReentrant {     
        require(_noVotes.length > 0, 'proposalFilm: bad length');

        uint256 depositAmount = IProperty(DAO_PROPERTY).proposalFeeAmount();
        uint256 expectAmount;
        for(uint256 i = 0; i < _noVotes.length; i++) {
            if(_noVotes[i] == 1) expectAmount += depositAmount * 2;
            else expectAmount += depositAmount;
        }
        require(__isPaidFee(expectAmount), 'proposalFilm: Not paid fee');

        uint256[] memory idList = new uint256[](_noVotes.length);
        for(uint256 i = 0; i < _noVotes.length; i++) {
            idList[i] = __proposalFilmCreate(_noVotes[i]);
        }  
        
        emit FilmProposalCreated(idList, _noVotes, msg.sender);
    }

    function __proposalFilmCreate(uint256 _noVote) private returns(uint256) {   
        filmCount.increment();
        uint256 filmId = filmCount.current();

        Film storage fInfo = filmInfo[filmId];
        fInfo.noVote = _noVote;
        fInfo.studio = msg.sender;
        fInfo.status = Helper.Status.LISTED;

        proposalFilmIds.push(filmId);
        userFilmProposalIds[msg.sender].push(filmId);

        userFilmProposalCount[msg.sender] += 1;

        return filmId;     
    }

    function proposalFilmUpdate(
        uint256 _filmId, 
        uint256[] memory _nftRight,
        uint256[] memory _sharePercents,
        address[] memory _choiceAuditor,
        address[] memory _studioPayees,
        uint256 _rentPrice,
        uint256 _raiseAmount,
        uint256 _fundPeriod,
        uint256 _fundType
    ) public nonReentrant {                
        require(_nftRight.length > 0, 'proposalUpdate: invalid right');
        require(_studioPayees.length == _sharePercents.length, 'proposalUpdate: invalid share percent');
        require(_rentPrice > 0, 'proposalUpdate: invalid rent price');
        if(_fundType > 0) {            
            require(_fundPeriod > 0, 'proposalUpdate: invalid fund period');
            require(_raiseAmount > IProperty(DAO_PROPERTY).minDepositAmount(), 'proposalUpdate: invalid raise amount');
        }

        uint256 totalPercent = 0;
        for(uint256 i = 0; i < _studioPayees.length; i++) {
            require(_sharePercents[i] <= 1e10, 'proposalUpdate: over 100%');
            totalPercent += _sharePercents[i];
        }
        require(totalPercent <= 1e10, 'proposalUpdate: total over 100%');
        
        Film storage fInfo = filmInfo[_filmId];
        require(fInfo.status == Helper.Status.LISTED, 'proposalUpdate: Not listed');
        require(fInfo.studio == msg.sender, 'proposalUpdate: not film owner');

        fInfo.nftRight = _nftRight;
        fInfo.sharePercents = _sharePercents;
        fInfo.choiceAuditor = _choiceAuditor;
        fInfo.studioPayees = _studioPayees;        
        fInfo.rentPrice = _rentPrice;
        fInfo.raiseAmount = _raiseAmount;
        fInfo.fundPeriod = _fundPeriod;
        fInfo.fundType = _fundType;
        fInfo.pCreateTime = block.timestamp;
        fInfo.studio = msg.sender;

        userFilmProposalCount[msg.sender] += 1;
        IStakingPool(STAKING_POOL).updateProposalCreatedTimeList(block.timestamp); // add timestap to array for calculating rewards

        // If proposal is for fund, update "lastfundProposalCreateTime"
        if(fInfo.fundType > 0) IStakingPool(STAKING_POOL).updateLastfundProposalCreateTime(block.timestamp);

        if(fInfo.noVote == 1) {
            if(_fundType > 0) {
                fInfo.status = Helper.Status.APPROVED_FUNDING;
                approvedFundingFilmIds.push(_filmId);
            } else {
                fInfo.status = Helper.Status.APPROVED_WITHOUTVOTE;
                approvedNoVoteFilmIds.push(_filmId);
            }            
        }        

        emit FilmProposalUpdated(_filmId, msg.sender);     
    }

    /// @notice Check if proposal fee transferred from studio to stakingPool
    // Get expected VAB amount from UniswapV2 and then Transfer VAB: user(studio) -> stakingPool.
    function __isPaidFee(uint256 _depositAmount) private returns (bool) {    
        address payout_token = IProperty(DAO_PROPERTY).PAYOUT_TOKEN();
        uint256 expectVABAmount = IUniHelper(UNI_HELPER).expectedAmount(_depositAmount, IProperty(DAO_PROPERTY).USDC_TOKEN(), payout_token);
        
        if(expectVABAmount > 0) {
            Helper.safeTransferFrom(payout_token, msg.sender, address(this), expectVABAmount);
            if(IERC20(payout_token).allowance(address(this), STAKING_POOL) == 0) {
                Helper.safeApprove(payout_token, STAKING_POOL, IERC20(payout_token).totalSupply());
            }  
            IStakingPool(STAKING_POOL).addRewardToPool(expectVABAmount);
            return true;
        } else {
            return false;
        }
    } 

    /// @notice Approve a film for funding/listing from vote contract
    function approveFilm(uint256 _filmId) external onlyVote {
        require(_filmId > 0, "ApproveFilm: Invalid filmId"); 

        (, , uint256 fundType) = getFilmFund(_filmId);
        if(fundType > 0) { // in case of fund film
            filmInfo[_filmId].status = Helper.Status.APPROVED_FUNDING;
            approvedFundingFilmIds.push(_filmId);
        } else {
            filmInfo[_filmId].status = Helper.Status.APPROVED_LISTING;    
            approvedListingFilmIds.push(_filmId);
        }        
        filmInfo[_filmId].pApproveTime = block.timestamp;

        emit FilmApproved(_filmId);
    }

    /// @notice onlyStudio update film share and payee
    function updateFilmShareAndPayee(
        uint256 _filmId, 
        uint256[] memory _sharePercents, 
        address[] memory _studioPayees
    ) public nonReentrant {        
        require(filmInfo[_filmId].studio == msg.sender, "updateFilm: not film owner");
        require(_sharePercents.length == _studioPayees.length, "updateFilm: bad array length");

        uint256 totalPercent = 0;
        for(uint256 k = 0; k < _studioPayees.length; k++) {
            totalPercent += _sharePercents[k];
        }
        require(totalPercent <= 1e10, 'updateFilm: total over 100%');

        Film storage fInfo = filmInfo[_filmId];
        fInfo.studioPayees = _studioPayees;   
        fInfo.sharePercents = _sharePercents;   
            
        emit FilmShareAndPayeeUpdated(msg.sender, _filmId, _sharePercents, _studioPayees);
    }

    /// @notice onlyStudio update film rental price and fund period
    function updateFilmPriceAndPeriod(
        uint256 _filmId, 
        uint256 _rentPrice, 
        uint256 _fundPeriod
    ) external nonReentrant {
        require(msg.sender == filmInfo[_filmId].studio, "updateRentPrice: not film owner");
        require(_rentPrice > 0, "updateRentPrice: zero price"); 

        filmInfo[_filmId].rentPrice = _rentPrice;
        filmInfo[_filmId].fundPeriod = _fundPeriod;
        
        emit FilmPriceAndPeriodUpdated(msg.sender, _filmId, _rentPrice, _fundPeriod);
    }   

    /// @notice Set final films for a customer with watched percents
    function setFinalFilms(        
        address[] memory _users,
        uint256[] memory _filmIds,
        uint256[] memory _watchPercents
    ) external onlyAuditor nonReentrant {
        require(_filmIds.length > 0 && _filmIds.length == _watchPercents.length, "setFinalFilms: bad length");

        for(uint256 i = 0; i < _filmIds.length; i++) {        
            __setFinalFilm(_users[i], _filmIds[i], _watchPercents[i]);
        }

        emit FinalFilmSetted(_users, _filmIds, _watchPercents);
    }
    
    function __setFinalFilm(
        address _user, 
        uint256 _filmId, 
        uint256 _watchPercent
    ) private {          
        Film memory fInfo = filmInfo[_filmId];
        require(
            fInfo.status == Helper.Status.APPROVED_LISTING || 
            fInfo.status == Helper.Status.APPROVED_WITHOUTVOTE,
            "setFinalFilm: bad film status"
        );
                  
        // Transfer VAB to payees based on share(%) and watch(%)
        uint256 payout = __getPayoutFor(filmInfo[_filmId].rentPrice, _watchPercent);
        uint256 userVAB = IStakingPool(STAKING_POOL).getRentVABAmount(_user);
        require(payout > 0 && userVAB >= payout, "setFinalFilm: insufficient balance");

        uint256 restAmount = payout;
        for(uint256 k = 0; k < fInfo.studioPayees.length; k++) {
            uint256 shareAmount = payout * fInfo.sharePercents[k] / 1e10;
            IStakingPool(STAKING_POOL).sendVAB(_user, fInfo.studioPayees[k], shareAmount);
            restAmount -= shareAmount;
        }

        uint256 nftCountOwned = 0;
        uint256[] memory nftList = IFactoryFilmNFT(FILM_NFT_FACTORY).getFilmTokenIdList(_filmId);
        for(uint256 i = 0; i < nftList.length; i++) {
            if(IERC721(FILM_NFT_FACTORY).ownerOf(nftList[i]) == _user) {
                nftCountOwned += 1;
            }
        }        

        ( , , , , uint256 revenuePercent, ,) = IFactoryFilmNFT(FILM_NFT_FACTORY).getMintInfo(_filmId);
        if(nftCountOwned > 0 && revenuePercent > 0) {
            uint256 revenueAmount = restAmount * revenuePercent / 1e10;
            revenueAmount *= nftCountOwned;
            require(restAmount >= revenueAmount, "setFinalFilm: insufficient revenueAmount"); 

            // Transfer revenue amount to user if user fund to this film throughout NFT mint
            IStakingPool(STAKING_POOL).sendVAB(_user, _user, revenueAmount);
            restAmount -= revenueAmount;
        }        
        // Transfer remain amount to film owner
        IStakingPool(STAKING_POOL).sendVAB(_user, fInfo.studio, restAmount);

        userFinalFilmIds[_user].push(_filmId);
    }  

    // =================== Funding(Launch Pad) START ===============================
    /// @notice Deposit tokens(VAB, USDT, USDC)/native token($50 ~ $5000 per address for a film) to only funding film by customer(investor)
    function depositToFilm(
        uint256 _filmId, 
        address _token, 
        uint256 _amount
    ) external payable {
        if(_token != IProperty(DAO_PROPERTY).PAYOUT_TOKEN()) {
            require(IOwnablee(OWNABLE).isDepositAsset(_token), "depositToFilm: not allowed asset");   
        }
        require(msg.sender != address(0) && _amount > 0, "depositToFilm: Zero value");
        require(filmInfo[_filmId].fundType == 1 || filmInfo[_filmId].fundType == 3, "depositToFilm: not fund type by token");
        require(filmInfo[_filmId].status == Helper.Status.APPROVED_FUNDING, "depositToFilm: filmId not approved for funding");
        require(filmInfo[_filmId].fundPeriod >= block.timestamp - filmInfo[_filmId].pApproveTime, "depositToFilm: passed funding period");    

        uint256 userFundAmountPerFilm = getUserFundAmountPerFilm(msg.sender, _filmId);
        uint256 fundAmount = IUniHelper(UNI_HELPER).expectedAmount(_amount, _token, IProperty(DAO_PROPERTY).USDC_TOKEN());    
        uint256 amountOfUser = userFundAmountPerFilm + fundAmount;    
        require(__checkMinMaxAmount(amountOfUser), "depositToFilm: Invalid amount");

        if(userFundAmountPerFilm == 0) {
            filmInvestorList[_filmId].push(msg.sender);            
            userInvestFilmIds[msg.sender].push(_filmId);
        }

        // Return remain ETH to user back if case of ETH
        if(_token == address(0)) {
            require(msg.value >= _amount, "depositToFilm: Insufficient paid");
            if (msg.value > _amount) {
                Helper.safeTransferETH(msg.sender, msg.value - _amount);
            }
        }
        
        if(_token != address(0)) {
            Helper.safeTransferFrom(_token, msg.sender, address(this), _amount);
        }            
        __assignToken(_filmId, _token, _amount);

        emit DepositedTokenToFilm(msg.sender, _token, _amount, _filmId);
    }    

    /// @dev Update/Add user fund amount
    function __assignToken(uint256 _filmId, address _token, uint256 _amount) private {
        bool isNewTokenPerUser = true;
        bool isNewTokenPerFilm = true;

        // update token amount
        for(uint256 i = 0; i < assetInfo[_filmId][msg.sender].length; i++) {
            if(_token == assetInfo[_filmId][msg.sender][i].token) {
                assetInfo[_filmId][msg.sender][i].amount += _amount;
                isNewTokenPerUser = false;
            }
        }
        // add new token
        if(isNewTokenPerUser) {
            assetInfo[_filmId][msg.sender].push(Asset({token: _token, amount: _amount}));
        }
        
        for(uint256 i = 0; i < assetPerFilm[_filmId].length; i++) {
            if(_token == assetPerFilm[_filmId][i].token) {
                assetPerFilm[_filmId][i].amount += _amount;
                isNewTokenPerFilm = false;
            }
        }
        if(isNewTokenPerFilm) {
            assetPerFilm[_filmId].push(Asset({token: _token, amount: _amount}));
        }
    }

    /// @notice onlyStudio send the 2% of funds to reward pool in VAB if funding meet the raise amount after fund period
    function fundProcess(uint256 _filmId) external nonReentrant {
        require(filmInfo[_filmId].studio == msg.sender, "fundProcess: not film owner");
        require(filmInfo[_filmId].status == Helper.Status.APPROVED_FUNDING, "fundProcess: filmId not approved for funding");
        require(filmInfo[_filmId].fundPeriod < block.timestamp - filmInfo[_filmId].pApproveTime, "fundProcess: funding period");

        require(isRaisedFullAmount(_filmId), "fundProcess: fails to meet raise amount");
        require(!isFundProcessed[msg.sender][_filmId], "fundProcess: already processed");
        
        // Send fundFeePercent(2%) to reward pool as VAB token and rest send to studio
        address vabToken = IProperty(DAO_PROPERTY).PAYOUT_TOKEN();
        Asset[] memory assetArr = assetPerFilm[_filmId];
        uint256 rewardSumAmount;
        uint256 rewardAmount;
        for(uint256 i = 0; i < assetArr.length; i++) {                
            rewardAmount = assetArr[i].amount * IProperty(DAO_PROPERTY).fundFeePercent() / 1e10;
            if(vabToken == assetArr[i].token) {
                rewardSumAmount += rewardAmount;
            } else {
                if(IERC20(assetArr[i].token).allowance(address(this), UNI_HELPER) == 0) {
                    Helper.safeApprove(assetArr[i].token, UNI_HELPER, IERC20(assetArr[i].token).totalSupply());
                }
                bytes memory swapArgs = abi.encode(rewardAmount, assetArr[i].token, vabToken);
                rewardSumAmount += IUniHelper(UNI_HELPER).swapAsset(swapArgs);
            }
            Helper.safeTransfer(assetArr[i].token, msg.sender, (assetArr[i].amount - rewardAmount));
            // assetArr[i].amount = 0;
        }

        if(rewardSumAmount > 0) {
            if(IERC20(vabToken).allowance(address(this), STAKING_POOL) == 0) {
                Helper.safeApprove(vabToken, STAKING_POOL, IERC20(vabToken).totalSupply());
            }        
            IStakingPool(STAKING_POOL).addRewardToPool(rewardSumAmount);
        }

        fundProcessedFilmIds.push(_filmId);
        isFundProcessed[msg.sender][_filmId] = true;

        emit FundFilmProcessed(_filmId);
    }

    /// @notice Investor can withdraw fund after fund period if funding fails to meet the raise amount
    function withdrawFunding(uint256 _filmId) external nonReentrant {     
        require(filmInfo[_filmId].status == Helper.Status.APPROVED_FUNDING, "withdrawFunding: filmId not approved for funding");
        require(filmInfo[_filmId].fundPeriod < block.timestamp - filmInfo[_filmId].pApproveTime, "withdrawFunding: funding period");

        require(!isRaisedFullAmount(_filmId), "withdrawFunding: satisfied raise amount");

        Asset[] storage assetArr = assetInfo[_filmId][msg.sender];
        for(uint256 i = 0; i < assetArr.length; i++) {   
            if(assetArr[i].token == address(0)) {
                if(address(this).balance >= assetArr[i].amount) {
                    Helper.safeTransferETH(msg.sender, assetArr[i].amount);
                    assetArr[i].amount = 0;
                }                
            } else {
                if(IERC20(assetArr[i].token).balanceOf(address(this)) >= assetArr[i].amount) {
                    Helper.safeTransfer(assetArr[i].token, msg.sender, assetArr[i].amount);    
                    assetArr[i].amount = 0;
                }
            }
        }
    }

    /// @notice Check if fund meet raise amount
    function isRaisedFullAmount(uint256 _filmId) public view returns (bool) {
        uint256 raisedAmount = getRaisedAmountByToken(_filmId) + IFactoryFilmNFT(FILM_NFT_FACTORY).getRaisedAmountByNFT(_filmId);
        if(raisedAmount > 0 && raisedAmount >= filmInfo[_filmId].raiseAmount) {
            return true;
        } else {
            return false;
        }
    }     

    /// @dev Get payout(VAB) amount based on watched percent for a film
    function __getPayoutFor(uint256 _rentPrice, uint256 _percent) private view returns(uint256) {
        uint256 usdcAmount = _rentPrice * _percent / 1e10;
        address vabToken = IProperty(DAO_PROPERTY).PAYOUT_TOKEN();
        address usdcToken = IProperty(DAO_PROPERTY).USDC_TOKEN();
        return IUniHelper(UNI_HELPER).expectedAmount(usdcAmount, usdcToken, vabToken);
    }

    /// @dev For transferring to Studio, Get share amount based on share percent
    function __getShareAmount(
        uint256 _payout, 
        uint256 _filmId, 
        uint256 _k
    ) private view returns(uint256) {
        return _payout * filmInfo[_filmId].sharePercents[_k] / 1e10;
    }

    /// @dev Check min & max amount for each token/ETH per film
    function __checkMinMaxAmount(uint256 _amount) private view returns (bool passed_) {
        if(_amount >= IProperty(DAO_PROPERTY).minDepositAmount() && _amount <= IProperty(DAO_PROPERTY).maxDepositAmount()) {
            passed_ = true;
        } else {
            passed_ = false;
        } 
    }

    /// @notice Get user fund amount in cash(usdc) for each token per film
    function getUserFundAmountPerFilm(
        address _customer, 
        uint256 _filmId
    ) public view returns (uint256 amount_) {
        address usdc_token = IProperty(DAO_PROPERTY).USDC_TOKEN();
        Asset[] memory assetArr = assetInfo[_filmId][_customer];
        for(uint256 i = 0; i < assetArr.length; i++) {
            if(assetArr[i].amount == 0) continue;

            if(assetArr[i].token == usdc_token) {
                amount_ += assetArr[i].amount;
            } else {
                amount_ += IUniHelper(UNI_HELPER).expectedAmount(assetArr[i].amount, assetArr[i].token, usdc_token);
            }
        }
    }

    /// @notice Get fund amount in cash(usdc) per film
    function getRaisedAmountByToken(uint256 _filmId) public view returns (uint256 amount_) {
        address usdc_token = IProperty(DAO_PROPERTY).USDC_TOKEN();
        Asset[] memory assetArr = assetPerFilm[_filmId];
        for(uint256 i = 0; i < assetArr.length; i++) {
            if(assetArr[i].amount == 0) continue;

            if(assetArr[i].token == usdc_token) {
                amount_ += assetArr[i].amount;
            } else {
                amount_ += IUniHelper(UNI_HELPER).expectedAmount(assetArr[i].amount, assetArr[i].token, usdc_token);
            }
        }
    }

    /// @notice Get film item based on filmId
    function getFilmById(uint256 _filmId) external view 
    returns (
        uint256[] memory nftRight_,
        uint256[] memory sharePercents_,
        address[] memory choiceAuditor_,
        address[] memory studioPayees_,
        uint256 rentPrice_       
    ) {
        Film memory _filmInfo = filmInfo[_filmId];
        nftRight_ = _filmInfo.nftRight;
        sharePercents_ = _filmInfo.sharePercents;
        choiceAuditor_ = _filmInfo.choiceAuditor;
        studioPayees_ = _filmInfo.studioPayees;
        rentPrice_ = _filmInfo.rentPrice;        
    }

    /// @notice Get film status based on Id
    function getFilmStatus(uint256 _filmId) external view returns (Helper.Status status_) {
        status_ = filmInfo[_filmId].status;
    }

    /// @notice Get film owner(studio) based on Id
    function getFilmOwner(uint256 _filmId) external view returns (address owner_) {
        owner_ = filmInfo[_filmId].studio;
    }

    /// @notice Get film fund info based on Id
    function getFilmFund(uint256 _filmId) public view 
    returns (
        uint256 raiseAmount_, 
        uint256 fundPeriod_, 
        uint256 fundType_
    ) {
        raiseAmount_ = filmInfo[_filmId].raiseAmount;
        fundPeriod_ = filmInfo[_filmId].fundPeriod;
        fundType_ = filmInfo[_filmId].fundType;
    }

    /// @notice Get film proposal created time based on Id
    function getFilmProposalTime(uint256 _filmId) external view returns (uint256 cTime_, uint256 aTime_) {
        cTime_ = filmInfo[_filmId].pCreateTime;
        aTime_ = filmInfo[_filmId].pApproveTime;
    }

    /// @notice Set film proposal approved time based on Id
    function setFilmProposalApproveTime(uint256 _filmId, uint256 _time) external onlyVote {
        filmInfo[_filmId].pApproveTime = _time;
    }

    /// @notice Get proposal/approvedNoVote/approvedFunding/approvedListing/fundProcessed/final film Ids
    function getFilmIds(uint256 _flag) external view returns (uint256[] memory) {
        if(_flag == 1) return proposalFilmIds;
        else if(_flag == 2) return approvedNoVoteFilmIds;        
        else if(_flag == 3) return approvedFundingFilmIds;
        else if(_flag == 4) return approvedListingFilmIds;
        else return fundProcessedFilmIds;        
    }  

    /// @notice Get investor list per film Id
    function getInvestorList(uint256 _filmId) external view returns (address[] memory) {
        return filmInvestorList[_filmId];
    }
}
