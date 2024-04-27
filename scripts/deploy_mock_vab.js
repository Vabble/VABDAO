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

  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;
  if (chainId != 80002) 
    return;

  try {
    await run("verify:verify", {
        address: contract.address,
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

module.exports.id = 'deploy_vab'
module.exports.tags = ['MockERC20', 'Deploy'];
