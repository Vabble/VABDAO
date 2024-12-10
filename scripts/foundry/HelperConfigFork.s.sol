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
            auditor: 0xa18DcEd8a77553a06C7AEf1aB1d37D004df0fD12,
            vabbleWallet: 0xD71D56BF0761537B69436D8D16381d78f90B827e,
            uniswapFactory: 0x7Ae58f10f7849cA6F5fB71b7f45CB416c9204b1e,
            uniswapRouter: 0x1689E7B1F10000AE47eBfE339a4f69dECd19F602
        });

        ContractConfigFork memory contractConfig = ContractConfigFork({
            ownablee: 0x1FF6B3a5F81Edefde8FC0651eA9e113d4064C96E,
            uniHelper: 0x045A786dbc5A7406CC9411Bd4F9E0F49425c20a4,
            stakingPool: 0xB928e9F4aaf34eA951a07bb35396dae1c4bD5B71,
            vote: 0xd9EdB2fe8660f4be79dD1d4fF390Fd1c4683C25b,
            property: 0xD8be74b521cAFA220C28594C05C7dadD6eCfD9Ae,
            factoryFilmNFT: 0x847e5e2E0a0cBa9CD271098D82357F04d633490C,
            factorySubNFT: 0x1b7fcf332F0231E1b1Bf7DfDDC9f4173E5E5A809,
            vabbleFund: 0x1c064497BAa01e321251bED74Aa2b5a0acb103f9,
            vabbleDAO: 0x79f92Fe4119aD169834b47df22714358C19c1Fc9,
            factoryTierNFT: 0xff7099c7F141Ad5A63F630B0202Bfe4d81d4DB80,
            subscription: 0xCd52a018f0558bC0ddD2fe42Ed3a6F1E04227CBD,
            helperConfig: 0xe532939BCeE745DD3031652d8225838C24Bb2a93
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
