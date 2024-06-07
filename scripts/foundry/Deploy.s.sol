// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import { Script, console2 } from "lib/forge-std/src/Script.sol";
import { IERC20 } from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { HelperConfig } from "./HelperConfig.s.sol";
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

contract DeployerScript is Script {
    address public deployer;

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
    }
    // VabbleNFT vabbleNFT; <= not needed right now, be careful when adding to the above Struct, might cause Stack too
    // deep error

    Contracts public contracts;
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

    function run() public {
        vm.startBroadcast();
        deployForMainOrTestnet();
        vm.stopBroadcast();
    }

    function deployForMainOrTestnet() public {
        _getConfig();
        // TODO: deploy the other contracts.. this is just to test the script for now
        deployOwnablee(vabbleWallet, vab, usdc, auditor);
    }

    function deployForLocalTesting(
        address _vabWallet,
        address _auditor,
        bool _isForkTestEnabled
    )
        public
        returns (Contracts memory _contracts, address _usdc, address _vab, address _usdt)
    {
        if (!(block.chainid == 31_337 || _isForkTestEnabled)) {
            revert("Deploy.s.sol::deployForLocalTesting: Only for local testing enabled");
        }

        deployer = msg.sender;
        _getConfig();
        _deployAllContracts(_vabWallet, _auditor);
        _initializeAndSetupContracts();

        auditor = _auditor;
        vabbleWallet = _vabWallet;
        return (contracts, usdc, vab, usdt);
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function _getConfig() internal {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory activeConfig = helperConfig.getActiveNetworkConfig();
        usdc = activeConfig.usdc;
        vab = activeConfig.vab;
        usdt = activeConfig.usdt;
        auditor = activeConfig.auditor;
        vabbleWallet = activeConfig.vabbleWallet;
        uniswapFactory = activeConfig.uniswapFactory;
        uniswapRouter = activeConfig.uniswapRouter;
        sushiSwapFactory = activeConfig.sushiSwapFactory;
        sushiSwapRouter = activeConfig.sushiSwapRouter;
        discountPercents = activeConfig.discountPercents;
        depositAssets = activeConfig.depositAssets;
    }

    function _deployAllContracts(address _vabWallet, address _auditor) internal {
        deployOwnablee(_vabWallet, vab, usdc, _auditor);
        deployUniHelper(uniswapFactory, uniswapRouter, sushiSwapFactory, sushiSwapRouter, address(contracts.ownablee));
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
        deploySubscription(address(contracts.ownablee), address(contracts.uniHelper), address(contracts.property));
    }

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

    function deployUniHelper(
        address _uniswapFactory,
        address _uniswapRouter,
        address _sushiSwapFactory,
        address _sushiSwapRouter,
        address _ownablee
    )
        internal
    {
        contracts.uniHelper =
            new UniHelper(_uniswapFactory, _uniswapRouter, _sushiSwapFactory, _sushiSwapRouter, _ownablee);
    }

    function deployStakingPool(address _ownablee) internal {
        contracts.stakingPool = new StakingPool(_ownablee);
    }

    function deployVote(address _ownablee) internal {
        contracts.vote = new Vote(_ownablee);
    }

    function deployProperty(address _ownablee, address _uniHelper, address _vote, address _stakingPool) internal {
        contracts.property = new Property(_ownablee, _uniHelper, _vote, _stakingPool);
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

    function deploySubscription(address _ownablee, address _uniHelper, address _property) internal {
        contracts.subscription = new Subscription(_ownablee, _uniHelper, _property, discountPercents);
    }
}
