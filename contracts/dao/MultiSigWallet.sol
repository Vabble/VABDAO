// // SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// // import "hardhat/console.sol";

// contract MultiSigWallet is ReentrancyGuard {
//     event SubmitTransaction(address indexed signer, uint256 indexed txIndex, address indexed to, uint256 value, bytes data);
//     event ConfirmTransaction(address indexed signer, uint256 indexed txIndex);
//     event RevokeConfirmation(address indexed signer, uint256 indexed txIndex);
//     event ExecuteTransaction(address indexed signer, uint256 indexed txIndex);
//     event SignerAdded(address indexed signer);
//     event SignerRemoved(address indexed signer);

//     address[] public signers;
//     mapping(address => bool) public isSigner;
//     uint256 public confirmCount;

//     struct Transaction {
//         address to;
//         uint256 value;
//         bytes data;
//         bool executed;
//         uint256 numConfirmations;
//     }

//     mapping(uint256 => mapping(address => bool)) public isConfirmed;

//     Transaction[] private transactions;

//     modifier onlyWallet() {
//         require(msg.sender == address(this));
//         _;
//     }

//     modifier onlySigner() {
//         require(isSigner[msg.sender], "not signer");
//         _;
//     }

//     modifier txExists(uint256 _txIndex) {
//         require(_txIndex < transactions.length, "tx does not exist");
//         _;
//     }

//     modifier notExecuted(uint256 _txIndex) {
//         require(!transactions[_txIndex].executed, "tx already executed");
//         _;
//     }

//     modifier notConfirmed(uint256 _txIndex) {
//         require(!isConfirmed[_txIndex][msg.sender], "tx already confirmed");
//         _;
//     }

//     receive() external payable {}

//     constructor(address[] memory _signers, uint256 _confirmCount) {
//         require(_signers.length != 0, "signers required");
//         require(
//             _confirmCount != 0 && _confirmCount <= _signers.length,
//             "invalid number of required confirmations"
//         );

//         for (uint256 i = 0; i < _signers.length; ++i) {
//             address signer = _signers[i];

//             require(signer != address(0), "invalid signer");
//             require(!isSigner[signer], "signer not unique");

//             isSigner[signer] = true;
//             signers.push(signer);
//         }

//         confirmCount = _confirmCount;
//     }

//     /// @dev Allows to add a new signer. Transaction has to be sent by wallet.
//     function addSigner(address _signer) external onlyWallet {   
//         require(_signer != address(0), "addSigner: zero signer");
//         require(!isSigner[_signer], "addSigner: already signer");

//         isSigner[_signer] = true;        
//         signers.push(_signer);

//         emit SignerAdded(_signer);
//     }

//     /// @dev Allows to remove a signer. Transaction has to be sent by wallet.
//     function removeSigner(address _signer) external onlyWallet {
//         require(isSigner[_signer], "removeSigner: not signer");

//         isSigner[_signer] = false;
//         for (uint256 i = 0; i < signers.length; ++i) {
//             if (_signer == signers[i]) {
//                 signers[i] = signers[signers.length - 1];
//                 signers.pop();
//                 break;
//             }
//         }

//         require(confirmCount <= signers.length, "removeSigner: overflow confirms count");

//         emit SignerRemoved(_signer);
//     }

//     /// @dev Allows to update confirmCount. Transaction has to be sent by wallet.
//     function changeConfirmCount(uint256 _count) external onlyWallet {   
//         require(_count != 0 && _count <= signers.length, "changeConfirmCount: invalid count");

//         confirmCount = _count;
//     }
    
//     /// @dev Submit tx
//     function submitTransaction(
//         address _to,
//         uint256 _value,
//         bytes memory _data
//     ) external onlySigner nonReentrant {
//         uint256 txIndex = transactions.length;

//         transactions.push(Transaction({to: _to, value: _value, data: _data, executed: false, numConfirmations: 0}));

//         emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);
//     }

//     function confirmTransaction(uint256 _txIndex) external onlySigner
//         txExists(_txIndex)
//         notExecuted(_txIndex)
//         notConfirmed(_txIndex)
//     {
//         Transaction storage transaction = transactions[_txIndex];
//         isConfirmed[_txIndex][msg.sender] = true;
//         transaction.numConfirmations += 1;

//         emit ConfirmTransaction(msg.sender, _txIndex);

//         if (transaction.numConfirmations >= confirmCount) {
//             __executeTransaction(_txIndex);
//         }
//     }

//     /**
//      * @dev We did not add onlySigner modifier here, because we want to allow any community member to execute transaction
//      * which had got at least minimum number of confirmations
//      */
//     function executeTransaction(uint256 _txIndex) external {
//         __executeTransaction(_txIndex);
//     }

//     function __executeTransaction(uint256 _txIndex) private txExists(_txIndex) notExecuted(_txIndex) {
//         Transaction storage transaction = transactions[_txIndex];

//         require(transaction.numConfirmations >= confirmCount, "cannot execute tx");

//         transaction.executed = true;

//         (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
//         require(success, "tx failed");

//         emit ExecuteTransaction(msg.sender, _txIndex);
//     }

//     function revokeConfirmation(uint256 _txIndex) external onlySigner txExists(_txIndex) notExecuted(_txIndex) {
//         Transaction storage transaction = transactions[_txIndex];

//         require(isConfirmed[_txIndex][msg.sender], "tx not confirmed");

//         transaction.numConfirmations -= 1;
//         isConfirmed[_txIndex][msg.sender] = false;

//         emit RevokeConfirmation(msg.sender, _txIndex);
//     }

//     function getSigners() external view returns (address[] memory) {
//         return signers;
//     }

//     function getTransactionCount() external view returns (uint256) {
//         return transactions.length;
//     }

//     function getTransaction(uint256 _txIndex) external view
//         returns (
//             address to,
//             uint256 value,
//             bytes memory data,
//             bool executed,
//             uint256 numConfirmations
//         )
//     {
//         Transaction storage transaction = transactions[_txIndex];

//         return (transaction.to, transaction.value, transaction.data, transaction.executed, transaction.numConfirmations);
//     }
// }
