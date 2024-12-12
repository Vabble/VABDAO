// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { BaseForkTest, console2 } from "../utils/BaseForkTest.sol";
import { FundContracts } from "../../../scripts/foundry/03_FundContracts.s.sol";
import { StakingPool } from "../../../contracts/dao/StakingPool.sol";
import { Ownablee } from "../../../contracts/dao/Ownablee.sol";

contract ScriptFundContractsTest is BaseForkTest {
    FundContracts private fundContracts;

    function setUp() public override {
        super.setUp();
        fundContracts = new FundContracts();
    }

    function test_Script_AddRewardsToStakingPool() public {
        address scriptExecutor = deployer;
        uint256 initialStakingPoolBalance = vab.balanceOf(address(stakingPool));

        uint256 stakingPoolFundAmount = activeNetworkConfig.stakingPoolFundAmount;
        deal(address(vab), scriptExecutor, stakingPoolFundAmount);
        uint256 scriptExecutorBalanceAfterDeal = vab.balanceOf(scriptExecutor);

        assertEq(
            scriptExecutorBalanceAfterDeal,
            stakingPoolFundAmount,
            "Script executor balance should increase by the added amount"
        );

        vm.startPrank(scriptExecutor);
        fundContracts.simulateScript(FundContracts.FundingOption.STAKING_POOL);
        vm.stopPrank();

        uint256 scriptExecutorBalanceAfterScript = vab.balanceOf(scriptExecutor);

        assertEq(scriptExecutorBalanceAfterScript, 0, "Script executor balance should be 0 after the script");

        assertEq(
            vab.balanceOf(address(stakingPool)),
            initialStakingPoolBalance + stakingPoolFundAmount,
            "StakingPool balance should increase by the added amount"
        );
    }

    function test_Script_AddRewardsToEdgePool() public {
        address scriptExecutor = deployer;
        uint256 initialEdgePoolBalance = vab.balanceOf(address(ownablee));

        uint256 edgePoolFundAmount = activeNetworkConfig.edgePoolFundAmount;
        deal(address(vab), scriptExecutor, edgePoolFundAmount);
        uint256 scriptExecutorBalanceAfterDeal = vab.balanceOf(scriptExecutor);

        assertEq(
            scriptExecutorBalanceAfterDeal,
            edgePoolFundAmount,
            "Script executor balance should increase by the added amount"
        );

        vm.startPrank(scriptExecutor);
        fundContracts.simulateScript(FundContracts.FundingOption.EDGE_POOL);
        vm.stopPrank();

        uint256 scriptExecutorBalanceAfterScript = vab.balanceOf(scriptExecutor);

        assertEq(scriptExecutorBalanceAfterScript, 0, "Script executor balance should be 0 after the script");

        assertEq(
            vab.balanceOf(address(ownablee)),
            initialEdgePoolBalance + edgePoolFundAmount,
            "EdgePool balance should increase by the added amount"
        );
    }

    function test_Script_AddRewardsToBothPools() public {
        address scriptExecutor = deployer;
        uint256 initialEdgePoolBalance = vab.balanceOf(address(ownablee));
        uint256 initialStakingPoolBalance = vab.balanceOf(address(stakingPool));

        uint256 edgePoolFundAmount = activeNetworkConfig.edgePoolFundAmount;
        uint256 stakingPoolFundAmount = activeNetworkConfig.stakingPoolFundAmount;
        deal(address(vab), scriptExecutor, edgePoolFundAmount + stakingPoolFundAmount);
        uint256 scriptExecutorBalanceAfterDeal = vab.balanceOf(scriptExecutor);

        assertEq(
            scriptExecutorBalanceAfterDeal,
            edgePoolFundAmount + stakingPoolFundAmount,
            "Script executor balance should increase by the added amount"
        );

        vm.startPrank(scriptExecutor);
        fundContracts.simulateScript(FundContracts.FundingOption.BOTH);
        vm.stopPrank();

        uint256 scriptExecutorBalanceAfterScript = vab.balanceOf(scriptExecutor);

        assertEq(scriptExecutorBalanceAfterScript, 0, "Script executor balance should be 0 after the script");

        assertEq(
            vab.balanceOf(address(ownablee)),
            initialEdgePoolBalance + edgePoolFundAmount,
            "EdgePool balance should increase by the added amount"
        );

        assertEq(
            vab.balanceOf(address(stakingPool)),
            initialStakingPoolBalance + stakingPoolFundAmount,
            "StakingPool balance should increase by the added amount"
        );
    }

    function test_Script_AddRewardsToStakingPool_InsufficientVab() public {
        address scriptExecutor = deployer;
        uint256 insufficientVabAmount = 1;
        deal(address(vab), scriptExecutor, insufficientVabAmount);

        vm.startPrank(scriptExecutor);
        vm.expectRevert(FundContracts.FundContracts__InsufficientVab.selector);
        fundContracts.simulateScript(FundContracts.FundingOption.STAKING_POOL);
        vm.stopPrank();
    }

    function test_Script_AddRewardsToEdgePool_InsufficientVab() public {
        address scriptExecutor = deployer;
        uint256 insufficientVabAmount = 1;
        deal(address(vab), scriptExecutor, insufficientVabAmount);

        vm.startPrank(scriptExecutor);
        vm.expectRevert(FundContracts.FundContracts__InsufficientVab.selector);
        fundContracts.simulateScript(FundContracts.FundingOption.EDGE_POOL);
        vm.stopPrank();
    }

    function test_Script_AddRewardsToBothPools_InsufficientVab() public {
        address scriptExecutor = deployer;
        uint256 insufficientVabAmount = 1;
        deal(address(vab), scriptExecutor, insufficientVabAmount);

        vm.startPrank(scriptExecutor);
        vm.expectRevert(FundContracts.FundContracts__InsufficientVab.selector);
        fundContracts.simulateScript(FundContracts.FundingOption.BOTH);
        vm.stopPrank();
    }
}
