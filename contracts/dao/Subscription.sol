// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/Helper.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IProperty.sol";
import "../interfaces/IOwnablee.sol";

contract Subscription is ReentrancyGuard {
    event SubscriptionActivated(address indexed customer, address token, uint256 period);
    event AssetWithdrawn(address indexed token, address indexed recipient, uint256 amount);

    address private immutable OWNABLE; // Ownablee contract address
    address private immutable UNI_HELPER; // UniHelper contract
    address private immutable DAO_PROPERTY; // Property contract

    address private immutable USDC_TOKEN;
    address private immutable VAB_TOKEN;
    address private immutable VAB_WALLET;

    uint256 private constant PERIOD_UNIT = 30 days; // 30 days
    uint256 constant PERCENT_SCALING_FACTOR = 1e8;
    uint256 private constant PRECISION_FACTOR = 1e10;
    uint256 private constant PERCENT60 = 60 * PERCENT_SCALING_FACTOR;
    uint256 private constant PERCENT40 = 40 * PERCENT_SCALING_FACTOR;

    uint256[] private discountList;

    struct UserSubscription {
        uint256 activeTime; // active time
        uint256 period; // period of subscription(ex: 1 => 1 month, 3 => 3 month)
        uint256 expireTime; // expire time
    }

    mapping(address => UserSubscription) public subscriptionInfo; // (user => UserSubscription)

    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "caller is not the auditor");
        _;
    }

    modifier onlyVabWallet() {
        require(msg.sender == VAB_WALLET, "Unauthorized Access");
        _;
    }

    receive() external payable { }

    constructor(address _ownable, address _uniHelper, address _property, uint256[] memory _discountPercents) {
        require(_ownable != address(0), "ownableContract: zero address");
        require(_uniHelper != address(0), "uniHelperContract: zero address");
        require(_property != address(0), "daoProperty: zero address");
        require(_discountPercents.length == 3, "discountList: bad length");

        OWNABLE = _ownable;
        UNI_HELPER = _uniHelper;
        DAO_PROPERTY = _property;
        discountList = _discountPercents;

        USDC_TOKEN = IOwnablee(_ownable).USDC_TOKEN();
        VAB_TOKEN = IOwnablee(_ownable).PAYOUT_TOKEN();
        VAB_WALLET = IOwnablee(_ownable).VAB_WALLET();
    }

    function withdrawAsset(address token) external nonReentrant onlyVabWallet {
        uint256 amount;

        // Handle ETH withdrawal
        if (token == address(0)) {
            amount = address(this).balance;
            require(amount > 0, "Insufficient ETH balance");
            Helper.safeTransferETH(VAB_WALLET, amount);
        }
        // Handle token withdrawal
        else {
            amount = IERC20(token).balanceOf(address(this));
            require(amount > 0, "Insufficient token balance");
            Helper.safeTransfer(token, VAB_WALLET, amount);
        }

        emit AssetWithdrawn(token, VAB_WALLET, amount);
    }

    function withdrawAllAssets() external nonReentrant onlyVabWallet {
        uint256 totalEthBalance = address(this).balance;
        uint256 totalUsdcBalance = IERC20(USDC_TOKEN).balanceOf(address(this));
        uint256 totalVabBalance = IERC20(VAB_TOKEN).balanceOf(address(this));

        require(totalEthBalance > 0 || totalUsdcBalance > 0 || totalVabBalance > 0, "Nothing to withdraw");

        if (totalEthBalance > 0) {
            Helper.safeTransferETH(VAB_WALLET, totalEthBalance);
            emit AssetWithdrawn(address(0), VAB_WALLET, totalEthBalance);
        }

        if (totalUsdcBalance > 0) {
            Helper.safeTransfer(USDC_TOKEN, VAB_WALLET, totalUsdcBalance);
            emit AssetWithdrawn(USDC_TOKEN, VAB_WALLET, totalUsdcBalance);
        }

        if (totalVabBalance > 0) {
            Helper.safeTransfer(VAB_TOKEN, VAB_WALLET, totalVabBalance);
            emit AssetWithdrawn(VAB_TOKEN, VAB_WALLET, totalVabBalance);
        }
    }

    function swapAssetAndSendToVabWallet(address token) external nonReentrant {
        uint256 amount;

        if (token == address(0)) {
            amount = address(this).balance;
            Helper.safeTransferETH(UNI_HELPER, amount);
        } else {
            amount = IERC20(token).balanceOf(address(this));
            if (IERC20(token).allowance(address(this), UNI_HELPER) < amount) {
                Helper.safeApprove(token, UNI_HELPER, amount);
            }
        }

        require(amount > 0, "Insufficient balance");

        if (token != USDC_TOKEN) {
            amount = IUniHelper(UNI_HELPER).swapAsset(abi.encode(amount, token, USDC_TOKEN));
        }

        uint256 totalUsdcBalance = IERC20(USDC_TOKEN).balanceOf(address(this));

        Helper.safeTransfer(USDC_TOKEN, VAB_WALLET, totalUsdcBalance);

        emit AssetWithdrawn(USDC_TOKEN, VAB_WALLET, totalUsdcBalance);
    }

    function activeSubscription(address _token, uint256 _period) external payable nonReentrant {
        uint256 expectedAmount = _validateAndGetAmount(_token, _period);

        _handlePayment(_token, expectedAmount);

        if (_token != VAB_TOKEN) {
            _handleSwapsAndTransfers(_token, expectedAmount);
        }

        _updateSubscription(_period);

        emit SubscriptionActivated(msg.sender, _token, _period);
    }

    function _validateAndGetAmount(address _token, uint256 _period) private view returns (uint256) {
        if (_token != VAB_TOKEN && _token != address(0)) {
            require(IOwnablee(OWNABLE).isDepositAsset(_token), "activeSubscription: not allowed asset");
        }
        return getExpectedSubscriptionAmount(_token, _period);
    }

    function _handlePayment(address _token, uint256 expectedAmount) private {
        if (_token == address(0)) {
            require(msg.value >= expectedAmount, "activeSubscription: Insufficient paid");
            if (msg.value > expectedAmount) {
                Helper.safeTransferETH(msg.sender, msg.value - expectedAmount);
            }
        } else {
            Helper.safeTransferFrom(_token, msg.sender, address(this), expectedAmount);
        }
    }

    function _handleSwapsAndTransfers(address _token, uint256 expectedAmount) private {
        uint256 amount60 = expectedAmount * PERCENT60 / PRECISION_FACTOR;

        if (_token == address(0)) {
            Helper.safeTransferETH(UNI_HELPER, amount60);
        } else {
            if (IERC20(_token).allowance(address(this), UNI_HELPER) < expectedAmount) {
                Helper.safeApprove(_token, UNI_HELPER, expectedAmount);
            }
        }

        // Swap 60 % ETH / USDC => VAB and send it to the user
        uint256 vabAmount = IUniHelper(UNI_HELPER).swapAsset(abi.encode(amount60, _token, VAB_TOKEN));
        // TODO: This should go to the streaming balance of the user
        Helper.safeTransfer(VAB_TOKEN, VAB_WALLET, vabAmount);

        if (_token == USDC_TOKEN) {
            // @follow-up : should we send the total usdc balance of the contract ?
            uint256 usdcAmount = expectedAmount - amount60;
            Helper.safeTransfer(USDC_TOKEN, VAB_WALLET, usdcAmount);
        }
    }

    function _updateSubscription(uint256 _period) private {
        UserSubscription storage subscription = subscriptionInfo[msg.sender];
        uint256 currentTime = block.timestamp;

        if (subscription.expireTime > currentTime) {
            subscription.period += _period;
            subscription.expireTime = subscription.activeTime + PERIOD_UNIT * subscription.period;
        } else {
            // first time a user bought a subscription
            subscription.activeTime = currentTime;
            subscription.period = _period;
            subscription.expireTime = currentTime + PERIOD_UNIT * _period;
        }
    }

    /// @notice Expected token amount that user should pay for activing the subscription
    function getExpectedSubscriptionAmount(
        address _token,
        uint256 _period
    )
        public
        view
        returns (uint256 expectedAmount_)
    {
        require(_period != 0, "getExpectedSubscriptionAmount: Zero period");

        uint256 scriptAmount = _period * IProperty(DAO_PROPERTY).subscriptionAmount();

        uint256 discount;
        if (_period >= 12) {
            discount = discountList[2];
        } else if (_period >= 6) {
            discount = discountList[1];
        } else if (_period >= 3) {
            discount = discountList[0];
        }

        if (discount > 0) {
            scriptAmount = scriptAmount * (100 - discount) * PERCENT_SCALING_FACTOR / PRECISION_FACTOR;
        }

        if (_token == VAB_TOKEN) {
            expectedAmount_ =
                IUniHelper(UNI_HELPER).expectedAmount((scriptAmount * PERCENT40) / PRECISION_FACTOR, USDC_TOKEN, _token);
        } else if (_token == USDC_TOKEN) {
            expectedAmount_ = scriptAmount;
        } else {
            expectedAmount_ = IUniHelper(UNI_HELPER).expectedAmount(scriptAmount, USDC_TOKEN, _token);
        }
    }

    /// @notice Check if subscription period
    function isActivedSubscription(address _customer) external view returns (bool active_) {
        if (subscriptionInfo[_customer].expireTime > block.timestamp) active_ = true;
        else active_ = false;
    }

    /// @notice Add discount percents(3 months, 6 months, 12 months) from Auditor
    function addDiscountPercent(uint256[] calldata _discountPercents) external onlyAuditor {
        require(_discountPercents.length == 3, "discountList: bad length");
        discountList = _discountPercents;
    }

    /// @notice get discount percent list
    function getDiscountPercentList() external view returns (uint256[] memory list_) {
        list_ = discountList;
    }
}
