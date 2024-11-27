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

    address private immutable OWNABLE;      // Ownablee contract address  
    address private immutable UNI_HELPER;   // UniHelper contract
    address private immutable DAO_PROPERTY; // Property contract

    uint256 private constant PERIOD_UNIT = 30 days; // 30 days
    uint256 private constant PERCENT60 = 60 * 1e8;
    uint256 private constant PERCENT40 = 40 * 1e8;
    
    uint256[] private discountList;    

    struct UserSubscription {
        uint256 activeTime;       // active time
        uint256 period;           // period of subscription(ex: 1 => 1 month, 3 => 3 month)
        uint256 expireTime;       // expire time
    }

    mapping(address => UserSubscription) public subscriptionInfo;             // (user => UserSubscription)

    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "caller is not the auditor");
        _;
    }
    
    receive() external payable {}

    constructor(
        address _ownable,
        address _uniHelper,
        address _property,
        uint256[] memory _discountPercents
    ) {        
        require(_ownable != address(0), "ownableContract: zero address");
        OWNABLE = _ownable;  
        require(_uniHelper != address(0), "uniHelperContract: zero address");
        UNI_HELPER = _uniHelper;      
        require(_property != address(0), "daoProperty: zero address");
        DAO_PROPERTY = _property; 
        require(_discountPercents.length == 3, "discountList: bad length");
        discountList = _discountPercents;
    }

    // ============= 0. Subscription by token and NFT. ===========    
    /// @notice active subscription(pay $1 monthly as ETH/USDC/USDT/VAB...) for renting the films
    function activeSubscription(address _token, uint256 _period) external payable nonReentrant {
        if(_token != IOwnablee(OWNABLE).PAYOUT_TOKEN() && _token != address(0)) {
            require(IOwnablee(OWNABLE).isDepositAsset(_token), "activeSubscription: not allowed asset"); 
        }
        
        uint256 expectAmount = getExpectedSubscriptionAmount(_token, _period);
        if(_token == address(0)) {
            require(msg.value >= expectAmount, "activeSubscription: Insufficient paid");
            if (msg.value > expectAmount) {
                Helper.safeTransferETH(msg.sender, msg.value - expectAmount);
            }
        } else {
            Helper.safeTransferFrom(_token, msg.sender, address(this), expectAmount); 

            // Approve token to send from this contract to UNI_HELPER contract
            if(IERC20(_token).allowance(address(this), UNI_HELPER) == 0) {
                Helper.safeApprove(_token, UNI_HELPER, IERC20(_token).totalSupply());
            }
        }

        uint256 usdcAmount;
        address usdcToken = IOwnablee(OWNABLE).USDC_TOKEN();
        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();
        // if token is VAB, send USDC(convert from VAB to USDC) to wallet
        if(_token == vabToken) {
            bytes memory swapArgs = abi.encode(expectAmount, _token, usdcToken);
            usdcAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs);
            Helper.safeTransfer(usdcToken, IOwnablee(OWNABLE).VAB_WALLET(), usdcAmount);
        } 
        // if token != VAB, send VAB(convert token(60%) to VAB) and USDC(convert token(40%) to USDC) to wallet
        else {            
            uint256 amount60 = expectAmount * PERCENT60 / 1e10;  
            // Send ETH from this contract to UNI_HELPER contract
            if(_token == address(0)) Helper.safeTransferETH(UNI_HELPER, amount60); // 60%
            
            bytes memory swapArgs = abi.encode(amount60, _token, vabToken);
            uint256 vabAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs);            
            // Transfer VAB to wallet
            Helper.safeTransfer(vabToken, IOwnablee(OWNABLE).VAB_WALLET(), vabAmount);

            if(_token == usdcToken) {
                usdcAmount = expectAmount - amount60;
            } else {
                // Send ETH from this contract to UNI_HELPER contract
                if(_token == address(0)) Helper.safeTransferETH(UNI_HELPER, expectAmount - amount60); // 40%
                
                bytes memory swapArgs1 = abi.encode(expectAmount - amount60, _token, usdcToken);
                usdcAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs1);
            }
            // Transfer USDC to wallet
            Helper.safeTransfer(usdcToken, IOwnablee(OWNABLE).VAB_WALLET(), usdcAmount);
        }        
        
        UserSubscription storage subscription = subscriptionInfo[msg.sender];
        if(isActivedSubscription(msg.sender)) {
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

    /// @notice Expected token amount that user should pay for activing the subscription
    function getExpectedSubscriptionAmount(address _token, uint256 _period) public view returns(uint256 expectAmount_) {
        require(_period != 0, "getExpectedSubscriptionAmount: Zero period");

        address usdcToken = IOwnablee(OWNABLE).USDC_TOKEN();
        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();
        uint256 scriptAmount = _period * IProperty(DAO_PROPERTY).subscriptionAmount();
        
        if(_period < 3) {
            scriptAmount = scriptAmount;
        } else if(_period >= 3 && _period < 6) {
            scriptAmount = scriptAmount * (100 - discountList[0]) * 1e8 / 1e10;
        } else if(_period >= 6 && _period < 12) {
            scriptAmount = scriptAmount * (100 - discountList[1]) * 1e8 / 1e10;
        } else {
            scriptAmount = scriptAmount * (100 - discountList[2]) * 1e8 / 1e10;
        }

        if(_token == vabToken) {
            expectAmount_ = IUniHelper(UNI_HELPER).expectedAmount(scriptAmount * PERCENT40 / 1e10, usdcToken, _token);
        } else if(_token == usdcToken) {
            expectAmount_ = scriptAmount;
        } else {            
            expectAmount_ = IUniHelper(UNI_HELPER).expectedAmount(scriptAmount, usdcToken, _token);
        }
    }

    /// @notice Check if subscription period 
    function isActivedSubscription(address _customer) public view returns(bool active_) {
        if(subscriptionInfo[_customer].expireTime > block.timestamp) active_ = true;
        else active_ = false;
    }  

    /// @notice Add discount percents(3 months, 6 months, 12 months) from Auditor
    function addDiscountPercent(uint256[] calldata _discountPercents) external onlyAuditor {
        require(_discountPercents.length == 3, "discountList: bad length");
        discountList = _discountPercents;
    }

    /// @notice get discount percent list
    function getDiscountPercentList() external view returns(uint256[] memory list_) {
        list_ = discountList;
    } 
}
