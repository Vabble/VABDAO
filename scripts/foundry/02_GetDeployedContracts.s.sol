// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { DevOpsTools } from "lib/foundry-devops/src/DevOpsTools.sol";
import { Script } from "lib/forge-std/src/Script.sol";
import { console2 } from "lib/forge-std/src/Test.sol";

contract GetDeployedContracts is Script {
    // Storage for first batch
    address public helperConfig;
    address public ownablee;
    address public uniHelper;
    address public stakingPool;
    address public vote;
    address public property;

    // Storage for second batch
    address public factoryFilmNFT;
    address public factorySubNFT;
    address public vabbleFund;
    address public vabbleDAO;
    address public factoryTierNFT;
    address public subscription;

    string constant DEPLOYMENT_FILE = "deployed_contracts.json";

    function run() public {
        console2.log("Starting first batch of contract fetching...");
        getFirstBatchContracts();
        console2.log("\nFirst batch completed. To fetch the second batch, run the 'runSecondBatch' function.");
    }

    function getFirstBatchContracts() public {
        vm.startBroadcast();

        fetchFirstBatchAddresses();
        // writeFirstBatchFile();

        vm.stopBroadcast();
    }

    function fetchFirstBatchAddresses() internal {
        string[6] memory contractNames = ["HelperConfig", "Ownablee", "UniHelper", "StakingPool", "Vote", "Property"];

        for (uint256 i = 0; i < contractNames.length; i++) {
            address contractAddress = DevOpsTools.get_most_recent_deployment(contractNames[i], block.chainid);
            require(contractAddress != address(0), string(abi.encodePacked(contractNames[i], " not deployed")));
            console2.log(contractNames[i], contractAddress);

            if (i == 0) helperConfig = contractAddress;
            else if (i == 1) ownablee = contractAddress;
            else if (i == 2) uniHelper = contractAddress;
            else if (i == 3) stakingPool = contractAddress;
            else if (i == 4) vote = contractAddress;
            else if (i == 5) property = contractAddress;
        }
    }

    function runSecondBatch() public {
        vm.startBroadcast();
        console2.log("Starting second batch of contract fetching...");

        fetchSecondBatchAddresses();
        // writeSecondBatchFile();

        vm.stopBroadcast();
    }

    function fetchSecondBatchAddresses() internal {
        string[6] memory contractNames =
            ["FactoryFilmNFT", "FactorySubNFT", "VabbleFund", "VabbleDAO", "FactoryTierNFT", "Subscription"];

        for (uint256 i = 0; i < contractNames.length; i++) {
            address contractAddress = DevOpsTools.get_most_recent_deployment(contractNames[i], block.chainid);
            require(contractAddress != address(0), string(abi.encodePacked(contractNames[i], " not deployed")));
            console2.log(contractNames[i], contractAddress);

            if (i == 0) factoryFilmNFT = contractAddress;
            else if (i == 1) factorySubNFT = contractAddress;
            else if (i == 2) vabbleFund = contractAddress;
            else if (i == 3) vabbleDAO = contractAddress;
            else if (i == 4) factoryTierNFT = contractAddress;
            else if (i == 5) subscription = contractAddress;
        }
    }

    // function writeFirstBatchFile() internal {
    //     string memory part1 = string(
    //         abi.encodePacked(
    //             '{\n',
    //             '    "helperConfig": "', vm.toString(helperConfig), '",\n',
    //             '    "ownablee": "', vm.toString(ownablee), '",\n',
    //             '    "uniHelper": "', vm.toString(uniHelper), '",\n'
    //         )
    //     );

    //     string memory part2 = string(
    //         abi.encodePacked(
    //             '    "stakingPool": "', vm.toString(stakingPool), '",\n',
    //             '    "vote": "', vm.toString(vote), '",\n',
    //             '    "property": "', vm.toString(property), '"\n}'
    //         )
    //     );

    //     vm.writeFile(DEPLOYMENT_FILE, string(abi.encodePacked(part1, part2)));
    //     console2.log("First batch written to deployed_contracts.json");
    // }

    // function writeSecondBatchFile() internal {
    //     string memory part1 = string(
    //         abi.encodePacked(
    //             '{\n',
    //             '    "helperConfig": "', vm.toString(helperConfig), '",\n',
    //             '    "ownablee": "', vm.toString(ownablee), '",\n',
    //             '    "uniHelper": "', vm.toString(uniHelper), '",\n',
    //             '    "stakingPool": "', vm.toString(stakingPool), '",\n'
    //         )
    //     );

    //     string memory part2 = string(
    //         abi.encodePacked(
    //             '    "vote": "', vm.toString(vote), '",\n',
    //             '    "property": "', vm.toString(property), '",\n',
    //             '    "factoryFilmNFT": "', vm.toString(factoryFilmNFT), '",\n',
    //             '    "factorySubNFT": "', vm.toString(factorySubNFT), '",\n'
    //         )
    //     );

    //     string memory part3 = string(
    //         abi.encodePacked(
    //             '    "vabbleFund": "', vm.toString(vabbleFund), '",\n',
    //             '    "vabbleDAO": "', vm.toString(vabbleDAO), '",\n',
    //             '    "factoryTierNFT": "', vm.toString(factoryTierNFT), '",\n',
    //             '    "subscription": "', vm.toString(subscription), '"\n}'
    //         )
    //     );

    //     vm.writeFile(DEPLOYMENT_FILE, string(abi.encodePacked(part1, part2, part3)));
    //     console2.log("All contracts written to deployed_contracts.json");
    // }
}
