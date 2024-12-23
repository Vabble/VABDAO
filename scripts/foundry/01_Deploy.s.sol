// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { Script } from "lib/forge-std/src/Script.sol";
import { HelperConfig, NetworkConfig, FullConfig } from "./HelperConfig.s.sol";
import { VabbleDAO } from "../../contracts/dao/VabbleDAO.sol";
import { FactoryFilmNFT } from "../../contracts/dao/FactoryFilmNFT.sol";
import { FactorySubNFT } from "../../contracts/dao/FactorySubNFT.sol";
import { FactoryTierNFT } from "../../contracts/dao/FactoryTierNFT.sol";
import { Ownablee } from "../../contracts/dao/Ownablee.sol";
import { Property } from "../../contracts/dao/Property.sol";
import { StakingPool } from "../../contracts/dao/StakingPool.sol";
import { Subscription } from "../../contracts/dao/Subscription.sol";
import { UniHelper } from "../../contracts/dao/UniHelper.sol";
import { VabbleFund } from "../../contracts/dao/VabbleFund.sol";
import { VabbleNFT } from "../../contracts/dao/VabbleNFT.sol";
import { Vote } from "../../contracts/dao/Vote.sol";
import { console2 } from "lib/forge-std/src/console2.sol";
import { ConfigLibrary } from "../../contracts/libraries/ConfigLibrary.sol";
/**
 * @title A Foundry script to fund the StakingPool and VabbleDAO contract with necessary VAB tokens
 */

contract DeployerScript is Script {
    using ConfigLibrary for ConfigLibrary.PropertyTimePeriodConfig;
    using ConfigLibrary for ConfigLibrary.PropertyRatesConfig;
    using ConfigLibrary for ConfigLibrary.PropertyAmountsConfig;

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    struct Contracts {
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
        VabbleNFT vabbleNFT;
    }

    ConfigLibrary.PropertyTimePeriodConfig public propertyTimePeriodConfig;
    ConfigLibrary.PropertyRatesConfig public propertyRatesConfig;
    ConfigLibrary.PropertyAmountsConfig public propertyAmountsConfig;
    ConfigLibrary.PropertyMinMaxListConfig internal propertyMinMaxListConfig;

    Contracts public contracts;
    address public deployer;
    address usdc;
    address vab;
    address usdt;
    address auditor;
    address vabbleWallet;
    address uniswapFactory;
    address uniswapRouter;
    address sushiSwapFactory;
    address sushiSwapRouter;
    uint256[] discountPercents;
    address[] depositAssets;

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function run() public {
        vm.startBroadcast();
        deployForMainOrTestnet();
        vm.stopBroadcast();
    }

    /**
     * @dev Deploys all the necessary contracts for the mainnet or the testnet.
     */
    function deployForMainOrTestnet() public {
        _getConfig();
        _deployAllContracts(vabbleWallet, auditor);
        _initializeAndSetupContracts();
    }

    /**
     * @dev Deploys all the necessary contracts for local testing.
     * @param _isForkTestEnabled Whether or not the fork test is enabled.
     * @return _contracts The deployed contracts.
     * @return _activeHelperConfig The active network configuration.
     */
    function deployForLocalTesting(bool _isForkTestEnabled)
        public
        returns (Contracts memory _contracts, FullConfig memory _activeHelperConfig)
    {
        require(
            block.chainid == 31_337 || _isForkTestEnabled,
            "Deploy.s.sol::deployForLocalTesting: Only for local testing enabled"
        );

        deployer = msg.sender;

        vm.startPrank(deployer);
        FullConfig memory activeHelperConfig = _getConfig();
        _deployAllContracts(vabbleWallet, auditor);
        _initializeAndSetupContracts();
        vm.stopPrank();

        return (contracts, activeHelperConfig);
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Retrieves the active network configuration from the helper contract and assigns the values to the local
     * variables.
     */
    function _getConfig() internal returns (FullConfig memory) {
        HelperConfig helperConfig = new HelperConfig();
        FullConfig memory activeConfig = helperConfig.getActiveNetworkConfig();

        usdc = activeConfig.networkConfig.usdc;
        vab = activeConfig.networkConfig.vab;
        usdt = activeConfig.networkConfig.usdt;
        auditor = activeConfig.networkConfig.auditor;
        vabbleWallet = activeConfig.networkConfig.vabbleWallet;
        uniswapFactory = activeConfig.networkConfig.uniswapFactory;
        uniswapRouter = activeConfig.networkConfig.uniswapRouter;
        discountPercents = activeConfig.networkConfig.discountPercents;
        depositAssets = activeConfig.networkConfig.depositAssets;

        propertyTimePeriodConfig = activeConfig.propertyTimePeriodConfig;
        propertyRatesConfig = activeConfig.propertyRatesConfig;
        propertyAmountsConfig = activeConfig.propertyAmountsConfig;
        propertyMinMaxListConfig = activeConfig.propertyMinMaxListConfig;

        return activeConfig;
    }

    /**
     * @dev Deploys all the necessary contracts.
     * @param _vabWallet The address of the Vab Wallet.
     * @param _auditor The address of the auditor.
     */
    function _deployAllContracts(address _vabWallet, address _auditor) internal {
        deployOwnablee(_vabWallet, vab, usdc, _auditor);
        deployUniHelper(uniswapFactory, uniswapRouter, address(contracts.ownablee));
        deployStakingPool(address(contracts.ownablee));
        deployVote(address(contracts.ownablee));
        deployProperty(
            address(contracts.ownablee),
            address(contracts.uniHelper),
            address(contracts.vote),
            address(contracts.stakingPool)
        );
        deployFactoryFilmNFT(address(contracts.ownablee));
        deployFactorySubNFT(address(contracts.ownablee), address(contracts.uniHelper));
        deployVabbleFund(
            address(contracts.ownablee),
            address(contracts.uniHelper),
            address(contracts.stakingPool),
            address(contracts.property),
            address(contracts.factoryFilmNFT)
        );
        deployVabbleDAO(
            address(contracts.ownablee),
            address(contracts.uniHelper),
            address(contracts.vote),
            address(contracts.stakingPool),
            address(contracts.property),
            address(contracts.vabbleFund)
        );
        deployFactoryTierNFT(address(contracts.ownablee), address(contracts.vabbleDAO), address(contracts.vabbleFund));
        deploySubscription(
            address(contracts.ownablee),
            address(contracts.uniHelper),
            address(contracts.property),
            address(contracts.stakingPool)
        );
    }

    /**
     * @dev Initializes and sets up the contracts.
     * Calls the initialization functions of various contracts.
     * Sets up the ownership of the contracts.
     * Adds the deposit assets to the Ownablee contract.
     */
    function _initializeAndSetupContracts() internal {
        Ownablee _ownablee = contracts.ownablee;
        UniHelper _uniHelper = contracts.uniHelper;
        StakingPool _stakingPool = contracts.stakingPool;
        Vote _vote = contracts.vote;
        Property _property = contracts.property;
        FactoryFilmNFT _factoryFilmNFT = contracts.factoryFilmNFT;
        FactorySubNFT _factorySubNFT = contracts.factorySubNFT;
        VabbleFund _vabbleFund = contracts.vabbleFund;
        VabbleDAO _vabbleDAO = contracts.vabbleDAO;
        Subscription _subscription = contracts.subscription;

        _factoryFilmNFT.initialize(address(_vabbleDAO), address(_vabbleFund));
        _stakingPool.initialize(address(_vabbleDAO), address(_property), address(_vote));
        _vote.initialize(address(_vabbleDAO), address(_stakingPool), address(_property), address(_uniHelper));
        _vabbleFund.initialize(address(_vabbleDAO));
        _uniHelper.setWhiteList(
            address(_vabbleDAO),
            address(_vabbleFund),
            address(_subscription),
            address(_factoryFilmNFT),
            address(_factorySubNFT)
        );
        _ownablee.setup(address(_vote), address(_vabbleDAO), address(_stakingPool));
        _ownablee.addDepositAsset(depositAssets);
    }

    /*//////////////////////////////////////////////////////////////
                     CONTRACT DEPLOYMENT FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function deployOwnablee(address _vabWallet, address _vab, address _usdc, address _auditor) internal {
        contracts.ownablee = new Ownablee(_vabWallet, _vab, _usdc, _auditor);
    }

    function deployUniHelper(address _uniswapFactory, address _uniswapRouter, address _ownablee) internal {
        contracts.uniHelper = new UniHelper(_uniswapFactory, _uniswapRouter, _ownablee);
    }

    function deployStakingPool(address _ownablee) internal {
        contracts.stakingPool = new StakingPool(_ownablee);
    }

    function deployVote(address _ownablee) internal {
        contracts.vote = new Vote(_ownablee);
    }

    function deployProperty(address _ownablee, address _uniHelper, address _vote, address _stakingPool) internal {
        contracts.property = new Property(
            _ownablee,
            _uniHelper,
            _vote,
            _stakingPool,
            propertyTimePeriodConfig,
            propertyRatesConfig,
            propertyAmountsConfig,
            propertyMinMaxListConfig
        );
    }

    function deployFactoryFilmNFT(address _ownablee) internal {
        contracts.factoryFilmNFT = new FactoryFilmNFT(_ownablee);
    }

    function deployFactorySubNFT(address _ownablee, address _uniHelper) internal {
        contracts.factorySubNFT = new FactorySubNFT(_ownablee, _uniHelper);
    }

    function deployVabbleFund(
        address _ownablee,
        address _uniHelper,
        address _stakingPool,
        address _property,
        address _factoryFilmNFT
    )
        internal
    {
        contracts.vabbleFund = new VabbleFund(_ownablee, _uniHelper, _stakingPool, _property, _factoryFilmNFT);
    }

    function deployVabbleDAO(
        address _ownablee,
        address _uniHelper,
        address _vote,
        address _stakingPool,
        address _property,
        address _vabbleFund
    )
        internal
    {
        contracts.vabbleDAO = new VabbleDAO(_ownablee, _uniHelper, _vote, _stakingPool, _property, _vabbleFund);
    }

    function deployFactoryTierNFT(address _ownablee, address _vabbleDAO, address _vabbleFund) internal {
        contracts.factoryTierNFT = new FactoryTierNFT(_ownablee, _vabbleDAO, _vabbleFund);
    }

    function deploySubscription(
        address _ownablee,
        address _uniHelper,
        address _property,
        address stakingPool
    )
        internal
    {
        contracts.subscription = new Subscription(_ownablee, _uniHelper, _property, stakingPool, discountPercents);
    }
}
