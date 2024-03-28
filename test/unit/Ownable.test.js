const { ethers, network } = require("hardhat")
const { developmentChains, ONE_DAY_IN_SECONDS } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")
const { ZERO_ADDRESS, CONFIG } = require("../../scripts/utils")
const helpers = require("@nomicfoundation/hardhat-network-helpers")
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
const { parseEther } = require("ethers/lib/utils")
const { fundAndApproveAccounts, deployAndInitAllContracts } = require("../../helper-functions")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Ownable Unit Tests", function () {
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
                  ownableFactory,
              } = await deployAndInitAllContracts()

              //? Fund and approve accounts
              const accounts = [deployer, auditor]
              const contractsToApprove = [ownable]
              await fundAndApproveAccounts({
                  accounts,
                  vabTokenContract,
                  contracts: contractsToApprove,
                  usdcTokenContract,
              })

              //? Connect accounts to ownable contract
              const ownableDeployer = ownable.connect(deployer)

              const ownableAuditor = ownable.connect(auditor)

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
                  ownableDeployer,
                  ownableAuditor,
                  ownableFactory,
              }
          }

          describe("constructor", function () {
              it("Should set the correct address to the constructor variables", async function () {
                  const { ownable, deployer, auditor, usdcTokenContract, vabTokenContract } =
                      await loadFixture(deployContractsFixture)

                  const deployerAddress = await ownable.deployer()
                  const auditorAddress = await ownable.auditor()
                  const vabWalletAddress = await ownable.VAB_WALLET()
                  const payoutTokenAddress = await ownable.PAYOUT_TOKEN()
                  const usdcTokenAddress = await ownable.USDC_TOKEN()

                  expect(deployerAddress).to.be.equal(deployer.address)
                  expect(auditorAddress).to.be.equal(auditor.address)
                  expect(payoutTokenAddress).to.be.equal(vabTokenContract.address)
                  expect(usdcTokenAddress).to.be.equal(usdcTokenContract.address)
                  expect(vabWalletAddress).to.be.equal(CONFIG.daoWalletAddress)
              })

              it("Should add the usdc token address to the depositAssetList array and update the allowAssetToDeposit array to true for usdc", async function () {
                  const { ownable, usdcTokenContract } = await loadFixture(deployContractsFixture)

                  const depositAssetList = await ownable.getDepositAssetList()
                  const isDepositAsset = await ownable.isDepositAsset(usdcTokenContract.address)

                  expect(depositAssetList[0]).to.be.equal(usdcTokenContract.address)
                  expect(isDepositAsset).to.be.equal(true)
              })

              it("Should revert if the multiSigWallet is a zero address", async function () {
                  const { ownableFactory, vabTokenContract, usdcTokenContract } = await loadFixture(
                      deployContractsFixture
                  )

                  await expect(
                      ownableFactory.deploy(
                          CONFIG.daoWalletAddress,
                          vabTokenContract.address,
                          usdcTokenContract.address,
                          ZERO_ADDRESS
                      )
                  ).to.be.revertedWith("multiSigWallet: Zero address")
              })

              it("Should revert if the vabbleWallet is a zero address", async function () {
                  const { ownableFactory, vabTokenContract, usdcTokenContract } = await loadFixture(
                      deployContractsFixture
                  )

                  await expect(
                      ownableFactory.deploy(
                          ZERO_ADDRESS,
                          CONFIG.daoWalletAddress,
                          vabTokenContract.address,
                          usdcTokenContract.address
                      )
                  ).to.be.revertedWith("vabbleWallet: Zero address")
              })

              it("Should revert if the payoutToken is a zero address", async function () {
                  const { ownableFactory, vabTokenContract, usdcTokenContract } = await loadFixture(
                      deployContractsFixture
                  )

                  await expect(
                      ownableFactory.deploy(
                          CONFIG.daoWalletAddress,
                          ZERO_ADDRESS,
                          vabTokenContract.address,
                          usdcTokenContract.address
                      )
                  ).to.be.revertedWith("payoutToken: Zero address")
              })

              it("Should revert if the usdcToken is a zero address", async function () {
                  const { ownableFactory, vabTokenContract, usdcTokenContract } = await loadFixture(
                      deployContractsFixture
                  )

                  await expect(
                      ownableFactory.deploy(
                          CONFIG.daoWalletAddress,
                          vabTokenContract.address,
                          ZERO_ADDRESS,
                          usdcTokenContract.address
                      )
                  ).to.be.revertedWith("usdcToken: Zero address")
              })
          })

          describe("setup", function () {
              it("Should revert if the caller is not the deployer", async function () {
                  const {
                      vabbleDAO,
                      deployer,
                      vabTokenContract,
                      usdcTokenContract,
                      ownableFactory,
                      auditor,
                      dev,
                  } = await loadFixture(deployContractsFixture)

                  const newOwnableContract = await ownableFactory
                      .connect(deployer)
                      .deploy(
                          CONFIG.daoWalletAddress,
                          vabTokenContract.address,
                          usdcTokenContract.address,
                          auditor.address
                      )

                  await expect(
                      newOwnableContract
                          .connect(dev)
                          .setup(vabbleDAO.address, vabbleDAO.address, vabbleDAO.address)
                  ).to.be.revertedWith("caller is not the deployer")
              })

              it("Should set the correct vote, dao and stakingPool address", async function () {
                  const { ownable, stakingPool, vabbleDAO, vote } = await loadFixture(
                      deployContractsFixture
                  )

                  const voteAddress = await ownable.getVoteAddress()
                  const vabbleDAOAddress = await ownable.getVabbleDAO()
                  const poolAddress = await ownable.getStakingPoolAddress()

                  expect(voteAddress).to.be.equal(vote.address)
                  expect(vabbleDAOAddress).to.be.equal(vabbleDAO.address)
                  expect(poolAddress).to.be.equal(stakingPool.address)
              })

              it("Should revert if the vote contract address was already set", async function () {
                  const {
                      vote,
                      deployer,
                      vabTokenContract,
                      usdcTokenContract,
                      ownableFactory,
                      auditor,
                      vabbleDAO,
                      stakingPool,
                  } = await loadFixture(deployContractsFixture)

                  const newOwnableContract = await ownableFactory
                      .connect(deployer)
                      .deploy(
                          CONFIG.daoWalletAddress,
                          vabTokenContract.address,
                          usdcTokenContract.address,
                          auditor.address
                      )
                  await newOwnableContract.setup(
                      vote.address,
                      vabbleDAO.address,
                      stakingPool.address
                  )

                  await expect(
                      newOwnableContract.setup(vote.address, vabbleDAO.address, stakingPool.address)
                  ).to.be.revertedWith("setupVote: already setup")
              })

              it("Should revert if the vote contract address is a zero address", async function () {
                  const {
                      vabbleDAO,
                      deployer,
                      vabTokenContract,
                      usdcTokenContract,
                      ownableFactory,
                      auditor,
                      stakingPool,
                  } = await loadFixture(deployContractsFixture)

                  const newOwnableContract = await ownableFactory
                      .connect(deployer)
                      .deploy(
                          CONFIG.daoWalletAddress,
                          vabTokenContract.address,
                          usdcTokenContract.address,
                          auditor.address
                      )

                  await expect(
                      newOwnableContract.setup(ZERO_ADDRESS, vabbleDAO.address, stakingPool.address)
                  ).to.be.revertedWith("setupVote: bad Vote Contract address")
              })

              it("Should revert if the VabbleDAO contract address is a zero address", async function () {
                  const {
                      vote,
                      deployer,
                      vabTokenContract,
                      usdcTokenContract,
                      ownableFactory,
                      auditor,
                      stakingPool,
                  } = await loadFixture(deployContractsFixture)

                  const newOwnableContract = await ownableFactory
                      .connect(deployer)
                      .deploy(
                          CONFIG.daoWalletAddress,
                          vabTokenContract.address,
                          usdcTokenContract.address,
                          auditor.address
                      )

                  await expect(
                      newOwnableContract.setup(vote.address, ZERO_ADDRESS, stakingPool.address)
                  ).to.be.revertedWith("setupVote: bad VabbleDAO contract address")
              })

              it("Should revert if the StakingPool contract address is a zero address", async function () {
                  const {
                      vote,
                      deployer,
                      vabTokenContract,
                      usdcTokenContract,
                      ownableFactory,
                      auditor,
                      vabbleDAO,
                  } = await loadFixture(deployContractsFixture)

                  const newOwnableContract = await ownableFactory
                      .connect(deployer)
                      .deploy(
                          CONFIG.daoWalletAddress,
                          vabTokenContract.address,
                          usdcTokenContract.address,
                          auditor.address
                      )

                  await expect(
                      newOwnableContract.setup(vote.address, vabbleDAO.address, ZERO_ADDRESS)
                  ).to.be.revertedWith("setupVote: bad StakingPool contract address")
              })
          })
      })
