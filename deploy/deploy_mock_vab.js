module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId, run }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const contract = await deploy('MockERC20', {
    from: deployer,
    args: ['Vabble', 'VAB'],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: true,
  });

  console.log(`MockERC20 deployed to: ${contract.address}`);

  try {
      await run("verify:verify", {
          address: contract.address,
          constructorArguments: ['Vabble', 'VAB'],
      })
  } catch (e) {
      if (e.message.toLowerCase().includes("already verified")) {
          console.log("Already verified!")
      } else {
          console.log(e)
      }
  }

  
};

module.exports.id = 'deploy_vab'
module.exports.tags = ['MockERC20'];
