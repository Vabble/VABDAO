// const { ethers } = require('hardhat');
const ethers = require('ethers');  
const crypto = require('crypto');
const { BigNumber } = ethers;
require('dotenv').config();

const ZERO_ADDRESS = ethers.constants.AddressZero;
const TEST_CHAIN_IDS = [1337, 80001, 31337, 80002];
const CONFIG = {
  daoWalletAddress: "0xb10bcC8B508174c761CFB1E7143bFE37c4fBC3a1",
  addressZero: '0x0000000000000000000000000000000000000000',
  ethereum: {
    usdcAdress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",    
    vabToken: "", 
    walletAddress: "",
    uniswap: { //Mainnet, kovan, rinkeby ...
      factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    },
    sushiswap: { // Mainnet
      factory: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
      router: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    },
    sig: {
      user1: '',
      user2: ''
    }
  },
  polygon: {
    // START: Vabble Contracts - Deployed onm Mumbai
    FactoryFilmNFT: "",
    FactorySubNFT: "",
    FactoryTierNFT: "",
    GnosisSafeL2: "",
    Ownablee: "",
    Property: "",
    StakingPool: "",
    Subscription: "",
    UniHelper: "",
    VabbleDAO: "",
    VabbleFunding: "",
    Vote: "",

    usdcAdress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    usdtAdress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    vabToken: "0xea73dcf6f49f8d6ad5a129aaede776d78d418cfd",
    wMatic: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    walletAddress: "0x3E5e853d1784cDB519DB1eB175B374FB53FE285C",
    uniswap: { // Mainnet, Mumbai
      factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
      router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    },
    sushiswap: { // Mainnet, Mumbai
      factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    },
    sig: {
      user1: '',
      user2: ''
    }
  },
  mumbai: {
    // START: Vabble Contracts - Deployed onm Mumbai
    FactoryFilmNFT: "0xdBf3cF14Ec235f943F54102EAcFDA64091638833",
    FactorySubNFT: "0x5bbf6651CDDf4AB958845d9270df6a87a6EA8bD1",
    FactoryTierNFT: "0x25b7CA60b3497BD4387c10BE1F20feE351F66eAd",
    GnosisSafeL2: "0xfE3057CA0Fb80eD2E7718D0cf0B2055A60135F4B",
    Ownablee: "0xfC00BF8C9e8d311463B1ba67cC84376Ff458ea08",
    Property: "0x407ad7F193B95591408ef352a3a74cf7dd517e4F",
    StakingPool: "0xCA265f385C71a912d513E58A684521F31E142B8B",
    Subscription: "0x03d55671d5A86CC755F17b86dF892b51CA7bdf98",
    UniHelper: "0x1aa8a2a438fE37881DF56EAE4D861532A8736383",
    VabbleDAO: "0x37B8Bba01337ce5631D1daC97178cb1087340A78",
    VabbleFunding: "0x7bA2C91449B10373FdB3886C953F3deFb7F99653",
    Vote: "0xec1C6A30A75F3367A69E1713C144c7cfAfFA85c0",

    // END: Vabble Contracts - Deployed onm Mumbai
    
    usdcAdress: "0x7493d25DAfE9dA7B73Ffd52F009D978E2415bE0c",
    usdtAdress: "0x47719C2b2A6853d04213efc85075674E93D02037",
    daiAddress: "0x001B3B4d0F3714Ca98ba10F6042DaEbF0B1B7b6F",
    vabToken: "0x5cBbA5484594598a660636eFb0A1AD953aFa4e32", // Testcase VAB
    // vabToken: "0x61Ff1D74C20655ef4563b5838B78B551f80F0b32", // Child VAB
    wMatic: "0x5B67676a984807a212b1c59eBFc9B3568a474F0a",
    exmAddress: "0x53BeF80E0EBE5A89dfb67782b12435aBeB943754",
    wmatic: "0x1fE108421Bc27B98aD52ae78dD8A3D7aB4199A00",
    walletAddress: "0xC8e39373B96a90AFf4b07DA0e431F670f73f8941",
    uniswap: { // Mainnet, Mumbai
      factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
      router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    },
    sushiswap: { // Mainnet, Mumbai
      factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    },     
    sig: {
      user1: '0x6fD89350A94A02B003E638c889b54DAB0E251655', // Vabble-Tester1
      user2: '0x791598E2ab767FAb9e87Fc33ca9EA3263B33A5e0'  // Vabble-Tester2
    }
  },
  polygonAmoy: {
    // START: Vabble Contracts - Deployed on Amoy
    FactoryFilmNFT: "",
    FactorySubNFT: "",
    FactoryTierNFT: "",
    GnosisSafeL2: "",
    Ownablee: "",
    Property: "",
    StakingPool: "",
    Subscription: "",
    UniHelper: "",
    VabbleDAO: "",
    VabbleFunding: "",
    Vote: "",

    // END: Vabble Contracts - Deployed on Amoy
    
    usdcAdress: "0xDEFc6ee1A08d2277EAfCa61a92FDbF7FA2cD32f1",
    // usdcAdress: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582", // Amoy USDC
    usdtAdress: "0x19bDfECdf99E489Bb4DC2C3dC04bDf443cc2a7f1",
    daiAddress: "",
    vabToken: "0x14d699f12704B861A6c7bFcb41bE65ceE261669F", // Testcase VAB
    wMatic: "",
    exmAddress: "",
    wmatic: "",
    walletAddress: "0xC8e39373B96a90AFf4b07DA0e431F670f73f8941",
    uniswap: { // Amoy
      factory: '0x811401d4b7d8eaa0333ada5c955cba1fd8b09eda',
      router: '0xB3f8EB0f726b67BEb61B28ECF0B0Cc2f0c419902',
    },
    sushiswap: { // Amoy
      factory: '0x811401d4b7d8eaa0333ada5c955cba1fd8b09eda',
      router: '0xB3f8EB0f726b67BEb61B28ECF0B0Cc2f0c419902',
    },
    sig: {
      user1: '0x6fD89350A94A02B003E638c889b54DAB0E251655', // Vabble-Tester1
      user2: '0x791598E2ab767FAb9e87Fc33ca9EA3263B33A5e0'  // Vabble-Tester2
    }
  },
  uniswapV3: { // All(Ethereum, Polygon, Avalance... and testnets)
    router: '0xE592427A0AEce92De3Edee1F18E0157C05861564'
  },  
  expire_period: 72 * 3600, // 72 hours
  grace_period: 30 * 24 * 3600, // 30 days
};

const TOKEN_TYPE = {
  ERC20: 0,
  ERC721: 1,
  ERC1155: 2
};

const STATUS = {
  LISTED: 0,
  UPDATED: 1,
  APPROVED_LISTING: 2,
  APPROVED_FUNDING: 3,
};

const DISCOUNT = {
  month3: 11,
  month6: 22,
  month12: 25,
};

///=================== start==
const FILM = [
  {
    actors: [r_address(), r_address(), r_address()],
    shares: [r_number(), r_number(), r_number()],
    rentPrice: r_number()
  },
  {
    actors: [r_address(), r_address(), r_address()],
    shares: [r_number(), r_number(), r_number()],
    rentPrice: r_number()
  },
  {
    actors: [r_address(), r_address(), r_address()],
    shares: [r_number(), r_number(), r_number()],
    rentPrice: r_number()
  }
];

const FILM_DATA = {
  actors: [r_address(), r_address(), r_address()],
  shares: [r_number(), r_number(), r_number()],
  watchs: [r_number(), r_number(), r_number()],
  sWatchs: [getBigNumber(20, 8), getBigNumber(15, 8), getBigNumber(30, 8)], // 20% 15% 30%
  rentPrice: r_number(),
  voteItem: [1, 1, 2, 1], // 1=>yes, 2=>no

  rentPrices : [getBigNumber(100), getBigNumber(200), getBigNumber(300), getBigNumber(400)],
  fundPeriods : [getBigNumber(30 * 86400, 0), getBigNumber(30 * 86400, 0), getBigNumber(60 * 86400, 0), getBigNumber(10 * 86400, 0)],
  onlyAllowVABs : [true, true, false, false],
  raiseAmounts : [getBigNumber(0), getBigNumber(0), getBigNumber(30000), getBigNumber(30000)],
};

const NFTs = {
  rinkeby: {
    addressList: [
      getAddress('0xf64638d60f06eb348d9d7430ade069dec9a5750b'),// erc-721
      getAddress('0x88b48f654c30e99bc2e4a1559b4dcf1ad93fa656'),// erc-1155
    ],
    periodList: [1, 3],
    tokenIdList: [
      '1185',
      '80080221229116283490468250292365070954995884570106478997872246018186124722178',// name of opensea: "search input"
      // '80080221229116283490468250292365070954995884570106478997872246017086613094401',// name of opensea: "cart buttons"
      // '80080221229116283490468250292365070954995884570106478997872246015987101466634', // name of opensea: "bookmark"
    ],
    tokenTypeList: [1, 2] // 1=>ERC-721, 2=>ERC-1155
  },
  mumbai: {
    addressList: [
      getAddress('0xC36442b4a4522E871399CD717aBDD847Ab11FE88'),// erc-721 from Uniswap V3 Positions NFT-V1 
      getAddress('0xA07e45A987F19E25176c877d98388878622623FA'),// erc-1155 from https://faucet.polygon.technology/
    ],
    periodList: [1, 3],
    tokenIdList: [
      '5528',
      '123',// Test ERC1155
    ],
    tokenTypeList: [1, 2] // 1=>ERC-721, 2=>ERC-1155
  },
}
// make offer in opensea
// 0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b
// 1769864
// ERC-721, Rinkeby

function getAddress(val) {
  return ethers.utils.getAddress(val);
}

function getByteFilm() {
  const hexStr = ethers.utils.defaultAbiCoder.encode(
    [ "address[]", "uint256[]", "uint256" ], [FILM_DATA.actors, FILM_DATA.shares, FILM_DATA.rentPrice]
  );
  const uint8Arr = ethers.utils.arrayify(hexStr); // Uint8Array [ 18, 52 ]
  return ethers.utils.hexlify(uint8Arr);// '0x01020304'
}

function createMintData(filmId, tier, amount, price, fee, reward) {
  const hexStr = ethers.utils.defaultAbiCoder.encode(
    [ "uint256", "uint256", "uint256", "uint256", "uint256", "uint256" ], [filmId, tier, amount, price, fee, reward]
  );
  const uint8Arr = ethers.utils.arrayify(hexStr); // Uint8Array [ 18, 52 ]
  return ethers.utils.hexlify(uint8Arr);// '0x01020304'
}
function getProposalFilm(nftRight, sharePercents, choiceAuditor, studioPayees, gatingType, rentPrice, raiseAmount, fundPeriod, fundStage, fundType) {
  const hexStr = ethers.utils.defaultAbiCoder.encode(
    [ "uint256[]", "uint256[]", "uint256[]", "address[]", "uint256", "uint256", "uint256", "uint256", "uint256", "uint256" ], [nftRight, sharePercents, choiceAuditor, studioPayees, gatingType, rentPrice, raiseAmount, fundPeriod, fundStage, fundType]);
  const uint8Arr = ethers.utils.arrayify(hexStr);
  return ethers.utils.hexlify(uint8Arr);
}

function getOldProposalFilm(film) {
  const hexStr = ethers.utils.defaultAbiCoder.encode(
    [ "uint256", "uint256", "uint256", "bool", "bool" ], film
  );
  const uint8Arr = ethers.utils.arrayify(hexStr);
  return ethers.utils.hexlify(uint8Arr);
}


function getByteFilmUpdate(filmId) {
  const hexStr = ethers.utils.defaultAbiCoder.encode(
    [ "uint256", "uint256[]", "address[]" ], [filmId, FILM_DATA.shares, FILM_DATA.actors]
  );
  const uint8Arr = ethers.utils.arrayify(hexStr);
  return ethers.utils.hexlify(uint8Arr);
}

function getFinalFilm(customer, filmId, wPercent) {
  const hexStr = ethers.utils.defaultAbiCoder.encode(
    [ "address", "uint256", "uint256" ], [customer, filmId, wPercent]
  );
  const uint8Arr = ethers.utils.arrayify(hexStr);
  return ethers.utils.hexlify(uint8Arr);
}

function getVoteData(filmIds, voteInfos) {
  const hexStr = ethers.utils.defaultAbiCoder.encode(
    [ "uint256[]", "uint256[]" ], [filmIds, voteInfos]
  );
  const uint8Arr = ethers.utils.arrayify(hexStr);
  return ethers.utils.hexlify(uint8Arr);
}

function getUploadGateContent(filmId, nftAddresses, tokenIds, tokenTypes) {
  const hexStr = ethers.utils.defaultAbiCoder.encode(
    [ "uint256", "address[]", "uint256[]", "uint256[]" ], [filmId, nftAddresses, tokenIds, tokenTypes]
  );
  const uint8Arr = ethers.utils.arrayify(hexStr);
  return ethers.utils.hexlify(uint8Arr);
}

function getByteForSwap(depositAmount, depositAsset, incomingAsset) {
  const hexStr = ethers.utils.defaultAbiCoder.encode(
    [ "uint256", "address", "address" ], [depositAmount, depositAsset, incomingAsset]
  );
  const uint8Arr = ethers.utils.arrayify(hexStr); // Uint8Array [ 18, 52 ]
  return ethers.utils.hexlify(uint8Arr);// '0x01020304'
}
/// ============== end ==============

function r_address() {
  const wallet = ethers.Wallet.createRandom();
  return wallet.address;
}

function r_number() { // 10^8 ~ 10^10
  return Math.floor(Math.random() * getBigNumber(1,10)) + getBigNumber(1,8);
}

// Defaults to e18 using amount * 10^18
function getBigNumber(amount, decimals = 18) {
  return BigNumber.from(amount).mul(BigNumber.from(10).pow(decimals));
}

async function getSignatures(signers, hexCallData) {
  const rs = [];
  const ss = [];
  const vs = [];

  for(const signer of signers) {
    const flatSig = await signer.signMessage(ethers.utils.arrayify(ethers.utils.keccak256(hexCallData)));
    const splitSig = ethers.utils.splitSignature(flatSig);
    rs.push(splitSig.r);
    ss.push(splitSig.s);
    vs.push(splitSig.v);
  }
  return { rs, ss, vs };
}

const buildSignatureBytes = (signatures) => {
  const SIGNATURE_LENGTH_BYTES = 65;
  signatures.sort((left, right) => left.signer.toLowerCase().localeCompare(right.signer.toLowerCase()));

  let signatureBytes = "0x";
  let dynamicBytes = "";
  for (const sig of signatures) {
      if (sig.dynamic) {
          /* 
              A contract signature has a static part of 65 bytes and the dynamic part that needs to be appended 
              at the end of signature bytes.
              The signature format is
              Signature type == 0
              Constant part: 65 bytes
              {32-bytes signature verifier}{32-bytes dynamic data position}{1-byte signature type}
              Dynamic part (solidity bytes): 32 bytes + signature data length
              {32-bytes signature length}{bytes signature data}
          */
          const dynamicPartPosition = (signatures.length * SIGNATURE_LENGTH_BYTES + dynamicBytes.length / 2)
              .toString(16)
              .padStart(64, "0");
          const dynamicPartLength = (sig.data.slice(2).length / 2).toString(16).padStart(64, "0");
          const staticSignature = `${sig.signer.slice(2).padStart(64, "0")}${dynamicPartPosition}00`;
          const dynamicPartWithLength = `${dynamicPartLength}${sig.data.slice(2)}`;

          signatureBytes += staticSignature;
          dynamicBytes += dynamicPartWithLength;
      } else {
          signatureBytes += sig.data.slice(2);
      }
  }

  return signatureBytes + dynamicBytes;
};

const getConfig = (chainId) => {
  if (chainId == 80001) { // localhost or mumbai
    return CONFIG.mumbai
  } else if (chainId == 1337 || chainId == 80002) {
    return CONFIG.polygonAmoy;
  } else if (chainId == 137) { // Polygon network
    return CONFIG.polygon
  } else if (chainId == 1) { // Ethereum mainnet
    return CONFIG.ethereum;
  }

  return CONFIG.mumbai;
}

const isTest = (chainId) => {
  return TEST_CHAIN_IDS.includes(chainId);
}

async function setupProvider(chainId) {
  const alchemy_key = process.env.ALCHEMY_KEY;
  
  let RPC_URL = `https://polygon-mumbai.g.alchemy.com/v2/${alchemy_key}`;
  if(chainId == 1337 || chainId == 80001) {
    RPC_URL = `https://polygon-mumbai.g.alchemy.com/v2/${alchemy_key}`    
  } else if(chainId == 137) {
    RPC_URL = `https://polygon-rpc.com`    
  }

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

  return provider;
}

async function getNetworkConfig() {
  let network = process.env.NETWORK;
  return CONFIG[network];
}

async function increaseTime(period) {
  network.provider.send('evm_increaseTime', [period]);
  await network.provider.send('evm_mine');
}


module.exports = {
  ZERO_ADDRESS,
  CONFIG,
  TOKEN_TYPE,
  STATUS,
  DISCOUNT,
  getBigNumber,
  getSignatures,
  getByteFilm,
  getByteFilmUpdate,
  getFinalFilm,
  getVoteData,
  getProposalFilm,
  getOldProposalFilm,
  FILM,
  NFTs,
  getUploadGateContent,
  createMintData,
  buildSignatureBytes,
  getConfig,
  isTest,
  setupProvider,
  getNetworkConfig,
  increaseTime,
  getByteForSwap
};
