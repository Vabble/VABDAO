// Defining bytecode and abi from original contract on mainnet to ensure bytecode matches and it produces the same pair code hash

module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { CONFIG } = require('../scripts/utils');
  // this.mockVAB = await deployments.get('MockERC20');
  this.Vote = await deployments.get('VoteFilm');
  this.StakingPool = await deployments.get('StakingPool');
  this.UniHelper = await deployments.get('UniHelper');
  this.FilmBoard = await deployments.get('FilmBoard');

  await deploy('VabbleDAO', {
    from: deployer,
    args: [
      CONFIG.daoFeeAddress,
      CONFIG.vabToken,          // mockVAB
      this.Vote.address,        // Vote contract
      this.StakingPool.address, // StakingPool contract
      this.UniHelper.address,   // UniHelper contract
      CONFIG.usdcAdress
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: true,
  });

  this.vabbleDAOContract = await deployments.get('VabbleDAO');
  console.log("vote contract address==", this.Vote.address+"=="+this.vabbleDAOContract.address);
  const VoteFilmFactory = await ethers.getContractFactory('VoteFilm');
  const voteConract = await (await VoteFilmFactory.deploy()).deployed();
  await voteConract.initializeVote(
    this.vabbleDAOContract.address,
    this.StakingPool.address,
    this.FilmBoard.address
  )
};

module.exports.id = 'deploy_vabble_dao'
module.exports.tags = ['VabbleDAO'];
module.exports.dependencies = ['MockERC20', 'VoteFilm', 'StakingPool', 'UniHelper'];
