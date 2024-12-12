// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Script } from "lib/forge-std/src/Script.sol";
import { console2 } from "lib/forge-std/src/Test.sol";
import { Vm } from "lib/forge-std/src/Vm.sol";
import { Vote } from "../../contracts/dao/Vote.sol";
import { VabbleDAO } from "../../contracts/dao/VabbleDAO.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "lib/forge-std/src/StdJson.sol";
import "../../contracts/libraries/Helper.sol";
import "../../contracts/interfaces/IVabbleDAO.sol";

contract GetVoteInfoForFilmProposals is Script {
    // Vote = 0xa44ddcae6eb91359cab6d8d52d14cf0ff0784ab3
    // Vabble DAO = 0x570e503d3C75D92fB3A39dDE912d3f0429a10414

    struct Voting {
        uint256 stakeAmount_1; // staking amount of voter with status(yes)
        uint256 stakeAmount_2; // staking amount of voter with status(no)
        uint256 voteCount_1; // number of accumulated votes(yes)
        uint256 voteCount_2; // number of accumulated votes(no)
    }

    using stdJson for string;

    Vote voteContract;
    VabbleDAO vabbleDAO;

    string private root;

    function setUp() public {
        root = vm.projectRoot();
    }

    function run() public {
        console2.log("Chain Id:", block.chainid);
        vm.startBroadcast();

        string memory voteContractAddress = vm.prompt(
            string.concat(
                "Enter the Vote contract address you want to fetch vote data from (Chain ID: ",
                Strings.toString(block.chainid),
                ")"
            )
        );

        string memory vabbleDAOAddress = vm.prompt(
            string.concat(
                "Enter the VabbleDAO contract address related to the Vote contract (Chain ID: ",
                Strings.toString(block.chainid),
                ")"
            )
        );

        voteContract = Vote(payable(vm.parseAddress(voteContractAddress)));
        vabbleDAO = VabbleDAO(payable(vm.parseAddress(vabbleDAOAddress)));

        // Get total film count
        uint256 filmCount = vabbleDAO.filmCount();

        // Keep track of successfully processed films
        uint256 processedFilms = 0;

        // Create array to store all film data
        string memory finalJson = "[";

        // Fetch vote data for each film starting from 1 (filmId starts from 1)
        for (uint256 i = 1; i <= filmCount; i++) {
            try voteContract.filmVoting(i) returns (
                uint256 stakeAmount_1, uint256 stakeAmount_2, uint256 voteCount_1, uint256 voteCount_2
            ) {
                // Store vote data in struct
                Voting memory voteData = Voting({
                    stakeAmount_1: stakeAmount_1,
                    stakeAmount_2: stakeAmount_2,
                    voteCount_1: voteCount_1,
                    voteCount_2: voteCount_2
                });

                // Build the JSON object for each film
                string memory voteJson = buildVoteJson(voteData);
                finalJson = string.concat(finalJson, processedFilms > 0 ? "," : "", voteJson);
                processedFilms++;
            } catch {
                console2.log("Warning: Failed to fetch vote data for film ID:", i);
            }
        }

        finalJson = string.concat(finalJson, "]");

        // Validate the number of processed films
        console2.log("Expected number of films:", filmCount);
        console2.log("Actually processed films:", processedFilms);
        require(processedFilms == filmCount, "Number of processed films doesn't match filmCount");

        // Write the final JSON to file with date
        string memory outputPath = string.concat(root, "/data/vote_data_", Strings.toString(block.chainid), ".json");
        vm.writeFile(outputPath, finalJson);
        console2.log("Data saved to:", outputPath);

        vm.stopBroadcast();
    }

    // Helper function to generate the JSON structure for each film's vote data
    function buildVoteJson(Voting memory voteData) internal pure returns (string memory) {
        // Create the JSON object for the vote data
        string memory voteJson = string.concat(
            "{",
            '"stakeAmount_1":',
            Strings.toString(voteData.stakeAmount_1),
            ",",
            '"stakeAmount_2":',
            Strings.toString(voteData.stakeAmount_2),
            ",",
            '"voteCount_1":',
            Strings.toString(voteData.voteCount_1),
            ",",
            '"voteCount_2":',
            Strings.toString(voteData.voteCount_2),
            "}"
        );

        return voteJson;
    }
}
