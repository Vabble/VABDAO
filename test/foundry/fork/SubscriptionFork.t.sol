// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { BaseForkTest, console2 } from "../utils/BaseForkTest.sol";

contract SubscriptionForkTest is BaseForkTest {
    event SubscriptionActivated(address indexed customer, address token, uint256 period);

    uint256 constant PERCENT_SCALING_FACTOR = 1e8;
    uint256 private constant SUBSCRIPTION_PERIOD = 30 days;

    function logSubscriptionPrices() public view {
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

    function testFork_subscriptionPrice() public view {
        uint256 subscriptionPeriod = 1;
        address token = address(usdc);
        uint256 subscriptionAmount = property.subscriptionAmount();
        uint256 expectSubscriptionCost = subscription.getExpectedSubscriptionAmount(token, subscriptionPeriod);

        assertEq(subscriptionAmount, expectSubscriptionCost);
    }

    function testFork_subscriptionVabCostsLess() public {
        uint256 userVabStartingBalance = 500 * 1e18; // 500 VAB
        uint256 subscriptionPeriod = 1;
        address token = address(vab);
        uint256 subscriptionAmount = property.subscriptionAmount();

        deal(token, user, userVabStartingBalance);
        deal(address(usdc), vabbleWallet, 0);

        assertEq(vab.balanceOf(user), userVabStartingBalance);
        assertEq(usdc.balanceOf(user), 0);
        assertEq(usdt.balanceOf(user), 0);

        vm.startPrank(user);
        vab.approve(address(subscription), userVabStartingBalance);

        vm.expectEmit(address(subscription));
        emit SubscriptionActivated(user, token, subscriptionPeriod);
        subscription.activeSubscription(token, subscriptionPeriod);

        uint256 timestamp = block.timestamp;
        (uint256 activeTime, uint256 period, uint256 expireTime) = subscription.subscriptionInfo(address(user));

        uint256 userVabEndingBalance = vab.balanceOf(user);
        uint256 costOfSubscription = userVabStartingBalance - userVabEndingBalance;

        uint256 usdcWalletEndingBalance = usdc.balanceOf(address(vabbleWallet));
        uint256 expectedEndingBalance = (subscriptionAmount * (40 * PERCENT_SCALING_FACTOR)) / 1e10;

        vm.stopPrank();
        console2.log("userVabEndingBalance: ", userVabEndingBalance);
        console2.log("costOfSubscription: ", costOfSubscription);
        // 301895377685386008023 ~ 301.89537 VAB ~ 1.18 $ <= Subscription only costs 40 %

        assertEq(period, subscriptionPeriod);
        assertEq(activeTime, timestamp);
        assertEq(expireTime, activeTime + SUBSCRIPTION_PERIOD);
        assertEq(subscription.isActivedSubscription(user), true);

        assertApproxEqRel(expectedEndingBalance, usdcWalletEndingBalance, 1e16 * 2); // 2 % tolerance
    }

    function testFork_subscriptionPayWithUsdc() public {
        uint256 userUsdcStartingBalance = 10 * 1e6; // 10 USDC
        uint256 subscriptionPeriod = 1;
        address token = address(usdc);

        uint256 vabWalletUsdcStartingBalance = usdc.balanceOf(vabbleWallet);
        uint256 vabWalletVabStartingBalance = vab.balanceOf(vabbleWallet);

        assertEq(vabWalletUsdcStartingBalance, 0);
        assertEq(vabWalletVabStartingBalance, 0);

        deal(token, user, userUsdcStartingBalance);
        assertEq(usdc.balanceOf(user), userUsdcStartingBalance);

        uint256 expectSubscriptionCost = subscription.getExpectedSubscriptionAmount(token, subscriptionPeriod);
        uint256 expectedVabAmountInUsdcToTransfer = (expectSubscriptionCost * (PERCENT_SCALING_FACTOR * 60)) / 1e10;
        uint256 expectedUsdcToTransfer = expectSubscriptionCost - expectedVabAmountInUsdcToTransfer;

        vm.startPrank(user);
        usdc.approve(address(subscription), userUsdcStartingBalance);
        vm.expectEmit(address(subscription));
        emit SubscriptionActivated(user, token, subscriptionPeriod);
        subscription.activeSubscription(token, subscriptionPeriod);
        vm.stopPrank();

        uint256 userUsdcEndingBalance = usdc.balanceOf(user);
        uint256 actualCostOfSubscription = userUsdcStartingBalance - userUsdcEndingBalance;
        uint256 userVabEndingBalance = vab.balanceOf(user);

        console2.log("userVabEndingBalance: ", userVabEndingBalance); // 0
        console2.log("userUsdcStartingBalance: ", userUsdcStartingBalance); // 10.000000
        console2.log("userUsdcEndingBalance: ", userUsdcEndingBalance); // 7.010000
        console2.log("actualCostOfSubscription: ", actualCostOfSubscription); // 2.990000

        uint256 vabWalletUsdcEndingBalance = usdc.balanceOf(vabbleWallet);
        uint256 vabWalletVabEndingBalance = vab.balanceOf(vabbleWallet);

        console2.log("vabWalletUsdcEndingBalance: ", vabWalletUsdcEndingBalance); // 1.196000 $ ~ 40%
        console2.log("vabWalletVabEndingBalance: ", vabWalletVabEndingBalance); // 486.035 VAB ~ 1.76 $

        assertEq(vabWalletUsdcEndingBalance, expectedUsdcToTransfer);
        // assertEq(vabWalletVabEndingBalance, actualCostOfSubscription);

        assertEq(userVabEndingBalance, 0);
        assertEq(expectSubscriptionCost, actualCostOfSubscription);
        assertEq(subscription.isActivedSubscription(user), true);
    }

    function testFork_subscriptionPayWithEth() public {
        uint256 userEthStartingBalance = 1 * 1e18; // 1 ETH
        uint256 subscriptionPeriod = 1;
        address eth = address(0);

        uint256 vabWalletUsdcStartingBalance = usdc.balanceOf(vabbleWallet);
        uint256 vabWalletVabStartingBalance = vab.balanceOf(vabbleWallet);

        assertEq(vabWalletUsdcStartingBalance, 0);
        assertEq(vabWalletVabStartingBalance, 0);

        deal(user, userEthStartingBalance);
        assertEq(user.balance, userEthStartingBalance);

        uint256 expectSubscriptionCost = subscription.getExpectedSubscriptionAmount(eth, subscriptionPeriod);

        vm.startPrank(user);
        vm.expectEmit(address(subscription));
        emit SubscriptionActivated(user, eth, subscriptionPeriod);
        subscription.activeSubscription{ value: expectSubscriptionCost }(eth, subscriptionPeriod);
        vm.stopPrank();

        uint256 userEthEndingBalance = user.balance;
        uint256 actualCostOfSubscription = userEthStartingBalance - userEthEndingBalance;

        console2.log("userEthStartingBalance: ", userEthStartingBalance); // 1 ETH
        console2.log("userEthEndingBalance: ", userEthEndingBalance); // 0.999133327621269643 ETH
        console2.log("actualCostOfSubscription in ETH: ", actualCostOfSubscription); // 0.000346668951492143 ETH

        uint256 vabWalletUsdcEndingBalance = usdc.balanceOf(vabbleWallet);
        uint256 vabWalletVabEndingBalance = vab.balanceOf(vabbleWallet);

        console2.log("vabWalletUsdcEndingBalance: ", vabWalletUsdcEndingBalance); // 1.196000 $ ~ 40%
        console2.log("vabWalletVabEndingBalance: ", vabWalletVabEndingBalance); // 486.035 VAB ~ 1.76 $

        assertEq(expectSubscriptionCost, actualCostOfSubscription);
        assertEq(subscription.isActivedSubscription(user), true);
    }
}
