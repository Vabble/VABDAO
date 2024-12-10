// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { BaseForkTest, console2 } from "../utils/BaseForkTest.sol";

contract ForkSetUp is BaseForkTest {
    function testFork_FactoryFilmNftCorrectSetup() public view {
        bytes32 VABBLE_DAO_slot = bytes32(uint256(8));
        bytes32 VABBLE_FUND_slot = bytes32(uint256(9));

        bytes32 VABBLE_DAO_bytes32 = vm.load(address(factoryFilmNFT), VABBLE_DAO_slot);
        bytes32 VABBLE_FUND_bytes32 = vm.load(address(factoryFilmNFT), VABBLE_FUND_slot);

        address VABBLE_DAO = address(uint160(uint256(VABBLE_DAO_bytes32)));
        address VABBLE_FUND = address(uint160(uint256(VABBLE_FUND_bytes32)));

        assertEq(address(vabbleDAO), VABBLE_DAO);
        assertEq(address(vabbleFund), VABBLE_FUND);
    }

    function testFork_StakingPoolCorrectSetup() public view {
        bytes32 VOTE_slot = bytes32(uint256(1));
        bytes32 VABBLE_DAO_slot = bytes32(uint256(2));
        bytes32 DAO_PROPERTY_slot = bytes32(uint256(3));

        bytes32 VOTE_bytes32 = vm.load(address(stakingPool), VOTE_slot);
        bytes32 VABBLE_DAO_bytes32 = vm.load(address(stakingPool), VABBLE_DAO_slot);
        bytes32 DAO_PROPERTY_bytes32 = vm.load(address(stakingPool), DAO_PROPERTY_slot);

        address VOTE = address(uint160(uint256(VOTE_bytes32)));
        address VABBLE_DAO = address(uint160(uint256(VABBLE_DAO_bytes32)));
        address DAO_PROPERTY = address(uint160(uint256(DAO_PROPERTY_bytes32)));

        assertEq(address(vote), VOTE);
        assertEq(address(vabbleDAO), VABBLE_DAO);
        assertEq(address(property), DAO_PROPERTY);
    }

    function testFork_deployOwnableSetup() public view {
        assertEq(address(auditor), ownablee.auditor());
        assertEq(address(vabbleWallet), ownablee.VAB_WALLET());
        assertEq(address(vab), ownablee.PAYOUT_TOKEN());
        assertEq(address(usdc), ownablee.USDC_TOKEN());
        assertEq(address(vabbleDAO), ownablee.getVabbleDAO());
        assertEq(address(vote), ownablee.getVoteAddress());
        assertEq(address(stakingPool), ownablee.getStakingPoolAddress());
        assertEq(true, ownablee.isDepositAsset(address(usdc)));
        assertEq(true, ownablee.isDepositAsset(address(0)));
        assertEq(true, ownablee.isDepositAsset(address(vab)));
    }

    function testFork_forkDeployOwnableeSetupAgainstFixedValues() public view {
        assertEq(ownablee.auditor(), 0xa18DcEd8a77553a06C7AEf1aB1d37D004df0fD12);
        assertEq(ownablee.VAB_WALLET(), 0xD71D56BF0761537B69436D8D16381d78f90B827e);
    }

    function test_deployPropertyValuesAgainstFixedValues() public view {
        // Time periods
        assertEq(property.filmVotePeriod(), 600, "filmVotePeriod doesn't match");
        assertEq(property.agentVotePeriod(), 600, "agentVotePeriod doesn't match");
        assertEq(property.disputeGracePeriod(), 600, "disputeGracePeriod doesn't match");
        assertEq(property.propertyVotePeriod(), 600, "propertyVotePeriod doesn't match");
        assertEq(property.lockPeriod(), 600, "lockPeriod doesn't match");
        assertEq(property.filmRewardClaimPeriod(), 600, "filmRewardClaimPeriod doesn't match");
        assertEq(property.boardVotePeriod(), 600, "boardVotePeriod doesn't match");
        assertEq(property.rewardVotePeriod(), 600, "rewardVotePeriod doesn't match");
        assertEq(property.maxAllowPeriod(), 600, "maxAllowPeriod doesn't match");

        // Rates and percentages
        assertEq(property.rewardRate(), 2_500_000, "rewardRate doesn't match");
        assertEq(property.fundFeePercent(), 200_000_000, "fundFeePercent doesn't match");
        assertEq(property.maxMintFeePercent(), 1_000_000_000, "maxMintFeePercent doesn't match");
        assertEq(property.minStakerCountPercent(), 500_000_000, "minStakerCountPercent doesn't match");
        assertEq(property.boardVoteWeight(), 3_000_000_000, "boardVoteWeight doesn't match");
        assertEq(property.boardRewardRate(), 2_500_000_000, "boardRewardRate doesn't match");

        // Amounts
        assertEq(property.proposalFeeAmount(), 20_000_000, "proposalFeeAmount doesn't match");
        assertEq(property.minDepositAmount(), 50_000_000, "minDepositAmount doesn't match");
        assertEq(property.maxDepositAmount(), 5_000_000_000, "maxDepositAmount doesn't match");
        assertEq(property.availableVABAmount(), 1_000_000_000_000_000_000, "availableVABAmount doesn't match");
        assertEq(property.subscriptionAmount(), 2_990_000, "subscriptionAmount doesn't match");

        // Other values
        assertEq(property.minVoteCount(), 1, "minVoteCount doesn't match");
    }

    function testFork_VoteCorrectSetup() public view {
        bytes32 VABBLE_DAO_slot = bytes32(uint256(1));
        bytes32 STAKING_POOL_slot = bytes32(uint256(2));
        bytes32 DAO_PROPERTY_slot = bytes32(uint256(3));
        bytes32 UNI_HELPER_slot = bytes32(uint256(4));

        bytes32 VABBLE_DAO_bytes32 = vm.load(address(vote), VABBLE_DAO_slot);
        bytes32 STAKING_POOL_bytes32 = vm.load(address(vote), STAKING_POOL_slot);
        bytes32 DAO_PROPERTY_bytes32 = vm.load(address(vote), DAO_PROPERTY_slot);
        bytes32 UNI_HELPER_bytes32 = vm.load(address(vote), UNI_HELPER_slot);

        address VABBLE_DAO = address(uint160(uint256(VABBLE_DAO_bytes32)));
        address STAKING_POOL = address(uint160(uint256(STAKING_POOL_bytes32)));
        address DAO_PROPERTY = address(uint160(uint256(DAO_PROPERTY_bytes32)));
        address UNI_HELPER = address(uint160(uint256(UNI_HELPER_bytes32)));

        assertEq(address(vabbleDAO), VABBLE_DAO);
        assertEq(address(stakingPool), STAKING_POOL);
        assertEq(address(property), DAO_PROPERTY);
        assertEq(address(uniHelper), UNI_HELPER);
    }

    function testFork_VabbleFundCorrectSetup() public view {
        bytes32 VABBLE_DAO_slot = bytes32(uint256(1));
        bytes32 VABBLE_DAO_bytes32 = vm.load(address(vabbleFund), VABBLE_DAO_slot);
        address VABBLE_DAO = address(uint160(uint256(VABBLE_DAO_bytes32)));
        assertEq(address(vabbleDAO), VABBLE_DAO);
    }

    function testFork_UniHelperCorrectSetup() public view {
        assertEq(uniswapRouter, uniHelper.getUniswapRouter());
        assertEq(uniswapFactory, uniHelper.getUniswapFactory());
    }

    function testFork_OwnableeCorrectSetup() public {
        bytes32 VAB_WALLET_slot = bytes32(uint256(1));
        bytes32 VOTE_slot = bytes32(uint256(2));
        bytes32 VABBLE_DAO_slot = bytes32(uint256(3));
        bytes32 STAKING_POOL_slot = bytes32(uint256(4));

        bytes32 VAB_WALLET_bytes32 = vm.load(address(ownablee), VAB_WALLET_slot);
        bytes32 VOTE_bytes32 = vm.load(address(ownablee), VOTE_slot);
        bytes32 VABBLE_DAO_bytes32 = vm.load(address(ownablee), VABBLE_DAO_slot);
        bytes32 STAKING_POOL_bytes32 = vm.load(address(ownablee), STAKING_POOL_slot);

        address VAB_WALLET = address(uint160(uint256(VAB_WALLET_bytes32)));
        address VOTE = address(uint160(uint256(VOTE_bytes32)));
        address VABBLE_DAO = address(uint160(uint256(VABBLE_DAO_bytes32)));
        address STAKING_POOL = address(uint160(uint256(STAKING_POOL_bytes32)));

        assertEq(vabbleWallet, VAB_WALLET);
        assertEq(address(vote), VOTE);
        assertEq(address(vabbleDAO), VABBLE_DAO);
        assertEq(address(stakingPool), STAKING_POOL);
        assertEq(address(auditor), ownablee.auditor());
        assertEq(address(vabbleWallet), ownablee.VAB_WALLET());
        assertEq(address(vab), ownablee.PAYOUT_TOKEN());
        assertEq(address(usdc), ownablee.USDC_TOKEN());
        assertEq(address(vabbleDAO), ownablee.getVabbleDAO());
        assertEq(address(vote), ownablee.getVoteAddress());
        assertEq(address(stakingPool), ownablee.getStakingPoolAddress());
        assertEq(true, ownablee.isDepositAsset(address(usdc)));
        assertEq(true, ownablee.isDepositAsset(address(0)));
        assertEq(true, ownablee.isDepositAsset(address(vab)));

        // Prank as deployer before attempting setup
        address deployer = ownablee.deployer();
        vm.prank(deployer);

        // Test that setup fails when called again
        vm.expectRevert("setupVote: already setup");
        ownablee.setup(
            address(0x1), // New vote address
            address(0x2), // New dao address
            address(0x3) // New staking pool address
        );
    }
}
