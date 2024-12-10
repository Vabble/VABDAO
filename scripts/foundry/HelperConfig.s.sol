// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { Script } from "lib/forge-std/src/Script.sol";
import { console2 } from "lib/forge-std/src/console2.sol";
import { MockUSDC } from "../../test/foundry/mocks/MockUSDC.sol";
import { ERC20Mock } from "../../test/foundry/mocks/ERC20Mock.sol";

struct NetworkConfig {
    address usdc;
    address vab;
    address usdt;
    address auditor;
    address vabbleWallet;
    address uniswapFactory;
    address uniswapRouter;
    uint256[] discountPercents;
    address[] depositAssets;
}

contract HelperConfig is Script {
    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/
    error HelperConfig__InvalidChainId();

    /*//////////////////////////////////////////////////////////////
                                 TYPES
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    uint256[] discountPercents = new uint256[](3);

    uint256 constant ETH_MAINNET_CHAIN_ID = 1;

    uint256 constant BASE__CHAIN_ID = 8453;
    uint256 constant BASE_SEPOLIA_CHAIN_ID = 84_532;

    // Local network state variables
    NetworkConfig public localNetworkConfig;
    mapping(uint256 chainId => NetworkConfig) public networkConfigs;

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    constructor() {
        discountPercents[0] = 11;
        discountPercents[1] = 22;
        discountPercents[2] = 25;

        // ⚠️ Add more configs for other networks here ⚠️
        networkConfigs[BASE_SEPOLIA_CHAIN_ID] = getBaseSepoliaConfig();
        // networkConfigs[BASE__CHAIN_ID] = getBaseConfig();
    }

    function getConfigByChainId(uint256 chainId) public returns (NetworkConfig memory) {
        if (chainId == 31_337) {
            return getOrCreateAnvilEthConfig();
        } else {
            return networkConfigs[chainId];
        }
    }

    function getActiveNetworkConfig() public returns (NetworkConfig memory) {
        return getConfigByChainId(block.chainid);
    }

    /*//////////////////////////////////////////////////////////////
                                CONFIGS
    //////////////////////////////////////////////////////////////*/

    function getBaseSepoliaConfig() public view returns (NetworkConfig memory) {
        address _vab = 0x811401d4b7d8EAa0333Ada5c955cbA1fd8B09eda;
        address _usdc = 0x19bDfECdf99E489Bb4DC2C3dC04bDf443cc2a7f1;
        address _usdt = 0x58f777963F5c805D82E9Ff50c137fd3D58bD525C;
        address _mainnetToken = 0x0000000000000000000000000000000000000000;

        address[] memory _depositAssets = new address[](4);
        _depositAssets[0] = _vab;
        _depositAssets[1] = _usdc;
        _depositAssets[2] = _usdt;
        _depositAssets[3] = _mainnetToken;

        return NetworkConfig({
            usdc: _usdc,
            vab: _vab,
            usdt: _usdt,
            auditor: 0xC8e39373B96a90AFf4b07DA0e431F670f73f8941,
            vabbleWallet: 0xC8e39373B96a90AFf4b07DA0e431F670f73f8941,
            uniswapFactory: 0x7Ae58f10f7849cA6F5fB71b7f45CB416c9204b1e,
            uniswapRouter: 0x1689E7B1F10000AE47eBfE339a4f69dECd19F602,
            sushiSwapFactory: 0x7Ae58f10f7849cA6F5fB71b7f45CB416c9204b1e,
            sushiSwapRouter: 0x1689E7B1F10000AE47eBfE339a4f69dECd19F602,
            discountPercents: discountPercents,
            depositAssets: _depositAssets
        });
    }

    // function getBaseConfig() public view returns (NetworkConfig memory) {
    //     //TODO: Add the config for the base network
    //     revert("Not implemented");
    // }

    /*//////////////////////////////////////////////////////////////
                              LOCAL CONFIG
    //////////////////////////////////////////////////////////////*/
    function getOrCreateAnvilEthConfig() public returns (NetworkConfig memory) {
        if (localNetworkConfig.usdc != address(0)) {
            return localNetworkConfig;
        }
        console2.log(unicode"⚠️ You have deployed a mock conract!");
        console2.log("Make sure this was intentional");
        (address mockUsdc, address mockedVab, address mockedUsdt) = _deployMocks();

        address[] memory _depositAssets = new address[](4);
        _depositAssets[0] = mockedVab;
        _depositAssets[1] = mockUsdc;
        _depositAssets[2] = mockedUsdt;
        _depositAssets[3] = 0x0000000000000000000000000000000000000000;

        localNetworkConfig = NetworkConfig({
            usdc: mockUsdc,
            vab: mockedVab,
            usdt: mockedUsdt,
            auditor: address(0),
            vabbleWallet: address(0),
            uniswapFactory: address(0),
            uniswapRouter: address(0),
            discountPercents: discountPercents,
            depositAssets: _depositAssets
        });
        return localNetworkConfig;
    }

    /*
     * Add your mocks, deploy and return them here for your testing network
     */
    function _deployMocks() internal returns (address, address, address) {
        MockUSDC usdc = new MockUSDC();
        // TODO: Use the actual mock of USDT and not USDC but for now I think it's ok
        //TODO: Create uniswap and sushiSwap mocks
        MockUSDC usdt = new MockUSDC();
        ERC20Mock vab = new ERC20Mock("Vabble", "VAB");

        return (address(usdc), address(vab), address(usdt));
    }
}
