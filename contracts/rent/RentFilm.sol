// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
// import "../interfaces/IRentFilm.sol";
import "../libraries/Ownable.sol";
import "../libraries/RentFilmHelper.sol";
import "hardhat/console.sol";

contract RentFilm is ERC721Holder, ERC1155Holder, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    event FilmsProposalCreated(uint256[] indexed filmIds);    
    event FilmApproved(uint256 filmId);
    event FilmsFinalSet(uint256[] filmIds);
    event FilmsRented(uint256[] indexed filmIds, address customer);
    event FilmsUpdatedByStudio(uint256[] indexed filmIds);
    event CustomerDeopsited(address customer, address token, uint256 amount);
    event CustomerWithdrawed(address customer, address token, uint256 amount);

    enum Status {
        LISTED,   // proposal created by studio
        APPROVED // approved by vote from VAB holders
    }

    struct UserInfo {
        uint256 amount;          // current user balance in DAO
        uint256 withdrawAmount;  // withdraw amount coming from user
    }

    // 1% = 100, 100% = 10000
    struct Film {
        address[] studioActors; // addresses who studio define to pay revenue
        uint256[] sharePercents;// percents(1% = 100) that studio defines to pay revenue for each actor
        uint256 rentPrice;      // amount that a customer rents a film
        uint256 startTime;      // time that a customer rents a film
        address studio;         // address of studio who is admin of film 
        Status status;          // status of film
    }

    IERC20 public immutable PAYOUT_TOKEN;     // Vab token    

    address immutable public VOTE;            // Vote contract address
    address public DAOFee;                    // address for transferring DAO Fee

    uint256[] private proposalFilmIds;    
    uint256[] public finalFilmIds;

    mapping(uint256 => Film) public filmInfo; // Total films(filmId => Film)
    mapping(address => uint256[]) public customerFilmIds; // Rented film IDs for a customer(customer => fimlId[])
    mapping(address => UserInfo) public userInfo;

    Counters.Counter public filmIds;          // filmId is from No.1

    modifier onlyVote() {
        require(msg.sender == VOTE, "caller is not the vote contract");
        _;
    }

    constructor(
        address _daoFee,
        address _payoutToken,
        address _voteContract
    ) {        
        require(_daoFee != address(0), "_daoFee: ZERO address");
        DAOFee = _daoFee;
        require(_payoutToken != address(0), "_payoutToken: ZERO address");
        PAYOUT_TOKEN = IERC20(_payoutToken);
        require(_voteContract != address(0), "_voteContract: ZERO address");
        VOTE = _voteContract;
    }

    /// @notice Create Proposal with rentPrice for multiple films by studio
    function createProposalFilms(
        uint256[] calldata _proposalfilms
    ) external onlyStudio nonReentrant {
        require(_proposalfilms.length > 0, "Proposal: Invalid films length");      

        for (uint256 i = 0; i < _proposalfilms.length; i++) {
            proposalFilmIds.push(_proposalFilm(_proposalfilms[i])); 
        }
        
        emit FilmsProposalCreated(proposalFilmIds);
    }

    /// @notice Create a Proposal for a film
    function _proposalFilm(uint256 _rentPrice) private returns(uint256) {
        filmIds.increment();
        uint256 filmId = filmIds.current();

        Film storage _filmInfo = filmInfo[filmId];
        _filmInfo.rentPrice = _rentPrice;

        return filmId;
    }

    /// @notice Update multiple films with param by studio
    function updateFilmsByStudio(
        bytes[] calldata _updateFilms
    ) external onlyStudio nonReentrant {
        require(_updateFilms.length > 0, "updateFilms: Invalid item length");

        uint256[] memory updateItemIDs = new uint256[](_updateFilms.length);
        for (uint256 i; i < _updateFilms.length; i++) {            
            
            (
                uint256 filmId_, 
                uint256[] memory sharePercents_, 
                address[] memory studioActors_
            ) = abi.decode(_updateFilms[i], (uint256, uint256[], address[]));

            Film storage _filmInfo = filmInfo[filmId_];
            _filmInfo.studioActors = studioActors_;   
            _filmInfo.sharePercents = sharePercents_;   

            updateItemIDs[i] = filmId_;
        }   

        emit FilmsUpdatedByStudio(updateItemIDs);
    }

    /// @notice Approve a film from vote contract
    function ApproveFilm(uint256 _filmId) external onlyVote {
        require(_filmId > 0, "ApproveFilm: Invalid filmId");      

        filmInfo[_filmId].status = Status.APPROVED;
        
        emit FilmApproved(_filmId);
    }

    /// @notice Update multiple films with watched percents by Auditor
    function finalSetFilms(
        bytes[] calldata _finalFilms
    ) external onlyAuditor nonReentrant {
        
        require(_finalFilms.length > 0, "finalSetFilms: Bad items length");

        for (uint256 i = 0; i < _finalFilms.length; i++) {
            _finalSetFilms(_finalFilms[i]);
        }

        emit FilmsFinalSet(finalFilmIds);
    }

    /// @notice Set final films for a customer with watched percents
    function _finalSetFilms(        
        bytes calldata _filmData
    ) private returns(uint256[] memory) {
        (   
            address customer_,
            uint256[] memory filmIds_,
            uint256[] memory watchPercents_
        ) = abi.decode(_filmData, (address, uint256[], uint256[]));
        
        require(customer_ != address(0), "_finalSetFilms: Zero customer address");

        require(filmIds_.length == watchPercents_.length, "_finalSetFilms: Invalid items length");

        // Assgin the VAB token to actors based on share(%) and watch(%)
        for (uint256 i = 0; i < filmIds_.length; i++) {
            if(filmInfo[filmIds_[i]].status == Status.APPROVED) {       

                uint256 payout = _getPayoutFor(filmIds_[i], watchPercents_[i]);
                userInfo[customer_].amount -= payout; 

                for(uint256 k = 0; k < filmInfo[filmIds_[i]].studioActors.length; k++) {
                    userInfo[filmInfo[filmIds_[i]].studioActors[k]].amount += _getShareAmount(payout, filmIds_[i], k);
                }

                finalFilmIds.push(filmIds_[i]);
            }
        }   

        // Transfer withdraw to user if he asked
        transferWithdraw(customer_);

        return finalFilmIds;
    }

    /// @notice Deposit VAB token by customer
    function customerDeopsit(uint256 _amount) external nonReentrant returns(uint256) {
        require(msg.sender != address(0), "customerDeopsit: Invalid customer address");
        require(_amount > 0 && PAYOUT_TOKEN.balanceOf(msg.sender) > _amount, "customerDeopsit: Insufficient amount");

        PAYOUT_TOKEN.transferFrom(msg.sender, address(this), _amount);
        userInfo[msg.sender].amount += _amount;

        emit CustomerDeopsited(msg.sender, address(PAYOUT_TOKEN), _amount);

        return _amount;
    }

    /// @notice Pending Withdraw VAB token by customer
    function customerWithdraw(uint256 _amount) external nonReentrant {
        require(msg.sender != address(0), "customerWithdraw: Invalid customer address");
        require(_amount > 0 && _amount <= userInfo[msg.sender].amount, "customerWithdraw: Insufficient amount");

        // PAYOUT_TOKEN.transfer(msg.sender, _amount);
        // userInfo[msg.sender].amount -= _amount;

        userInfo[msg.sender].withdrawAmount = _amount;
        emit CustomerWithdrawed(msg.sender, address(PAYOUT_TOKEN), _amount);
    }

    /// @notice Transfer payment to user
    function transferWithdraw(address _to) private returns(bool flag_) {
        uint256 payAmount = userInfo[_to].withdrawAmount;
        require(payAmount > 0 && payAmount <= userInfo[_to].amount, "transferPayment: Insufficient amount");

        PAYOUT_TOKEN.transfer(_to, payAmount);

        userInfo[_to].amount -= payAmount;
        userInfo[_to].withdrawAmount = 0;

        emit CustomerWithdrawed(msg.sender, address(PAYOUT_TOKEN), payAmount);

        flag_ = true;        
    }

    /// @notice Check user balance in DAO if enough for rent
    function checkUserBalance(address _user, uint256[] calldata _filmIds) public view returns(bool) {
        uint256 totalRentPrice = 0;
        for(uint256 i; i < _filmIds.length; i++) {
            totalRentPrice += filmInfo[_filmIds[i]].rentPrice;
        }        

        if(userInfo[_user].amount >= totalRentPrice) return true;
        return false;
    }

    /// @notice Get user balance in DAO
    function getUserBalance(address _user) public view returns(uint256) {
        return userInfo[_user].amount;
    }

    /// @notice Get film item based on Id
    function getFilmById(uint256 _filmId) external view 
    returns (
        address[] memory studioActors_, 
        uint256[] memory sharePercents_, 
        uint256 rentPrice_,
        uint256 startTime_,
        address studio_,
        Status status_
    ) {
        Film storage _filmInfo = filmInfo[_filmId];
        studioActors_ = _filmInfo.studioActors;
        sharePercents_ = _filmInfo.sharePercents;
        rentPrice_ = _filmInfo.rentPrice;
        startTime_ = _filmInfo.startTime;
        studio_ = _filmInfo.studio;
        status_ = _filmInfo.status;
    }

    /// @notice Get payout amount based on watched percent for a film
    function _getPayoutFor(uint256 _filmId, uint256 _watchPercent) private view returns(uint256) {
        return filmInfo[_filmId].rentPrice * _watchPercent / 10000;
    }

    function _getShareAmount(uint256 _payout, uint256 _filmId, uint256 _k) private view returns(uint256) {
        return _payout * filmInfo[_filmId].sharePercents[_k] / 10000;
    }    
}
