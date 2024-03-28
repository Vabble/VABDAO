const { network } = require("hardhat")
const {
    developmentChains,
    VAB_FAUCET_AMOUNT,
    USDC_FAUCET_AMOUNT,
} = require("../../helper-hardhat-config")
const { expect } = require("chai")
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
const {
    fundAndApproveAccounts,
    deployAndInitAllContracts,
    createAndUpdateDummyFilmProposal,
    createDummyGovernancePropertyProposal,
} = require("../../helper-functions")
const { parseEther } = require("ethers/lib/utils")

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
                  propertyVotePeriod,
                  boardRewardRate,
                  rewardRate,
                  usdcTokenContract,
                  stakingPoolDeployer,
                  stakingPoolStaker1,
                  stakingPoolStaker2,
                  accounts,
                  contractsToApprove,
              }
          }

          describe("Accounts", function () {
              describe("StakingPool", function () {
                  it("Should have the right balance, and allowance", async function () {
                      const { vabTokenContract, usdcTokenContract, contractsToApprove, accounts } =
                          await loadFixture(deployContractsFixture)

                      for (const account of accounts) {
                          const accountVabBalance = await vabTokenContract.balanceOf(
                              account.address
                          )
                          const accountUsdcBalance = await usdcTokenContract.balanceOf(
                              account.address
                          )

                          for (const contract of contractsToApprove) {
                              const accountVabAllowance = await vabTokenContract.allowance(
                                  account.address,
                                  contract.address
                              )

                              const accountUsdcAllowance = await usdcTokenContract.allowance(
                                  account.address,
                                  contract.address
                              )

                              expect(accountVabAllowance).to.equal(VAB_FAUCET_AMOUNT)
                              expect(accountUsdcAllowance).to.equal(USDC_FAUCET_AMOUNT)
                          }

                          expect(accountVabBalance).to.equal(VAB_FAUCET_AMOUNT)
                          expect(accountUsdcBalance).to.equal(USDC_FAUCET_AMOUNT)
                      }
                  })
              })
          })

          describe("Helper Functions", function () {
              describe("createAndUpdateDummyFilmProposal", function () {
                  it("Should create and update a film proposal and emit the events", async function () {
                      const {
                          staker2: proposalCreator,
                          stakingPoolStaker2: stakingPoolProposalCreator,
                          vabbleDAO,
                      } = await loadFixture(deployContractsFixture)

                      const stakeAmountProposalCreator = parseEther("1000")

                      await stakingPoolProposalCreator.stakeVAB(stakeAmountProposalCreator)

                      const {
                          proposalFilmCreateTx,
                          proposalFilmUpdateTx,
                          proposalId,
                          noVote,
                          fundType,
                      } = await createAndUpdateDummyFilmProposal({ vabbleDAO, proposalCreator })

                      //? Assert
                      await expect(proposalFilmCreateTx)
                          .to.emit(vabbleDAO, "FilmProposalCreated")
                          .withArgs(proposalId, noVote, fundType, proposalCreator.address)

                      await expect(proposalFilmUpdateTx)
                          .to.emit(vabbleDAO, "FilmProposalUpdated")
                          .withArgs(proposalId, fundType, proposalCreator.address)
                  })
              })

              describe("createDummyGovernancePropertyProposal", function () {
                  it("Should create a governance property proposal and emit the event", async function () {
                      const {
                          staker2: proposalCreator,
                          stakingPoolStaker2: stakingPoolProposalCreator,
                          property,
                      } = await loadFixture(deployContractsFixture)

                      const stakeAmountProposalCreator = parseEther("1000")
                      await stakingPoolProposalCreator.stakeVAB(stakeAmountProposalCreator)

                      const {
                          createGovernanceProposalTx,
                          propertyChange,
                          flag,
                          title,
                          description,
                      } = await createDummyGovernancePropertyProposal({
                          property,
                          proposalCreator,
                      })

                      //? Assert
                      await expect(createGovernanceProposalTx)
                          .to.emit(property, "PropertyProposalCreated")
                          .withArgs(
                              proposalCreator.address,
                              propertyChange,
                              flag,
                              title,
                              description
                          )
                  })
              })
          })
      })
