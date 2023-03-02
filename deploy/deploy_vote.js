const { ethers } = require("hardhat");

module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    this.Ownablee = await deployments.get('Ownablee');  
    
    this.VabbleDAO = await deployments.get('VabbleDAO');
    this.StakingPool = await deployments.get('StakingPool');
    this.Property = await deployments.get('Property');

    const deployContract = await deploy('Vote', {
      from: deployer,
      args: [
        this.Ownablee.address
      ],
      log: true,
      deterministicDeployment: false,
      skipIfAlreadyDeployed: false,
    });

    const contract = await ethers.getContractAt('Vote', deployContract.address)
    await (await contract.initializeVote(this.VabbleDAO.address, this.StakingPool.address, this.Property.address)).wait();
  };
  
  

  module.exports.id = 'deploy_vote'
  module.exports.tags = ['Vote'];
  module.exports.dependencies = ['Ownablee'];
  