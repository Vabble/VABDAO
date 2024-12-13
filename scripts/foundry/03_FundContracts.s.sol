// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { DevOpsTools } from "lib/foundry-devops/src/DevOpsTools.sol";
import { StakingPool } from "../../contracts/dao/StakingPool.sol";
import { Ownablee } from "../../contracts/dao/Ownablee.sol";
import { HelperConfig, NetworkConfig } from "./HelperConfig.s.sol";
import { Script } from "lib/forge-std/src/Script.sol";
import { console2 } from "lib/forge-std/src/Test.sol";
import { IERC20 } from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { IERC20Metadata } from "lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { CodeConstants } from "./HelperConfig.s.sol";

/**
 * /**
 * @title A Foundry script to fund the StakingPool and Ownablee contract with necessary VAB tokens
 */
contract FundContracts is CodeConstants, Script {
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

    enum FundingOption {
        STAKING_POOL,
        EDGE_POOL,
        BOTH
    }

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev This is a test function to test the script
     * @notice Only use this for testing purposes
     */
    function simulateScript(FundingOption option) external {
        vm.startPrank(msg.sender);
        getHelperConfig();
        executeFunding(option, true);
        vm.stopPrank();
    }

    /**
     * @dev This is the main function of this script and lets you choose where you want to add VAB
     * @notice You need to type in a valid option in your terminal when executing this
     */
    function run() public {
        vm.startBroadcast();
        getHelperConfig();

        string memory option = vm.prompt(
            "Where do you want to add tokens to? Available case sensitive options: StakingPool, EdgePool, Both"
        );
        FundingOption fundingOption = parseOption(option);

        executeFunding(fundingOption, false);
        vm.stopBroadcast();
    }

    function parseOption(string memory option) internal pure returns (FundingOption) {
        if (compareStrings(option, "StakingPool")) return FundingOption.STAKING_POOL;
        if (compareStrings(option, "EdgePool")) return FundingOption.EDGE_POOL;
        if (compareStrings(option, "Both")) return FundingOption.BOTH;
        revert FundContracts__InvalidOption();
    }

    function executeFunding(FundingOption option, bool skipPrompt) internal {
        if (option == FundingOption.STAKING_POOL) {
            addRewardsToStakingPool(skipPrompt);
        } else if (option == FundingOption.EDGE_POOL) {
            addVabToEdgePool(skipPrompt);
        } else if (option == FundingOption.BOTH) {
            addRewardsToStakingPool(skipPrompt);
            addVabToEdgePool(skipPrompt);
        }
    }

    /**
     * @notice You need to enter the staking pool reward amount in wei in your terminal when executing this
     * @dev Adds rewards to the most recent deployed staking pool contract, make sure you have set your DEPLOYER_ADDRESS
     * in the .env file and that the wallet has enough VAB
     */
    function addRewardsToStakingPool(bool skipPrompt) internal {
        NetworkConfig memory _activeNetworkConfig = activeNetworkConfig;
        uint256 stakingPoolFundAmount = _activeNetworkConfig.stakingPoolFundAmount;

        IERC20 vab = IERC20(_activeNetworkConfig.vab);
        address contractAddress = DevOpsTools.get_most_recent_deployment("StakingPool", block.chainid);

        string memory promptMessage = string.concat(
            "You are adding rewards on chain ",
            vm.toString(block.chainid),
            " to the StakingPool contract: ",
            vm.toString(contractAddress),
            " Amount: ",
            vm.toString(stakingPoolFundAmount / VAB_DECIMAL_MULTIPLIER),
            " ",
            IERC20Metadata(address(vab)).symbol(),
            ". Make sure you have enough tokens in your wallet! Hit Enter to continue"
        );

        if (!skipPrompt) {
            vm.prompt(promptMessage);
        } else {
            console2.log(promptMessage);
        }

        if (vab.balanceOf(msg.sender) < stakingPoolFundAmount) {
            revert FundContracts__InsufficientVab();
        }

        StakingPool stakingPool = StakingPool(contractAddress);

        vab.approve(address(stakingPool), stakingPoolFundAmount);

        if (vab.allowance(msg.sender, address(stakingPool)) < stakingPoolFundAmount) {
            revert FundContracts__InsufficientAllowance();
        }

        uint256 totalRewardAmountBefore = stakingPool.totalRewardAmount();
        stakingPool.addRewardToPool(stakingPoolFundAmount);
        uint256 totalRewardAmountAfter = stakingPool.totalRewardAmount();

        if (totalRewardAmountAfter != totalRewardAmountBefore + stakingPoolFundAmount) {
            revert FundContracts__InsufficientAmount();
        }
    }

    /**
     * @notice You need to enter the VAB amount you want to add in wei in your terminal when executing this
     * @dev Adds VAB to the most recent deployed ownablee contract, make sure you have set your DEPLOYER_ADDRESS
     * in the .env file and that the wallet has enough VAB
     */
    function addVabToEdgePool(bool skipPrompt) internal {
        NetworkConfig memory _activeNetworkConfig = activeNetworkConfig;
        IERC20 vab = IERC20(_activeNetworkConfig.vab);
        uint256 edgePoolFundAmount = _activeNetworkConfig.edgePoolFundAmount;

        if (vab.balanceOf(msg.sender) < edgePoolFundAmount) {
            revert FundContracts__InsufficientVab();
        }

        address contractAddress = DevOpsTools.get_most_recent_deployment("Ownablee", block.chainid);

        string memory promptMessage = string.concat(
            "You are adding rewards on chain ",
            vm.toString(block.chainid),
            " to the Ownablee contract: ",
            vm.toString(contractAddress),
            " Amount: ",
            vm.toString(edgePoolFundAmount / VAB_DECIMAL_MULTIPLIER),
            " ",
            IERC20Metadata(address(vab)).symbol(),
            ". Make sure you have enough tokens in your wallet! Hit Enter to continue"
        );

        if (!skipPrompt) {
            vm.prompt(promptMessage);
        } else {
            console2.log(promptMessage);
        }

        Ownablee ownablee = Ownablee(contractAddress);

        vab.approve(address(ownablee), edgePoolFundAmount);

        if (vab.allowance(msg.sender, address(ownablee)) < edgePoolFundAmount) {
            revert FundContracts__InsufficientAllowance();
        }

        uint256 totalAmountBefore = vab.balanceOf(address(ownablee));
        vab.transfer(address(ownablee), edgePoolFundAmount);
        uint256 totalAmountAfter = vab.balanceOf(address(ownablee));

        if (totalAmountAfter != totalAmountBefore + edgePoolFundAmount) {
            revert FundContracts__InsufficientAmount();
        }
    }

    /**
     * @dev Get the active network configuration
     */
    function getHelperConfig() internal {
        HelperConfig helperConfig = new HelperConfig();
        activeNetworkConfig = helperConfig.getActiveNetworkConfig().networkConfig;
    }

    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }
}
