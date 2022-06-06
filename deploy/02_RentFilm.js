// Defining bytecode and abi from original contract on mainnet to ensure bytecode matches and it produces the same pair code hash

module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  this.mockVAB = await deployments.get('MockERC20');

  await deploy('RentFilm', {
    from: deployer,
    args: [
      this.mockVAB.address, // fee currency
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: true,
  });
};

module.exports.id = 'deploy_rent_film'
module.exports.tags = ['RentFilm'];
module.exports.dependencies = ['MockERC20'];
