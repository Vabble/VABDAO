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

    mapping(uint256 chainId => FullConfigFork) public fullNetworkConfigs;

    constructor() {
        // ⚠️ Add more configs for other networks here ⚠️
        fullNetworkConfigs[BASE_SEPOLIA_CHAIN_ID] = getBaseSepoliaConfig();
        fullNetworkConfigs[BASE__CHAIN_ID] = getBaseConfig();
    }
    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getConfigByChainId(uint256 chainId) internal view returns (FullConfigFork memory) {
        if (chainId == 31_337) revert HelperConfigFork__InvalidChainId();
        return fullNetworkConfigs[chainId];
    }

    function getForkNetworkConfig() public view returns (FullConfigFork memory) {
        return getConfigByChainId(block.chainid);
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
            uniswapRouter: 0x1689E7B1F10000AE47eBfE339a4f69dECd19F602
        });

        ContractConfigFork memory contractConfig = ContractConfigFork({
            ownablee: 0xc3a61e5D09aa302c1DE75682DCaC979E01C4eb70,
            uniHelper: 0xc19D6b2FB3401fa5a8b71c542B1e49936E00E73d,
            stakingPool: 0x63A2fCF810dDFA705738c677949cB1DDa41E7d7C,
            vote: 0x3EA874337532D0af1B0A8e7E0192DAd4FB2b5Cf3,
            property: 0xb0a3CF07A89A38a67bAE9e69fAFD301E6c4B2E4D,
            factoryFilmNFT: 0x955f0045af5635349297AC87F8B35c01aB67500F,
            factorySubNFT: 0x3622E5eF88f5f9A3cB6f88A477a68e26219d34EB,
            vabbleFund: 0xbA77EBA05c6C1a18e657f3ac9caC089D9B8884E7,
            vabbleDAO: 0x0e8a8B0b4DaA10d9FfB2D9D5089d08341bEC2d1E,
            factoryTierNFT: 0x8f6BC67d57679E72385b5EA048C8CF4656c7e6A7,
            subscription: 0x534f0450Ad28bfF12213d84c941e9F3725E0f048,
            helperConfig: 0x4943e7A10F2F3E92776f61bcF2586B4Fb5675b4F
        });

        return FullConfigFork({ networkConfig: networkConfig, contractConfig: contractConfig });
    }

    function getBaseConfig() public pure returns (FullConfigFork memory) {
        NetworkConfigFork memory networkConfig = NetworkConfigFork({
            usdc: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            vab: 0x2C9ab600D71967fF259c491aD51F517886740cbc,
            usdt: 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2,
            auditor: 0x170341dfFAD907f9695Dc1C17De622A5A2F28259,
            vabbleWallet: 0xE13Cf9Ff533268F3a98961995Ce7681440204361,
            uniswapFactory: 0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6,
            uniswapRouter: 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24
        });

        ContractConfigFork memory contractConfig = ContractConfigFork({
            ownablee: 0x2dDcc6108690bc5EbD77cEF55A61d7F10A62B007,
            uniHelper: 0x38B07C23900608356cb3cf96C5c116465d717899,
            stakingPool: 0x4e3C3FA5B85f45568f588e5eB3af16029eE433c4,
            vote: 0xA44DdCAE6eb91359caB6D8D52D14cf0fF0784ab3,
            property: 0x6c50Cbf1878B7DF0d08055a8d39e145751D259Df,
            factoryFilmNFT: 0xD5A7A246709a7Cf3BeCc6326Afe1de136310Ae69,
            factorySubNFT: 0x284f5b1C7C92B8CDc99D6a91F793266746DaEBd7,
            vabbleFund: 0x7959F705f7BC152d7Dcb4e8673D4C5547b5D8D03,
            vabbleDAO: 0x570e503d3C75D92fB3A39dDE912d3f0429a10414,
            factoryTierNFT: 0x74b7B9C378a2D2179d28B17fdFD2E32911142F86,
            subscription: 0x63Fb9040A74468830e48a92E3C7ff648DF2F877F,
            helperConfig: 0xE18a016246E1aBaF338908B94961C9f13142612c
        });

        return FullConfigFork({ networkConfig: networkConfig, contractConfig: contractConfig });
    }
}
