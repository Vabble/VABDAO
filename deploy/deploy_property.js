module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { CONFIG } = require('../scripts/utils');
  
  this.Vote = await deployments.get('Vote');
  this.StakingPool = await deployments.get('StakingPool');
  this.UniHelper = await deployments.get('UniHelper');

  await deploy('Property', {
    from: deployer,
    args: [
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

  // const VoteFactory = await ethers.getContractFactory('Vote');
  // const voteConract = await (await VoteFactory.deploy()).deployed();
  // this.BoardContract = await deployments.get('FilmBoard');
  // console.log("initializeVote==", this.BoardContract.address+"=="+this.VabbleDAO.address);
        
  // await voteConract.initializeVote(
  //   this.VabbleDAO.address,
  //   this.StakingPool.address,
  //   this.BoardContract.address,
  //   CONFIG.vabToken
  // )
};

module.exports.id = 'deploy_property'
module.exports.tags = ['Property'];
module.exports.dependencies = ['Vote', 'StakingPool', 'UniHelper'];
