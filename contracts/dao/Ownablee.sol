// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../libraries/Helper.sol";
import "../interfaces/IOwnablee.sol";

/**
 * @title Ownablee Contract
 * @notice Contract managing ownership and administrative functions for Vabble platform contracts.
 * This contract handles setup of key addresses such as auditor, Vabble wallet, and allowed deposit assets for staking,
 * voting and payments accross the whole protocol.
 *
 * @dev This contract must be deployed first.
 */
contract Ownablee is IOwnablee {
    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    /// @dev The address of the StakingPool contract
    address private STAKING_POOL;

    /// @dev The address of the VabbleDAO contract
    address private VABBLE_DAO;

    /// @dev The address of the Vote contract
    address private VOTE;

    /// @dev The address of the Vabble wallet
    address public override VAB_WALLET;

    /// @dev The address of the current Auditor
    address public override auditor;

    /// @dev The address of the deployer
    address public immutable override deployer;

    /// @dev The address of the USDC token
    address public immutable override USDC_TOKEN;

    /// @dev The address of the VAB token
    address public immutable override PAYOUT_TOKEN;

    /// @dev  List of assets allowed for deposit.
    address[] private depositAssetList;

    ///  @dev Mapping to track allowed deposit assets.
    mapping(address => bool) private allowAssetToDeposit;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Emitted when the Vabble wallet address is changed.
     * @param wallet The new Vabble wallet address.
     */
    //@audit-issue unused event
    event VABWalletChanged(address indexed wallet);

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /// @dev Restricts access to the auditor.
    modifier onlyAuditor() {
        require(msg.sender == auditor, "caller is not the auditor");
        _;
    }

    /// @dev Restricts access to the deployer.
    modifier onlyDeployer() {
        require(msg.sender == deployer, "caller is not the deployer");
        _;
    }

    /// @dev Restricts access to the vote contract.
    modifier onlyVote() {
        require(msg.sender == VOTE, "caller is not the vote contract");
        _;
    }

    /// @dev Restricts access to the VabbleDAO contract.
    modifier onlyDAO() {
        require(msg.sender == VABBLE_DAO, "caller is not the DAO contract");
        _;
    }

    /// @dev Restricts access to the StakingPool contract.
    modifier onlyStakingPool() {
        require(msg.sender == STAKING_POOL, "caller is not the StakingPool contract");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Constructor to initialize the Ownablee contract.
     * @param _vabbleWallet Address of the Vabble wallet.
     * @param _payoutToken Address of the VAB token contract.
     * @param _usdcToken Address of the USDC token contract.
     * @param _multiSigWallet Address of the multi-signature wallet (auditor).
     */
    constructor(address _vabbleWallet, address _payoutToken, address _usdcToken, address _multiSigWallet) {
        deployer = msg.sender;

        require(_multiSigWallet != address(0), "multiSigWallet: Zero address");
        auditor = _multiSigWallet;

        require(_vabbleWallet != address(0), "vabbleWallet: Zero address");
        VAB_WALLET = _vabbleWallet;
        require(_payoutToken != address(0), "payoutToken: Zero address");
        PAYOUT_TOKEN = _payoutToken;
        require(_usdcToken != address(0), "usdcToken: Zero address");
        USDC_TOKEN = _usdcToken;

        depositAssetList.push(_usdcToken);
        allowAssetToDeposit[_usdcToken] = true;
    }

    /*//////////////////////////////////////////////////////////////
                                EXTERNAL
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Sets up initial contract addresses for voting, DAO, and staking pool.
     * @param _vote Address of the Vote contract.
     * @param _dao Address of the VabbleDAO contract.
     * @param _stakingPool Address of the StakingPool contract.
     */
    function setup(address _vote, address _dao, address _stakingPool) external onlyDeployer {
        require(VABBLE_DAO == address(0), "setupVote: already setup");

        require(_vote != address(0), "setupVote: bad Vote Contract address");
        VOTE = _vote;
        require(_dao != address(0), "setupVote: bad VabbleDAO contract address");
        VABBLE_DAO = _dao;
        require(_stakingPool != address(0), "setupVote: bad StakingPool contract address");
        STAKING_POOL = _stakingPool;
    }

    /**
     * @notice Transfers the role of auditor to a new address.
     * @param _newAuditor Address of the new auditor.
     */
    function transferAuditor(address _newAuditor) external override onlyAuditor {
        require(_newAuditor != address(0) && _newAuditor != auditor, "Ownablee: Zero newAuditor address");

        auditor = _newAuditor;
    }

    /**
     * @notice Replaces the auditor address with a new address (callable only by Vote contract).
     * @dev This will be called when a proposal to replace the auditor is approved.
     * @param _newAuditor Address of the new auditor.
     */
    function replaceAuditor(address _newAuditor) external override onlyVote {
        require(_newAuditor != address(0) && _newAuditor != auditor, "Ownablee: Zero newAuditor address");
        auditor = _newAuditor;
    }

    /**
     * @notice Adds new assets to the list of assets allowed for deposit.
     * @param _assetList List of asset addresses to be added.
     */
    function addDepositAsset(address[] calldata _assetList) external {
        require(msg.sender == auditor || msg.sender == deployer, "caller is not the auditor or deployer");
        require(_assetList.length != 0, "addDepositAsset: zero list");

        for (uint256 i = 0; i < _assetList.length; ++i) {
            if (allowAssetToDeposit[_assetList[i]]) continue;

            depositAssetList.push(_assetList[i]);
            allowAssetToDeposit[_assetList[i]] = true;
        }
    }

    /**
     * @notice Removes assets from the list of assets allowed for deposit.
     * @param _assetList List of asset addresses to be removed.
     */
    function removeDepositAsset(address[] calldata _assetList) external onlyAuditor {
        require(_assetList.length != 0, "removeDepositAsset: zero list");

        for (uint256 i = 0; i < _assetList.length; ++i) {
            if (!allowAssetToDeposit[_assetList[i]]) continue;

            for (uint256 k = 0; k < depositAssetList.length; k++) {
                if (_assetList[i] == depositAssetList[k]) {
                    depositAssetList[k] = depositAssetList[depositAssetList.length - 1];
                    depositAssetList.pop();

                    allowAssetToDeposit[_assetList[i]] = false;
                    break;
                }
            }
        }
    }

    /**
     * @notice Adds VAB tokens from the contract balance to the VabbleDAO for studio pool.
     * @param _amount Amount of VAB tokens to transfer.
     */
    function addToStudioPool(uint256 _amount) external override onlyDAO {
        require(IERC20(PAYOUT_TOKEN).balanceOf(address(this)) >= _amount, "addToStudioPool: insufficient edge pool");

        Helper.safeTransfer(PAYOUT_TOKEN, VABBLE_DAO, _amount);
    }

    /**
     * @notice Deposits VAB tokens from the auditor's address to the contract for the EdgePool.
     * @param _amount Amount of VAB tokens to deposit.
     */
    function depositVABToEdgePool(uint256 _amount) external onlyAuditor {
        require(_amount != 0, "depositVABToEdgePool: Zero amount");

        Helper.safeTransferFrom(PAYOUT_TOKEN, msg.sender, address(this), _amount);
    }

    /**
     * @notice Withdraws VAB tokens from the contract to a specified address (callable only by StakingPool).
     * @dev This is part of the migration process to a new DAO.
     * @dev The _to address is what was specified in the proposal to change the reward address.
     * @param _to Address to receive the withdrawn VAB tokens.
     * @return The amount of VAB tokens withdrawn.
     */
    function withdrawVABFromEdgePool(address _to) external override onlyStakingPool returns (uint256) {
        uint256 poolBalance = IERC20(PAYOUT_TOKEN).balanceOf(address(this));
        if (poolBalance != 0) {
            Helper.safeTransfer(PAYOUT_TOKEN, _to, poolBalance);
        }
        return poolBalance;
    }

    /**
     * @notice Checks if an asset is allowed for deposit.
     * @param _asset Address of the asset to check.
     * @return True if the asset is allowed for deposit, false otherwise.
     */
    function isDepositAsset(address _asset) external view override returns (bool) {
        return allowAssetToDeposit[_asset];
    }

    /**
     * @notice Retrieves the list of assets allowed for deposit.
     * @return An array of asset addresses allowed for deposit.
     */
    function getDepositAssetList() external view override returns (address[] memory) {
        return depositAssetList;
    }

    /*//////////////////////////////////////////////////////////////
                                 PUBLIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Retrieves the address of the Vote contract.
     * @return The address of the Vote contract.
     */
    function getVoteAddress() public view returns (address) {
        return VOTE;
    }

    /**
     * @notice Retrieves the address of the VabbleDAO contract.
     * @return dao_ The address of the VabbleDAO contract.
     */
    function getVabbleDAO() public view returns (address dao_) {
        dao_ = VABBLE_DAO;
    }

    /**
     * @notice Retrieves the address of the StakingPool contract.
     * @return The address of the StakingPool contract.
     */
    function getStakingPoolAddress() public view returns (address) {
        return STAKING_POOL;
    }
}
