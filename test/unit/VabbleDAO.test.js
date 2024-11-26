const { ethers, network } = require("hardhat")
const { developmentChains, ONE_DAY_IN_SECONDS } = require("../../helper-hardhat-config")
const { expect } = require("chai")
const helpers = require("@nomicfoundation/hardhat-network-helpers")
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
const { parseEther } = require("ethers/lib/utils")
const {
    fundAndApproveAccounts,
    deployAndInitAllContracts,
    createDummyFilmProposal,
    getTimestampFromTx,
    proposalStatusMap,
} = require("../../helper-functions")
const fs = require("fs")
const path = require("path")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("VabbleDAO Unit Tests", function () {
          //? Variable declaration
          const proposalTitle = "Test Title"
          const proposalDescription = "Test Description"
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
              const contractsToApprove = [vabbleDAO, stakingPool]
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

          describe("proposalFilmUpdate", function () {
              it("Should revert if the studio payees length is 0", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = []
                  const studioPayees = []
                  const raiseAmount = 0
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await expect(
                      vabbleDAOProposalCreator.proposalFilmUpdate(
                          filmId,
                          proposalTitle,
                          proposalDescription,
                          sharePercents,
                          studioPayees,
                          raiseAmount,
                          fundPeriod,
                          rewardPercent,
                          enableClaimer
                      )
                  ).to.be.revertedWith("pU: e1")
              })

              it("Should revert if the studio payees length is not equal to share percents length", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = []
                  const studioPayees = [proposalCreator.address]
                  const raiseAmount = 0
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await expect(
                      vabbleDAOProposalCreator.proposalFilmUpdate(
                          filmId,
                          proposalTitle,
                          proposalDescription,
                          sharePercents,
                          studioPayees,
                          raiseAmount,
                          fundPeriod,
                          rewardPercent,
                          enableClaimer
                      )
                  ).to.be.revertedWith("pU: e2")
              })

              it("Should revert if the title length is zero", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1 * 1e8]
                  const studioPayees = [proposalCreator.address]
                  const raiseAmount = 0
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const zeroLengthTitle = ""

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await expect(
                      vabbleDAOProposalCreator.proposalFilmUpdate(
                          filmId,
                          zeroLengthTitle,
                          proposalDescription,
                          sharePercents,
                          studioPayees,
                          raiseAmount,
                          fundPeriod,
                          rewardPercent,
                          enableClaimer
                      )
                  ).to.be.revertedWith("pU: e3")
              })

              it("Should revert if the fund type is not zero but the fund period is zero", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1 * 1e8]
                  const studioPayees = [proposalCreator.address]
                  const raiseAmount = 0
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                      fundType: 1,
                      noVote: 0,
                  })

                  await expect(
                      vabbleDAOProposalCreator.proposalFilmUpdate(
                          filmId,
                          proposalTitle,
                          proposalDescription,
                          sharePercents,
                          studioPayees,
                          raiseAmount,
                          fundPeriod,
                          rewardPercent,
                          enableClaimer
                      )
                  ).to.be.revertedWith("pU: e4")
              })

              it("Should revert if the fund type is not zero but the raise amount is less than the min deposit amount", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      property,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1 * 1e8]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = ONE_DAY_IN_SECONDS
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const minDepositAmount = await property.minDepositAmount()
                  const raiseAmount = minDepositAmount.sub(1)

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                      fundType: 1,
                      noVote: 0,
                  })

                  await expect(
                      vabbleDAOProposalCreator.proposalFilmUpdate(
                          filmId,
                          proposalTitle,
                          proposalDescription,
                          sharePercents,
                          studioPayees,
                          raiseAmount,
                          fundPeriod,
                          rewardPercent,
                          enableClaimer
                      )
                  ).to.be.revertedWith("pU: e5")
              })

              it("Should revert if the fund type is not zero but the reward percent is larger than 100%", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      property,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1 * 1e8]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = ONE_DAY_IN_SECONDS
                  const rewardPercent = 2 * 1e10
                  const enableClaimer = 0
                  const minDepositAmount = await property.minDepositAmount()
                  const raiseAmount = minDepositAmount.add(1)

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                      fundType: 1,
                      noVote: 0,
                  })

                  await expect(
                      vabbleDAOProposalCreator.proposalFilmUpdate(
                          filmId,
                          proposalTitle,
                          proposalDescription,
                          sharePercents,
                          studioPayees,
                          raiseAmount,
                          fundPeriod,
                          rewardPercent,
                          enableClaimer
                      )
                  ).to.be.revertedWith("pU: e6")
              })

              it("Should revert if the fund type is zero but the reward percent is not zero", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1 * 1e8]
                  const studioPayees = [proposalCreator.address]
                  const raiseAmount = 0
                  const fundPeriod = 0
                  const rewardPercent = 1e10
                  const enableClaimer = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await expect(
                      vabbleDAOProposalCreator.proposalFilmUpdate(
                          filmId,
                          proposalTitle,
                          proposalDescription,
                          sharePercents,
                          studioPayees,
                          raiseAmount,
                          fundPeriod,
                          rewardPercent,
                          enableClaimer
                      )
                  ).to.be.revertedWith("pU: e7")
              })

              it("Should revert if the total percent of the share percents is not equal to 100%", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      dev,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1 * 1e8, 1e10]
                  const studioPayees = [proposalCreator.address, dev.address]
                  const raiseAmount = 0
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await expect(
                      vabbleDAOProposalCreator.proposalFilmUpdate(
                          filmId,
                          proposalTitle,
                          proposalDescription,
                          sharePercents,
                          studioPayees,
                          raiseAmount,
                          fundPeriod,
                          rewardPercent,
                          enableClaimer
                      )
                  ).to.be.revertedWith("pU: e8")
              })

              it("Should revert if the proposal was already updated", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const raiseAmount = 0
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await expect(
                      vabbleDAOProposalCreator.proposalFilmUpdate(
                          filmId,
                          proposalTitle,
                          proposalDescription,
                          sharePercents,
                          studioPayees,
                          raiseAmount,
                          fundPeriod,
                          rewardPercent,
                          enableClaimer
                      )
                  ).to.be.revertedWith("pU: NL")
              })

              it("Should revert if the function caller is not the studio", async function () {
                  const { usdcTokenContract, vabbleDAO, proposalCreator, vabbleDAOProposalVoter } =
                      await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const raiseAmount = 0
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await expect(
                      vabbleDAOProposalVoter.proposalFilmUpdate(
                          filmId,
                          proposalTitle,
                          proposalDescription,
                          sharePercents,
                          studioPayees,
                          raiseAmount,
                          fundPeriod,
                          rewardPercent,
                          enableClaimer
                      )
                  ).to.be.revertedWith("pU: NFO")
              })

              it("Should update the film info", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const raiseAmount = 0
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  const proposalFilmUpdateTx = await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  const filmProposalUpdateTimestamp = await getTimestampFromTx(proposalFilmUpdateTx)
                  const filmInfo = await vabbleDAO.filmInfo(filmId)

                  const [sharePercents_, studioPayees_] = await vabbleDAO.getFilmShare(filmId)

                  expect(filmInfo.title).to.be.equal(proposalTitle)
                  expect(filmInfo.description).to.be.equal(proposalDescription)
                  expect(sharePercents_[0]).to.be.equal(sharePercents[0])
                  expect(studioPayees_[0]).to.be.equal(studioPayees[0])
                  expect(filmInfo.raiseAmount).to.be.equal(raiseAmount)
                  expect(filmInfo.fundPeriod).to.be.equal(fundPeriod)
                  expect(filmInfo.rewardPercent).to.be.equal(rewardPercent)
                  expect(filmInfo.enableClaimer).to.be.equal(enableClaimer)
                  expect(filmInfo.pCreateTime).to.be.equal(filmProposalUpdateTimestamp)
                  expect(filmInfo.studio).to.be.equal(proposalCreator.address)
                  expect(filmInfo.status).to.be.equal(1) // UPDATED
              })

              it("Should increment the updated film count", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const raiseAmount = 0
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  const updatedFilmCount = await vabbleDAO.updatedFilmCount()
                  expect(updatedFilmCount).to.be.equal(1)
              })

              it("Should update the total film ids", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const raiseAmount = 0
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const flag = 4 // Updated

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  const filmIds = await vabbleDAO.getFilmIds(flag)

                  expect(filmIds[0]).to.be.equal(filmId)
              })

              it("Should update the user film ids", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const raiseAmount = 0
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const flag = 2 // Updated

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  const userFilmIds = await vabbleDAO.getUserFilmIds(proposalCreator.address, flag)
                  expect(userFilmIds[0]).to.be.equal(filmId)
              })

              it("Should update the last fund Proposal CreateTime of the StakingPool contract if the fund type is not 0 and no vote is equal one", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      property,
                      stakingPool,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = ONE_DAY_IN_SECONDS
                  const rewardPercent = 1e10
                  const enableClaimer = 0
                  const minDepositAmount = await property.minDepositAmount()
                  const raiseAmount = minDepositAmount.add(1)

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                      fundType: 1,
                      noVote: 1,
                  })

                  const filmProposalUpdateTx = await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )
                  const filmProposalUpdateTimestamp = await getTimestampFromTx(filmProposalUpdateTx)

                  const lastfundProposalCreateTime = await stakingPool.lastfundProposalCreateTime()
                  expect(lastfundProposalCreateTime).to.be.equal(filmProposalUpdateTimestamp)
              })

              it("Should update the film info status to approved, set the correct approve timestamp and update totalFilmIds and user FilmIds if fund type is not 0 and no vote is one", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      property,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = ONE_DAY_IN_SECONDS
                  const rewardPercent = 1e10
                  const enableClaimer = 0
                  const minDepositAmount = await property.minDepositAmount()
                  const raiseAmount = minDepositAmount.add(1)
                  const flag = 3 // approve

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                      fundType: 1,
                      noVote: 1,
                  })

                  const filmProposalUpdateTx = await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )
                  const filmProposalUpdateTimestamp = await getTimestampFromTx(filmProposalUpdateTx)

                  const filmInfo = await vabbleDAO.filmInfo(filmId)
                  const userFilmIds = await vabbleDAO.getUserFilmIds(proposalCreator.address, flag)
                  const filmIds = await vabbleDAO.getFilmIds(flag)

                  expect(userFilmIds[0]).to.be.equal(filmId)
                  expect(filmIds[0]).to.be.equal(filmId)
                  expect(filmInfo.status).to.be.equal(3) // approved for funding by vote from VAB holders(staker)
                  expect(filmInfo.pApproveTime).to.be.equal(filmProposalUpdateTimestamp)
              })

              it("Should emit the FilmProposalUpdated event", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const raiseAmount = 0
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0

                  const { filmId, fundType } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  const filmProposalUpdateTx = await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await expect(filmProposalUpdateTx)
                      .to.emit(vabbleDAO, "FilmProposalUpdated")
                      .withArgs(filmId, fundType, proposalCreator.address)
              })
          })

          describe("changeOwner", function () {
              it("Should revert if the caller is not the film owner", async function () {
                  const { usdcTokenContract, vabbleDAO, proposalCreator } = await loadFixture(
                      deployContractsFixture
                  )

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await expect(
                      vabbleDAO.changeOwner(filmId, proposalCreator.address)
                  ).to.be.revertedWith("cO, E1")
              })

              it("Should overwrite the studio payee old owner address to the new owner address", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      dev,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const raiseAmount = 0
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const newOwnerAddress = dev.address

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await vabbleDAOProposalCreator.changeOwner(filmId, newOwnerAddress)

                  const [, studioPayees_] = await vabbleDAO.getFilmShare(filmId)

                  expect(studioPayees_[0]).to.be.equal(newOwnerAddress)
              })

              it("Should set the film info studio address to the new owner address", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      dev,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const raiseAmount = 0
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const newOwnerAddress = dev.address

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await vabbleDAOProposalCreator.changeOwner(filmId, newOwnerAddress)

                  const filmInfo = await vabbleDAO.filmInfo(filmId)

                  expect(filmInfo.studio).to.be.equal(newOwnerAddress)
              })

              it("Should set update the created user film ids if the status of the proposal is LISTED", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      dev,
                  } = await loadFixture(deployContractsFixture)

                  const newOwnerAddress = dev.address
                  const flag = 1 // LISTED

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.changeOwner(filmId, newOwnerAddress)

                  const userFilmIdsProposalCreator = await vabbleDAO.getUserFilmIds(
                      proposalCreator.address,
                      flag
                  )
                  const userFilmIdsNewOwner = await vabbleDAO.getUserFilmIds(newOwnerAddress, flag)

                  expect(userFilmIdsProposalCreator[0]).to.be.equal(undefined)
                  expect(userFilmIdsProposalCreator.length).to.be.equal(0)
                  expect(userFilmIdsNewOwner[0]).to.be.equal(filmId)
                  expect(userFilmIdsNewOwner.length).to.be.equal(1)
              })

              it("Should set update the created user film ids if the status of the proposal is UPDATED", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      dev,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const raiseAmount = 0
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const newOwnerAddress = dev.address
                  const flag = 2 // UPDATED

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await vabbleDAOProposalCreator.changeOwner(filmId, newOwnerAddress)

                  const userFilmIdsProposalCreator = await vabbleDAO.getUserFilmIds(
                      proposalCreator.address,
                      flag
                  )
                  const userFilmIdsNewOwner = await vabbleDAO.getUserFilmIds(newOwnerAddress, flag)

                  expect(userFilmIdsProposalCreator[0]).to.be.equal(undefined)
                  expect(userFilmIdsProposalCreator.length).to.be.equal(0)
                  expect(userFilmIdsNewOwner[0]).to.be.equal(filmId)
                  expect(userFilmIdsNewOwner.length).to.be.equal(1)
              })

              it("Should set update the created user film ids if the status of the proposal is APPROVED_LISTING", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      dev,
                      vote,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const newOwnerAddress = dev.address
                  const flag = 3 // APPROVED_LISTING
                  const raiseAmount = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, 0)
                  await helpers.stopImpersonatingAccount(vote.address)

                  await vabbleDAOProposalCreator.changeOwner(filmId, newOwnerAddress)

                  const userFilmIdsProposalCreator = await vabbleDAO.getUserFilmIds(
                      proposalCreator.address,
                      flag
                  )
                  const userFilmIdsNewOwner = await vabbleDAO.getUserFilmIds(newOwnerAddress, flag)

                  expect(userFilmIdsProposalCreator[0]).to.be.equal(undefined)
                  expect(userFilmIdsProposalCreator.length).to.be.equal(0)
                  expect(userFilmIdsNewOwner[0]).to.be.equal(filmId)
                  expect(userFilmIdsNewOwner.length).to.be.equal(1)
              })

              it("Should set update the created user film ids if the status of the proposal is APPROVED_FUNDING", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      dev,
                      property,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = ONE_DAY_IN_SECONDS
                  const rewardPercent = 1e10
                  const enableClaimer = 0
                  const newOwnerAddress = dev.address
                  const flag = 3 // APPROVED_FUNDING
                  const minDepositAmount = await property.minDepositAmount()
                  const raiseAmount = minDepositAmount.add(1)

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                      fundType: 1,
                      noVote: 1,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await vabbleDAOProposalCreator.changeOwner(filmId, newOwnerAddress)

                  const userFilmIdsProposalCreator = await vabbleDAO.getUserFilmIds(
                      proposalCreator.address,
                      flag
                  )
                  const userFilmIdsNewOwner = await vabbleDAO.getUserFilmIds(newOwnerAddress, flag)

                  expect(userFilmIdsProposalCreator[0]).to.be.equal(undefined)
                  expect(userFilmIdsProposalCreator.length).to.be.equal(0)
                  expect(userFilmIdsNewOwner[0]).to.be.equal(filmId)
                  expect(userFilmIdsNewOwner.length).to.be.equal(1)
              })

              it("Should emit the ChangeFilmOwner event", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      dev,
                      property,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = ONE_DAY_IN_SECONDS
                  const rewardPercent = 1e10
                  const enableClaimer = 0
                  const newOwnerAddress = dev.address
                  const minDepositAmount = await property.minDepositAmount()
                  const raiseAmount = minDepositAmount.add(1)

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                      fundType: 1,
                      noVote: 1,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  const changeOwnerTx = await vabbleDAOProposalCreator.changeOwner(
                      filmId,
                      newOwnerAddress
                  )

                  await expect(changeOwnerTx)
                      .to.emit(vabbleDAO, "ChangeFilmOwner")
                      .withArgs(filmId, proposalCreator.address, dev.address)
              })
          })

          describe("approveFilmByVote", function () {
              it("Should revert if the caller is not the Vote contract", async function () {
                  const { vabbleDAOProposalCreator } = await loadFixture(deployContractsFixture)
                  await expect(vabbleDAOProposalCreator.approveFilmByVote(1, 0)).to.be.revertedWith(
                      "only vote"
                  )
              })

              it("Should revert if the film id is zero", async function () {
                  const { vabbleDAO, vote } = await loadFixture(deployContractsFixture)
                  const filmId = 0
                  const flag = 0

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)

                  await expect(
                      vabbleDAO.connect(signer).approveFilmByVote(filmId, flag)
                  ).to.be.revertedWith("aFV: e1")
              })

              it("Should set the approve time inside the film info for the given proposal to the current block timestamp", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vote,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  const tx = await vabbleDAO.connect(signer).approveFilmByVote(filmId, 0)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const timestamp = await getTimestampFromTx(tx)
                  const filmInfo = await vabbleDAO.filmInfo(filmId)

                  expect(filmInfo.pApproveTime).to.be.equal(timestamp)
              })

              it("Should set the status of the film to rejected if the flag is not zero", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vote,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0
                  const flag = 1

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  const tx = await vabbleDAO.connect(signer).approveFilmByVote(filmId, flag)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const filmInfo = await vabbleDAO.filmInfo(filmId)

                  expect(filmInfo.status).to.be.equal(4)
              })

              it("Should set the status of the film to approved funding and update the totalFilmIds if the flag is zero and the fund type is not zero", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vote,
                      property,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = ONE_DAY_IN_SECONDS
                  const rewardPercent = 1e10
                  const enableClaimer = 0
                  const minDepositAmount = await property.minDepositAmount()
                  const raiseAmount = minDepositAmount.add(1)
                  const flag = 0
                  const approvedFundingFlag = 3

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                      fundType: 1,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, flag)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const filmInfo = await vabbleDAO.filmInfo(filmId)
                  const totalFilmIds = await vabbleDAO.getFilmIds(approvedFundingFlag)

                  expect(filmInfo.status).to.be.equal(approvedFundingFlag)
                  expect(totalFilmIds[0]).to.be.equal(filmId)
              })

              it("Should set the status of the film to approved funding and update the totalFilmIds if the flag is zero and the fund type is zero", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vote,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0
                  const flag = 0
                  const approvedListingFlag = 2

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, flag)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const filmInfo = await vabbleDAO.filmInfo(filmId)
                  const totalFilmIds = await vabbleDAO.getFilmIds(approvedListingFlag)

                  expect(filmInfo.status).to.be.equal(approvedListingFlag)
                  expect(totalFilmIds[0]).to.be.equal(filmId)
              })
          })

          describe("updateFilmFundPeriod", function () {
              it("Should revert if the caller is not the studio", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      dev,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0
                  const newFundPeriod = ONE_DAY_IN_SECONDS

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await expect(
                      vabbleDAO.connect(dev).updateFilmFundPeriod(filmId, newFundPeriod)
                  ).to.be.revertedWith("uFP: 1")
              })

              it("Should revert if the fund type of the proposal is zero", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      dev,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0
                  const newFundPeriod = ONE_DAY_IN_SECONDS

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await expect(
                      vabbleDAOProposalCreator.updateFilmFundPeriod(filmId, newFundPeriod)
                  ).to.be.revertedWith("uFP: 2")
              })

              it("Should update the fund period of the proposal to the new fund period", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      property,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = ONE_DAY_IN_SECONDS
                  const rewardPercent = 1e10
                  const enableClaimer = 0
                  const minDepositAmount = await property.minDepositAmount()
                  const raiseAmount = minDepositAmount.add(1)

                  const newFundPeriod = ONE_DAY_IN_SECONDS * 2

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                      fundType: 1,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await vabbleDAOProposalCreator.updateFilmFundPeriod(filmId, newFundPeriod)
                  const filmInfo = await vabbleDAO.filmInfo(filmId)
                  expect(filmInfo.fundPeriod).to.be.equal(newFundPeriod)
              })

              it("Should emit the FilmFundPeriodUpdated event", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      property,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = ONE_DAY_IN_SECONDS
                  const rewardPercent = 1e10
                  const enableClaimer = 0
                  const minDepositAmount = await property.minDepositAmount()
                  const raiseAmount = minDepositAmount.add(1)

                  const newFundPeriod = ONE_DAY_IN_SECONDS * 2

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                      fundType: 1,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await expect(vabbleDAOProposalCreator.updateFilmFundPeriod(filmId, newFundPeriod))
                      .to.emit(vabbleDAO, "FilmFundPeriodUpdated")
                      .withArgs(filmId, proposalCreator.address, newFundPeriod)
              })
          })

          describe("allocateToPool", function () {
              it("Should revert if the caller is not the Auditor", async function () {
                  const { vabbleDAOProposalCreator } = await loadFixture(deployContractsFixture)

                  const users = []
                  const amounts = []
                  const which = 1

                  await expect(
                      vabbleDAOProposalCreator.allocateToPool(users, amounts, which)
                  ).to.be.revertedWith("only auditor")
              })

              it("Should revert if the users length is not equal to the amounts length", async function () {
                  const { vabbleDAOAuditor, dev } = await loadFixture(deployContractsFixture)

                  const users = [dev.address]
                  const amounts = []
                  const which = 1

                  await expect(
                      vabbleDAOAuditor.allocateToPool(users, amounts, which)
                  ).to.be.revertedWith("aTP: e1")
              })

              it("Should revert if the function argument which is not one or two", async function () {
                  const { vabbleDAOAuditor, dev } = await loadFixture(deployContractsFixture)

                  const users = []
                  const amounts = []
                  const which = 0

                  await expect(
                      vabbleDAOAuditor.allocateToPool(users, amounts, which)
                  ).to.be.revertedWith("aTP: e2")
              })

              it("Should transfer the correct amount from the users deposited balance to the edge pool if which is equal one", async function () {
                  const {
                      stakingPool,
                      proposalCreator,
                      vabTokenContract,
                      ownable,
                      vabbleDAOAuditor,
                  } = await loadFixture(deployContractsFixture)

                  const depositAmount = parseEther("100")

                  const users = [proposalCreator.address]
                  const amounts = [depositAmount.div(2)]
                  const which = 1 // EdgePool

                  const edgePoolBalanceBefore = await vabTokenContract.balanceOf(ownable.address)

                  await stakingPool.connect(proposalCreator).depositVAB(depositAmount)
                  await vabbleDAOAuditor.allocateToPool(users, amounts, which)

                  const edgePoolBalanceAfter = await vabTokenContract.balanceOf(ownable.address)

                  expect(edgePoolBalanceBefore).to.be.equal(0)
                  expect(edgePoolBalanceAfter).to.be.equal(depositAmount.div(2))
              })

              it("Should add the users address to the edgePoolUsers array if which is equal one", async function () {
                  const { stakingPool, proposalCreator, vabbleDAOAuditor } = await loadFixture(
                      deployContractsFixture
                  )

                  const depositAmount = parseEther("100")

                  const users = [proposalCreator.address]
                  const amounts = [depositAmount.div(2)]
                  const which = 1 // EdgePool

                  await stakingPool.connect(proposalCreator).depositVAB(depositAmount)
                  await vabbleDAOAuditor.allocateToPool(users, amounts, which)

                  const edgePoolUsers = await vabbleDAOAuditor.getPoolUsers(2)

                  expect(edgePoolUsers[0]).to.be.equal(proposalCreator.address)
              })

              it("Should not add the users address to the edgePoolUsers array if which is equal one and the address is already in the array", async function () {
                  const { stakingPool, proposalCreator, vabbleDAOAuditor } = await loadFixture(
                      deployContractsFixture
                  )

                  const depositAmount = parseEther("100")

                  const users = [proposalCreator.address]
                  const amounts = [depositAmount.div(2)]
                  const which = 1 // EdgePool

                  await stakingPool.connect(proposalCreator).depositVAB(depositAmount)
                  await vabbleDAOAuditor.allocateToPool(users, amounts, which)
                  await vabbleDAOAuditor.allocateToPool(users, amounts, which)

                  const edgePoolUsers = await vabbleDAOAuditor.getPoolUsers(2)

                  expect(edgePoolUsers[0]).to.be.equal(proposalCreator.address)
                  expect(edgePoolUsers.length).to.be.equal(1)
              })

              it("Should transfer the correct amount from the users deposited balance to the studio pool if which is equal 2", async function () {
                  const {
                      stakingPool,
                      proposalCreator,
                      vabTokenContract,
                      vabbleDAO,
                      vabbleDAOAuditor,
                  } = await loadFixture(deployContractsFixture)

                  const depositAmount = parseEther("100")

                  const users = [proposalCreator.address]
                  const amounts = [depositAmount.div(2)]
                  const which = 2 // StudioPool

                  const studioPoolBalanceBefore = await vabTokenContract.balanceOf(
                      vabbleDAO.address
                  )

                  await stakingPool.connect(proposalCreator).depositVAB(depositAmount)
                  await vabbleDAOAuditor.allocateToPool(users, amounts, which)

                  const studioPoolBalanceAfter = await vabTokenContract.balanceOf(vabbleDAO.address)

                  expect(studioPoolBalanceBefore).to.be.equal(0)
                  expect(studioPoolBalanceAfter).to.be.equal(depositAmount.div(2))
              })

              it("Should add the users address to the studioPoolUsers array if which is equal two", async function () {
                  const { stakingPool, proposalCreator, vabbleDAOAuditor } = await loadFixture(
                      deployContractsFixture
                  )

                  const depositAmount = parseEther("100")

                  const users = [proposalCreator.address]
                  const amounts = [depositAmount.div(2)]
                  const which = 2 // StudioPool

                  await stakingPool.connect(proposalCreator).depositVAB(depositAmount)
                  await vabbleDAOAuditor.allocateToPool(users, amounts, which)

                  const studioPoolUsers = await vabbleDAOAuditor.getPoolUsers(1)

                  expect(studioPoolUsers[0]).to.be.equal(proposalCreator.address)
              })

              it("Should not add the users address to the studioPoolUsers array if which is equal two and the address is already in the array", async function () {
                  const { stakingPool, proposalCreator, vabbleDAOAuditor } = await loadFixture(
                      deployContractsFixture
                  )

                  const depositAmount = parseEther("100")

                  const users = [proposalCreator.address]
                  const amounts = [depositAmount.div(2)]
                  const which = 2 // StudioPool

                  await stakingPool.connect(proposalCreator).depositVAB(depositAmount)
                  await vabbleDAOAuditor.allocateToPool(users, amounts, which)
                  await vabbleDAOAuditor.allocateToPool(users, amounts, which)

                  const studioPoolUsers = await vabbleDAOAuditor.getPoolUsers(1)

                  expect(studioPoolUsers[0]).to.be.equal(proposalCreator.address)
                  expect(studioPoolUsers.length).to.be.equal(1)
              })

              it("Should emit the AllocatedToPool event", async function () {
                  const { stakingPool, proposalCreator, vabbleDAOAuditor, vabbleDAO } =
                      await loadFixture(deployContractsFixture)

                  const depositAmount = parseEther("100")

                  const users = [proposalCreator.address]
                  const amounts = [depositAmount.div(2)]
                  const which = 2 // StudioPool

                  await stakingPool.connect(proposalCreator).depositVAB(depositAmount)
                  const tx = await vabbleDAOAuditor.allocateToPool(users, amounts, which)

                  await expect(tx)
                      .to.emit(vabbleDAO, "AllocatedToPool")
                      .withArgs(users, amounts, which)
              })
          })

          describe("allocateFromEdgePool", function () {
              it("Should revert if the caller is not the Auditor", async function () {
                  const { vabbleDAOProposalCreator } = await loadFixture(deployContractsFixture)

                  const amount = parseEther("100")

                  await expect(
                      vabbleDAOProposalCreator.allocateFromEdgePool(amount)
                  ).to.be.revertedWith("only auditor")
              })

              it("Should transfer the correct amount from the edge pool to the studio pool", async function () {
                  const {
                      stakingPool,
                      proposalCreator,
                      vabbleDAOAuditor,
                      vabTokenContract,
                      vabbleDAO,
                  } = await loadFixture(deployContractsFixture)

                  const depositAmount = parseEther("100")
                  const amountToTransfer = depositAmount.div(2)

                  const users = [proposalCreator.address]
                  const amounts = [amountToTransfer]
                  const which = 1 // EdgePool

                  const studioPoolBalanceBefore = await vabTokenContract.balanceOf(
                      vabbleDAO.address
                  )

                  await stakingPool.connect(proposalCreator).depositVAB(depositAmount)
                  //? First we allocate VAB to the EdgePool
                  await vabbleDAOAuditor.allocateToPool(users, amounts, which)

                  //? Now we allocate VAB from the EdgePool to the Studio Pool
                  await vabbleDAOAuditor.allocateFromEdgePool(amountToTransfer)

                  const studioPoolBalanceAfter = await vabTokenContract.balanceOf(vabbleDAO.address)

                  expect(studioPoolBalanceBefore).to.be.equal(0)
                  expect(studioPoolBalanceAfter).to.be.equal(amountToTransfer)
              })

              it("Should add the users address to the studioPoolUsers array and delete the edgePoolUsers", async function () {
                  const { stakingPool, proposalCreator, vabbleDAOAuditor, proposalVoter } =
                      await loadFixture(deployContractsFixture)

                  const depositAmount = parseEther("100")
                  const amountToTransfer = depositAmount.div(2)

                  const users = [proposalCreator.address, proposalVoter.address]
                  const amounts = [amountToTransfer, amountToTransfer]
                  const which = 1 // EdgePool

                  await stakingPool.connect(proposalCreator).depositVAB(depositAmount)
                  await stakingPool.connect(proposalVoter).depositVAB(depositAmount)
                  //? First we allocate VAB to the EdgePool
                  await vabbleDAOAuditor.allocateToPool(users, amounts, which)

                  //? Now we allocate VAB from the EdgePool to the Studio Pool
                  await vabbleDAOAuditor.allocateFromEdgePool(amountToTransfer)

                  const studioPoolUsers = await vabbleDAOAuditor.getPoolUsers(1)
                  const edgePoolUsers = await vabbleDAOAuditor.getPoolUsers(2)

                  expect(studioPoolUsers[0]).to.be.equal(proposalCreator.address)
                  expect(studioPoolUsers[1]).to.be.equal(proposalVoter.address)
                  expect(edgePoolUsers.length).to.be.equal(0)
              })

              it("Should skip the users address if they are already in the studioPool array", async function () {
                  const { stakingPool, proposalCreator, vabbleDAOAuditor, proposalVoter } =
                      await loadFixture(deployContractsFixture)

                  const depositAmount = parseEther("100")
                  const amountToTransfer = depositAmount.div(2)

                  const users = [proposalCreator.address, proposalVoter.address]
                  const amounts = [amountToTransfer, amountToTransfer]
                  const which = 1 // EdgePool

                  await stakingPool.connect(proposalCreator).depositVAB(depositAmount)
                  await stakingPool.connect(proposalVoter).depositVAB(depositAmount)
                  //? First we allocate VAB to the EdgePool
                  await vabbleDAOAuditor.allocateToPool(users, amounts, which)

                  //? Now we allocate VAB from the EdgePool to the Studio Pool
                  await vabbleDAOAuditor.allocateFromEdgePool(amountToTransfer)
                  await vabbleDAOAuditor.allocateFromEdgePool(amountToTransfer)

                  const studioPoolUsers = await vabbleDAOAuditor.getPoolUsers(1)

                  expect(studioPoolUsers[0]).to.be.equal(proposalCreator.address)
                  expect(studioPoolUsers[1]).to.be.equal(proposalVoter.address)
                  expect(studioPoolUsers.length).to.be.equal(2)
              })
          })

          describe("withdrawVABFromStudioPool", function () {
              it("Should revert if the caller is not the staking pool contract", async function () {
                  const { vabbleDAOProposalCreator, dev } = await loadFixture(
                      deployContractsFixture
                  )

                  const newAddress = dev.address

                  await expect(
                      vabbleDAOProposalCreator.withdrawVABFromStudioPool(newAddress)
                  ).to.be.revertedWith("only stakingPool")
              })

              it("Should transfer the correct amount from the studio pool to the new address and set the studio pool balance to zero and delete all studioPoolUsers", async function () {
                  const {
                      stakingPool,
                      proposalCreator,
                      vabbleDAOAuditor,
                      vabTokenContract,
                      vabbleDAO,
                      dev,
                  } = await loadFixture(deployContractsFixture)

                  const depositAmount = parseEther("100")
                  const amountToTransfer = depositAmount.div(2)

                  const users = [proposalCreator.address]
                  const amounts = [amountToTransfer]
                  const which = 2 // StudioPool

                  const newAddress = dev.address

                  await stakingPool.connect(proposalCreator).depositVAB(depositAmount)
                  await vabbleDAOAuditor.allocateToPool(users, amounts, which)

                  const studioPoolBalanceBefore = await vabTokenContract.balanceOf(
                      vabbleDAO.address
                  )
                  const newAddressBalanceBefore = await vabTokenContract.balanceOf(newAddress)

                  await helpers.impersonateAccount(stakingPool.address)
                  const signer = await ethers.getSigner(stakingPool.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).withdrawVABFromStudioPool(newAddress)
                  await helpers.stopImpersonatingAccount(stakingPool.address)

                  const studioPoolBalanceAfter = await vabTokenContract.balanceOf(vabbleDAO.address)
                  const newAddressBalanceAfter = await vabTokenContract.balanceOf(newAddress)

                  const studioPoolUsers = await vabbleDAOAuditor.getPoolUsers(1)

                  expect(studioPoolBalanceBefore).to.be.equal(amountToTransfer)
                  expect(studioPoolBalanceAfter).to.be.equal(0)
                  expect(newAddressBalanceAfter).to.be.equal(
                      newAddressBalanceBefore.add(amountToTransfer)
                  )
                  expect(studioPoolUsers.length).to.be.equal(0)
              })
          })

          describe("checkSetFinalFilms", function () {
              it("Should return true for all film ids in the array if the finalFilmCalledTime has not been updated yet", async function () {
                  const { vabbleDAO } = await loadFixture(deployContractsFixture)

                  const filmIds = [1, 2, 3]

                  const result = await vabbleDAO.checkSetFinalFilms(filmIds)

                  expect(result.length).to.equal(filmIds.length)
                  for (let i = 0; i < filmIds.length; i++) {
                      expect(result[i]).to.equal(true)
                  }
              })

              it("Should return false if the finalFilmCalledTime is less than the film reward claim period", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vabbleDAOAuditor,
                      vote,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  const filmIds = [filmId]
                  const payouts = [parseEther("100")]

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, 0)
                  await helpers.stopImpersonatingAccount(vote.address)

                  await vabbleDAOAuditor.setFinalFilms(filmIds, payouts)

                  const result = await vabbleDAO.checkSetFinalFilms(filmIds)

                  expect(result[0]).to.be.false
              })

              it("Should return true if the finalFilmCalledTime is larger than the film reward claim period", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vabbleDAOAuditor,
                      vote,
                      property,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  const filmIds = [filmId]
                  const payouts = [parseEther("100")]

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, 0)
                  await helpers.stopImpersonatingAccount(vote.address)

                  await vabbleDAOAuditor.setFinalFilms(filmIds, payouts)

                  const filmRewardClaimPeriod = await property.filmRewardClaimPeriod()

                  await helpers.time.increase(filmRewardClaimPeriod)

                  const result = await vabbleDAO.checkSetFinalFilms(filmIds)

                  expect(result[0]).to.be.true
              })
          })

          describe("setFinalFilms", function () {
              it("Should revert if the caller is not the auditor", async function () {
                  const { vabbleDAOProposalCreator } = await loadFixture(deployContractsFixture)

                  const filmIds = []
                  const payouts = [parseEther("100")]

                  await expect(
                      vabbleDAOProposalCreator.setFinalFilms(filmIds, payouts)
                  ).to.be.revertedWith("only auditor")
              })

              it("Should revert if the filmId length is 0", async function () {
                  const { vabbleDAOAuditor } = await loadFixture(deployContractsFixture)

                  const filmIds = []
                  const payouts = [parseEther("100")]

                  await expect(vabbleDAOAuditor.setFinalFilms(filmIds, payouts)).to.be.revertedWith(
                      "sFF: bad length"
                  )
              })

              it("Should revert if the filmIds array length is not equal to the payouts array", async function () {
                  const { vabbleDAOAuditor } = await loadFixture(deployContractsFixture)

                  const filmIds = [1, 2]
                  const payouts = [parseEther("100")]

                  await expect(vabbleDAOAuditor.setFinalFilms(filmIds, payouts)).to.be.revertedWith(
                      "sFF: bad length"
                  )
              })

              it("Should update the finalFilmCalledTime to the current block timestamp", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vabbleDAOAuditor,
                      vote,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  const filmIds = [filmId]
                  const payouts = [parseEther("100")]

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, 0)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const tx = await vabbleDAOAuditor.setFinalFilms(filmIds, payouts)
                  const timestamp = await getTimestampFromTx(tx)

                  const finalFilmCalledTime = await vabbleDAO.finalFilmCalledTime(filmId)

                  expect(finalFilmCalledTime).to.be.equal(timestamp)
              })

              it("Should emit the SetFinalFilms event", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vabbleDAOAuditor,
                      vote,
                      auditor,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  const filmIds = [filmId]
                  const payouts = [parseEther("100")]

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, 0)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const tx = await vabbleDAOAuditor.setFinalFilms(filmIds, payouts)

                  await expect(tx)
                      .to.emit(vabbleDAOAuditor, "SetFinalFilms")
                      .withArgs(auditor.address, filmIds, payouts)
              })
          })

          describe("startNewMonth", function () {
              it("Should revert if the caller is not the auditor", async function () {
                  const { vabbleDAOProposalCreator } = await loadFixture(deployContractsFixture)
                  await expect(vabbleDAOProposalCreator.startNewMonth()).to.be.revertedWith(
                      "only auditor"
                  )
              })

              it("Should increment the current monthId", async function () {
                  const { vabbleDAOAuditor, vabbleDAO } = await loadFixture(deployContractsFixture)

                  const currentMonthBefore = await vabbleDAO.monthId()
                  await vabbleDAOAuditor.startNewMonth()
                  const currentMonthAfter = await vabbleDAO.monthId()

                  expect(currentMonthAfter).to.be.equal(currentMonthBefore.add(1))
              })
          })

          describe("__setFinalFilm", function () {
              it("Should revert if the film status is not approved listing or approved funding", async function () {
                  const { usdcTokenContract, vabbleDAO, proposalCreator, vabbleDAOAuditor } =
                      await loadFixture(deployContractsFixture)

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  const filmIds = [filmId]
                  const payouts = [parseEther("100")]

                  await expect(vabbleDAOAuditor.setFinalFilms(filmIds, payouts)).to.be.revertedWith(
                      "sFF: Not approved"
                  )
              })

              it("Should call __setFinalAmountToPayees if film status is approved listing and update the finalizedAmount to the correct value", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vote,
                      vabbleDAOAuditor,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, 0)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const payoutAmount = parseEther("100")
                  const filmIds = [filmId]
                  const payouts = [payoutAmount]

                  await vabbleDAOAuditor.startNewMonth()
                  await vabbleDAOAuditor.setFinalFilms(filmIds, payouts)

                  const currentMonth = await vabbleDAO.monthId()
                  const finalizedAmount = await vabbleDAO.getUserRewardAmountBetweenMonths(
                      filmId,
                      0,
                      currentMonth,
                      proposalCreator.address
                  )

                  expect(finalizedAmount).to.be.equal(payoutAmount)
              })

              it("Should call __setFinalAmountToPayees and __addFinalFilmId and push the film id to the userFilmIds array if film status is approved listing", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vote,
                      vabbleDAOAuditor,
                      dev,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [dev.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, 0)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const payoutAmount = parseEther("100")
                  const filmIds = [filmId]
                  const payouts = [payoutAmount]

                  await vabbleDAOAuditor.startNewMonth()
                  await vabbleDAOAuditor.setFinalFilms(filmIds, payouts)

                  const userFilmIds = await vabbleDAO.getUserFilmIds(dev.address, 4)

                  expect(userFilmIds[0]).to.be.equal(filmId)
              })

              it("Should update the finalizedFilmIds array", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vote,
                      vabbleDAOAuditor,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, 0)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const payoutAmount = parseEther("100")
                  const filmIds = [filmId]
                  const payouts = [payoutAmount]

                  await vabbleDAOAuditor.startNewMonth()
                  await vabbleDAOAuditor.setFinalFilms(filmIds, payouts)

                  const currentMonth = await vabbleDAO.monthId()

                  const getFinalizedFilmIds = await vabbleDAO.getFinalizedFilmIds(currentMonth)

                  expect(getFinalizedFilmIds[0]).to.be.equal(filmId)
              })
          })

          describe("claimReward", function () {
              it("Should revert if the film Id array length is zero", async function () {
                  const { vabbleDAO } = await loadFixture(deployContractsFixture)

                  const filmIds = []

                  await expect(vabbleDAO.claimReward(filmIds)).to.be.revertedWith("cR: bad filmIds")
              })

              it("Should revert if the film Id array length above 1000", async function () {
                  const { vabbleDAO } = await loadFixture(deployContractsFixture)

                  const filmIds = []

                  for (let i = 0; i < 1001; i++) {
                      filmIds.push(i)
                  }
                  await expect(vabbleDAO.claimReward(filmIds)).to.be.revertedWith("cR: bad filmIds")
              })

              it("Should revert if there are no rewards to claim", async function () {
                  const { vabbleDAO } = await loadFixture(deployContractsFixture)

                  const filmIds = [1]

                  await expect(vabbleDAO.claimReward(filmIds)).to.be.revertedWith(
                      "cAR: zero amount"
                  )
              })

              it("Should revert if the Studio Pool liquidity is insufficient", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vabbleDAOAuditor,
                      vote,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, 0)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const filmIds = [filmId]
                  const payouts = [parseEther("100")]

                  await vabbleDAOAuditor.startNewMonth()
                  await vabbleDAOAuditor.setFinalFilms(filmIds, payouts)

                  await expect(vabbleDAOProposalCreator.claimReward(filmIds)).to.be.revertedWith(
                      "cAR: insufficient 1"
                  )
              })

              it("Should transfer the correct reward amount to the users balance and subtract it from the Studio Pool", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vabbleDAOAuditor,
                      vote,
                      stakingPool,
                      dev,
                      vabTokenContract,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [dev.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, 0)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const payoutAmount = parseEther("100")
                  const filmIds = [filmId]
                  const payouts = [payoutAmount]

                  await vabbleDAOAuditor.startNewMonth()
                  await vabbleDAOAuditor.setFinalFilms(filmIds, payouts)

                  const depositAmount = parseEther("200")
                  const amountToTransfer = depositAmount.div(2)

                  const users = [proposalCreator.address]
                  const amounts = [amountToTransfer]
                  const which = 1 // EdgePool

                  await stakingPool.connect(proposalCreator).depositVAB(depositAmount)
                  //? First we allocate VAB to the EdgePool
                  await vabbleDAOAuditor.allocateToPool(users, amounts, which)

                  //? Now we allocate VAB from the EdgePool to the Studio Pool
                  await vabbleDAOAuditor.allocateFromEdgePool(amountToTransfer)
                  const studioPoolBalanceBefore = await vabTokenContract.balanceOf(
                      vabbleDAO.address
                  )
                  const userBalanceBefore = await vabTokenContract.balanceOf(dev.address)

                  await vabbleDAO.connect(dev).claimReward(filmIds)
                  const studioPoolBalanceAfter = await vabTokenContract.balanceOf(vabbleDAO.address)
                  const userBalanceAfter = await vabTokenContract.balanceOf(dev.address)

                  expect(studioPoolBalanceBefore).to.be.equal(amountToTransfer)
                  expect(studioPoolBalanceAfter).to.be.equal(
                      studioPoolBalanceBefore.sub(payoutAmount)
                  )
                  expect(userBalanceAfter).to.be.equal(userBalanceBefore.add(payoutAmount))
              })

              it("Should emit the RewardAllClaimed event", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vabbleDAOAuditor,
                      vote,
                      stakingPool,
                      dev,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [dev.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, 0)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const payoutAmount = parseEther("100")
                  const filmIds = [filmId]
                  const payouts = [payoutAmount]

                  await vabbleDAOAuditor.startNewMonth()
                  await vabbleDAOAuditor.setFinalFilms(filmIds, payouts)

                  const depositAmount = parseEther("200")
                  const amountToTransfer = depositAmount.div(2)

                  const users = [proposalCreator.address]
                  const amounts = [amountToTransfer]
                  const which = 1 // EdgePool

                  await stakingPool.connect(proposalCreator).depositVAB(depositAmount)
                  //? First we allocate VAB to the EdgePool
                  await vabbleDAOAuditor.allocateToPool(users, amounts, which)

                  //? Now we allocate VAB from the EdgePool to the Studio Pool
                  await vabbleDAOAuditor.allocateFromEdgePool(amountToTransfer)
                  const currentMonth = await vabbleDAO.monthId()

                  const tx = await vabbleDAO.connect(dev).claimReward(filmIds)

                  await expect(tx)
                      .to.emit(vabbleDAO, "RewardAllClaimed")
                      .withArgs(dev.address, currentMonth, filmIds, payoutAmount)
              })
          })

          describe("claimAllReward", function () {
              it("Should revert if there are no finalized films", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      dev,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [dev.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await expect(vabbleDAO.connect(dev).claimAllReward()).to.be.revertedWith(
                      "cAR: zero filmIds"
                  )
              })

              it("Should transfer the correct reward amount to the users balance and subtract it from the Studio Pool", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vabbleDAOAuditor,
                      vote,
                      stakingPool,
                      dev,
                      vabTokenContract,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [dev.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, 0)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const payoutAmount = parseEther("100")
                  const filmIds = [filmId]
                  const payouts = [payoutAmount]

                  await vabbleDAOAuditor.startNewMonth()
                  await vabbleDAOAuditor.setFinalFilms(filmIds, payouts)

                  const depositAmount = parseEther("200")
                  const amountToTransfer = depositAmount.div(2)

                  const users = [proposalCreator.address]
                  const amounts = [amountToTransfer]
                  const which = 1 // EdgePool

                  await stakingPool.connect(proposalCreator).depositVAB(depositAmount)
                  //? First we allocate VAB to the EdgePool
                  await vabbleDAOAuditor.allocateToPool(users, amounts, which)

                  //? Now we allocate VAB from the EdgePool to the Studio Pool
                  await vabbleDAOAuditor.allocateFromEdgePool(amountToTransfer)
                  const studioPoolBalanceBefore = await vabTokenContract.balanceOf(
                      vabbleDAO.address
                  )
                  const userBalanceBefore = await vabTokenContract.balanceOf(dev.address)

                  await vabbleDAO.connect(dev).claimAllReward()
                  const studioPoolBalanceAfter = await vabTokenContract.balanceOf(vabbleDAO.address)
                  const userBalanceAfter = await vabTokenContract.balanceOf(dev.address)

                  expect(studioPoolBalanceBefore).to.be.equal(amountToTransfer)
                  expect(studioPoolBalanceAfter).to.be.equal(
                      studioPoolBalanceBefore.sub(payoutAmount)
                  )
                  expect(userBalanceAfter).to.be.equal(userBalanceBefore.add(payoutAmount))
              })
          })

          describe("getUserRewardAmountBetweenMonths", function () {
              it("Should return the correct amount", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vabbleDAOAuditor,
                      vote,
                      stakingPool,
                      dev,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [dev.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, 0)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const payoutAmount = parseEther("50")
                  const filmIds = [filmId]
                  const payouts = [payoutAmount]

                  await vabbleDAOAuditor.startNewMonth()
                  await vabbleDAOAuditor.setFinalFilms(filmIds, payouts)

                  const depositAmount = parseEther("200")
                  const amountToTransfer = depositAmount.div(2)

                  const users = [proposalCreator.address]
                  const amounts = [amountToTransfer]
                  const which = 1 // EdgePool

                  await stakingPool.connect(proposalCreator).depositVAB(depositAmount)
                  //? First we allocate VAB to the EdgePool
                  await vabbleDAOAuditor.allocateToPool(users, amounts, which)

                  //? Now we allocate VAB from the EdgePool to the Studio Pool
                  await vabbleDAOAuditor.allocateFromEdgePool(amountToTransfer)

                  const currentMonth = await vabbleDAO.monthId()
                  const prevMonth = 0

                  const reward = await vabbleDAO
                      .connect(dev)
                      .getUserRewardAmountBetweenMonths(
                          filmId,
                          prevMonth,
                          currentMonth,
                          dev.address
                      )

                  expect(reward).to.be.equal(payoutAmount)
              })
          })

          describe("getAllAvailableRewards", function () {
              it("Should return the correct amount", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vabbleDAOAuditor,
                      vote,
                      stakingPool,
                      dev,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [dev.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, 0)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const payoutAmount = parseEther("50")
                  const filmIds = [filmId]
                  const payouts = [payoutAmount]

                  await vabbleDAOAuditor.startNewMonth()
                  await vabbleDAOAuditor.setFinalFilms(filmIds, payouts)

                  const depositAmount = parseEther("200")
                  const amountToTransfer = depositAmount.div(2)

                  const users = [proposalCreator.address]
                  const amounts = [amountToTransfer]
                  const which = 1 // EdgePool

                  await stakingPool.connect(proposalCreator).depositVAB(depositAmount)
                  //? First we allocate VAB to the EdgePool
                  await vabbleDAOAuditor.allocateToPool(users, amounts, which)

                  //? Now we allocate VAB from the EdgePool to the Studio Pool
                  await vabbleDAOAuditor.allocateFromEdgePool(amountToTransfer)

                  const currentMonth = await vabbleDAO.monthId()

                  const reward = await vabbleDAO
                      .connect(dev)
                      .getAllAvailableRewards(currentMonth, dev.address)

                  expect(reward).to.be.equal(payoutAmount)
              })
          })

          describe("getUserRewardAmountForUser", function () {
              it("Should return the correct amount", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vabbleDAOAuditor,
                      vote,
                      stakingPool,
                      dev,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [dev.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, 0)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const payoutAmount = parseEther("50")
                  const filmIds = [filmId]
                  const payouts = [payoutAmount]

                  await vabbleDAOAuditor.startNewMonth()
                  await vabbleDAOAuditor.setFinalFilms(filmIds, payouts)

                  const depositAmount = parseEther("200")
                  const amountToTransfer = depositAmount.div(2)

                  const users = [proposalCreator.address]
                  const amounts = [amountToTransfer]
                  const which = 1 // EdgePool

                  await stakingPool.connect(proposalCreator).depositVAB(depositAmount)
                  //? First we allocate VAB to the EdgePool
                  await vabbleDAOAuditor.allocateToPool(users, amounts, which)

                  //? Now we allocate VAB from the EdgePool to the Studio Pool
                  await vabbleDAOAuditor.allocateFromEdgePool(amountToTransfer)

                  const currentMonth = await vabbleDAO.monthId()

                  const reward = await vabbleDAO.getUserRewardAmountForUser(
                      filmId,
                      currentMonth,
                      dev.address
                  )

                  expect(reward).to.be.equal(payoutAmount)
              })
          })

          describe("getUserFilmIds", function () {
              it("Should return the film ids with status created", async function () {
                  const { usdcTokenContract, vabbleDAO, proposalCreator } = await loadFixture(
                      deployContractsFixture
                  )

                  const flag = 1 //= create

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  const userFilmIds = await vabbleDAO.getUserFilmIds(proposalCreator.address, flag)

                  expect(userFilmIds[0]).to.be.equal(filmId)
              })

              it("Should return the film ids with status updated", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const raiseAmount = 0
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const flag = 2 // Updated

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  const userFilmIds = await vabbleDAO.getUserFilmIds(proposalCreator.address, flag)
                  expect(userFilmIds[0]).to.be.equal(filmId)
              })

              it("Should return the film ids with status approved", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vote,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0
                  const flag = 0
                  const approvedFlag = 3

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, flag)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const userFilmIds = await vabbleDAO.getUserFilmIds(
                      proposalCreator.address,
                      approvedFlag
                  )
                  expect(userFilmIds[0]).to.be.equal(filmId)
              })

              it("Should return the film ids with status finalized", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vabbleDAOAuditor,
                      vote,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0
                  const finalizedFlag = 4

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  const filmIds = [filmId]
                  const payouts = [parseEther("100")]

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, 0)
                  await helpers.stopImpersonatingAccount(vote.address)

                  await vabbleDAOAuditor.setFinalFilms(filmIds, payouts)

                  const userFilmIds = await vabbleDAO.getUserFilmIds(
                      proposalCreator.address,
                      finalizedFlag
                  )
                  expect(userFilmIds[0]).to.be.equal(filmId)
              })
          })

          describe("getFilmStatus", function () {
              it("Should return the status LISTED", async function () {
                  const { usdcTokenContract, vabbleDAO, proposalCreator } = await loadFixture(
                      deployContractsFixture
                  )

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  const filmStatus = await vabbleDAO.getFilmStatus(filmId)
                  const status = proposalStatusMap[filmStatus]

                  expect(status).to.be.equal("LISTED")
              })

              it("Should return the status UPDATED", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const raiseAmount = 0
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  const filmStatus = await vabbleDAO.getFilmStatus(filmId)
                  const status = proposalStatusMap[filmStatus]

                  expect(status).to.be.equal("UPDATED")
              })

              it("Should return the status APPROVED_LISTING", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vote,
                      vabbleDAOAuditor,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, 0)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const filmStatus = await vabbleDAO.getFilmStatus(filmId)
                  const status = proposalStatusMap[filmStatus]

                  expect(status).to.be.equal("APPROVED_LISTING")
              })

              it("Should return the status APPROVED_FUNDING", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vote,
                      property,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = ONE_DAY_IN_SECONDS
                  const rewardPercent = 1e10
                  const enableClaimer = 0
                  const minDepositAmount = await property.minDepositAmount()
                  const raiseAmount = minDepositAmount.add(1)
                  const flag = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                      fundType: 1,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, flag)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const filmStatus = await vabbleDAO.getFilmStatus(filmId)
                  const status = proposalStatusMap[filmStatus]

                  expect(status).to.be.equal("APPROVED_FUNDING")
              })

              it("Should return the status REJECTED", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vote,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0
                  const flag = 1

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, flag)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const filmStatus = await vabbleDAO.getFilmStatus(filmId)
                  const status = proposalStatusMap[filmStatus]

                  expect(status).to.be.equal("REJECTED")
              })
          })

          describe("getFilmOwner", function () {
              it("Should return the address of proposal owner (studio)", async function () {
                  const { usdcTokenContract, vabbleDAO, proposalCreator } = await loadFixture(
                      deployContractsFixture
                  )

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  const studioAddress = await vabbleDAO.getFilmOwner(filmId)

                  expect(studioAddress).to.be.equal(proposalCreator.address)
              })
          })

          describe("getFilmFund", function () {
              it("Should return the correct raise amount, fund period, fund type, reward percent", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      property,
                      dev,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [5e9, 5e9]
                  const studioPayees = [proposalCreator.address, dev.address]
                  const fundPeriod = ONE_DAY_IN_SECONDS
                  const rewardPercent = 1e5
                  const enableClaimer = 0
                  const minDepositAmount = await property.minDepositAmount()
                  const raiseAmount = minDepositAmount.add(1)
                  const fundType = 1

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                      fundType,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  const [raiseAmount_, fundPeriod_, fundType_, rewardPercent_] =
                      await vabbleDAO.getFilmFund(filmId)

                  expect(raiseAmount_.toString()).to.be.equal(raiseAmount.toString())
                  expect(fundPeriod_.toString()).to.be.equal(fundPeriod.toString())
                  expect(fundType_).to.be.equal(fundType)
                  expect(rewardPercent_.toString()).to.be.equal(rewardPercent.toString())
              })
          })

          describe("getFilmShare", function () {
              it("Should return the correct sharePercents and studioPayees", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      property,
                      dev,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [5e9, 5e9]
                  const studioPayees = [proposalCreator.address, dev.address]
                  const fundPeriod = ONE_DAY_IN_SECONDS
                  const rewardPercent = 1e5
                  const enableClaimer = 0
                  const minDepositAmount = await property.minDepositAmount()
                  const raiseAmount = minDepositAmount.add(1)
                  const fundType = 1

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                      fundType,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  const [sharePercents_, studioPayees_] = await vabbleDAO.getFilmShare(filmId)

                  expect(sharePercents_[0].toString()).to.be.equal(sharePercents[0].toString())
                  expect(sharePercents_[1].toString()).to.be.equal(sharePercents[1].toString())

                  expect(studioPayees_[0]).to.be.equal(studioPayees[0])
                  expect(studioPayees_[1]).to.be.equal(studioPayees[1])
              })
          })

          describe("getFilmProposalTime", function () {
              it("Should return the correct creation time", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      property,
                      dev,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [5e9, 5e9]
                  const studioPayees = [proposalCreator.address, dev.address]
                  const fundPeriod = ONE_DAY_IN_SECONDS
                  const rewardPercent = 1e5
                  const enableClaimer = 0
                  const minDepositAmount = await property.minDepositAmount()
                  const raiseAmount = minDepositAmount.add(1)
                  const fundType = 1

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                      fundType,
                  })

                  //? Creation time gets updated when we call proposalFilmUpdated
                  const tx = await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  const timestamp = await getTimestampFromTx(tx)

                  const [cTime_, aTime_] = await vabbleDAO.getFilmProposalTime(filmId)

                  expect(cTime_.toString()).to.be.equal(timestamp.toString())
                  expect(aTime_.toString()).to.be.equal("0")
              })

              it("Should return the correct approve time", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vote,
                      property,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = ONE_DAY_IN_SECONDS
                  const rewardPercent = 1e10
                  const enableClaimer = 0
                  const minDepositAmount = await property.minDepositAmount()
                  const raiseAmount = minDepositAmount.add(1)
                  const flag = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                      fundType: 1,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  const tx = await vabbleDAO.connect(signer).approveFilmByVote(filmId, flag)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const timestamp = await getTimestampFromTx(tx)

                  const [, aTime_] = await vabbleDAO.getFilmProposalTime(filmId)

                  expect(aTime_.toString()).to.be.equal(timestamp.toString())
              })
          })

          describe("isEnabledClaimer", function () {
              it("Should return true if claimer was enabled", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vote,
                      property,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = ONE_DAY_IN_SECONDS
                  const rewardPercent = 1e10
                  const enableClaimer = 1
                  const minDepositAmount = await property.minDepositAmount()
                  const raiseAmount = minDepositAmount.add(1)
                  const flag = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                      fundType: 1,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, flag)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const isEnabled = await vabbleDAO.isEnabledClaimer(filmId)

                  expect(isEnabled).to.be.true
              })

              it("Should return false if claimer was not enabled", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vote,
                      property,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = ONE_DAY_IN_SECONDS
                  const rewardPercent = 1e10
                  const enableClaimer = 0
                  const minDepositAmount = await property.minDepositAmount()
                  const raiseAmount = minDepositAmount.add(1)
                  const flag = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                      fundType: 1,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, flag)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const isEnabled = await vabbleDAO.isEnabledClaimer(filmId)

                  expect(isEnabled).to.be.false
              })
          })

          describe("updateEnabledClaimer", function () {
              it("Should revert if the caller is not the owner", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vote,
                      property,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = ONE_DAY_IN_SECONDS
                  const rewardPercent = 1e10
                  const enableClaimer = 0
                  const minDepositAmount = await property.minDepositAmount()
                  const raiseAmount = minDepositAmount.add(1)
                  const flag = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                      fundType: 1,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, flag)
                  await helpers.stopImpersonatingAccount(vote.address)

                  await expect(
                      vabbleDAO.updateEnabledClaimer(filmId, enableClaimer)
                  ).to.be.revertedWith("uEC: not film owner")
              })

              it("Should update the enableClaimer key of the film proposal", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vote,
                      property,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = ONE_DAY_IN_SECONDS
                  const rewardPercent = 1e10
                  const enableClaimer = 0
                  const minDepositAmount = await property.minDepositAmount()
                  const raiseAmount = minDepositAmount.add(1)
                  const flag = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                      fundType: 1,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, flag)
                  await helpers.stopImpersonatingAccount(vote.address)

                  await vabbleDAOProposalCreator.updateEnabledClaimer(filmId, enableClaimer + 1)

                  const isEnabled = await vabbleDAO.isEnabledClaimer(filmId)

                  expect(isEnabled).to.be.true
              })
          })

          describe("getFilmIds", function () {
              it("Should return a list of film ids", async function () {
                  const { proposalCreator, vabbleDAO, usdcTokenContract } = await loadFixture(
                      deployContractsFixture
                  )

                  const flag = 1 //= proposal created

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  const filmIds = await vabbleDAO.getFilmIds(flag)

                  expect(filmIds[0]).to.be.equal(filmId)
              })
          })

          describe("getPoolUsers", function () {
              const studioPoolFlag = 1
              const edgePoolFlag = 2

              it("Should revert if the caller is not the auditor", async function () {
                  const {
                      stakingPool,
                      proposalCreator,
                      vabbleDAOAuditor,
                      vabbleDAOProposalCreator,
                  } = await loadFixture(deployContractsFixture)

                  const depositAmount = parseEther("100")

                  const users = [proposalCreator.address]
                  const amounts = [depositAmount.div(2)]
                  const which = 1 // EdgePool

                  await stakingPool.connect(proposalCreator).depositVAB(depositAmount)
                  await vabbleDAOAuditor.allocateToPool(users, amounts, which)

                  await expect(
                      vabbleDAOProposalCreator.getPoolUsers(edgePoolFlag)
                  ).to.be.revertedWith("only auditor")
              })

              it("Should return the edge pool users", async function () {
                  const { stakingPool, proposalCreator, vabbleDAOAuditor } = await loadFixture(
                      deployContractsFixture
                  )

                  const depositAmount = parseEther("100")

                  const users = [proposalCreator.address]
                  const amounts = [depositAmount.div(2)]
                  const which = 1 // EdgePool

                  await stakingPool.connect(proposalCreator).depositVAB(depositAmount)
                  await vabbleDAOAuditor.allocateToPool(users, amounts, which)

                  const edgePoolUsers = await vabbleDAOAuditor.getPoolUsers(edgePoolFlag)

                  expect(edgePoolUsers[0]).to.be.equal(proposalCreator.address)
              })

              it("Should return the studio pool users", async function () {
                  const { stakingPool, proposalCreator, vabbleDAOAuditor } = await loadFixture(
                      deployContractsFixture
                  )

                  const depositAmount = parseEther("100")

                  const users = [proposalCreator.address]
                  const amounts = [depositAmount.div(2)]
                  const which = 2 // StudioPool

                  await stakingPool.connect(proposalCreator).depositVAB(depositAmount)
                  await vabbleDAOAuditor.allocateToPool(users, amounts, which)

                  const studioPoolUsers = await vabbleDAOAuditor.getPoolUsers(studioPoolFlag)

                  expect(studioPoolUsers[0]).to.be.equal(proposalCreator.address)
              })
          })

          describe("getFinalizedFilmIds", function () {
              it("Should return a list of finalized film ids", async function () {
                  const {
                      usdcTokenContract,
                      vabbleDAO,
                      proposalCreator,
                      vabbleDAOProposalCreator,
                      vote,
                      vabbleDAOAuditor,
                  } = await loadFixture(deployContractsFixture)

                  const sharePercents = [1e10]
                  const studioPayees = [proposalCreator.address]
                  const fundPeriod = 0
                  const rewardPercent = 0
                  const enableClaimer = 0
                  const raiseAmount = 0

                  const { filmId } = await createDummyFilmProposal({
                      vabbleDAO,
                      proposalCreator,
                      usdcTokenContract,
                  })

                  await vabbleDAOProposalCreator.proposalFilmUpdate(
                      filmId,
                      proposalTitle,
                      proposalDescription,
                      sharePercents,
                      studioPayees,
                      raiseAmount,
                      fundPeriod,
                      rewardPercent,
                      enableClaimer
                  )

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await vabbleDAO.connect(signer).approveFilmByVote(filmId, 0)
                  await helpers.stopImpersonatingAccount(vote.address)

                  const payoutAmount = parseEther("100")
                  const filmIds = [filmId]
                  const payouts = [payoutAmount]

                  await vabbleDAOAuditor.startNewMonth()
                  await vabbleDAOAuditor.setFinalFilms(filmIds, payouts)

                  const currentMonth = await vabbleDAO.monthId()

                  const getFinalizedFilmIds = await vabbleDAO.getFinalizedFilmIds(currentMonth)

                  expect(getFinalizedFilmIds[0]).to.be.equal(filmId)
              })
          })

          describe("migrateFilmProposals", function () {
              it("Should revert if the caller is not the auditor", async function () {
                  const { vabbleDAO } = await loadFixture(deployContractsFixture)

                  await expect(vabbleDAO.migrateFilmProposals([])).to.be.revertedWith(
                      "only auditor"
                  )
              })

              it("Should revert if the input array is zero", async function () {
                  const { vabbleDAOAuditor } = await loadFixture(deployContractsFixture)

                  await expect(vabbleDAOAuditor.migrateFilmProposals([])).to.be.revertedWith(
                      "No films to migrate"
                  )
              })

              it("Should revert if the films have already been migrated", async function () {
                  const { vabbleDAOAuditor } = await loadFixture(deployContractsFixture)

                  const filmProposals = [
                      {
                          title: "Test video to see how the upload of videos to the platform works and how smoothly and easily you can manage your productions.",
                          description:
                              "Test video to see how the upload of videos to the platform works and how smoothly and easily you can manage your productions.",
                          raiseAmount: 0,
                          fundPeriod: 0,
                          fundType: 0,
                          rewardPercent: 0,
                          noVote: 0,
                          enableClaimer: 0,
                          pCreateTime: 1722941213,
                          pApproveTime: 1723552607,
                          studio: "0xa81440d89c55b063edf808922311f5462a0e86de",
                          status: 4,
                          sharePercents: [10000000000],
                          studioPayees: ["0xa81440d89c55b063edf808922311f5462a0e86de"],
                      },
                  ]

                  // Perform the migration
                  const tx = await vabbleDAOAuditor.migrateFilmProposals(filmProposals)
                  const receipt = await tx.wait()
                  console.log("Migration successful! Transaction hash:", receipt.transactionHash)
                  await expect(
                      vabbleDAOAuditor.migrateFilmProposals(filmProposals)
                  ).to.be.revertedWith("Migration already completed")
              })

              it("Should migrate the films and update all state variables correct", async function () {
                  const { vabbleDAOAuditor } = await loadFixture(deployContractsFixture)

                  const filmProposals = [
                      {
                          filmId: 1,
                          filmDetails: {
                              title: "",
                              description: "",
                              raiseAmount: 0,
                              fundPeriod: 0,
                              fundType: 0,
                              rewardPercent: 0,
                              noVote: 0,
                              enableClaimer: 0,
                              pCreateTime: 0,
                              pApproveTime: 0,
                              studio: "0xd71d56bf0761537b69436d8d16381d78f90b827e",
                              status: 0, // Listed
                              sharePercents: [],
                              studioPayees: [],
                          },
                      },
                      {
                          filmId: 2,
                          filmDetails: {
                              title: "Test Updated",
                              description: "Test Updated",
                              raiseAmount: 0,
                              fundPeriod: 0,
                              fundType: 0,
                              rewardPercent: 0,
                              noVote: 0,
                              enableClaimer: 0,
                              pCreateTime: 1731758217,
                              pApproveTime: 0,
                              studio: "0x17f0e7bcbef83d547815f1cf03e247af1b0dba7b",
                              status: 1,
                              sharePercents: [10000000000],
                              studioPayees: ["0xa6d9f34d3206edd6a55f295d248cf7b4fdf8840d"],
                          },
                      },
                      {
                          filmId: 3,
                          filmDetails: {
                              title: "Test Approved Listing",
                              description: "Test Approved Listing",
                              raiseAmount: 0,
                              fundPeriod: 0,
                              fundType: 0,
                              rewardPercent: 0,
                              noVote: 0,
                              enableClaimer: 0,
                              pCreateTime: 1731417347,
                              pApproveTime: 1732040509,
                              studio: "0xa6d9f34d3206edd6a55f295d248cf7b4fdf8840d",
                              status: 2,
                              sharePercents: [10000000000],
                              studioPayees: ["0xa6d9f34d3206edd6a55f295d248cf7b4fdf8840d"],
                          },
                      },
                      {
                          filmId: 4,
                          filmDetails: {
                              title: "Test Approved Funding",
                              description: "Test Approved Funding",
                              raiseAmount: 1000000,
                              fundPeriod: 30,
                              fundType: 1,
                              rewardPercent: 1000000000,
                              noVote: 0,
                              enableClaimer: 0,
                              pCreateTime: 1722995509,
                              pApproveTime: 1723611761,
                              studio: "0x3635d79881d94dc119daa95c02ef659ba6a8cab7",
                              status: 3, // Approved Funding
                              sharePercents: [10000000000],
                              studioPayees: ["0x3635d79881d94dc119daa95c02ef659ba6a8cab7"],
                          },
                      },
                      {
                          filmId: 5,
                          filmDetails: {
                              title: "Test Rejected",
                              description: "Test Rejected",
                              raiseAmount: 0,
                              fundPeriod: 0,
                              fundType: 0,
                              rewardPercent: 0,
                              noVote: 0,
                              enableClaimer: 0,
                              pCreateTime: 1722995509,
                              pApproveTime: 1723611761,
                              studio: "0x3635d79881d94dc119daa95c02ef659ba6a8cab7",
                              status: 4,
                              sharePercents: [10000000000],
                              studioPayees: ["0x3635d79881d94dc119daa95c02ef659ba6a8cab7"],
                          },
                      },
                  ]

                  const filmDetails = filmProposals.map((fp) => fp.filmDetails)

                  // Perform the migration
                  const tx = await vabbleDAOAuditor.migrateFilmProposals(filmDetails)
                  const receipt = await tx.wait()

                  // 1. Check the FilmProposalsMigrated event
                  const event = receipt.events?.find((e) => e.event === "FilmProposalsMigrated")
                  expect(event).to.not.be.undefined
                  expect(event.args.numberOfFilms).to.equal(filmProposals.length)
                  expect(event.args.migrator).to.equal(await vabbleDAOAuditor.signer.getAddress())

                  // 2. Check filmCount is updated correctly
                  const filmCount = await vabbleDAOAuditor.filmCount()
                  expect(filmCount).to.equal(filmProposals.length)

                  // 3. Check filmInfo is stored correctly for each film
                  for (let i = 0; i < filmProposals.length; i++) {
                      const filmId = filmProposals[i].filmId
                      const filmDetails = filmProposals[i].filmDetails
                      const filmInfo = await vabbleDAOAuditor.filmInfo(filmId)
                      const filmShareAndStudioPayees = await vabbleDAOAuditor.getFilmShare(filmId)

                      expect(filmInfo.title).to.equal(filmDetails.title)
                      expect(filmInfo.description).to.equal(filmDetails.description)
                      expect(filmInfo.raiseAmount).to.equal(filmDetails.raiseAmount)
                      expect(filmInfo.fundPeriod).to.equal(filmDetails.fundPeriod)
                      expect(filmInfo.fundType).to.equal(filmDetails.fundType)
                      expect(filmInfo.rewardPercent).to.equal(filmDetails.rewardPercent)
                      expect(filmInfo.noVote).to.equal(filmDetails.noVote)
                      expect(filmInfo.enableClaimer).to.equal(filmDetails.enableClaimer)
                      expect(filmInfo.pCreateTime).to.equal(filmDetails.pCreateTime)
                      expect(filmInfo.pApproveTime).to.equal(filmDetails.pApproveTime)
                      expect(filmInfo.studio.toLowerCase()).to.equal(
                          filmDetails.studio.toLowerCase()
                      )
                      expect(filmInfo.status).to.equal(filmDetails.status)

                      expect(filmShareAndStudioPayees.sharePercents_.length).to.equal(
                          filmDetails.sharePercents.length
                      )
                      for (let j = 0; j < filmDetails.sharePercents.length; j++) {
                          expect(filmShareAndStudioPayees.sharePercents_[j].toString()).to.equal(
                              filmDetails.sharePercents[j].toString()
                          )
                      }

                      expect(filmShareAndStudioPayees.studioPayees_.length).to.equal(
                          filmDetails.studioPayees.length
                      )
                      for (let j = 0; j < filmDetails.studioPayees.length; j++) {
                          expect(filmShareAndStudioPayees.studioPayees_[j].toLowerCase()).to.equal(
                              filmDetails.studioPayees[j].toLowerCase()
                          )
                      }
                  }

                  // 4. Check totalFilmIds arrays are updated correctly
                  // flag: 1=proposal, 2=approveListing, 3=approveFunding, 4=updated
                  const proposalFilms = await vabbleDAOAuditor.getFilmIds(1)
                  const updatedFilms = await vabbleDAOAuditor.getFilmIds(4)
                  const approveListingFilms = await vabbleDAOAuditor.getFilmIds(2)
                  const approveFundingFilms = await vabbleDAOAuditor.getFilmIds(3)

                  // Filter the films based on their status
                  const updatedFilmIds = filmProposals.filter((f) => f.filmDetails.status === 1)
                  const approvedListingFilms = filmProposals.filter(
                      (f) => f.filmDetails.status === 2
                  )
                  const approvedFundingFilms = filmProposals.filter(
                      (f) => f.filmDetails.status === 3
                  )
                  const rejectedFilms = filmProposals.filter((f) => f.filmDetails.status === 4)

                  // Convert to filmIds
                  const proposalFilmIds = proposalFilms.map((f) => f.toNumber())
                  const updatedFilmIdsMapped = updatedFilms.map((f) => f.toNumber())
                  const approveListingFilmIds = approveListingFilms.map((f) => f.toNumber())
                  const approveFundingFilmIds = approveFundingFilms.map((f) => f.toNumber())

                  const approvedListingFilmIdsList = approvedListingFilms.map((f) => f.filmId)
                  const approvedFundingFilmIdsList = approvedFundingFilms.map((f) => f.filmId)

                  // Perform the comparisons
                  expect(proposalFilmIds.length).to.equal(filmProposals.length)
                  expect(updatedFilmIdsMapped.length).to.equal(
                      updatedFilmIds.length +
                          approvedListingFilms.length +
                          approvedFundingFilms.length +
                          rejectedFilms.length
                  )
                  expect(approveListingFilmIds).to.deep.equal(approvedListingFilmIdsList)
                  expect(approveFundingFilmIds).to.deep.equal(approvedFundingFilmIdsList)

                  // 5. Check userFilmIds are updated correctly for each studio
                  // flag: 1=create, 2=update, 3=approve
                  for (const film of filmProposals) {
                      const filmDetails = film.filmDetails
                      const studioFilms = {
                          created: await vabbleDAOAuditor.getUserFilmIds(filmDetails.studio, 1),
                          updated: await vabbleDAOAuditor.getUserFilmIds(filmDetails.studio, 2),
                          approved: await vabbleDAOAuditor.getUserFilmIds(filmDetails.studio, 3),
                      }

                      // If film is LISTED (status 0), it should be in created list
                      if (filmDetails.status === 0) {
                          expect(studioFilms.created.map((f) => f.toNumber())).to.include(
                              film.filmId
                          )
                      }

                      // If film is UPDATED (status 1), it should be in updated list
                      if (filmDetails.status === 1) {
                          expect(studioFilms.updated.map((f) => f.toNumber())).to.include(
                              film.filmId
                          )
                      }

                      // If film is APPROVED_LISTING (status 2) or APPROVED_FUNDING (status 3),
                      // it should be in the approved list
                      if (filmDetails.status === 2 || filmDetails.status === 3) {
                          expect(studioFilms.approved.map((f) => f.toNumber())).to.include(
                              film.filmId
                          )
                      }
                  }
              })

              it("Should migrate the actual films", async function () {
                  const { vabbleDAOAuditor } = await loadFixture(deployContractsFixture)
                  const filePath = path.resolve(__dirname, "../../film_data.json")
                  const filmProposals = JSON.parse(fs.readFileSync(filePath, "utf8"))

                  const filmDetails = filmProposals.map((fp) => fp.filmDetails)

                  // Perform the migration
                  const tx = await vabbleDAOAuditor.migrateFilmProposals(filmDetails)
                  const receipt = await tx.wait()

                  // 1. Check the FilmProposalsMigrated event
                  const event = receipt.events?.find((e) => e.event === "FilmProposalsMigrated")
                  expect(event).to.not.be.undefined
                  expect(event.args.numberOfFilms).to.equal(filmProposals.length)
                  expect(event.args.migrator).to.equal(await vabbleDAOAuditor.signer.getAddress())

                  // 2. Check filmCount is updated correctly
                  const filmCount = await vabbleDAOAuditor.filmCount()
                  const updatedFilmCount = await vabbleDAOAuditor.updatedFilmCount()
                  expect(filmCount).to.equal(filmProposals.length)
                  expect(updatedFilmCount).to.equal(24)

                  // 3. Check filmInfo is stored correctly for each film
                  for (let i = 0; i < filmProposals.length; i++) {
                      const filmId = filmProposals[i].filmId
                      const filmDetails = filmProposals[i].filmDetails
                      const filmInfo = await vabbleDAOAuditor.filmInfo(filmId)
                      const filmShareAndStudioPayees = await vabbleDAOAuditor.getFilmShare(filmId)

                      expect(filmInfo.title).to.equal(filmDetails.title)
                      expect(filmInfo.description).to.equal(filmDetails.description)
                      expect(filmInfo.raiseAmount).to.equal(filmDetails.raiseAmount)
                      expect(filmInfo.fundPeriod).to.equal(filmDetails.fundPeriod)
                      expect(filmInfo.fundType).to.equal(filmDetails.fundType)
                      expect(filmInfo.rewardPercent).to.equal(filmDetails.rewardPercent)
                      expect(filmInfo.noVote).to.equal(filmDetails.noVote)
                      expect(filmInfo.enableClaimer).to.equal(filmDetails.enableClaimer)
                      expect(filmInfo.pCreateTime).to.equal(filmDetails.pCreateTime)
                      expect(filmInfo.pApproveTime).to.equal(filmDetails.pApproveTime)
                      expect(filmInfo.studio.toLowerCase()).to.equal(
                          filmDetails.studio.toLowerCase()
                      )
                      expect(filmInfo.status).to.equal(filmDetails.status)

                      expect(filmShareAndStudioPayees.sharePercents_.length).to.equal(
                          filmDetails.sharePercents.length
                      )
                      for (let j = 0; j < filmDetails.sharePercents.length; j++) {
                          expect(filmShareAndStudioPayees.sharePercents_[j].toString()).to.equal(
                              filmDetails.sharePercents[j].toString()
                          )
                      }

                      expect(filmShareAndStudioPayees.studioPayees_.length).to.equal(
                          filmDetails.studioPayees.length
                      )
                      for (let j = 0; j < filmDetails.studioPayees.length; j++) {
                          expect(filmShareAndStudioPayees.studioPayees_[j].toLowerCase()).to.equal(
                              filmDetails.studioPayees[j].toLowerCase()
                          )
                      }
                  }

                  // 4. Check totalFilmIds arrays are updated correctly
                  // flag: 1=proposal, 2=approveListing, 3=approveFunding, 4=updated
                  const proposalFilms = await vabbleDAOAuditor.getFilmIds(1)
                  const updatedFilms = await vabbleDAOAuditor.getFilmIds(4)
                  const approveListingFilms = await vabbleDAOAuditor.getFilmIds(2)
                  const approveFundingFilms = await vabbleDAOAuditor.getFilmIds(3)

                  const proposalFilmIds = proposalFilms.map((f) => f.toNumber())
                  const updatedFilmIdsMapped = updatedFilms.map((f) => f.toNumber())
                  const approveListingFilmIds = approveListingFilms.map((f) => f.toNumber())
                  const approveFundingFilmIds = approveFundingFilms.map((f) => f.toNumber())

                  const expectedProposalFilmIds = [
                      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
                      23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
                  ].sort((a, b) => a - b)

                  const expectedUpdatedFilmIds = [
                      4, 3, 7, 6, 9, 5, 10, 11, 12, 13, 15, 16, 17, 18, 19, 21, 24, 25, 22, 26, 32,
                      29, 28, 30,
                  ].sort((a, b) => a - b)

                  const expectedApprovedListingFilmIds = [
                      4, 7, 10, 5, 11, 12, 13, 15, 16, 17, 18, 19, 21, 24, 25, 22, 26, 32, 29, 28,
                  ].sort((a, b) => a - b)

                  const expectedApprovedFundingFilmIds = [].sort((a, b) => a - b)

                  expect(proposalFilmIds).to.deep.equal(expectedProposalFilmIds)
                  expect(updatedFilmIdsMapped).to.deep.equal(expectedUpdatedFilmIds)
                  expect(approveListingFilmIds).to.deep.equal(expectedApprovedListingFilmIds)
                  expect(approveFundingFilmIds).to.deep.equal(expectedApprovedFundingFilmIds)

                  // 5. Check userFilmIds are updated correctly for each studio
                  // flag: 1=create, 2=update, 3=approve
                  for (const film of filmProposals) {
                      const filmDetails = film.filmDetails
                      const studioFilms = {
                          created: await vabbleDAOAuditor.getUserFilmIds(filmDetails.studio, 1),
                          updated: await vabbleDAOAuditor.getUserFilmIds(filmDetails.studio, 2),
                          approved: await vabbleDAOAuditor.getUserFilmIds(filmDetails.studio, 3),
                      }

                      // If film is LISTED (status 0), it should be in created list
                      if (filmDetails.status === 0) {
                          expect(studioFilms.created.map((f) => f.toNumber())).to.include(
                              film.filmId
                          )
                      }

                      // If film is UPDATED (status 1), it should be in updated list
                      if (filmDetails.status === 1) {
                          expect(studioFilms.updated.map((f) => f.toNumber())).to.include(
                              film.filmId
                          )
                      }

                      // If film is APPROVED_LISTING (status 2) or APPROVED_FUNDING (status 3),
                      // it should be in the approved list
                      if (filmDetails.status === 2 || filmDetails.status === 3) {
                          expect(studioFilms.approved.map((f) => f.toNumber())).to.include(
                              film.filmId
                          )
                      }
                  }
              })
          })
      })
