module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const { CONFIG, NETWORK } = require('../scripts/utils');

    this.Ownablee = await deployments.get('Ownablee');  
  
    if(NETWORK == 'mumbai') {
      this.vabToken = CONFIG.mumbai.vabToken
    } else if(NETWORK == 'rinkeby') {
      this.vabToken = CONFIG.mumbai.vabToken
    } else if(NETWORK == 'ethereum') {
      this.vabToken = CONFIG.ethereum.vabToken
    } else if(NETWORK == 'polygon') {
      this.vabToken = CONFIG.polygon.vabToken
    }

    await deploy('Vote', {
      from: deployer,
      args: [
        this.vabToken,
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
  