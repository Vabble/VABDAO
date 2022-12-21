module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { CONFIG, NETWORK } = require('../scripts/utils');
  
  await deploy('Ownablee', {
    from: deployer,
    args: [
      CONFIG.daoWalletAddress
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
  });
};

module.exports.id = 'deploy_ownablee'
module.exports.tags = ['Ownablee'];
