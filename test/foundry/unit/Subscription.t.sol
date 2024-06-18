// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { BaseTest, console2 } from "../utils/BaseTest.sol";
import { Subscription } from "../../../contracts/dao/Subscription.sol";

contract SubscriptionTest is BaseTest {
    event SubscriptionActivated(address indexed customer, address token, uint256 period);

    uint256 constant PERCENT_SCALING_FACTOR = 1e8;
    uint256 constant PERCENT_BASIS_FACTOR = 1e10;

    uint256 private constant SUBSCRIPTION_PERIOD = 30 days;
    uint256[] private expectedDiscountList = new uint256[](3);
    uint256 basisSubscriptionAmount;

    function setUp() public override {
        super.setUp();
        expectedDiscountList[0] = 11;
        expectedDiscountList[1] = 22;
        expectedDiscountList[2] = 25;

        basisSubscriptionAmount = property.subscriptionAmount();
    }

    function test_constructorZeroOwnableAddress() public {
        address _ownable = address(0);
        address _uniHelper = address(0x2);
        address _property = address(0x3);
        vm.expectRevert("ownableContract: zero address");
        new Subscription(_ownable, _uniHelper, _property, expectedDiscountList);
    }

    function test_constructorZeroUniHelperAddress() public {
        address _ownable = address(0x1);
        address _uniHelper = address(0);
        address _property = address(0x3);
        vm.expectRevert("uniHelperContract: zero address");
        new Subscription(_ownable, _uniHelper, _property, expectedDiscountList);
    }

    function test_constructorZeroPropertyAddress() public {
        address _ownable = address(0x1);
        address _uniHelper = address(0x2);
        address _property = address(0);
        vm.expectRevert("daoProperty: zero address");
        new Subscription(_ownable, _uniHelper, _property, expectedDiscountList);
    }

    function test_constructorBadDiscountLength() public {
        address _ownable = address(0x1);
        address _uniHelper = address(0x2);
        address _property = address(0x3);
        uint256[] memory _discountPercents = new uint256[](2); // Invalid length
        _discountPercents[0] = 10;
        _discountPercents[1] = 20;
        vm.expectRevert("discountList: bad length");
        new Subscription(_ownable, _uniHelper, _property, _discountPercents);
    }

    function test_canReceiveEth() public {
        uint256 amount = 1 ether;
        deal(default_user, amount);
        vm.prank(default_user);
        (bool success,) = address(payable(subscription)).call{ value: amount }("");
        assertEq(success, true);
        assertEq(default_user.balance, 0);
        assertEq(address(subscription).balance, amount);
    }

    function test_subscriptionPriceVabExpectedSwapValue() public view {
        uint256 subscriptionPeriod = 1;
        address token = address(vab);

        uint256 expectedSwapAmount = uniHelper.expectedAmount(
            ((basisSubscriptionAmount * 40 * PERCENT_SCALING_FACTOR) / PERCENT_BASIS_FACTOR), address(usdc), token
        );

        uint256 actualSubscriptionCost = subscription.getExpectedSubscriptionAmount(token, subscriptionPeriod);
        assertEq(expectedSwapAmount, actualSubscriptionCost);
    }

    function test_subscriptionPriceEthExpectedSwapValue() public view {
        uint256 subscriptionPeriod = 1;
        address token = address(0);

        uint256 expectedSwapAmount = uniHelper.expectedAmount(basisSubscriptionAmount, address(usdc), token);

        uint256 actualSubscriptionCost = subscription.getExpectedSubscriptionAmount(token, subscriptionPeriod);
        assertEq(expectedSwapAmount, actualSubscriptionCost);
    }

    function test_subscriptionPrice() public view {
        uint256 subscriptionPeriod = 1;
        address token = address(usdc);
        uint256 expectSubscriptionCost = subscription.getExpectedSubscriptionAmount(token, subscriptionPeriod);
        assertEq(basisSubscriptionAmount, expectSubscriptionCost);
    }

    function test_subscriptionPriceNoDiscount() public view {
        uint256 noDiscountPeriod = 2;
        address token = address(usdc);

        uint256 subscriptionAmount = property.subscriptionAmount();
        uint256 expectedSubscriptionCostNoDiscount = subscriptionAmount * noDiscountPeriod;

        uint256 actualSubscriptionCostNoDiscount = subscription.getExpectedSubscriptionAmount(token, noDiscountPeriod);
        assertEq(actualSubscriptionCostNoDiscount, expectedSubscriptionCostNoDiscount);
    }

    function test_subscriptionPriceFirstDiscount() public view {
        uint256 firstDiscountPeriod = 3;

        address token = address(usdc);
        uint256[] memory _actualDiscountList = subscription.getDiscountPercentList();
        uint256 subscriptionCostFirstDiscount = basisSubscriptionAmount * firstDiscountPeriod;

        uint256 expectedSubscriptionCostFirstDiscount = subscriptionCostFirstDiscount * (100 - _actualDiscountList[0])
            * PERCENT_SCALING_FACTOR / PERCENT_BASIS_FACTOR;

        uint256 actualSubscriptionCostFirstDiscount =
            subscription.getExpectedSubscriptionAmount(token, firstDiscountPeriod);
        assertEq(actualSubscriptionCostFirstDiscount, expectedSubscriptionCostFirstDiscount);
    }

    function test_subscriptionPriceSecondDiscount() public view {
        uint256 secondDiscountPeriod = 6;

        address token = address(usdc);
        uint256[] memory _actualDiscountList = subscription.getDiscountPercentList();
        uint256 subscriptionCostSecondDiscount = basisSubscriptionAmount * secondDiscountPeriod;

        uint256 expectedSubscriptionCostSecondDiscount = subscriptionCostSecondDiscount * (100 - _actualDiscountList[1])
            * PERCENT_SCALING_FACTOR / PERCENT_BASIS_FACTOR;

        uint256 actualSubscriptionCostSecondDiscount =
            subscription.getExpectedSubscriptionAmount(token, secondDiscountPeriod);
        assertEq(actualSubscriptionCostSecondDiscount, expectedSubscriptionCostSecondDiscount);
    }

    function test_subscriptionPriceThirdDiscount() public view {
        uint256 thirdDiscountPeriod = 12;
        address token = address(usdc);

        uint256[] memory _actualDiscountList = subscription.getDiscountPercentList();

        uint256 subscriptionCostThirdDiscount = basisSubscriptionAmount * thirdDiscountPeriod;

        uint256 expectedSubscriptionCostThirdDiscount = subscriptionCostThirdDiscount * (100 - _actualDiscountList[2])
            * PERCENT_SCALING_FACTOR / PERCENT_BASIS_FACTOR;

        uint256 actualSubscriptionCostThirdDiscount =
            subscription.getExpectedSubscriptionAmount(token, thirdDiscountPeriod);

        assertEq(actualSubscriptionCostThirdDiscount, expectedSubscriptionCostThirdDiscount);
    }

    function test_discountSetToCorrectValue() public view {
        uint256[] memory _expectedDiscountList = expectedDiscountList;
        uint256[] memory _actualDiscountList = subscription.getDiscountPercentList();

        assertEq(_expectedDiscountList[0], _actualDiscountList[0]);
        assertEq(_expectedDiscountList[1], _actualDiscountList[1]);
        assertEq(_expectedDiscountList[2], _actualDiscountList[2]);
    }

    function test_auditorCanSetDiscount() public {
        uint256[] memory newDiscountList = new uint256[](3);
        newDiscountList[0] = 10;
        newDiscountList[1] = 20;
        newDiscountList[2] = 30;
        vm.startPrank(auditor);
        subscription.addDiscountPercent(newDiscountList);

        uint256[] memory _actualDiscountList = subscription.getDiscountPercentList();
        assertEq(newDiscountList[0], _actualDiscountList[0]);
        assertEq(newDiscountList[1], _actualDiscountList[1]);
        assertEq(newDiscountList[2], _actualDiscountList[2]);
    }

    function test_addDiscountValuesRevertIfNotThree() public {
        uint256[] memory newDiscountList = new uint256[](4);
        newDiscountList[0] = 10;
        newDiscountList[1] = 20;
        newDiscountList[2] = 30;
        newDiscountList[3] = 40;
        vm.startPrank(auditor);
        vm.expectRevert("discountList: bad length");
        subscription.addDiscountPercent(newDiscountList);
    }

    function test_activatingSubscriptionRevertsIfLessEthSend() public {
        uint256 period = 1;
        uint256 amount = 1 wei;
        address token = address(0);

        deal(default_user, amount);
        vm.startPrank(default_user);
        vm.expectRevert("activeSubscription: Insufficient paid");
        subscription.activeSubscription{ value: amount }(token, period);
        vm.stopPrank();
    }

    function test_activatingSubscriptionWithMoreEthOnlyTransfersNecessary() public {
        uint256 period = 1;
        uint256 startingAmountEth = 1 ether;
        address token = address(0);

        deal(default_user, startingAmountEth);
        assertEq(default_user.balance, startingAmountEth);

        uint256 expectedAmountEthToBeTransfered = subscription.getExpectedSubscriptionAmount(token, period);

        vm.startPrank(default_user);
        // We transfer 1 ETH to the subscription contract which is way more then needed
        subscription.activeSubscription{ value: startingAmountEth }(token, period);
        vm.stopPrank();

        uint256 expectedUserEndBalance = startingAmountEth - expectedAmountEthToBeTransfered;
        uint256 actualUserEndBalance = default_user.balance;
        assertEq(actualUserEndBalance, expectedUserEndBalance);
    }

    function test_activatingSubscriptionWithVab() public {
        uint256 period = 1;
        address token = address(vab);

        deal(address(usdc), vabWallet, 0);

        vm.prank(default_user);
        subscription.activeSubscription(token, period);

        uint256 usdcWalletEndingBalance = usdc.balanceOf(address(vabWallet));
        uint256 expectedEndingBalance = (basisSubscriptionAmount * (40 * PERCENT_SCALING_FACTOR)) / PERCENT_BASIS_FACTOR;

        // 15 % Tolerance because testnet liquidity is super bad
        assertApproxEqRel(expectedEndingBalance, usdcWalletEndingBalance, 1e16 * 15);
    }

    function test_subscriptionNotActiveWhenNoSubscription() public view {
        assertEq(subscription.isActivedSubscription(address(default_user)), false);
    }

    function test_subscriptionNotActiveWhenExpired() public {
        uint256 userUsdcStartingBalance = 10 * 1e6; // 10 USDC
        uint256 subscriptionPeriod = 1;
        address token = address(usdc);

        deal(token, default_user, userUsdcStartingBalance);
        assertEq(usdc.balanceOf(default_user), userUsdcStartingBalance);

        vm.startPrank(default_user);
        usdc.approve(address(subscription), userUsdcStartingBalance);
        vm.expectEmit(address(subscription));
        emit SubscriptionActivated(default_user, token, subscriptionPeriod);
        subscription.activeSubscription(token, subscriptionPeriod);
        vm.stopPrank();
        assertEq(subscription.isActivedSubscription(address(default_user)), true);

        // now wait till the subscription should be expired
        skip(SUBSCRIPTION_PERIOD);
        assertEq(subscription.isActivedSubscription(address(default_user)), false);
    }

    function test_subscriptionRenewExtendExistingPeriod() public {
        uint256 userUsdcStartingBalance = 100 * 1e6; // 100 USDC
        uint256 subscriptionPeriod = 1;
        address token = address(usdc);
        uint256 WAIT_PERIOD = 15 days;

        deal(token, default_user, userUsdcStartingBalance);
        assertEq(usdc.balanceOf(default_user), userUsdcStartingBalance);

        vm.startPrank(default_user);
        usdc.approve(address(subscription), userUsdcStartingBalance);
        vm.expectEmit(address(subscription));
        emit SubscriptionActivated(default_user, token, subscriptionPeriod);
        subscription.activeSubscription(token, subscriptionPeriod);
        uint256 timestamp = block.timestamp;
        (uint256 activationTime, uint256 period, uint256 expireTime) = subscription.subscriptionInfo(default_user);

        assertEq(period, subscriptionPeriod);
        assertEq(activationTime, timestamp);
        assertEq(expireTime, activationTime + SUBSCRIPTION_PERIOD);
        assertEq(subscription.isActivedSubscription(address(default_user)), true);

        // now we wait 15 days
        skip(WAIT_PERIOD);
        assertEq(subscription.isActivedSubscription(address(default_user)), true);

        // now we extend the subscription period
        subscription.activeSubscription(token, subscriptionPeriod);
        (, uint256 new_period, uint256 new_expireTime) = subscription.subscriptionInfo(default_user);

        uint256 expectedExpireTime = activationTime + SUBSCRIPTION_PERIOD * (subscriptionPeriod + period);

        // You can use a Unix timestamp converter to convert the timestamp to human readable format
        // https://www.epochconverter.com/
        console2.log("activationTime", activationTime); // Monday, 29. April 2024 08:55:24
        console2.log("old expire time", expireTime); // Wednesday, 29. May 2024 08:55:24
        console2.log("new expectedExpireTime", expectedExpireTime); // Friday, 28. June 2024 08:55:24
        console2.log("new_expireTime", new_expireTime); // Friday, 28. June 2024 08:55:24

        assertEq(new_period, subscriptionPeriod + period);
        assertEq(new_expireTime, expectedExpireTime);

        vm.stopPrank();
    }
}
