const { ethers, network } = require("hardhat")
const { developmentChains, ONE_DAY_IN_SECONDS } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")
const { ZERO_ADDRESS } = require("../../scripts/utils")
const helpers = require("@nomicfoundation/hardhat-network-helpers")
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
const { parseEther } = require("ethers/lib/utils")
const {
    fundAndApproveAccounts,
    deployAndInitAllContracts,
    createAndUpdateDummyFilmProposal,
    createDummyGovernancePropertyProposal,
    getTimestampFromTx,
} = require("../../helper-functions")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("StakingPool Unit Tests", function () {
          //? Variable declaration
          const stakingAmount = parseEther("100")
          const poolRewardAmount = parseEther("10000") // 10k
          const zeroEtherAmount = parseEther("0")
          const yesVoteValue = 1

          /**
           *
           * @dev Executes the given function and takes a snapshot of the blockchain.
           * Upon subsequent calls to loadFixture with the same function, rather than executing the function again, the blockchain will be restored to that snapshot.
           */
          async function deployContractsFixture() {
              const {
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
                  lockPeriodInSeconds,
                  propertyVotePeriod,
                  boardRewardRate,
                  rewardRate,
                  usdcTokenContract,
              } = await deployAndInitAllContracts()

              //? Fund and approve accounts
              const accounts = [deployer, staker1, staker2]
              const contractsToApprove = [stakingPool, property, vabbleDAO]
              await fundAndApproveAccounts({
                  accounts,
                  vabTokenContract,
                  contracts: contractsToApprove,
                  usdcTokenContract,
              })

              //? Connect accounts to stakingPool contract
              const stakingPoolDeployer = stakingPool.connect(deployer)
              const stakingPoolStaker1 = stakingPool.connect(staker1)
              const stakingPoolStaker2 = stakingPool.connect(staker2)

              //? Helper functions

              /**
               * Calculate the estimated reward amount for a given staker over a specified period.
               *
               * @param {Object} staker - The staker object containing address information.
               * @param {number} period - The period for which the reward is calculated.
               * @return {BigNumber} The estimated reward amount for the staker.
               */
              const getEstimatedReward = async ({ staker, endTime, startTime }) => {
                  const totalStakingAmount = await stakingPool.totalStakingAmount()
                  const stakeInfo = await stakingPool.stakeInfo(staker.address)
                  const stakerPoolShare = stakeInfo.stakeAmount.mul(1e10).div(totalStakingAmount)
                  const rewardPercent = rewardRate.mul(stakerPoolShare).div(1e10)

                  const totalRewardAmount = await stakingPool.totalRewardAmount()

                  // Calculate period with same precision as contract
                  const period = ethers.BigNumber.from(endTime)
                      .sub(startTime)
                      .mul(1e4)
                      .div(ONE_DAY_IN_SECONDS)

                  let estimatedRewardAmount = totalRewardAmount
                      .mul(rewardPercent)
                      .div(1e10)
                      .mul(period)
                      .div(1e4)

                  const isBoardMember =
                      (await property.checkGovWhitelist(2, staker.address)).toString() == "2"

                  if (isBoardMember) {
                      estimatedRewardAmount = estimatedRewardAmount.add(
                          estimatedRewardAmount.mul(boardRewardRate).div(1e10)
                      )
                  }

                  return estimatedRewardAmount
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
                  lockPeriodInSeconds,
                  stakingPoolStaker1,
                  stakingPoolStaker2,
                  stakingPoolDeployer,
                  propertyVotePeriod,
                  getEstimatedReward,
                  boardRewardRate,
                  rewardRate,
              }
          }

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
                  const { stakingPoolStaker1 } = await loadFixture(deployContractsFixture)
                  await expect(stakingPoolStaker1.stakeVAB(zeroEtherAmount)).to.be.revertedWith(
                      "sVAB: zero amount"
                  )
              })

              it("Should revert if staking with an amount less than the minimum", async function () {
                  const { stakingPoolStaker1 } = await loadFixture(deployContractsFixture)
                  const amount = parseEther("0.009")
                  await expect(stakingPoolStaker1.stakeVAB(amount)).to.be.revertedWith(
                      "sVAB: min 0.01"
                  )
              })

              it("Should allow staking with a valid amount and update the stakers balance", async function () {
                  //? Arrange
                  const { stakingPool, staker1, vabTokenContract, stakingPoolStaker1 } =
                      await loadFixture(deployContractsFixture)
                  const startingStakerBalance = await vabTokenContract.balanceOf(staker1.address)

                  //? Act
                  await stakingPoolStaker1.stakeVAB(stakingAmount)
                  const stakeInfo = await stakingPool.stakeInfo(staker1.address)
                  const endingStakerBalance = await vabTokenContract.balanceOf(staker1.address)

                  //? Assert
                  expect(stakeInfo.stakeAmount).to.equal(stakingAmount)
                  expect(endingStakerBalance).to.equal(startingStakerBalance.sub(stakingAmount))
              })

              it("Should increment the staker count and update the staker list when first time staking with multiple stakers", async function () {
                  //? Arrange
                  const { stakingPool, staker1, staker2, stakingPoolStaker1, stakingPoolStaker2 } =
                      await loadFixture(deployContractsFixture)
                  const startingTotalStakingAmount = await stakingPool.totalStakingAmount()

                  //? Act
                  // Stake two times with each staker
                  await stakingPoolStaker1.stakeVAB(stakingAmount)
                  await stakingPoolStaker1.stakeVAB(stakingAmount)
                  await stakingPoolStaker2.stakeVAB(stakingAmount)
                  await stakingPoolStaker2.stakeVAB(stakingAmount)

                  //? Assert
                  const stakerCount = await stakingPool.stakerCount()
                  const endingTotalStakingAmount = await stakingPool.totalStakingAmount()
                  const expectedEndValue = startingTotalStakingAmount.add(stakingAmount.mul(4))
                  const stakerList = await stakingPool.getStakerList()

                  assert.equal(stakerCount, 2)
                  assert.equal(stakerList.length, 2)
                  assert.equal(await stakerList[0], staker1.address)
                  assert.equal(await stakerList[1], staker2.address)
                  assert.equal(endingTotalStakingAmount.toString(), expectedEndValue.toString())
              })

              it("Should update the total staking amount after staking", async function () {
                  const { stakingPool, stakingPoolStaker1 } = await loadFixture(
                      deployContractsFixture
                  )

                  //? Arrange
                  const startingTotalStakingAmount = await stakingPool.totalStakingAmount()

                  //? Act
                  await stakingPoolStaker1.stakeVAB(stakingAmount)
                  const endingTotalStakingAmount = await stakingPool.totalStakingAmount()

                  //? Assert
                  const expectedEndValue = startingTotalStakingAmount.add(stakingAmount)
                  expect(endingTotalStakingAmount.toString()).to.equal(expectedEndValue.toString())
              })

              it("Should emit TokenStaked event with the correct arguments", async function () {
                  const { stakingPool, staker1, stakingPoolStaker1 } = await loadFixture(
                      deployContractsFixture
                  )
                  await expect(stakingPoolStaker1.stakeVAB(stakingAmount))
                      .to.emit(stakingPool, "TokenStaked")
                      .withArgs(staker1.address, stakingAmount)
              })

              it("Should revert if migration has started", async function () {
                  const { stakingPool, stakingPoolStaker1, property } = await loadFixture(
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
                  await expect(stakingPoolStaker1.stakeVAB(stakingAmount)).to.be.revertedWith(
                      "Migration is on going"
                  )
              })
          })

          describe("addRewardToPool", function () {
              it("Should add reward to the pool and update the balance of the caller", async function () {
                  const { stakingPool, vabTokenContract, deployer, stakingPoolDeployer } =
                      await loadFixture(deployContractsFixture)

                  //? Arrange
                  const startingDeployerBalance = await vabTokenContract.balanceOf(deployer.address)
                  //? Act
                  await stakingPoolDeployer.addRewardToPool(poolRewardAmount)
                  //? Assert
                  const endingDeployerBalance = await vabTokenContract.balanceOf(deployer.address)
                  const totalRewardAmount = await stakingPool.totalRewardAmount()
                  expect(totalRewardAmount).to.equal(poolRewardAmount)
                  expect(endingDeployerBalance).to.equal(
                      startingDeployerBalance.sub(poolRewardAmount)
                  )
              })

              it("Should revert if amount is zero", async function () {
                  const { stakingPoolDeployer } = await loadFixture(deployContractsFixture)
                  await expect(
                      stakingPoolDeployer.addRewardToPool(zeroEtherAmount)
                  ).to.be.revertedWith("aRTP: zero amount")
              })

              it("Should emit RewardAdded event", async function () {
                  const { stakingPool, deployer, stakingPoolDeployer } = await loadFixture(
                      deployContractsFixture
                  )
                  const totalRewardAmount = poolRewardAmount
                  await expect(stakingPoolDeployer.addRewardToPool(poolRewardAmount))
                      .to.emit(stakingPool, "RewardAdded")
                      .withArgs(totalRewardAmount, poolRewardAmount, deployer.address)
              })

              it("Should revert if migration has started", async function () {
                  const { stakingPool, stakingPoolDeployer, property } = await loadFixture(
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
                      stakingPoolDeployer.addRewardToPool(poolRewardAmount)
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
                  const { lockPeriodInSeconds, stakingPoolStaker1 } = await loadFixture(
                      deployContractsFixture
                  )
                  await stakingPoolStaker1.stakeVAB(stakingAmount)
                  await helpers.time.increase(lockPeriodInSeconds)

                  const exceededBalance = stakingAmount.add(1)
                  await expect(stakingPoolStaker1.unstakeVAB(exceededBalance)).to.be.revertedWith(
                      "usVAB: insufficient"
                  )
              })

              it("Should revert if the user tries to unstake before the time period has elapsed", async function () {
                  const { stakingPoolStaker1, lockPeriodInSeconds } = await loadFixture(
                      deployContractsFixture
                  )
                  const adjustedLockPeriodInSeconds = lockPeriodInSeconds - 1
                  await stakingPoolStaker1.stakeVAB(stakingAmount)
                  await helpers.time.increase(adjustedLockPeriodInSeconds)

                  await expect(stakingPoolStaker1.unstakeVAB(stakingAmount)).to.be.revertedWith(
                      "usVAB: lock"
                  )
              })

              it("Should allow unstake if a migration is in progress", async function () {
                  const { stakingPool, stakingPoolStaker1, lockPeriodInSeconds, property } =
                      await loadFixture(deployContractsFixture)
                  //? We want to test if unstake works if a migration is in progress so we decrease the lock period
                  const adjustedLockPeriodInSeconds = lockPeriodInSeconds - 100
                  await stakingPoolStaker1.stakeVAB(stakingAmount)
                  await helpers.time.increase(adjustedLockPeriodInSeconds)

                  await helpers.impersonateAccount(property.address)
                  const signer = await ethers.getSigner(property.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await stakingPool.connect(signer).calcMigrationVAB()
                  await helpers.stopImpersonatingAccount(property.address)

                  //? Because we are in a migration, we can unstake
                  await expect(stakingPoolStaker1.unstakeVAB(stakingAmount)).not.be.revertedWith(
                      "usVAB: lock"
                  )
              })

              it("Should allow user to unstake tokens after the correct time period has elapsed", async function () {
                  //? Arrange
                  const {
                      stakingPool,
                      staker1,
                      vabTokenContract,
                      lockPeriodInSeconds,
                      stakingPoolStaker1,
                  } = await loadFixture(deployContractsFixture)

                  const startingStakerBalance = await vabTokenContract.balanceOf(staker1.address)
                  await stakingPoolStaker1.stakeVAB(stakingAmount)
                  const stakerBalanceAfterStaking = await vabTokenContract.balanceOf(
                      staker1.address
                  )
                  await helpers.time.increase(lockPeriodInSeconds)

                  //? Act
                  await stakingPoolStaker1.unstakeVAB(stakingAmount)

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
                  const {
                      stakingPool,
                      staker1,
                      lockPeriodInSeconds,
                      vabTokenContract,
                      stakingPoolStaker1,
                  } = await loadFixture(deployContractsFixture)
                  const startingStakerBalance = await vabTokenContract.balanceOf(staker1.address)
                  const unstakeAmount = stakingAmount.sub(10) // 100 - 10 = 90

                  await stakingPoolStaker1.stakeVAB(stakingAmount)
                  await helpers.time.increase(lockPeriodInSeconds)

                  //? Act
                  await stakingPoolStaker1.unstakeVAB(unstakeAmount)

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
                      stakingPoolStaker1.unstakeVAB(stakingAmount.sub(unstakeAmount))
                  ).to.be.revertedWith("usVAB: lock")
              })

              it("Should remove the address from the stakerList and stakeInfo after unstake all VAB", async function () {
                  //? Arrange
                  const { stakingPool, staker1, lockPeriodInSeconds, stakingPoolStaker1 } =
                      await loadFixture(deployContractsFixture)

                  //? Act
                  await stakingPoolStaker1.stakeVAB(stakingAmount)
                  await helpers.time.increase(lockPeriodInSeconds)
                  await stakingPoolStaker1.unstakeVAB(stakingAmount)

                  //? Assert
                  const stakeInfo = await stakingPool.stakeInfo(staker1.address)
                  const stakerList = await stakingPool.getStakerList()

                  expect(stakeInfo.stakeAmount).equal(
                      0,
                      "Stake amount should be 0 after unstake all VAB"
                  )
                  expect(stakeInfo.stakeTime).equal(
                      0,
                      "Stake time should be 0 after unstake all VAB"
                  )
                  expect(stakeInfo.outstandingReward).equal(
                      0,
                      "Outstanding Reward should be 0 after unstake all VAB"
                  )
                  expect(stakerList.includes(staker1.address)).to.be.equal(
                      false,
                      "Staker should be removed from the stakerList after unstake"
                  )
                  expect(await stakingPool.totalStakingAmount()).equal(
                      0,
                      "Total staking amount should be 0 after unstake"
                  )
                  expect(await stakingPool.stakerCount()).equal(
                      0,
                      "Staker count should be 0 after unstake"
                  )
              })

              it("Should emit TokenUnstaked event with the correct arguments", async function () {
                  const { stakingPool, staker1, lockPeriodInSeconds, stakingPoolStaker1 } =
                      await loadFixture(deployContractsFixture)

                  await stakingPoolStaker1.stakeVAB(stakingAmount)
                  await helpers.time.increase(lockPeriodInSeconds)

                  await expect(stakingPoolStaker1.unstakeVAB(stakingAmount))
                      .to.emit(stakingPool, "TokenUnstaked")
                      .withArgs(staker1.address, stakingAmount)
              })
          })

          describe("withdrawReward", function () {
              it("Should revert if the input is not valid", async function () {
                  const { stakingPoolStaker1 } = await loadFixture(deployContractsFixture)

                  await expect(stakingPoolStaker1.withdrawReward(2)).to.be.revertedWith(
                      "wR: compound"
                  )
              })

              it("Should revert if users stake amount is zero", async function () {
                  const { stakingPoolStaker1 } = await loadFixture(deployContractsFixture)

                  await expect(stakingPoolStaker1.withdrawReward(0)).to.be.revertedWith(
                      "wR: zero amount"
                  )
                  await expect(stakingPoolStaker1.withdrawReward(1)).to.be.revertedWith(
                      "wR: zero amount"
                  )
              })

              it("Should revert if no migration has been started or the lock period is not over", async function () {
                  const { stakingPoolStaker1 } = await loadFixture(deployContractsFixture)

                  await stakingPoolStaker1.stakeVAB(stakingAmount)

                  await expect(stakingPoolStaker1.withdrawReward(0)).to.be.revertedWith("wR: lock")
              })

              it("Should revert if a migration has been started and user wants to compound", async function () {
                  const { stakingPool, stakingPoolStaker1, lockPeriodInSeconds, property } =
                      await loadFixture(deployContractsFixture)
                  //? We want to test if unstake works if a migration is in progress so we decrease the lock period
                  const adjustedLockPeriodInSeconds = lockPeriodInSeconds - 100
                  await stakingPoolStaker1.stakeVAB(stakingAmount)
                  await helpers.time.increase(adjustedLockPeriodInSeconds)

                  await helpers.impersonateAccount(property.address)
                  const signer = await ethers.getSigner(property.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await stakingPool.connect(signer).calcMigrationVAB()
                  await helpers.stopImpersonatingAccount(property.address)

                  await expect(stakingPoolStaker1.withdrawReward(1)).to.be.revertedWith(
                      "migration is on going"
                  )
              })

              it("Should revert if there are zero rewards and user wants to withdraw", async function () {
                  const { stakingPoolStaker1, lockPeriodInSeconds } = await loadFixture(
                      deployContractsFixture
                  )

                  await stakingPoolStaker1.stakeVAB(stakingAmount)
                  await helpers.time.increase(lockPeriodInSeconds)

                  await expect(stakingPoolStaker1.withdrawReward(0)).to.be.revertedWith(
                      "wR: zero reward"
                  )
              })

              it("Should revert if the user wants to withdraw more rewards than the totalRewardAmount is", async function () {
                  const { stakingPoolStaker1, lockPeriodInSeconds, stakingPoolDeployer, staker1 } =
                      await loadFixture(deployContractsFixture)
                  const newPoolRewardAmount = parseEther("1")
                  await stakingPoolDeployer.addRewardToPool(newPoolRewardAmount)
                  await stakingPoolStaker1.stakeVAB(stakingAmount)
                  //? Here we wait longer than the lock period so that the rewards will exceed the totalRewardAmount
                  await helpers.time.increase(lockPeriodInSeconds * 1000)

                  const totalRewardAmount = await stakingPoolDeployer.totalRewardAmount()
                  const calculatedRewardAmount = await stakingPoolDeployer.calcRewardAmount(
                      staker1.address
                  )

                  expect(calculatedRewardAmount).to.be.above(totalRewardAmount)
                  await expect(stakingPoolStaker1.withdrawReward(0)).to.be.revertedWith(
                      "wR: insufficient total"
                  )
              })

              it("Should revert if there are zero rewards and user wants to compound", async function () {
                  const { stakingPoolStaker1, lockPeriodInSeconds } = await loadFixture(
                      deployContractsFixture
                  )
                  const isCompound = 1 // compound reward
                  await stakingPoolStaker1.stakeVAB(stakingAmount)
                  await helpers.time.increase(lockPeriodInSeconds)

                  expect(stakingPoolStaker1.withdrawReward(isCompound)).to.be.revertedWith(
                      "wR: zero amount"
                  )
              })

              it("Should compound rewards to existing stake and update the stakeInfo, totalStakingAmount and emit the RewardContinued event", async function () {
                  const {
                      stakingPoolStaker1,
                      lockPeriodInSeconds,
                      stakingPool,
                      staker1,
                      stakingPoolDeployer,
                  } = await loadFixture(deployContractsFixture)

                  const isCompound = 1 // compound reward
                  await stakingPoolDeployer.addRewardToPool(poolRewardAmount)
                  await stakingPoolStaker1.stakeVAB(stakingAmount)
                  await helpers.time.increase(lockPeriodInSeconds)

                  const calculatedRewardAmount = await stakingPool.calcRewardAmount(staker1.address)

                  const tx = await stakingPoolStaker1.withdrawReward(isCompound)

                  const stakeInfo = await stakingPool.stakeInfo(staker1.address)
                  const totalStakingAmount = await stakingPool.totalStakingAmount()
                  const expectedStakeAmount = stakingAmount.add(calculatedRewardAmount)
                  const newStakeTimeStamp = await helpers.time.latest()

                  await expect(tx)
                      .to.emit(stakingPool, "RewardContinued")
                      .withArgs(staker1.address, isCompound)
                  expect(stakeInfo.stakeAmount).to.be.equal(expectedStakeAmount)
                  expect(totalStakingAmount).to.be.equal(expectedStakeAmount)
                  expect(stakeInfo.stakeTime.toString()).to.be.equal(newStakeTimeStamp.toString())
              })

              it("Should withdraw rewards and update the users balance, stakeInfo, totalRewardAmount, totalRewardIssuedAmount and emit the RewardWithdraw event", async function () {
                  //? Arrange
                  const {
                      stakingPoolStaker1,
                      lockPeriodInSeconds,
                      stakingPool,
                      staker1,
                      stakingPoolDeployer,
                      vabTokenContract,
                  } = await loadFixture(deployContractsFixture)

                  const isCompound = 0 // withdraw reward
                  await stakingPoolDeployer.addRewardToPool(poolRewardAmount)
                  const totalRewardAmountAfterAdd = await stakingPool.totalRewardAmount()
                  await stakingPoolStaker1.stakeVAB(stakingAmount)
                  const stakerBalanceAfterStaking = await vabTokenContract.balanceOf(
                      staker1.address
                  )
                  await helpers.time.increase(lockPeriodInSeconds)

                  const calculatedRewardAmount = await stakingPool.calcRewardAmount(staker1.address)

                  //? Act
                  const tx = await stakingPoolStaker1.withdrawReward(isCompound)

                  //? Assert
                  const stakeInfo = await stakingPool.stakeInfo(staker1.address)
                  const stakerBalanceAfterWithdraw = await vabTokenContract.balanceOf(
                      staker1.address
                  )
                  const totalRewardAmountAfterWithdraw = await stakingPool.totalRewardAmount()
                  const totalRewardIssuedAmount = await stakingPool.totalRewardIssuedAmount()
                  const newStakeTimeStamp = await helpers.time.latest()

                  await expect(tx)
                      .to.emit(stakingPool, "RewardWithdraw")
                      .withArgs(staker1.address, calculatedRewardAmount)

                  expect(stakeInfo.stakeAmount).to.be.equal(stakingAmount)
                  expect(stakeInfo.stakeTime).to.be.equal(newStakeTimeStamp)
                  expect(stakerBalanceAfterWithdraw).to.be.equal(
                      stakerBalanceAfterStaking.add(calculatedRewardAmount)
                  )
                  expect(totalRewardAmountAfterWithdraw).to.be.equal(
                      totalRewardAmountAfterAdd.sub(calculatedRewardAmount)
                  )
                  expect(totalRewardIssuedAmount).to.be.equal(calculatedRewardAmount)
              })
          })

          describe("calcRewardAmount", function () {
              it("Should return zero if the stake amount of the user is zero", async function () {
                  const { stakingPool, staker1 } = await loadFixture(deployContractsFixture)
                  const calculatedRewardAmount = await stakingPool.calcRewardAmount(staker1.address)
                  expect(calculatedRewardAmount).to.be.equal(0)
              })

              it("Should return the outstanding reward of the user when a migration is in progress", async function () {
                  const {
                      stakingPool,
                      stakingPoolDeployer,
                      property,
                      staker1,
                      stakingPoolStaker1,
                      lockPeriodInSeconds,
                  } = await loadFixture(deployContractsFixture)
                  //? Arrange
                  await stakingPoolDeployer.addRewardToPool(poolRewardAmount)
                  await stakingPoolStaker1.stakeVAB(stakingAmount)
                  await helpers.time.increase(lockPeriodInSeconds)
                  const rewardAmountBeforeMigration = await stakingPool.calcRewardAmount(
                      staker1.address
                  )
                  await helpers.impersonateAccount(property.address)
                  const signer = await ethers.getSigner(property.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await stakingPool.connect(signer).calcMigrationVAB()
                  await helpers.stopImpersonatingAccount(property.address)
                  // increase the time again
                  await helpers.time.increase(lockPeriodInSeconds)
                  //? Act
                  const rewardAmountAfterMigration = await stakingPool.calcRewardAmount(
                      staker1.address
                  )
                  const stakeInfo = await stakingPool.stakeInfo(staker1.address)
                  const migrationStatus = await stakingPool.migrationStatus()
                  //? Assert
                  expect(migrationStatus).to.be.equal(1)
                  expect(rewardAmountBeforeMigration).to.be.equal(rewardAmountAfterMigration)
                  expect(stakeInfo.outstandingReward).to.be.equal(rewardAmountBeforeMigration)
                  expect(stakeInfo.outstandingReward).to.be.equal(rewardAmountAfterMigration)
              })

              it("Should return the correct reward of the user when no migration / proposal vote is in progress", async function () {
                  const {
                      stakingPool,
                      stakingPoolDeployer,
                      staker1,
                      stakingPoolStaker1,
                      lockPeriodInSeconds,
                      stakingPoolStaker2,
                      getEstimatedReward,
                  } = await loadFixture(deployContractsFixture)
                  //? Arrange
                  const stakeAmountStaker1 = parseEther("70")
                  const stakeAmountStaker2 = parseEther("30")

                  await stakingPoolDeployer.addRewardToPool(poolRewardAmount)

                  const stake1Tx = await stakingPoolStaker1.stakeVAB(stakeAmountStaker1)
                  const stakeTimeStamp = await getTimestampFromTx(stake1Tx)

                  await stakingPoolStaker2.stakeVAB(stakeAmountStaker2)

                  await helpers.time.increase(lockPeriodInSeconds) // 30 days

                  //? Act
                  const estimatedRewardAmount = await getEstimatedReward({
                      staker: staker1,
                      endTime: stakeTimeStamp + lockPeriodInSeconds,
                      startTime: stakeTimeStamp,
                  })
                  const calculatedRewardAmount = await stakingPool.calcRewardAmount(staker1.address)

                  //? Assert
                  expect(estimatedRewardAmount.toString()).to.be.equal(
                      calculatedRewardAmount.toString()
                  )
              })

              it("Should return the correct reward amount for film board members", async function () {
                  const {
                      getEstimatedReward,
                      stakingPoolStaker1,
                      stakingPoolStaker2: stakingPoolFilmBoardMember,
                      deployer,
                      property,
                      staker2: filmBoardMember,
                      stakingPoolDeployer,
                      lockPeriodInSeconds,
                      staker1,
                      stakingPool,
                      boardRewardRate,
                  } = await loadFixture(deployContractsFixture)

                  await property
                      .connect(deployer)
                      .addAddressToFilmBoardForTesting(filmBoardMember.address)

                  //? Stake the same amount to compare the rewards later
                  const stakeAmountStaker1 = parseEther("50")
                  const stakeAmountFilmBoardMember = parseEther("50")

                  await stakingPoolDeployer.addRewardToPool(poolRewardAmount)
                  const stake1Tx = await stakingPoolStaker1.stakeVAB(stakeAmountStaker1)
                  const stake1TimeStamp = await getTimestampFromTx(stake1Tx)

                  const stakeFilmBoardMemberTx = await stakingPoolFilmBoardMember.stakeVAB(
                      stakeAmountFilmBoardMember
                  )
                  const stakeFilmBoardMemberTimeStamp = await getTimestampFromTx(
                      stakeFilmBoardMemberTx
                  )

                  await helpers.time.increase(lockPeriodInSeconds) // 30 days

                  const estRewardStaker1 = await getEstimatedReward({
                      staker: staker1,
                      endTime: stake1TimeStamp + lockPeriodInSeconds,
                      startTime: stake1TimeStamp,
                  })

                  const estRewardFilmBoardMember = await getEstimatedReward({
                      staker: filmBoardMember,
                      endTime: stakeFilmBoardMemberTimeStamp + lockPeriodInSeconds,
                      startTime: stakeFilmBoardMemberTimeStamp,
                  })

                  const calcRewardAmountStaker1 = await stakingPool.calcRewardAmount(
                      staker1.address
                  )
                  const calcRewardFilmBoardMember = await stakingPool.calcRewardAmount(
                      filmBoardMember.address
                  )

                  const estRewardStaker1WithBonus = calcRewardAmountStaker1.add(
                      calcRewardAmountStaker1.mul(boardRewardRate).div(1e10)
                  )

                  //? Assert
                  expect(estRewardStaker1.toString()).to.be.equal(
                      calcRewardAmountStaker1.toString()
                  )

                  expect(estRewardFilmBoardMember.toString()).to.be.equal(
                      calcRewardFilmBoardMember.toString()
                  )
                  //? Staker1 with bonus reward should be equal to film board member reward
                  expect(estRewardStaker1WithBonus.toString()).to.be.equal(
                      calcRewardFilmBoardMember.toString()
                  )
              })
          })

          describe("calcRealizedRewards", function () {
              it("Should return the correct reward of the user when no proposal vote is in progress", async function () {
                  const {
                      stakingPool,
                      stakingPoolDeployer,
                      staker1,
                      stakingPoolStaker1,
                      lockPeriodInSeconds,
                      getEstimatedReward,
                  } = await loadFixture(deployContractsFixture)
                  //? Arrange

                  await stakingPoolDeployer.addRewardToPool(poolRewardAmount)
                  const stake1Tx = await stakingPoolStaker1.stakeVAB(stakingAmount)
                  const stake1TimeStamp = await getTimestampFromTx(stake1Tx)

                  await helpers.time.increase(lockPeriodInSeconds) // 30 days

                  const estimatedRewardAmount = await getEstimatedReward({
                      staker: staker1,
                      endTime: stake1TimeStamp + lockPeriodInSeconds,
                      startTime: stake1TimeStamp,
                  })

                  //? Act
                  const calculatedRewardAmount = await stakingPool.calcRealizedRewards(
                      staker1.address
                  )

                  //? Assert
                  expect(estimatedRewardAmount.toString()).to.be.equal(
                      calculatedRewardAmount.toString()
                  )
              })

              it("Should return the correct reward of the user and proposal creator when a governance proposal voting is open and user didn't vote", async function () {
                  const {
                      stakingPool,
                      stakingPoolDeployer,
                      property,
                      staker1,
                      staker2: proposalCreator,
                      stakingPoolStaker1,
                      stakingPoolStaker2: stakingPoolProposalCreator,
                      getEstimatedReward,
                  } = await loadFixture(deployContractsFixture)

                  const stakeAmountStaker1 = parseEther("1000")
                  const stakeAmountProposalCreator = parseEther("1000")

                  await stakingPoolDeployer.addRewardToPool(poolRewardAmount)

                  const stake1Tx = await stakingPoolStaker1.stakeVAB(stakeAmountStaker1)
                  const stake1TimeStamp = await getTimestampFromTx(stake1Tx)

                  const stakeProposalCreatorTx = await stakingPoolProposalCreator.stakeVAB(
                      stakeAmountProposalCreator
                  )
                  const stakeProposalCreatorTimeStamp = await getTimestampFromTx(
                      stakeProposalCreatorTx
                  )

                  //? Wait for 1 day to earn some rewards
                  await helpers.time.increase(ONE_DAY_IN_SECONDS)

                  const { governanceProposalTimestamp } =
                      await createDummyGovernancePropertyProposal({
                          property,
                          proposalCreator,
                      })

                  const estimatedRewardStaker1 = await getEstimatedReward({
                      staker: staker1,
                      endTime: governanceProposalTimestamp,
                      startTime: stake1TimeStamp,
                  })
                  const calcRewardStaker1 = await stakingPool.calcRealizedRewards(staker1.address)

                  const estimatedRewardProposalCreator = await getEstimatedReward({
                      staker: proposalCreator,
                      endTime: governanceProposalTimestamp,
                      startTime: stakeProposalCreatorTimeStamp,
                  })
                  const calcRewardProposalCreator = await stakingPool.calcRealizedRewards(
                      proposalCreator.address
                  )

                  //? Wait 1 day after proposal creation
                  await helpers.time.increase(ONE_DAY_IN_SECONDS)

                  const currentTimestamp = await helpers.time.latest()

                  const estimatedRewardProposalCreatorIncreasedPeriod = await getEstimatedReward({
                      staker: proposalCreator,
                      endTime: currentTimestamp,
                      startTime: stakeProposalCreatorTimeStamp,
                  })

                  const calcRewardStaker1DuringVote = await stakingPool.calcRealizedRewards(
                      staker1.address
                  )
                  const calcRewardProposalCreatorDuringVote = await stakingPool.calcRealizedRewards(
                      proposalCreator.address
                  )

                  //? Assert
                  expect(estimatedRewardStaker1.toString()).to.be.equal(
                      calcRewardStaker1DuringVote.toString(),
                      "Est. Reward of staker should be equal calc reward during vote period"
                  )
                  expect(estimatedRewardStaker1.toString()).to.be.equal(
                      calcRewardStaker1.toString(),
                      "Est. Reward of staker should be equal calc reward after staking"
                  )
                  expect(estimatedRewardProposalCreator.toString()).to.be.equal(
                      calcRewardProposalCreator.toString(),
                      "Est. Reward of proposal creator should be equal calc reward after staking"
                  )
                  expect(estimatedRewardProposalCreatorIncreasedPeriod.toString()).to.be.equal(
                      calcRewardProposalCreatorDuringVote.toString(),
                      "Est. Reward of proposal creator should be equal calc reward during vote period"
                  )
              })

              it("Should return the correct reward of the user and proposal creator when a governance proposal voting is open and user did vote", async function () {
                  const {
                      stakingPool,
                      stakingPoolDeployer,
                      property,
                      staker1,
                      staker2: proposalCreator,
                      stakingPoolStaker1,
                      stakingPoolStaker2: stakingPoolProposalCreator,
                      getEstimatedReward,
                      vote,
                  } = await loadFixture(deployContractsFixture)

                  const stakeAmountStaker1 = parseEther("1000")
                  const stakeAmountProposalCreator = parseEther("1000")

                  await stakingPoolDeployer.addRewardToPool(poolRewardAmount)

                  const stake1Tx = await stakingPoolStaker1.stakeVAB(stakeAmountStaker1)
                  const stake1TimeStamp = await getTimestampFromTx(stake1Tx)

                  const stakeProposalCreatorTx = await stakingPoolProposalCreator.stakeVAB(
                      stakeAmountProposalCreator
                  )
                  const stakeProposalCreatorTimeStamp = await getTimestampFromTx(
                      stakeProposalCreatorTx
                  )

                  //? Wait for 1 day to earn some rewards
                  await helpers.time.increase(ONE_DAY_IN_SECONDS)

                  const { propertyChange, flag, proposalIndex, governanceProposalTimestamp } =
                      await createDummyGovernancePropertyProposal({
                          property,
                          proposalCreator,
                      })

                  const estimatedRewardStaker1 = await getEstimatedReward({
                      staker: staker1,
                      endTime: governanceProposalTimestamp,
                      startTime: stake1TimeStamp,
                  })
                  const calcRewardStaker1 = await stakingPool.calcRealizedRewards(staker1.address)

                  const estimatedRewardProposalCreator = await getEstimatedReward({
                      staker: proposalCreator,
                      endTime: governanceProposalTimestamp,
                      startTime: stakeProposalCreatorTimeStamp,
                  })
                  const calcRewardProposalCreator = await stakingPool.calcRealizedRewards(
                      proposalCreator.address
                  )

                  //? Wait 1 day after proposal was created
                  await helpers.time.increase(ONE_DAY_IN_SECONDS)

                  // vote for proposal
                  const voteTx = await vote
                      .connect(staker1)
                      .voteToProperty(yesVoteValue, proposalIndex, flag)

                  const currentTimestamp = await helpers.time.latest()

                  const estimatedRewardProposalCreatorIncreasedPeriod = await getEstimatedReward({
                      staker: proposalCreator,
                      endTime: currentTimestamp,
                      startTime: stakeProposalCreatorTimeStamp,
                  })

                  const estimatedRewardStakerIncreasedPeriod = await getEstimatedReward({
                      staker: staker1,
                      endTime: currentTimestamp,
                      startTime: stake1TimeStamp,
                  })

                  const calcRewardStaker1AfterVote = await stakingPool.calcRealizedRewards(
                      staker1.address
                  )
                  const calcRewardProposalCreatorAfterVote = await stakingPool.calcRealizedRewards(
                      proposalCreator.address
                  )

                  //? Assert
                  await expect(voteTx)
                      .to.emit(vote, "VotedToProperty")
                      .withArgs(staker1.address, flag, propertyChange, yesVoteValue, proposalIndex)

                  expect(estimatedRewardStaker1.toString()).to.be.equal(
                      calcRewardStaker1.toString(),
                      "Est. Reward of staker should be equal calc reward after staking"
                  )
                  expect(estimatedRewardProposalCreator.toString()).to.be.equal(
                      calcRewardProposalCreator.toString(),
                      "Est. Reward of proposal creator should be equal calc reward after staking"
                  )

                  expect(estimatedRewardProposalCreatorIncreasedPeriod.toString()).to.be.equal(
                      calcRewardProposalCreatorAfterVote.toString(),
                      "Est. Reward of proposal creator should be equal calc reward after vote"
                  )
                  expect(estimatedRewardStakerIncreasedPeriod.toString()).to.be.equal(
                      calcRewardStaker1AfterVote.toString(),
                      "Est. Reward of staker should be equal calc reward after vote"
                  )

                  expect(calcRewardStaker1AfterVote.toString()).to.be.equal(
                      calcRewardProposalCreatorAfterVote.toString(),
                      "Est. Reward of proposal creator should be equal staker reward after vote"
                  )
              })

              it("Should return the correct reward of the user and proposal creator when a film proposal voting is open and user didn't vote", async function () {
                  const {
                      stakingPool,
                      stakingPoolDeployer,
                      staker1,
                      staker2: proposalCreator,
                      stakingPoolStaker1,
                      stakingPoolStaker2: stakingPoolProposalCreator,
                      getEstimatedReward,
                      vabbleDAO,
                  } = await loadFixture(deployContractsFixture)

                  const stakeAmountStaker1 = parseEther("1000")
                  const stakeAmountProposalCreator = parseEther("1000")

                  await stakingPoolDeployer.addRewardToPool(poolRewardAmount)

                  const stake1Tx = await stakingPoolStaker1.stakeVAB(stakeAmountStaker1)
                  const stake1TimeStamp = await getTimestampFromTx(stake1Tx)

                  const stakeProposalCreatorTx = await stakingPoolProposalCreator.stakeVAB(
                      stakeAmountProposalCreator
                  )
                  const stakeProposalCreatorTimeStamp = await getTimestampFromTx(
                      stakeProposalCreatorTx
                  )

                  //? Wait for 1 day to earn some rewards
                  await helpers.time.increase(ONE_DAY_IN_SECONDS)

                  await createAndUpdateDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                  })

                  let currentTimestamp = await helpers.time.latest()

                  const estimatedRewardStaker1 = await getEstimatedReward({
                      staker: staker1,
                      startTime: stake1TimeStamp,
                      endTime: currentTimestamp,
                  })
                  const calcRewardStaker1 = await stakingPool.calcRealizedRewards(staker1.address)

                  const estimatedRewardProposalCreator = await getEstimatedReward({
                      staker: proposalCreator,
                      startTime: stakeProposalCreatorTimeStamp,
                      endTime: currentTimestamp,
                  })
                  const calcRewardProposalCreator = await stakingPool.calcRealizedRewards(
                      proposalCreator.address
                  )

                  // //? Wait 1 day after proposal creation
                  await helpers.time.increase(ONE_DAY_IN_SECONDS)
                  currentTimestamp = await helpers.time.latest()

                  const estimatedRewardProposalCreatorIncreasedPeriod = await getEstimatedReward({
                      staker: proposalCreator,
                      startTime: stakeProposalCreatorTimeStamp,
                      endTime: currentTimestamp,
                  })

                  const calcRewardStaker1DuringVote = await stakingPool.calcRealizedRewards(
                      staker1.address
                  )
                  const calcRewardProposalCreatorDuringVote = await stakingPool.calcRealizedRewards(
                      proposalCreator.address
                  )

                  //? Assert
                  expect(estimatedRewardStaker1.toString()).to.be.equal(
                      calcRewardStaker1DuringVote.toString(),
                      "Est. Reward of staker should be equal calc reward during vote period"
                  )
                  expect(estimatedRewardStaker1.toString()).to.be.equal(
                      calcRewardStaker1.toString(),
                      "Est. Reward of staker should be equal calc reward after staking"
                  )
                  expect(estimatedRewardProposalCreator.toString()).to.be.equal(
                      calcRewardProposalCreator.toString(),
                      "Est. Reward of proposal creator should be equal calc reward after staking"
                  )
                  expect(estimatedRewardProposalCreatorIncreasedPeriod.toString()).to.be.equal(
                      calcRewardProposalCreatorDuringVote.toString(),
                      "Est. Reward of proposal creator should be equal calc reward during vote period"
                  )
              })

              it("Should return the correct reward of the user and proposal creator when a film proposal voting is open and user did vote", async function () {
                  const {
                      stakingPool,
                      stakingPoolDeployer,
                      staker1,
                      staker2: proposalCreator,
                      stakingPoolStaker1,
                      stakingPoolStaker2: stakingPoolProposalCreator,
                      getEstimatedReward,
                      vabbleDAO,
                      vote,
                  } = await loadFixture(deployContractsFixture)

                  const stakeAmountStaker1 = parseEther("1000")
                  const stakeAmountProposalCreator = parseEther("1000")

                  await stakingPoolDeployer.addRewardToPool(poolRewardAmount)

                  const stake1Tx = await stakingPoolStaker1.stakeVAB(stakeAmountStaker1)
                  const stake1TimeStamp = await getTimestampFromTx(stake1Tx)

                  const stakeProposalCreatorTx = await stakingPoolProposalCreator.stakeVAB(
                      stakeAmountProposalCreator
                  )
                  const stakeProposalCreatorTimeStamp = await getTimestampFromTx(
                      stakeProposalCreatorTx
                  )

                  //? Wait for 1 day to earn some rewards
                  await helpers.time.increase(ONE_DAY_IN_SECONDS)

                  const { proposalId } = await createAndUpdateDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                  })

                  const voteTx = await vote
                      .connect(staker1)
                      .voteToFilms([proposalId], [yesVoteValue])

                  let currentTimestamp = await helpers.time.latest()

                  const estimatedRewardStaker1 = await getEstimatedReward({
                      staker: staker1,
                      startTime: stake1TimeStamp,
                      endTime: currentTimestamp,
                  })
                  const calcRewardStaker1 = await stakingPool.calcRealizedRewards(staker1.address)

                  const estimatedRewardProposalCreator = await getEstimatedReward({
                      staker: proposalCreator,
                      startTime: stakeProposalCreatorTimeStamp,
                      endTime: currentTimestamp,
                  })
                  const calcRewardProposalCreator = await stakingPool.calcRealizedRewards(
                      proposalCreator.address
                  )

                  await helpers.time.increase(ONE_DAY_IN_SECONDS)
                  currentTimestamp = await helpers.time.latest()

                  const estimatedRewardProposalCreatorIncreasedPeriod = await getEstimatedReward({
                      staker: proposalCreator,
                      startTime: stakeProposalCreatorTimeStamp,
                      endTime: currentTimestamp,
                  })

                  const estimatedRewardStaker1IncreasedPeriod = await getEstimatedReward({
                      staker: staker1,
                      startTime: stake1TimeStamp,
                      endTime: currentTimestamp,
                  })

                  const calcRewardStaker1AfterVote = await stakingPool.calcRealizedRewards(
                      staker1.address
                  )
                  const calcRewardProposalCreatorAfterVote = await stakingPool.calcRealizedRewards(
                      proposalCreator.address
                  )

                  //? Assert

                  await expect(voteTx)
                      .to.emit(vote, "VotedToFilm")
                      .withArgs(staker1.address, proposalId, yesVoteValue)

                  expect(estimatedRewardStaker1.toString()).to.be.equal(
                      calcRewardStaker1.toString(),
                      "Est. Reward of staker should be equal calc reward after staking"
                  )
                  expect(estimatedRewardProposalCreator.toString()).to.be.equal(
                      calcRewardProposalCreator.toString(),
                      "Est. Reward of proposal creator should be equal calc reward after staking"
                  )

                  expect(estimatedRewardProposalCreatorIncreasedPeriod.toString()).to.be.equal(
                      calcRewardProposalCreatorAfterVote.toString(),
                      "Est. Reward of proposal creator should be equal calc reward after vote period"
                  )

                  expect(estimatedRewardStaker1IncreasedPeriod.toString()).to.be.equal(
                      calcRewardStaker1AfterVote.toString(),
                      "Est. Reward of staker should be equal calc reward after vote period"
                  )

                  expect(calcRewardStaker1AfterVote.toString()).to.be.equal(
                      calcRewardProposalCreatorAfterVote.toString(),
                      "Reward of staker should be equal reward of proposal creator after vote"
                  )
              })
          })

          describe("calcPendingRewards", function () {
              it("Should return zero if there are no proposals open for voting", async function () {
                  const { stakingPoolStaker1, stakingPool, staker1, stakingPoolDeployer } =
                      await loadFixture(deployContractsFixture)

                  await stakingPoolDeployer.addRewardToPool(poolRewardAmount)
                  await stakingPoolStaker1.stakeVAB(stakingAmount)

                  const pendingRewards = await stakingPool.calcPendingRewards(staker1.address)

                  expect(pendingRewards.toString()).to.be.equal("0")
              })

              it("Should return the correct amount if a governance proposal is open for voting and user didn't vote yet", async function () {
                  const {
                      stakingPool,
                      stakingPoolDeployer,
                      property,
                      staker1,
                      staker2: proposalCreator,
                      stakingPoolStaker1,
                      stakingPoolStaker2: stakingPoolProposalCreator,
                      getEstimatedReward,
                  } = await loadFixture(deployContractsFixture)

                  await stakingPoolDeployer.addRewardToPool(poolRewardAmount)
                  await stakingPoolProposalCreator.stakeVAB(stakingAmount)

                  const stake1Tx = await stakingPoolStaker1.stakeVAB(stakingAmount)
                  const stake1TimeStamp = await getTimestampFromTx(stake1Tx)

                  await helpers.time.increase(ONE_DAY_IN_SECONDS)

                  const { governanceProposalTimestamp } =
                      await createDummyGovernancePropertyProposal({
                          property,
                          proposalCreator,
                      })

                  const estimatedRealizedReward = await getEstimatedReward({
                      staker: staker1,
                      endTime: governanceProposalTimestamp,
                      startTime: stake1TimeStamp,
                  })

                  const calcRewardRealizedReward = await stakingPool.calcRealizedRewards(
                      staker1.address
                  )

                  await helpers.time.increase(ONE_DAY_IN_SECONDS)

                  const currentTimestamp = await helpers.time.latest()

                  const estimatedPendingReward = await getEstimatedReward({
                      staker: staker1,
                      endTime: currentTimestamp,
                      startTime: governanceProposalTimestamp,
                  })

                  const calcPendingReward = await stakingPool.calcPendingRewards(staker1.address)

                  //? Assert
                  expect(estimatedRealizedReward.toString()).to.be.equal(
                      calcRewardRealizedReward.toString(),
                      "Est. Reward of staker should be equal calc realized reward"
                  )
                  expect(estimatedPendingReward.toString()).to.be.equal(
                      calcPendingReward.toString(),
                      "Est. Reward of staker should be equal calc pending reward"
                  )
                  expect(calcPendingReward.toString()).to.be.not.equal("0"),
                      "Calc pending reward should not be zero"
              })

              it("Should return the correct amount if a governance proposal is open for voting and user did vote", async function () {
                  const {
                      stakingPool,
                      stakingPoolDeployer,
                      property,
                      staker1,
                      staker2: proposalCreator,
                      stakingPoolStaker1,
                      stakingPoolStaker2: stakingPoolProposalCreator,
                      getEstimatedReward,
                      vote,
                  } = await loadFixture(deployContractsFixture)

                  await stakingPoolDeployer.addRewardToPool(poolRewardAmount)
                  await stakingPoolProposalCreator.stakeVAB(stakingAmount)

                  const stake1Tx = await stakingPoolStaker1.stakeVAB(stakingAmount)
                  const stake1TimeStamp = await getTimestampFromTx(stake1Tx)

                  await helpers.time.increase(ONE_DAY_IN_SECONDS)

                  const { flag, proposalIndex, governanceProposalTimestamp } =
                      await createDummyGovernancePropertyProposal({
                          property,
                          proposalCreator,
                      })

                  const estimatedRealizedReward = await getEstimatedReward({
                      staker: staker1,
                      endTime: governanceProposalTimestamp,
                      startTime: stake1TimeStamp,
                  })

                  const calcRewardRealizedReward = await stakingPool.calcRealizedRewards(
                      staker1.address
                  )

                  await helpers.time.increase(ONE_DAY_IN_SECONDS)

                  let currentTimestamp = await helpers.time.latest()

                  const estimatedPendingReward = await getEstimatedReward({
                      staker: staker1,
                      endTime: currentTimestamp,
                      startTime: governanceProposalTimestamp,
                  })

                  const calcPendingReward = await stakingPool.calcPendingRewards(staker1.address)

                  await vote.connect(staker1).voteToProperty(yesVoteValue, proposalIndex, flag)

                  const calcPendingRewardAfterVote = await stakingPool.calcPendingRewards(
                      staker1.address
                  )

                  currentTimestamp = await helpers.time.latest()

                  const estimatedRealizedRewardAfterVote = await getEstimatedReward({
                      staker: staker1,
                      endTime: currentTimestamp,
                      startTime: stake1TimeStamp,
                  })

                  const calcRewardRealizedRewardAfterVote = await stakingPool.calcRealizedRewards(
                      staker1.address
                  )

                  //? Assert
                  expect(estimatedRealizedReward.toString()).to.be.equal(
                      calcRewardRealizedReward.toString()
                  )
                  expect(estimatedPendingReward.toString()).to.be.equal(
                      calcPendingReward.toString()
                  )
                  expect(calcPendingReward.toString()).to.be.not.equal("0")
                  expect(calcPendingRewardAfterVote.toString()).to.be.equal("0")
                  expect(estimatedRealizedRewardAfterVote.toString()).to.be.equal(
                      calcRewardRealizedRewardAfterVote.toString()
                  )
              })

              it("Should return the correct reward of the user when a film proposal voting is open and user didn't vote", async function () {
                  const {
                      stakingPool,
                      stakingPoolDeployer,
                      staker1,
                      staker2: proposalCreator,
                      stakingPoolStaker1,
                      stakingPoolStaker2: stakingPoolProposalCreator,
                      getEstimatedReward,
                      vabbleDAO,
                  } = await loadFixture(deployContractsFixture)

                  await stakingPoolDeployer.addRewardToPool(poolRewardAmount)
                  await stakingPoolProposalCreator.stakeVAB(stakingAmount)

                  const stake1Tx = await stakingPoolStaker1.stakeVAB(stakingAmount)
                  const stake1TimeStamp = await getTimestampFromTx(stake1Tx)

                  //? Wait for 1 day to earn some rewards
                  await helpers.time.increase(ONE_DAY_IN_SECONDS)

                  await createAndUpdateDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                  })

                  const proposalCreationTimestamp = await helpers.time.latest()

                  const estimatedReward = await getEstimatedReward({
                      staker: staker1,
                      startTime: stake1TimeStamp,
                      endTime: proposalCreationTimestamp,
                  })
                  const calcReward = await stakingPool.calcRealizedRewards(staker1.address)

                  // //? Wait 2 days after proposal creation
                  await helpers.time.increase(ONE_DAY_IN_SECONDS)
                  const currentTimestamp = await helpers.time.latest()

                  const estimatedPendingRewardAfterProposal = await getEstimatedReward({
                      staker: staker1,
                      startTime: proposalCreationTimestamp,
                      endTime: currentTimestamp,
                  })
                  const calcPendingRewardAfterProposal = await stakingPool.calcPendingRewards(
                      staker1.address
                  )

                  //? Assert
                  expect(calcPendingRewardAfterProposal.toString()).to.be.not.equal("0")
                  expect(estimatedReward.toString()).to.be.equal(calcReward.toString())
                  expect(estimatedPendingRewardAfterProposal.toString()).to.be.equal(
                      calcPendingRewardAfterProposal.toString()
                  )
              })

              it("Should return the correct reward of the user and proposal creator when a film proposal voting is open and user did vote", async function () {
                  const {
                      stakingPool,
                      stakingPoolDeployer,
                      staker1,
                      staker2: proposalCreator,
                      stakingPoolStaker1,
                      stakingPoolStaker2: stakingPoolProposalCreator,
                      getEstimatedReward,
                      vabbleDAO,
                      vote,
                  } = await loadFixture(deployContractsFixture)

                  await stakingPoolDeployer.addRewardToPool(poolRewardAmount)
                  await stakingPoolProposalCreator.stakeVAB(stakingAmount)

                  const stake1Tx = await stakingPoolStaker1.stakeVAB(stakingAmount)
                  const stake1TimeStamp = await getTimestampFromTx(stake1Tx)

                  //? Wait for 1 day to earn some rewards
                  await helpers.time.increase(ONE_DAY_IN_SECONDS)

                  const { proposalId, proposalUpdateTimestamp } =
                      await createAndUpdateDummyFilmProposal({
                          vabbleDAO,
                          proposalCreator,
                      })

                  const estimatedReward = await getEstimatedReward({
                      staker: staker1,
                      startTime: stake1TimeStamp,
                      endTime: proposalUpdateTimestamp,
                  })
                  const calcReward = await stakingPool.calcRealizedRewards(staker1.address)

                  // //? Wait 2 days after proposal creation

                  await helpers.time.increase(ONE_DAY_IN_SECONDS)
                  let currentTimestamp = await helpers.time.latest()

                  const estimatedPendingRewardAfterProposal = await getEstimatedReward({
                      staker: staker1,
                      startTime: proposalUpdateTimestamp,
                      endTime: currentTimestamp,
                  })
                  const calcPendingRewardAfterProposal = await stakingPool.calcPendingRewards(
                      staker1.address
                  )

                  await vote.connect(staker1).voteToFilms([proposalId], [yesVoteValue])

                  const calcPendingRewardAfterVote = await stakingPool.calcPendingRewards(
                      staker1.address
                  )

                  currentTimestamp = await helpers.time.latest()

                  const calcRewardRealizedRewardAfterVote = await stakingPool.calcRealizedRewards(
                      staker1.address
                  )

                  //? Assert
                  expect(calcPendingRewardAfterProposal.toString()).to.be.not.equal("0")
                  expect(estimatedReward.toString()).to.be.equal(calcReward.toString())
                  expect(estimatedPendingRewardAfterProposal.toString()).to.be.equal(
                      calcPendingRewardAfterProposal.toString()
                  )
                  expect(calcPendingRewardAfterVote.toString()).to.be.equal("0")
                  expect(calcRewardRealizedRewardAfterVote.toString()).to.be.equal(
                      estimatedReward.add(estimatedPendingRewardAfterProposal)
                  )
              })
          })

          describe("depositVAB", function () {
              it("Should revert if the contract caller is a zero address", async function () {
                  const { stakingPool } = await loadFixture(deployContractsFixture)

                  await expect(stakingPool.connect(ZERO_ADDRESS).depositVAB(stakingAmount)).to.be
                      .reverted
              })

              it("Should revert if the input amount is zero", async function () {
                  const { stakingPool, staker1 } = await loadFixture(deployContractsFixture)

                  await expect(stakingPool.connect(staker1).depositVAB(0)).to.be.revertedWith(
                      "dVAB: zero amount"
                  )
              })

              it("Should transfer the correct amount to the staking pool and update the balance and userRentInfo of the caller", async function () {
                  const { stakingPoolStaker1, vabTokenContract, staker1, stakingPool } =
                      await loadFixture(deployContractsFixture)

                  const balanceBefore = await vabTokenContract.balanceOf(staker1.address)

                  await stakingPoolStaker1.depositVAB(stakingAmount)

                  const balanceAfter = await vabTokenContract.balanceOf(staker1.address)

                  const userRentInfo = await stakingPool.userRentInfo(staker1.address)

                  expect(balanceBefore.sub(stakingAmount)).to.be.equal(balanceAfter)
                  expect(userRentInfo.vabAmount.toString()).to.be.equal(stakingAmount.toString())
              })

              it("Should emit the VABDeposited event", async function () {
                  const { stakingPoolStaker1, staker1, stakingPool } = await loadFixture(
                      deployContractsFixture
                  )

                  const tx = await stakingPoolStaker1.depositVAB(stakingAmount)

                  await expect(tx)
                      .to.emit(stakingPool, "VABDeposited")
                      .withArgs(staker1.address, stakingAmount)
              })
          })

          describe("pendingWithdraw", function () {
              it("Should revert if the contract caller is a zero address", async function () {
                  const { stakingPool } = await loadFixture(deployContractsFixture)

                  await expect(stakingPool.connect(ZERO_ADDRESS).pendingWithdraw(stakingAmount)).to
                      .be.reverted
              })

              it("Should revert if the input amount is zero", async function () {
                  const { stakingPool, staker1 } = await loadFixture(deployContractsFixture)

                  await expect(stakingPool.connect(staker1).pendingWithdraw(0)).to.be.revertedWith(
                      "pW: zero VAB"
                  )
              })

              it("Should revert if the user has a pending withdraw already", async function () {
                  const { stakingPoolStaker1 } = await loadFixture(deployContractsFixture)
                  const withdrawAmount = parseEther("10")

                  await stakingPoolStaker1.depositVAB(stakingAmount)
                  await stakingPoolStaker1.pendingWithdraw(withdrawAmount)
                  //? Second attempt to withdraw should fail
                  await expect(
                      stakingPoolStaker1.pendingWithdraw(withdrawAmount)
                  ).to.be.revertedWith("pW: pending")
              })

              it("Should revert if the user wants to withdraw more than the amount he has deposited", async function () {
                  const { stakingPoolStaker1 } = await loadFixture(deployContractsFixture)
                  const withdrawAmount = stakingAmount.mul(2)

                  await stakingPoolStaker1.depositVAB(stakingAmount)

                  await expect(
                      stakingPoolStaker1.pendingWithdraw(withdrawAmount)
                  ).to.be.revertedWith("pW: insufficient VAB")
              })

              it("Should set the user rent info withdraw amount to the amount a user requests to withdraw and set pending to true", async function () {
                  const { stakingPoolStaker1, stakingPool, staker1 } = await loadFixture(
                      deployContractsFixture
                  )
                  const withdrawAmount = stakingAmount.div(2)

                  await stakingPoolStaker1.depositVAB(stakingAmount)
                  await stakingPoolStaker1.pendingWithdraw(withdrawAmount)
                  const userRentInfo = await stakingPool.userRentInfo(staker1.address)

                  expect(userRentInfo.pending).to.be.true
                  expect(userRentInfo.withdrawAmount.toString()).to.be.equal(
                      withdrawAmount.toString()
                  )
              })

              it("Should emit the WithdrawPending event", async function () {
                  const { stakingPoolStaker1, stakingPool, staker1 } = await loadFixture(
                      deployContractsFixture
                  )
                  const withdrawAmount = stakingAmount.div(2)

                  await stakingPoolStaker1.depositVAB(stakingAmount)
                  const tx = await stakingPoolStaker1.pendingWithdraw(withdrawAmount)

                  await expect(tx)
                      .to.emit(stakingPool, "WithdrawPending")
                      .withArgs(staker1.address, withdrawAmount)
              })
          })
      })
