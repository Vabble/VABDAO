const { network } = require("hardhat")
const { developmentChains, VAB_FAUCET_AMOUNT } = require("../../helper-hardhat-config")
const { expect } = require("chai")
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
const { fundAndApproveAccounts, deployAndInitAllContracts } = require("../../helper-functions")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Setup Unit Tests", function () {
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
              } = await deployAndInitAllContracts()

              //? Fund and approve accounts
              const accounts = [deployer, staker1, staker2]
              const contractsToApprove = [stakingPool]
              await fundAndApproveAccounts(accounts, vabTokenContract, contractsToApprove)

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
              }
          }

          describe("Accounts", function () {
              describe("StakingPool", function () {
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

                      expect(staker1Balance).to.equal(VAB_FAUCET_AMOUNT)
                      expect(staker1Allowance).to.equal(VAB_FAUCET_AMOUNT)

                      expect(deployerBalance).to.equal(VAB_FAUCET_AMOUNT)
                      expect(deployerAllowance).to.equal(VAB_FAUCET_AMOUNT)
                  })
              })
          })
      })
