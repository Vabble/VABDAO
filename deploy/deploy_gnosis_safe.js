module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;
	console.log("Chain ID: ", chainId);
  
  await deploy('GnosisSafeL2', {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: true,
  });
};

module.exports.id = 'deploy_gnosis_safe'
module.exports.tags = ['GnosisSafeL2', 'Deploy'];
