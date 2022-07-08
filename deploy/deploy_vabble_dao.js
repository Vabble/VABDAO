// Defining bytecode and abi from original contract on mainnet to ensure bytecode matches and it produces the same pair code hash

module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { CONFIG } = require('../scripts/utils');
  
  this.Vote = await deployments.get('Vote');
  this.StakingPool = await deployments.get('StakingPool');
  this.UniHelper = await deployments.get('UniHelper');

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
};

module.exports.id = 'deploy_vabble_dao'
module.exports.tags = ['VabbleDAO'];
module.exports.dependencies = ['Vote', 'StakingPool', 'UniHelper'];