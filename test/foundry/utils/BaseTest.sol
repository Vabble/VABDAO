// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "./Utilities.sol";
import { Test, console2, console } from "forge-std/Test.sol";
import { IERC20 } from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { DeployerScript } from "../../../scripts/foundry/01_Deploy.s.sol";
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
    Utilities private utilities;
    DeployerScript private deployerScript;

    bool public isForkTestEnabled;
    uint256 private baseSepoliaFork;
    uint256 private startingBlockNumber = 9_306_318;
    string private BASE_SEPOLIA_RPC_URL = vm.envString("BASE_SEPOLIA_RPC_URL");

    address payable[] internal users;
    uint256 private userCount;
    uint256 public userInitialEtherFunds = 100 ether;
    uint256 public userInitialUsdcFunds = 10_000e6;
    uint256 public userInitialUsdtFunds = 10_000e6;
    uint256 public userInitialVabFunds = 1_000_000e18;
    string[] private userLabels;

    address payable internal deployer;
    address payable internal auditor;
    address payable internal vabWallet;
    address payable internal staker_one;
    address payable internal staker_two;
    address payable internal studio_one;
    address payable internal studio_two;
    address payable internal default_user;

    IERC20 public usdc;
    IERC20 public vab;
    IERC20 public usdt;

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
        userCount = 8;

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

        if (isForkTestEnabled) {
            console2.log(unicode"⚠️You are running tests on a Fork!");
            console2.log("Chain Id:", block.chainid);
            console2.log("RPC URL:", BASE_SEPOLIA_RPC_URL);
            console2.log("Make sure this was intentional");
        }

        utilities = new Utilities();
        deployerScript = new DeployerScript();

        if (userCount > 0) {
            // check which one we need to call
            users = utilities.createUsers(userCount, userInitialEtherFunds, userLabels);
            deployer = users[0];
            auditor = users[1];
            vabWallet = users[2];
            staker_one = users[3];
            staker_two = users[4];
            studio_one = users[5];
            studio_two = users[6];
            default_user = users[7];
        }

        vm.prank(deployer);
        (DeployerScript.Contracts memory deployedContracts, address _usdc, address _vab, address _usdt) =
            deployerScript.deployForLocalTesting(vabWallet, auditor, isForkTestEnabled);

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
        usdc = IERC20(_usdc);
        vab = IERC20(_vab);
        usdt = IERC20(_usdt);

        if (userCount > 0) {
            _fundUsersWithTestnetToken(users);
            _approveContractsForUsers(users);
        }
    }

    function _fundUsersWithTestnetToken(address payable[] memory _users) internal {
        for (uint256 i = 0; i < _users.length; i++) {
            deal(address(usdc), _users[i], userInitialUsdcFunds);
            deal(address(vab), _users[i], userInitialVabFunds);
            deal(address(usdt), _users[i], userInitialUsdtFunds);
        }
    }

    function _approveContractsForUsers(address payable[] memory _users) internal {
        address[] memory _contracts = new address[](11);

        _contracts[0] = address(ownablee);
        _contracts[1] = address(uniHelper);
        _contracts[2] = address(stakingPool);
        _contracts[3] = address(vote);
        _contracts[4] = address(property);
        _contracts[5] = address(factoryFilmNFT);
        _contracts[6] = address(factorySubNFT);
        _contracts[7] = address(vabbleFund);
        _contracts[8] = address(vabbleDAO);
        _contracts[9] = address(factoryTierNFT);
        _contracts[10] = address(subscription);

        for (uint256 i = 0; i < _users.length; i++) {
            address user = _users[i];
            for (uint256 j = 0; j < _contracts.length; j++) {
                address contractAddress = _contracts[j];
                // Approve max Tokens for each contract
                vm.startPrank(user);
                usdc.approve(contractAddress, type(uint256).max);
                vab.approve(contractAddress, type(uint256).max);
                usdt.approve(contractAddress, type(uint256).max);
                vm.stopPrank();
            }
        }
    }
}
