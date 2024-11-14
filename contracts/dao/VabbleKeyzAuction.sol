// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../libraries/Helper.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IStakingPool.sol";

contract VabbleKeyzAuction is ReentrancyGuard, Pausable, Ownable {
    // --------------------
    // Data Structures
    // --------------------

    enum SaleType {
        Auction,
        InstantBuy
    }

    struct KeyBid {
        uint256 amount;
        address payable bidder;
        bool claimed;
    }

    struct Sale {
        address payable roomOwner;
        uint256 roomId;
        SaleType saleType;
        uint256 startTime;
        uint256 endTime;
        uint256 totalKeys;
        uint256 price;
        mapping(uint256 => KeyBid) keyBids;
        uint256 minBidIncrement;
        uint256 ipOwnerShare;
        address payable ipOwnerAddress;
        bool settled;
    }

    // --------------------
    // State Variables
    // --------------------

    uint256 public saleCounter;
    mapping(uint256 => Sale) public sales;

    // Mapping to track pending returns after bid
    mapping(address => uint256) public pendingReturns;

    // Mapping to track available keys in each sale
    mapping(uint256 => mapping(uint256 => bool)) public isKeyAvailable;

    address public vabTokenAddress; // VAB token address for swaps

    // Addresses for revenue splits
    address payable public vabbleAddress;
    address payable public daoAddress;

    // Variables for revenue percentages
    uint256 public vabbleShare; // e.g., 150 represents 1.5%
    uint256 public daoShare; // e.g., 100 represents 1%
    uint256 public minIpOwnerShare; // e.g., 300 represents 3%
    uint256 public percentagePrecision; // Represents 100%, e.g., 10000

    // Variables for configurable parameters
    uint256 public maxDurationInMinutes;
    uint256 public minBidIncrementAllowed;
    uint256 public maxBidIncrementAllowed;

    uint256 public maxRoomKeys;

    address public immutable STAKING_POOL; // StakingPool contract address
    address public immutable UNI_HELPER; // UniHelper contract address
    address public immutable UNISWAP_ROUTER; // UniswapV2Router contract address

    // --------------------
    // Events
    // --------------------

    event SaleCreated(
        uint256 indexed saleId,
        uint256 indexed roomId,
        address indexed roomOwner,
        SaleType saleType,
        uint256 startTime,
        uint256 endTime,
        uint256 totalKeys,
        uint256 price,
        uint256 minBidIncrement,
        uint256 ipOwnerShare
    );

    event BidPlaced(uint256 indexed saleId, uint256 indexed keyId, address indexed bidder, uint256 amount);
    event InstantBuy(uint256 indexed saleId, uint256 indexed keyId, address indexed buyer, uint256 amount);
    event SaleSettled(uint256 indexed saleId, uint256 totalAmount);
    event KeyClaimed(uint256 indexed saleId, uint256 indexed keyId, address indexed winner);
    event RefundClaimed(uint256 indexed saleId, uint256 indexed keyId, address indexed claimant, uint256 amount);

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

    event MaxRoomKeysUpdated(uint256 newMaxRoomKeys);

    // --------------------
    // Modifiers
    // --------------------

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

    constructor(
        address payable _vabbleAddress, // Address to receive fee
        address _vabTokenAddress, // VAB token address
        address payable _daoAddress,
        address _uniHelper,
        address _staking,
        address _uniswapRouter
    ) {
        vabbleAddress = _vabbleAddress;
        vabTokenAddress = _vabTokenAddress;
        daoAddress = _daoAddress;

        // Initialize default shares and precision
        vabbleShare = 150; // 1.5%
        daoShare = 100; // 1%
        minIpOwnerShare = 300; // 3%
        percentagePrecision = 10000; // 100%

        // Initialize configurable parameters
        maxDurationInMinutes = 2880; // 48 hours * 60 minutes
        minBidIncrementAllowed = 1; // 0.01%
        maxBidIncrementAllowed = 500000; // 5000%

        maxRoomKeys = 5;

        UNI_HELPER = _uniHelper;
        STAKING_POOL = _staking;
        UNISWAP_ROUTER = _uniswapRouter;
    }

    // --------------------
    // Functions
    // --------------------

    function createSale(
        uint256 _roomId,
        SaleType _saleType,
        uint256 _durationInMinutes,
        uint256 _totalKeys,
        uint256 _price,
        uint256 _minBidIncrement,
        uint256 _ipOwnerShare,
        address payable _ipOwnerAddress
    ) external whenNotPaused {
        require(_durationInMinutes <= maxDurationInMinutes, "Duration exceeds max limit");
        require(_ipOwnerShare >= minIpOwnerShare, "IP Owner share too low");
        require(_totalKeys > 0, "Must sell at least one key");
        require(_totalKeys <= maxRoomKeys, "Total keys exceed max limit");
        require(_ipOwnerAddress != address(0), "Invalid IP owner address");

        if (_saleType == SaleType.Auction) {
            require(
                _minBidIncrement >= minBidIncrementAllowed && _minBidIncrement <= maxBidIncrementAllowed,
                "Invalid bid increment"
            );
        }

        saleCounter++;
        uint256 saleId = saleCounter;
        uint256 durationInSeconds = _durationInMinutes * 1 seconds;

        Sale storage newSale = sales[saleId];
        newSale.roomOwner = payable(msg.sender);
        newSale.roomId = _roomId;
        newSale.saleType = _saleType;
        newSale.startTime = block.timestamp;
        newSale.endTime = block.timestamp + durationInSeconds;
        newSale.totalKeys = _totalKeys;
        newSale.price = _price;
        newSale.minBidIncrement = _minBidIncrement;
        newSale.ipOwnerShare = _ipOwnerShare;
        newSale.ipOwnerAddress = _ipOwnerAddress;
        newSale.settled = false;

        // Mark all keys as available
        for (uint256 i = 0; i < _totalKeys; i++) {
            isKeyAvailable[saleId][i] = true;
        }

        emit SaleCreated(
            saleId,
            _roomId,
            msg.sender,
            _saleType,
            block.timestamp,
            block.timestamp + durationInSeconds,
            _totalKeys,
            _price,
            _minBidIncrement,
            _ipOwnerShare
        );
    }

    function placeBid(uint256 saleId, uint256 keyId)
        external
        payable
        saleExists(saleId)
        saleActive(saleId)
        whenNotPaused
        nonReentrant
    {
        Sale storage sale = sales[saleId];
        require(sale.saleType == SaleType.Auction, "Not an auction");
        require(keyId < sale.totalKeys, "Invalid key ID");
        require(isKeyAvailable[saleId][keyId], "Key not available");

        KeyBid storage currentBid = sale.keyBids[keyId];
        uint256 minBid;

        if (currentBid.amount == 0) {
            minBid = sale.price;
        } else {
            minBid = currentBid.amount + ((currentBid.amount * sale.minBidIncrement) / percentagePrecision);
        }

        require(msg.value >= minBid, "Bid too low");

        // Refund previous bidder if exists
        if (currentBid.bidder != address(0)) {
            uint256 refundAmount = currentBid.amount;
            address payable previousBidder = currentBid.bidder;

            pendingReturns[previousBidder] += refundAmount;

            // Update state 
            currentBid.amount = msg.value;
            currentBid.bidder = payable(msg.sender);

        } else {
            currentBid.amount = msg.value;
            currentBid.bidder = payable(msg.sender);
        }

        emit BidPlaced(saleId, keyId, msg.sender, msg.value);
    }

    function buyNow(uint256 saleId, uint256 keyId)
        external
        payable
        saleExists(saleId)
        saleActive(saleId)
        whenNotPaused
        nonReentrant
    {
        Sale storage sale = sales[saleId];
        require(sale.saleType == SaleType.InstantBuy, "Not an instant buy sale");
        require(keyId < sale.totalKeys, "Invalid key ID");
        require(isKeyAvailable[saleId][keyId], "Key not available");
        require(msg.value >= sale.price, "Insufficient payment");

        KeyBid storage keyBid = sale.keyBids[keyId];
        keyBid.amount = msg.value;
        keyBid.bidder = payable(msg.sender);
        isKeyAvailable[saleId][keyId] = false;

        emit InstantBuy(saleId, keyId, msg.sender, msg.value);
    }

    function settleSale(uint256 saleId) external saleExists(saleId) whenNotPaused nonReentrant {
        Sale storage sale = sales[saleId];
        require(block.timestamp > sale.endTime, "Sale not ended");
        require(!sale.settled, "Sale already settled");
        require(vabbleShare + daoShare + sale.ipOwnerShare <= percentagePrecision, "Total shares exceed 100%");

        uint256 totalAmount = 0;

        for (uint256 i = 0; i < sale.totalKeys; i++) {
            KeyBid storage keyBid = sale.keyBids[i];
            if (keyBid.bidder != address(0)) {
                totalAmount += keyBid.amount;
                isKeyAvailable[saleId][i] = false;
            }
        }

        require(totalAmount > 0, "No funds to distribute");

        uint256 vabbleAmount = (totalAmount * vabbleShare) / percentagePrecision;
        uint256 daoAmount = (totalAmount * daoShare) / percentagePrecision;
        uint256 ipOwnerAmount = (totalAmount * sale.ipOwnerShare) / percentagePrecision;
        uint256 roomOwnerAmount = totalAmount - vabbleAmount - daoAmount - ipOwnerAmount;

        sale.settled = true;

        _safeTransfer(vabbleAddress, vabbleAmount, "Vabble transfer failed");
        __stakingPoolFee(daoAmount);
        _safeTransfer(sale.ipOwnerAddress, ipOwnerAmount, "IP Owner transfer failed"); // Use sale-specific ipOwnerAddress
        _safeTransfer(sale.roomOwner, roomOwnerAmount, "Room Owner transfer failed");

        emit SaleSettled(saleId, totalAmount);
    }

    function __stakingPoolFee(uint256 amountToPool) private {
        // Ensure the contract has enough ETH
        require(address(this).balance >= amountToPool, "stakingPoolFee: Insufficient contract balance");

        // Prepare the swap path: ETH -> VAB
        address[] memory path = new address[](2);
        path[0] = IUniswapV2Router02(UNISWAP_ROUTER).WETH();
        path[1] = vabTokenAddress;

        // Get expected amount of VAB tokens
        uint256[] memory amountsOut = IUniswapV2Router02(UNISWAP_ROUTER).getAmountsOut(amountToPool, path);
        uint256 expectedAmountOut = amountsOut[1];

        uint256 slippageTolerance = (expectedAmountOut * 995) / 1000; // 0.5% slippage

        // Swap ETH to VAB tokens
        uint256[] memory amountsReceived = IUniswapV2Router02(UNISWAP_ROUTER).swapExactETHForTokens{value: amountToPool}(
            slippageTolerance, path, address(this), block.timestamp + 5
        );

        uint256 vabAmount = amountsReceived[1];

        // Approve the staking pool to spend VAB tokens
        if (IERC20(vabTokenAddress).allowance(address(this), STAKING_POOL) < vabAmount) {
            Helper.safeApprove(vabTokenAddress, STAKING_POOL, vabAmount);
        }

        // Add the VAB tokens to the staking pool
        IStakingPool(STAKING_POOL).addRewardToPool(vabAmount);
    }

    function claimRefund(uint256 saleId, uint256 keyId) external saleExists(saleId) whenNotPaused nonReentrant {
        Sale storage sale = sales[saleId];
        require(block.timestamp > sale.endTime, "Sale not ended");
        require(!sale.settled, "Sale already settled");

        KeyBid storage keyBid = sale.keyBids[keyId];
        require(keyBid.bidder == msg.sender, "Not the bidder");
        require(!keyBid.claimed, "Already claimed");
        require(keyBid.amount > 0, "No funds to claim");

        uint256 refundAmount = keyBid.amount;
        keyBid.amount = 0;
        keyBid.claimed = true;

        (bool success,) = msg.sender.call{value: refundAmount}("");
        require(success, "Refund failed");

        emit RefundClaimed(saleId, keyId, msg.sender, refundAmount);
    }

    function withdrawPendingReturns() external nonReentrant {
        uint256 amount = pendingReturns[msg.sender];
        require(amount > 0, "No funds to withdraw");
        pendingReturns[msg.sender] = 0;
        (bool success, ) = msg.sender.call{ value: amount }(""); 
        require(success, "Withdrawal failed");
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

    // Getter functions for variables
    function getKeyBid(uint256 saleId, uint256 keyId)
        external
        view
        returns (uint256 amount, address bidder, bool claimed)
    {
        KeyBid storage bid = sales[saleId].keyBids[keyId];
        return (bid.amount, bid.bidder, bid.claimed);
    }

    function getVabTokenAddress() external view returns (address) {
        return vabTokenAddress;
    }

    // Setter functions for changeable state variables

    function setVabbleShare(uint256 _vabbleShare) external onlyOwner {
        vabbleShare = _vabbleShare;
        emit VabbleShareUpdated(_vabbleShare);
    }

    function setMaxRoomKeys(uint256 _maxRoomKeys) external onlyOwner {
        maxRoomKeys = _maxRoomKeys;
        emit MaxRoomKeysUpdated(_maxRoomKeys);
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
        (bool success,) = recipient.call{value: amount}("");
        require(success, errorMessage);
    }

    // --------------------
    // Fallback Function
    // --------------------

    receive() external payable {}
}
