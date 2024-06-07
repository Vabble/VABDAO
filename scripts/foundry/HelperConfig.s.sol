// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { Script } from "lib/forge-std/src/Script.sol";
import { console2 } from "lib/forge-std/src/console2.sol";

// import { Deployer } from "script/Deployer.s.sol";

import { MockUSDC } from "../../test/foundry/mocks/MockUSDC.sol";
import { ERC20Mock } from "../../test/foundry/mocks/ERC20Mock.sol";

contract HelperConfig is Script {
    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/
    error HelperConfig__InvalidChainId();

    /*//////////////////////////////////////////////////////////////
                                 TYPES
    //////////////////////////////////////////////////////////////*/
    struct NetworkConfig {
        address usdc;
        address vab;
        address vabbleWallet;
        address uniswapFactory;
        address uniswapRouter;
        address sushiSwapFactory;
        address sushiSwapRouter;
        uint256[] discountPercents;
        address[] depositAssets;
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    uint256 constant ETH_MAINNET_CHAIN_ID = 1;
    uint256 constant ETH_SEPOLIA_CHAIN_ID = 11_155_111;

    uint256 constant ZKSYNC_MAINNET_CHAIN_ID = 324;
    uint256 constant ZKSYNC_SEPOLIA_CHAIN_ID = 300;

    uint256 constant POLYGON_MAINNET_CHAIN_ID = 137;
    uint256 constant POLYGON_MUMBAI_CHAIN_ID = 80_001;

    // Local network state variables
    NetworkConfig public localNetworkConfig;
    NetworkConfig public forkNetworkConfig;
    mapping(uint256 chainId => NetworkConfig) public networkConfigs;

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    constructor() {
        // TODO: ADD CORRECT ADDRESSES
        // networkConfigs[ETH_MAINNET_CHAIN_ID] = getEthMainnetConfig();
        // networkConfigs[ETH_SEPOLIA_CHAIN_ID] = getZkSyncSepoliaConfig();
        // networkConfigs[ZKSYNC_MAINNET_CHAIN_ID] = getZkSyncConfig();
        // networkConfigs[ZKSYNC_SEPOLIA_CHAIN_ID] = getZkSyncSepoliaConfig();
        // networkConfigs[POLYGON_MAINNET_CHAIN_ID] = getPolygonMainnetConfig();
        // networkConfigs[POLYGON_MUMBAI_CHAIN_ID] = getPolygonMumbaiConfig();
    }

    function getConfigByChainId(uint256 chainId, bool _isForkTestEnabled) public returns (NetworkConfig memory) {
        if (!_isForkTestEnabled) {
            return networkConfigs[chainId];
        } else if (chainId == 31_337) {
            return getOrCreateAnvilEthConfig();
        } else {
            return getOrCreateForkConfig();
        }
    }

    function getActiveNetworkConfig(bool _isForkTestEnabled) public returns (NetworkConfig memory) {
        return getConfigByChainId(block.chainid, _isForkTestEnabled);
    }

    /*//////////////////////////////////////////////////////////////
                                CONFIGS
    //////////////////////////////////////////////////////////////*/

    // TODO: ADD CORRECT ADDRESSES
    // function getEthMainnetConfig() public pure returns (NetworkConfig memory) {
    //     return NetworkConfig({ usdc: address(1), vab: address(2) });
    // }

    // function getZkSyncConfig() public pure returns (NetworkConfig memory) {
    //     return NetworkConfig({ usdc: address(1), vab: address(2) });
    // }

    // function getZkSyncSepoliaConfig() public pure returns (NetworkConfig memory) {
    //     return NetworkConfig({ usdc: address(1), vab: address(2) });
    // }

    // function getPolygonMainnetConfig() public pure returns (NetworkConfig memory) {
    //     return NetworkConfig({ usdc: address(1), vab: address(2) });
    // }

    // function getPolygonMumbaiConfig() public pure returns (NetworkConfig memory) {
    //     return NetworkConfig({ usdc: address(1), vab: address(2) });
    // }

    /*//////////////////////////////////////////////////////////////
                              FORK CONFIG
    //////////////////////////////////////////////////////////////*/

    function getOrCreateForkConfig() public returns (NetworkConfig memory) {
        if (forkNetworkConfig.usdc != address(0)) {
            return forkNetworkConfig;
        }
        console2.log(unicode"⚠️ You have deployed a mock contract on a Forked Chain!");
        console2.log("Make sure this was intentional");
        // vm.prank(Deployer(msg.sender).godFather());
        (address mockUsdc, address mockedVab) = _deployMocks();

        uint256[] memory _discountPercents = new uint256[](3);
        _discountPercents[0] = 11;
        _discountPercents[1] = 22;
        _discountPercents[2] = 25;

        address[] memory _depositAssets = new address[](3);
        _depositAssets[0] = mockedVab;
        _depositAssets[1] = mockUsdc;
        _depositAssets[2] = 0x0000000000000000000000000000000000000000;

        forkNetworkConfig = NetworkConfig({
            usdc: mockUsdc,
            vab: mockedVab,
            vabbleWallet: address(0),
            uniswapFactory: 0x7Ae58f10f7849cA6F5fB71b7f45CB416c9204b1e,
            uniswapRouter: 0x1689E7B1F10000AE47eBfE339a4f69dECd19F602,
            sushiSwapFactory: 0x7Ae58f10f7849cA6F5fB71b7f45CB416c9204b1e,
            sushiSwapRouter: 0x1689E7B1F10000AE47eBfE339a4f69dECd19F602,
            discountPercents: _discountPercents,
            depositAssets: _depositAssets
        });
        return forkNetworkConfig;
    }

    /*//////////////////////////////////////////////////////////////
                              LOCAL CONFIG
    //////////////////////////////////////////////////////////////*/
    function getOrCreateAnvilEthConfig() public returns (NetworkConfig memory) {
        if (localNetworkConfig.usdc != address(0)) {
            return localNetworkConfig;
        }
        console2.log(unicode"⚠️ You have deployed a mock conract!");
        console2.log("Make sure this was intentional");
        // vm.prank(Deployer(msg.sender).godFather());
        (address mockUsdc, address mockedVab) = _deployMocks();

        uint256[] memory _discountPercents = new uint256[](3);
        _discountPercents[0] = 11;
        _discountPercents[1] = 22;
        _discountPercents[2] = 25;

        address[] memory _depositAssets = new address[](3);
        _depositAssets[0] = mockedVab;
        _depositAssets[1] = mockUsdc;
        _depositAssets[2] = 0x0000000000000000000000000000000000000000;

        //TODO: Create uniswap and sushiSwap mocks

        localNetworkConfig = NetworkConfig({
            usdc: mockUsdc,
            vab: mockedVab,
            vabbleWallet: address(0),
            uniswapFactory: address(0),
            uniswapRouter: address(0),
            sushiSwapFactory: address(0),
            sushiSwapRouter: address(0),
            discountPercents: _discountPercents,
            depositAssets: _depositAssets
        });
        return localNetworkConfig;
    }

    /*
     * Add your mocks, deploy and return them here for your testing network
     */
    function _deployMocks() internal returns (address, address) {
        MockUSDC usdc = new MockUSDC();
        ERC20Mock vab = new ERC20Mock("Vabble", "VAB");

        return (address(usdc), address(vab));
    }
}
