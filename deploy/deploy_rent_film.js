// Defining bytecode and abi from original contract on mainnet to ensure bytecode matches and it produces the same pair code hash

module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { CONFIG } = require('../scripts/utils');
  this.mockVAB = await deployments.get('MockERC20');
  this.Vote = await deployments.get('VoteFilm');

  await deploy('RentFilm', {
    from: deployer,
    args: [
      CONFIG.daoFee,
      this.mockVAB.address, // fee currency
      this.Vote.address, // Vote contract
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: true,
  });
};

module.exports.id = 'deploy_rent_film'
module.exports.tags = ['RentFilm'];
module.exports.dependencies = ['MockERC20', 'VoteFilm'];
