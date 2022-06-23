module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
  
    await deploy('Vote', {
      from: deployer,
      args: [],
      log: true,
      deterministicDeployment: false,
      skipIfAlreadyDeployed: true,
    });
  };
  
  module.exports.id = 'deploy_vote'
  module.exports.tags = ['Vote'];
  