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
    event FinalFilmSetted(address[] users, uint256[] filmIds, uint256[] watchedPercents, uint256[] rentPrices);
    event FilmShareAndPayeeUpdated(address filmOwner, uint256 filmId, uint256[] shares, address[] payees);
    event FilmFundPeriodUpdated(address filmOwner, uint256 filmId, uint256 fundPeriod);
    
    struct Film {
        uint256[] nftRight;      // What genre the film will be(Action,Adventure,Animation,Biopic, , , Western,War,WEB3)
        uint256[] sharePercents; // percents(1% = 1e8) that studio defines to pay revenue for each payee
        address[] choiceAuditor; // What auditor will you distribute to = Vabble consumer portal. Titled as "Vabble"
        address[] studioPayees;  // payee addresses who studio define to pay revenue
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
    
    mapping(uint256 => Film) private filmInfo;             // Each film information(filmId => Film)
    mapping(address => uint256) public userFilmProposalCount; // (user => created film-proposal count)
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
    /// @notice Staker create multi proposal for a lot of films | if 0 => false, 1 => true
    function proposalFilmCreate(uint256[] memory _noVotes, address _feeToken) external payable nonReentrant {     
        require(_noVotes.length > 0, 'proposalFilm: bad length');
        if(_feeToken != IOwnablee(OWNABLE).PAYOUT_TOKEN()) {
            require(IOwnablee(OWNABLE).isDepositAsset(_feeToken), "proposalFilm: not allowed asset");   
        }
        
        __paidFee(_feeToken, _noVotes);
 
        uint256[] memory idList = new uint256[](_noVotes.length);
        for(uint256 i = 0; i < _noVotes.length; i++) {
            idList[i] = __proposalFilmCreate(_noVotes[i]);
        }

        emit FilmProposalCreated(idList, _noVotes, msg.sender);
    }

    function __proposalFilmCreate(uint256 _noVote) private returns (uint256) {  
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

    function proposalFilmMultiUpdate(bytes[] calldata _updateFilms) external nonReentrant {
        require(_updateFilms.length > 0, "proposalUpdate: Invalid item length");
        for(uint256 i = 0; i < _updateFilms.length; i++) {
            (
                uint256 _filmId, 
                uint256[] memory _nftRight,
                uint256[] memory _sharePercents,
                address[] memory _choiceAuditor,
                address[] memory _studioPayees,
                uint256 _raiseAmount,
                uint256 _fundPeriod,
                uint256 _fundType
            ) = abi.decode(_updateFilms[i], (uint256, uint256[], uint256[], address[], address[], uint256, uint256, uint256));

            proposalFilmUpdate(
                _filmId,
                _nftRight,
                _sharePercents,
                _choiceAuditor,
                _studioPayees,
                _raiseAmount,
                _fundPeriod,
                _fundType
            );
        }
    }

    function proposalFilmUpdate(
        uint256 _filmId, 
        uint256[] memory _nftRight,
        uint256[] memory _sharePercents,
        address[] memory _choiceAuditor,
        address[] memory _studioPayees,
        uint256 _raiseAmount,
        uint256 _fundPeriod,
        uint256 _fundType
    ) public {                
        require(_nftRight.length > 0, 'proposalUpdate: invalid right');
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

        fInfo.nftRight = _nftRight;
        fInfo.sharePercents = _sharePercents;
        fInfo.choiceAuditor = _choiceAuditor;
        fInfo.studioPayees = _studioPayees;    
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
    function __paidFee(address _dToken, uint256[] memory _noVotes) private {    
        uint256 feeAmount = IProperty(DAO_PROPERTY).proposalFeeAmount(); // in cash(usdc)
        uint256 _usdcAmount;
        for(uint256 i = 0; i < _noVotes.length; i++) {
            if(_noVotes[i] == 1) _usdcAmount += feeAmount * 2;
            else _usdcAmount += feeAmount;
        }

        uint256 expectTokenAmount = IUniHelper(UNI_HELPER).expectedAmount(_usdcAmount, IOwnablee(OWNABLE).USDC_TOKEN(), _dToken);
        Helper.safeTransferFrom(_dToken, msg.sender, address(this), expectTokenAmount);

        // Send ETH from this contract to UNI_HELPER contract
        if(_dToken == address(0)) Helper.safeTransferETH(UNI_HELPER, expectTokenAmount);
        
        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();
        uint256 vabAmount = expectTokenAmount;
        if(_dToken != vabToken) {
            if(IERC20(_dToken).allowance(address(this), UNI_HELPER) == 0) {
                Helper.safeApprove(_dToken, UNI_HELPER, IERC20(_dToken).totalSupply());
            }
            bytes memory swapArgs = abi.encode(expectTokenAmount, _dToken, vabToken);
            vabAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs);    
        }
        
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

    /// @notice onlyStudio update film fund period
    function updateFilmFundPeriod(uint256 _filmId, uint256 _fundPeriod) external nonReentrant {
        require(msg.sender == filmInfo[_filmId].studio, "updateRentPrice: not film owner");

        filmInfo[_filmId].fundPeriod = _fundPeriod;
        
        emit FilmFundPeriodUpdated(msg.sender, _filmId, _fundPeriod);
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

        emit FinalFilmSetted(_users, _filmIds, _watchPercents, _rentPrices);
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

    /// @notice Get film item based on filmId
    function getFilmById(uint256 _filmId) external view 
    returns (
        uint256[] memory nftRight_,
        uint256[] memory sharePercents_,
        address[] memory choiceAuditor_,
        address[] memory studioPayees_
    ) {
        nftRight_ = filmInfo[_filmId].nftRight;
        sharePercents_ = filmInfo[_filmId].sharePercents;
        choiceAuditor_ = filmInfo[_filmId].choiceAuditor;
        studioPayees_ = filmInfo[_filmId].studioPayees;  
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
