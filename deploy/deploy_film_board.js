// Defining bytecode and abi from original contract on mainnet to ensure bytecode matches and it produces the same pair code hash

module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { CONFIG } = require('../scripts/utils');
  
  this.VabbleDAO = await deployments.get('VabbleDAO');
  this.Vote = await deployments.get('Vote');
  this.StakingPool = await deployments.get('StakingPool');
  this.UniHelper = await deployments.get('UniHelper');

  await deploy('FilmBoard', {
    from: deployer,
    args: [
      CONFIG.vabToken,          // mockVAB
      this.VabbleDAO.address,   // VabbleDAO contract
      this.Vote.address,        // Vote contract
      this.StakingPool.address, // StakingPool contract
      this.UniHelper.address,   // UniHelper contract
      CONFIG.usdcAdress
    ],
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: true,
  });

  const VoteFactory = await ethers.getContractFactory('Vote');
  const voteConract = await (await VoteFactory.deploy()).deployed();
  this.BoardContract = await deployments.get('FilmBoard');
  console.log("initializeVote==", this.BoardContract.address+"=="+this.VabbleDAO.address);
        
  await voteConract.initializeVote(
    this.VabbleDAO.address,
    this.StakingPool.address,
    this.BoardContract.address,
    CONFIG.vabToken
  )
};

module.exports.id = 'deploy_film_board'
module.exports.tags = ['FilmBoard'];
module.exports.dependencies = ['VabbleDAO', 'Vote', 'StakingPool', 'UniHelper'];
