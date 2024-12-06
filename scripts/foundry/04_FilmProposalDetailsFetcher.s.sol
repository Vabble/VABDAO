// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Script } from "lib/forge-std/src/Script.sol";
import { console2 } from "lib/forge-std/src/Test.sol";
import { Vm } from "lib/forge-std/src/Vm.sol";
import { VabbleDAO } from "../../contracts/dao/VabbleDAO.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "lib/forge-std/src/StdJson.sol";
import "../../contracts/libraries/Helper.sol";
import "../../contracts/interfaces/IVabbleDAO.sol";

contract FilmProposalDetailsFetcher is Script {
    using stdJson for string;

    address contractAddress = address(0x570e503d3C75D92fB3A39dDE912d3f0429a10414);
    VabbleDAO vabbleDAO = VabbleDAO(payable(contractAddress));
    string private root;

    function setUp() public {
        root = vm.projectRoot();
    }

    function run() public {
        console2.log("Chain Id:", block.chainid);
        vm.startBroadcast();

        // Get total film count
        uint256 filmCount = vabbleDAO.filmCount();
        console2.log("Total films:", filmCount);

        // Create array to store all film data
        string memory finalJson = "[";

        // Fetch data for each film starting from 1 (filmId starts from 1)
        for (uint256 i = 1; i <= filmCount; i++) {
            (
                string memory title,
                string memory description,
                uint256 raiseAmount,
                uint256 fundPeriod,
                uint256 fundType,
                uint256 rewardPercent,
                uint256 noVote,
                uint256 enableClaimer,
                uint256 pCreateTime,
                uint256 pApproveTime,
                address studio,
                Helper.Status status
            ) = vabbleDAO.filmInfo(i);

            // Get share data
            (uint256[] memory sharePercents, address[] memory studioPayees) = vabbleDAO.getFilmShare(i);

            // Store film data in struct
            IVabbleDAO.Film memory film = IVabbleDAO.Film({
                title: title,
                description: description,
                raiseAmount: raiseAmount,
                fundPeriod: fundPeriod,
                fundType: fundType,
                rewardPercent: rewardPercent,
                noVote: noVote,
                enableClaimer: enableClaimer,
                pCreateTime: pCreateTime,
                pApproveTime: pApproveTime,
                studio: studio,
                status: status,
                sharePercents: sharePercents,
                studioPayees: studioPayees
            });

            // Build the JSON object for each film with filmId
            string memory filmJson = buildFilmJson(i, film);
            finalJson = string.concat(finalJson, i > 1 ? "," : "", filmJson);

            console2.log("Fetched film:", i);
        }

        finalJson = string.concat(finalJson, "]");
        
        // Write the final JSON to file
        string memory outputPath = string.concat(root, "/film_data.json");
        vm.writeFile(outputPath, finalJson);
        console2.log("Data saved to:", outputPath);

        vm.stopBroadcast();
    }

    // Helper function to generate the JSON structure for each film
    function buildFilmJson(uint256 filmId, IVabbleDAO.Film memory film) internal pure returns (string memory) {
        // Convert arrays to strings
        string memory sharePercentsStr = "["; 
        string memory studioPayeesStr = "[";

        for (uint256 j = 0; j < film.sharePercents.length; j++) {
            sharePercentsStr = string.concat(sharePercentsStr, j > 0 ? "," : "", Strings.toString(film.sharePercents[j]));
        }
        sharePercentsStr = string.concat(sharePercentsStr, "]");

        for (uint256 j = 0; j < film.studioPayees.length; j++) {
            studioPayeesStr = string.concat(
                studioPayeesStr, j > 0 ? "," : "", '"', Strings.toHexString(uint160(film.studioPayees[j]), 20), '"'
            );
        }
        studioPayeesStr = string.concat(studioPayeesStr, "]");

        // Escape title and description for JSON compatibility
        string memory escapedTitle = escapeJsonString(film.title);
        string memory escapedDescription = escapeJsonString(film.description);

        // Use uint8 representation of status
        uint8 statusValue = uint8(film.status);

        // Create the final JSON object for the film
        string memory filmJson = string.concat(
            "{",
            '"filmId":', Strings.toString(filmId), ",",
            '"filmDetails":{',
            '"title":"', escapedTitle, '",',
            '"description":"', escapedDescription, '",',
            '"raiseAmount":', Strings.toString(film.raiseAmount), ",",
            '"fundPeriod":', Strings.toString(film.fundPeriod), ",",
            '"fundType":', Strings.toString(film.fundType), ",",
            '"rewardPercent":', Strings.toString(film.rewardPercent), ",",
            '"noVote":', Strings.toString(film.noVote), ",",
            '"enableClaimer":', Strings.toString(film.enableClaimer), ",",
            '"pCreateTime":', Strings.toString(film.pCreateTime), ",",
            '"pApproveTime":', Strings.toString(film.pApproveTime), ",",
            '"studio":"', Strings.toHexString(uint160(film.studio), 20), '",',
            '"status":', Strings.toString(statusValue), ",", 
            '"sharePercents":', sharePercentsStr, ",",
            '"studioPayees":', studioPayeesStr,
            "}}"
        );

        return filmJson;
    }

    // Helper function to escape JSON strings
    function escapeJsonString(string memory str) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        string memory escapedStr = "";

        for (uint256 i = 0; i < strBytes.length; i++) {
            if (strBytes[i] == '"') {
                escapedStr = string.concat(escapedStr, '\\"');
            } else if (strBytes[i] == "\\") {
                escapedStr = string.concat(escapedStr, "\\\\");
            } else {
                escapedStr = string.concat(escapedStr, string(abi.encodePacked(strBytes[i])));
            }
        }

        return escapedStr;
    }
}
