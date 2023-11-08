const { expect } = require('chai');
const { ethers, getChainId } = require('hardhat');
const { CONFIG, DISCOUNT, getBigNumber, buildSignatureBytes } = require('../scripts/utils');
const ERC20 = require('../data/ERC20.json');

describe('GnosisSafe', function () {
  before(async function () {        
    this.OwnableFactory = await ethers.getContractFactory('Ownablee');
    this.GnosisSafeFactory = await ethers.getContractFactory('GnosisSafeL2');

    this.signers = await ethers.getSigners();
    this.deployer = this.signers[0];
    this.newAuditor = this.signers[1];    
    this.sig1 = this.signers[2];    
    this.sig2 = this.signers[3];       
    this.sig3 = this.signers[4];     
    this.newSig = this.signers[5]; 
    this.customer1 = this.signers[6]; 
    this.customer2 = this.signers[7]; 
  });

  beforeEach(async function () {
    this.vabToken = new ethers.Contract(CONFIG.mumbai.vabToken, JSON.stringify(ERC20), ethers.provider);
    this.USDC = new ethers.Contract(CONFIG.mumbai.usdcAdress, JSON.stringify(ERC20), ethers.provider);
    this.EXM = new ethers.Contract(CONFIG.mumbai.exmAddress, JSON.stringify(ERC20), ethers.provider);
    
    this.GnosisSafe = await (await this.GnosisSafeFactory.deploy()).deployed();    

    this.Ownablee = await (await this.OwnableFactory.deploy(
      CONFIG.daoWalletAddress, this.vabToken.address, this.USDC.address, this.GnosisSafe.address
    )).deployed(); 
    
    // Confirm auditor
    expect(await this.Ownablee.auditor()).to.be.equal(this.GnosisSafe.address);    
    expect(await this.Ownablee.deployer()).to.be.equal(this.deployer.address);  
    
    this.txIdx = 0
    this.events = [];
    
    await this.GnosisSafe.connect(this.deployer).setup(
      [this.sig1.address, this.sig2.address, this.sig3.address], 
      3, 
      CONFIG.addressZero, 
      "0x", 
      CONFIG.addressZero, 
      CONFIG.addressZero, 
      0, 
      CONFIG.addressZero, 
      {from: this.deployer.address}
    )

  });

  it('Check Gas fee with addDepositAsset', async function () {    
    let assets = await this.Ownablee.getDepositAssetList()
    console.log('====assets-before::', assets)

    const safeAddress = this.GnosisSafe.address;
    let nonce = await this.GnosisSafe.nonce() // 0
    
    //================ addDepositAsset
    let encodedCallData = this.Ownablee.interface.encodeFunctionData("addDepositAsset", [[this.USDC.address, this.EXM.address]]);

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
    
    const ttx = await this.GnosisSafe.getTransactionHash(
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
        
    // await this.GnosisSafe.connect(this.sig1).approveHash(ttx, {from: this.sig1.address});
    await this.GnosisSafe.connect(this.sig2).approveHash(ttx, {from: this.sig2.address});
    // await this.GnosisSafe.connect(this.sig3).approveHash(ttx, {from: this.sig3.address});

    const signatures = [
      {
        signer: this.sig1.address,
        data: await this.sig1._signTypedData({ verifyingContract: safeAddress, chainId: cid }, types, tx),
      },
      {
        signer: this.sig2.address,
        data: await this.sig2._signTypedData({ verifyingContract: safeAddress, chainId: cid }, types, tx),
      },      
      {
        signer: this.sig3.address,
        data: await this.sig3._signTypedData({ verifyingContract: safeAddress, chainId: cid }, types, tx),
      }
    ];

    const signatureBytes = buildSignatureBytes(signatures).toLowerCase();
    await this.GnosisSafe.connect(this.sig3).execTransaction(
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
        {from: this.sig3.address},
    );    
    
    nonce = await this.GnosisSafe.nonce() // 1
    
    assets = await this.Ownablee.getDepositAssetList()
    console.log('====assets-after::', assets)

    // gas-approveHash::        0.000047836000574032 ETH
    // gas-execTransaction::    0.000146138001607518 ETH
  });

  it('Test addOwnerWithThreshold and removeOwner', async function () {    
    let owners = await this.GnosisSafe.getOwners()
    let threshold = await this.GnosisSafe.getThreshold()
    console.log('====owners-before::', owners)
    console.log('====threshold-before::', threshold.toString())

    const safeAddress = this.GnosisSafe.address;
    let nonce = await this.GnosisSafe.nonce() // 0
    //========== addOwnerWithThreshold
    const num = Number(threshold) + 1
    let encodedCallData = this.GnosisSafe.interface.encodeFunctionData("addOwnerWithThreshold", [this.newSig.address, num]);

    const tx = {
      to: this.GnosisSafe.address,
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
    
    const ttx = await this.GnosisSafe.getTransactionHash(
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
        
    // await this.GnosisSafe.connect(this.sig1).approveHash(ttx, {from: this.sig1.address});
    await this.GnosisSafe.connect(this.sig2).approveHash(ttx, {from: this.sig2.address});
    // await this.GnosisSafe.connect(this.sig3).approveHash(ttx, {from: this.sig3.address});

    const signatures = [
      {
        signer: this.sig1.address,
        data: await this.sig1._signTypedData({ verifyingContract: safeAddress, chainId: cid }, types, tx),
      },
      {
        signer: this.sig2.address,
        data: await this.sig2._signTypedData({ verifyingContract: safeAddress, chainId: cid }, types, tx),
      },      
      {
        signer: this.sig3.address,
        data: await this.sig3._signTypedData({ verifyingContract: safeAddress, chainId: cid }, types, tx),
      }
    ];

    
    const signatureBytes = buildSignatureBytes(signatures).toLowerCase();
    await this.GnosisSafe.connect(this.sig3).execTransaction(
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
        {from: this.sig3.address},
    );    
    
    nonce = await this.GnosisSafe.nonce() // 1
    
    owners = await this.GnosisSafe.getOwners()
    threshold = await this.GnosisSafe.getThreshold()
    console.log('====owners-after::', owners)
    console.log('====threshold-after::', threshold.toString())
  });
});
