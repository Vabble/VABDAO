// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { Script } from "lib/forge-std/src/Script.sol";
import { console2 } from "lib/forge-std/src/console2.sol";
import { MockUSDC } from "../../test/foundry/mocks/MockUSDC.sol";
import { ERC20Mock } from "../../test/foundry/mocks/ERC20Mock.sol";
import { ConfigLibrary } from "../../contracts/libraries/ConfigLibrary.sol";

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
    uint256 stakingPoolFundAmount;
    uint256 edgePoolFundAmount;
}

struct FullConfig {
    NetworkConfig networkConfig;
    ConfigLibrary.PropertyTimePeriodConfig propertyTimePeriodConfig;
    ConfigLibrary.PropertyRatesConfig propertyRatesConfig;
    ConfigLibrary.PropertyAmountsConfig propertyAmountsConfig;
    ConfigLibrary.PropertyMinMaxListConfig propertyMinMaxListConfig;
}

abstract contract CodeConstants {
    uint256 public constant RATE_PRECISION = 1e5; // 5 decimals: 1 = 0.00001
    uint256 public constant PERCENT_PRECISION = 1e8; // 8 decimals: 1 = 0.00000001
    uint256 public constant VAB_DECIMALS = 18;
    uint256 public constant USDC_DECIMALS = 6;
    uint256 public constant VAB_DECIMAL_MULTIPLIER = (10 ** VAB_DECIMALS);
    uint256 public constant USDC_DECIMAL_MULTIPLIER = (10 ** USDC_DECIMALS);

    /*//////////////////////////////////////////////////////////////
                               CHAIN IDS
    //////////////////////////////////////////////////////////////*/
    uint256 public constant ETH_MAINNET_CHAIN_ID = 1;

    uint256 public constant BASE__CHAIN_ID = 8453;
    uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84_532;
}

contract HelperConfig is CodeConstants, Script {
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

    // Local network state variables
    NetworkConfig public localNetworkConfig;
    mapping(uint256 chainId => FullConfig) public fullNetworkConfigs;

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    constructor() {
        discountPercents[0] = 11;
        discountPercents[1] = 22;
        discountPercents[2] = 25;

        // ⚠️ Add more configs for other networks here ⚠️
        fullNetworkConfigs[BASE_SEPOLIA_CHAIN_ID] = getBaseSepoliaConfig();
        fullNetworkConfigs[BASE__CHAIN_ID] = getBaseConfig();
    }

    function getConfigByChainId(uint256 chainId) public view returns (FullConfig memory) {
        if (chainId == 31_337) {
            revert("Local network not implemented");
            // return getOrCreateAnvilEthConfig();
        } else {
            return fullNetworkConfigs[chainId];
        }
    }

    function getActiveNetworkConfig() public view returns (FullConfig memory) {
        return getConfigByChainId(block.chainid);
    }

    /*//////////////////////////////////////////////////////////////
                                CONFIGS
    //////////////////////////////////////////////////////////////*/

    function getBaseSepoliaConfig() public view returns (FullConfig memory) {
        address _vab = 0x811401d4b7d8EAa0333Ada5c955cbA1fd8B09eda;
        address _usdc = 0x19bDfECdf99E489Bb4DC2C3dC04bDf443cc2a7f1;
        address _usdt = 0x58f777963F5c805D82E9Ff50c137fd3D58bD525C;
        address _mainnetToken = 0x0000000000000000000000000000000000000000;

        address[] memory _depositAssets = _createDepositAssets(_vab, _usdc, _mainnetToken);

        (uint256[] memory _minPropertyList, uint256[] memory _maxPropertyList) = _getMinMaxPropertyLists();

        return FullConfig({
            networkConfig: NetworkConfig({
                usdc: _usdc,
                vab: _vab,
                usdt: _usdt,
                auditor: 0xa18DcEd8a77553a06C7AEf1aB1d37D004df0fD12,
                vabbleWallet: 0xD71D56BF0761537B69436D8D16381d78f90B827e,
                uniswapFactory: 0x7Ae58f10f7849cA6F5fB71b7f45CB416c9204b1e,
                uniswapRouter: 0x1689E7B1F10000AE47eBfE339a4f69dECd19F602,
                discountPercents: discountPercents,
                depositAssets: _depositAssets,
                stakingPoolFundAmount: 500_000 * VAB_DECIMAL_MULTIPLIER,
                edgePoolFundAmount: 100_000 * VAB_DECIMAL_MULTIPLIER
            }),
            propertyTimePeriodConfig: ConfigLibrary.PropertyTimePeriodConfig({
                filmVotePeriod: 10 minutes,
                agentVotePeriod: 10 minutes,
                disputeGracePeriod: 10 minutes,
                propertyVotePeriod: 10 minutes,
                lockPeriod: 10 minutes,
                maxAllowPeriod: 10 minutes,
                filmRewardClaimPeriod: 10 minutes,
                boardVotePeriod: 10 minutes,
                rewardVotePeriod: 10 minutes
            }),
            propertyRatesConfig: ConfigLibrary.PropertyRatesConfig({
                rewardRate: 25 * RATE_PRECISION,
                fundFeePercent: 2 * PERCENT_PRECISION,
                maxMintFeePercent: 10 * PERCENT_PRECISION,
                minStakerCountPercent: 5 * PERCENT_PRECISION,
                boardVoteWeight: 30 * PERCENT_PRECISION,
                boardRewardRate: 25 * PERCENT_PRECISION
            }),
            propertyAmountsConfig: ConfigLibrary.PropertyAmountsConfig({
                proposalFeeAmount: 20 * USDC_DECIMAL_MULTIPLIER,
                minDepositAmount: 50 * USDC_DECIMAL_MULTIPLIER,
                maxDepositAmount: 5000 * USDC_DECIMAL_MULTIPLIER,
                availableVABAmount: 1 * VAB_DECIMAL_MULTIPLIER,
                subscriptionAmount: (299 * USDC_DECIMAL_MULTIPLIER) / 100,
                minVoteCount: 1
            }),
            propertyMinMaxListConfig: ConfigLibrary.PropertyMinMaxListConfig({
                minPropertyList: _minPropertyList,
                maxPropertyList: _maxPropertyList
            })
        });
    }

    function getBaseConfig() public view returns (FullConfig memory) {
        address _vab = 0xBE58fdA3Bcf03B6bbc821D1f0E6b764C86709227;
        address _usdc = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
        address _usdt = 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2;
        address _mainnetToken = 0x0000000000000000000000000000000000000000;

        address[] memory _depositAssets = _createDepositAssets(_vab, _usdc, _mainnetToken);

        (uint256[] memory _minPropertyList, uint256[] memory _maxPropertyList) = _getMinMaxPropertyLists();

        return FullConfig({
            networkConfig: NetworkConfig({
                usdc: _usdc,
                vab: _vab,
                usdt: _usdt,
                auditor: 0x170341dfFAD907f9695Dc1C17De622A5A2F28259,
                vabbleWallet: 0xE13Cf9Ff533268F3a98961995Ce7681440204361,
                uniswapFactory: 0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6,
                uniswapRouter: 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24,
                discountPercents: discountPercents,
                depositAssets: _depositAssets,
                stakingPoolFundAmount: 5_000_000 * VAB_DECIMAL_MULTIPLIER,
                edgePoolFundAmount: 1_000_000 * VAB_DECIMAL_MULTIPLIER
            }),
            propertyTimePeriodConfig: ConfigLibrary.PropertyTimePeriodConfig({
                filmVotePeriod: 7 days,
                boardVotePeriod: 14 days,
                agentVotePeriod: 10 days,
                disputeGracePeriod: 30 days,
                propertyVotePeriod: 10 days,
                rewardVotePeriod: 7 days,
                lockPeriod: 30 days,
                maxAllowPeriod: 90 days,
                filmRewardClaimPeriod: 30 days
            }),
            propertyRatesConfig: ConfigLibrary.PropertyRatesConfig({
                rewardRate: 50 * RATE_PRECISION,
                boardRewardRate: 25 * PERCENT_PRECISION,
                fundFeePercent: 2 * PERCENT_PRECISION,
                boardVoteWeight: 30 * PERCENT_PRECISION,
                minStakerCountPercent: 5 * PERCENT_PRECISION,
                maxMintFeePercent: 10 * PERCENT_PRECISION
            }),
            propertyAmountsConfig: ConfigLibrary.PropertyAmountsConfig({
                proposalFeeAmount: 20 * USDC_DECIMAL_MULTIPLIER,
                minDepositAmount: 50 * USDC_DECIMAL_MULTIPLIER,
                maxDepositAmount: 5000 * USDC_DECIMAL_MULTIPLIER,
                availableVABAmount: 5 * 1e6 * VAB_DECIMAL_MULTIPLIER,
                subscriptionAmount: (699 * USDC_DECIMAL_MULTIPLIER) / 100,
                minVoteCount: 1
            }),
            propertyMinMaxListConfig: ConfigLibrary.PropertyMinMaxListConfig({
                minPropertyList: _minPropertyList,
                maxPropertyList: _maxPropertyList
            })
        });
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
            depositAssets: _depositAssets,
            stakingPoolFundAmount: 5_000_000 * VAB_DECIMAL_MULTIPLIER,
            edgePoolFundAmount: 1_000_000 * VAB_DECIMAL_MULTIPLIER
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

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _createDepositAssets(
        address _vab,
        address _usdc,
        address _mainnetToken
    )
        internal
        pure
        returns (address[] memory)
    {
        address[] memory _depositAssets = new address[](3);
        _depositAssets[0] = _vab;
        _depositAssets[1] = _usdc;
        _depositAssets[2] = _mainnetToken;
        return _depositAssets;
    }

    function _getMinMaxPropertyLists()
        internal
        pure
        returns (uint256[] memory _minPropertyList, uint256[] memory _maxPropertyList)
    {
        _minPropertyList = new uint256[](21);
        _maxPropertyList = new uint256[](21);

        _minPropertyList[uint256(ConfigLibrary.PropertyListIndex.FILM_VOTE_PERIOD)] = 7 days;
        _minPropertyList[uint256(ConfigLibrary.PropertyListIndex.AGENT_VOTE_PERIOD)] = 7 days;
        _minPropertyList[uint256(ConfigLibrary.PropertyListIndex.DISPUTE_GRACE_PERIOD)] = 7 days;
        _minPropertyList[uint256(ConfigLibrary.PropertyListIndex.PROPERTY_VOTE_PERIOD)] = 7 days;
        _minPropertyList[uint256(ConfigLibrary.PropertyListIndex.LOCK_PERIOD)] = 7 days;
        _minPropertyList[uint256(ConfigLibrary.PropertyListIndex.REWARD_RATE)] = 6 * RATE_PRECISION; // 0.006%
        _minPropertyList[uint256(ConfigLibrary.PropertyListIndex.FILM_REWARD_CLAIM_PERIOD)] = 1 days;
        _minPropertyList[uint256(ConfigLibrary.PropertyListIndex.MAX_ALLOW_PERIOD)] = 7 days;
        _minPropertyList[uint256(ConfigLibrary.PropertyListIndex.PROPOSAL_FEE_AMOUNT)] = 20 * USDC_DECIMAL_MULTIPLIER; // $20
        _minPropertyList[uint256(ConfigLibrary.PropertyListIndex.FUND_FEE_PERCENT)] = 2 * PERCENT_PRECISION; // 2%
        _minPropertyList[uint256(ConfigLibrary.PropertyListIndex.MIN_DEPOSIT_AMOUNT)] = 5 * USDC_DECIMAL_MULTIPLIER; // $5
        _minPropertyList[uint256(ConfigLibrary.PropertyListIndex.MAX_DEPOSIT_AMOUNT)] = 5 * USDC_DECIMAL_MULTIPLIER; // $5
        _minPropertyList[uint256(ConfigLibrary.PropertyListIndex.MAX_MINT_FEE_PERCENT)] = 1 * PERCENT_PRECISION; // 1%
        _minPropertyList[uint256(ConfigLibrary.PropertyListIndex.MIN_VOTE_COUNT)] = 1;
        _minPropertyList[uint256(ConfigLibrary.PropertyListIndex.MIN_STAKER_COUNT_PERCENT)] = 3 * PERCENT_PRECISION; // 3%
        _minPropertyList[uint256(ConfigLibrary.PropertyListIndex.AVAILABLE_VAB_AMOUNT)] =
            50 * 1e6 * VAB_DECIMAL_MULTIPLIER; // 50M
        _minPropertyList[uint256(ConfigLibrary.PropertyListIndex.BOARD_VOTE_PERIOD)] = 7 days;
        _minPropertyList[uint256(ConfigLibrary.PropertyListIndex.BOARD_VOTE_WEIGHT)] = 5 * PERCENT_PRECISION; // 5%
        _minPropertyList[uint256(ConfigLibrary.PropertyListIndex.REWARD_VOTE_PERIOD)] = 7 days;
        _minPropertyList[uint256(ConfigLibrary.PropertyListIndex.SUBSCRIPTION_AMOUNT)] =
            (299 * USDC_DECIMAL_MULTIPLIER) / 100; // $2.99
        _minPropertyList[uint256(ConfigLibrary.PropertyListIndex.BOARD_REWARD_RATE)] = 1 * PERCENT_PRECISION; // 1%

        _maxPropertyList[uint256(ConfigLibrary.PropertyListIndex.FILM_VOTE_PERIOD)] = 90 days;
        _maxPropertyList[uint256(ConfigLibrary.PropertyListIndex.AGENT_VOTE_PERIOD)] = 90 days;
        _maxPropertyList[uint256(ConfigLibrary.PropertyListIndex.DISPUTE_GRACE_PERIOD)] = 90 days;
        _maxPropertyList[uint256(ConfigLibrary.PropertyListIndex.PROPERTY_VOTE_PERIOD)] = 90 days;
        _maxPropertyList[uint256(ConfigLibrary.PropertyListIndex.LOCK_PERIOD)] = 90 days;
        _maxPropertyList[uint256(ConfigLibrary.PropertyListIndex.REWARD_RATE)] = 130 * RATE_PRECISION; // 0.13%
        _maxPropertyList[uint256(ConfigLibrary.PropertyListIndex.FILM_REWARD_CLAIM_PERIOD)] = 90 days;
        _maxPropertyList[uint256(ConfigLibrary.PropertyListIndex.MAX_ALLOW_PERIOD)] = 90 days;
        _maxPropertyList[uint256(ConfigLibrary.PropertyListIndex.PROPOSAL_FEE_AMOUNT)] = 500 * USDC_DECIMAL_MULTIPLIER; // $500
        _maxPropertyList[uint256(ConfigLibrary.PropertyListIndex.FUND_FEE_PERCENT)] = 10 * PERCENT_PRECISION; // 10%
        _maxPropertyList[uint256(ConfigLibrary.PropertyListIndex.MIN_DEPOSIT_AMOUNT)] =
            10 * 1e6 * USDC_DECIMAL_MULTIPLIER; // $10,000,000
        _maxPropertyList[uint256(ConfigLibrary.PropertyListIndex.MAX_DEPOSIT_AMOUNT)] =
            10 * 1e6 * USDC_DECIMAL_MULTIPLIER; // $10,000,000
        _maxPropertyList[uint256(ConfigLibrary.PropertyListIndex.MAX_MINT_FEE_PERCENT)] = 10 * PERCENT_PRECISION; // 10%
        _maxPropertyList[uint256(ConfigLibrary.PropertyListIndex.MIN_VOTE_COUNT)] = 10;
        _maxPropertyList[uint256(ConfigLibrary.PropertyListIndex.MIN_STAKER_COUNT_PERCENT)] = 10 * PERCENT_PRECISION; // 10%
        _maxPropertyList[uint256(ConfigLibrary.PropertyListIndex.AVAILABLE_VAB_AMOUNT)] =
            200 * 1e6 * VAB_DECIMAL_MULTIPLIER; // 200M
        _maxPropertyList[uint256(ConfigLibrary.PropertyListIndex.BOARD_VOTE_PERIOD)] = 90 days;
        _maxPropertyList[uint256(ConfigLibrary.PropertyListIndex.BOARD_VOTE_WEIGHT)] = 30 * PERCENT_PRECISION; // 30%
        _maxPropertyList[uint256(ConfigLibrary.PropertyListIndex.REWARD_VOTE_PERIOD)] = 90 days;
        _maxPropertyList[uint256(ConfigLibrary.PropertyListIndex.SUBSCRIPTION_AMOUNT)] =
            (9999 * USDC_DECIMAL_MULTIPLIER) / 100; // $99.99
        _maxPropertyList[uint256(ConfigLibrary.PropertyListIndex.BOARD_REWARD_RATE)] = 20 * PERCENT_PRECISION; // 20%

        return (_minPropertyList, _maxPropertyList);
    }
}
