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
        // Array of contract names to retrieve
        string[] memory contractNames = new string[](12);
        contractNames[0] = "HelperConfig";
        contractNames[1] = "Ownablee";
        contractNames[2] = "UniHelper";
        contractNames[3] = "StakingPool";
        contractNames[4] = "Vote";
        contractNames[5] = "Property";
        contractNames[6] = "FactoryFilmNFT";
        contractNames[7] = "FactorySubNFT";
        contractNames[8] = "VabbleFund";
        contractNames[9] = "VabbleDAO";
        contractNames[10] = "FactoryTierNFT";
        contractNames[11] = "Subscription";

        // Loop through contract names and retrieve addresses
        for (uint256 i = 0; i < contractNames.length; i++) {
            address contractAddress = DevOpsTools.get_most_recent_deployment(contractNames[i], block.chainid);
            require(contractAddress != address(0), string(abi.encodePacked(contractNames[i], " not deployed")));
            console2.log(contractNames[i], contractAddress);

            // Assign to the corresponding state variable
            if (i == 0) helperConfig = contractAddress;
            else if (i == 1) ownablee = contractAddress;
            else if (i == 2) uniHelper = contractAddress;
            else if (i == 3) stakingPool = contractAddress;
            else if (i == 4) vote = contractAddress;
            else if (i == 5) property = contractAddress;
            else if (i == 6) factoryFilmNFT = contractAddress;
            else if (i == 7) factorySubNFT = contractAddress;
            else if (i == 8) vabbleFund = contractAddress;
            else if (i == 9) vabbleDAO = contractAddress;
            else if (i == 10) factoryTierNFT = contractAddress;
            else if (i == 11) subscription = contractAddress;
        }
    }

    function writeContractsToFile() internal {
        // Log each contract address before adding to inputs
        console2.log("HelperConfig:", helperConfig);
        console2.log("Ownablee:", ownablee);
        console2.log("UniHelper:", uniHelper);
        console2.log("StakingPool:", stakingPool);
        console2.log("Vote:", vote);
        console2.log("Property:", property);
        console2.log("FactoryFilmNFT:", factoryFilmNFT);
        console2.log("FactorySubNFT:", factorySubNFT);
        console2.log("VabbleFund:", vabbleFund);
        console2.log("VabbleDAO:", vabbleDAO);
        console2.log("FactoryTierNFT:", factoryTierNFT);
        console2.log("Subscription:", subscription);

        // Create smaller batches for inputs
        string[] memory inputsBatch1 = new string[](8);
        inputsBatch1[0] = "node";
        inputsBatch1[1] = "scripts/write_contracts.js";
        inputsBatch1[2] = vm.toString(ownablee);
        inputsBatch1[3] = vm.toString(uniHelper);
        inputsBatch1[4] = vm.toString(stakingPool);
        inputsBatch1[5] = vm.toString(vote);
        inputsBatch1[6] = vm.toString(property);
        inputsBatch1[7] = vm.toString(helperConfig);

        // Attempt to call vm.ffi with the first batch
        vm.ffi(inputsBatch1);

        // Create a second batch for the remaining inputs
        string[] memory inputsBatch2 = new string[](6);
        inputsBatch2[0] = "node";
        inputsBatch2[1] = "scripts/write_contracts.js";
        inputsBatch2[2] = vm.toString(factoryFilmNFT);
        inputsBatch2[3] = vm.toString(factorySubNFT);
        inputsBatch2[4] = vm.toString(vabbleFund);
        inputsBatch2[5] = vm.toString(vabbleDAO);

        // Attempt to call vm.ffi with the second batch
        vm.ffi(inputsBatch2);

        // Add a third batch for the last input
        string[] memory inputsBatch3 = new string[](3);
        inputsBatch3[0] = "node";
        inputsBatch3[1] = "scripts/write_contracts.js";
        inputsBatch3[2] = vm.toString(factoryTierNFT);
        inputsBatch3[3] = vm.toString(subscription);

        // Attempt to call vm.ffi with the third batch
        vm.ffi(inputsBatch3);
    }
}
