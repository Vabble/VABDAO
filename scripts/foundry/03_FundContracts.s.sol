// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { DevOpsTools } from "lib/foundry-devops/src/DevOpsTools.sol";
import { StakingPool } from "../../contracts/dao/StakingPool.sol";
import { Ownablee } from "../../contracts/dao/Ownablee.sol";
import { HelperConfig, NetworkConfig } from "./HelperConfig.s.sol";
import { Script } from "lib/forge-std/src/Script.sol";
import { console2 } from "lib/forge-std/src/Test.sol";
import { IERC20 } from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/**
 * @title A Foundry script to fund the StakingPool and Ownablee contract with necessary VAB tokens
 */
contract FundContracts is Script {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/
    error FundContracts__InsufficientVab();
    error FundContracts__InsufficientAllowance();
    error FundContracts__InsufficientAmount();
    error FundContracts__InvalidOption();

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    NetworkConfig private activeNetworkConfig;

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev This is the main function of this script and lets you choose where you want to add VAB
     * @notice You need to type in a valid option in your terminal when executing this
     */
    function run() public {
        vm.startBroadcast();
        getHelperConfig();
        string memory option =
            vm.prompt("Where do you want to add VAB to? Available Options: StakingPool, EdgePool, Both");
        if (compareStrings(option, "StakingPool")) {
            addRewardsToStakingPool();
        } else if (compareStrings(option, "EdgePool")) {
            addVabToEdgePool();
        } else if (compareStrings(option, "Both")) {
            addRewardsToStakingPool();
            addVabToEdgePool();
        } else {
            revert("InvalidOption: Please select a valid option: StakingPool, EdgePool, or Both");
        }
        vm.stopBroadcast();
    }

    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }

    /**
     * @notice You need to enter the staking pool reward amount in wei in your terminal when executing this
     * @dev Adds rewards to the most recent deployed staking pool contract, make sure you have set your DEPLOYER_ADDRESS
     * in the .env file and that the wallet has enough VAB
     */
    function addRewardsToStakingPool() internal {
        NetworkConfig memory _activeNetworkConfig = activeNetworkConfig;
        IERC20 vab = IERC20(_activeNetworkConfig.vab);
        uint256 _stakingPoolRewardAmount = vm.parseUint(vm.prompt("enter staking pool reward amount in wei"));

        if (vab.balanceOf(msg.sender) < _stakingPoolRewardAmount) {
            revert FundContracts__InsufficientVab();
        }

        address contractAddress = DevOpsTools.get_most_recent_deployment("StakingPool", block.chainid);
        console2.log("Adding rewards to staking pool: ", vm.toString(contractAddress));
        StakingPool stakingPool = StakingPool(contractAddress);

        vab.approve(address(stakingPool), _stakingPoolRewardAmount);

        if (vab.allowance(msg.sender, address(stakingPool)) < _stakingPoolRewardAmount) {
            revert FundContracts__InsufficientAllowance();
        }
        uint256 totalRewardAmountBefore = stakingPool.totalRewardAmount();
        stakingPool.addRewardToPool(_stakingPoolRewardAmount);
        uint256 totalRewardAmountAfter = stakingPool.totalRewardAmount();

        if (totalRewardAmountAfter != totalRewardAmountBefore + _stakingPoolRewardAmount) {
            revert FundContracts__InsufficientAmount();
        }
    }

    /**
     * @notice You need to enter the VAB amount you want to add in wei in your terminal when executing this
     * @dev Adds VAB to the most recent deployed ownablee contract, make sure you have set your DEPLOYER_ADDRESS
     * in the .env file and that the wallet has enough VAB
     */
    function addVabToEdgePool() internal {
        NetworkConfig memory _activeNetworkConfig = activeNetworkConfig;
        IERC20 vab = IERC20(_activeNetworkConfig.vab);
        uint256 _edgePoolAmount = vm.parseUint(vm.prompt("enter edge pool amount in wei"));

        if (vab.balanceOf(msg.sender) < _edgePoolAmount) {
            revert FundContracts__InsufficientVab();
        }

        address contractAddress = DevOpsTools.get_most_recent_deployment("Ownablee", block.chainid);
        console2.log("Adding VAB to Edge Pool (Ownablee contract): ", vm.toString(contractAddress));
        Ownablee ownablee = Ownablee(contractAddress);

        vab.approve(address(ownablee), _edgePoolAmount);

        if (vab.allowance(msg.sender, address(ownablee)) < _edgePoolAmount) {
            revert FundContracts__InsufficientAllowance();
        }

        uint256 totalAmountBefore = vab.balanceOf(address(ownablee));
        vab.transfer(address(ownablee), _edgePoolAmount);
        uint256 totalAmountAfter = vab.balanceOf(address(ownablee));

        if (totalAmountAfter != totalAmountBefore + _edgePoolAmount) {
            revert FundContracts__InsufficientAmount();
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
