require('dotenv').config();
const { ethers } = require("hardhat");
const { CONFIG, NETWORK, buildSignatureBytes } = require('../scripts/utils');
const ERC20 = require('../data/ERC20.json');
  
module.exports = async function ({ deployments }) {
  return
    
  this.FactoryFilmNFT = await deployments.get('FactoryFilmNFT'); 
  this.FactorySubNFT = await deployments.get('FactorySubNFT');
  this.FactoryTierNFT = await deployments.get('FactoryTierNFT');
  this.GnosisSafeL2 = await deployments.get('GnosisSafeL2');
  this.Ownablee = await deployments.get('Ownablee'); 
  this.Property = await deployments.get('Property');
  this.StakingPool = await deployments.get('StakingPool');
  this.Subscription = await deployments.get('Subscription');
  this.UniHelper = await deployments.get('UniHelper');
  this.VabbleDAO = await deployments.get('VabbleDAO');
  this.VabbleFund = await deployments.get('VabbleFund');
  this.Vote = await deployments.get('Vote');    
   
  const GnosisSafeContract = await ethers.getContractAt('GnosisSafeL2', this.GnosisSafeL2.address)
  const OwnableeContract = await ethers.getContractAt('Ownablee', this.Ownablee.address)
  const StakingPoolContract = await ethers.getContractAt('StakingPool', this.StakingPool.address)
  const safeAddress = this.GnosisSafeL2.address;

  const pk1 = process.env.PK1
  const pk2 = process.env.PK2    
  const alchemy_key = process.env.ALCHEMY_KEY;

  let ethProvider
  if(NETWORK == 'mumbai') {
    this.USDTAddress = CONFIG.mumbai.usdtAdress
    
    const RPC_URL = `https://polygon-mumbai.g.alchemy.com/v2/${alchemy_key}`
    // const RPC_URL = `https://rpc-mumbai.maticvigil.com`    
    ethProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
  } else if(NETWORK == 'polygon') {
    this.USDTAddress = CONFIG.polygon.usdtAdress
    
    const RPC_URL = `https://polygon-rpc.com`
    ethProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
  }
  this.sig1 = new ethers.Wallet(pk1, ethProvider);
  this.sig2 = new ethers.Wallet(pk2, ethProvider);

  let assets = await OwnableeContract.getDepositAssetList()
  let nonce = await GnosisSafeContract.nonce() // 0
  console.log('====assets-before::', assets, nonce.toString())


  // TODO testing  
  // const vabTokenContract = new ethers.Contract(CONFIG.mumbai.vabToken, JSON.stringify(ERC20), ethProvider);
  // const user = '0x28B0CdD481Fb9f33bF6F3ce06837C3613C322dbd'
  // // const user = '0x6fD89350A94A02B003E638c889b54DAB0E251655'
  // const allowAmount = await vabTokenContract.allowance(user, this.StakingPool.address)
  // const userVAB = await vabTokenContract.balanceOf(user)
  // console.log('====allowAmount::', allowAmount.toString())
  // console.log('====userVAB::', userVAB.toString())
  
  const stakerCount = await StakingPoolContract.stakerCount()
  console.log('====stakerCount::', stakerCount.toString())
  
  //================ addDepositAsset  
  let encodedCallData = OwnableeContract.interface.encodeFunctionData("addDepositAsset", [[this.USDTAddress]]);

  const tx = {
    to: this.Ownablee.address,
    value: 0,
    data: encodedCallData,
    operation: 0,
    safeTxGas: 100000,
    baseGas: 100000,
    gasPrice: 0,
    gasToken: CONFIG.addressZero,
    refundReceiver: CONFIG.addressZero,
    nonce: nonce
  }
  const types = {
    SafeTx: [
      { type: "address", name: "to" },
      { type: "uint256", name: "value" },
      { type: "bytes", name: "data" },
      { type: "uint8", name: "operation" },
      { type: "uint256", name: "safeTxGas" },
      { type: "uint256", name: "baseGas" },
      { type: "uint256", name: "gasPrice" },
      { type: "address", name: "gasToken" },
      { type: "address", name: "refundReceiver" },
      { type: "uint256", name: "nonce" },
    ]
  }
  const cid = (await ethers.provider.getNetwork()).chainId
  
  const ttx = await GnosisSafeContract.getTransactionHash(
    tx.to,
    tx.value,
    tx.data,
    tx.operation,
    tx.safeTxGas,
    tx.baseGas,
    tx.gasPrice,
    tx.gasToken,
    tx.refundReceiver,
    tx.nonce
  )
      
  // await GnosisSafeContract.connect(this.sig1).approveHash(ttx, {from: this.sig1.address});
  await GnosisSafeContract.connect(this.sig2).approveHash(ttx, {from: this.sig2.address});

  const signatures = [
    {
      signer: this.sig1.address,
      data: await this.sig1._signTypedData({ verifyingContract: safeAddress, chainId: cid }, types, tx),
    },
    {
      signer: this.sig2.address,
      data: await this.sig2._signTypedData({ verifyingContract: safeAddress, chainId: cid }, types, tx),
    }
  ];

  const signatureBytes = buildSignatureBytes(signatures).toLowerCase();
  await GnosisSafeContract.connect(this.sig1).execTransaction(
      tx.to,
      tx.value,
      tx.data,
      tx.operation,
      tx.safeTxGas,
      tx.baseGas,
      tx.gasPrice,
      tx.gasToken,
      tx.refundReceiver,
      signatureBytes,
      {from: this.sig1.address},
  );    
    
  assets = await OwnableeContract.getDepositAssetList()
  nonce = await GnosisSafeContract.nonce() // 1
  console.log('====assets-after::', assets, nonce.toString())
};

module.exports.id = 'setup_auditor'
module.exports.dependencies = [
  'FactoryFilmNFT',
  'FactorySubNFT',
  'FactoryTierNFT',
  'GnosisSafeL2',
  'Ownablee',
  'Property',
  'StakingPool',
  'Subscription',
  'UniHelper',
  'VabbleDAO',
  'VabbleFund',
  'Vote'
];
  