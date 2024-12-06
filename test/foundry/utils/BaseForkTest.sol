// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import { Test, console2 } from "forge-std/Test.sol";
import { IERC20 } from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {
    HelperConfigFork,
    NetworkConfigFork,
    FullConfigFork,
    ContractConfigFork
} from "../../../scripts/foundry/HelperConfigFork.s.sol";
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
import { Vote } from "../../../contracts/dao/Vote.sol";

contract BaseForkTest is Test {
    NetworkConfigFork activeNetworkConfig;
    ContractConfigFork activeContractConfig;

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

    address user = makeAddr("user");

    IERC20 internal usdc;
    IERC20 internal vab;
    IERC20 internal usdt;
    address internal auditor;
    address internal vabbleWallet;
    address internal uniswapFactory;
    address internal uniswapRouter;
    address internal sushiSwapFactory;
    address internal sushiSwapRouter;

    uint256 private baseSepoliaFork;
    uint256 private baseFork;
    string private BASE_SEPOLIA_RPC_URL = vm.envString("BASE_SEPOLIA_RPC_URL");
    string private BASE_RPC_URL = vm.envString("BASE_RPC_URL");

    function setUp() public virtual {
        createForks();

        // Change this if you want to test on other chains
        vm.selectFork(baseFork);

        console2.log(unicode"⚠️You are running tests on live on-chain contracts!");
        console2.log("Chain Id:", block.chainid);
        console2.log("Current timestamp:", block.timestamp);
        console2.log("RPC URL:", BASE_SEPOLIA_RPC_URL);
        console2.log("Make sure this was intentional");

        HelperConfigFork helperConfig = new HelperConfigFork();
        FullConfigFork memory fullConfig = helperConfig.getForkNetworkConfig();

        activeNetworkConfig = fullConfig.networkConfig;
        activeContractConfig = fullConfig.contractConfig;

        usdc = IERC20(activeNetworkConfig.usdc);
        vab = IERC20(activeNetworkConfig.vab);
        usdt = IERC20(activeNetworkConfig.usdt);
        auditor = activeNetworkConfig.auditor;
        vabbleWallet = activeNetworkConfig.vabbleWallet;
        uniswapFactory = activeNetworkConfig.uniswapFactory;
        uniswapRouter = activeNetworkConfig.uniswapRouter;
        sushiSwapFactory = activeNetworkConfig.sushiSwapFactory;
        sushiSwapRouter = activeNetworkConfig.sushiSwapRouter;

        castAddressToContract(activeContractConfig);
    }

    function createForks() internal {
        baseSepoliaFork = vm.createFork(BASE_SEPOLIA_RPC_URL);
        baseFork = vm.createFork(BASE_RPC_URL);
    }

    function castAddressToContract(ContractConfigFork memory _activeContractConfig) internal {
        ownablee = Ownablee(_activeContractConfig.ownablee);
        uniHelper = UniHelper(payable(_activeContractConfig.uniHelper));
        stakingPool = StakingPool(_activeContractConfig.stakingPool);
        vote = Vote(_activeContractConfig.vote);
        property = Property(_activeContractConfig.property);
        factoryFilmNFT = FactoryFilmNFT(_activeContractConfig.factoryFilmNFT);
        factorySubNFT = FactorySubNFT(payable(_activeContractConfig.factorySubNFT));
        vabbleFund = VabbleFund(payable(_activeContractConfig.vabbleFund));
        vabbleDAO = VabbleDAO(payable(_activeContractConfig.vabbleDAO));
        factoryTierNFT = FactoryTierNFT(_activeContractConfig.factoryTierNFT);
        subscription = Subscription(payable(_activeContractConfig.subscription));
    }
}
