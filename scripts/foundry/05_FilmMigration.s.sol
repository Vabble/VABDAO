// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Script } from "lib/forge-std/src/Script.sol";
import { console2 } from "lib/forge-std/src/Test.sol";
import { VabbleDAO } from "../../contracts/dao/VabbleDAO.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../../contracts/interfaces/IVabbleDAO.sol";
import "../../contracts/libraries/Helper.sol";
import "lib/forge-std/src/StdJson.sol";

contract FilmMigration is Script {
    using stdJson for string;

    VabbleDAO vabbleDAO;
    string blockChainId;

    function run() public {
        blockChainId = vm.toString(block.chainid);
        string memory inputPath = string.concat("./data/film_data_", blockChainId, ".json");
        string memory root = vm.readFile(inputPath);

        // Try to get the entire array first
        bytes memory rawArray = vm.parseJson(root, "$");
        // Then decode it as a dynamic array
        bytes[] memory array = abi.decode(rawArray, (bytes[]));
        uint256 length = array.length;

        string memory contractAddress = vm.prompt(
            string.concat(
                "Enter the VabbleDAO contract address you want to migrate ",
                Strings.toString(length),
                " films to (Chain ID: ",
                blockChainId,
                ")"
            )
        );

        vabbleDAO = VabbleDAO(payable(vm.parseAddress(contractAddress)));

        IVabbleDAO.Film[] memory films = new IVabbleDAO.Film[](length);

        for (uint256 i = 0; i < length; i++) {
            string memory basePath = string(abi.encodePacked("[", vm.toString(i), "]"));
            films[i] = parseFilm(root, basePath);
        }

        console2.log("Total Films parsed:", films.length);

        vm.startBroadcast();
        vabbleDAO.migrateFilmProposals(films);
        vm.stopBroadcast();
    }

    function parseFilm(
        string memory root,
        string memory basePath
    )
        internal
        pure
        returns (IVabbleDAO.Film memory film)
    {
        film.title = abi.decode(vm.parseJson(root, string(abi.encodePacked(basePath, ".title"))), (string));
        film.description = abi.decode(vm.parseJson(root, string(abi.encodePacked(basePath, ".description"))), (string));
        film.raiseAmount = abi.decode(vm.parseJson(root, string(abi.encodePacked(basePath, ".raiseAmount"))), (uint256));
        film.fundPeriod = abi.decode(vm.parseJson(root, string(abi.encodePacked(basePath, ".fundPeriod"))), (uint256));
        film.fundType = abi.decode(vm.parseJson(root, string(abi.encodePacked(basePath, ".fundType"))), (uint256));
        film.rewardPercent =
            abi.decode(vm.parseJson(root, string(abi.encodePacked(basePath, ".rewardPercent"))), (uint256));
        film.noVote = abi.decode(vm.parseJson(root, string(abi.encodePacked(basePath, ".noVote"))), (uint256));
        film.enableClaimer =
            abi.decode(vm.parseJson(root, string(abi.encodePacked(basePath, ".enableClaimer"))), (uint256));
        film.pCreateTime = abi.decode(vm.parseJson(root, string(abi.encodePacked(basePath, ".pCreateTime"))), (uint256));
        film.pApproveTime =
            abi.decode(vm.parseJson(root, string(abi.encodePacked(basePath, ".pApproveTime"))), (uint256));
        film.studio = abi.decode(vm.parseJson(root, string(abi.encodePacked(basePath, ".studio"))), (address));
        film.status =
            Helper.Status(abi.decode(vm.parseJson(root, string(abi.encodePacked(basePath, ".status"))), (uint256)));
        film.sharePercents =
            abi.decode(vm.parseJson(root, string(abi.encodePacked(basePath, ".sharePercents"))), (uint256[]));
        film.studioPayees =
            abi.decode(vm.parseJson(root, string(abi.encodePacked(basePath, ".studioPayees"))), (address[]));
    }
}
