// const { ethers } = require('hardhat');
const ethers = require('ethers');  
const crypto = require('crypto');
const { BigNumber } = ethers;

const ZERO_ADDRESS = ethers.constants.AddressZero;
const CONFIG = {
  daoFeeAddress: "0xb10bcC8B508174c761CFB1E7143bFE37c4fBC3a1",
  addressZero: '0x0000000000000000000000000000000000000000',
  vab: '',
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
  RENTED: 1,
  EXPIRED: 2
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
  sWatchs: [2000, 1500, 3000], // 20% 15% 30%
  rentPrice: r_number()
};

function getByteFilm() {
  const hexStr = ethers.utils.defaultAbiCoder.encode(
    [ "address[]", "uint256[]", "uint256" ], [FILM_DATA.actors, FILM_DATA.shares, FILM_DATA.rentPrice]
  ); // '0x000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000004d2000000000000000000000000000000000000000000000000000000000000162e000000000000000000000000000000000000000000000000000000000000000b48656c6c6f20576f726c64000000000000000000000000000000000000000000'

  const uint8Arr = ethers.utils.arrayify(hexStr); // Uint8Array [ 18, 52 ]
  return ethers.utils.hexlify(uint8Arr);// '0x01020304'
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
/// ============== end==

function r_address() {
  const wallet = ethers.Wallet.createRandom();
  return wallet.address;
}

function r_number() { // 100 ~ 10000
  return Math.floor(Math.random() * 10000) + 100;
}

// Defaults to e18 using amount * 10^18
function getBigNumber(amount, decimals = 18) {
  return BigNumber.from(amount).mul(BigNumber.from(10).pow(decimals));
}

async function getSignatures(signers, hexCallData) {
  const rs = [];
  const ss = [];
  const vs = [];

  for (const signer of signers) {
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
  FILM
};
