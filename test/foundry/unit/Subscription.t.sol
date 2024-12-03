// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { BaseTest, console2 } from "../utils/BaseTest.sol";
import { Subscription } from "../../../contracts/dao/Subscription.sol";
import { ERC20Mock } from "../mocks/ERC20Mock.sol";

contract SubscriptionTest is BaseTest {
    struct BalanceSnapshot {
        uint256 subscriptionEth;
        uint256 subscriptionVab;
        uint256 subscriptionUsdc;
        uint256 walletEth;
        uint256 walletVab;
        uint256 walletUsdc;
    }

    event SubscriptionActivated(address indexed customer, address token, uint256 period);
    event AssetWithdrawn(address indexed token, address indexed recipient, uint256 amount);

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

        _addInitialLiquidity();
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    function test_revertConstructorCannotSetZeroOwnableAddress() public {
        address _ownable = address(0);
        address _uniHelper = address(0x2);
        address _property = address(0x3);
        vm.expectRevert("ownableContract: zero address");
        new Subscription(_ownable, _uniHelper, _property, expectedDiscountList);
    }

    function test_revertConstructorCannotSetZeroUniHelperAddress() public {
        address _ownable = address(0x1);
        address _uniHelper = address(0);
        address _property = address(0x3);
        vm.expectRevert("uniHelperContract: zero address");
        new Subscription(_ownable, _uniHelper, _property, expectedDiscountList);
    }

    function test_revertConstructorCannotSetZeroPropertyAddress() public {
        address _ownable = address(0x1);
        address _uniHelper = address(0x2);
        address _property = address(0);
        vm.expectRevert("daoProperty: zero address");
        new Subscription(_ownable, _uniHelper, _property, expectedDiscountList);
    }

    function test_revertConstructorCannotSetBadDiscountLength() public {
        address _ownable = address(0x1);
        address _uniHelper = address(0x2);
        address _property = address(0x3);
        uint256[] memory _discountPercents = new uint256[](2); // Invalid length
        _discountPercents[0] = 10;
        _discountPercents[1] = 20;
        vm.expectRevert("discountList: bad length");
        new Subscription(_ownable, _uniHelper, _property, _discountPercents);
    }

    /*//////////////////////////////////////////////////////////////
                                RECEIVE
    //////////////////////////////////////////////////////////////*/

    function test_canReceiveEth() public {
        uint256 amount = 1 ether;
        deal(default_user, amount);
        vm.prank(default_user);
        (bool success,) = address(payable(subscription)).call{ value: amount }("");
        assertEq(success, true);
        assertEq(default_user.balance, 0);
        assertEq(address(subscription).balance, amount);
    }

    /*//////////////////////////////////////////////////////////////
                           activeSubscription
    //////////////////////////////////////////////////////////////*/

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

    function test_activatingSubscriptionRevertsIfAccountBalanceIsToLow() public {
        uint256 period = 1;
        uint256 amount = 1e18;
        address token = address(vab);

        deal(token, default_user, amount);
        vm.startPrank(default_user);
        vm.expectRevert("VabbleDAO::transferFrom: transferFrom failed");
        subscription.activeSubscription{ value: amount }(token, period);
        vm.stopPrank();
    }

    function test_activatingSubscriptionRevertsIfWrongToken() public {
        uint256 period = 1;
        uint256 amount = 100e18;
        ERC20Mock unallowedToken = new ERC20Mock("Unallowed", "UAD");

        deal(address(unallowedToken), default_user, amount);
        vm.startPrank(default_user);
        vm.expectRevert("activeSubscription: not allowed asset");
        subscription.activeSubscription(address(unallowedToken), period);
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

    function test_activatingSubscriptionWithVab_GAS() public {
        vm.prank(default_user);
        vm.startSnapshotGas("activeSubscription");
        subscription.activeSubscription(address(vab), 1);
        uint256 gasUsed = vm.stopSnapshotGas();
        console2.log("activeSubscriptionGas", gasUsed);
    }

    function test_activatingSubscriptionWithVab() public {
        uint256 period = 1;
        address token = address(vab);

        uint256 subscriptionContractStartingVabBalance = vab.balanceOf(address(subscription));
        assertEq(subscription.isActivedSubscription(default_user), false);

        vm.prank(default_user);
        vm.startSnapshotGas("activeSubscription");
        subscription.activeSubscription(token, period);
        uint256 gasUsed = vm.stopSnapshotGas();
        console2.log("activeSubscriptionGas", gasUsed); // 598_564 => 150_319

        uint256 expectedAmount = subscription.getExpectedSubscriptionAmount(token, period);
        uint256 subscriptionContractEndingVabBalance = vab.balanceOf(address(subscription));

        assertEq(subscriptionContractEndingVabBalance - subscriptionContractStartingVabBalance, expectedAmount);
        assertEq(subscription.isActivedSubscription(default_user), true);
    }

    function test_activatingSubscriptionWithEth() public {
        uint256 period = 1;
        uint256 startingAmountEth = 1 ether;
        address eth = address(0);

        deal(default_user, startingAmountEth);
        deal(address(vab), vabWallet, 0);
        deal(address(subscription), 0);

        uint256 vabWalletVabstartingBalance = vab.balanceOf(vabWallet);
        uint256 subscriptionContractEthStartingBalance = address(subscription).balance;

        assertEq(vabWalletVabstartingBalance, 0);
        assertEq(subscriptionContractEthStartingBalance, 0);
        assertEq(subscription.isActivedSubscription(default_user), false);

        uint256 expectedAmountEthToBeTransfered = subscription.getExpectedSubscriptionAmount(eth, period);

        vm.startPrank(default_user);
        vm.startSnapshotGas("activeSubscription");
        subscription.activeSubscription{ value: expectedAmountEthToBeTransfered }(eth, period);
        uint256 gasUsed = vm.stopSnapshotGas();
        console2.log("activeSubscriptionGas", gasUsed); // 261_722
        vm.stopPrank();

        uint256 vabWalletVabEndingBalance = vab.balanceOf(vabWallet);
        uint256 subscriptionContractEthEndingBalance = address(subscription).balance;

        // 40 % in ETH should stay in the contract
        assertGt(subscriptionContractEthEndingBalance, subscriptionContractEthStartingBalance);
        // 60 % should be converted into VAB and go to the VAB Wallet
        assertGt(vabWalletVabEndingBalance, vabWalletVabstartingBalance);
        assertEq(subscription.isActivedSubscription(default_user), true);
    }

    function test_activatingSubscriptionWithUsdc() public {
        uint256 period = 1;

        deal(address(vab), vabWallet, 0);
        deal(address(usdc), vabWallet, 0);

        uint256 vabWalletVabstartingBalance = vab.balanceOf(vabWallet);
        uint256 vabWalletUsdcStartingBalance = usdc.balanceOf(vabWallet);

        assertEq(vabWalletVabstartingBalance, 0);
        assertEq(vabWalletUsdcStartingBalance, 0);
        assertEq(subscription.isActivedSubscription(default_user), false);

        subscription.getExpectedSubscriptionAmount(address(usdc), period);

        vm.startPrank(default_user);
        vm.startSnapshotGas("activeSubscription");
        subscription.activeSubscription(address(usdc), period);
        uint256 gasUsed = vm.stopSnapshotGas();
        console2.log("activeSubscriptionGas", gasUsed); // 475_159
        vm.stopPrank();

        uint256 vabWalletVabEndingBalance = vab.balanceOf(vabWallet);
        uint256 vabWalletUsdcEndingBalance = usdc.balanceOf(vabWallet);

        // 40 % in USDC should go to the VAB Wallet
        assertGt(vabWalletUsdcEndingBalance, vabWalletUsdcStartingBalance);
        // 60 % should be converted into VAB and go to the VAB Wallet
        assertGt(vabWalletVabEndingBalance, vabWalletVabstartingBalance);
        assertEq(subscription.isActivedSubscription(default_user), true);
    }

    /*//////////////////////////////////////////////////////////////
                           addDiscountPercent
    //////////////////////////////////////////////////////////////*/

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

    /*//////////////////////////////////////////////////////////////
                           getDiscountPercentList
    //////////////////////////////////////////////////////////////*/

    function test_discountSetToCorrectValue() public view {
        uint256[] memory _expectedDiscountList = expectedDiscountList;
        uint256[] memory _actualDiscountList = subscription.getDiscountPercentList();

        assertEq(_expectedDiscountList[0], _actualDiscountList[0]);
        assertEq(_expectedDiscountList[1], _actualDiscountList[1]);
        assertEq(_expectedDiscountList[2], _actualDiscountList[2]);
    }

    /*//////////////////////////////////////////////////////////////
                           getExpectedSubscriptionAmount
    //////////////////////////////////////////////////////////////*/

    function test_subscriptionPriceMatchesWithGovernanceValue() public view {
        uint256 subscriptionPeriod = 1;
        address token = address(usdc);
        uint256 expectSubscriptionCost = subscription.getExpectedSubscriptionAmount(token, subscriptionPeriod);
        assertEq(basisSubscriptionAmount, expectSubscriptionCost);
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

    /*//////////////////////////////////////////////////////////////
                           isActivedSubscription
    //////////////////////////////////////////////////////////////*/

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

        skip(SUBSCRIPTION_PERIOD - 10);
        assertEq(subscription.isActivedSubscription(address(default_user)), true);
        skip(10);
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

    /*//////////////////////////////////////////////////////////////
                             WITHDRAWASSET
    //////////////////////////////////////////////////////////////*/

    function test_withdrawAssetShouldRevertIfCallerIsNotTheVabWallet() public {
        vm.startPrank(default_user);
        vm.expectRevert("Unauthorized Access");
        subscription.withdrawAsset(address(vab));
        vm.stopPrank();
    }

    function test_withdrawAssetShouldRevertIfEthBalanceIsZero() public {
        vm.startPrank(vabWallet);
        vm.expectRevert("Insufficient ETH balance");
        subscription.withdrawAsset(address(0));
        vm.stopPrank();
    }

    function test_withdrawAssetShouldRevertIfUsdcBalanceIsZero() public {
        vm.startPrank(vabWallet);
        vm.expectRevert("Insufficient token balance");
        subscription.withdrawAsset(address(usdc));
        vm.stopPrank();
    }

    function test_withdrawAssetShouldRevertIfVabBalanceIsZero() public {
        vm.startPrank(vabWallet);
        vm.expectRevert("Insufficient token balance");
        subscription.withdrawAsset(address(vab));
        vm.stopPrank();
    }

    function test_withdrawAssetShouldTransferTotalEthAndEmitEvent() public {
        uint256 contractEthBalance = 1 ether;
        deal(address(subscription), contractEthBalance);
        uint256 subscriptionStartingBalance = address(subscription).balance;
        uint256 vabWalletStartingBalance = vabWallet.balance;

        assertEq(contractEthBalance, subscriptionStartingBalance);

        vm.startPrank(vabWallet);
        vm.expectEmit(address(subscription));
        emit AssetWithdrawn(address(0), vabWallet, contractEthBalance);
        subscription.withdrawAsset(address(0));
        vm.stopPrank();

        uint256 vabWalletEndingBalance = vabWallet.balance;
        uint256 subscriptionEndingBalance = address(subscription).balance;

        assertEq(vabWalletEndingBalance, vabWalletStartingBalance + contractEthBalance);
        assertEq(subscriptionEndingBalance, subscriptionStartingBalance - contractEthBalance);
    }

    function test_withdrawAssetShouldTransferTotalUsdcAndEmitEvent() public {
        uint256 contractBalance = 100e6;
        address token = address(usdc);
        deal(token, address(subscription), contractBalance);
        uint256 subscriptionStartingBalance = usdc.balanceOf(address(subscription));
        uint256 vabWalletStartingBalance = usdc.balanceOf(vabWallet);

        assertEq(contractBalance, subscriptionStartingBalance);

        vm.startPrank(vabWallet);
        vm.expectEmit(address(subscription));
        emit AssetWithdrawn(token, vabWallet, contractBalance);
        subscription.withdrawAsset(token);
        vm.stopPrank();

        uint256 vabWalletEndingBalance = usdc.balanceOf(vabWallet);
        uint256 subscriptionEndingBalance = usdc.balanceOf(address(subscription));

        assertEq(vabWalletEndingBalance, vabWalletStartingBalance + contractBalance);
        assertEq(subscriptionEndingBalance, subscriptionStartingBalance - contractBalance);
    }

    function test_withdrawAssetShouldTransferTotalVabAndEmitEvent() public {
        uint256 contractBalance = 100e6;
        address token = address(vab);
        deal(token, address(subscription), contractBalance);
        uint256 subscriptionStartingBalance = vab.balanceOf(address(subscription));
        uint256 vabWalletStartingBalance = vab.balanceOf(vabWallet);

        assertEq(contractBalance, subscriptionStartingBalance);

        vm.startPrank(vabWallet);
        vm.expectEmit(address(subscription));
        emit AssetWithdrawn(token, vabWallet, contractBalance);
        subscription.withdrawAsset(token);
        vm.stopPrank();

        uint256 vabWalletEndingBalance = vab.balanceOf(vabWallet);
        uint256 subscriptionEndingBalance = vab.balanceOf(address(subscription));

        assertEq(vabWalletEndingBalance, vabWalletStartingBalance + contractBalance);
        assertEq(subscriptionEndingBalance, subscriptionStartingBalance - contractBalance);
    }

    /*//////////////////////////////////////////////////////////////
                           WITHDRAWALLASSETS
    //////////////////////////////////////////////////////////////*/

    function test_withdrawAllAssetsShouldRevertIfCallerIsNotTheVabWallet() public {
        vm.startPrank(default_user);
        vm.expectRevert("Unauthorized Access");
        subscription.withdrawAllAssets();
        vm.stopPrank();
    }

    function test_withdrawAllAssetsShouldRevertIfThereIsNothingToWithdraw() public {
        vm.startPrank(vabWallet);
        vm.expectRevert("Nothing to withdraw");
        subscription.withdrawAllAssets();
        vm.stopPrank();
    }

    function test_withdrawAllAssetsShouldWithdrawAllAssets() public {
        // Setup initial balances
        uint256 ethBalance = 1 ether;
        uint256 vabBalance = 100e18;
        uint256 usdcBalance = 200e6;

        _setupInitialBalances(ethBalance, vabBalance, usdcBalance);

        // Capture starting balances
        BalanceSnapshot memory startingBalances = _getBalanceSnapshot();

        // Verify initial state
        _verifyInitialBalances(startingBalances, ethBalance, vabBalance, usdcBalance);

        // Setup event expectations
        _setupWithdrawEvents(ethBalance, usdcBalance, vabBalance);

        // Execute withdrawal
        vm.startPrank(vabWallet);
        vm.startSnapshotGas("withdrawAllAssets");
        subscription.withdrawAllAssets();
        uint256 gasUsed = vm.stopSnapshotGas();
        console2.log("withdrawAllAssets", gasUsed); // 34_837
        vm.stopPrank();

        // Verify final state
        _verifyFinalBalances(startingBalances);
    }

    function _setupInitialBalances(uint256 ethBalance, uint256 vabBalance, uint256 usdcBalance) private {
        deal(address(subscription), ethBalance);
        deal(address(vab), address(subscription), vabBalance);
        deal(address(usdc), address(subscription), usdcBalance);
    }

    function _getBalanceSnapshot() private view returns (BalanceSnapshot memory) {
        return BalanceSnapshot({
            subscriptionEth: address(subscription).balance,
            subscriptionVab: vab.balanceOf(address(subscription)),
            subscriptionUsdc: usdc.balanceOf(address(subscription)),
            walletEth: vabWallet.balance,
            walletVab: vab.balanceOf(vabWallet),
            walletUsdc: usdc.balanceOf(vabWallet)
        });
    }

    function _verifyInitialBalances(
        BalanceSnapshot memory balances,
        uint256 ethBalance,
        uint256 vabBalance,
        uint256 usdcBalance
    )
        private
        pure
    {
        assertEq(balances.subscriptionEth, ethBalance);
        assertEq(balances.subscriptionVab, vabBalance);
        assertEq(balances.subscriptionUsdc, usdcBalance);
    }

    function _setupWithdrawEvents(uint256 ethBalance, uint256 usdcBalance, uint256 vabBalance) private {
        vm.expectEmit(true, true, false, true);
        emit AssetWithdrawn(address(0), vabWallet, ethBalance);

        vm.expectEmit(true, true, false, true);
        emit AssetWithdrawn(address(usdc), vabWallet, usdcBalance);

        vm.expectEmit(true, true, false, true);
        emit AssetWithdrawn(address(vab), vabWallet, vabBalance);
    }

    function _verifyFinalBalances(BalanceSnapshot memory startingBalances) private view {
        // Check subscription balances are zero
        assertEq(address(subscription).balance, 0);
        assertEq(vab.balanceOf(address(subscription)), 0);
        assertEq(usdc.balanceOf(address(subscription)), 0);

        // Check wallet received all assets
        assertEq(vabWallet.balance, startingBalances.walletEth + startingBalances.subscriptionEth);
        assertEq(vab.balanceOf(vabWallet), startingBalances.walletVab + startingBalances.subscriptionVab);
        assertEq(usdc.balanceOf(vabWallet), startingBalances.walletUsdc + startingBalances.subscriptionUsdc);
    }

    /*//////////////////////////////////////////////////////////////
                      SWAPASSETANDSENDTOVABWALLET
    //////////////////////////////////////////////////////////////*/

    function test_swapAssetAndSendToVabWalletShouldRevertIfZeroBalance() public {
        address token = address(0);
        vm.startPrank(default_user);
        vm.expectRevert("Insufficient balance");
        subscription.swapAssetAndSendToVabWallet(token);
        vm.stopPrank();
    }

    function test_swapAssetAndSendToVabWalletShouldSwapEthToUsdcAndSendToVabWallet() public {
        address token = address(0);
        uint256 contractEthBalance = 1 ether;

        deal(address(subscription), contractEthBalance);
        uint256 subscriptionStartingEthBalance = address(subscription).balance;
        assertEq(contractEthBalance, subscriptionStartingEthBalance);

        uint256 vabWalletStartingUsdcBalance = usdc.balanceOf(vabWallet);

        uint256 expectedUsdcAmount = uniHelper.expectedAmount({
            _depositAmount: contractEthBalance,
            _depositAsset: address(0),
            _incomingAsset: address(usdc)
        });

        vm.expectEmit(true, true, false, true);
        emit AssetWithdrawn(address(usdc), vabWallet, expectedUsdcAmount);

        vm.startPrank(default_user);
        vm.startSnapshotGas("swapAssetAndSendToVabWallet");
        subscription.swapAssetAndSendToVabWallet(token);
        uint256 gasUsed = vm.stopSnapshotGas();
        vm.stopPrank();

        console2.log("swapAssetAndSendToVabWallet gas", gasUsed); // 176_973

        uint256 subscriptionEndingEthBalance = address(subscription).balance;
        uint256 vabWalletEndingUsdcBalance = usdc.balanceOf(vabWallet);

        assertEq(subscriptionEndingEthBalance, 0);
        assertEq(vabWalletEndingUsdcBalance, vabWalletStartingUsdcBalance + expectedUsdcAmount);
    }

    function test_swapAssetAndSendToVabWalletShouldSwapVabToUsdcAndSendToVabWallet() public {
        address token = address(vab);
        uint256 contractVabBalance = 1000e18;

        deal(token, address(subscription), contractVabBalance);
        uint256 subscriptionStartingVabBalance = vab.balanceOf(address(subscription));
        assertEq(contractVabBalance, subscriptionStartingVabBalance);

        uint256 vabWalletStartingUsdcBalance = usdc.balanceOf(vabWallet);

        uint256 expectedUsdcAmount = uniHelper.expectedAmount({
            _depositAmount: contractVabBalance,
            _depositAsset: token,
            _incomingAsset: address(usdc)
        });

        vm.expectEmit(true, true, false, true);
        emit AssetWithdrawn(address(usdc), vabWallet, expectedUsdcAmount);

        vm.startPrank(default_user);
        vm.startSnapshotGas("swapAssetAndSendToVabWallet");
        subscription.swapAssetAndSendToVabWallet(token);
        uint256 gasUsed = vm.stopSnapshotGas();
        vm.stopPrank();

        console2.log("swapAssetAndSendToVabWallet gas", gasUsed); // 351_175

        uint256 subscriptionEndingVabBalance = vab.balanceOf(address(subscription));
        uint256 vabWalletEndingUsdcBalance = usdc.balanceOf(vabWallet);

        assertEq(subscriptionEndingVabBalance, 0);
        assertEq(vabWalletEndingUsdcBalance, vabWalletStartingUsdcBalance + expectedUsdcAmount);
    }

    function test_swapAssetAndSendToVabWalletShouldSwapAndSendUsdcBalanceToVabWallet() public {
        address token = address(vab);
        uint256 contractVabBalance = 1000e18;
        uint256 contractUsdcBalance = 2000e6;

        deal(token, address(subscription), contractVabBalance);
        deal(address(usdc), address(subscription), contractUsdcBalance);

        uint256 subscriptionStartingVabBalance = vab.balanceOf(address(subscription));
        uint256 subscriptionStartingUsdcBalance = usdc.balanceOf(address(subscription));

        assertEq(contractVabBalance, subscriptionStartingVabBalance);
        assertEq(contractUsdcBalance, subscriptionStartingUsdcBalance);

        uint256 vabWalletStartingUsdcBalance = usdc.balanceOf(vabWallet);

        uint256 expectedUsdcAmount = uniHelper.expectedAmount({
            _depositAmount: contractVabBalance,
            _depositAsset: token,
            _incomingAsset: address(usdc)
        });

        vm.expectEmit(true, true, false, true);
        emit AssetWithdrawn(address(usdc), vabWallet, expectedUsdcAmount + contractUsdcBalance);

        vm.startPrank(default_user);
        vm.startSnapshotGas("swapAssetAndSendToVabWallet");
        subscription.swapAssetAndSendToVabWallet(token);
        uint256 gasUsed = vm.stopSnapshotGas();
        vm.stopPrank();

        console2.log("swapAssetAndSendToVabWallet gas", gasUsed); // 330_207

        uint256 subscriptionEndingVabBalance = vab.balanceOf(address(subscription));
        uint256 subscriptionEndingUsdcBalance = usdc.balanceOf(address(subscription));
        uint256 vabWalletEndingUsdcBalance = usdc.balanceOf(vabWallet);

        assertEq(subscriptionEndingVabBalance, 0, "Subscription contract still has VAB");
        assertEq(subscriptionEndingUsdcBalance, 0, "Subscription contract still has USDC");
        assertEq(vabWalletEndingUsdcBalance, vabWalletStartingUsdcBalance + expectedUsdcAmount + contractUsdcBalance);
    }

    function test_swapAssetAndSendToVabWalletShouldSendUsdcBalanceToVabWallet() public {
        address token = address(usdc);
        uint256 contractUsdcBalance = 2000e6;

        deal(address(usdc), address(subscription), contractUsdcBalance);
        uint256 subscriptionStartingUsdcBalance = usdc.balanceOf(address(subscription));
        assertEq(contractUsdcBalance, subscriptionStartingUsdcBalance);
        uint256 vabWalletStartingUsdcBalance = usdc.balanceOf(vabWallet);

        vm.expectEmit(true, true, false, true);
        emit AssetWithdrawn(address(usdc), vabWallet, contractUsdcBalance);

        vm.startPrank(default_user);
        vm.startSnapshotGas("swapAssetAndSendToVabWallet");
        subscription.swapAssetAndSendToVabWallet(token);
        uint256 gasUsed = vm.stopSnapshotGas();
        vm.stopPrank();

        console2.log("swapAssetAndSendToVabWallet gas", gasUsed); // 46_411

        uint256 subscriptionEndingUsdcBalance = usdc.balanceOf(address(subscription));
        uint256 vabWalletEndingUsdcBalance = usdc.balanceOf(vabWallet);

        assertEq(subscriptionEndingUsdcBalance, 0, "Subscription contract still has USDC");
        assertEq(vabWalletEndingUsdcBalance, vabWalletStartingUsdcBalance + contractUsdcBalance);
    }
}
