// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VabbleKeyzAuction is ReentrancyGuard, Pausable, Ownable {
    // --------------------
    // Data Structures
    // --------------------

    enum SaleType {
        Auction,
        InstantBuy
    }

    struct Sale {
        address payable roomOwner;
        uint256 roomId;
        SaleType saleType;
        uint256 startTime;
        uint256 endTime;
        uint256 keysForSale;
        uint256 price; // For instant buy or starting price for auction
        uint256 highestBid;
        address payable highestBidder;
        uint256 minBidIncrement;
        uint256 ipOwnerShare; // Percentage for IP Owner (min 3%)
        bool settled;
        bool fundsClaimed;
    }

    // --------------------
    // State Variables
    // --------------------

    uint256 public saleCounter;
    mapping(uint256 => Sale) public sales;

    // Addresses for revenue splits
    address payable public vabbleAddress;
    address payable public daoAddress;
    address payable public ipOwnerAddress;

    // Variables for revenue percentages
    uint256 public vabbleShare; // e.g., 15 represents 1.5%
    uint256 public daoShare; // e.g., 10 represents 1%
    uint256 public minIpOwnerShare; // e.g., 30 represents 3%
    uint256 public percentagePrecision; // Represents 100%, e.g., 1000

    // Variables for configurable parameters
    uint256 public maxDurationInMinutes;
    uint256 public minBidIncrementAllowed;
    uint256 public maxBidIncrementAllowed;

    // --------------------
    // Events
    // --------------------

    event SaleCreated(
        uint256 saleId,
        uint256 roomId,
        address roomOwner,
        SaleType saleType,
        uint256 startTime,
        uint256 endTime,
        uint256 keysForSale,
        uint256 price,
        uint256 minBidIncrement,
        uint256 ipOwnerShare
    );

    event BidPlaced(uint256 saleId, address bidder, uint256 amount);
    event InstantBuy(uint256 saleId, address buyer, uint256 amount);
    event SaleSettled(uint256 saleId, address winner, uint256 amount);
    event RefundClaimed(uint256 saleId, address claimant, uint256 amount);

    event VabbleShareUpdated(uint256 newShare);
    event DaoShareUpdated(uint256 newShare);
    event MinIpOwnerShareUpdated(uint256 newShare);
    event PercentagePrecisionUpdated(uint256 newPrecision);
    event VabbleAddressUpdated(address newAddress);
    event DaoAddressUpdated(address newAddress);
    event IpOwnerAddressUpdated(address newAddress);

    event MaxDurationInMinutesUpdated(uint256 newMaxDuration);
    event MinBidIncrementAllowedUpdated(uint256 newMinBidIncrement);
    event MaxBidIncrementAllowedUpdated(uint256 newMaxBidIncrement);

    // --------------------
    // Modifiers
    // --------------------

    modifier onlyRoomOwner(uint256 saleId) {
        require(msg.sender == sales[saleId].roomOwner, "Not room owner");
        _;
    }

    modifier saleExists(uint256 saleId) {
        require(sales[saleId].roomOwner != address(0), "Sale does not exist");
        _;
    }

    modifier saleActive(uint256 saleId) {
        require(block.timestamp >= sales[saleId].startTime, "Sale not started");
        require(block.timestamp <= sales[saleId].endTime, "Sale ended");
        _;
    }

    // --------------------
    // Constructor
    // --------------------

    constructor(address payable _vabbleAddress, address payable _daoAddress, address payable _ipOwnerAddress) {
        vabbleAddress = _vabbleAddress;
        daoAddress = _daoAddress;
        ipOwnerAddress = _ipOwnerAddress;

        // Initialize default shares and precision
        vabbleShare = 15; // 1.5%
        daoShare = 10; // 1%
        minIpOwnerShare = 30; // 3%
        percentagePrecision = 1000; // 100%

        // Initialize configurable parameters
        maxDurationInMinutes = 2880; // 48 hours * 60 minutes
        minBidIncrementAllowed = 1; // 0.01%
        maxBidIncrementAllowed = 50000; // 5000%
    }

    // --------------------
    // Functions
    // --------------------

    function createSale(
        uint256 _roomId,
        SaleType _saleType,
        uint256 _durationInMinutes,
        uint256 _keysForSale,
        uint256 _price,
        uint256 _minBidIncrement,
        uint256 _ipOwnerShare // Must be >= minIpOwnerShare
    ) external whenNotPaused {
        require(_durationInMinutes <= maxDurationInMinutes, "Duration exceeds max limit");
        require(_ipOwnerShare >= minIpOwnerShare, "IP Owner share too low");

        if (_saleType == SaleType.Auction) {
            require(
                _minBidIncrement >= minBidIncrementAllowed && _minBidIncrement <= maxBidIncrementAllowed,
                "Invalid bid increment"
            );
        }

        saleCounter++;
        uint256 saleId = saleCounter;

        uint256 durationInSeconds = _durationInMinutes * 1 minutes;

        sales[saleId] = Sale({
            roomOwner: payable(msg.sender),
            roomId: _roomId,
            saleType: _saleType,
            startTime: block.timestamp,
            endTime: block.timestamp + durationInSeconds,
            keysForSale: _keysForSale,
            price: _price,
            highestBid: 0,
            highestBidder: payable(address(0)),
            minBidIncrement: _minBidIncrement,
            ipOwnerShare: _ipOwnerShare,
            settled: false,
            fundsClaimed: false
        });

        emit SaleCreated(
            saleId,
            _roomId,
            msg.sender,
            _saleType,
            block.timestamp,
            block.timestamp + durationInSeconds,
            _keysForSale,
            _price,
            _minBidIncrement,
            _ipOwnerShare
        );
    }

    function placeBid(uint256 saleId) external payable saleExists(saleId) saleActive(saleId) whenNotPaused nonReentrant {
        Sale storage sale = sales[saleId];
        require(sale.saleType == SaleType.Auction, "Not an auction");
        uint256 minBid;

        if (sale.highestBid == 0) {
            minBid = sale.price;
        } else {
            minBid = sale.highestBid + ((sale.highestBid * sale.minBidIncrement) / percentagePrecision);
        }

        require(msg.value >= minBid, "Bid too low");

        address payable previousHighestBidder = sale.highestBidder;
        uint256 previousHighestBid = sale.highestBid;

        // Update state before external call
        sale.highestBid = msg.value;
        sale.highestBidder = payable(msg.sender);

        // Refund previous highest bidder
        if (previousHighestBidder != address(0)) {
            (bool success, ) = previousHighestBidder.call{value: previousHighestBid}("");
            require(success, "Refund failed");
        }

        emit BidPlaced(saleId, msg.sender, msg.value);
    }

    function buyNow(uint256 saleId) external payable saleExists(saleId) saleActive(saleId) whenNotPaused nonReentrant {
        Sale storage sale = sales[saleId];
        require(sale.saleType == SaleType.InstantBuy, "Not an instant buy sale");
        require(msg.value >= sale.price, "Insufficient payment");
        require(!sale.settled, "Sale already settled");

        sale.highestBid = msg.value;
        sale.highestBidder = payable(msg.sender);
        sale.settled = true;

        emit InstantBuy(saleId, msg.sender, msg.value);
    }

    function settleSale(uint256 saleId) external saleExists(saleId) whenNotPaused nonReentrant {
        Sale storage sale = sales[saleId];
        require(block.timestamp > sale.endTime || sale.settled, "Sale not ended or already settled");
        require(!sale.fundsClaimed, "Funds already claimed");
        require(sale.highestBid > 0, "No funds to distribute");

        uint256 totalAmount = sale.highestBid;

        // Revenue splits
        uint256 vabbleAmount = (totalAmount * vabbleShare) / percentagePrecision;
        uint256 daoAmount = (totalAmount * daoShare) / percentagePrecision;
        uint256 ipOwnerAmount = (totalAmount * sale.ipOwnerShare) / percentagePrecision;
        uint256 roomOwnerAmount = totalAmount - vabbleAmount - daoAmount - ipOwnerAmount;

        sale.fundsClaimed = true;

        // Transfer funds
        _safeTransfer(vabbleAddress, vabbleAmount, "Vabble transfer failed");
        _safeTransfer(daoAddress, daoAmount, "DAO transfer failed");
        _safeTransfer(ipOwnerAddress, ipOwnerAmount, "IP Owner transfer failed");
        _safeTransfer(sale.roomOwner, roomOwnerAmount, "Room Owner transfer failed");

        emit SaleSettled(saleId, sale.highestBidder, sale.highestBid);
    }

    function claimRefund(uint256 saleId) external saleExists(saleId) whenNotPaused nonReentrant {
        Sale storage sale = sales[saleId];
        require(block.timestamp > sale.endTime, "Sale not ended");
        require(!sale.fundsClaimed, "Funds already claimed");

        // Refund to highest bidder if auction failed
        if (sale.highestBidder != address(0)) {
            uint256 refundAmount = sale.highestBid;
            sale.highestBid = 0;
            address payable bidder = sale.highestBidder;
            sale.highestBidder = payable(address(0));

            (bool refundSuccess, ) = bidder.call{value: refundAmount}("");
            require(refundSuccess, "Refund failed");

            emit RefundClaimed(saleId, bidder, refundAmount);
        }

        sale.fundsClaimed = true;
        // Remove `sale.settled = true` here so it is only set when actually finalizing a successful sale.
    }

    // --------------------
    // Administrative Functions
    // --------------------

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Setter functions for changeable state variables

    function setVabbleShare(uint256 _vabbleShare) external onlyOwner {
        vabbleShare = _vabbleShare;
        emit VabbleShareUpdated(_vabbleShare);
    }

    function setDaoShare(uint256 _daoShare) external onlyOwner {
        daoShare = _daoShare;
        emit DaoShareUpdated(_daoShare);
    }

    function setMinIpOwnerShare(uint256 _minIpOwnerShare) external onlyOwner {
        minIpOwnerShare = _minIpOwnerShare;
        emit MinIpOwnerShareUpdated(_minIpOwnerShare);
    }

    function setPercentagePrecision(uint256 _percentagePrecision) external onlyOwner {
        percentagePrecision = _percentagePrecision;
        emit PercentagePrecisionUpdated(_percentagePrecision);
    }

    function setVabbleAddress(address payable _vabbleAddress) external onlyOwner {
        require(_vabbleAddress != address(0), "Invalid address");
        vabbleAddress = _vabbleAddress;
        emit VabbleAddressUpdated(_vabbleAddress);
    }

    function setDaoAddress(address payable _daoAddress) external onlyOwner {
        require(_daoAddress != address(0), "Invalid address");
        daoAddress = _daoAddress;
        emit DaoAddressUpdated(_daoAddress);
    }

    function setIpOwnerAddress(address payable _ipOwnerAddress) external onlyOwner {
        require(_ipOwnerAddress != address(0), "Invalid address");
        ipOwnerAddress = _ipOwnerAddress;
        emit IpOwnerAddressUpdated(_ipOwnerAddress);
    }

    function setMaxDurationInMinutes(uint256 _maxDurationInMinutes) external onlyOwner {
        require(_maxDurationInMinutes > 0, "Duration must be greater than 0");
        maxDurationInMinutes = _maxDurationInMinutes;
        emit MaxDurationInMinutesUpdated(_maxDurationInMinutes);
    }

    function setMinBidIncrementAllowed(uint256 _minBidIncrementAllowed) external onlyOwner {
        minBidIncrementAllowed = _minBidIncrementAllowed;
        emit MinBidIncrementAllowedUpdated(_minBidIncrementAllowed);
    }

    function setMaxBidIncrementAllowed(uint256 _maxBidIncrementAllowed) external onlyOwner {
        maxBidIncrementAllowed = _maxBidIncrementAllowed;
        emit MaxBidIncrementAllowedUpdated(_maxBidIncrementAllowed);
    }

    // --------------------
    // Internal Functions
    // --------------------

    function _safeTransfer(address payable recipient, uint256 amount, string memory errorMessage) internal {
        (bool success, ) = recipient.call{value: amount}("");
        require(success, errorMessage);
    }

    // --------------------
    // Fallback Function
    // --------------------

    receive() external payable {}
}
