// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
// import "../interfaces/IRentFilm.sol";
import "../libraries/Ownable.sol";
import "../libraries/RentFilmHelper.sol";

contract RentFilm is ERC721Holder, ERC1155Holder, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    event FilmsRegistered(uint256[] indexed filmIds);
    event FilmsRented(uint256[] indexed filmIds, address customer);
    event FilmsUpdated(uint256[] indexed _filmIds, uint256[] _watchPercents);
    event CustomerDeopsited(uint256 amount, address token, address customer);
    event CustomerWithdrawed(uint256 amount, address token, address customer);

    enum Status {
        LISTED,
        RENTED,
        EXPIRED,
        DESTROYED
    }

    struct RentRules {
        uint256 rentPeriod;
    }

    struct UserInfo {
        uint256 amount;
    }

    struct Film {
        address[] studioActors; // addresses who studio define to pay revenue
        uint256[] sharePercents;// percents(1% = 100) that studio defines to pay revenue for each actor
        uint256 rentPrice;      // amount that a customer rents a film
        uint256 startTime;      // time that a customer rents a film
        uint256 watchPercent;   // percent(100% = 10000) that a customer watch the film
        address customer;       // address of customer  
        RentRules rentRules;
        Status status;          // status of film
    }

    IERC20 public immutable PAYOUT_TOKEN; // Vab token

    address public DAOManager; // DAO manager

    uint256 public constant GRACE_PERIOD = 30 days; // 30 days

    uint256 public constant EXPIRE_PERIOD = 72 hours; // 72 hours

    uint256[] private registeredFilmIds;

    mapping(uint256 => Film) public filmInfo; // Registered total films(filmId => Film)

    mapping(address => uint256[]) public customerFilmIds; // Rented film IDs for a customer(customer => fimlId[])

    mapping(address => UserInfo) public userInfo;

    Counters.Counter public filmIds; // filmId is from No.1

    constructor(
        address _daoManager,
        address _payoutToken
    ) {        
        require(_daoManager != address(0), "_daoManager: ZERO address");
        DAOManager = _daoManager;
        require(_payoutToken != address(0), "_payoutToken: ZERO address");
        PAYOUT_TOKEN = IERC20(_payoutToken);
    }

    /// @notice Register multiple films by Admin
    function registerFilms(
        Film[] calldata _films
    ) external onlyAdmin nonReentrant {
        require(_films.length > 0, "registerFilms: Invalid films");      

        for (uint256 i = 0; i < _films.length; i++) {
            registeredFilmIds[i] = _registerFilm(
                    _films[i].studioActors, 
                    _films[i].sharePercents, 
                    _films[i].rentPrice,
                    _films[i].rentRules.rentPeriod
                );
        }
        
        emit FilmsRegistered(registeredFilmIds);
    }

    /// @notice Register a film
    function _registerFilm(
        address[] calldata _studioActors, 
        uint256[] calldata _sharePercents, 
        uint256 _rentPrice,
        uint256 _rentPeriod
    ) private returns(uint256) {
        require(_studioActors.length != _sharePercents.length, "_registerFilm: Bad items length");

        filmIds.increment();
        uint256 filmID = filmIds.current();

        filmInfo[filmID] = Film({
            studioActors: _studioActors,
            sharePercents: _sharePercents,
            rentPrice: _rentPrice,
            startTime: 0,
            watchPercent: 0,
            customer: address(0),
            rentRules: RentRules({rentPeriod: _rentPeriod}),
            status: Status.LISTED
        });

        return filmID;
    }
    
    /// @notice Update multiple films with watched percents to a customer
    function updateFilms(
        uint256[] calldata _filmIds,
        uint256[] calldata _watchPercents,
        address _customer
    ) external onlyAdmin nonReentrant {
        require(_customer != address(0), "updateFilms: Zero customer address");
        require(_filmIds.length == _watchPercents.length, "updateFilms: Invalid item length");

        for (uint256 i = 0; i < _filmIds.length; i++) {
            if(filmInfo[_filmIds[i]].status == Status.RENTED) {

                filmInfo[_filmIds[i]].watchPercent = _watchPercents[i];   

                if(_isExpired(_filmIds[i]) || _watchPercents[i] == 10000) {
                    filmInfo[_filmIds[i]].status = Status.EXPIRED;                

                    uint256 payout = _getPayoutFor(_filmIds[i], _watchPercents[i]);
                    userInfo[_customer].amount -= payout; 

                    for(uint256 k = 0; k < filmInfo[_filmIds[i]].studioActors.length; k++) {
                        userInfo[filmInfo[_filmIds[i]].studioActors[k]].amount += _getShareAmount(payout, _filmIds[i], k);

                        // ToDo transfer revenue to actors when they ask
                    }
                }                  
            }
        }   

        emit FilmsUpdated(_filmIds, _watchPercents);
    }

    /// @notice Rent multiple films to a customer
    function rentFilms(
        uint256[] calldata _filmIds,
        address _customer
    ) external onlyAdmin nonReentrant {
        require(_customer != address(0), "rentFilms: Zero customer address");
        require(_filmIds.length > 0, "rentFilms: Invalid film Ids");

        for (uint256 i = 0; i < _filmIds.length; i++) {
            if((filmInfo[_filmIds[i]].status == Status.LISTED || filmInfo[_filmIds[i]].status == Status.EXPIRED) && 
            userInfo[_customer].amount >= filmInfo[_filmIds[i]].rentPrice) {

                customerFilmIds[_customer].push(
                    _rentFilm(_filmIds[i], _customer)
                );
            }
        }   

        emit FilmsRented(customerFilmIds[_customer], _customer);
    }

    /// @notice Rent a film to a customer
    function _rentFilm(
        uint256 _filmId,
        address _customer
    ) private returns(uint256) {
        require(_filmId > 0, "_rentFilm: Invalid film Id");

        filmInfo[_filmId].status = Status.RENTED;
        filmInfo[_filmId].customer = _customer;
        filmInfo[_filmId].startTime = block.timestamp;        

        return _filmId;
    }

    /// @notice Deposit VAB token for customer from Admin
    function customerDeopsit(uint256 _amount) external nonReentrant returns(uint256) {
        require(msg.sender != address(0), "Invalid customer address");
        require(_amount > 0, "Invalid deposit amount");
        require(PAYOUT_TOKEN.balanceOf(msg.sender) > _amount, "Insufficient amount");

        PAYOUT_TOKEN.transferFrom(msg.sender, address(this), _amount);

        userInfo[msg.sender].amount += _amount;

        emit CustomerDeopsited(_amount, address(PAYOUT_TOKEN), msg.sender);

        return _amount;
    }

    /// @notice Withdraw VAB token by customer
    function customerWithdraw(uint256 _amount, address _customer) external onlyAdmin nonReentrant {
        require(_customer != address(0), "customerWithdraw: Invalid customer address");
        require(_amount > 0 && _amount <= userInfo[_customer].amount, "customerWithdraw: Insufficient amount");

        PAYOUT_TOKEN.transfer(msg.sender, _amount);
        userInfo[msg.sender].amount -= _amount;

        emit CustomerWithdrawed(_amount, address(PAYOUT_TOKEN), msg.sender);
    }

    /// @notice Get user(customer, actors...) balance of DAO contract
    function getUserAmount(address _user) external view returns (uint256) {
        return userInfo[_user].amount;
    }

    /// @notice Get user balance of DAO contract
    function getFilmCountRented(address _customer) external view returns (uint256) {
        return customerFilmIds[_customer].length;
    }

    /// @notice Get film item based on Id
    function getFilmItem(uint256 _filmId) external view 
    returns (
        address[] memory studioActors_, 
        uint256[] memory sharePercents_, 
        uint256 rentPrice_,
        uint256 startTime_,
        address customer_,
        Status status_
    ) {
        studioActors_ = filmInfo[_filmId].studioActors;
        sharePercents_ = filmInfo[_filmId].sharePercents;
        rentPrice_ = filmInfo[_filmId].rentPrice;
        startTime_ = filmInfo[_filmId].startTime;
        customer_ = filmInfo[_filmId].customer;
        status_ = filmInfo[_filmId].status;
    }

    /// @notice Get the Ids registered for films
    function getRegisteredFilmIds() external view returns (uint256[] memory) {
        return registeredFilmIds;
    }

    /// @notice Get payout amount based on watched percent for a film
    function _getPayoutFor(uint256 _filmId, uint256 _watchPercent) private returns(uint256) {
        return filmInfo[_filmId].rentPrice * _watchPercent / 10000;
    }

    function _getShareAmount(uint256 _payout, uint256 _filmId, uint256 _k) private returns(uint256) {
        return _payout * filmInfo[_filmId].sharePercents[_k] / 10000;
    }

    /// @notice Check if expired or not based on 72 hours
    function _isExpired(uint256 _filmId) private returns(bool) {
        return block.timestamp - filmInfo[_filmId].startTime >= EXPIRE_PERIOD;
    }    
}
