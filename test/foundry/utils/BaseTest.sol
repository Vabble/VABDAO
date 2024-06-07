// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "./Utilities.sol";
import { Test, console2, console } from "forge-std/Test.sol";
import { IERC20 } from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { DeployerScript } from "../../../scripts/foundry/Deploy.s.sol";
import { MockUSDC } from "../mocks/MockUSDC.sol";
import { ERC20Mock } from "../mocks/ERC20Mock.sol";
import { VabbleDAO } from "../../../contracts/dao/VabbleDAO.sol";
import { FactoryFilmNFT } from "../../../contracts/dao/FactoryFilmNFT.sol";
import { FactorySubNFT } from "../../../contracts/dao/FactorySubNFT.sol";
import { FactoryTierNFT } from "../../../contracts/dao/FactoryTierNFT.sol";
import { Ownablee } from "../../../contracts/dao/Ownablee.sol";
import { Property } from "../../../contracts/dao/Property.sol";
import { StakingPool } from "../../../contracts/dao/StakingPool.sol";
import { Subscription } from "../../../contracts/dao/Subscription.sol";
import { UniHelper } from "../../../contracts/dao/UniHelper.sol";
import { VabbleFund } from "../../../contracts/dao/VabbleFund.sol";
import { VabbleNFT } from "../../../contracts/dao/VabbleNFT.sol";
import { Vote } from "../../../contracts/dao/Vote.sol";

contract BaseTest is Test {
    Utilities internal utilities;
    DeployerScript public deployerScript;

    bool isForkTestEnabled;
    uint256 public baseSepoliaFork;
    uint256 public startingBlockNumber = 9_306_318;
    // TODO: figure out why I can't load this from the .env file ???
    // it also feels kinda ugly that I need to fork and can't test it local because I need uniswap + sushiswap mocks
    // https://book.getfoundry.sh/forge/fork-testing#forking-cheatcodes
    string BASE_SEPOLIA_RPC_URL = "https://sepolia.base.org/";

    address payable[] internal users;
    uint256 private userCount;
    uint256 private userInitialFunds = 100 ether;
    string[] private userLabels;

    address payable internal deployer;
    address payable internal auditor;
    address payable internal vabWallet;
    address payable internal staker_one;
    address payable internal staker_two;
    address payable internal studio_one;
    address payable internal studio_two;

    MockUSDC public usdc;
    ERC20Mock public vab;

    Ownablee ownablee;
    UniHelper uniHelper;
    StakingPool stakingPool;
    Vote vote;
    Property property;
    FactoryFilmNFT factoryFilmNFT;
    FactorySubNFT factorySubNFT;
    VabbleFund vabbleFund;
    VabbleDAO vabbleDAO;
    FactoryTierNFT factoryTierNFT;
    Subscription subscription;
    // VabbleNFT vabbleNFT;

    constructor() {
        userCount = 7;

        userLabels = new string[](userCount);
        userLabels.push("Deployer");
        userLabels.push("Auditor");
        userLabels.push("Vab_Wallet");
        userLabels.push("Staker_one");
        userLabels.push("Staker_two");
        userLabels.push("Studio_one");
        userLabels.push("Studio_two");
    }

    function setUp() public virtual {
        baseSepoliaFork = vm.createSelectFork(BASE_SEPOLIA_RPC_URL, startingBlockNumber);
        isForkTestEnabled = true;
        utilities = new Utilities();

        if (userCount > 0) {
            // check which one we need to call
            users = utilities.createUsers(userCount, userInitialFunds, userLabels);
            deployer = users[0];
            auditor = users[1];
            vabWallet = users[2];
            staker_one = users[3];
            staker_two = users[4];
            studio_one = users[5];
            studio_two = users[6];
        }

        deployerScript = new DeployerScript();
        vm.prank(deployer);
        (DeployerScript.Contracts memory deployedContracts, address _usdc, address _vab) =
            deployerScript.deploy(vabWallet, auditor, isForkTestEnabled);

        ownablee = deployedContracts.ownablee;
        uniHelper = deployedContracts.uniHelper;
        stakingPool = deployedContracts.stakingPool;
        vote = deployedContracts.vote;
        property = deployedContracts.property;
        factoryFilmNFT = deployedContracts.factoryFilmNFT;
        factorySubNFT = deployedContracts.factorySubNFT;
        vabbleFund = deployedContracts.vabbleFund;
        vabbleDAO = deployedContracts.vabbleDAO;
        factoryTierNFT = deployedContracts.factoryTierNFT;
        subscription = deployedContracts.subscription;
        usdc = MockUSDC(_usdc);
        vab = ERC20Mock(_vab);
    }
}
