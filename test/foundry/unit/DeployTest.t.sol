// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { BaseTest, console } from "../utils/BaseTest.sol";
import { HelperConfig, NetworkConfig } from "../../../scripts/foundry/HelperConfig.s.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract DeployTest is BaseTest {
    HelperConfig helperConfig;

    uint256 usdcDecimals = 6;
    uint256 vabDecimals = 18;
    uint256 usdtDecimals = 6;
    uint256 filmVotePeriod = 10 days;
    uint256 agentVotePeriod = 10 days;
    uint256 disputeGracePeriod = 30 days;
    uint256 propertyVotePeriod = 10 days;
    uint256 lockPeriod = 30 days;
    uint256 rewardRate = 25 * 1e5;
    uint256 filmRewardClaimPeriod = 30 days;
    uint256 maxAllowPeriod = 90 days;
    uint256 proposalFeeAmount = 20 * 10 ** usdcDecimals;
    uint256 fundFeePercent = 2 * 1e8;
    uint256 minDepositAmount = 50 * 10 ** usdcDecimals;
    uint256 maxDepositAmount = 5000 * 10 ** usdcDecimals;
    uint256 maxMintFeePercent = 10 * 1e8;
    uint256 minVoteCount = 1;
    uint256 minStakerCountPercent = 5 * 1e8;
    uint256 availableVABAmount = 50 * 1e6 * 10 ** vabDecimals;
    uint256 boardVotePeriod = 14 days;
    uint256 boardVoteWeight = 30 * 1e8;
    uint256 rewardVotePeriod = 7 days;
    uint256 subscriptionAmount = 299 * 10 ** usdcDecimals / 100;
    uint256 boardRewardRate = 25 * 1e8;

    function setUp() public override {
        super.setUp();
        helperConfig = new HelperConfig();
    }

    //TODO: test the setup functions more but for now this is ok to get started

    function test_deployUsdcSetup() public {
        NetworkConfig memory activeConfig = getActiveConfig();
        assertEq(IERC20Metadata(address(usdc)).decimals(), usdcDecimals);
        assertEq(address(usdc), activeConfig.usdc);
    }

    function test_deployVabSetup() public {
        NetworkConfig memory activeConfig = getActiveConfig();
        assertEq(IERC20Metadata(address(vab)).decimals(), vabDecimals);
        assertEq(address(vab), activeConfig.vab);
    }

    function test_deployUsdtSetup() public {
        NetworkConfig memory activeConfig = getActiveConfig();
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

    function test_deployUniHelperSetup() public {
        NetworkConfig memory activeConfig = getActiveConfig();

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

    function test_deployPropertySetup() public view {
        assertEq(property.filmVotePeriod(), filmVotePeriod);
        assertEq(property.agentVotePeriod(), agentVotePeriod);
        assertEq(property.disputeGracePeriod(), disputeGracePeriod);
        assertEq(property.propertyVotePeriod(), propertyVotePeriod);
        assertEq(property.lockPeriod(), lockPeriod);
        assertEq(property.rewardRate(), rewardRate);
        assertEq(property.filmRewardClaimPeriod(), filmRewardClaimPeriod);
        assertEq(property.maxAllowPeriod(), maxAllowPeriod);
        assertEq(property.proposalFeeAmount(), proposalFeeAmount);
        assertEq(property.fundFeePercent(), fundFeePercent);
        assertEq(property.minDepositAmount(), minDepositAmount);
        assertEq(property.maxDepositAmount(), maxDepositAmount);
        assertEq(property.maxMintFeePercent(), maxMintFeePercent);
        assertEq(property.minVoteCount(), minVoteCount);
        assertEq(property.minStakerCountPercent(), minStakerCountPercent);
        assertEq(property.availableVABAmount(), availableVABAmount);
        assertEq(property.boardVotePeriod(), boardVotePeriod);
        assertEq(property.boardVoteWeight(), boardVoteWeight);
        assertEq(property.rewardVotePeriod(), rewardVotePeriod);
        assertEq(property.subscriptionAmount(), subscriptionAmount);
        assertEq(property.boardRewardRate(), boardRewardRate);
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
        NetworkConfig memory activeConfig = getActiveConfig();
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
    function getActiveConfig() internal returns (NetworkConfig memory) {
        return helperConfig.getActiveNetworkConfig();
    }
}
