// const { ethers } = require('hardhat');
const ethers = require('ethers');  
const crypto = require('crypto');
const { BigNumber } = ethers;

const ZERO_ADDRESS = ethers.constants.AddressZero;
const CONFIG = {
  daoFeeAddress: "0xb10bcC8B508174c761CFB1E7143bFE37c4fBC3a1",
  addressZero: '0x0000000000000000000000000000000000000000',
  usdcAdress: "0xeb8f08a975Ab53E34D8a0330E0D34de942C95926", // usdc in rinkeby    
  daiAddress: "0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735", // dai in rinkeby
  vabToken: "0x7e8a9cB60E99baF479FECCb4a29C33caaEeb1c52",   // vab in rinkeby
  exmAddress: "0x6dB7315f4A296E47Eee37Ebb6871091dF5c2c40F", // exm in rinkeby
  uniswap: {//Mainnet, kovan, rinkeby ...
    factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
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
  FILM
};