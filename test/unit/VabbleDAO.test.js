const { ethers, network } = require("hardhat")
const { developmentChains, ONE_DAY_IN_SECONDS } = require("../../helper-hardhat-config")
const { expect } = require("chai")
const { ZERO_ADDRESS, CONFIG } = require("../../scripts/utils")
const helpers = require("@nomicfoundation/hardhat-network-helpers")
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
const { parseEther } = require("ethers/lib/utils")
const {
    fundAndApproveAccounts,
    deployAndInitAllContracts,
    createDummyFilmProposal,
} = require("../../helper-functions")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("VabbleDAO Unit Tests", function () {
          //? Variable declaration

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
                  lockPeriod,
                  exmTokenContract,
                  uniHelper,
                  staker1: proposalCreator,
                  staker2: proposalVoter,
              } = await deployAndInitAllContracts()

              //? Fund and approve accounts
              const accounts = [deployer, auditor, proposalCreator, proposalVoter]
              const contractsToApprove = [vabbleDAO]
              await fundAndApproveAccounts({
                  accounts,
                  vabTokenContract,
                  contracts: contractsToApprove,
                  usdcTokenContract,
              })

              //? Connect accounts to vabbleDAO contract
              const vabbleDAODeployer = vabbleDAO.connect(deployer)
              const vabbleDAOAuditor = vabbleDAO.connect(auditor)
              const vabbleDAOProposalCreator = vabbleDAO.connect(proposalCreator)
              const vabbleDAOProposalVoter = vabbleDAO.connect(proposalVoter)

              return {
                  deployer,
                  dev,
                  auditor,
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
                  lockPeriod,
                  vabbleDAODeployer,
                  vabbleDAOAuditor,
                  exmTokenContract,
                  uniHelper,
                  proposalCreator,
                  proposalVoter,
                  vabbleDAOProposalCreator,
                  vabbleDAOProposalVoter,
              }
          }

          describe("constructor", function () {
              it("Should set the correct address to the constructor variables", async function () {
                  const { vabbleDAO, ownable, uniHelper, vote, stakingPool, property, vabbleFund } =
                      await loadFixture(deployContractsFixture)

                  const ownableAddress = await vabbleDAO.OWNABLE()
                  const uniHelperAddress = await vabbleDAO.UNI_HELPER()
                  const voteAddress = await vabbleDAO.VOTE()
                  const stakingPoolAddress = await vabbleDAO.STAKING_POOL()
                  const propertyAddress = await vabbleDAO.DAO_PROPERTY()
                  const vabbleFundAddress = await vabbleDAO.VABBLE_FUND()

                  expect(ownableAddress).to.be.equal(ownable.address)
                  expect(uniHelperAddress).to.be.equal(uniHelper.address)
                  expect(voteAddress).to.be.equal(vote.address)
                  expect(stakingPoolAddress).to.be.equal(stakingPool.address)
                  expect(propertyAddress).to.be.equal(property.address)
                  expect(vabbleFundAddress).to.be.equal(vabbleFund.address)
              })
          })

          describe("proposalFilmCreate", function () {
              it("Should revert if the fee token is VAB", async function () {
                  const { vabbleDAOProposalCreator, vabTokenContract } = await loadFixture(
                      deployContractsFixture
                  )

                  const fundType = 0
                  const noVote = 0
                  const feeToken = vabTokenContract.address

                  await expect(
                      vabbleDAOProposalCreator.proposalFilmCreate(fundType, noVote, feeToken)
                  ).to.be.revertedWith("pF: not allowed VAB")
              })

              it("Should revert if the fee token is not allowed", async function () {
                  const { vabbleDAOProposalCreator, dev } = await loadFixture(
                      deployContractsFixture
                  )

                  const fundType = 0
                  const noVote = 0
                  const feeToken = dev.address

                  await expect(
                      vabbleDAOProposalCreator.proposalFilmCreate(fundType, noVote, feeToken)
                  ).to.be.revertedWith("pF: not allowed asset")
              })

              it("Should revert if the fund type is zero and no vote is not zero", async function () {
                  const { vabbleDAOProposalCreator, usdcTokenContract } = await loadFixture(
                      deployContractsFixture
                  )

                  const fundType = 0
                  const noVote = 1
                  const feeToken = usdcTokenContract.address

                  await expect(
                      vabbleDAOProposalCreator.proposalFilmCreate(fundType, noVote, feeToken)
                  ).to.be.revertedWith("pF: pass vote")
              })

              it("Should increment the film count when a new proposal is created", async function () {
                  const { proposalCreator, usdcTokenContract, vabbleDAO } = await loadFixture(
                      deployContractsFixture
                  )

                  await createDummyFilmProposal({ vabbleDAO, proposalCreator, usdcTokenContract })

                  const filmCount = await vabbleDAO.filmCount()

                  expect(filmCount).to.be.equal(1)
              })

              it("Should create a new film proposal with the correct film info", async function () {
                  const { usdcTokenContract, vabbleDAO, proposalCreator } = await loadFixture(
                      deployContractsFixture
                  )

                  const { noVote, fundType, filmInfo } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  expect(filmInfo.fundType).to.be.equal(fundType)
                  expect(filmInfo.noVote).to.be.equal(noVote)
                  expect(filmInfo.studio).to.be.equal(proposalCreator.address)
                  expect(filmInfo.status).to.be.equal(0) // LISTED
              })

              it("Should update the total film ids", async function () {
                  const { proposalCreator, vabbleDAO, usdcTokenContract } = await loadFixture(
                      deployContractsFixture
                  )

                  const flag = 1 //= proposal

                  await createDummyFilmProposal({ vabbleDAO, proposalCreator, usdcTokenContract })

                  const filmCount = await vabbleDAO.filmCount()
                  const filmIds = await vabbleDAO.getFilmIds(flag)

                  expect(filmIds[0]).to.be.equal(filmCount)
              })

              it("Should update the user film ids", async function () {
                  const { usdcTokenContract, vabbleDAO, proposalCreator } = await loadFixture(
                      deployContractsFixture
                  )

                  const flag = 1 //= proposal

                  await createDummyFilmProposal({ vabbleDAO, proposalCreator, usdcTokenContract })

                  const filmCount = await vabbleDAO.filmCount()
                  const userFilmIds = await vabbleDAO.getUserFilmIds(proposalCreator.address, flag)

                  expect(userFilmIds[0]).to.be.equal(filmCount)
              })

              it("Should emit the FilmProposalCreated event", async function () {
                  const { usdcTokenContract, vabbleDAO, proposalCreator } = await loadFixture(
                      deployContractsFixture
                  )

                  const { createFilmProposalTx, noVote, fundType, filmId } =
                      await createDummyFilmProposal({
                          vabbleDAO,
                          proposalCreator,
                          usdcTokenContract,
                      })

                  await expect(createFilmProposalTx)
                      .to.emit(vabbleDAO, "FilmProposalCreated")
                      .withArgs(filmId, noVote, fundType, proposalCreator.address)
              })
          })

          describe("proposalFilmUpdate", function () {})
      })
