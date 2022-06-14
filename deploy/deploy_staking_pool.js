// Defining bytecode and abi from original contract on mainnet to ensure bytecode matches and it produces the same pair code hash

module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  this.mockVAB = await deployments.get('MockERC20');
  this.Vote = await deployments.get('VoteFilm');

  await deploy('StakingPool', {
    from: deployer,
    args: [
      this.mockVAB.address, // fee currency
      this.Vote.address, // Vote contract
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: true,
  });
};

module.exports.id = 'deploy_staking_pool'
module.exports.tags = ['StakingPool'];
module.exports.dependencies = ['MockERC20', 'VoteFilm'];
