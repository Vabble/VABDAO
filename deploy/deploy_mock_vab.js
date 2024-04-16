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
};

module.exports.id = 'deploy_vab'
module.exports.tags = ['MockERC20', 'Deploy'];
