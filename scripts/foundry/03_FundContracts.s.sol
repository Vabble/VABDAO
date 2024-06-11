// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { DevOpsTools } from "lib/foundry-devops/src/DevOpsTools.sol";
import { StakingPool } from "../../contracts/dao/StakingPool.sol";
import { HelperConfig, NetworkConfig } from "./HelperConfig.s.sol";
import { Script } from "lib/forge-std/src/Script.sol";
import { console2 } from "lib/forge-std/src/Test.sol";
import { IERC20 } from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/**
 * @title A Foundry script to fund the StakingPool and VabbleDAO contract with necessary VAB tokens
 */
contract FundContracts is Script {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/
    error FundContracts__InsufficientVab();
    error FundContracts__InsufficientAllowance();
    error FundContracts__InsufficientRewardAmount();

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    uint256 private stakingPoolRewardAmount = 1e18;
    NetworkConfig private activeNetworkConfig;

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function run() public {
        vm.startBroadcast();
        getHelperConfig();
        addRewardsToStakingPool();
        vm.stopBroadcast();
    }

    /**
     * @dev Adds rewards to the most recent deployed staking pool contract, make sure you have set your DEPLOYER_ADDRESS
     * in the .env file and that the wallet has enough VAB
     */
    function addRewardsToStakingPool() internal {
        NetworkConfig memory _activeNetworkConfig = activeNetworkConfig;
        IERC20 vab = IERC20(_activeNetworkConfig.vab);
        uint256 _stakingPoolRewardAmount = stakingPoolRewardAmount;

        if (vab.balanceOf(msg.sender) < _stakingPoolRewardAmount) {
            revert FundContracts__InsufficientVab();
        }

        address contractAddress = DevOpsTools.get_most_recent_deployment("StakingPool", block.chainid);
        StakingPool stakingPool = StakingPool(contractAddress);

        vab.approve(address(stakingPool), _stakingPoolRewardAmount);

        if (vab.allowance(msg.sender, address(stakingPool)) < _stakingPoolRewardAmount) {
            revert FundContracts__InsufficientAllowance();
        }

        stakingPool.addRewardToPool(_stakingPoolRewardAmount);

        if (stakingPool.totalRewardAmount() != _stakingPoolRewardAmount) {
            revert FundContracts__InsufficientRewardAmount();
        }
    }

    /**
     * @dev Get the active network configuration
     */
    function getHelperConfig() internal {
        address contractAddress = DevOpsTools.get_most_recent_deployment("HelperConfig", block.chainid);
        HelperConfig helperConfig = HelperConfig(contractAddress);
        activeNetworkConfig = helperConfig.getActiveNetworkConfig();
    }
}
