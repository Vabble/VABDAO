// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Test, console2 } from "lib/forge-std/src/Test.sol";
import { FilmMigration } from "../../../scripts/foundry/05_FilmMigration.s.sol";
import { VabbleDAO } from "../../../contracts/dao/VabbleDAO.sol";
import { IVabbleDAO } from "../../../contracts/interfaces/IVabbleDAO.sol";
import { Helper } from "../../../contracts/libraries/Helper.sol";
import { BaseTest } from "../utils/BaseTest.sol";

contract ScriptFilmMigrationTest is BaseTest {
    FilmMigration public filmMigration;

    string constant TEST_JSON =
        '[{"title":"Test Film","description":"A test film description","raiseAmount":1000000000000000000,"fundPeriod":2592000,"fundType":1,"rewardPercent":1000,"noVote":0,"enableClaimer":1,"pCreateTime":1677649423,"pApproveTime":1677649523,"studio":"0x70997970C51812dc3A010C7d01b50e0d17dc79C8","status":1,"sharePercents":[5000,5000],"studioPayees":["0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC","0x90F79bf6EB2c4f870365E785982E1f101E93b906"]}]';

    function setUp() public override {
        super.setUp();
        // Deploy FilmMigration script
        filmMigration = new FilmMigration();
    }

    function test_Script_parseFilm() public view {
        // Setup test data
        string memory root = TEST_JSON;
        string memory basePath = "[0]";

        // Parse film
        IVabbleDAO.Film memory film = filmMigration.parseFilm(root, basePath);

        // Assert film data
        assertEq(film.title, "Test Film");
        assertEq(film.description, "A test film description");
        assertEq(film.raiseAmount, 1 ether);
        assertEq(film.fundPeriod, 30 days);
        assertEq(film.fundType, 1);
        assertEq(film.rewardPercent, 1000);
        assertEq(film.noVote, 0);
        assertEq(film.enableClaimer, 1);
        assertEq(film.pCreateTime, 1_677_649_423);
        assertEq(film.pApproveTime, 1_677_649_523);
        assertEq(film.studio, address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8));
        assertEq(uint256(film.status), 1);

        // Assert arrays
        assertEq(film.sharePercents.length, 2);
        assertEq(film.sharePercents[0], 5000);
        assertEq(film.sharePercents[1], 5000);

        assertEq(film.studioPayees.length, 2);
        assertEq(film.studioPayees[0], address(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC));
        assertEq(film.studioPayees[1], address(0x90F79bf6EB2c4f870365E785982E1f101E93b906));
    }
}
