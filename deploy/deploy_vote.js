module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    this.Ownablee = await deployments.get('Ownablee');  

    const deployContract = await deploy('Vote', {
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
  module.exports.tags = ['Vote', 'Deploy'];
  module.exports.dependencies = ['Ownablee'];
  