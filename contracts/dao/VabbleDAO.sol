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

    event FilmProposalCreated(uint256 filmId, uint256 noVote, address studio, uint256 createTime);
    event FilmProposalUpdated(uint256 filmId, uint256 fundType, address studio, uint256 updateTime);     
    event FilmApproved(uint256 filmId, uint256 fundType, uint256 approveTime);
    event FinalFilmSetted(address[] users, uint256[] filmIds, uint256[] watchedPercents, uint256[] rentPrices, uint256 setTime);
    event FilmFundPeriodUpdated(uint256 filmId, address studio, uint256 fundPeriod, uint256 updateTime);
    
    struct Film {
        string title;            // proposal title
        string description;      // proposal description
        uint256[] sharePercents; // percents(1% = 1e8) that studio defines to pay revenue for each payee
        address[] choiceAuditor; // What auditor will you distribute to = Vabble consumer portal. Titled as "Vabble"
        address[] studioPayees;  // payee addresses who studio define to pay revenue
        uint256 raiseAmount;     // USDC amount(in cash) studio are seeking to raise for the film
        uint256 fundPeriod;      // how many days(ex: 20 days) to keep the funding pool open        
        uint256 fundType;        // Financing Type(None=>0, Token=>1, NFT=>2, NFT & Token=>3)
        uint256 noVote;          // if 0 => false, 1 => true
        uint256 pCreateTime;     // proposal created time(block.timestamp) by studio
        uint256 pApproveTime;    // proposal approved time(block.timestamp) by vote
        address studio;          // studio address(film owner)
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
    
    mapping(uint256 => Film) public filmInfo;             // Each film information(filmId => Film)
    mapping(address => uint256[]) private userFinalFilmIds;
    mapping(address => uint256[]) private userFilmProposalIds; // (studio => filmId list)
    
    Counters.Counter public filmCount;          // filmId is from No.1

    modifier onlyVote() {
        require(msg.sender == VOTE, "caller is not the vote contract");
        _;
    }
    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "caller is not the auditor");
        _;
    }  

    receive() external payable {}
    
    constructor(
        address _ownable,
        address _uniHelper,
        address _vote,
        address _staking,
        address _property,
        address _filmNftFactory
    ) {        
        require(_ownable != address(0), "ownableContract: Zero address");
        OWNABLE = _ownable;     
        require(_uniHelper != address(0), "uniHelperContract: Zero address");
        UNI_HELPER = _uniHelper;
        require(_vote != address(0), "voteContract: Zero address");
        VOTE = _vote;
        require(_staking != address(0), "stakingContract: Zero address");
        STAKING_POOL = _staking;      
        require(_property != address(0), "daoProperty: Zero address");
        DAO_PROPERTY = _property; 
        require(_filmNftFactory!= address(0), "setup: zero factoryContract address");
        FILM_NFT_FACTORY = _filmNftFactory;  
    }

    // ======================== Film proposal ==============================
    /// @notice Staker create multi proposal for a lot of films | noVote: if 0 => false, 1 => true
    /// _feeToken : Matic/USDC/USDT, not VAB
    function proposalFilmCreate(uint256 _noVote, address _feeToken) external payable nonReentrant {     
        require(_feeToken != IOwnablee(OWNABLE).PAYOUT_TOKEN(), "proposalFilm: not allowed VAB");
        require(IOwnablee(OWNABLE).isDepositAsset(_feeToken), "proposalFilm: not allowed asset");   
        
        __paidFee(_feeToken, _noVote);
 
        filmCount.increment();
        uint256 filmId = filmCount.current();

        Film storage fInfo = filmInfo[filmId];
        fInfo.noVote = _noVote;
        fInfo.studio = msg.sender;
        fInfo.status = Helper.Status.LISTED;

        proposalFilmIds.push(filmId);
        userFilmProposalIds[msg.sender].push(filmId);

        emit FilmProposalCreated(filmId, _noVote, msg.sender, block.timestamp);
    }
    function proposalFilmUpdate(
        uint256 _filmId, 
        string memory _title,
        string memory _description,
        uint256[] memory _sharePercents,
        address[] memory _studioPayees,
        address[] memory _choiceAuditor,
        uint256 _raiseAmount,
        uint256 _fundPeriod,
        uint256 _fundType
    ) public {                
        require(_studioPayees.length == _sharePercents.length, 'proposalUpdate: invalid share percent');
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

        fInfo.title = _title;
        fInfo.description = _description;
        fInfo.sharePercents = _sharePercents;
        fInfo.choiceAuditor = _choiceAuditor;
        fInfo.studioPayees = _studioPayees;    
        fInfo.raiseAmount = _raiseAmount;
        fInfo.fundPeriod = _fundPeriod;
        fInfo.fundType = _fundType;
        fInfo.pCreateTime = block.timestamp;
        fInfo.studio = msg.sender;
        fInfo.status = Helper.Status.UPDATED;

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

        emit FilmProposalUpdated(_filmId, _fundType, msg.sender, block.timestamp);     
    }

    /// @notice Check if proposal fee transferred from studio to stakingPool
    // Get expected VAB amount from UniswapV2 and then Transfer VAB: user(studio) -> stakingPool.
    function __paidFee(address _dToken, uint256 _noVote) private {    
        uint256 feeAmount = IProperty(DAO_PROPERTY).proposalFeeAmount(); // in cash(usdc)
        if(_noVote == 1) feeAmount = IProperty(DAO_PROPERTY).proposalFeeAmount() * 2;
        
        uint256 expectTokenAmount = feeAmount;
        if(_dToken != IOwnablee(OWNABLE).USDC_TOKEN()) {
            expectTokenAmount = IUniHelper(UNI_HELPER).expectedAmount(feeAmount, IOwnablee(OWNABLE).USDC_TOKEN(), _dToken);
        }

        if(_dToken == address(0)) {
            require(msg.value >= expectTokenAmount, "paidFee: Insufficient paid");
            if (msg.value > expectTokenAmount) {
                Helper.safeTransferETH(msg.sender, msg.value - expectTokenAmount);
            }
            // Send ETH from this contract to UNI_HELPER contract
            Helper.safeTransferETH(UNI_HELPER, expectTokenAmount);
        } else {
            Helper.safeTransferFrom(_dToken, msg.sender, address(this), expectTokenAmount);
        }
        
        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();
        if(IERC20(_dToken).allowance(address(this), UNI_HELPER) == 0) {
            Helper.safeApprove(_dToken, UNI_HELPER, IERC20(_dToken).totalSupply());
        }
        bytes memory swapArgs = abi.encode(expectTokenAmount, _dToken, vabToken);
        uint256 vabAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs);    
        
        if(IERC20(vabToken).allowance(address(this), STAKING_POOL) == 0) {
            Helper.safeApprove(vabToken, STAKING_POOL, IERC20(vabToken).totalSupply());
        }  
        IStakingPool(STAKING_POOL).addRewardToPool(vabAmount);
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

        emit FilmApproved(_filmId, fundType, block.timestamp);
    }

    /// @notice onlyStudio update film fund period
    function updateFilmFundPeriod(uint256 _filmId, uint256 _fundPeriod) external nonReentrant {
        require(msg.sender == filmInfo[_filmId].studio, "updateFundPeriod: not film owner");
        require(filmInfo[_filmId].fundType > 0, "updateFundPeriod: not fund film");

        filmInfo[_filmId].fundPeriod = _fundPeriod;
        
        emit FilmFundPeriodUpdated(_filmId, msg.sender, _fundPeriod, block.timestamp);
    }   

    /// @notice Set final films for a customer with watched percents
    function setFinalFilms(        
        address[] memory _users,
        uint256[] memory _filmIds,
        uint256[] memory _watchPercents,
        uint256[] memory _rentPrices
    ) external onlyAuditor nonReentrant {
        require(_filmIds.length > 0 && _filmIds.length == _watchPercents.length, "setFinalFilms: bad length");
        require(_rentPrices.length == _watchPercents.length, "setFinalFilms: bad rent price length");

        for(uint256 i = 0; i < _filmIds.length; i++) {        
            __setFinalFilm(_users[i], _filmIds[i], _watchPercents[i], _rentPrices[i]);
        }

        emit FinalFilmSetted(_users, _filmIds, _watchPercents, _rentPrices, block.timestamp);
    }
    
    function __setFinalFilm(
        address _user, 
        uint256 _filmId, 
        uint256 _watchPercent,
        uint256 _rentPrice
    ) private {          
        Film memory fInfo = filmInfo[_filmId];
        require(
            fInfo.status == Helper.Status.APPROVED_LISTING || 
            fInfo.status == Helper.Status.APPROVED_WITHOUTVOTE,
            "setFinalFilm: bad film status"
        );
                  
        // Transfer VAB to payees based on share(%) and watch(%)
        uint256 payout = __getPayoutFor(_rentPrice, _watchPercent);
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

    /// @dev Get payout(VAB) amount based on watched percent for a film
    function __getPayoutFor(uint256 _rentPrice, uint256 _percent) private view returns(uint256) {
        uint256 usdcAmount = _rentPrice * _percent / 1e10;
        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();
        address usdcToken = IOwnablee(OWNABLE).USDC_TOKEN();

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

    // /// @notice Get film item based on filmId
    // function getFilmById(uint256 _filmId) external view 
    // returns (
    //     string memory title_,
    //     string memory description_,
    //     uint256[] memory sharePercents_,
    //     address[] memory choiceAuditor_,
    //     address[] memory studioPayees_
    // ) {
    //     title_ = filmInfo[_filmId].title;
    //     description_ = filmInfo[_filmId].description;
    //     sharePercents_ = filmInfo[_filmId].sharePercents;
    //     choiceAuditor_ = filmInfo[_filmId].choiceAuditor;
    //     studioPayees_ = filmInfo[_filmId].studioPayees;  
    // }

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

    /// @notice Get film Ids
    function getFilmIds(uint256 _flag) external view returns (uint256[] memory) {        
        if(_flag == 1) return proposalFilmIds;
        else if(_flag == 2) return approvedNoVoteFilmIds;        
        else if(_flag == 3) return approvedFundingFilmIds;
        else return approvedListingFilmIds;
    }

    function getUserFilmIds(uint256 _flag, address _user) external view returns (uint256[] memory) {        
        if(_flag == 1) return userFinalFilmIds[_user];        
        else return userFilmProposalIds[_user];
    }
}
