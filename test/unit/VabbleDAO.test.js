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
    getTimestampFromTx,
} = require("../../helper-functions")

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
                  expect(newAddressBalanceBefore).to.be.equal(0)
                  expect(studioPoolBalanceAfter).to.be.equal(0)
                  expect(newAddressBalanceAfter).to.be.equal(amountToTransfer)
                  expect(studioPoolUsers.length).to.be.equal(0)
              })
          })
      })
