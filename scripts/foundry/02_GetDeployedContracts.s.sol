// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { DevOpsTools } from "lib/foundry-devops/src/DevOpsTools.sol";
import { Script } from "lib/forge-std/src/Script.sol";
import { console2 } from "lib/forge-std/src/Test.sol";

contract GetDeployedContracts is Script {
    function run() public {
        vm.pauseGasMetering();
        getAllContracts();
    }

    function getHelperConfig(bool suppressLogs) public view returns (address) {
        return fetchContract("HelperConfig", suppressLogs);
    }

    function getOwnablee(bool suppressLogs) public view returns (address) {
        return fetchContract("Ownablee", suppressLogs);
    }

    function getUniHelper(bool suppressLogs) public view returns (address) {
        return fetchContract("UniHelper", suppressLogs);
    }

    function getStakingPool(bool suppressLogs) public view returns (address) {
        return fetchContract("StakingPool", suppressLogs);
    }

    function getVote(bool suppressLogs) public view returns (address) {
        return fetchContract("Vote", suppressLogs);
    }

    function getProperty(bool suppressLogs) public view returns (address) {
        return fetchContract("Property", suppressLogs);
    }

    function getFactoryFilmNFT(bool suppressLogs) public view returns (address) {
        return fetchContract("FactoryFilmNFT", suppressLogs);
    }

    function getFactorySubNFT(bool suppressLogs) public view returns (address) {
        return fetchContract("FactorySubNFT", suppressLogs);
    }

    function getVabbleFund(bool suppressLogs) public view returns (address) {
        return fetchContract("VabbleFund", suppressLogs);
    }

    function getVabbleDAO(bool suppressLogs) public view returns (address) {
        return fetchContract("VabbleDAO", suppressLogs);
    }

    function getFactoryTierNFT(bool suppressLogs) public view returns (address) {
        return fetchContract("FactoryTierNFT", suppressLogs);
    }

    function getSubscription(bool suppressLogs) public view returns (address) {
        return fetchContract("Subscription", suppressLogs);
    }

    function fetchContract(string memory contractName, bool suppressLogs) internal view returns (address) {
        address contractAddress = DevOpsTools.get_most_recent_deployment(contractName, block.chainid);
        require(contractAddress != address(0), string(abi.encodePacked(contractName, " not deployed")));
        if (!suppressLogs) {
            console2.log(contractName, contractAddress);
        }
        return contractAddress;
    }

    function getAllContracts() public view {
        console2.log("\n=== Fetching all contracts ===\n");
        getHelperConfig(false);
        getOwnablee(false);
        getUniHelper(false);
        getStakingPool(false);
        getVote(false);
        getProperty(false);
        getFactoryFilmNFT(false);
        getFactorySubNFT(false);
        getVabbleFund(false);
        getVabbleDAO(false);
        getFactoryTierNFT(false);
        getSubscription(false);
    }
}
