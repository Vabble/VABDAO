// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../libraries/Helper.sol";
import "../interfaces/IOwnablee.sol";

contract Ownablee is IOwnablee {
    
    event VABWalletChanged(address indexed wallet);

    address public override auditor;
    address public immutable override deployer;
    address public override VAB_WALLET;           // Vabble wallet
    address public immutable override PAYOUT_TOKEN;         // VAB token       
    address public immutable override USDC_TOKEN;           // USDC token 
    address private VOTE;                // Vote contract address
    address private VABBLE_DAO;          // VabbleDAO contract address
    address private STAKING_POOL;        // StakingPool contract address
    
    address[] private depositAssetList;
    
    mapping(address => bool) private allowAssetToDeposit;
    
    modifier onlyAuditor() {
        require(msg.sender == auditor, "caller is not the auditor");
        _;
    }
    modifier onlyDeployer() {
        require(msg.sender == deployer, "caller is not the deployer");
        _;
    }
    modifier onlyVote() {
        require(msg.sender == VOTE, "caller is not the vote contract");
        _;
    }
    modifier onlyDAO() {
        require(msg.sender == VABBLE_DAO, "caller is not the DAO contract");
        _;
    }
    modifier onlyStakingPool() {
        require(msg.sender == STAKING_POOL, "caller is not the StakingPool contract");
        _;
    }

    constructor(
        address _vabbleWallet,
        address _payoutToken,
        address _usdcToken,
        address _multiSigWallet
    ) {
        deployer = msg.sender;

        // TODO - PVE007 updated(add multiSigWallet)
        require(_multiSigWallet != address(0), "multiSigWallet: Zero address");
        // auditor = msg.sender; // _multiSigWallet;
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

    function setup(
        address _vote,
        address _dao,
        address _stakingPool
    ) external onlyDeployer {
        // TODO - N3-3 updated(add below line)
        // require(VABBLE_DAO == address(0), "setupVote: already setup");

        require(_vote != address(0), "setupVote: bad Vote Contract address");
        VOTE = _vote;    
        require(_dao != address(0), "setupVote: bad VabbleDAO contract address");
        VABBLE_DAO = _dao;    
        require(_stakingPool != address(0), "setupVote: bad StakingPool contract address");
        STAKING_POOL = _stakingPool;    
    }    
    
    function transferAuditor(address _newAuditor) external override onlyAuditor {
        require(_newAuditor != address(0) && _newAuditor != auditor, "Ownablee: Zero newAuditor address");

        auditor = _newAuditor;
    }

    function replaceAuditor(address _newAuditor) external override onlyVote {
        require(_newAuditor != address(0) && _newAuditor != auditor, "Ownablee: Zero newAuditor address");
        auditor = _newAuditor;
    }

    function addDepositAsset(address[] calldata _assetList) external onlyAuditor {
        require(_assetList.length > 0, "addDepositAsset: zero list");

        for(uint256 i = 0; i < _assetList.length; i++) { 
            if(allowAssetToDeposit[_assetList[i]]) continue;

            depositAssetList.push(_assetList[i]);
            allowAssetToDeposit[_assetList[i]] = true;
        }        
    }
    
    function removeDepositAsset(address[] calldata _assetList) external onlyAuditor {
        require(_assetList.length > 0, "removeDepositAsset: zero list");
        
        for(uint256 i = 0; i < _assetList.length; i++) {
            if(!allowAssetToDeposit[_assetList[i]]) continue;

            for(uint256 k = 0; k < depositAssetList.length; k++) { 
                if(_assetList[i] == depositAssetList[k]) {
                    depositAssetList[k] = depositAssetList[depositAssetList.length - 1];
                    depositAssetList.pop();

                    allowAssetToDeposit[_assetList[i]] = false;
                    // TODO - N1 updated(add break)
                    break;
                }
            }
            
        }        
    }

    function isDepositAsset(address _asset) external view override returns (bool) {
        return allowAssetToDeposit[_asset];
    }

    function getDepositAssetList() external view override returns (address[] memory) {
        return depositAssetList;
    }
    
    /// @notice Change VAB wallet address
    function changeVABWallet(address _wallet) external onlyAuditor {
        require(_wallet == address(0), "changeVABWallet: Zero Address");
        VAB_WALLET = _wallet;

        emit VABWalletChanged(_wallet);
    } 

    function addToStudioPool(uint256 _amount) external override onlyDAO {
        require(IERC20(PAYOUT_TOKEN).balanceOf(address(this)) >= _amount, "addToStudioPool: insufficient edge pool");

        Helper.safeTransfer(PAYOUT_TOKEN, VABBLE_DAO, _amount);
    }

    /// @notice Deposit VAB token from Auditor to EdgePool
    function depositVABToEdgePool(uint256 _amount) external onlyAuditor {
        require(_amount > 0, "depositVABToEdgePool: Zero amount");

        Helper.safeTransferFrom(PAYOUT_TOKEN, msg.sender, address(this), _amount);
    }

    /// @notice Withdraw VAB token from EdgePool to V2
    function withdrawVABFromEdgePool(address _to) external override onlyStakingPool returns (uint256) {
        uint256 poolBalance = IERC20(PAYOUT_TOKEN).balanceOf(address(this));
        if(poolBalance > 0) {
            Helper.safeTransfer(PAYOUT_TOKEN, _to, poolBalance);
        }
        return poolBalance;
    }

    function getVabbleDAO() public view returns (address dao_) {        
        dao_ = VABBLE_DAO;
    } 
}
