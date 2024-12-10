// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { DevOpsTools } from "lib/foundry-devops/src/DevOpsTools.sol";
import { Script } from "lib/forge-std/src/Script.sol";
import { console2 } from "lib/forge-std/src/Test.sol";

contract GetDeployedContracts is Script {
    function run() public {
        console2.log("Getting HelperConfig address...");
        getHelperConfig();
    }

    function getHelperConfig() public view {
        fetchContract("HelperConfig");
    }

    function getOwnablee() public view {
        fetchContract("Ownablee");
    }

    function getUniHelper() public view {
        fetchContract("UniHelper");
    }

    function getStakingPool() public view {
        fetchContract("StakingPool");
    }

    function getVote() public view {
        fetchContract("Vote");
    }

    function getProperty() public view {
        fetchContract("Property");
    }

    function getFactoryFilmNFT() public view {
        fetchContract("FactoryFilmNFT");
    }

    function getFactorySubNFT() public view {
        fetchContract("FactorySubNFT");
    }

    function getVabbleFund() public view {
        fetchContract("VabbleFund");
    }

    function getVabbleDAO() public view {
        fetchContract("VabbleDAO");
    }

    function getFactoryTierNFT() public view {
        fetchContract("FactoryTierNFT");
    }

    function getSubscription() public view {
        fetchContract("Subscription");
    }

    function fetchContract(string memory contractName) internal view {
        address contractAddress = DevOpsTools.get_most_recent_deployment(contractName, block.chainid);
        require(contractAddress != address(0), string(abi.encodePacked(contractName, " not deployed")));
        console2.log(contractName, contractAddress);
    }

    function getFirstBatch() public view {
        console2.log("\n=== Fetching first batch of contracts ===\n");
        getHelperConfig();
        getOwnablee();
        getUniHelper();
        getStakingPool();
    }

    function getSecondBatch() public view {
        console2.log("\n=== Fetching second batch of contracts ===\n");
        getVote();
        getProperty();
        getFactoryFilmNFT();
        getFactorySubNFT();
    }

    function getThirdBatch() public view {
        console2.log("\n=== Fetching third batch of contracts ===\n");
        getVabbleFund();
        getVabbleDAO();
        getFactoryTierNFT();
        getSubscription();
    }
}
