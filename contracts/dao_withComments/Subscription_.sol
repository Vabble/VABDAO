// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/Helper.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IProperty.sol";
import "../interfaces/IOwnablee.sol";

/**
 * @title Subscription Contract
 * @dev This contract facilitates subscription management for renting films on the streaming portal,
 * allowing users to activate subscriptions using allowed payment tokens and managing subscription periods.
 * The Auditor can add discount percentage for different subscription periods.
 * We allow subscriptions for (1, 3, 6, 12 months).
 */
contract Subscription_ is ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                           TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Struct representing a user's subscription details.
     * @param activeTime Timestamp when the subscription was activated.
     * @param period Subscription period in months (e.g., 1 => 1 month, 3 => 3 months).
     * @param expireTime Timestamp when the subscription expires.
     */
    struct UserSubscription {
        uint256 activeTime;
        uint256 period;
        uint256 expireTime;
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    /// @dev Address of the Ownablee contract
    address private immutable OWNABLE;

    /// @dev Address of the UniHelper contract
    address private immutable UNI_HELPER;

    /// @dev Address of the Property contract
    address private immutable DAO_PROPERTY;

    /// @dev Fixed unit of a subscription period (30 days)
    uint256 private constant PERIOD_UNIT = 30 days;

    /// @dev Constant representing 40% in scaled units
    uint256 private constant PERCENT40 = 40 * 1e8;

    /// @dev Constant representing 60% in scaled units
    uint256 private constant PERCENT60 = 60 * 1e8;

    /// @dev Array holding discount percentages for different subscription durations
    uint256[] private discountList;

    /// @notice Mapping to store user subscription information
    mapping(address => UserSubscription) public subscriptionInfo;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Emitted when a subscription is successfully activated.
     * @param customer Address of the customer who activated the subscription.
     * @param token Address of the payment token used for subscription.
     * @param period Subscription period in months.
     */
    event SubscriptionActivated(address indexed customer, address token, uint256 period);

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /// @dev Restricts access to the current Auditor.
    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "caller is not the auditor");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Constructor to initialize Subscription contract.
     * @param _ownable Address of the Ownablee contract.
     * @param _uniHelper Address of the UniHelper contract.
     * @param _property Address of the Property contract.
     * @param _discountPercents Array of discount percentages for different subscription periods (3, 6, 12 months).
     */
    constructor(address _ownable, address _uniHelper, address _property, uint256[] memory _discountPercents) {
        require(_ownable != address(0), "ownableContract: zero address");
        OWNABLE = _ownable;
        require(_uniHelper != address(0), "uniHelperContract: zero address");
        UNI_HELPER = _uniHelper;
        require(_property != address(0), "daoProperty: zero address");
        DAO_PROPERTY = _property;
        require(_discountPercents.length == 3, "discountList: bad length");
        discountList = _discountPercents;
    }

    receive() external payable { }

    /*//////////////////////////////////////////////////////////////
                                EXTERNAL
    //////////////////////////////////////////////////////////////*/

    // ============= 0. Subscription by token and NFT. ===========
    /// @notice active subscription(pay $1 monthly as ETH/USDC/USDT/VAB...) for renting the films

    /**
     * @notice Activate a subscription using a specified token for a given period.
     * @dev Allows users to activate a subscription by paying using ETH or allowed ERC20 tokens.
     * @param _token Address of the payment token (ERC20) or address(0) for ETH.
     * @param _period Subscription period in months (e.g., 1, 3, 6, 12).
     */
    function activeSubscription(address _token, uint256 _period) external payable nonReentrant {
        // Check if token is allowed for deposits
        if (_token != IOwnablee(OWNABLE).PAYOUT_TOKEN() && _token != address(0)) {
            require(IOwnablee(OWNABLE).isDepositAsset(_token), "activeSubscription: not allowed asset");
        }

        uint256 expectAmount = getExpectedSubscriptionAmount(_token, _period);

        if (_token == address(0)) {
            require(msg.value >= expectAmount, "activeSubscription: Insufficient paid");
            if (msg.value > expectAmount) {
                Helper.safeTransferETH(msg.sender, msg.value - expectAmount);
            }
        } else {
            // Send ETH or ERC20 token to this address
            Helper.safeTransferFrom(_token, msg.sender, address(this), expectAmount);

            // Approve token to send from this contract to UNI_HELPER contract
            if (IERC20(_token).allowance(address(this), UNI_HELPER) == 0) {
                Helper.safeApprove(_token, UNI_HELPER, IERC20(_token).totalSupply());
            }
        }

        uint256 usdcAmount;
        address usdcToken = IOwnablee(OWNABLE).USDC_TOKEN();
        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();

        // if token is VAB, convert VAB to USDC and send it to the VAB Wallet
        if (_token == vabToken) {
            bytes memory swapArgs = abi.encode(expectAmount, _token, usdcToken);
            usdcAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs);
            Helper.safeTransfer(usdcToken, IOwnablee(OWNABLE).VAB_WALLET(), usdcAmount);
        }
        // if token != VAB, send VAB(convert token(60%) to VAB) and USDC(convert token(40%) to USDC) to wallet
        else {
            uint256 amount60 = expectAmount * PERCENT60 / 1e10;
            // If token ins ETH send it from this contract to UNI_HELPER contract
            if (_token == address(0)) {
                Helper.safeTransferETH(UNI_HELPER, amount60); // 60%
            } else {
                bytes memory swapArgs = abi.encode(amount60, _token, vabToken);
                uint256 vabAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs);
                // Transfer VAB to VAB wallet (60%)
                Helper.safeTransfer(vabToken, IOwnablee(OWNABLE).VAB_WALLET(), vabAmount);
            }

            if (_token == usdcToken) {
                usdcAmount = expectAmount - amount60;
            } else {
                //If token is ETH send it from this contract to UNI_HELPER contract
                if (_token == address(0)) {
                    Helper.safeTransferETH(UNI_HELPER, expectAmount - amount60); // 40%
                } else {
                    bytes memory swapArgs1 = abi.encode(expectAmount - amount60, _token, usdcToken);
                    usdcAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs1);
                }
            }
            // Transfer USDC to wallet (40%)
            Helper.safeTransfer(usdcToken, IOwnablee(OWNABLE).VAB_WALLET(), usdcAmount);
        }

        // Update user subscription info
        UserSubscription storage subscription = subscriptionInfo[msg.sender];
        if (isActivedSubscription(msg.sender)) {
            uint256 oldPeriod = subscription.period;
            subscription.period = oldPeriod + _period;
            subscription.expireTime = subscription.activeTime + PERIOD_UNIT * (oldPeriod + _period);
        } else {
            subscription.activeTime = block.timestamp;
            subscription.period = _period;
            subscription.expireTime = block.timestamp + PERIOD_UNIT * _period;
        }

        emit SubscriptionActivated(msg.sender, _token, _period);
    }

    /**
     * @notice Add discount percentages for different subscription durations.
     * @dev Only callable by the auditor.
     * @param _discountPercents Array of discount percentages for subscription periods (3, 6, 12 months).
     * The array must contain exactly three elements.
     */
    function addDiscountPercent(uint256[] calldata _discountPercents) external onlyAuditor {
        require(_discountPercents.length == 3, "discountList: bad length");
        discountList = _discountPercents;
    }

    /**
     * @notice Retrieve the current discount percentage list.
     * @return list_ Array of discount percentages for subscription periods (3, 6, 12 months).
     */
    function getDiscountPercentList() external view returns (uint256[] memory list_) {
        list_ = discountList;
    }

    /*//////////////////////////////////////////////////////////////
                                 PUBLIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Calculate the expected token amount that a user should pay for activating the subscription.
     * @param _token Address of the payment token (ERC20) or address(0) for ETH.
     * @param _period Subscription period in months (e.g., 1, 3, 6, 12).
     * @return expectAmount_ Expected token amount to be paid.
     */
    function getExpectedSubscriptionAmount(
        address _token,
        uint256 _period
    )
        public
        view
        returns (uint256 expectAmount_)
    {
        require(_period != 0, "getExpectedSubscriptionAmount: Zero period");

        address usdcToken = IOwnablee(OWNABLE).USDC_TOKEN();
        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();
        uint256 scriptAmount = _period * IProperty(DAO_PROPERTY).subscriptionAmount();

        if (_period < 3) {
            //@audit -low not needed ?
            // scriptAmount = scriptAmount;
        } else if (_period >= 3 && _period < 6) {
            scriptAmount = scriptAmount * (100 - discountList[0]) * 1e8 / 1e10;
        } else if (_period >= 6 && _period < 12) {
            scriptAmount = scriptAmount * (100 - discountList[1]) * 1e8 / 1e10;
        } else {
            scriptAmount = scriptAmount * (100 - discountList[2]) * 1e8 / 1e10;
        }

        if (_token == vabToken) {
            //@audit-issue Why use PERCENT40 here ?
            // This will result in a wrong subscription price if the user pays with VAB
            // He always pays only 40% of the actual subscription amount
            expectAmount_ = IUniHelper(UNI_HELPER).expectedAmount(scriptAmount * PERCENT40 / 1e10, usdcToken, _token);
        } else if (_token == usdcToken) {
            expectAmount_ = scriptAmount;
        } else {
            expectAmount_ = IUniHelper(UNI_HELPER).expectedAmount(scriptAmount, usdcToken, _token);
        }
    }

    /**
     * @notice Check if a customer has an active subscription.
     * @param _customer Address of the customer to check.
     * @return active_ Boolean indicating whether the customer has an active subscription.
     */
    function isActivedSubscription(address _customer) public view returns (bool active_) {
        if (subscriptionInfo[_customer].expireTime > block.timestamp) active_ = true;
        else active_ = false;
    }
}
