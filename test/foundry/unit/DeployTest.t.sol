// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { BaseTest, console } from "../utils/BaseTest.sol";
import { HelperConfig, FullConfig, NetworkConfig } from "../../../scripts/foundry/HelperConfig.s.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { ConfigLibrary } from "../../../contracts/libraries/ConfigLibrary.sol";

contract DeployTest is BaseTest {
    HelperConfig helperConfig;

    uint256 usdcDecimals = 6;
    uint256 vabDecimals = 18;
    uint256 usdtDecimals = 6;

    function setUp() public override {
        super.setUp();
        helperConfig = new HelperConfig();
    }

    //TODO: test the setup functions more but for now this is ok to get started

    function test_deployUsdcSetup() public {
        NetworkConfig memory activeConfig = getActiveConfig().networkConfig;
        assertEq(IERC20Metadata(address(usdc)).decimals(), usdcDecimals);
        assertEq(address(usdc), activeConfig.usdc);
    }

    function test_deployVabSetup() public {
        NetworkConfig memory activeConfig = getActiveConfig().networkConfig;
        assertEq(IERC20Metadata(address(vab)).decimals(), vabDecimals);
        assertEq(address(vab), activeConfig.vab);
    }

    function test_deployUsdtSetup() public {
        NetworkConfig memory activeConfig = getActiveConfig().networkConfig;
        assertEq(IERC20Metadata(address(usdt)).decimals(), usdtDecimals);
        assertEq(address(usdt), activeConfig.usdt);
    }

    function test_deployOwnableSetup() public view {
        assertEq(address(auditor), ownablee.auditor());
        assertEq(address(vabWallet), ownablee.VAB_WALLET());
        assertEq(address(vab), ownablee.PAYOUT_TOKEN());
        assertEq(address(usdc), ownablee.USDC_TOKEN());
        assertEq(address(vabbleDAO), ownablee.getVabbleDAO());
        assertEq(address(vote), ownablee.getVoteAddress());
        assertEq(address(stakingPool), ownablee.getStakingPoolAddress());
        assertEq(true, ownablee.isDepositAsset(address(usdc)));
        assertEq(true, ownablee.isDepositAsset(address(0)));
        assertEq(true, ownablee.isDepositAsset(address(vab)));
    }

    function test_forkDeployOwnableeSetupAgainstFixedValues() public view {
        assertEq(ownablee.auditor(), 0xa18DcEd8a77553a06C7AEf1aB1d37D004df0fD12);
        assertEq(ownablee.VAB_WALLET(), 0xD71D56BF0761537B69436D8D16381d78f90B827e);
    }

    function test_deployOwnableeSetupAgainstHelperConfig() public {
        FullConfig memory activeConfig = getActiveConfig();
        NetworkConfig memory networkConfig = activeConfig.networkConfig;
        
        assertEq(ownablee.auditor(), networkConfig.auditor);
        assertEq(ownablee.VAB_WALLET(), networkConfig.vabbleWallet);
        assertEq(ownablee.PAYOUT_TOKEN(), networkConfig.vab);
        assertEq(ownablee.USDC_TOKEN(), networkConfig.usdc);
        
        for (uint256 i = 0; i < networkConfig.depositAssets.length; i++) {
            assertEq(true, ownablee.isDepositAsset(networkConfig.depositAssets[i]));
        }
    }

    function test_deployUniHelperSetup() public {
        NetworkConfig memory activeConfig = getActiveConfig().networkConfig;

        address uniswapFactory = activeConfig.uniswapFactory;
        address uniswapRouter = activeConfig.uniswapRouter;

        assertEq(uniswapRouter, uniHelper.getUniswapRouter());
        assertEq(uniswapFactory, uniHelper.getUniswapFactory());
    }

    function test_deployStakingPoolSetup() public view {
        assertEq(address(ownablee), stakingPool.getOwnableAddress());
        assertEq(address(vote), stakingPool.getVoteAddress());
        assertEq(address(vabbleDAO), stakingPool.getVabbleDaoAddress());
        assertEq(address(property), stakingPool.getPropertyAddress());
    }

    /*//////////////////////////////////////////////////////////////
                           PROPERTY CONTRACT
    //////////////////////////////////////////////////////////////*/
    function test_deployPropertySetup() public {
        FullConfig memory activeConfig = getActiveConfig();
        ConfigLibrary.PropertyTimePeriodConfig memory propertyTimePeriodConfig = activeConfig.propertyTimePeriodConfig;
        ConfigLibrary.PropertyRatesConfig memory propertyRatesConfig = activeConfig.propertyRatesConfig;
        ConfigLibrary.PropertyAmountsConfig memory propertyAmountsConfig = activeConfig.propertyAmountsConfig;

        assertEq(property.filmVotePeriod(), propertyTimePeriodConfig.filmVotePeriod, "filmVotePeriod doesn't match");
        assertEq(property.agentVotePeriod(), propertyTimePeriodConfig.agentVotePeriod, "agentVotePeriod doesn't match");
        assertEq(
            property.disputeGracePeriod(),
            propertyTimePeriodConfig.disputeGracePeriod,
            "disputeGracePeriod doesn't match"
        );
        assertEq(
            property.propertyVotePeriod(),
            propertyTimePeriodConfig.propertyVotePeriod,
            "propertyVotePeriod doesn't match"
        );
        assertEq(property.lockPeriod(), propertyTimePeriodConfig.lockPeriod, "lockPeriod doesn't match");
        assertEq(property.rewardRate(), propertyRatesConfig.rewardRate, "rewardRate doesn't match");
        assertEq(
            property.filmRewardClaimPeriod(),
            propertyTimePeriodConfig.filmRewardClaimPeriod,
            "filmRewardClaimPeriod doesn't match"
        );
        assertEq(property.maxAllowPeriod(), propertyTimePeriodConfig.maxAllowPeriod, "maxAllowPeriod doesn't match");
        assertEq(
            property.proposalFeeAmount(), propertyAmountsConfig.proposalFeeAmount, "proposalFeeAmount doesn't match"
        );
        assertEq(property.fundFeePercent(), propertyRatesConfig.fundFeePercent, "fundFeePercent doesn't match");
        assertEq(property.minDepositAmount(), propertyAmountsConfig.minDepositAmount, "minDepositAmount doesn't match");
        assertEq(property.maxDepositAmount(), propertyAmountsConfig.maxDepositAmount, "maxDepositAmount doesn't match");
        assertEq(property.maxMintFeePercent(), propertyRatesConfig.maxMintFeePercent, "maxMintFeePercent doesn't match");
        assertEq(property.minVoteCount(), propertyAmountsConfig.minVoteCount, "minVoteCount doesn't match");
        assertEq(
            property.minStakerCountPercent(),
            propertyRatesConfig.minStakerCountPercent,
            "minStakerCountPercent doesn't match"
        );
        assertEq(
            property.availableVABAmount(), propertyAmountsConfig.availableVABAmount, "availableVABAmount doesn't match"
        );
        assertEq(property.boardVotePeriod(), propertyTimePeriodConfig.boardVotePeriod, "boardVotePeriod doesn't match");
        assertEq(property.boardVoteWeight(), propertyRatesConfig.boardVoteWeight, "boardVoteWeight doesn't match");
        assertEq(
            property.rewardVotePeriod(), propertyTimePeriodConfig.rewardVotePeriod, "rewardVotePeriod doesn't match"
        );
        assertEq(
            property.subscriptionAmount(), propertyAmountsConfig.subscriptionAmount, "subscriptionAmount doesn't match"
        );
        assertEq(property.boardRewardRate(), propertyRatesConfig.boardRewardRate, "boardRewardRate doesn't match");
    }

    function test_deployPropertyMinMaxSetup() public {
        FullConfig memory activeConfig = getActiveConfig();
        uint256[] memory minPropertyList = activeConfig.propertyMinMaxListConfig.minPropertyList;
        uint256[] memory maxPropertyList = activeConfig.propertyMinMaxListConfig.maxPropertyList;

        // Check all min values match
        for (uint256 i = 0; i < minPropertyList.length; i++) {
            assertEq(
                property.getMinPropertyList(i),
                minPropertyList[i],
                string.concat("Min property list mismatch at index ", vm.toString(i))
            );
        }

        // Check all max values match
        for (uint256 i = 0; i < maxPropertyList.length; i++) {
            assertEq(
                property.getMaxPropertyList(i),
                maxPropertyList[i],
                string.concat("Max property list mismatch at index ", vm.toString(i))
            );
        }
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

    function test_deployVabbleDaoSetup() public view {
        assertEq(address(ownablee), vabbleDAO.OWNABLE());
        assertEq(address(vote), vabbleDAO.VOTE());
        assertEq(address(stakingPool), vabbleDAO.STAKING_POOL());
        assertEq(address(uniHelper), vabbleDAO.UNI_HELPER());
        assertEq(address(property), vabbleDAO.DAO_PROPERTY());
        assertEq(address(vabbleFund), vabbleDAO.VABBLE_FUND());
    }

    function test_deploySubscriptionSetup() public {
        NetworkConfig memory activeConfig = getActiveConfig().networkConfig;
        uint256[] memory _discountList = subscription.getDiscountPercentList();
        assertEq(activeConfig.discountPercents[0], _discountList[0]);
        assertEq(activeConfig.discountPercents[1], _discountList[1]);
        assertEq(activeConfig.discountPercents[2], _discountList[2]);
    }

    function test_usersTokenBalance() public view {
        for (uint256 i = 0; i < users.length; i++) {
            assertEq(vab.balanceOf(address(users[i])), userInitialVabFunds);
            assertEq(usdc.balanceOf(address(users[i])), userInitialUsdcFunds);
            assertEq(usdt.balanceOf(address(users[i])), userInitialUsdtFunds);
            assertEq(address(users[i]).balance, userInitialEtherFunds);
        }
    }

    function test_usersApproval() public view {
        address[] memory _contracts = new address[](11);

        _contracts[0] = address(ownablee);
        _contracts[1] = address(uniHelper);
        _contracts[2] = address(stakingPool);
        _contracts[3] = address(vote);
        _contracts[4] = address(property);
        _contracts[5] = address(factoryFilmNFT);
        _contracts[6] = address(factorySubNFT);
        _contracts[7] = address(vabbleFund);
        _contracts[8] = address(vabbleDAO);
        _contracts[9] = address(factoryTierNFT);
        _contracts[10] = address(subscription);

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            for (uint256 j = 0; j < _contracts.length; j++) {
                address contractAddress = _contracts[j];
                assertEq(vab.allowance(user, contractAddress), type(uint256).max);
                assertEq(usdc.allowance(user, contractAddress), type(uint256).max);
                assertEq(usdt.allowance(user, contractAddress), type(uint256).max);
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function getActiveConfig() internal returns (FullConfig memory) {
        return helperConfig.getActiveNetworkConfig();
    }
}
