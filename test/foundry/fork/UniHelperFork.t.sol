// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { BaseForkTest, console2 } from "../utils/BaseForkTest.sol";

contract UniHelperForkTest is BaseForkTest {
    function _printSubscriptionPrices() internal view {
        uint256 subscriptionAmount = property.subscriptionAmount();
        console2.log("subscriptionAmount: ", subscriptionAmount);
        // 2.990000 $USDC

        uint256 expectedSubscriptionAmountVab = subscription.getExpectedSubscriptionAmount(address(vab), 1);
        console2.log("expectedSubscriptionAmountVab: ", expectedSubscriptionAmountVab);
        // 324.042680865574396255 VAB

        uint256 expectedSubscriptionAmountEth = subscription.getExpectedSubscriptionAmount(address(0), 1);
        console2.log("expectedSubscriptionAmountEth: ", expectedSubscriptionAmountEth);
        // 0.000846067634659238 ~ 2.99 $

        uint256 expectedSubscriptionAmountUSDC = subscription.getExpectedSubscriptionAmount(address(usdc), 1);
        console2.log("expectedSubscriptionAmountUSDC: ", expectedSubscriptionAmountUSDC);

        uint256 expectedSubscriptionAmountUSDT = subscription.getExpectedSubscriptionAmount(address(usdt), 1);
        console2.log("expectedSubscriptionAmountUSDT: ", expectedSubscriptionAmountUSDT);
    }
}
