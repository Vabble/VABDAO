module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const { CONFIG, NETWORK } = require('../scripts/utils');

    this.Ownablee = await deployments.get('Ownablee');  
  
    await deploy('Vote', {
      from: deployer,
      args: [
        this.Ownablee.address
      ],
      log: true,
      deterministicDeployment: false,
      skipIfAlreadyDeployed: false,
    });
  };
  
  module.exports.id = 'deploy_vote'
  module.exports.tags = ['Vote'];
  module.exports.dependencies = ['Ownablee'];
  