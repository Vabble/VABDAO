module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
  
    await deploy('VoteFilm', {
      from: deployer,
      args: [],
      log: true,
      deterministicDeployment: false,
      skipIfAlreadyDeployed: true,
    });
  };
  
  module.exports.id = 'deploy_vote_film'
  module.exports.tags = ['VoteFilm'];
  