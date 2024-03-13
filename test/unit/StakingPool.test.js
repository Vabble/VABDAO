const { getNamedAccounts, deployments, ethers, network } = require('hardhat');
const { networkConfig, developmentChains } = require('../../helper-hardhat-config');
const { assert, expect } = require('chai');
const { CONFIG, DISCOUNT } = require('../../scripts/utils');
const ERC20 = require('../../data/ERC20.json');
const FxERC20 = require('../../data/FxERC20.json');
const { parseEther } = require('ethers/lib/utils');

const VAB_TOKEN_ADDRESS = CONFIG.mumbai.vabToken;
const EXM_TOKEN_ADDRESS = CONFIG.mumbai.exmAddress;
const USDC_TOKEN_ADDRESS = CONFIG.mumbai.usdcAdress;
const UNISWAP_FACTORY_ADDRESS = CONFIG.mumbai.uniswap.factory;
const UNISWAP_ROUTER_ADDRESS = CONFIG.mumbai.uniswap.router;
const SUSHISWAP_FACTORY_ADDRESS = CONFIG.mumbai.sushiswap.factory;
const SUSHISWAP_ROUTER_ADDRESS = CONFIG.mumbai.sushiswap.router;

!developmentChains.includes(network.name)
  ? describe.skip
  : describe('StakingPool Unit Tests', function () {
      let deployer,
        auditor,
        staker1,
        ownable,
        uniHelper,
        property,
        stakingPool,
        vote,
        filmNFT,
        subNFT,
        vabbleFund,
        vabbleDAO,
        subscription,
        stakingPoolFactory,
        vabTokenContract,
        gnosisSafe;

      const chainId = network.config.chainId;

      const vabFaucetAmount = ethers.utils.parseEther('50000'); // 50k is the max amount that can be faucet
      const stakingAmount = ethers.utils.parseEther('100');

      //! Question: Should this be it's own function in a separate file, because we might need this for every other test file ?
      beforeEach(async function () {
        //? contract factories
        //! Question: Clarify if we need gnosisSafeFactory ???
        const gnosisSafeFactory = await ethers.getContractFactory('GnosisSafeL2');
        const vabbleDAOFactory = await ethers.getContractFactory('VabbleDAO');
        const vabbleFundFactory = await ethers.getContractFactory('VabbleFund');
        const uniHelperFactory = await ethers.getContractFactory('UniHelper');
        const voteFactory = await ethers.getContractFactory('Vote');
        const propertyFactory = await ethers.getContractFactory('Property');
        const factoryFilmNFTFactory = await ethers.getContractFactory('FactoryFilmNFT');
        const factoryTierNFTFactory = await ethers.getContractFactory('FactoryTierNFT');
        const factorySubNFTFactory = await ethers.getContractFactory('FactorySubNFT');
        const ownableFactory = await ethers.getContractFactory('Ownablee');
        const subscriptionFactory = await ethers.getContractFactory('Subscription');
        stakingPoolFactory = await ethers.getContractFactory('StakingPool');

        //? get accounts
        [deployer, dev, auditor, staker1] = await ethers.getSigners();

        //? token contracts
        //! Question: Should we use FxERC20 or ERC20 ??
        vabTokenContract = new ethers.Contract(VAB_TOKEN_ADDRESS, JSON.stringify(FxERC20), ethers.provider);
        const exmTokenContract = new ethers.Contract(EXM_TOKEN_ADDRESS, JSON.stringify(ERC20), ethers.provider);
        const usdcTokenContract = new ethers.Contract(USDC_TOKEN_ADDRESS, JSON.stringify(ERC20), ethers.provider);

        //? Deploy contracts
        ownable = await ownableFactory.deploy(
          CONFIG.daoWalletAddress, // vabbleWallet
          vabTokenContract.address, // payoutToken
          usdcTokenContract.address, // usdcToken
          auditor.address // multiSigWallet
        );

        uniHelper = await uniHelperFactory.deploy(
          UNISWAP_FACTORY_ADDRESS,
          UNISWAP_ROUTER_ADDRESS,
          SUSHISWAP_FACTORY_ADDRESS,
          SUSHISWAP_ROUTER_ADDRESS,
          ownable.address
        );

        stakingPool = await stakingPoolFactory.deploy(ownable.address);

        vote = await voteFactory.deploy(ownable.address);

        property = await propertyFactory.deploy(ownable.address, uniHelper.address, vote.address, stakingPool.address);

        filmNFT = await factoryFilmNFTFactory.deploy(ownable.address);

        subNFT = await factorySubNFTFactory.deploy(ownable.address, uniHelper.address);

        vabbleFund = await vabbleFundFactory.deploy(
          ownable.address,
          uniHelper.address,
          stakingPool.address,
          property.address,
          filmNFT.address
        );

        vabbleDAO = await vabbleDAOFactory.deploy(
          ownable.address,
          uniHelper.address,
          vote.address,
          stakingPool.address,
          property.address,
          vabbleFund.address
        );

        tierNFT = await factoryTierNFTFactory.deploy(ownable.address, vabbleDAO.address, vabbleFund.address);

        subscription = await subscriptionFactory.deploy(ownable.address, uniHelper.address, property.address, [
          DISCOUNT.month3,
          DISCOUNT.month6,
          DISCOUNT.month12
        ]);

        //? Initialize the contracts with the correct arguments
        // !: Do we need this ? Not sure
        // await gnosisSafe.connect(deployer).setup(
        //   [signer1.address, signer2.address],
        //   2,
        //   CONFIG.addressZero,
        //   '0x',
        //   CONFIG.addressZero,
        //   CONFIG.addressZero,
        //   0,
        //   CONFIG.addressZero,
        //   { from: deployer.address }
        // );

        await filmNFT.connect(deployer).initialize(vabbleDAO.address, vabbleFund.address);

        await stakingPool.connect(deployer).initialize(vabbleDAO.address, property.address, vote.address);

        await vote.connect(deployer).initialize(vabbleDAO.address, stakingPool.address, property.address);

        await vabbleFund.connect(deployer).initialize(vabbleDAO.address);

        await uniHelper
          .connect(deployer)
          .setWhiteList(vabbleDAO.address, vabbleFund.address, subscription.address, filmNFT.address, subNFT.address);

        await ownable.connect(deployer).setup(vote.address, vabbleDAO.address, stakingPool.address);

        await ownable
          .connect(deployer)
          .addDepositAsset([
            vabTokenContract.address,
            usdcTokenContract.address,
            exmTokenContract.address,
            CONFIG.addressZero
          ]);

        //? Get some testnet VAB from the faucet
        const stakerConnectedContract = vabTokenContract.connect(staker1);
        await stakerConnectedContract.faucet(vabFaucetAmount);
        await stakerConnectedContract.approve(stakingPool.address, vabFaucetAmount);

        const deployerConnectedContract = vabTokenContract.connect(deployer);
        await deployerConnectedContract.faucet(vabFaucetAmount);
        await deployerConnectedContract.approve(stakingPool.address, vabFaucetAmount);
      });

      describe('Setup', function () {
        describe('Accounts', function () {
          it('should have the right balance, and allowance', async function () {
            const staker1Balance = await vabTokenContract.balanceOf(staker1.address);
            const staker1Allowance = await vabTokenContract.allowance(staker1.address, stakingPool.address);

            const deployerBalance = await vabTokenContract.balanceOf(deployer.address);
            const deployerAllowance = await vabTokenContract.allowance(deployer.address, stakingPool.address);

            expect(staker1Balance).to.equal(vabFaucetAmount);
            expect(staker1Allowance).to.equal(vabFaucetAmount);

            expect(deployerBalance).to.equal(vabFaucetAmount);
            expect(deployerAllowance).to.equal(vabFaucetAmount);
          });
        });
      });

      describe('constructor', function () {
        it('sets the right ownable address', async function () {
          assert.equal(await stakingPool.getOwnableAddress(), ownable.address);
        });
      });

      describe('initialize', function () {
        it('initializes the StakingPool correctly', async function () {
          assert.equal(await stakingPool.getVabbleDaoAddress(), vabbleDAO.address);
          assert.equal(await stakingPool.getPropertyAddress(), property.address);
          assert.equal(await stakingPool.getVoteAddress(), vote.address);
        });

        it('Should revert if already initialized', async function () {
          const [addr1, addr2, addr3] = await ethers.getSigners();

          await expect(stakingPool.initialize(addr1.address, addr2.address, addr3.address)).to.be.revertedWith(
            'init: initialized'
          );
        });

        it('Should revert if any address is zero', async function () {
          const [deployer, addr1, addr2] = await ethers.getSigners();
          stakingPool = await stakingPoolFactory.deploy(ownable.address);

          await expect(
            stakingPool.initialize(ethers.constants.AddressZero, addr2.address, deployer.address)
          ).to.be.revertedWith('init: zero dao');
          await expect(
            stakingPool.initialize(addr1.address, ethers.constants.AddressZero, deployer.address)
          ).to.be.revertedWith('init: zero property');
          await expect(
            stakingPool.initialize(addr1.address, addr2.address, ethers.constants.AddressZero)
          ).to.be.revertedWith('init: zero vote');
        });
      });

      describe('StakeVAB', function () {
        it('Should revert if staking with an amount of zero', async function () {
          const amount = ethers.utils.parseEther('0');
          await expect(stakingPool.connect(staker1).stakeVAB(amount)).to.be.revertedWith('sVAB: zero amount');
        });

        it('Should revert if staking with an amount less than the minimum', async function () {
          const amount = ethers.utils.parseEther('0.009');
          await expect(stakingPool.connect(staker1).stakeVAB(amount)).to.be.revertedWith('sVAB: min 0.01');
        });

        it('Should allow staking with a valid amount and update the stakers balance', async function () {
          //? Arrange
          const startingStakerBalance = await vabTokenContract.balanceOf(staker1.address);

          //? Act
          await stakingPool.connect(staker1).stakeVAB(stakingAmount);
          const stakeInfo = await stakingPool.stakeInfo(staker1.address);
          const endingStakerBalance = await vabTokenContract.balanceOf(staker1.address);

          //? Assert
          expect(stakeInfo.stakeAmount).to.equal(stakingAmount);
          expect(endingStakerBalance).to.equal(startingStakerBalance.sub(stakingAmount));
        });

        it('Should update the total staking amount after staking', async function () {
          //? Arrange
          const startingTotalStakingAmount = await stakingPool.totalStakingAmount();

          //? Act
          await stakingPool.connect(staker1).stakeVAB(stakingAmount);
          const endingTotalStakingAmount = await stakingPool.totalStakingAmount();

          //? Assert
          const expectedEndValue = startingTotalStakingAmount.add(stakingAmount);
          expect(endingTotalStakingAmount.toString()).to.equal(expectedEndValue.toString());
        });

        it('emits the TokenStaked event', async function () {
          await expect(stakingPool.connect(staker1).stakeVAB(stakingAmount))
            .to.emit(stakingPool, 'TokenStaked')
            .withArgs(staker1.address, stakingAmount);
        });
      });

      // describe('addRewardToPool', function () {
      //   it('Should add reward to the pool', async function () {
      //     const rewardAmount = ethers.utils.parseEther('10');
      //     await stakingPool.connect(addr1).addRewardToPool(rewardAmount);

      //     const totalRewardAmount = await stakingPool.totalRewardAmount();
      //     expect(totalRewardAmount).to.equal(rewardAmount);
      //   });

      //   it('Should emit RewardAdded event', async function () {
      //     const rewardAmount = ethers.utils.parseEther('10');
      //     await expect(stakingPool.connect(addr1).addRewardToPool(rewardAmount))
      //       .to.emit(stakingPool, 'RewardAdded')
      //       .withArgs(ethers.utils.parseEther('10'), rewardAmount, addr1.address);
      //   });

      //   it('Should revert if amount is zero', async function () {
      //     await expect(stakingPool.connect(addr1).addRewardToPool(0)).to.be.revertedWith('aRTP: zero amount');
      //   });

      //   it('Should revert if not called by a normal user', async function () {
      //     // Assuming there's a function in the contract that sets the user as a non-normal user
      //     await stakingPool.connect(owner).setUserAsNonNormal(addr1.address);
      //     await expect(stakingPool.connect(addr1).addRewardToPool(1)).to.be.revertedWith('Migration is on going');
      //   });
      // });
    });
