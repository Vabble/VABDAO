// const { ethers } = require('hardhat');
const ethers = require('ethers');  
const crypto = require('crypto');
const { BigNumber } = ethers;

const NETWORK = 'mumbai';
const ZERO_ADDRESS = ethers.constants.AddressZero;
const CONFIG = {
  daoWalletAddress: "0xb10bcC8B508174c761CFB1E7143bFE37c4fBC3a1",
  addressZero: '0x0000000000000000000000000000000000000000',
  ethereum: {
    usdcAdress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",    
    vabToken: "",
    uniswap: { //Mainnet, kovan, rinkeby ...
      factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    },
    sushiswap: { // Mainnet
      factory: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
      router: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    },
  },
  rinkeby: {
    usdcAdress: "0xeb8f08a975Ab53E34D8a0330E0D34de942C95926", // usdc in rinkeby    
    daiAddress: "0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735", // dai in rinkeby
    vabToken: "0x7e8a9cB60E99baF479FECCb4a29C33caaEeb1c52",   // vab in rinkeby
    exmAddress: "0x6dB7315f4A296E47Eee37Ebb6871091dF5c2c40F", // exm in rinkeby
    uniswap: { //Mainnet, kovan, rinkeby ...
      factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    },
    sushiswap: { // Ethereum testnet(Rinkeby/Kovan/../), Polygon(all), Avalance(all), Arbitrum(Mainnet)
      factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    },
  },
  polygon: {
    usdcAdress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    vabToken: "",
    uniswap: { // Mainnet, Mumbai
      factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
      router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    },
    sushiswap: { // Mainnet, Mumbai
      factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    },
  },
  mumbai: {
    usdcAdress: "0xe11A86849d99F524cAC3E7A0Ec1241828e332C62",
    daiAddress: "0x001B3B4d0F3714Ca98ba10F6042DaEbF0B1B7b6F",
    vabToken: "0x5cBbA5484594598a660636eFb0A1AD953aFa4e32",
    exmAddress: "0x53BeF80E0EBE5A89dfb67782b12435aBeB943754",
    uniswap: { // Mainnet, Mumbai
      factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
      router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    },
    sushiswap: { // Mainnet, Mumbai
      factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    }, 
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
  APPROVED_LISTING: 1,
  APPROVED_FUNDING: 2,
  APPROVED_WITHOUTVOTE: 3
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
  voteItem: [1, 1, 2, 3], // 1=>yes, 2=>no, 3=> abstain

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

function getProposalFilm(film) {
  const hexStr = ethers.utils.defaultAbiCoder.encode(
    [ "uint256", "uint256", "uint256", "bool" ], film
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

function getFinalFilm(customer, filmIds) {
  const hexStr = ethers.utils.defaultAbiCoder.encode(
    [ "address", "uint256[]", "uint256[]" ], [customer, filmIds, FILM_DATA.sWatchs]
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

module.exports = {
  NETWORK,
  ZERO_ADDRESS,
  CONFIG,
  TOKEN_TYPE,
  STATUS,
  getBigNumber,
  getSignatures,
  getByteFilm,
  getByteFilmUpdate,
  getFinalFilm,
  getVoteData,
  getProposalFilm,
  FILM,
  NFTs,
  getUploadGateContent
};
