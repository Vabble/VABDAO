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

    address private immutable OWNABLE; // Ownablee contract address
    address private immutable UNI_HELPER; // UniHelper contract
    address private immutable DAO_PROPERTY; // Property contract

    address private immutable USDC_TOKEN;
    address private immutable VAB_TOKEN;
    address private immutable VAB_WALLET;

    uint256 private constant PERIOD_UNIT = 30 days; // 30 days
    uint256 private constant PERCENT60 = 60 * 1e8;
    uint256 private constant PERCENT40 = 40 * 1e8;

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

    function activeSubscription(address _token, uint256 _period) external payable nonReentrant {
        // Validate token and get expected amount
        uint256 expectAmount = _validateAndGetAmount(_token, _period);

        // Handle payment
        _handlePayment(_token, expectAmount);

        // Handle token swaps and transfers
        _handleSwapsAndTransfers(_token, expectAmount);

        // Update subscription
        _updateSubscription(msg.sender, _period);

        emit SubscriptionActivated(msg.sender, _token, _period);
    }

    function _validateAndGetAmount(address _token, uint256 _period) private view returns (uint256) {
        if (_token != VAB_TOKEN && _token != address(0)) {
            require(IOwnablee(OWNABLE).isDepositAsset(_token), "activeSubscription: not allowed asset");
        }
        return getExpectedSubscriptionAmount(_token, _period);
    }

    function _handlePayment(address _token, uint256 expectAmount) private {
        if (_token == address(0)) {
            require(msg.value >= expectAmount, "activeSubscription: Insufficient paid");
            if (msg.value > expectAmount) {
                Helper.safeTransferETH(msg.sender, msg.value - expectAmount);
            }
        } else {
            Helper.safeTransferFrom(_token, msg.sender, address(this), expectAmount);
            if (IERC20(_token).allowance(address(this), UNI_HELPER) == 0) {
                Helper.safeApprove(_token, UNI_HELPER, expectAmount);
            }
        }
    }

    function _handleSwapsAndTransfers(address _token, uint256 expectAmount) private {
        uint256 usdcAmount;

        if (_token == VAB_TOKEN) {
            usdcAmount = IUniHelper(UNI_HELPER).swapAsset(abi.encode(expectAmount, _token, USDC_TOKEN));
            Helper.safeTransfer(USDC_TOKEN, VAB_WALLET, usdcAmount);
        } else {
            uint256 amount60 = expectAmount * PERCENT60 / 1e10;

            if (_token == address(0)) {
                Helper.safeTransferETH(UNI_HELPER, amount60);
            }

            uint256 vabAmount = IUniHelper(UNI_HELPER).swapAsset(abi.encode(amount60, _token, VAB_TOKEN));
            Helper.safeTransfer(VAB_TOKEN, VAB_WALLET, vabAmount);

            if (_token == USDC_TOKEN) {
                usdcAmount = expectAmount - amount60;
            } else {
                if (_token == address(0)) {
                    Helper.safeTransferETH(UNI_HELPER, expectAmount - amount60);
                }
                usdcAmount = IUniHelper(UNI_HELPER).swapAsset(abi.encode(expectAmount - amount60, _token, USDC_TOKEN));
            }
            Helper.safeTransfer(USDC_TOKEN, VAB_WALLET, usdcAmount);
        }
    }

    function _updateSubscription(address user, uint256 _period) private {
        UserSubscription storage subscription = subscriptionInfo[user];
        if (isActivedSubscription(user)) {
            subscription.period += _period;
            subscription.expireTime = subscription.activeTime + PERIOD_UNIT * subscription.period;
        } else {
            subscription.activeTime = block.timestamp;
            subscription.period = _period;
            subscription.expireTime = block.timestamp + PERIOD_UNIT * _period;
        }
    }

    /// @notice Expected token amount that user should pay for activing the subscription
    function getExpectedSubscriptionAmount(
        address _token,
        uint256 _period
    )
        public
        view
        returns (uint256 expectAmount_)
    {
        require(_period != 0, "getExpectedSubscriptionAmount: Zero period");

        uint256 scriptAmount = _period * IProperty(DAO_PROPERTY).subscriptionAmount();

        if (_period < 3) {
            scriptAmount = scriptAmount;
        } else if (_period >= 3 && _period < 6) {
            scriptAmount = scriptAmount * (100 - discountList[0]) * 1e8 / 1e10;
        } else if (_period >= 6 && _period < 12) {
            scriptAmount = scriptAmount * (100 - discountList[1]) * 1e8 / 1e10;
        } else {
            scriptAmount = scriptAmount * (100 - discountList[2]) * 1e8 / 1e10;
        }

        if (_token == VAB_TOKEN) {
            expectAmount_ = IUniHelper(UNI_HELPER).expectedAmount(scriptAmount * PERCENT40 / 1e10, USDC_TOKEN, _token);
        } else if (_token == USDC_TOKEN) {
            expectAmount_ = scriptAmount;
        } else {
            expectAmount_ = IUniHelper(UNI_HELPER).expectedAmount(scriptAmount, USDC_TOKEN, _token);
        }
    }

    /// @notice Check if subscription period
    function isActivedSubscription(address _customer) public view returns (bool active_) {
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
