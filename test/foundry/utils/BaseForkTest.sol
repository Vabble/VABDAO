// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import { Test, console2 } from "forge-std/Test.sol";
import { IERC20 } from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

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
import { HelperConfig, FullConfig, NetworkConfig } from "../../../scripts/foundry/HelperConfig.s.sol";
import { GetDeployedContracts } from "../../../scripts/foundry/02_GetDeployedContracts.s.sol";
import { ConfigLibrary } from "../../../contracts/libraries/ConfigLibrary.sol";

abstract contract BaseForkTest is Test {
    FullConfig internal activeHelperConfig;
    NetworkConfig internal activeNetworkConfig;

    ConfigLibrary.PropertyTimePeriodConfig internal propertyTimePeriodConfig;
    ConfigLibrary.PropertyRatesConfig internal propertyRatesConfig;
    ConfigLibrary.PropertyAmountsConfig internal propertyAmountsConfig;

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
    HelperConfig helperConfig;

    address user = makeAddr("user");

    IERC20 internal usdc;
    IERC20 internal vab;
    IERC20 internal usdt;
    address internal auditor;
    address internal vabbleWallet;
    address internal uniswapFactory;
    address internal uniswapRouter;

    uint256 private baseSepoliaFork;
    uint256 private baseFork;
    string private BASE_SEPOLIA_RPC_URL = vm.envString("BASE_SEPOLIA_RPC_URL");
    string private BASE_RPC_URL = vm.envString("BASE_RPC_URL");

    function setUp() public virtual {
        createForks();
        // Get the CHAIN_ID from command line or default to Base Sepolia
        // run it like this: CHAIN_ID=84532 forge test
        uint256 chainId = vm.envOr("CHAIN_ID", uint256(84_532)); // 84532 is Base Sepolia, 8453 is Base
        uint256 selectedFork = chainId == 84_532 ? baseSepoliaFork : baseFork;
        string memory rpcUrl = chainId == 84_532 ? BASE_SEPOLIA_RPC_URL : BASE_RPC_URL;
        vm.selectFork(selectedFork);

        console2.log(unicode"⚠️You are running tests on live on-chain contracts!");
        console2.log("Chain Id:", block.chainid);
        console2.log("Current timestamp:", block.timestamp);
        console2.log("RPC URL:", rpcUrl);
        console2.log("Make sure this was intentional");

        // get the latest deployed contracts
        GetDeployedContracts deployedContracts = new GetDeployedContracts();

        address _helperConfig = deployedContracts.getHelperConfig(true);
        address _ownablee = deployedContracts.getOwnablee(true);
        address _uniHelper = deployedContracts.getUniHelper(true);
        address _stakingPool = deployedContracts.getStakingPool(true);
        address _vote = deployedContracts.getVote(true);
        address _property = deployedContracts.getProperty(true);
        address _factoryFilmNFT = deployedContracts.getFactoryFilmNFT(true);
        address _factorySubNFT = deployedContracts.getFactorySubNFT(true);
        address _vabbleFund = deployedContracts.getVabbleFund(true);
        address _vabbleDAO = deployedContracts.getVabbleDAO(true);
        address _factoryTierNFT = deployedContracts.getFactoryTierNFT(true);
        address _subscription = deployedContracts.getSubscription(true);

        // Cast all contract addresses to their respective contract types
        castAddressToContract(
            _ownablee,
            _uniHelper,
            _stakingPool,
            _vote,
            _property,
            _factoryFilmNFT,
            _factorySubNFT,
            _vabbleFund,
            _vabbleDAO,
            _factoryTierNFT,
            _subscription
        );

        helperConfig = HelperConfig(_helperConfig);

        FullConfig memory _activeHelperConfig = helperConfig.getActiveNetworkConfig();

        activeHelperConfig = _activeHelperConfig;
        activeNetworkConfig = activeHelperConfig.networkConfig;
        propertyTimePeriodConfig = activeHelperConfig.propertyTimePeriodConfig;
        propertyRatesConfig = activeHelperConfig.propertyRatesConfig;
        propertyAmountsConfig = activeHelperConfig.propertyAmountsConfig;

        usdc = IERC20(activeNetworkConfig.usdc);
        vab = IERC20(activeNetworkConfig.vab);
        usdt = IERC20(activeNetworkConfig.usdt);
        auditor = activeNetworkConfig.auditor;
        vabbleWallet = activeNetworkConfig.vabbleWallet;
        uniswapFactory = activeNetworkConfig.uniswapFactory;
        uniswapRouter = activeNetworkConfig.uniswapRouter;
    }

    function createForks() internal {
        baseSepoliaFork = vm.createFork(BASE_SEPOLIA_RPC_URL);
        baseFork = vm.createFork(BASE_RPC_URL);
    }

    function castAddressToContract(
        address _ownablee,
        address _uniHelper,
        address _stakingPool,
        address _vote,
        address _property,
        address _factoryFilmNFT,
        address _factorySubNFT,
        address _vabbleFund,
        address _vabbleDAO,
        address _factoryTierNFT,
        address _subscription
    )
        internal
    {
        require(_ownablee != address(0), "Ownablee address is required");
        require(_uniHelper != address(0), "UniHelper address is required");
        require(_stakingPool != address(0), "StakingPool address is required");
        require(_vote != address(0), "Vote address is required");
        require(_property != address(0), "Property address is required");
        require(_factoryFilmNFT != address(0), "FactoryFilmNFT address is required");
        require(_factorySubNFT != address(0), "FactorySubNFT address is required");
        require(_vabbleFund != address(0), "VabbleFund address is required");
        require(_vabbleDAO != address(0), "VabbleDAO address is required");
        require(_factoryTierNFT != address(0), "FactoryTierNFT address is required");
        require(_subscription != address(0), "Subscription address is required");

        ownablee = Ownablee(_ownablee);
        uniHelper = UniHelper(payable(_uniHelper));
        stakingPool = StakingPool(_stakingPool);
        vote = Vote(_vote);
        property = Property(_property);
        factoryFilmNFT = FactoryFilmNFT(_factoryFilmNFT);
        factorySubNFT = FactorySubNFT(payable(_factorySubNFT));
        vabbleFund = VabbleFund(payable(_vabbleFund));
        vabbleDAO = VabbleDAO(payable(_vabbleDAO));
        factoryTierNFT = FactoryTierNFT(_factoryTierNFT);
        subscription = Subscription(payable(_subscription));
    }
}
