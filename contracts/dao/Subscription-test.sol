// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/Ownable.sol";
import "../libraries/Helper.sol";
import "../interfaces/IVabbleDAO.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IProperty.sol";
import "hardhat/console.sol";

contract SubscriptionTest is Ownable, ReentrancyGuard {
    
    event SubscriptionActivated(address customer, address token, uint256 period);
    event NFTsRegistered(address[] nfts);
    event SubscriptionNFTActivated(address customer, address nft, uint256 tokenId, Helper.TokenType tokenType);
    event GatedContentRegistered(address studio, address[] nftList);
    event VABWalletChanged(address wallet);

    IERC20 public immutable PAYOUT_TOKEN;          // VAB token        
    address private immutable VABBLE_DAO;          // VabbleDAO contract
    address private immutable UNI_HELPER;          // UniHelper contract
    address private immutable DAO_PROPERTY;        // Property contract
    address private immutable USDC_TOKEN;          // USDC token
    address public VAB_WALLET;                     // Vabble wallet
    uint256 public constant PERIOD_UNIT = 30 days; // 30 days

    address[] public registeredNFTList;            // nfts registered for subscription by Auditor

    struct UserSubscription {
        uint256 time;             // current timestamp
        uint256 period;           // period of subscription(ex: 1 => 1 month, 3 => 3 month)
    }
    
    mapping(address => UserSubscription) public subscriptionInfo;             // (user => UserSubscription)
    mapping(address => uint256) public periodPerNFT;                          // (nft => period)
    mapping(address => mapping(uint256 => bool)) public isUsedNFT;            // (nft => (tokenId => true/false))

    mapping(address => uint256[]) public nftGatedFilmIds;                     // (nft => filmIds)
    mapping(address => mapping(uint256 => bool)) public isGatedFilmId;        // (nft => (filmId => true/false))
    address[] public gatedNFTList;                                            // nfts added for gated content by Studio
    mapping(address => bool) public isGatedNFT;                               // (nft => true/false)

    receive() external payable {}

    constructor(
        address _payoutToken,
        address _vabbleDAO,
        address _uniHelperContract,
        address _daoProperty,
        address _usdcToken,
        address _vabbleWallet
    ) {        
        require(_payoutToken != address(0), "payoutToken: Zero address");
        PAYOUT_TOKEN = IERC20(_payoutToken);    
        require(_vabbleDAO != address(0), "vabbleDAO: Zero vabbleDAO address");
        VABBLE_DAO = _vabbleDAO;    
        require(_uniHelperContract != address(0), "uniHelperContract: Zero address");
        UNI_HELPER = _uniHelperContract;      
        require(_daoProperty != address(0), "initializeVote: Zero filmBoard address");
        DAO_PROPERTY = _daoProperty; 
        require(_usdcToken != address(0), "usdcToken: Zero address");
        USDC_TOKEN = _usdcToken;
        require(_vabbleWallet != address(0), "vabbleWallet: Zero address");
        VAB_WALLET = _vabbleWallet;
    }

    function getSubscriptionAmount(uint256 _period) private view returns(uint256 amount_) {
        require(_period > 0, "getSubscriptionAmount: Zero period");

        uint256 scriptAmount = IProperty(DAO_PROPERTY).subscriptionAmount();
        // TODO We will calculate the amount based on period(1, 3, 6 ,12 month)
        amount_ = _period * scriptAmount;
    }

    // ============= 0. Subscription by token. ===========
    /// @notice active subscription(pay $10 monthly as ETH/USDC/USDT/VAB...) for renting the films
    function activeSubscription(address _token, uint256 _period) external payable nonReentrant {        
        require(!isActivedSubscription(), "activeSubscription: Already actived");  
        
        uint256 scriptAmount = getSubscriptionAmount(_period);
        uint256 expectAmount;
        if(_token == address(0)) {
            expectAmount = IUniHelper(UNI_HELPER).expectedAmount(scriptAmount, USDC_TOKEN, _token);
            require(msg.value >= expectAmount, "activeSubscription: Insufficient paid");
            if (msg.value > expectAmount) {
                Helper.safeTransferETH(msg.sender, msg.value - expectAmount);
            }
            // Send ETH from this contract to UNI_HELPER contract
            Helper.safeTransferETH(UNI_HELPER, expectAmount);

        } else {
            if(_token == address(PAYOUT_TOKEN)) {
                expectAmount = IUniHelper(UNI_HELPER).expectedAmount(scriptAmount * 40 * 1e8 / 1e10, USDC_TOKEN, _token);
            } else if(_token == USDC_TOKEN) {
                expectAmount = scriptAmount;
            } else {            
                expectAmount = IUniHelper(UNI_HELPER).expectedAmount(scriptAmount, USDC_TOKEN, _token);
            }
            Helper.safeTransferFrom(_token, msg.sender, address(this), expectAmount); 

            // Approve token to send from this contract to UNI_HELPER contract
            if(IERC20(_token).allowance(address(this), UNI_HELPER) == 0) {
                Helper.safeApprove(_token, UNI_HELPER, IERC20(_token).totalSupply());
            }
        }
        
        uint256 usdcAmount;
        // if token is VAB, send USDC to wallet after convert VAB to USDC
        if(_token == address(PAYOUT_TOKEN)) {
            bytes memory swapArgs = abi.encode(expectAmount, _token, USDC_TOKEN);
            usdcAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs);
            Helper.safeTransfer(USDC_TOKEN, VAB_WALLET, usdcAmount);
        } 
        // if token is not VAB, 
        // 1. send VAB to wallet after convert token(60%) to VAB
        // 2. send USDC to wallet after convert token(40%) to USDC
        else {            
            uint256 amount60 = expectAmount * 60 * 1e8 / 1e10;       
            bytes memory swapArgs = abi.encode(amount60, _token, address(PAYOUT_TOKEN));
            uint256 vabAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs);
            
            // Transfer VAB to wallet
            Helper.safeTransfer(address(PAYOUT_TOKEN), VAB_WALLET, vabAmount);

            if(_token == USDC_TOKEN) {
                usdcAmount = expectAmount - amount60;
            } else {
                bytes memory swapArgs1 = abi.encode(expectAmount - amount60, _token, USDC_TOKEN);
                usdcAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs1);
            }
            // Transfer USDC to wallet
            Helper.safeTransfer(USDC_TOKEN, VAB_WALLET, usdcAmount);
        }

        UserSubscription storage subscription = subscriptionInfo[msg.sender];
        subscription.time = block.timestamp;
        subscription.period = _period;

        emit SubscriptionActivated(msg.sender, _token, _period);
    }

    // ============= 1. Subscription NFTs. ===========
    /// @notice Register NFTs for subscription by Auditor
    /// @param _periods : [1, 2, 6 ...] 1=>1 month, 2=>2 months, 6=>6 months
    function registerNFTs(address[] memory _nfts, uint256[] memory _periods) public onlyAuditor {
        require(_nfts.length == _periods.length, "registerNFTs: Difference array length");

        for(uint256 i = 0; i < _nfts.length; i++) { 
            if(_nfts[i] == address(0) || _periods[i] <= 0) continue;

            if(!isRegisteredNFT(_nfts[i])) {
                registeredNFTList.push(_nfts[i]); 
            }            
            periodPerNFT[_nfts[i]] = _periods[i];
        }

        emit NFTsRegistered(registeredNFTList);
    }

    /// @notice active subscription by NFT for renting the films
    /// @param _nft : nft address 
    /// @param _tokenId: if ERC721 then nft token Id, if ERC1155 then nft Id(ex: cate=0, gold=1...)
    /// @param _tokenType: 1 => ERC721, 2 => ERC1155
    function activeNFTSubscription(address _nft, uint256 _tokenId, Helper.TokenType _tokenType) external nonReentrant {        
        require(!isActivedSubscription(), "NFTSubscription: Already actived");  
        require(isRegisteredNFT(_nft) && !isUsedNFT[_nft][_tokenId], "NFTSubscription: Used or Unregistered nft");

        // TODO Verify Ownership On Chain.
        if(_tokenType == Helper.TokenType.ERC721) {
            require(IERC721(_nft).ownerOf(_tokenId) == msg.sender, "NFTSubscription: Not nft owner");
        } else if(_tokenType == Helper.TokenType.ERC1155) {
            require(IERC1155(_nft).balanceOf(msg.sender, _tokenId) > 0, "NFTSubscription: No nft balance");
        }

        UserSubscription storage subscription = subscriptionInfo[msg.sender];
        subscription.time = block.timestamp;
        subscription.period = periodPerNFT[_nft]; // for now, 3 => 3 month
        isUsedNFT[_nft][_tokenId] = true;

        emit SubscriptionNFTActivated(msg.sender, _nft, _tokenId, _tokenType);
    }

    // ============= 2. NFT Gated Content ===========
    /// @notice Register filmIds(nft gated content) and nfts by Studio
    function registerGatedContent(
        bytes[] calldata _uploadFilms
    ) external onlyStudio nonReentrant {
        require(_uploadFilms.length > 0, "registerGatedContent: Invalid item length");

        address nft;
        uint256[] memory filmIds;
        for(uint256 i = 0; i < _uploadFilms.length; i++) {        
            ( nft, filmIds ) = abi.decode(_uploadFilms[i], (address, uint256[]));
            
            if(nft == address(0) || filmIds.length == 0) continue;

            bool isFilmIdSaved = false;
            for(uint256 k = 0; k < filmIds.length; k++) {        
                if(!__isApprovedFilm(filmIds[k])) continue;

                if(isGatedFilmId[nft][filmIds[k]]) continue;

                nftGatedFilmIds[nft].push(filmIds[k]);
                isGatedFilmId[nft][filmIds[k]] = true;
                isFilmIdSaved = true;
            }

            if(isGatedNFT[nft] && isFilmIdSaved) continue;

            gatedNFTList.push(nft);            
            isGatedNFT[nft] = true;
        }   

        emit GatedContentRegistered(msg.sender, gatedNFTList);
    }

    function __isApprovedFilm(uint256 _filmId) private view returns (bool approve_) {
        if(
            IVabbleDAO(VABBLE_DAO).getFilmStatusById(_filmId) == Helper.Status.APPROVED_LISTING || 
            IVabbleDAO(VABBLE_DAO).getFilmStatusById(_filmId) == Helper.Status.APPROVED_FUNDING || 
            IVabbleDAO(VABBLE_DAO).getFilmStatusById(_filmId) == Helper.Status.APPROVED_WITHOUTVOTE) {
            approve_ = true;
        } else {
            approve_ = false;
        }
    }

    

    /// @notice Change VAB wallet address
    function changeVABWallet(address _wallet) external onlyAuditor nonReentrant {
        require(_wallet == address(0), "changeVABWallet: Zero Address");
        VAB_WALLET = _wallet;

        emit VABWalletChanged(_wallet);
    } 

    /// @notice Check if subscription period 
    function isActivedSubscription() public view returns(bool active_) {
        UserSubscription storage subscription = subscriptionInfo[msg.sender];        

        if(subscription.time + PERIOD_UNIT * subscription.period > block.timestamp) active_ = true;
        else active_ = false;
    }

    /// @notice Check if nft registered 
    function isRegisteredNFT(address _nft) public view returns(bool register_) {     
        require(_nft != address(0), "isRegisteredNFT: Zero nft address");

        if(periodPerNFT[_nft] > 0) register_ = true;
        else register_ = false;
    }
    
    /// @notice Get user active status
    function getSubscriptionInfo(address _customer) external view returns(uint256 time_, uint256 period_) {
        time_ = subscriptionInfo[_customer].time;
        period_ = subscriptionInfo[_customer].period;
    } 

    /// @notice Get registered nft list
    function getRegisteredNFTList() public view returns (address[] memory) {
        return registeredNFTList;
    }    
}
