const { ethers } = require('hardhat');
const { CONFIG, buildSignatureBytes } = require('./utils');

/**
 * Generates a signature for a given transaction without necessarily submitting it to the chain.
 * 
 * @param {Contract} gnosisSafe - The Gnosis Safe contract instance.
 * @param {string} encodedCallData - The encoded call data for the transaction.
 * @param {string} to - The address the transaction is directed to.
 * @param {Array} signers - An array of signer objects.
 * @param {boolean} executeOnChain - Whether to execute the transaction on chain.
 * @param {number} safeTxGas - The safe transaction gas.
 * @param {number} baseGas - The base gas for the transaction.
 * @param {number} gasPrice - The gas price.
 * @returns {Object} An object containing the signature bytes and transaction details.
 */
async function generateSignature(gnosisSafe, encodedCallData, to, signers, executeOnChain = true, safeTxGas = 100000, baseGas = 100000, gasPrice = 0) {
	try {
		const nonce = await gnosisSafe.nonce();

		const tx = {
			to, value: 0, data: encodedCallData, operation: 0,
			safeTxGas, baseGas, gasPrice,
			gasToken: CONFIG.addressZero, refundReceiver: CONFIG.addressZero,
			nonce
		};

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

		const cid = (await ethers.provider.getNetwork()).chainId;

		const ttx = await gnosisSafe.getTransactionHash(
			tx.to, tx.value, tx.data, tx.operation,
			tx.safeTxGas, tx.baseGas, tx.gasPrice,
			tx.gasToken, tx.refundReceiver, tx.nonce
		);

		if (executeOnChain) {
			await approveHashes(gnosisSafe, signers, ttx);
		}

		const signatures = await generateSignatures(signers, gnosisSafe, cid, types, tx);

		const signatureBytes = buildSignatureBytes(signatures).toLowerCase();

		return { signatureBytes, tx };
	} catch (error) {
		console.error('Error generating signature:', error);
		throw error;
	}
}

async function approveHashes(gnosisSafe, signers, ttx) {
	for (const signer of signers) {
		await gnosisSafe.connect(signer).approveHash(ttx, { from: signer.address });
	}
}

async function generateSignatures(signers, gnosisSafe, cid, types, tx) {
	const signatures = [];
	for (const signer of signers) {
		const signature = await signer._signTypedData({ verifyingContract: gnosisSafe.address, chainId: cid }, types, tx);
		signatures.push({ signer: signer.address, data: signature });
	}
	return signatures;
}


/**
 * Executes a transaction using Gnosis Safe with the given parameters.
 * 
 * @param {Contract} gnosisSafe - The Gnosis Safe contract instance.
 * @param {Signer} execSigner - The signer who will execute the transaction.
 * @param {string} signatureBytes - The signature bytes for the transaction.
 * @param {Object} transaction - The transaction object.
 * @returns {Promise<TransactionResponse>} The transaction response object.
 */
async function executeGnosisSafeTransaction(gnosisSafe, execSigner, signatureBytes, transaction) {
	try {
		const response = await gnosisSafe.connect(execSigner).execTransaction(
			transaction.to,
			transaction.value,
			transaction.data,
			transaction.operation,
			transaction.safeTxGas,
			transaction.baseGas,
			transaction.gasPrice,
			transaction.gasToken,
			transaction.refundReceiver,
			signatureBytes,
			{ from: execSigner.address }
		);

		// console.log('Gnosis Safe transaction executed:', response);

		return response;
	} catch (error) {
		console.error('Error executing Gnosis Safe transaction:', error);
		throw error;
	}
}

async function getExecuteResult(tx) {
	const rc = await tx.wait(); // 0ms, as tx is already confirmed
	// console.log("result", rc);

	const event = rc.events.find(row => row.event == 'ExecutionSuccess');

	if (!event) {
		return false;
	}

	return true;
}

/**
 * Estimates the gas required to execute a transaction via Gnosis Safe.
 * 
 * @param {Contract} gnosisSafe - The Gnosis Safe contract instance.
 * @param {Signer} execSigner - The signer who will execute the transaction.
 * @param {string} signatureBytes - The signature bytes for the transaction.
 * @param {Object} transaction - The transaction object.
 * @returns {BigNumber} The estimated gas required for the transaction.
 */
async function estimateGas(gnosisSafe, execSigner, signatureBytes, transaction) {
	try {
		const estimatedGas = await gnosisSafe.connect(execSigner).estimateGas.execTransaction(
			transaction.to,
			transaction.value,
			transaction.data,
			transaction.operation,
			transaction.safeTxGas,
			transaction.baseGas,
			transaction.gasPrice,
			transaction.gasToken,
			transaction.refundReceiver,
			signatureBytes
		);

		// const estimatedGas = await gnosisSafe.connect(execSigner).requiredTxGas(
		//   transaction.to, 
		//   transaction.value,
		//   transaction.data,
		//   transaction.operation
		// );

		//console.log("estimatedGas", estimatedGas.toString());

		return estimatedGas;
	} catch (error) {
		console.error('Error estimating gas:', error);
		throw error;
	}
}

async function runAuditFunction(contract, auditor, funcName, params, signer1, signer2) {
  const gasFeeMultiplier = 2;
  const encodedCallData = contract.interface.encodeFunctionData(
          funcName, 
          params
      );

  let safeTxGas;
  {
      const executeOnChain = false;
      const { signatureBytes, tx } = await generateSignature(auditor, encodedCallData, contract.address, [signer1, signer2], executeOnChain);

      const estimatedGas = await estimateGas(auditor, signer2, signatureBytes, tx);
      safeTxGas = estimatedGas.mul(gasFeeMultiplier);
  }

  // Generate Signature and Transaction information
  const executeOnChain = true;
  const { signatureBytes, tx } = await generateSignature(auditor, encodedCallData, contract.address, [signer1, signer2], executeOnChain, safeTxGas, safeTxGas);

  // Execute Gnosis Safe Transaction
  const transaction = await executeGnosisSafeTransaction(auditor, signer2, signatureBytes, tx);

  const result = await getExecuteResult(transaction);
  console.log('tx:', transaction.hash, result);

  // console.log("tx", transaction.hash);

  return transaction;
}

module.exports = {
	generateSignature,
	executeGnosisSafeTransaction,
	estimateGas,
	getExecuteResult,
  runAuditFunction
};
