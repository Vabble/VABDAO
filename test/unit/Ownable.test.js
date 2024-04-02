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
                  exmTokenContract,
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
                  exmTokenContract,
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

          describe("transferAuditor", function () {
              it("Should revert if the caller is not the auditor", async function () {
                  const { ownable, dev } = await loadFixture(deployContractsFixture)

                  await expect(
                      ownable.connect(dev).transferAuditor(dev.address)
                  ).to.be.revertedWith("caller is not the auditor")
              })

              it("Should revert if the new auditor address is a zero address", async function () {
                  const { ownable, auditor } = await loadFixture(deployContractsFixture)

                  await expect(
                      ownable.connect(auditor).transferAuditor(ZERO_ADDRESS)
                  ).to.be.revertedWith("Ownablee: Zero newAuditor address")
              })

              it("Should revert if the new auditor address is the same as the current", async function () {
                  const { ownable, auditor } = await loadFixture(deployContractsFixture)

                  await expect(
                      ownable.connect(auditor).transferAuditor(auditor.address)
                  ).to.be.revertedWith("Ownablee: Zero newAuditor address")
              })

              it("Should update the auditor address to the new one", async function () {
                  const { ownable, auditor, dev } = await loadFixture(deployContractsFixture)

                  await ownable.connect(auditor).transferAuditor(dev.address)
                  const newAuditorAddress = await ownable.auditor()

                  expect(newAuditorAddress).to.be.equal(dev.address)
              })
          })

          describe("replaceAuditor", function () {
              it("Should revert if the caller is not the vote contract", async function () {
                  const { ownable, dev } = await loadFixture(deployContractsFixture)

                  await expect(ownable.connect(dev).replaceAuditor(dev.address)).to.be.revertedWith(
                      "caller is not the vote contract"
                  )
              })

              it("Should revert if the new auditor address is a zero address", async function () {
                  const { ownable, vote } = await loadFixture(deployContractsFixture)

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await expect(
                      ownable.connect(signer).replaceAuditor(ZERO_ADDRESS)
                  ).to.be.revertedWith("Ownablee: Zero newAuditor address")
              })

              it("Should revert if the new auditor address is the same as the current", async function () {
                  const { ownable, auditor, vote } = await loadFixture(deployContractsFixture)

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  //? Act
                  await expect(
                      ownable.connect(signer).replaceAuditor(auditor.address)
                  ).to.be.revertedWith("Ownablee: Zero newAuditor address")
              })

              it("Should update the auditor address to the new one", async function () {
                  const { ownable, dev, vote } = await loadFixture(deployContractsFixture)

                  await helpers.impersonateAccount(vote.address)
                  const signer = await ethers.getSigner(vote.address)
                  await helpers.setBalance(signer.address, 100n ** 18n)
                  await ownable.connect(signer).replaceAuditor(dev.address)

                  await helpers.stopImpersonatingAccount(vote.address)

                  const newAuditorAddress = await ownable.auditor()

                  expect(newAuditorAddress).to.be.equal(dev.address)
              })
          })

          describe("addDepositAsset", function () {
              it("Should revert if the caller is not the auditor or deployer", async function () {
                  const { ownable, dev } = await loadFixture(deployContractsFixture)

                  await expect(ownable.connect(dev).addDepositAsset([])).to.be.revertedWith(
                      "caller is not the auditor or deployer"
                  )
              })

              it("Should revert if the asset list is empty", async function () {
                  const { ownable, auditor } = await loadFixture(deployContractsFixture)

                  await expect(ownable.connect(auditor).addDepositAsset([])).to.be.revertedWith(
                      "addDepositAsset: zero list"
                  )
              })

              it("Should update the existing asset list when the caller is the auditor", async function () {
                  const { ownable, auditor } = await loadFixture(deployContractsFixture)
                  const assetList = [auditor.address]

                  await ownable.connect(auditor).addDepositAsset(assetList)

                  const depositAssetListAfter = await ownable.getDepositAssetList()
                  const isDepositAsset = await ownable.isDepositAsset(assetList[0])

                  expect(depositAssetListAfter[depositAssetListAfter.length - 1]).to.be.equal(
                      assetList[0]
                  )
                  expect(isDepositAsset).to.be.true
              })

              it("Should update the existing asset list when the caller is the deployer", async function () {
                  const { ownable, deployer } = await loadFixture(deployContractsFixture)
                  const assetList = [deployer.address]

                  await ownable.connect(deployer).addDepositAsset(assetList)

                  const depositAssetListAfter = await ownable.getDepositAssetList()
                  const isDepositAsset = await ownable.isDepositAsset(assetList[0])

                  expect(depositAssetListAfter[depositAssetListAfter.length - 1]).to.be.equal(
                      assetList[0]
                  )
                  expect(isDepositAsset).to.be.true
              })
          })

          describe("removeDepositAsset", function () {
              it("Should revert if the caller is not the auditor or deployer", async function () {
                  const { ownable, dev } = await loadFixture(deployContractsFixture)

                  await expect(ownable.connect(dev).removeDepositAsset([])).to.be.revertedWith(
                      "caller is not the auditor"
                  )
              })

              it("Should revert if the asset list is empty", async function () {
                  const { ownable, auditor } = await loadFixture(deployContractsFixture)

                  await expect(ownable.connect(auditor).removeDepositAsset([])).to.be.revertedWith(
                      "removeDepositAsset: zero list"
                  )
              })

              it("Should remove an asset from the asset list", async function () {
                  const { ownable, auditor, vabTokenContract } = await loadFixture(
                      deployContractsFixture
                  )
                  const assetList = [vabTokenContract.address]
                  const depositAssetListBefore = await ownable.getDepositAssetList()

                  await ownable.connect(auditor).removeDepositAsset(assetList)

                  const depositAssetListAfter = await ownable.getDepositAssetList()
                  const isDepositAsset = await ownable.isDepositAsset(assetList[0])

                  expect(depositAssetListBefore.includes(assetList[0])).to.be.true
                  expect(depositAssetListAfter.includes(assetList[0])).to.be.false
                  expect(isDepositAsset).to.be.false
              })

              it("Should not remove an asset not in the list", async function () {
                  const { ownable, auditor } = await loadFixture(deployContractsFixture)
                  const assetList = [auditor.address]
                  const depositAssetListBefore = await ownable.getDepositAssetList()

                  await ownable.connect(auditor).removeDepositAsset(assetList)

                  const depositAssetListAfter = await ownable.getDepositAssetList()

                  expect(depositAssetListBefore.length).to.be.equal(depositAssetListAfter.length)
              })

              it("Should remove multiple assets from the asset list", async function () {
                  const { ownable, auditor, vabTokenContract, usdcTokenContract } =
                      await loadFixture(deployContractsFixture)

                  const assetList = [vabTokenContract.address, usdcTokenContract.address]
                  const depositAssetListBefore = await ownable.getDepositAssetList()

                  await ownable.connect(auditor).removeDepositAsset(assetList)

                  const depositAssetListAfter = await ownable.getDepositAssetList()
                  const isDepositAssetVabToken = await ownable.isDepositAsset(assetList[0])
                  const isDepositAssetUSDCToken = await ownable.isDepositAsset(assetList[1])

                  expect(depositAssetListBefore.includes(assetList[0])).to.be.true
                  expect(depositAssetListBefore.includes(assetList[1])).to.be.true
                  expect(depositAssetListAfter.includes(assetList[0])).to.be.false
                  expect(depositAssetListAfter.includes(assetList[1])).to.be.false
                  expect(isDepositAssetVabToken).to.be.false
                  expect(isDepositAssetUSDCToken).to.be.false
              })
          })

          describe("isDepositAsset", function () {
              it("Should return true if the asset is in the list", async function () {
                  const { ownable, usdcTokenContract } = await loadFixture(deployContractsFixture)
                  const isDepositAsset = await ownable.isDepositAsset(usdcTokenContract.address)
                  expect(isDepositAsset).to.be.equal(true)
              })

              it("Should return false if the asset is not in the list", async function () {
                  const { ownable, auditor } = await loadFixture(deployContractsFixture)
                  const isDepositAsset = await ownable.isDepositAsset(auditor.address)
                  expect(isDepositAsset).to.be.equal(false)
              })
          })

          describe("getDepositAssetList", function () {
              it("Should return true a list of all deposit assets", async function () {
                  const { ownable, vabTokenContract, usdcTokenContract, exmTokenContract } =
                      await loadFixture(deployContractsFixture)

                  const expectedDepositAssetList = [
                      vabTokenContract.address,
                      usdcTokenContract.address,
                      exmTokenContract.address,
                      CONFIG.addressZero,
                  ]
                  const depositAssetList = await ownable.getDepositAssetList()

                  expect(expectedDepositAssetList.length).to.be.equal(depositAssetList.length)
              })
          })

          // TODO: Ask about Zero Address test case
          describe("changeVABWallet", function () {
              it("Should revert if the caller is not the auditor", async function () {
                  const { ownableDeployer } = await loadFixture(deployContractsFixture)

                  await expect(ownableDeployer.changeVABWallet(ZERO_ADDRESS)).to.be.revertedWith(
                      "caller is not the auditor"
                  )
              })

              it("Should revert if the new address is a zero address", async function () {
                  const { ownableAuditor } = await loadFixture(deployContractsFixture)

                  await expect(ownableAuditor.changeVABWallet(ZERO_ADDRESS)).to.be.revertedWith(
                      "changeVABWallet: Zero Address"
                  )
              })

              it("Should emit the VABWalletChanged event", async function () {
                  const { ownableAuditor, ownable } = await loadFixture(deployContractsFixture)

                  const tx = await ownableAuditor.changeVABWallet(ZERO_ADDRESS)

                  await expect(tx).to.emit(ownable, "VABWalletChanged").withArgs(ZERO_ADDRESS)
              })
          })
      })
