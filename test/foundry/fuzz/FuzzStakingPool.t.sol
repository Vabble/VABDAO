// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { BaseTest, console2 } from "../utils/BaseTest.sol";
import { StakingPool } from "../../../contracts/dao/StakingPool.sol";

contract FuzzStakingPool is BaseTest {
    uint256 minStakeAmount = 1e18;

    function setUp() public override {
        super.setUp();
    }

    function testFuzz_stakeVab(uint256 stakeAmount) public {
        if (stakeAmount <= minStakeAmount) {
            return;
        }
        stakeAmount = bound(stakeAmount, minStakeAmount + 1, vab.balanceOf(staker_one));

        vm.startPrank(staker_one);
        stakingPool.stakeVAB(stakeAmount);
        vm.stopPrank();

        uint256 _totalStakingAmount = stakingPool.totalStakingAmount();
        uint256 userStakeAmount = stakingPool.getStakeAmount(staker_one);

        assertEq(_totalStakingAmount, stakeAmount);
        assertEq(userStakeAmount, stakeAmount);
    }
}
