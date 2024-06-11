// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { Script } from "lib/forge-std/src/Script.sol";
import { console2 } from "lib/forge-std/src/console2.sol";
import { MockUSDC } from "../../test/foundry/mocks/MockUSDC.sol";
import { ERC20Mock } from "../../test/foundry/mocks/ERC20Mock.sol";

// we need to split the config into two parts: the network config and the contract config otherwise the compiler throws
// us a "stack to deep" error
struct ContractConfigFork {
    address ownablee;
    address uniHelper;
    address stakingPool;
    address vote;
    address property;
    address factoryFilmNFT;
    address factorySubNFT;
    address vabbleFund;
    address vabbleDAO;
    address factoryTierNFT;
    address subscription;
    address helperConfig;
}

struct NetworkConfigFork {
    address usdc;
    address vab;
    address usdt;
    address auditor;
    address vabbleWallet;
    address uniswapFactory;
    address uniswapRouter;
    address sushiSwapFactory;
    address sushiSwapRouter;
}

struct FullConfigFork {
    NetworkConfigFork networkConfig;
    ContractConfigFork contractConfig;
}

contract HelperConfigFork is Script {
    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/
    error HelperConfigFork__InvalidChainId();

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    uint256 constant BASE__CHAIN_ID = 8453;
    uint256 constant BASE_SEPOLIA_CHAIN_ID = 84_532;

    mapping(uint256 => NetworkConfigFork) public networkConfigs;
    mapping(uint256 => ContractConfigFork) public contractConfigs;

    constructor() {
        // ⚠️ Add more configs for other networks here ⚠️
        FullConfigFork memory sepoliaConfig = getBaseSepoliaConfig();
        networkConfigs[BASE_SEPOLIA_CHAIN_ID] = sepoliaConfig.networkConfig;
        contractConfigs[BASE_SEPOLIA_CHAIN_ID] = sepoliaConfig.contractConfig;
    }

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getNetworkConfigByChainId(uint256 chainId) public view returns (NetworkConfigFork memory) {
        return networkConfigs[chainId];
    }

    function getContractConfigByChainId(uint256 chainId) public view returns (ContractConfigFork memory) {
        return contractConfigs[chainId];
    }

    function getActiveNetworkConfig() public view returns (NetworkConfigFork memory) {
        return getNetworkConfigByChainId(block.chainid);
    }

    function getActiveContractConfig() public view returns (ContractConfigFork memory) {
        return getContractConfigByChainId(block.chainid);
    }

    /*//////////////////////////////////////////////////////////////
                                CONFIGS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Add the addresses for the contracts you want to use for the fork tests
     */
    function getBaseSepoliaConfig() public pure returns (FullConfigFork memory) {
        NetworkConfigFork memory networkConfig = NetworkConfigFork({
            usdc: 0x19bDfECdf99E489Bb4DC2C3dC04bDf443cc2a7f1,
            vab: 0x811401d4b7d8EAa0333Ada5c955cbA1fd8B09eda,
            usdt: 0x58f777963F5c805D82E9Ff50c137fd3D58bD525C,
            auditor: 0xC8e39373B96a90AFf4b07DA0e431F670f73f8941,
            vabbleWallet: 0xC8e39373B96a90AFf4b07DA0e431F670f73f8941,
            uniswapFactory: 0x7Ae58f10f7849cA6F5fB71b7f45CB416c9204b1e,
            uniswapRouter: 0x1689E7B1F10000AE47eBfE339a4f69dECd19F602,
            sushiSwapFactory: 0x7Ae58f10f7849cA6F5fB71b7f45CB416c9204b1e,
            sushiSwapRouter: 0x1689E7B1F10000AE47eBfE339a4f69dECd19F602
        });

        ContractConfigFork memory contractConfig = ContractConfigFork({
            ownablee: 0x10D3a8cFedC6548cB79e67f5b78FD55FbCa88c3F,
            uniHelper: 0xF78983903aF150E418386A30B73be39807cd08A2,
            stakingPool: 0x365F1c3334Cb1ae65bF3b80c9Aa7e7daB109286b,
            vote: 0x465c49Dd2ca7a7E91073FF52073d367bAF4cadc7,
            property: 0xeB0b8237E4aC910Bd7F7e963c9ABDc7e22818dcd,
            factoryFilmNFT: 0x05A643A709B239D21899f2b3C2CB580412c6eEdC,
            factorySubNFT: 0x354F094E07e93459fF8B65c6261Ad9DD3098D9Cb,
            vabbleFund: 0xE5784e0aD46A68991302E3FB204bDd623CCd6022,
            vabbleDAO: 0xDE420d5b4e0D7bDDC5c2B20A96318E566AA238Ce,
            factoryTierNFT: 0x7D287D4280AC484419b1942375bf1E6bBdbC27b9,
            subscription: 0xBB54c5F4D8b97385552AB9f57d092Eb0B9ED1E1c,
            helperConfig: 0xE18a016246E1aBaF338908B94961C9f13142612c
        });

        return FullConfigFork({ networkConfig: networkConfig, contractConfig: contractConfig });
    }
}
