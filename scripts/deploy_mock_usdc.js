module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId, run }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const contract = await deploy('MockUSDC', {
    from: deployer,
    args: ['USDC', 'USDC'],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: true,
  });

  try {
    await run("verify:verify", {
        address: contract.address,
        contract: "contracts/mocks/MockUSDC.sol:MockUSDC",
        constructorArguments: ['USDC', 'USDC'],
    })
  } catch (e) {
      if (e.message.toLowerCase().includes("already verified")) {
          console.log("Already verified!")
      } else {
          console.log(e)
      }
  }
};

module.exports.id = 'deploy_usdc'
module.exports.tags = ['MockUSDC', 'Deploy'];
