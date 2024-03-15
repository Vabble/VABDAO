const { ethers, network } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")
const { CONFIG, DISCOUNT, ZERO_ADDRESS } = require("../../scripts/utils")
const ERC20 = require("../../data/ERC20.json")
const FxERC20 = require("../../data/FxERC20.json")
const helpers = require("@nomicfoundation/hardhat-network-helpers")
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
const { parseEther } = require("ethers/lib/utils")

//? Constants
const VAB_TOKEN_ADDRESS = CONFIG.mumbai.vabToken
const EXM_TOKEN_ADDRESS = CONFIG.mumbai.exmAddress
const USDC_TOKEN_ADDRESS = CONFIG.mumbai.usdcAdress
const UNISWAP_FACTORY_ADDRESS = CONFIG.mumbai.uniswap.factory
const UNISWAP_ROUTER_ADDRESS = CONFIG.mumbai.uniswap.router
const SUSHISWAP_FACTORY_ADDRESS = CONFIG.mumbai.sushiswap.factory
const SUSHISWAP_ROUTER_ADDRESS = CONFIG.mumbai.sushiswap.router

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("StakingPool Unit Tests", function () {
          //? Variable declaration
          const vabFaucetAmount = parseEther("50000") // 50k is the max amount that can be faucet
          const stakingAmount = parseEther("100")
          const poolRewardAmount = parseEther("10000") // 10k
          const zeroEtherAmount = parseEther("0")

          /**
           *
           * @dev Executes the given function and takes a snapshot of the blockchain.
           * Upon subsequent calls to loadFixture with the same function, rather than executing the function again, the blockchain will be restored to that snapshot.
           */
          async function deployContractsFixture() {
              //? contract factories
              //! Question: Clarify if we need gnosisSafeFactory ???
              const gnosisSafeFactory = await ethers.getContractFactory("GnosisSafeL2")
              const vabbleDAOFactory = await ethers.getContractFactory("VabbleDAO")
              const vabbleFundFactory = await ethers.getContractFactory("VabbleFund")
              const uniHelperFactory = await ethers.getContractFactory("UniHelper")
              const voteFactory = await ethers.getContractFactory("Vote")
              const propertyFactory = await ethers.getContractFactory("Property")
              const factoryFilmNFTFactory = await ethers.getContractFactory("FactoryFilmNFT")
              const factoryTierNFTFactory = await ethers.getContractFactory("FactoryTierNFT")
              const factorySubNFTFactory = await ethers.getContractFactory("FactorySubNFT")
              const ownableFactory = await ethers.getContractFactory("Ownablee")
              const subscriptionFactory = await ethers.getContractFactory("Subscription")
              const stakingPoolFactory = await ethers.getContractFactory("StakingPool")

              //? get accounts
              const [deployer, dev, auditor, staker1, staker2] = await ethers.getSigners()

              //? token contracts
              //! Question: Should we use FxERC20 or ERC20 ??
              const vabTokenContract = new ethers.Contract(
                  VAB_TOKEN_ADDRESS,
                  JSON.stringify(FxERC20),
                  ethers.provider
              )
              const exmTokenContract = new ethers.Contract(
                  EXM_TOKEN_ADDRESS,
                  JSON.stringify(ERC20),
                  ethers.provider
              )
              const usdcTokenContract = new ethers.Contract(
                  USDC_TOKEN_ADDRESS,
                  JSON.stringify(ERC20),
                  ethers.provider
              )

              //? Deploy contracts
              const ownable = await ownableFactory.deploy(
                  CONFIG.daoWalletAddress, // vabbleWallet
                  vabTokenContract.address, // payoutToken
                  usdcTokenContract.address, // usdcToken
                  auditor.address // multiSigWallet
              )

              const uniHelper = await uniHelperFactory.deploy(
                  UNISWAP_FACTORY_ADDRESS,
                  UNISWAP_ROUTER_ADDRESS,
                  SUSHISWAP_FACTORY_ADDRESS,
                  SUSHISWAP_ROUTER_ADDRESS,
                  ownable.address
              )

              const stakingPool = await stakingPoolFactory.deploy(ownable.address)

              const vote = await voteFactory.deploy(ownable.address)

              const property = await propertyFactory.deploy(
                  ownable.address,
                  uniHelper.address,
                  vote.address,
                  stakingPool.address
              )

              const filmNFT = await factoryFilmNFTFactory.deploy(ownable.address)

              const subNFT = await factorySubNFTFactory.deploy(ownable.address, uniHelper.address)

              const vabbleFund = await vabbleFundFactory.deploy(
                  ownable.address,
                  uniHelper.address,
                  stakingPool.address,
                  property.address,
                  filmNFT.address
              )

              const vabbleDAO = await vabbleDAOFactory.deploy(
                  ownable.address,
                  uniHelper.address,
                  vote.address,
                  stakingPool.address,
                  property.address,
                  vabbleFund.address
              )

              const tierNFT = await factoryTierNFTFactory.deploy(
                  ownable.address,
                  vabbleDAO.address,
                  vabbleFund.address
              )

              const subscription = await subscriptionFactory.deploy(
                  ownable.address,
                  uniHelper.address,
                  property.address,
                  [DISCOUNT.month3, DISCOUNT.month6, DISCOUNT.month12]
              )

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

              await filmNFT.connect(deployer).initialize(vabbleDAO.address, vabbleFund.address)

              await stakingPool
                  .connect(deployer)
                  .initialize(vabbleDAO.address, property.address, vote.address)

              await vote
                  .connect(deployer)
                  .initialize(vabbleDAO.address, stakingPool.address, property.address)

              await vabbleFund.connect(deployer).initialize(vabbleDAO.address)

              await uniHelper
                  .connect(deployer)
                  .setWhiteList(
                      vabbleDAO.address,
                      vabbleFund.address,
                      subscription.address,
                      filmNFT.address,
                      subNFT.address
                  )

              await ownable
                  .connect(deployer)
                  .setup(vote.address, vabbleDAO.address, stakingPool.address)

              await ownable
                  .connect(deployer)
                  .addDepositAsset([
                      vabTokenContract.address,
                      usdcTokenContract.address,
                      exmTokenContract.address,
                      CONFIG.addressZero,
                  ])

              //? Get some testnet VAB from the faucet
              const accounts = [deployer, staker1, staker2]

              for (const account of accounts) {
                  await vabTokenContract.connect(account).faucet(vabFaucetAmount)
                  await vabTokenContract
                      .connect(account)
                      .approve(stakingPool.address, vabFaucetAmount)
              }

              return {
                  deployer,
                  dev,
                  auditor,
                  staker1,
                  staker2,
                  stakingPool,
                  ownable,
                  vabTokenContract,
                  vote,
                  property,
                  filmNFT,
                  subNFT,
                  vabbleFund,
                  vabbleDAO,
                  tierNFT,
                  subscription,
                  stakingPoolFactory,
              }
          }

          describe("setup", function () {
              describe("Accounts", function () {
                  it("should have the right balance, and allowance", async function () {
                      const { deployer, staker1, stakingPool, vabTokenContract } =
                          await loadFixture(deployContractsFixture)
                      const staker1Balance = await vabTokenContract.balanceOf(staker1.address)
                      const staker1Allowance = await vabTokenContract.allowance(
                          staker1.address,
                          stakingPool.address
                      )

                      const deployerBalance = await vabTokenContract.balanceOf(deployer.address)
                      const deployerAllowance = await vabTokenContract.allowance(
                          deployer.address,
                          stakingPool.address
                      )

                      expect(staker1Balance).to.equal(vabFaucetAmount)
                      expect(staker1Allowance).to.equal(vabFaucetAmount)

                      expect(deployerBalance).to.equal(vabFaucetAmount)
                      expect(deployerAllowance).to.equal(vabFaucetAmount)
                  })
              })
          })

          describe("constructor", function () {
              it("sets the right ownable address", async function () {
                  const { stakingPool, ownable } = await loadFixture(deployContractsFixture)
                  assert.equal(await stakingPool.getOwnableAddress(), ownable.address)
              })
          })

          describe("initialize", function () {
              it("initializes the StakingPool correctly", async function () {
                  const { vote, property, stakingPool, vabbleDAO } = await loadFixture(
                      deployContractsFixture
                  )
                  assert.equal(await stakingPool.getVabbleDaoAddress(), vabbleDAO.address)
                  assert.equal(await stakingPool.getPropertyAddress(), property.address)
                  assert.equal(await stakingPool.getVoteAddress(), vote.address)
              })

              it("Should revert if already initialized", async function () {
                  const { stakingPool } = await loadFixture(deployContractsFixture)
                  const [addr1, addr2, addr3] = await ethers.getSigners()

                  await expect(
                      stakingPool.initialize(addr1.address, addr2.address, addr3.address)
                  ).to.be.revertedWith("init: initialized")
              })

              it("Should revert if any address is zero", async function () {
                  const { stakingPoolFactory, ownable } = await loadFixture(deployContractsFixture)
                  const [deployer, addr1, addr2] = await ethers.getSigners()
                  const stakingPool = await stakingPoolFactory.deploy(ownable.address)

                  await expect(
                      stakingPool.initialize(ZERO_ADDRESS, addr2.address, deployer.address)
                  ).to.be.revertedWith("init: zero dao")
                  await expect(
                      stakingPool.initialize(addr1.address, ZERO_ADDRESS, deployer.address)
                  ).to.be.revertedWith("init: zero property")
                  await expect(
                      stakingPool.initialize(addr1.address, addr2.address, ZERO_ADDRESS)
                  ).to.be.revertedWith("init: zero vote")
              })
          })

          describe("stakeVAB", function () {
              it("Should revert if staking with an amount of zero", async function () {
                  const { stakingPool, staker1 } = await loadFixture(deployContractsFixture)
                  await expect(
                      stakingPool.connect(staker1).stakeVAB(zeroEtherAmount)
                  ).to.be.revertedWith("sVAB: zero amount")
              })

              it("Should revert if staking with an amount less than the minimum", async function () {
                  const { stakingPool, staker1 } = await loadFixture(deployContractsFixture)
                  const amount = parseEther("0.009")
                  await expect(stakingPool.connect(staker1).stakeVAB(amount)).to.be.revertedWith(
                      "sVAB: min 0.01"
                  )
              })

              it("Should allow staking with a valid amount and update the stakers balance", async function () {
                  //? Arrange
                  const { stakingPool, staker1, vabTokenContract } = await loadFixture(
                      deployContractsFixture
                  )
                  const startingStakerBalance = await vabTokenContract.balanceOf(staker1.address)

                  //? Act
                  await stakingPool.connect(staker1).stakeVAB(stakingAmount)
                  const stakeInfo = await stakingPool.stakeInfo(staker1.address)
                  const endingStakerBalance = await vabTokenContract.balanceOf(staker1.address)

                  //? Assert
                  expect(stakeInfo.stakeAmount).to.equal(stakingAmount)
                  expect(endingStakerBalance).to.equal(startingStakerBalance.sub(stakingAmount))
              })

              it("Should increment the staker count and update the staker list when first time staking with multiple stakers", async function () {
                  //? Arrange
                  const { stakingPool, staker1, staker2 } = await loadFixture(
                      deployContractsFixture
                  )
                  const startingTotalStakingAmount = await stakingPool.totalStakingAmount()

                  //? Act
                  // Stake two times with each staker
                  await stakingPool.connect(staker1).stakeVAB(stakingAmount)
                  await stakingPool.connect(staker1).stakeVAB(stakingAmount)
                  await stakingPool.connect(staker2).stakeVAB(stakingAmount)
                  await stakingPool.connect(staker2).stakeVAB(stakingAmount)

                  //? Assert
                  const stakerCount = await stakingPool.stakerCount()
                  const endingTotalStakingAmount = await stakingPool.totalStakingAmount()
                  const expectedEndValue = startingTotalStakingAmount.add(stakingAmount.mul(4))

                  assert.equal(stakerCount, 2)
                  assert.equal(await stakingPool.stakerList(0), staker1.address)
                  assert.equal(await stakingPool.stakerList(1), staker2.address)
                  assert.equal(endingTotalStakingAmount.toString(), expectedEndValue.toString())
              })

              it("Should update the total staking amount after staking", async function () {
                  const { stakingPool, staker1 } = await loadFixture(deployContractsFixture)

                  //? Arrange
                  const startingTotalStakingAmount = await stakingPool.totalStakingAmount()

                  //? Act
                  await stakingPool.connect(staker1).stakeVAB(stakingAmount)
                  const endingTotalStakingAmount = await stakingPool.totalStakingAmount()

                  //? Assert
                  const expectedEndValue = startingTotalStakingAmount.add(stakingAmount)
                  expect(endingTotalStakingAmount.toString()).to.equal(expectedEndValue.toString())
              })

              it("Should emit TokenStaked event", async function () {
                  const { stakingPool, staker1 } = await loadFixture(deployContractsFixture)
                  await expect(stakingPool.connect(staker1).stakeVAB(stakingAmount))
                      .to.emit(stakingPool, "TokenStaked")
                      .withArgs(staker1.address, stakingAmount)
              })

              it("Should revert if migration has started", async function () {
                  const { stakingPool, staker1, property } = await loadFixture(
                      deployContractsFixture
                  )
                  //? Arrange
                  await helpers.impersonateAccount(property.address)
                  const signer = await ethers.getSigner(property.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  //? Act
                  await stakingPool.connect(signer).calcMigrationVAB()
                  await helpers.stopImpersonatingAccount(property.address)

                  //? Assert
                  await expect(
                      stakingPool.connect(staker1).stakeVAB(stakingAmount)
                  ).to.be.revertedWith("Migration is on going")
              })
          })

          describe("addRewardToPool", function () {
              it("Should add reward to the pool and update the balance of the caller", async function () {
                  const { stakingPool, vabTokenContract, deployer } = await loadFixture(
                      deployContractsFixture
                  )

                  //? Arrange
                  const startingDeployerBalance = await vabTokenContract.balanceOf(deployer.address)
                  //? Act
                  await stakingPool.connect(deployer).addRewardToPool(poolRewardAmount)
                  //? Assert
                  const endingDeployerBalance = await vabTokenContract.balanceOf(deployer.address)
                  const totalRewardAmount = await stakingPool.totalRewardAmount()
                  expect(totalRewardAmount).to.equal(poolRewardAmount)
                  expect(endingDeployerBalance).to.equal(
                      startingDeployerBalance.sub(poolRewardAmount)
                  )
              })

              it("Should revert if amount is zero", async function () {
                  const { stakingPool, deployer } = await loadFixture(deployContractsFixture)
                  await expect(
                      stakingPool.connect(deployer).addRewardToPool(zeroEtherAmount)
                  ).to.be.revertedWith("aRTP: zero amount")
              })

              it("Should emit RewardAdded event", async function () {
                  const { stakingPool, deployer } = await loadFixture(deployContractsFixture)
                  const totalRewardAmount = poolRewardAmount
                  await expect(stakingPool.connect(deployer).addRewardToPool(poolRewardAmount))
                      .to.emit(stakingPool, "RewardAdded")
                      .withArgs(totalRewardAmount, poolRewardAmount, deployer.address)
              })

              it("Should revert if migration has started", async function () {
                  const { stakingPool, deployer, property } = await loadFixture(
                      deployContractsFixture
                  )
                  //? Arrange
                  await helpers.impersonateAccount(property.address)
                  const signer = await ethers.getSigner(property.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  //? Act
                  await stakingPool.connect(signer).calcMigrationVAB()
                  await helpers.stopImpersonatingAccount(property.address)
                  //? Assert
                  await expect(
                      stakingPool.connect(deployer).addRewardToPool(poolRewardAmount)
                  ).to.be.revertedWith("Migration is on going")
              })
          })

          describe("unstakeVAB", function () {
              it("Should revert if the contract caller is a zero address", async function () {
                  const { stakingPool } = await loadFixture(deployContractsFixture)
                  await expect(stakingPool.connect(ZERO_ADDRESS).unstakeVAB(stakingAmount)).to.be
                      .reverted
              })

              it("Should revert if the amount exceeds the stake balance of the user", async function () {
                  const { stakingPool, staker1, property } = await loadFixture(
                      deployContractsFixture
                  )
                  const lockPeriodInSeconds = Number(await property.lockPeriod())
                  await stakingPool.connect(staker1).stakeVAB(stakingAmount)
                  await ethers.provider.send("evm_increaseTime", [lockPeriodInSeconds])
                  await ethers.provider.send("evm_mine")

                  const exceededBalance = stakingAmount.add(1)
                  await expect(
                      stakingPool.connect(staker1).unstakeVAB(exceededBalance)
                  ).to.be.revertedWith("usVAB: insufficient")
              })

              it("Should revert if the user tries to unstake before the time period has elapsed", async function () {
                  const { stakingPool, staker1, property } = await loadFixture(
                      deployContractsFixture
                  )
                  const lockPeriodInSeconds = Number(await property.lockPeriod()) - 1
                  await stakingPool.connect(staker1).stakeVAB(stakingAmount)
                  await ethers.provider.send("evm_increaseTime", [lockPeriodInSeconds])
                  await ethers.provider.send("evm_mine")

                  await expect(
                      stakingPool.connect(staker1).unstakeVAB(stakingAmount)
                  ).to.be.revertedWith("usVAB: lock")
              })

              it("Should allow unstake if a migration is in progress", async function () {
                  const { stakingPool, staker1, property } = await loadFixture(
                      deployContractsFixture
                  )
                  //? We want to test if unstake works if a migration is in progress so we decrease the lock period
                  const lockPeriodInSeconds = Number(await property.lockPeriod()) - 100
                  await stakingPool.connect(staker1).stakeVAB(stakingAmount)
                  await ethers.provider.send("evm_increaseTime", [lockPeriodInSeconds])
                  await ethers.provider.send("evm_mine")

                  await helpers.impersonateAccount(property.address)
                  const signer = await ethers.getSigner(property.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await stakingPool.connect(signer).calcMigrationVAB()
                  await helpers.stopImpersonatingAccount(property.address)

                  //? Because we are in a migration, we can unstake
                  await expect(
                      stakingPool.connect(staker1).unstakeVAB(stakingAmount)
                  ).not.be.revertedWith("usVAB: lock")
              })

              it("Should allow user to unstake tokens after the correct time period has elapsed", async function () {
                  //? Arrange
                  const { stakingPool, staker1, property, vabTokenContract } = await loadFixture(
                      deployContractsFixture
                  )
                  const startingStakerBalance = await vabTokenContract.balanceOf(staker1.address)
                  const lockPeriodInSeconds = Number(await property.lockPeriod())
                  await stakingPool.connect(staker1).stakeVAB(stakingAmount)
                  const stakerBalanceAfterStaking = await vabTokenContract.balanceOf(
                      staker1.address
                  )
                  await ethers.provider.send("evm_increaseTime", [lockPeriodInSeconds])
                  await ethers.provider.send("evm_mine")

                  //? Act
                  await stakingPool.connect(staker1).unstakeVAB(stakingAmount)

                  //? Assert
                  const stakeInfo = await stakingPool.stakeInfo(staker1.address)
                  const stakerBalanceAfterUnstake = await vabTokenContract.balanceOf(
                      staker1.address
                  )

                  expect(stakeInfo.stakeAmount).to.be.equal(0)
                  expect(stakerBalanceAfterStaking).to.be.equal(
                      startingStakerBalance.sub(stakingAmount)
                  )
                  expect(stakerBalanceAfterUnstake).to.be.equal(startingStakerBalance)
              })

              it("Should lock the user's token again after unstake a fraction of their stake", async function () {
                  //? Arrange
                  const { stakingPool, staker1, property, vabTokenContract } = await loadFixture(
                      deployContractsFixture
                  )
                  const startingStakerBalance = await vabTokenContract.balanceOf(staker1.address)
                  const unstakeAmount = stakingAmount.sub(10) // 100 - 10 = 90
                  const lockPeriodInSeconds = Number(await property.lockPeriod())

                  await stakingPool.connect(staker1).stakeVAB(stakingAmount)
                  await ethers.provider.send("evm_increaseTime", [lockPeriodInSeconds])
                  await ethers.provider.send("evm_mine")

                  //? Act
                  await stakingPool.connect(staker1).unstakeVAB(unstakeAmount)

                  //? Assert
                  const newStakeTimeStamp = await helpers.time.latest()
                  const stakeInfo = await stakingPool.stakeInfo(staker1.address)
                  const stakerBalanceAfterUnstake = await vabTokenContract.balanceOf(
                      staker1.address
                  )

                  expect(stakeInfo.stakeTime).to.be.equal(newStakeTimeStamp)
                  expect(stakeInfo.stakeAmount).to.be.equal(stakingAmount.sub(unstakeAmount))
                  expect(stakerBalanceAfterUnstake).to.be.equal(startingStakerBalance.sub(10))
                  await expect(
                      stakingPool.connect(staker1).unstakeVAB(stakingAmount.sub(unstakeAmount))
                  ).to.be.revertedWith("usVAB: lock")
              })
          })
      })
