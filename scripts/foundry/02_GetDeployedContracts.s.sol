// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { DevOpsTools } from "lib/foundry-devops/src/DevOpsTools.sol";
import { StakingPool } from "../../contracts/dao/StakingPool.sol";
import { HelperConfig, NetworkConfig } from "./HelperConfig.s.sol";
import { Script } from "lib/forge-std/src/Script.sol";
import { console2 } from "lib/forge-std/src/Test.sol";

/**
 * @title A Foundry script to get the latest deployed contracts
 * @dev This script only gets the addresses of the latest deployed contracts from the broadcast folder and writes them
 * to a file called "deployed_contracts.json"
 */
contract GetDeployedContracts is Script {
    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    address helperConfig;
    address ownablee;
    address uniHelper;
    address stakingPool;
    address vote;
    address property;
    address factoryFilmNFT;
    address factorySubNFT;
    address vabbleFund;
    address vabbleDAO;
    address factoryTierNFT;
    address subscription;

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function run() public {
        vm.startBroadcast();
        getAllContracts();
        writeContractsToFile();
        vm.stopBroadcast();
    }

    function getAllContracts() internal {
        helperConfig = DevOpsTools.get_most_recent_deployment("HelperConfig", block.chainid);
        ownablee = DevOpsTools.get_most_recent_deployment("Ownablee", block.chainid);
        uniHelper = DevOpsTools.get_most_recent_deployment("UniHelper", block.chainid);
        stakingPool = DevOpsTools.get_most_recent_deployment("StakingPool", block.chainid);
        vote = DevOpsTools.get_most_recent_deployment("Vote", block.chainid);
        property = DevOpsTools.get_most_recent_deployment("Property", block.chainid);
        factoryFilmNFT = DevOpsTools.get_most_recent_deployment("FactoryFilmNFT", block.chainid);
        factorySubNFT = DevOpsTools.get_most_recent_deployment("FactorySubNFT", block.chainid);
        vabbleFund = DevOpsTools.get_most_recent_deployment("VabbleFund", block.chainid);
        vabbleDAO = DevOpsTools.get_most_recent_deployment("VabbleDAO", block.chainid);
        factoryTierNFT = DevOpsTools.get_most_recent_deployment("FactoryTierNFT", block.chainid);
        subscription = DevOpsTools.get_most_recent_deployment("Subscription", block.chainid);
    }

    function writeContractsToFile() internal {
        string[] memory inputs = new string[](14);
        inputs[0] = "node";
        inputs[1] = "scripts/write_contracts.js";
        inputs[2] = vm.toString(ownablee);
        inputs[3] = vm.toString(uniHelper);
        inputs[4] = vm.toString(stakingPool);
        inputs[5] = vm.toString(vote);
        inputs[6] = vm.toString(property);
        inputs[7] = vm.toString(factoryFilmNFT);
        inputs[8] = vm.toString(factorySubNFT);
        inputs[9] = vm.toString(vabbleFund);
        inputs[10] = vm.toString(vabbleDAO);
        inputs[11] = vm.toString(factoryTierNFT);
        inputs[12] = vm.toString(subscription);
        inputs[13] = vm.toString(helperConfig);

        vm.ffi(inputs);
    }
}
