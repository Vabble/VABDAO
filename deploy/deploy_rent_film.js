// Defining bytecode and abi from original contract on mainnet to ensure bytecode matches and it produces the same pair code hash

module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { CONFIG } = require('../scripts/utils');
  // this.mockVAB = await deployments.get('MockERC20');
  this.Vote = await deployments.get('VoteFilm');
  this.StakingPool = await deployments.get('StakingPool');
  this.UniHelper = await deployments.get('UniHelper');

  await deploy('RentFilm', {
    from: deployer,
    args: [
      CONFIG.daoFeeAddress,
      CONFIG.vabToken,          // mockVAB
      this.Vote.address,        // Vote contract
      this.StakingPool.address, // StakingPool contract
      this.UniHelper.address    // UniHelper contract
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: true,
  });

  this.rentFilmContract = await deployments.get('RentFilm');
  console.log("vote contract address==", this.Vote.address+"=="+this.rentFilmContract.address);
  const VoteFilmFactory = await ethers.getContractFactory('VoteFilm');
  const voteConract = await (await VoteFilmFactory.deploy()).deployed();
  await voteConract.setting(
    this.rentFilmContract.address,
    this.StakingPool.address
  )
};

module.exports.id = 'deploy_rent_film'
module.exports.tags = ['RentFilm'];
module.exports.dependencies = ['MockERC20', 'VoteFilm', 'StakingPool', 'UniHelper'];
