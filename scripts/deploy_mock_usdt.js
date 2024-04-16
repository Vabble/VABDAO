module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId, run }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const contract = await deploy('MockUSDT', {
    from: deployer,
    args: ['USDT', 'USDT'],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: true,
  });

  try {
    await run("verify:verify", {
        address: contract.address,
        contract: "contracts/mocks/MockUSDT.sol:MockUSDT",
        constructorArguments: ['USDT', 'USDT'],
    })
  } catch (e) {
      if (e.message.toLowerCase().includes("already verified")) {
          console.log("Already verified!")
      } else {
          console.log(e)
      }
  }
};

module.exports.id = 'deploy_usdt'
module.exports.tags = ['MockUSDT', 'Deploy'];
